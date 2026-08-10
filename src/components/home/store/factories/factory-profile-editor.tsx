// TRANSPORT: client-query — writes the three whole-object factory PUTs.
"use client";

// `/studio/factory-profile`. Where a manufacturer states how it makes things.
//
// THREE FORMS, THREE WHOLE-OBJECT PUTs, AND NO PARTIAL SAVE ANYWHERE. For the two lists that is
// literal: the body IS the new list, an omitted row is a deletion, and array order is the stored
// order. There is no per-row endpoint and there should not be one — a per-row move has to write
// intermediate positions that violate the server's unique `(organizationId, position)` index
// mid-transaction, the same argument the category reorder makes.
//
// `factory-terms` is one object for a different reason: BOTH ITS INVARIANTS ARE CROSS-FIELD. A
// sample fee is only meaningful when samples are offered, and an MOQ is only readable beside its
// unit, so the form submits every field it renders including the ones nobody touched.
//
// THE ONE CONTROL ON THIS PAGE THAT IS EASY TO GET WRONG is the sample fee, and getting it wrong
// costs a buyer real money:
//
//   UNSTATED and FREE ARE DIFFERENT ANSWERS. `null` means nobody has said, `0` means genuinely
//   free. A single number input defaulting to empty collapses them, so this form asks the question
//   as three radio options and only then shows a number field. A buyer who reads an unstated fee
//   as free finds out at invoice time.
//
// IT PREFILLS FROM THE PUBLIC DETAIL READ, because §6.6 ships three PUTs and no GETs — a factory's
// lines, sites and terms are already projected by `GET /store/factories/:factorySlug`. A second
// read of the same rows would be a second place for them to disagree (§16.1).

import { useState } from "react";

import MutationNotice from "@/components/home/store/shared/mutation-notice";
import {
  useReplaceFactoryProductionLinesMutation,
  useReplaceFactorySitesMutation,
  useUpdateFactoryTermsMutation,
} from "@/hooks/store/factory-profile";
import { formatSquareMetresLabel } from "@/lib/store/format";
import type {
  FactoryDetail,
  FactoryProductionLineInput,
  FactorySiteInput,
  UpdateFactoryTermsInput,
} from "@/lib/store/factories.schemas";

const PRIMARY_BUTTON_CLASS =
  "rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50";

const QUIET_BUTTON_CLASS =
  "rounded-full bg-background px-3 py-1.5 text-xs font-medium text-[#00696E] outline -outline-offset-1 outline-[#6F7979] transition-colors hover:bg-muted disabled:opacity-50";

const FIELD_CLASS =
  "mt-1 w-full rounded-lg border border-[#CAC4D0]/60 px-2 py-1.5 text-sm text-[#191C1C] outline-none focus:border-[#00696E]";

const SECTION_CLASS = "rounded-xl border border-[#CAC4D0]/60 px-4 py-4";

/** A blank text input is an ABSENCE, never `""`. */
function toOptionalText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

/**
 * A blank number input is an ABSENCE, never `0`.
 *
 * `0` and "unstated" are different facts everywhere on this surface, and this is the one function
 * that keeps them apart. `Number("")` is `0`, which is exactly the trap.
 */
function toOptionalInteger(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function toInputText(value: number | null): string {
  return value === null ? "" : String(value);
}

export default function FactoryProfileEditor({
  organizationId,
  detail,
}: {
  organizationId: string;
  detail: FactoryDetail;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 pt-4 pb-10 lg:px-6">
      <header>
        <h1 className="font-serif text-xl font-semibold text-[#191C1C] md:text-2xl">
          Your factory profile
        </h1>
        <p className="mt-1 text-sm leading-5 text-[#6F7979]">
          What buyers see on {detail.factory.displayName} in the manufacturer directory.
        </p>
      </header>

      <ProductionLinesForm organizationId={organizationId} detail={detail} />
      <SitesForm organizationId={organizationId} detail={detail} />
      <TermsForm organizationId={organizationId} detail={detail} />
    </div>
  );
}

// --- Production lines --------------------------------------------------------

interface ProductionLineDraft {
  readonly name: string;
  readonly processSummary: string;
  readonly monthlyCapacityUnits: string;
  readonly unitLabel: string;
}

function ProductionLinesForm({
  organizationId,
  detail,
}: {
  organizationId: string;
  detail: FactoryDetail;
}) {
  const [lines, setLines] = useState<ProductionLineDraft[]>(() =>
    detail.productionLines.map((line) => ({
      name: line.name,
      processSummary: line.processSummary,
      monthlyCapacityUnits: toInputText(line.monthlyCapacityUnits),
      unitLabel: line.unitLabel,
    })),
  );
  const replaceLines = useReplaceFactoryProductionLinesMutation();

  // THE UNIT IS REQUIRED EVEN WHEN THE CAPACITY IS NOT. A capacity with no unit cannot be compared
  // against an order, which is the same both-or-neither rule the MOQ pair has.
  const missingUnitCount = lines.filter(
    (line) => line.name.trim().length > 0 && line.unitLabel.trim().length === 0,
  ).length;
  const isSubmittable = missingUnitCount === 0 && !replaceLines.isPending;

  return (
    <form
      className={SECTION_CLASS}
      onSubmit={(event) => {
        event.preventDefault();
        if (!isSubmittable) return;
        const productionLines: FactoryProductionLineInput[] = lines
          .filter((line) => line.name.trim().length > 0)
          .map((line) => ({
            name: line.name.trim(),
            processSummary: line.processSummary.trim(),
            unitLabel: line.unitLabel.trim(),
            // Spread rather than `?? null` — an unstated capacity is OMITTED from the body.
            ...(toOptionalInteger(line.monthlyCapacityUnits) === undefined
              ? {}
              : { monthlyCapacityUnits: toOptionalInteger(line.monthlyCapacityUnits) }),
          }));
        replaceLines.mutate({ organizationId, input: { productionLines } });
      }}
    >
      <h2 className="text-sm font-medium text-[#191C1C]">Production lines</h2>
      <p className="mt-1 text-xs leading-4 text-[#6F7979]">
        Saving replaces the whole list. A line you remove here is removed from your profile.
      </p>

      <ul className="mt-3 space-y-3">
        {lines.map((line, lineIndex) => (
          // The index IS the identity here: the list is positional on the wire, rows carry no id
          // on the way up, and reordering is what the array order means.
          <li key={lineIndex} className="rounded-lg bg-[#F2F4F4] px-3 py-3">
            <label className="block text-xs text-[#6F7979]">
              Name
              <input
                className={FIELD_CLASS}
                value={line.name}
                onChange={(event) =>
                  setLines(patchAt(lines, lineIndex, { name: event.target.value }))
                }
                placeholder="Injection moulding"
              />
            </label>
            <label className="mt-2 block text-xs text-[#6F7979]">
              What it does
              <input
                className={FIELD_CLASS}
                value={line.processSummary}
                onChange={(event) =>
                  setLines(patchAt(lines, lineIndex, { processSummary: event.target.value }))
                }
                placeholder="Twelve presses, 80–450 tonne."
              />
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="block text-xs text-[#6F7979]">
                Monthly capacity (optional)
                <input
                  className={FIELD_CLASS}
                  inputMode="numeric"
                  value={line.monthlyCapacityUnits}
                  onChange={(event) =>
                    setLines(
                      patchAt(lines, lineIndex, { monthlyCapacityUnits: event.target.value }),
                    )
                  }
                  placeholder="Leave blank if unmeasured"
                />
              </label>
              <label className="block text-xs text-[#6F7979]">
                Unit — required
                <input
                  className={FIELD_CLASS}
                  value={line.unitLabel}
                  onChange={(event) =>
                    setLines(patchAt(lines, lineIndex, { unitLabel: event.target.value }))
                  }
                  placeholder="pieces"
                />
              </label>
            </div>
            <button
              type="button"
              className="mt-2 text-[11px] leading-4 text-[#6F7979] hover:underline"
              onClick={() => setLines(lines.filter((_line, index) => index !== lineIndex))}
            >
              Remove this line
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={QUIET_BUTTON_CLASS}
          onClick={() =>
            setLines([
              ...lines,
              { name: "", processSummary: "", monthlyCapacityUnits: "", unitLabel: "" },
            ])
          }
        >
          Add a line
        </button>
        <button type="submit" className={PRIMARY_BUTTON_CLASS} disabled={!isSubmittable}>
          Save production lines
        </button>
      </div>

      {missingUnitCount > 0 && (
        <p className="mt-1 text-xs leading-4 text-destructive">
          Every line needs a unit, even when you leave the capacity blank — a number with no unit
          cannot be compared against an order.
        </p>
      )}
      <MutationNotice
        result={replaceLines.data}
        fallbackMessage="Those lines did not save. Try again."
        hasThrown={replaceLines.isError}
      />
    </form>
  );
}

// --- Sites -------------------------------------------------------------------

interface SiteDraft {
  readonly label: string;
  readonly countryCode: string;
  readonly locality: string;
  readonly floorAreaSquareMetres: string;
  readonly productionStaffCount: string;
}

function SitesForm({ organizationId, detail }: { organizationId: string; detail: FactoryDetail }) {
  const [sites, setSites] = useState<SiteDraft[]>(() =>
    detail.sites.map((site) => ({
      label: site.label,
      countryCode: site.countryCode,
      locality: site.locality ?? "",
      floorAreaSquareMetres: toInputText(site.floorAreaSquareMetres),
      productionStaffCount: toInputText(site.productionStaffCount),
    })),
  );
  const replaceSites = useReplaceFactorySitesMutation();

  const statedAreaTotal = sites.reduce((runningTotal, site) => {
    const area = toOptionalInteger(site.floorAreaSquareMetres);
    return area === undefined ? runningTotal : runningTotal + area;
  }, 0);

  return (
    <form
      className={SECTION_CLASS}
      onSubmit={(event) => {
        event.preventDefault();
        if (replaceSites.isPending) return;
        const siteInputs: FactorySiteInput[] = sites
          .filter((site) => site.label.trim().length > 0)
          .map((site) => ({
            label: site.label.trim(),
            countryCode: site.countryCode.trim().toUpperCase(),
            ...(toOptionalText(site.locality) === undefined
              ? {}
              : { locality: toOptionalText(site.locality) }),
            ...(toOptionalInteger(site.floorAreaSquareMetres) === undefined
              ? {}
              : { floorAreaSquareMetres: toOptionalInteger(site.floorAreaSquareMetres) }),
            ...(toOptionalInteger(site.productionStaffCount) === undefined
              ? {}
              : { productionStaffCount: toOptionalInteger(site.productionStaffCount) }),
          }));
        replaceSites.mutate({ organizationId, input: { sites: siteInputs } });
      }}
    >
      <h2 className="text-sm font-medium text-[#191C1C]">Sites</h2>
      <p className="mt-1 text-xs leading-4 text-[#6F7979]">Saving replaces the whole list.</p>

      <ul className="mt-3 space-y-3">
        {sites.map((site, siteIndex) => (
          <li key={siteIndex} className="rounded-lg bg-[#F2F4F4] px-3 py-3">
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs text-[#6F7979]">
                Label
                <input
                  className={FIELD_CLASS}
                  value={site.label}
                  onChange={(event) =>
                    setSites(patchAt(sites, siteIndex, { label: event.target.value }))
                  }
                  placeholder="Xiaoshan plant"
                />
              </label>
              <label className="block text-xs text-[#6F7979]">
                Country code
                <input
                  className={FIELD_CLASS}
                  value={site.countryCode}
                  onChange={(event) =>
                    setSites(patchAt(sites, siteIndex, { countryCode: event.target.value }))
                  }
                  placeholder="CN"
                  maxLength={2}
                />
              </label>
            </div>
            <label className="mt-2 block text-xs text-[#6F7979]">
              Locality (optional)
              <input
                className={FIELD_CLASS}
                value={site.locality}
                onChange={(event) =>
                  setSites(patchAt(sites, siteIndex, { locality: event.target.value }))
                }
                placeholder="Hangzhou, Zhejiang"
              />
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="block text-xs text-[#6F7979]">
                Floor area m² (optional)
                <input
                  className={FIELD_CLASS}
                  inputMode="numeric"
                  value={site.floorAreaSquareMetres}
                  onChange={(event) =>
                    setSites(
                      patchAt(sites, siteIndex, { floorAreaSquareMetres: event.target.value }),
                    )
                  }
                />
              </label>
              <label className="block text-xs text-[#6F7979]">
                Production staff (optional)
                <input
                  className={FIELD_CLASS}
                  inputMode="numeric"
                  value={site.productionStaffCount}
                  onChange={(event) =>
                    setSites(
                      patchAt(sites, siteIndex, { productionStaffCount: event.target.value }),
                    )
                  }
                />
              </label>
            </div>
            <button
              type="button"
              className="mt-2 text-[11px] leading-4 text-[#6F7979] hover:underline"
              onClick={() => setSites(sites.filter((_site, index) => index !== siteIndex))}
            >
              Remove this site
            </button>
          </li>
        ))}
      </ul>

      {/*
        BOTH FIGURES ARE PUBLISHED AND NEITHER IS RECONCILED (§16.3). The organization-wide area and
        the per-site areas are separately seller-declared, so when they disagree this note says so
        rather than silently summing one into the other — a platform that picked a winner would be
        asserting something neither party said. It is a remark, not a validation error.
      */}
      {statedAreaTotal > 0 && (
        <p className="mt-3 rounded-lg bg-[#F2F4F4] px-3 py-2 text-xs leading-4 text-[#6F7979]">
          These sites add up to {formatSquareMetresLabel(statedAreaTotal)}. Your organization-wide
          figure is stated separately and is not changed by this form; buyers see both.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={QUIET_BUTTON_CLASS}
          onClick={() =>
            setSites([
              ...sites,
              {
                label: "",
                countryCode: "",
                locality: "",
                floorAreaSquareMetres: "",
                productionStaffCount: "",
              },
            ])
          }
        >
          Add a site
        </button>
        <button type="submit" className={PRIMARY_BUTTON_CLASS} disabled={replaceSites.isPending}>
          Save sites
        </button>
      </div>

      <MutationNotice
        result={replaceSites.data}
        fallbackMessage="Those sites did not save. Try again."
        hasThrown={replaceSites.isError}
      />
    </form>
  );
}

// --- Terms -------------------------------------------------------------------

type SampleFeeChoice = "unstated" | "free" | "priced";

function TermsForm({ organizationId, detail }: { organizationId: string; detail: FactoryDetail }) {
  const { samplePolicy, factory } = detail;

  const [offersSamples, setOffersSamples] = useState(samplePolicy.offersSamples);
  const [sampleFeeChoice, setSampleFeeChoice] = useState<SampleFeeChoice>(() => {
    if (samplePolicy.sampleFeeInCents === null) return "unstated";
    return samplePolicy.sampleFeeInCents === 0 ? "free" : "priced";
  });
  const [sampleFeeInCents, setSampleFeeInCents] = useState(() =>
    samplePolicy.sampleFeeInCents === null || samplePolicy.sampleFeeInCents === 0
      ? ""
      : String(samplePolicy.sampleFeeInCents),
  );
  const [sampleLeadTimeDays, setSampleLeadTimeDays] = useState(
    toInputText(samplePolicy.sampleLeadTimeDays),
  );
  const [currency, setCurrency] = useState(samplePolicy.currency);
  const [minimumOrderQuantity, setMinimumOrderQuantity] = useState(
    toInputText(factory.minimumOrderQuantity),
  );
  const [minimumOrderQuantityUnitLabel, setMinimumOrderQuantityUnitLabel] = useState(
    factory.minimumOrderQuantityUnitLabel ?? "",
  );
  const [minimumLeadTimeDays, setMinimumLeadTimeDays] = useState(
    toInputText(factory.minimumLeadTimeDays),
  );
  const [maximumLeadTimeDays, setMaximumLeadTimeDays] = useState(
    toInputText(factory.maximumLeadTimeDays),
  );
  const [acceptingInquiries, setAcceptingInquiries] = useState(factory.acceptingInquiries);

  const updateTerms = useUpdateFactoryTermsMutation();

  // THE MOQ PAIR IS BOTH-OR-NEITHER. A bare `500` is unreadable, because 500 pieces and 500
  // cartons are different businesses.
  const hasQuantity = toOptionalInteger(minimumOrderQuantity) !== undefined;
  const hasQuantityUnit = toOptionalText(minimumOrderQuantityUnitLabel) !== undefined;
  const isMoqHalfFilled = hasQuantity !== hasQuantityUnit;
  const isSubmittable = !isMoqHalfFilled && !updateTerms.isPending;

  return (
    <form
      className={SECTION_CLASS}
      onSubmit={(event) => {
        event.preventDefault();
        if (!isSubmittable) return;

        const input: UpdateFactoryTermsInput = {
          offersSamples,
          currency: currency.trim().toUpperCase(),
          acceptingInquiries,
          ...(toOptionalInteger(sampleLeadTimeDays) === undefined
            ? {}
            : { sampleLeadTimeDays: toOptionalInteger(sampleLeadTimeDays) }),
          // THE THREE-WAY ANSWER, and the only place `0` is sent deliberately. `unstated` OMITS
          // the field; `free` sends an explicit `0`; `priced` sends the number.
          ...(sampleFeeChoice === "unstated"
            ? {}
            : sampleFeeChoice === "free"
              ? { sampleFeeInCents: 0 }
              : toOptionalInteger(sampleFeeInCents) === undefined
                ? {}
                : { sampleFeeInCents: toOptionalInteger(sampleFeeInCents) }),
          ...(hasQuantity && hasQuantityUnit
            ? {
                minimumOrderQuantity: toOptionalInteger(minimumOrderQuantity),
                minimumOrderQuantityUnitLabel: toOptionalText(minimumOrderQuantityUnitLabel),
              }
            : {}),
          ...(toOptionalInteger(minimumLeadTimeDays) === undefined
            ? {}
            : { minimumLeadTimeDays: toOptionalInteger(minimumLeadTimeDays) }),
          ...(toOptionalInteger(maximumLeadTimeDays) === undefined
            ? {}
            : { maximumLeadTimeDays: toOptionalInteger(maximumLeadTimeDays) }),
        };
        updateTerms.mutate({ organizationId, input });
      }}
    >
      <h2 className="text-sm font-medium text-[#191C1C]">Samples, minimums and your inbox</h2>
      <p className="mt-1 text-xs leading-4 text-[#6F7979]">
        Saved as one object — a sample fee only means something beside whether you offer samples,
        and a minimum only means something beside its unit.
      </p>

      <label className="mt-3 flex items-center gap-2 text-sm text-[#191C1C]">
        <input
          type="checkbox"
          checked={offersSamples}
          onChange={(event) => setOffersSamples(event.target.checked)}
        />
        We produce samples
      </label>

      {offersSamples && (
        <fieldset className="mt-3">
          <legend className="text-xs text-[#6F7979]">What does a sample cost?</legend>
          {/*
            THREE OPTIONS BECAUSE THERE ARE THREE ANSWERS. A single number box would make "unstated"
            and "free" the same empty field, and a buyer who orders a sample believing it is free
            finds out at invoice time.
          */}
          <div className="mt-1 space-y-1">
            <SampleFeeOption
              value="unstated"
              current={sampleFeeChoice}
              onSelect={setSampleFeeChoice}
              label="We have not decided — buyers will have to ask"
            />
            <SampleFeeOption
              value="free"
              current={sampleFeeChoice}
              onSelect={setSampleFeeChoice}
              label="Free"
            />
            <SampleFeeOption
              value="priced"
              current={sampleFeeChoice}
              onSelect={setSampleFeeChoice}
              label="We charge for samples"
            />
          </div>

          {sampleFeeChoice === "priced" && (
            <label className="mt-2 block text-xs text-[#6F7979]">
              Fee in minor units (cents)
              <input
                className={FIELD_CLASS}
                inputMode="numeric"
                value={sampleFeeInCents}
                onChange={(event) => setSampleFeeInCents(event.target.value)}
                placeholder="45000"
              />
            </label>
          )}

          <label className="mt-2 block text-xs text-[#6F7979]">
            Sample lead time in days (optional)
            <input
              className={FIELD_CLASS}
              inputMode="numeric"
              value={sampleLeadTimeDays}
              onChange={(event) => setSampleLeadTimeDays(event.target.value)}
            />
          </label>
        </fieldset>
      )}

      <label className="mt-3 block text-xs text-[#6F7979]">
        Currency
        <input
          className={FIELD_CLASS}
          value={currency}
          onChange={(event) => setCurrency(event.target.value)}
          placeholder="USD"
          maxLength={3}
        />
      </label>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="block text-xs text-[#6F7979]">
          Minimum order quantity
          <input
            className={FIELD_CLASS}
            inputMode="numeric"
            value={minimumOrderQuantity}
            onChange={(event) => setMinimumOrderQuantity(event.target.value)}
          />
        </label>
        <label className="block text-xs text-[#6F7979]">
          …in what unit
          <input
            className={FIELD_CLASS}
            value={minimumOrderQuantityUnitLabel}
            onChange={(event) => setMinimumOrderQuantityUnitLabel(event.target.value)}
            placeholder="pieces"
          />
        </label>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="block text-xs text-[#6F7979]">
          Minimum lead time (days)
          <input
            className={FIELD_CLASS}
            inputMode="numeric"
            value={minimumLeadTimeDays}
            onChange={(event) => setMinimumLeadTimeDays(event.target.value)}
          />
        </label>
        <label className="block text-xs text-[#6F7979]">
          Maximum lead time (days)
          <input
            className={FIELD_CLASS}
            inputMode="numeric"
            value={maximumLeadTimeDays}
            onChange={(event) => setMaximumLeadTimeDays(event.target.value)}
          />
        </label>
      </div>

      <label className="mt-3 flex items-center gap-2 text-sm text-[#191C1C]">
        <input
          type="checkbox"
          checked={acceptingInquiries}
          onChange={(event) => setAcceptingInquiries(event.target.checked)}
        />
        Accept manufacturing inquiries
      </label>
      <p className="mt-1 text-[11px] leading-4 text-[#6F7979]">
        Turning this off keeps your profile in the directory and says you are not taking new
        inquiries. It does not hide you.
      </p>

      <button type="submit" className={`mt-3 ${PRIMARY_BUTTON_CLASS}`} disabled={!isSubmittable}>
        Save terms
      </button>

      {isMoqHalfFilled && (
        <p className="mt-1 text-xs leading-4 text-destructive">
          A minimum order quantity needs its unit, or neither. 500 pieces and 500 cartons are
          different businesses.
        </p>
      )}
      <MutationNotice
        result={updateTerms.data}
        fallbackMessage="Those terms did not save. Try again."
        hasThrown={updateTerms.isError}
      />
    </form>
  );
}

function SampleFeeOption({
  value,
  current,
  onSelect,
  label,
}: {
  value: SampleFeeChoice;
  current: SampleFeeChoice;
  onSelect: (choice: SampleFeeChoice) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-[#191C1C]">
      <input
        type="radio"
        name="sample-fee-choice"
        checked={current === value}
        onChange={() => onSelect(value)}
      />
      {label}
    </label>
  );
}

// --- Local helpers -----------------------------------------------------------

/** Replaces one row in a positional draft list. Kept local: nothing else edits these shapes. */
function patchAt<TDraft>(
  drafts: readonly TDraft[],
  targetIndex: number,
  patch: Partial<TDraft>,
): TDraft[] {
  return drafts.map((draft, index) => (index === targetIndex ? { ...draft, ...patch } : draft));
}

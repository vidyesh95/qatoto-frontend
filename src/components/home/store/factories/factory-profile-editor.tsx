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
  useAddOrganizationMediaMutation,
  useDeleteOrganizationMediaMutation,
  useOrganizationCertificationsQuery,
  useReorderOrganizationMediaMutation,
  useReplaceFactoryProductionLinesMutation,
  useReplaceFactorySitesMutation,
  useReplaceOrganizationCapabilitiesMutation,
  useReplaceOrganizationSiteAccessMutation,
  useReplaceOrganizationStakeholdersMutation,
  useSubmitOrganizationCertificationMutation,
  useUpdateFactoryTermsMutation,
  useUploadStakeholderPhotoMutation,
  useUpsertSellerProfileMutation,
  useWithdrawOrganizationCertificationMutation,
} from "@/hooks/store/factory-profile";
import { useResettableAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";
import { formatSquareMetresLabel } from "@/lib/store/format";
import {
  ORGANIZATION_CAPABILITY_KINDS,
  ORGANIZATION_MEDIA_KINDS,
  SELLER_BUSINESS_TYPES,
  SELLER_PROFILE_MAX_MEDIA,
  SELLER_PROFILE_MAX_SITE_ACCESS_ROWS,
  SELLER_PROFILE_MAX_STAKEHOLDERS,
  SITE_ACCESS_MODES,
  VISIT_POLICIES,
  type CapabilityRowInput,
  type OrganizationCapabilityKind,
  type OwnSellerDeclaredProfile,
  type SellerDeclaredProfile,
  type SiteAccessRowInput,
  type StakeholderRowInput,
} from "@/lib/store/organizations.schemas";
import {
  FACTORY_CERTIFICATION_LABELS,
  FACTORY_CERTIFICATIONS,
  type FactoryCertification,
  type FactoryProductionLine,
  type FactoryProductionLineInput,
  type FactorySamplePolicy,
  type FactorySite,
  type FactorySiteInput,
  type UpdateFactoryTermsInput,
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

/**
 * Narrows a `<select>`'s value against the tuple it was rendered from.
 *
 * NOT AN `as`. These enums have to byte-match a Postgres `pgEnum` label, and an assertion is a claim
 * about the DOM rather than a check of it — exactly where a near-miss goes unnoticed until the parse
 * fails. `undefined` means "not one of ours", which every caller treats as unstated.
 */
function narrowToOption<TOption extends string>(
  options: readonly TOption[],
  value: string,
): TOption | undefined {
  return options.find((option) => option === value);
}

function toInputText(value: number | null): string {
  return value === null ? "" : String(value);
}

/**
 * What the three whole-object PUT forms prefill from.
 *
 * NOT `FactoryDetail` ANY MORE, and the reason is who can read it. The public factory detail read
 * sits behind `tradeState = 'active' AND visibility = 'public'`, so prefilling from it meant a
 * private, unlisted or not-yet-active seller could not open its own editor at all. Every field
 * below comes from `GET …/seller-profile`, which is gated on membership instead — the page maps it
 * once and this component never learns which read it came from.
 */
export interface FactoryProfileEditorSource {
  readonly displayName: string;
  readonly productionLines: readonly FactoryProductionLine[];
  readonly sites: readonly FactorySite[];
  readonly samplePolicy: FactorySamplePolicy;
  readonly orderBounds: OwnSellerDeclaredProfile["orderBounds"];
  readonly acceptingInquiries: boolean;
}

export default function FactoryProfileEditor({
  organizationId,
  source,
  declaredProfile,
}: {
  organizationId: string;
  source: FactoryProfileEditorSource;
  /**
   * The four lists and the scalar block. NULL means the organization has no profile row yet OR
   * that read failed — both are states where an empty form would be a lie, so the sections say
   * which.
   */
  declaredProfile: SellerDeclaredProfile | null;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 pt-4 pb-10 lg:px-6">
      <header>
        <h1 className="font-serif text-xl font-semibold text-[#191C1C] md:text-2xl">
          Your company profile
        </h1>
        {/* NOT "factory profile" any more. `businessType` spans manufacturer, trading company,
            agent and distributor — a trading company has stakeholders and certifications and no
            production lines at all, so the page's own title should not assume a factory. */}
        <p className="mt-1 text-sm leading-5 text-[#6F7979]">
          What buyers see on {source.displayName} across the directory and your storefront.
        </p>
      </header>

      <ProductionLinesForm organizationId={organizationId} source={source} />
      <SitesForm organizationId={organizationId} source={source} />
      <TermsForm organizationId={organizationId} source={source} />

      {declaredProfile === null ? (
        <p className={`${SECTION_CLASS} text-sm leading-5 text-[#6F7979]`}>
          The rest of your profile could not be loaded. It is readable once your organization is
          active and public, which is also when buyers can see it.
        </p>
      ) : (
        <>
          <CompanyFactsForm organizationId={organizationId} profile={declaredProfile} />
          <SiteAccessForm organizationId={organizationId} profile={declaredProfile} />
          <StakeholdersForm organizationId={organizationId} profile={declaredProfile} />
          <CapabilitiesForm organizationId={organizationId} profile={declaredProfile} />
          <MediaForm organizationId={organizationId} profile={declaredProfile} />
          <CertificationsForm organizationId={organizationId} />
        </>
      )}
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
  source,
}: {
  organizationId: string;
  source: FactoryProfileEditorSource;
}) {
  const [lines, setLines] = useState<ProductionLineDraft[]>(() =>
    source.productionLines.map((line) => ({
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

function SitesForm({
  organizationId,
  source,
}: {
  organizationId: string;
  source: FactoryProfileEditorSource;
}) {
  const [sites, setSites] = useState<SiteDraft[]>(() =>
    source.sites.map((site) => ({
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

function TermsForm({
  organizationId,
  source,
}: {
  organizationId: string;
  source: FactoryProfileEditorSource;
}) {
  const { samplePolicy, orderBounds } = source;

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
    toInputText(orderBounds.minimumOrderQuantity),
  );
  const [minimumOrderQuantityUnitLabel, setMinimumOrderQuantityUnitLabel] = useState(
    orderBounds.minimumOrderQuantityUnitLabel ?? "",
  );
  const [minimumLeadTimeDays, setMinimumLeadTimeDays] = useState(
    toInputText(orderBounds.minimumLeadTimeDays),
  );
  const [maximumLeadTimeDays, setMaximumLeadTimeDays] = useState(
    toInputText(orderBounds.maximumLeadTimeDays),
  );
  const [acceptingInquiries, setAcceptingInquiries] = useState(source.acceptingInquiries);

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

        /**
         * EVERY FIELD IS SENT, AND UNSTATED IS AN EXPLICIT `null`.
         *
         * This block used to OMIT the fields the seller left blank. `ReplaceFactoryTermsSchema`
         * declares them `.nullable()` without `.optional()`, so an omitted key is a 422 and this
         * form could never have saved once against the real route.
         *
         * The three-way sample-fee answer survives the change intact, which is the thing worth
         * protecting here: `unstated` is `null`, `free` is a deliberate `0`, and `priced` is the
         * number. Collapsing the first two would tell a buyer a sample is free when nobody said so.
         */
        const input: UpdateFactoryTermsInput = {
          offersSamples,
          sampleCurrency: currency.trim().toUpperCase(),
          acceptingInquiries,
          sampleLeadTimeDays: toOptionalInteger(sampleLeadTimeDays) ?? null,
          sampleFeeInCents:
            sampleFeeChoice === "unstated"
              ? null
              : sampleFeeChoice === "free"
                ? 0
                : (toOptionalInteger(sampleFeeInCents) ?? null),
          // Both-or-neither, enforced before the request by `isSubmittable` and again by the
          // server's own refine. Half-filled never leaves this component.
          minimumOrderQuantity:
            hasQuantity && hasQuantityUnit
              ? (toOptionalInteger(minimumOrderQuantity) ?? null)
              : null,
          minimumOrderQuantityUnitLabel:
            hasQuantity && hasQuantityUnit
              ? (toOptionalText(minimumOrderQuantityUnitLabel) ?? null)
              : null,
          minimumLeadTimeDays: toOptionalInteger(minimumLeadTimeDays) ?? null,
          maximumLeadTimeDays: toOptionalInteger(maximumLeadTimeDays) ?? null,
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

// --- Seller profile sections (A13) ------------------------------------------
//
// ⚠️ **THREE DIFFERENT SAVE SEMANTICS LIVE BELOW AND THEY MUST NOT BE COPIED BETWEEN EACH OTHER.**
//
//   `CompanyFactsForm`   — a SPARSE PATCH. An omitted key is untouched; an explicit `null` clears.
//   site access / caps   — REPLACE-SETS THAT HARD-DELETE, with NO stable row ids: every save mints
//                          fresh ones, so a returned id is valid only until the next write.
//   stakeholders         — a REPLACE-SET THAT PRESERVES IDENTITY through an echoed `id`, which is
//                          what keeps an uploaded portrait attached.
//
// ⚠️ **EVERY SAVE NEEDS AN `Idempotency-Key`, minted once per attempt and rotated only on success.**
// A key regenerated per request would defeat the mechanism on exactly the retry it exists for.
//
// ⚠️ **A 404 ON ANY OF THESE MEANS "NOT YOURS, OR NOT YOUR ROLE".** These writes are
// owner/administrator only and the backend refuses a non-member and an under-privileged member with
// the same status, deliberately, so the message is rendered verbatim rather than interpreted.

/** `PATCH …/seller-profile` — the scalar block. The one sparse write on this page. */
function CompanyFactsForm({
  organizationId,
  profile,
}: {
  organizationId: string;
  profile: SellerDeclaredProfile;
}) {
  const [yearFounded, setYearFounded] = useState(toInputText(profile.yearFounded));
  const [factoryCount, setFactoryCount] = useState(toInputText(profile.factoryCount));
  const [totalStaffCount, setTotalStaffCount] = useState(toInputText(profile.totalStaffCount));
  const [publicSummary, setPublicSummary] = useState(profile.publicSummary ?? "");
  const [businessType, setBusinessType] = useState(profile.businessType ?? "");
  const [visitPolicy, setVisitPolicy] = useState(profile.visitPolicy ?? "");
  const [acceptingCustomOrders, setAcceptingCustomOrders] = useState(profile.acceptingCustomOrders);

  const upsertProfile = useUpsertSellerProfileMutation();
  const { getIdempotencyKey, resetIdempotencyKey } = useResettableAttemptIdempotencyKey();

  return (
    <form
      className={SECTION_CLASS}
      onSubmit={(event) => {
        event.preventDefault();
        if (upsertProfile.isPending) return;
        // EVERY FIELD IS SENT, AND A CLEARED CONTROL IS AN EXPLICIT `null`. This write is sparse, so
        // omitting a key means "leave it alone" — which would make clearing a value impossible.
        // `null` is how the seller says "I no longer state this".
        upsertProfile.mutate(
          {
            organizationId,
            idempotencyKey: getIdempotencyKey(),
            input: {
              yearFounded: toOptionalInteger(yearFounded) ?? null,
              factoryCount: toOptionalInteger(factoryCount) ?? null,
              totalStaffCount: toOptionalInteger(totalStaffCount) ?? null,
              publicSummary: toOptionalText(publicSummary) ?? null,
              businessType: narrowToOption(SELLER_BUSINESS_TYPES, businessType) ?? null,
              visitPolicy: narrowToOption(VISIT_POLICIES, visitPolicy) ?? null,
              acceptingCustomOrders,
            },
          },
          {
            onSuccess: (result) => {
              if (!result.success) return;
              resetIdempotencyKey();
            },
          },
        );
      }}
    >
      <h2 className="text-sm font-medium text-[#191C1C]">Company facts</h2>
      <p className="mt-1 text-xs leading-4 text-[#6F7979]">
        What you state about yourself. Buyers see these beside measured figures Qatoto calculates,
        and the two are labelled apart.
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="block text-xs font-medium text-[#6F7979]">
          Year founded
          <input
            type="text"
            inputMode="numeric"
            value={yearFounded}
            onChange={(event) => setYearFounded(event.target.value)}
            className={FIELD_CLASS}
          />
        </label>
        <label className="block text-xs font-medium text-[#6F7979]">
          Factories
          <input
            type="text"
            inputMode="numeric"
            value={factoryCount}
            onChange={(event) => setFactoryCount(event.target.value)}
            className={FIELD_CLASS}
          />
        </label>
        <label className="block text-xs font-medium text-[#6F7979]">
          Total staff
          <input
            type="text"
            inputMode="numeric"
            value={totalStaffCount}
            onChange={(event) => setTotalStaffCount(event.target.value)}
            className={FIELD_CLASS}
          />
        </label>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium text-[#6F7979]">
          Business type
          <select
            value={businessType}
            onChange={(event) => setBusinessType(event.target.value)}
            className={FIELD_CLASS}
          >
            <option value="">Not stated</option>
            {SELLER_BUSINESS_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-[#6F7979]">
          Visitors
          <select
            value={visitPolicy}
            onChange={(event) => setVisitPolicy(event.target.value)}
            className={FIELD_CLASS}
          >
            <option value="">Not stated</option>
            {VISIT_POLICIES.map((policy) => (
              <option key={policy} value={policy}>
                {policy.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-3 block text-xs font-medium text-[#6F7979]">
        Summary
        <textarea
          value={publicSummary}
          onChange={(event) => setPublicSummary(event.target.value)}
          rows={3}
          maxLength={4000}
          className={FIELD_CLASS}
        />
      </label>

      <label className="mt-3 flex items-center gap-2 text-xs text-[#6F7979]">
        <input
          type="checkbox"
          checked={acceptingCustomOrders}
          onChange={(event) => setAcceptingCustomOrders(event.target.checked)}
        />
        We take custom orders
      </label>

      <button
        type="submit"
        disabled={upsertProfile.isPending}
        className={`${PRIMARY_BUTTON_CLASS} mt-3`}
      >
        {upsertProfile.isPending ? "Saving…" : "Save company facts"}
      </button>
      <MutationNotice
        result={upsertProfile.data}
        fallbackMessage="Those facts did not save. Try again."
        hasThrown={upsertProfile.isError}
      />
    </form>
  );
}

/**
 * `PUT …/site-access` — the whole freight-access list.
 *
 * ⚠️ **AN OMITTED ROW IS DESTROYED.** Delete-then-insert, no `state` column, no revive — stricter
 * than a variant or a customization slot, both of which retire. So a blank row is REFUSED rather
 * than skipped: skipping one would be a deletion the seller did not ask for.
 *
 * ⚠️ **THE ROW IDS CHANGE ON EVERY SAVE**, which is why the index is the key here and why nothing
 * caches an id across a write.
 */
function SiteAccessForm({
  organizationId,
  profile,
}: {
  organizationId: string;
  profile: SellerDeclaredProfile;
}) {
  interface SiteAccessDraft {
    readonly accessMode: string;
    readonly facilityName: string;
    readonly distanceKm: string;
    readonly notes: string;
  }

  const [rows, setRows] = useState<SiteAccessDraft[]>(() =>
    profile.siteAccess.map((row) => ({
      accessMode: row.accessMode,
      facilityName: row.facilityName,
      distanceKm: toInputText(row.distanceKm),
      notes: row.notes ?? "",
    })),
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const replaceSiteAccess = useReplaceOrganizationSiteAccessMutation();
  const { getIdempotencyKey, resetIdempotencyKey } = useResettableAttemptIdempotencyKey();

  return (
    <form
      className={SECTION_CLASS}
      onSubmit={(event) => {
        event.preventDefault();
        if (replaceSiteAccess.isPending) return;

        const collected: SiteAccessRowInput[] = [];
        for (const [rowIndex, row] of rows.entries()) {
          const facilityName = row.facilityName.trim();
          if (facilityName.length === 0) {
            // REFUSED, NOT SKIPPED — see the docblock. A dropped row is a deleted row.
            setLocalError(`Name the facility on row ${String(rowIndex + 1)}, or remove the row.`);
            return;
          }
          const accessMode = narrowToOption(SITE_ACCESS_MODES, row.accessMode);
          if (accessMode === undefined) {
            setLocalError(`Choose a mode for row ${String(rowIndex + 1)}.`);
            return;
          }
          collected.push({
            accessMode,
            facilityName,
            // Omitted rather than nulled: these two are `.nullable().optional()`, so absence is the
            // way to say "unstated" without asserting a null.
            ...(toOptionalInteger(row.distanceKm) === undefined
              ? {}
              : { distanceKm: toOptionalInteger(row.distanceKm) }),
            ...(toOptionalText(row.notes) === undefined
              ? {}
              : { notes: toOptionalText(row.notes) }),
          });
        }
        setLocalError(null);
        replaceSiteAccess.mutate(
          { organizationId, rows: collected, idempotencyKey: getIdempotencyKey() },
          {
            onSuccess: (result) => {
              if (!result.success) return;
              resetIdempotencyKey();
            },
          },
        );
      }}
    >
      <h2 className="text-sm font-medium text-[#191C1C]">Freight access</h2>
      <p className="mt-1 text-xs leading-4 text-[#6F7979]">
        The ports, airports and terminals you ship through, and how far each one is.
      </p>

      <ul className="mt-3 space-y-3">
        {rows.map((row, rowIndex) => (
          // The index IS the identity: these rows carry no id on the way up, and the server mints
          // fresh ones on every save.
          <li key={rowIndex} className="rounded-lg border border-[#CAC4D0]/60 p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block text-xs font-medium text-[#6F7979]">
                Mode
                <select
                  value={row.accessMode}
                  onChange={(event) =>
                    setRows(patchAt(rows, rowIndex, { accessMode: event.target.value }))
                  }
                  className={FIELD_CLASS}
                >
                  {SITE_ACCESS_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-medium text-[#6F7979]">
                Facility
                <input
                  type="text"
                  value={row.facilityName}
                  onChange={(event) =>
                    setRows(patchAt(rows, rowIndex, { facilityName: event.target.value }))
                  }
                  className={FIELD_CLASS}
                />
              </label>
              <label className="block text-xs font-medium text-[#6F7979]">
                Distance (km)
                <input
                  type="text"
                  inputMode="numeric"
                  value={row.distanceKm}
                  onChange={(event) =>
                    setRows(patchAt(rows, rowIndex, { distanceKm: event.target.value }))
                  }
                  className={FIELD_CLASS}
                />
              </label>
              <label className="block text-xs font-medium text-[#6F7979]">
                Notes
                <input
                  type="text"
                  value={row.notes}
                  onChange={(event) =>
                    setRows(patchAt(rows, rowIndex, { notes: event.target.value }))
                  }
                  className={FIELD_CLASS}
                />
              </label>
            </div>
            <button
              type="button"
              onClick={() => setRows(rows.filter((_row, index) => index !== rowIndex))}
              className="mt-2 cursor-pointer text-xs font-medium text-destructive"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() =>
          setRows([...rows, { accessMode: "sea", facilityName: "", distanceKm: "", notes: "" }])
        }
        disabled={rows.length >= SELLER_PROFILE_MAX_SITE_ACCESS_ROWS}
        className={`${QUIET_BUTTON_CLASS} mt-3`}
      >
        Add access point
      </button>

      <div className="mt-3">
        <button
          type="submit"
          disabled={replaceSiteAccess.isPending}
          className={PRIMARY_BUTTON_CLASS}
        >
          {replaceSiteAccess.isPending ? "Saving…" : "Save freight access"}
        </button>
      </div>
      {localError !== null && (
        <p className="mt-1 text-xs leading-4 text-destructive">{localError}</p>
      )}
      <MutationNotice
        result={replaceSiteAccess.data}
        fallbackMessage="Those access points did not save. Try again."
        hasThrown={replaceSiteAccess.isError}
      />
    </form>
  );
}

/**
 * `PUT …/stakeholders` — the officer list. The ONE identity-preserving replace-set on this page.
 *
 * ⚠️ **THE `id` IS ECHOED BACK FOR EVERY ROW BEING KEPT**, and that is what keeps an uploaded
 * portrait attached: the photo lives on the row, so a row that loses its id loses its face. An
 * unrecognised id is silently treated as a NEW row rather than refused, which is why a hydrated
 * row's id is carried rather than regenerated.
 *
 * ⚠️ **DEDUPED BEFORE SENDING.** A repeated id collapses two rows into one server-side with no
 * error — the response simply comes back short. The server will not catch this; this does.
 *
 * ⚠️ **NO EMAIL, NO PHONE, AND NO COLUMN FOR ONE.** A name and a role are what a company already
 * prints on its own site; a direct line to a named individual is personal data the table cannot
 * hold.
 */
function StakeholdersForm({
  organizationId,
  profile,
}: {
  organizationId: string;
  profile: SellerDeclaredProfile;
}) {
  interface StakeholderDraft {
    readonly savedId: string | null;
    readonly fullName: string;
    readonly roleTitle: string;
    readonly photoUrl: string | null;
  }

  const [rows, setRows] = useState<StakeholderDraft[]>(() =>
    profile.stakeholders.map((row) => ({
      savedId: row.id,
      fullName: row.fullName,
      roleTitle: row.roleTitle,
      photoUrl: row.photoUrl,
    })),
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const replaceStakeholders = useReplaceOrganizationStakeholdersMutation();
  const uploadPhoto = useUploadStakeholderPhotoMutation();
  const { getIdempotencyKey, resetIdempotencyKey } = useResettableAttemptIdempotencyKey();
  const photoAttempt = useResettableAttemptIdempotencyKey();

  return (
    <form
      className={SECTION_CLASS}
      onSubmit={(event) => {
        event.preventDefault();
        if (replaceStakeholders.isPending) return;

        const collected: StakeholderRowInput[] = [];
        const seenIds = new Set<string>();
        for (const [rowIndex, row] of rows.entries()) {
          const fullName = row.fullName.trim();
          const roleTitle = row.roleTitle.trim();
          if (fullName.length === 0 || roleTitle.length === 0) {
            setLocalError(
              `Give person ${String(rowIndex + 1)} a name and a role, or remove the row.`,
            );
            return;
          }
          // THE DEDUPE. Two rows carrying one id would silently become one row on the server.
          if (row.savedId !== null && seenIds.has(row.savedId)) {
            setLocalError("Two rows refer to the same person. Remove one of them.");
            return;
          }
          if (row.savedId !== null) seenIds.add(row.savedId);
          collected.push({
            ...(row.savedId === null ? {} : { id: row.savedId }),
            fullName,
            roleTitle,
          });
        }
        setLocalError(null);
        replaceStakeholders.mutate(
          { organizationId, rows: collected, idempotencyKey: getIdempotencyKey() },
          {
            onSuccess: (result) => {
              if (!result.success) return;
              resetIdempotencyKey();
              // Re-seed from the SERVER's rows: a new person now has an id, and only a row with an
              // id can receive a portrait. ⚠️ `{ rows }` — this write does NOT answer the profile.
              setRows(
                result.data.rows.map((row) => ({
                  savedId: row.id,
                  fullName: row.fullName,
                  roleTitle: row.roleTitle,
                  photoUrl: row.photoUrl,
                })),
              );
            },
          },
        );
      }}
    >
      <h2 className="text-sm font-medium text-[#191C1C]">Who runs it</h2>
      <p className="mt-1 text-xs leading-4 text-[#6F7979]">
        Names and roles only — no contact details. Save the list before adding a photo: a portrait
        attaches to a saved person.
      </p>

      <ul className="mt-3 space-y-3">
        {rows.map((row, rowIndex) => (
          <li
            key={row.savedId ?? `new-${String(rowIndex)}`}
            className="rounded-lg border border-[#CAC4D0]/60 p-3"
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block text-xs font-medium text-[#6F7979]">
                Name
                <input
                  type="text"
                  value={row.fullName}
                  onChange={(event) =>
                    setRows(patchAt(rows, rowIndex, { fullName: event.target.value }))
                  }
                  className={FIELD_CLASS}
                />
              </label>
              <label className="block text-xs font-medium text-[#6F7979]">
                Role
                <input
                  type="text"
                  value={row.roleTitle}
                  onChange={(event) =>
                    setRows(patchAt(rows, rowIndex, { roleTitle: event.target.value }))
                  }
                  className={FIELD_CLASS}
                />
              </label>
            </div>

            {row.savedId === null ? (
              <p className="mt-2 text-[11px] leading-4 text-[#6F7979]">
                Save the list to add a photo for this person.
              </p>
            ) : (
              <label className="mt-2 block text-xs font-medium text-[#6F7979]">
                {row.photoUrl === null ? "Add a photo" : "Replace the photo"}
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadPhoto.isPending}
                  onChange={(event) => {
                    const photoFile = event.target.files?.[0];
                    if (photoFile === undefined) return;
                    uploadPhoto.mutate(
                      {
                        organizationId,
                        stakeholderId: row.savedId ?? "",
                        photoFile,
                        idempotencyKey: photoAttempt.getIdempotencyKey(),
                      },
                      {
                        onSuccess: (result) => {
                          if (!result.success) return;
                          photoAttempt.resetIdempotencyKey();
                          // ⚠️ ONE ROW COMES BACK, not the list — so this patches the row it
                          // belongs to rather than replacing the array, which would discard any
                          // unsaved edits the seller has made to the others.
                          const saved = result.data;
                          setRows((previous) =>
                            previous.map((existing) =>
                              existing.savedId === saved.id
                                ? { ...existing, photoUrl: saved.photoUrl }
                                : existing,
                            ),
                          );
                        },
                      },
                    );
                  }}
                  className="mt-1 block w-full text-xs"
                />
              </label>
            )}

            <button
              type="button"
              onClick={() => setRows(rows.filter((_row, index) => index !== rowIndex))}
              className="mt-2 cursor-pointer text-xs font-medium text-destructive"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() =>
          setRows([...rows, { savedId: null, fullName: "", roleTitle: "", photoUrl: null }])
        }
        disabled={rows.length >= SELLER_PROFILE_MAX_STAKEHOLDERS}
        className={`${QUIET_BUTTON_CLASS} mt-3`}
      >
        Add person
      </button>

      <div className="mt-3">
        <button
          type="submit"
          disabled={replaceStakeholders.isPending}
          className={PRIMARY_BUTTON_CLASS}
        >
          {replaceStakeholders.isPending ? "Saving…" : "Save people"}
        </button>
      </div>
      {localError !== null && (
        <p className="mt-1 text-xs leading-4 text-destructive">{localError}</p>
      )}
      <MutationNotice
        result={replaceStakeholders.data}
        fallbackMessage="Those people did not save. Try again."
        hasThrown={replaceStakeholders.isError}
      />
      <MutationNotice
        result={uploadPhoto.data}
        fallbackMessage="That photo did not upload."
        hasThrown={uploadPhoto.isError}
      />
    </form>
  );
}

/**
 * `PUT …/capabilities` — delete-then-insert, like freight access.
 *
 * ⚠️ **A KIND MAY BE DECLARED ONCE, and a repeat is a 409 rather than a dedupe.** So the picker
 * offers only kinds not already held: a control whose only outcome is a refusal is worse than no
 * control, which is the same call the category-attributes console made.
 */
function CapabilitiesForm({
  organizationId,
  profile,
}: {
  organizationId: string;
  profile: SellerDeclaredProfile;
}) {
  interface CapabilityDraft {
    readonly capabilityKind: OrganizationCapabilityKind;
    readonly detail: string;
  }

  const [rows, setRows] = useState<CapabilityDraft[]>(() =>
    profile.capabilities.map((row) => ({
      capabilityKind: row.capabilityKind,
      detail: row.detail ?? "",
    })),
  );
  const replaceCapabilities = useReplaceOrganizationCapabilitiesMutation();
  const { getIdempotencyKey, resetIdempotencyKey } = useResettableAttemptIdempotencyKey();

  const declaredKinds = new Set(rows.map((row) => row.capabilityKind));
  const availableKinds = ORGANIZATION_CAPABILITY_KINDS.filter((kind) => !declaredKinds.has(kind));

  return (
    <form
      className={SECTION_CLASS}
      onSubmit={(event) => {
        event.preventDefault();
        if (replaceCapabilities.isPending) return;
        const collected: CapabilityRowInput[] = rows.map((row) => ({
          capabilityKind: row.capabilityKind,
          // Omitted rather than nulled — `.nullable().optional()` on the wire.
          ...(toOptionalText(row.detail) === undefined
            ? {}
            : { detail: toOptionalText(row.detail) }),
        }));
        replaceCapabilities.mutate(
          { organizationId, rows: collected, idempotencyKey: getIdempotencyKey() },
          {
            onSuccess: (result) => {
              if (!result.success) return;
              resetIdempotencyKey();
            },
          },
        );
      }}
    >
      <h2 className="text-sm font-medium text-[#191C1C]">What you can do</h2>
      <p className="mt-1 text-xs leading-4 text-[#6F7979]">
        Declared capabilities. Buyers read these beside your certifications, which are checked.
      </p>

      <ul className="mt-3 space-y-3">
        {rows.map((row, rowIndex) => (
          <li key={row.capabilityKind} className="rounded-lg border border-[#CAC4D0]/60 p-3">
            <p className="text-xs font-medium text-[#191C1C]">
              {row.capabilityKind.replaceAll("_", " ")}
            </p>
            <label className="mt-1 block text-xs font-medium text-[#6F7979]">
              Detail
              <input
                type="text"
                value={row.detail}
                maxLength={1000}
                onChange={(event) =>
                  setRows(patchAt(rows, rowIndex, { detail: event.target.value }))
                }
                className={FIELD_CLASS}
              />
            </label>
            <button
              type="button"
              onClick={() => setRows(rows.filter((_row, index) => index !== rowIndex))}
              className="mt-2 cursor-pointer text-xs font-medium text-destructive"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      {availableKinds.length > 0 && (
        <label className="mt-3 block text-xs font-medium text-[#6F7979]">
          Add a capability
          <select
            value=""
            onChange={(event) => {
              const nextKind = ORGANIZATION_CAPABILITY_KINDS.find(
                (kind) => kind === event.target.value,
              );
              if (nextKind === undefined) return;
              setRows([...rows, { capabilityKind: nextKind, detail: "" }]);
            }}
            className={FIELD_CLASS}
          >
            <option value="">Choose one…</option>
            {availableKinds.map((kind) => (
              <option key={kind} value={kind}>
                {kind.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="mt-3">
        <button
          type="submit"
          disabled={replaceCapabilities.isPending}
          className={PRIMARY_BUTTON_CLASS}
        >
          {replaceCapabilities.isPending ? "Saving…" : "Save capabilities"}
        </button>
      </div>
      <MutationNotice
        result={replaceCapabilities.data}
        fallbackMessage="Those capabilities did not save. Try again."
        hasThrown={replaceCapabilities.isError}
      />
    </form>
  );
}

/**
 * `POST …/media`, `PATCH …/media/reorder`, `DELETE …/media/:mediaId`.
 *
 * ⚠️ **UNLIKE EVERY OTHER SECTION HERE, THESE ARE PER-ROW AND IMMEDIATE.** There is no draft and no
 * save button: an upload is a 201, a delete is a delete. A staged gallery would have to reconcile
 * three routes against a local list and would show a photo that is not there yet.
 *
 * ⚠️ **REORDER IS AN EXACT COVER** — every current image, exactly once, or a 409. So it is sent from
 * the SERVER's list rather than a local one, and the buttons move ids within that list.
 *
 * ⚠️ **201, NOT 202. There is no scan here**, unlike a trade document, and no copy may say a photo
 * is being checked.
 */
function MediaForm({
  organizationId,
  profile,
}: {
  organizationId: string;
  profile: SellerDeclaredProfile;
}) {
  const [gallery, setGallery] = useState(() => profile.media);
  const [mediaKind, setMediaKind] = useState<string>(ORGANIZATION_MEDIA_KINDS[0]);
  const addMedia = useAddOrganizationMediaMutation();
  const reorderMedia = useReorderOrganizationMediaMutation();
  const deleteMedia = useDeleteOrganizationMediaMutation();
  const addAttempt = useResettableAttemptIdempotencyKey();
  const reorderAttempt = useResettableAttemptIdempotencyKey();
  const deleteAttempt = useResettableAttemptIdempotencyKey();

  function moveImage(fromIndex: number, toIndex: number) {
    if (toIndex < 0 || toIndex >= gallery.length) return;
    const reordered = [...gallery];
    const [moved] = reordered.splice(fromIndex, 1);
    if (moved === undefined) return;
    reordered.splice(toIndex, 0, moved);
    reorderMedia.mutate(
      {
        organizationId,
        mediaIdsInOrder: reordered.map((image) => image.id),
        idempotencyKey: reorderAttempt.getIdempotencyKey(),
      },
      {
        onSuccess: (result) => {
          if (!result.success) return;
          reorderAttempt.resetIdempotencyKey();
          setGallery(result.data.media);
        },
      },
    );
  }

  return (
    <section className={SECTION_CLASS}>
      <h2 className="text-sm font-medium text-[#191C1C]">Photos</h2>
      <p className="mt-1 text-xs leading-4 text-[#6F7979]">
        Your factory, offices and work. The first one is the cover on your storefront.
      </p>

      <ul className="mt-3 space-y-2">
        {gallery.map((image, imageIndex) => (
          <li
            key={image.id}
            className="flex items-center gap-3 rounded-lg border border-[#CAC4D0]/60 p-2"
          >
            <span className="min-w-0 flex-1 truncate text-xs text-[#191C1C]">
              {image.altText ?? image.mediaKind.replaceAll("_", " ")}
            </span>
            <button
              type="button"
              onClick={() => moveImage(imageIndex, imageIndex - 1)}
              disabled={imageIndex === 0 || reorderMedia.isPending}
              aria-label={`Move image ${String(imageIndex + 1)} earlier`}
              className={QUIET_BUTTON_CLASS}
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => moveImage(imageIndex, imageIndex + 1)}
              disabled={imageIndex === gallery.length - 1 || reorderMedia.isPending}
              aria-label={`Move image ${String(imageIndex + 1)} later`}
              className={QUIET_BUTTON_CLASS}
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() =>
                deleteMedia.mutate(
                  {
                    organizationId,
                    mediaId: image.id,
                    idempotencyKey: deleteAttempt.getIdempotencyKey(),
                  },
                  {
                    onSuccess: (result) => {
                      if (!result.success) return;
                      deleteAttempt.resetIdempotencyKey();
                      // ⚠️ A BARE ACKNOWLEDGEMENT — the surviving gallery is not returned, so the
                      // row is dropped here by the id that was just deleted.
                      setGallery((previous) => previous.filter((row) => row.id !== image.id));
                    },
                  },
                )
              }
              disabled={deleteMedia.isPending}
              className="cursor-pointer text-xs font-medium text-destructive"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      {gallery.length >= SELLER_PROFILE_MAX_MEDIA ? (
        <p className="mt-3 text-xs leading-4 text-[#6F7979]">
          You have the maximum of {SELLER_PROFILE_MAX_MEDIA} photos. Remove one to add another.
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="block text-xs font-medium text-[#6F7979]">
            Kind
            <select
              value={mediaKind}
              onChange={(event) => setMediaKind(event.target.value)}
              className={FIELD_CLASS}
            >
              {ORGANIZATION_MEDIA_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {kind.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-[#6F7979]">
            Add a photo
            <input
              type="file"
              accept="image/*"
              disabled={addMedia.isPending}
              onChange={(event) => {
                const imageFile = event.target.files?.[0];
                if (imageFile === undefined) return;
                addMedia.mutate(
                  {
                    organizationId,
                    imageFile,
                    mediaKind,
                    altText: undefined,
                    idempotencyKey: addAttempt.getIdempotencyKey(),
                  },
                  {
                    onSuccess: (result) => {
                      if (!result.success) return;
                      addAttempt.resetIdempotencyKey();
                      // ⚠️ ONE ROW BACK — the photo just added, not the gallery it joined.
                      setGallery((previous) => [...previous, result.data]);
                    },
                  },
                );
              }}
              className="mt-1 block text-xs"
            />
          </label>
        </div>
      )}

      <MutationNotice
        result={addMedia.data}
        fallbackMessage="That photo did not upload."
        hasThrown={addMedia.isError}
      />
      <MutationNotice
        result={reorderMedia.data}
        fallbackMessage="That order did not save."
        hasThrown={reorderMedia.isError}
      />
      <MutationNotice
        result={deleteMedia.data}
        fallbackMessage="That photo could not be removed."
        hasThrown={deleteMedia.isError}
      />
    </section>
  );
}

/**
 * `GET …/certifications` and `POST …/certifications`.
 *
 * ⚠️ **THIS SECTION READS ITS OWN LIST RATHER THAN THE STOREFRONT'S, and that is the whole reason
 * the GET exists.** The public projection carries only APPROVED, unexpired rows and renames
 * `decidedAt` to `approvedAt`. A seller who has just submitted needs to see `pending`, and one who
 * was refused needs `decisionReason` — neither reaches the storefront.
 *
 * ⚠️ **A SUBMISSION IS 201 AND STARTS TWO INDEPENDENT CLOCKS.** The certification lands `pending`
 * for a moderator; its evidence lands `pending_scan` for a scanner. **Promotion is not approval**,
 * so nothing here may suggest a review happened because a file finished scanning.
 *
 * ⚠️ **WITHDRAW IS THE ONLY WAY TO REACH `withdrawn`, AND IT IS NOT A DELETE.** The row and its
 * evidence survive; the certificate stops being published and the audit chain carries the
 * retraction. `pending` and `approved` may be withdrawn, nothing else, and there is no un-withdraw
 * — the control says so before it is pressed.
 *
 * ⚠️ **THE STANDARD CODE IS WHAT BUYERS FILTER ON; THE STANDARD NAME IS WHAT THEY READ.** Only the
 * eight closed codes appear in the directory's certification facet. Leaving the picker on "not one
 * of these" is a real answer — the certificate still publishes, it is just unfilterable — and
 * nothing infers a code from the typed name.
 */
function CertificationsForm({ organizationId }: { organizationId: string }) {
  const [standardName, setStandardName] = useState("");
  const [standardCode, setStandardCode] = useState<FactoryCertification | undefined>(undefined);
  const [issuerName, setIssuerName] = useState("");
  const [certificateNumber, setCertificateNumber] = useState("");
  const [scopeSummary, setScopeSummary] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const certificationsQuery = useOrganizationCertificationsQuery(organizationId);
  const submitCertification = useSubmitOrganizationCertificationMutation();
  const withdrawCertification = useWithdrawOrganizationCertificationMutation();
  const { getIdempotencyKey, resetIdempotencyKey } = useResettableAttemptIdempotencyKey();
  /**
   * A SECOND KEY, ROTATED SEPARATELY. A withdrawal and a submission are different attempts, and
   * sharing one key would make a retracted claim and a new one collide inside the idempotency
   * window.
   */
  const {
    getIdempotencyKey: getWithdrawIdempotencyKey,
    resetIdempotencyKey: resetWithdrawIdempotencyKey,
  } = useResettableAttemptIdempotencyKey();

  const certifications = certificationsQuery.data?.success ? certificationsQuery.data.data : null;

  return (
    <form
      className={SECTION_CLASS}
      onSubmit={(event) => {
        event.preventDefault();
        if (submitCertification.isPending) return;
        if (evidenceFile === null) {
          setLocalError("Attach the certificate itself — a PDF or a photo of it.");
          return;
        }
        // Checked here because the backend refines it too: a client that let this through would
        // collect a 422 the seller could have been told about before uploading 8 MB.
        if (validUntil <= validFrom) {
          setLocalError("The expiry date must be after the start date.");
          return;
        }
        setLocalError(null);
        submitCertification.mutate(
          {
            organizationId,
            evidenceFile,
            idempotencyKey: getIdempotencyKey(),
            input: {
              standardName: standardName.trim(),
              // Omitted entirely when the seller picked none — the body is `.strict()` and there
              // is no "none" label in the enum.
              ...(standardCode === undefined ? {} : { standardCode }),
              issuerName: issuerName.trim(),
              certificateNumber: certificateNumber.trim(),
              ...(toOptionalText(scopeSummary) === undefined
                ? {}
                : { scopeSummary: toOptionalText(scopeSummary) }),
              validFrom,
              validUntil,
            },
          },
          {
            onSuccess: (result) => {
              if (!result.success) return;
              resetIdempotencyKey();
              setStandardName("");
              setStandardCode(undefined);
              setIssuerName("");
              setCertificateNumber("");
              setScopeSummary("");
              setValidFrom("");
              setValidUntil("");
              setEvidenceFile(null);
            },
          },
        );
      }}
    >
      <h2 className="text-sm font-medium text-[#191C1C]">Certifications</h2>
      <p className="mt-1 text-xs leading-4 text-[#6F7979]">
        Qatoto staff check each one against the certificate you attach. Buyers see it only once it
        is approved. Withdrawing a claim stops publishing it and cannot be undone.
      </p>
      <MutationNotice
        result={withdrawCertification.data}
        fallbackMessage="That certification did not withdraw. Try again."
        hasThrown={withdrawCertification.isError}
      />

      {certificationsQuery.isPending ? (
        <p className="mt-3 text-xs text-[#6F7979]">Loading your certifications…</p>
      ) : certifications === null ? (
        <p className="mt-3 text-xs text-destructive">
          {certificationsQuery.data?.success === false
            ? certificationsQuery.data.error.message
            : "Your certifications could not be loaded."}
        </p>
      ) : certifications.length === 0 ? (
        <p className="mt-3 text-xs text-[#6F7979]">No certifications submitted yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {certifications.map((certification) => (
            <li key={certification.id} className="rounded-lg border border-[#CAC4D0]/60 p-3">
              <p className="text-xs font-medium text-[#191C1C]">
                {certification.standardName}{" "}
                <span className="font-normal text-[#6F7979]">· {certification.state}</span>
              </p>
              <p className="text-[11px] leading-4 text-[#6F7979]">
                {certification.issuerName} · {certification.certificateNumber} · valid{" "}
                {certification.validFrom} to {certification.validUntil}
              </p>
              {/* The reason a moderator gave, shown only when there is one. A rejected claim the
                  seller cannot see the reason for is one they will simply resubmit. */}
              {certification.decisionReason !== null && (
                <p className="mt-1 text-[11px] leading-4 text-amber-800">
                  {certification.decisionReason}
                </p>
              )}
              {/* Offered on the two states the backend accepts, and on no others: asking about a
                  rejected or already-withdrawn row is a 409, not a retry. */}
              {(certification.state === "pending" || certification.state === "approved") && (
                <button
                  type="button"
                  disabled={withdrawCertification.isPending}
                  onClick={() => {
                    if (withdrawCertification.isPending) return;
                    withdrawCertification.mutate(
                      {
                        organizationId,
                        certificationId: certification.id,
                        idempotencyKey: getWithdrawIdempotencyKey(),
                      },
                      {
                        onSuccess: (result) => {
                          if (!result.success) return;
                          resetWithdrawIdempotencyKey();
                        },
                      },
                    );
                  }}
                  className={`${QUIET_BUTTON_CLASS} mt-2`}
                >
                  {withdrawCertification.isPending ? "Withdrawing…" : "Withdraw this claim"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <label className="block text-xs font-medium text-[#6F7979]">
          Standard
          <input
            type="text"
            value={standardName}
            maxLength={200}
            onChange={(event) => setStandardName(event.target.value)}
            placeholder="ISO 9001:2015"
            className={FIELD_CLASS}
          />
        </label>
        <label className="block text-xs font-medium text-[#6F7979]">
          Filterable code (optional)
          <select
            value={standardCode ?? ""}
            onChange={(event) =>
              setStandardCode(narrowToOption(FACTORY_CERTIFICATIONS, event.target.value))
            }
            className={FIELD_CLASS}
          >
            <option value="">Not one of these eight</option>
            {FACTORY_CERTIFICATIONS.map((certification) => (
              <option key={certification} value={certification}>
                {FACTORY_CERTIFICATION_LABELS[certification]}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-[11px] leading-4 font-normal text-[#6F7979]">
            Buyers filter the directory by these eight. Anything else still publishes on your
            profile — it just cannot be filtered for.
          </span>
        </label>
        <label className="block text-xs font-medium text-[#6F7979]">
          Issued by
          <input
            type="text"
            value={issuerName}
            maxLength={200}
            onChange={(event) => setIssuerName(event.target.value)}
            className={FIELD_CLASS}
          />
        </label>
        <label className="block text-xs font-medium text-[#6F7979]">
          Certificate number
          <input
            type="text"
            value={certificateNumber}
            maxLength={120}
            onChange={(event) => setCertificateNumber(event.target.value)}
            className={FIELD_CLASS}
          />
        </label>
        <label className="block text-xs font-medium text-[#6F7979]">
          Scope
          <input
            type="text"
            value={scopeSummary}
            maxLength={2000}
            onChange={(event) => setScopeSummary(event.target.value)}
            className={FIELD_CLASS}
          />
        </label>
        <label className="block text-xs font-medium text-[#6F7979]">
          Valid from
          <input
            type="date"
            value={validFrom}
            onChange={(event) => setValidFrom(event.target.value)}
            className={FIELD_CLASS}
          />
        </label>
        <label className="block text-xs font-medium text-[#6F7979]">
          Valid until
          <input
            type="date"
            value={validUntil}
            onChange={(event) => setValidUntil(event.target.value)}
            className={FIELD_CLASS}
          />
        </label>
      </div>

      <label className="mt-3 block text-xs font-medium text-[#6F7979]">
        The certificate (PDF, JPEG or PNG)
        <input
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          onChange={(event) => setEvidenceFile(event.target.files?.[0] ?? null)}
          className="mt-1 block w-full text-xs"
        />
      </label>

      <button
        type="submit"
        disabled={submitCertification.isPending}
        className={`${PRIMARY_BUTTON_CLASS} mt-3`}
      >
        {submitCertification.isPending ? "Submitting…" : "Submit for checking"}
      </button>
      {localError !== null && (
        <p className="mt-1 text-xs leading-4 text-destructive">{localError}</p>
      )}
      <MutationNotice
        result={submitCertification.data}
        fallbackMessage="That certification did not submit. Try again."
        hasThrown={submitCertification.isError}
      />
    </form>
  );
}

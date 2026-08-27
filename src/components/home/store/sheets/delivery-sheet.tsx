// TRANSPORT: props-only — renders the lane plan `delivery-cost.tsx` already fetched.
//
// THIS SHEET WAS THE LAST FULLY-MOCK FILE ON THE STORE PRODUCT SURFACE, and it was the worst one. It
// hardcoded two legs ("Shanghai port → Mumbai port"), invented prices for them, SUMMED `priceUsd`
// FLOATS IN THE BROWSER, baked a currency into a field name so a EUR lane could not be expressed,
// and — the part that actually mattered — NAMED TWO REAL FORWARDERS, Sinotrans and DHL, AGAINST
// FABRICATED RATES.
//
// (This header deliberately avoids spelling the old mock marker: the repo's check for it greps prose
// as readily as banners, so a file narrating its own history would report itself unwired forever.)
//
// All of it is replaced by `lanePlan`, which arrives on the delivery-estimate call the row above
// already makes. No new request.
//
// THE RATE TABLES SHIP EMPTY, DELIBERATELY, WITH NO SEED (A36). So today EVERY lane is uncovered, and
// this sheet's ordinary state is `options: []` with named reasons — not a priced picker. That
// inverts how it has to be built: the named-absence path is the product, and the priced path is the
// rare one. A blank panel here is the failure mode, not an acceptable default.
//
// FOUR RULES, EACH ONE A THING THE MOCK GOT WRONG:
//
//  1. EVERY PRICE RENDERS THROUGH `providerQuote` — the forwarder's name, its expiry and "subject to
//     re-measurement" sit in the same visual unit as the number. Qatoto sells no freight, so a price
//     detached from the forwarder who quoted it would read as the platform's own.
//  2. NOTHING IS SUMMED. `journeys[].totalInCents` and its transit range come from the server
//     already composed. The client adds nothing up, and where the server composed no journey there
//     is no total to show — not a zero.
//  3. NOTHING IS AUTO-SELECTED. The mock defaulted to "cheapest" per leg. "No mode chosen yet" is a
//     real state, and picking for the buyer commits them to five weeks at sea to save $40.
//  4. THE CHARGEABLE-WEIGHT BASIS TRAVELS WITH ITS PRICE. A buyer whose 20 kg of cushions bills as
//     3,000 kg reads a correct volumetric charge as an error unless told which weight won.
"use client";

import { useState } from "react";

import Image from "next/image";
import Link from "next/link";

import ModalSheet from "@/components/home/shared/modal-sheet";
import { formatCentsLabel, countryLabelFromCode, formatGramsLabel } from "@/lib/store/format";
import { FREIGHT_TRANSPORT_MODE_ICONS, FREIGHT_TRANSPORT_MODE_LABELS } from "@/lib/store/labels";
import {
  CHARGEABLE_WEIGHT_BASIS_LABELS,
  describeUnpriceableReason,
  FREIGHT_LEG_KIND_LABELS,
  FREIGHT_UNAVAILABLE_REASON_LABELS,
  type FreightLanePlan,
  type FreightLegPlan,
  type FreightOption,
  type QuotableFreightProvider,
} from "@/lib/store/freight.schemas";

/**
 * Which mode the buyer has picked for each leg, keyed by leg sequence.
 *
 * ABSENT MEANS UNCHOSEN, and there is no default entry. A `Record` pre-filled with each leg's
 * cheapest option would make "not yet decided" unrepresentable, which is the state every leg starts
 * in and most legs stay in.
 */
type ModeSelectionByLegSequence = Readonly<Record<number, string>>;

export default function DeliverySheet({
  lanePlan,
  onClose,
}: {
  /** `null` when the seller's dispatch country is unresolved — the plan could not be built at all. */
  readonly lanePlan: FreightLanePlan | null;
  readonly onClose: () => void;
}) {
  const [selectedModeByLegSequence, setSelectedModeByLegSequence] =
    useState<ModeSelectionByLegSequence>({});

  if (lanePlan === null) {
    return (
      <ModalSheet title="How this ships" onClose={onClose}>
        <div className="px-4 pb-6">
          <p className="text-sm leading-5 text-[#6F7979]">
            This seller hasn&apos;t published a dispatch country, so the route can&apos;t be worked
            out. Shipping has to be arranged with the seller directly.
          </p>
        </div>
      </ModalSheet>
    );
  }

  const { journeys, legs, unpriceableReasons, quotableProviders } = lanePlan;

  return (
    <ModalSheet title="How this ships" onClose={onClose}>
      <div className="flex flex-col gap-5 px-4 pb-6">
        <RouteSummary lanePlan={lanePlan} />

        {/* THE PRICED PATH, and today the rare one. Totals are the server's, never a reduce. */}
        {journeys.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-[#191C1C]">Priced end to end</h3>
            {journeys.map((journey) => (
              <div
                key={`${journey.currency}-${journey.primaryMode}`}
                className="flex flex-col gap-1 rounded-lg border border-[#CAC4D0]/60 p-3"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-xs font-medium text-[#191C1C]">
                    {FREIGHT_TRANSPORT_MODE_LABELS[journey.primaryMode]}
                  </span>
                  <span className="text-sm font-medium text-[#191C1C]">
                    {formatCentsLabel(journey.totalInCents, journey.currency)}
                  </span>
                </div>
                <span className="text-[11px] leading-4 text-[#6F7979]">
                  {journey.transitDaysMin}–{journey.transitDaysMax} days in transit, across{" "}
                  {journey.legSelections.length} leg
                  {journey.legSelections.length === 1 ? "" : "s"}
                </span>
                {/* Per leg, because two forwarders' divisors legitimately disagree on one journey. */}
                <ul className="mt-1 flex flex-col gap-0.5">
                  {journey.legSelections.map((legSelection) => (
                    <li
                      key={legSelection.legSequence}
                      className="text-[11px] leading-4 text-[#6F7979]"
                    >
                      {/* Named by KIND, never by `legSequence` — that is zero-indexed on the wire,
                          and "Leg 0" shows a buyer an array index. */}
                      {legLabelForSequence(legs, legSelection.legSequence)}:{" "}
                      {FREIGHT_TRANSPORT_MODE_LABELS[legSelection.mode]} ·{" "}
                      {formatCentsLabel(legSelection.priceInCents, journey.currency)} ·{" "}
                      {legSelection.sourceForwarderName} ·{" "}
                      {CHARGEABLE_WEIGHT_BASIS_LABELS[legSelection.chargeableWeightBasis]} (
                      {formatGramsLabel(legSelection.chargeableWeightGrams)})
                    </li>
                  ))}
                </ul>
                <ExpiryNote validUntil={journey.validUntil} />
              </div>
            ))}
          </section>
        )}

        {/* WHY NOTHING PRICED END TO END. Named, never defaulted. */}
        {unpriceableReasons.length > 0 && (
          <section className="flex flex-col gap-1.5 rounded-lg bg-[#F5F5F5] p-3">
            <h3 className="text-sm font-medium text-[#191C1C]">
              No end-to-end price for this route
            </h3>
            <ul className="flex flex-col gap-1">
              {unpriceableReasons.map((reason) => (
                <li
                  key={
                    reason.kind === "leg_uncovered"
                      ? `${reason.kind}-${reason.legSequence}`
                      : reason.kind
                  }
                  className="text-xs leading-4 text-[#6F7979]"
                >
                  {describeUnpriceableReason(reason, legs)}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-[#191C1C]">
            {legs.length === 1 ? "The route" : "The route, leg by leg"}
          </h3>
          {legs.map((leg) => (
            <LegPanel
              key={leg.sequence}
              leg={leg}
              selectedRateCardId={selectedModeByLegSequence[leg.sequence] ?? null}
              onSelectOption={(rateCardId) =>
                setSelectedModeByLegSequence((previous) => ({
                  ...previous,
                  [leg.sequence]: rateCardId,
                }))
              }
            />
          ))}
        </section>

        <QuotableProviders providers={quotableProviders} />

        <p className="text-[11px] leading-4 text-[#6F7979]">
          Qatoto doesn&apos;t sell freight. Every price above is a named forwarder&apos;s, and you
          contract with them directly. No delivery date is implied.
        </p>
      </div>
    </ModalSheet>
  );
}

/** Where this is going, and what is being moved. Both come from the server; neither is guessed. */
function RouteSummary({ lanePlan }: { readonly lanePlan: FreightLanePlan }) {
  const { origin, destination, consignment } = lanePlan;

  return (
    <section className="flex flex-col gap-1 rounded-lg border border-[#CAC4D0]/60 p-3">
      <span className="text-xs font-medium text-[#191C1C]">
        {/* Localities are LABELS. They render; they select no rate card. */}
        {formatPlaceLabel(origin.countryCode, origin.locality)} →{" "}
        {formatPlaceLabel(destination.countryCode, destination.locality)}
      </span>
      {consignment.hasIncompletePackageData ? (
        <span className="text-[11px] leading-4 text-[#6F7979]">
          This seller hasn&apos;t published full package dimensions, so this consignment can&apos;t
          be measured for freight.
        </span>
      ) : (
        <span className="text-[11px] leading-4 text-[#6F7979]">
          {consignment.packageCount === null
            ? "Package count not declared"
            : `${consignment.packageCount} package${consignment.packageCount === 1 ? "" : "s"}`}
          {consignment.billableWeightGrams !== null &&
            ` · ${formatGramsLabel(consignment.billableWeightGrams)}`}
          {consignment.volumeCubicCm !== null &&
            ` · ${consignment.volumeCubicCm.toLocaleString()} cm³`}
        </span>
      )}
    </section>
  );
}

/**
 * One leg, with the modes a buyer could pick for it.
 *
 * `options: []` IS THE ORDINARY CASE TODAY and gets the same visual weight as a priced list — the
 * reasons are the content, not an error banner under it.
 */
function LegPanel({
  leg,
  selectedRateCardId,
  onSelectOption,
}: {
  readonly leg: FreightLegPlan;
  readonly selectedRateCardId: string | null;
  readonly onSelectOption: (rateCardId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-[#CAC4D0]/60 p-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-medium text-[#191C1C]">
          {FREIGHT_LEG_KIND_LABELS[leg.kind]}
        </span>
        <span className="text-[11px] leading-4 text-[#6F7979]">
          {formatPlaceLabel(leg.originCountryCode, leg.originLocality)} →{" "}
          {formatPlaceLabel(leg.destinationCountryCode, leg.destinationLocality)}
        </span>
      </div>

      {leg.options.length > 0 ? (
        <>
          <ul className="flex flex-col gap-2">
            {leg.options.map((option) => (
              <li key={option.rateCardId}>
                <ModeOption
                  option={option}
                  isSelected={option.rateCardId === selectedRateCardId}
                  onSelect={() => onSelectOption(option.rateCardId)}
                />
              </li>
            ))}
          </ul>
          {selectedRateCardId === null && (
            <p className="text-[11px] leading-4 text-[#6F7979]">No mode chosen for this leg yet.</p>
          )}
        </>
      ) : (
        <ul className="flex flex-col gap-1">
          {leg.unavailableReasons.map((reason) => (
            <li key={reason} className="text-xs leading-4 text-[#6F7979]">
              {FREIGHT_UNAVAILABLE_REASON_LABELS[reason]}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * One mode on one leg.
 *
 * THE PRICE IS REACHED THROUGH `providerQuote` AND RENDERS WITH IT. The forwarder's name, the
 * expiry and the re-measurement caveat are in the same box as the number, because a rate shown
 * without its author reads as Qatoto's own — which it is not, structurally (§19.9b).
 */
function ModeOption({
  option,
  isSelected,
  onSelect,
}: {
  readonly option: FreightOption;
  readonly isSelected: boolean;
  readonly onSelect: () => void;
}) {
  const { providerQuote } = option;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={`flex w-full flex-col gap-1 rounded-lg border px-3 py-2.5 text-left ${
        isSelected ? "border-[#00696E] bg-[#00696E]/5" : "border-[#CAC4D0]/60"
      }`}
    >
      <span className="flex items-center gap-2">
        <Image
          src={`/icons/${FREIGHT_TRANSPORT_MODE_ICONS[option.mode]}`}
          width={20}
          height={20}
          alt=""
        />
        <span className="flex-1">
          <span className="block text-xs font-medium text-[#191C1C]">
            {FREIGHT_TRANSPORT_MODE_LABELS[option.mode]}
          </span>
          <span className="block text-[11px] text-[#6F7979]">
            {option.transitDaysMin}–{option.transitDaysMax} days
          </span>
        </span>
        <span className="text-xs font-medium text-[#191C1C]">
          {formatCentsLabel(providerQuote.priceInCents, providerQuote.currency)}
        </span>
      </span>
      <span className="block text-[11px] leading-4 text-[#6F7979]">
        {providerQuote.sourceForwarderName} ·{" "}
        {CHARGEABLE_WEIGHT_BASIS_LABELS[option.chargeableWeightBasis]} (
        {formatGramsLabel(option.chargeableWeightGrams)})
      </span>
      <span className="block text-[11px] leading-4 text-[#6F7979]">
        Subject to re-measurement at pickup.
        <ExpiryNote validUntil={providerQuote.validUntil} isInline />
      </span>
    </button>
  );
}

/**
 * The way forward when nothing priced.
 *
 * PRESENT EVEN WHEN NOTHING PRICED, which is the point — this is where the mock's fabricated
 * "external agents" block should always have pointed. These forwarders really do sell this lane;
 * what does not exist is a published rate card for this consignment.
 */
function QuotableProviders({
  providers,
}: {
  readonly providers: readonly QuotableFreightProvider[];
}) {
  if (providers.length === 0) return null;

  // One forwarder may sell several modes on the same lane; the buyer is asking the ORGANIZATION.
  const providerIdsSeen = new Set<string>();
  const uniqueProviders = providers.filter((provider) => {
    if (providerIdsSeen.has(provider.providerOrganizationId)) return false;
    providerIdsSeen.add(provider.providerOrganizationId);
    return true;
  });

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-medium text-[#191C1C]">Forwarders who sell this route</h3>
      <ul className="flex flex-col gap-1">
        {uniqueProviders.map((provider) => (
          <li key={provider.providerOrganizationId} className="text-xs leading-4 text-[#191C1C]">
            {provider.sourceForwarderName}
          </li>
        ))}
      </ul>
      <Link href="/store/rfqs/new" className="flex items-center gap-2 text-xs text-[#00696E]">
        <span className="flex-1">Ask them for a quote</span>
        <Image
          src="/icons/chevron_forward_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
          width={20}
          height={20}
          alt=""
        />
      </Link>
    </section>
  );
}

/** An expired card is not a price (§19.6). `null` is "no announced end", not "never expires". */
function ExpiryNote({
  validUntil,
  isInline = false,
}: {
  readonly validUntil: string | null;
  readonly isInline?: boolean;
}) {
  if (validUntil === null) return null;
  const text = ` Quoted rate valid until ${formatIsoDayLabel(validUntil)}.`;
  if (isInline) return <>{text}</>;
  return <span className="text-[11px] leading-4 text-[#6F7979]">{text.trim()}</span>;
}

/**
 * A leg's name for a buyer.
 *
 * `legSequence` IS ZERO-INDEXED ON THE WIRE. Rendering it raw put "Leg 0" in front of buyers, which
 * is an array index rather than a fact about their shipment. The kind is what actually locates the
 * gap — the sea crossing or the last mile — so that is what is shown, with a one-based ordinal only
 * as a fallback when no leg matches.
 */
function legLabelForSequence(legs: readonly FreightLegPlan[], legSequence: number): string {
  const namedLeg = legs.find((leg) => leg.sequence === legSequence);
  return namedLeg === undefined ? `Leg ${legSequence + 1}` : FREIGHT_LEG_KIND_LABELS[namedLeg.kind];
}

/** `locality` is a LABEL — it renders beside the country and selects no rate card. */
function formatPlaceLabel(countryCode: string, locality: string | null): string {
  const countryLabel = countryLabelFromCode(countryCode);
  return locality === null ? countryLabel : `${locality}, ${countryLabel}`;
}

function formatIsoDayLabel(isoInstant: string): string {
  const parsed = new Date(isoInstant);
  if (Number.isNaN(parsed.getTime())) return isoInstant;
  return parsed.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

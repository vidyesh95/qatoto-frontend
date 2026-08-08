// TRANSPORT: props-only — renders the parsed slots, no network.
//
// One block per ROLE in the set — "Footwear", "Front light", "Chain bolts" — with the chosen piece
// and its substitutes.
//
// `roleLabel` IS DISPLAY COPY, NOT AN ENUM, and that is a backend decision worth respecting: the
// roles in a hotel refit and a bicycle build share nothing, so there is no vocabulary to translate.
// Render it verbatim.
//
// THREE THINGS THIS COMPONENT REFUSES TO DO:
//
//  1. It does not hide an unavailable slot. `state: "unavailable"` renders with its reason, because
//     an absent slot and a slot with nothing in it are different facts.
//  2. It does not multiply. `pricing.lineTotalInCents` is the server's `quantity × unitPrice`; a
//     client-side product would start disagreeing with the cart this set seeds.
//  3. It does not call a `seller_declared` compatibility claim verified. A candidate carries
//     `sourceKind`, and only a moderated relation earns confirmatory wording — fitment is a safety
//     claim in every category where it matters.

import CatalogProductCard from "@/components/home/store/cards/catalog-product-card";
import { formatCentsLabel, formatCountLabel } from "@/lib/store/format";
import {
  PATHWAY_SLOT_STATE_LABELS,
  PRODUCT_RELATION_KIND_LABELS,
  pricingErrorLabel,
  type StorePathwayCandidate,
  type StorePathwaySlot,
} from "@/lib/store/merchandising.schemas";

const SLOT_STATE_CLASS: Record<StorePathwaySlot["state"], string> = {
  available: "bg-[#D6E3FF] text-[#00696E]",
  substituted: "bg-amber-100 text-amber-900",
  unavailable: "bg-[#F2F4F4] text-[#6F7979]",
};

export default function PathwaySlotList({ slots }: { slots: StorePathwaySlot[] }) {
  if (slots.length === 0) {
    return (
      <section className="px-4 pt-6 lg:px-6">
        <p className="rounded-lg bg-[#F2F4F4] px-3 py-4 text-sm leading-5 text-[#6F7979]">
          This set has no pieces defined yet.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Pieces in this set" className="pt-6">
      <h2 className="px-4 pb-3 text-base font-medium text-[#191C1C] lg:px-6">Pieces in this set</h2>

      <ul className="space-y-4 px-4 lg:px-6">
        {slots.map((slot) => (
          <li key={slot.id}>
            <SlotBlock slot={slot} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function SlotBlock({ slot }: { slot: StorePathwaySlot }) {
  const chosenCandidate =
    slot.chosenCandidateKey === null
      ? null
      : (slot.candidates.find((candidate) => candidate.key === slot.chosenCandidateKey) ?? null);

  const alternativeCandidates = slot.candidates.filter(
    (candidate) => candidate.key !== slot.chosenCandidateKey,
  );

  return (
    <div className="rounded-xl border border-[#CAC4D0]/60 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="flex-1 text-sm leading-5 font-medium text-[#191C1C]">{slot.roleLabel}</p>

        <span className="text-[11px] leading-4 text-[#6F7979]">
          × {formatCountLabel(slot.quantity)}
        </span>

        {/* Required vs optional changes what an unavailable slot MEANS — an optional gap is a
            choice the buyer skipped, a required one makes the set unbuyable. */}
        {slot.isRequired ? (
          <span className="text-[11px] leading-4 font-medium text-[#191C1C]">Required</span>
        ) : (
          <span className="text-[11px] leading-4 text-[#6F7979]">Optional</span>
        )}

        <span
          className={`rounded px-1.5 py-0.5 text-[11px] leading-4 font-medium ${SLOT_STATE_CLASS[slot.state]}`}
        >
          {PATHWAY_SLOT_STATE_LABELS[slot.state]}
        </span>
      </div>

      {/* SUBSTITUTED is not a failure and must not read like one: rank 0 could not be sold, so the
          slot fell through to rank 1 instead of disappearing. That fall-through is what candidates
          exist for — a set is only as robust as its substitutes. */}
      {slot.state === "substituted" && (
        <p className="mt-1 text-[11px] leading-4 text-amber-900">
          The first choice for this role could not be supplied, so an alternative is shown.
        </p>
      )}

      {slot.state === "unavailable" && <SlotUnavailableNote slot={slot} />}

      {chosenCandidate !== null && (
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="w-full max-w-48">
            <CatalogProductCard product={chosenCandidate.product} />
          </div>
          <CandidateFacts candidate={chosenCandidate} slotQuantity={slot.quantity} />
        </div>
      )}

      {alternativeCandidates.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-medium text-[#00696E]">
            {alternativeCandidates.length}{" "}
            {alternativeCandidates.length === 1 ? "alternative" : "alternatives"} for this role
          </summary>
          <ul className="mt-2 space-y-2">
            {alternativeCandidates.map((candidate) => (
              <li key={candidate.key} className="rounded-lg bg-[#F2F4F4] px-3 py-2">
                <p className="text-xs leading-4 font-medium text-[#191C1C]">
                  {candidate.product.title}
                </p>
                <CandidateFacts candidate={candidate} slotQuantity={slot.quantity} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

/** Why a required slot could not be filled, in words the buyer can act on. */
function SlotUnavailableNote({ slot }: { slot: StorePathwaySlot }) {
  if (slot.unavailableReason === null) {
    return (
      <p className="mt-1 text-[11px] leading-4 text-[#6F7979]">
        No piece is available for this role right now.
      </p>
    );
  }

  switch (slot.unavailableReason.type) {
    case "NO_ELIGIBLE_CANDIDATE":
      return (
        <p className="mt-1 text-[11px] leading-4 text-[#6F7979]">
          Nothing is listed for this role right now.
        </p>
      );
    case "VARIANT_SELECTION_REQUIRED":
      return (
        <p className="mt-1 text-[11px] leading-4 text-[#6F7979]">
          This piece needs a variant chosen before it can be added.
        </p>
      );
    case "PRICING_FAILED":
      // The underlying pricing tag, not a generic shrug. "Only 4 left" and "the seller retired the
      // variant" are different problems and the buyer can act on one of them.
      return (
        <p className="mt-1 text-[11px] leading-4 text-[#6F7979]">
          {pricingErrorLabel(slot.unavailableReason.pricingError)}
        </p>
      );
    default: {
      const exhaustiveCheck: never = slot.unavailableReason;
      return exhaustiveCheck;
    }
  }
}

function CandidateFacts({
  candidate,
  slotQuantity,
}: {
  candidate: StorePathwayCandidate;
  slotQuantity: number;
}) {
  return (
    <div className="min-w-0 flex-1 space-y-1">
      {candidate.variantName !== null && (
        <p className="text-xs leading-4 text-[#191C1C]">Variant: {candidate.variantName}</p>
      )}

      <CandidatePricing candidate={candidate} slotQuantity={slotQuantity} />

      {/* PROVENANCE, and the wording turns on `sourceKind`. A `derived` edge is the relation graph's
          inference or the seller's own claim; only a moderator-curated one has been checked, and
          that distinction does not reach this projection — so nothing here is worded as verified. */}
      {candidate.relationKind !== null && (
        <p className="text-[11px] leading-4 text-[#6F7979]">
          {PRODUCT_RELATION_KIND_LABELS[candidate.relationKind]}
          {candidate.sourceKind === "derived"
            ? " · suggested from buying patterns and seller claims, not checked by Qatoto"
            : " · chosen by Qatoto"}
        </p>
      )}
    </div>
  );
}

function CandidatePricing({
  candidate,
  slotQuantity,
}: {
  candidate: StorePathwayCandidate;
  slotQuantity: number;
}) {
  const { pricing } = candidate;

  switch (pricing.status) {
    case "priced":
      return (
        <p className="text-xs leading-4 text-[#191C1C]">
          <span className="font-medium">
            {formatCentsLabel(pricing.lineTotalInCents, pricing.currency)}
          </span>{" "}
          <span className="text-[#6F7979]">
            for {formatCountLabel(slotQuantity)} ·{" "}
            {formatCentsLabel(pricing.unitPriceInCents, pricing.currency)} each
          </span>
        </p>
      );
    case "unpriced":
      // Not an error: the server did not price this candidate on this read. Saying "no price shown"
      // is honest; printing a zero or falling back to the card's own price would not be, because the
      // card price is a list price and not this slot's line total.
      return <p className="text-xs leading-4 text-[#6F7979]">No price shown for this piece.</p>;
    case "unavailable":
      return (
        <p className="text-xs leading-4 text-[#6F7979]">
          {pricingErrorLabel(pricing.pricingError)}
        </p>
      );
    case "variant_selection_required":
      return (
        <p className="text-xs leading-4 text-[#6F7979]">
          Choose a variant to see this piece&apos;s price.
        </p>
      );
    default: {
      const exhaustiveCheck: never = pricing;
      return exhaustiveCheck;
    }
  }
}

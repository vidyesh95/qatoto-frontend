// TRANSPORT: client-query — reads GET /commerce/providers/offerings/mine.
"use client";

// THE PROVIDER'S OWN LISTINGS, and the only place a draft is visible at all.
//
// STATE IS THE CONTENT OF THIS PAGE, not decoration on it. Four of the five states mean the listing is NOT
// findable by a buyer — `draft`, `pending_review`, `suspended` and `retired` — and only `active` means it is.
// A row that showed a title and a price without saying which of those applied would let a provider believe
// they are listed when they are waiting on a moderator.
//
// NO LINK TO `/store/services/:slug` EXCEPT WHEN ACTIVE. A draft's public URL is a 404 by design, so offering
// it would look like a broken page rather than an unpublished one.

import Link from "next/link";

import StatusPanel from "@/components/home/shared/status-panel";
import { useMyServiceOfferingsQuery } from "@/hooks/store/providers";
import { formatCentsRangeLabel, formatCountLabel } from "@/lib/store/format";
import { PROVIDER_KIND_LABELS } from "@/lib/store/labels";
import {
  OFFERING_PRICING_MODEL_LABELS,
  SERVICE_OFFERING_STATE_LABELS,
  type CreatedServiceOffering,
} from "@/lib/store/providers.schemas";

export default function MyServiceOfferingList() {
  const offeringsQuery = useMyServiceOfferingsQuery();
  const result = offeringsQuery.data;

  if (offeringsQuery.isPending) {
    return <p className="text-sm text-muted-foreground">Loading your services…</p>;
  }
  if (result === undefined || offeringsQuery.isError) {
    return (
      <StatusPanel
        message="Couldn't load your services."
        className="border border-border px-6 py-16"
      />
    );
  }
  if (!result.success) {
    // A 403 here means the caller's member role cannot manage offerings, which is a different thing from an
    // empty list — the server's own message says which.
    return (
      <StatusPanel message={result.error.message} className="border border-border px-6 py-16" />
    );
  }

  if (result.data.length === 0) {
    return (
      <div className="rounded-xl border border-border px-6 py-16 text-center">
        <p className="text-sm text-foreground">You have no service listings yet.</p>
        <Link
          href="/studio/services/create"
          className="mt-3 inline-block cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Create your first one
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {result.data.map((offering) => (
        <li key={offering.id}>
          <OfferingRow offering={offering} />
        </li>
      ))}
    </ul>
  );
}

function OfferingRow({ offering }: { offering: CreatedServiceOffering }) {
  const isFindableByBuyers = offering.state === "active";

  return (
    <div className="rounded-xl border border-border px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="min-w-0 flex-1 text-sm leading-5 font-medium text-foreground">
          {offering.title}
        </p>
        <span className="text-xs leading-4 text-muted-foreground">
          {SERVICE_OFFERING_STATE_LABELS[offering.state]}
        </span>
      </div>

      <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
        {PROVIDER_KIND_LABELS[offering.providerKind]} ·{" "}
        {OFFERING_PRICING_MODEL_LABELS[offering.pricingModel]}
      </p>

      {/* A NULL RANGE IS "QUOTED PER JOB", NEVER FREE AND NEVER BLANK. The currency column is non-null even
          when both price ends are, so a blank here would read as a zero that has a currency. */}
      <p className="mt-1 text-xs leading-4 text-foreground">
        {offering.indicativePriceMinInCents === null || offering.indicativePriceMaxInCents === null
          ? "Quoted per job"
          : formatCentsRangeLabel(
              offering.indicativePriceMinInCents,
              offering.indicativePriceMaxInCents,
              offering.currency,
            )}
      </p>

      {offering.minimumLeadTimeDays !== null && offering.maximumLeadTimeDays !== null && (
        <p className="text-xs leading-4 text-muted-foreground">
          Lead time {formatCountLabel(offering.minimumLeadTimeDays)}–
          {formatCountLabel(offering.maximumLeadTimeDays)} days
        </p>
      )}

      {isFindableByBuyers ? (
        <Link
          href={`/store/services/${offering.slug}`}
          className="mt-1 inline-block text-xs font-medium text-primary underline"
        >
          View the public listing
        </Link>
      ) : (
        // NO LINK. Every non-active state 404s on its public URL, and a dead link reads as a bug rather than
        // as an unpublished listing.
        <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
          {offering.state === "pending_review"
            ? "Waiting for a moderator. Buyers cannot find it yet."
            : "Buyers cannot find this listing."}
        </p>
      )}
    </div>
  );
}

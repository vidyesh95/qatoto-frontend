// TRANSPORT: props-only — presentational server component. Fetches nothing; suppliers
// arrive as props from a parent that read GET /suppliers.
import Link from "next/link";

import {
  SUPPLIER_CONTACT_POLICY_LABELS,
  SUPPLIER_VERIFICATION_STATE_LABELS,
} from "@/lib/rnd/labels";
import type { Supplier, SupplierVerificationState } from "@/lib/rnd/suppliers.schemas";

// Platform-assigned, never claimed by the supplier: a new listing is always `unverified`
// and `verificationState` is absent from the create schema entirely.
//
// `documents_pending` is amber rather than red — a moderator asking for paperwork is a
// step in progress, not a finding against the partner.
const VERIFICATION_STATE_BADGE_CLASS: Record<SupplierVerificationState, string> = {
  verified: "bg-[#00696E]/10 text-[#00696E]",
  documents_pending: "bg-amber-100 text-amber-800",
  unverified: "bg-muted text-muted-foreground",
  suspended: "bg-red-100 text-red-800",
};

// Composed from integers, so the sentence localizes with the client. A null lead time
// reads as unpublished — never as 0, which would advertise same-day turnaround the
// supplier never offered.
function describeLeadTime(leadTimeDays: number | null): string {
  return leadTimeDays === null ? "Lead time not published" : `${leadTimeDays}-day lead time`;
}

function describeMinimumOrder(minimumOrderQuantity: number | null): string {
  return minimumOrderQuantity === null
    ? "No minimum order"
    : `Minimum order ${minimumOrderQuantity}`;
}

/**
 * Directory tile for a manufacturing / ODM partner.
 *
 * CARRIES NO PRICE, on purpose: currency derives from a project, a supplier belongs to
 * none, and a quote belongs to an engagement rather than to a public listing. The backend
 * has no price column here either.
 *
 * The website link is hidden under `no_contact`, which exists because a curated directory
 * lists entities that never asked to be listed. Such a row is reference-only, and surfacing
 * an outbound link would turn it into an inbox nobody consented to.
 */
export default function SupplierCard({ supplier }: { supplier: Supplier }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#CAC4D0]/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/research-and-development/go-to-market/supplier/${supplier.slug}`}
            className="truncate font-semibold hover:text-[#00696E]"
          >
            {supplier.name}
          </Link>
          <p className="truncate text-xs text-muted-foreground">
            {supplier.regionDisplayLabel ?? "Region not published"}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${VERIFICATION_STATE_BADGE_CLASS[supplier.verificationState]}`}
        >
          {SUPPLIER_VERIFICATION_STATE_LABELS[supplier.verificationState]}
        </span>
      </div>
      {supplier.summary !== null && (
        <p className="text-sm text-muted-foreground">{supplier.summary}</p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {supplier.capabilities.map((capability) => (
          <span key={capability.slug} className="rounded-full bg-muted px-2 py-0.5 text-xs">
            {capability.displayLabel}
          </span>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {describeLeadTime(supplier.leadTimeDays)} ·{" "}
        {describeMinimumOrder(supplier.minimumOrderQuantity)}
      </p>
      <div className="mt-auto flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
          {SUPPLIER_CONTACT_POLICY_LABELS[supplier.contactPolicy]}
        </span>
        {supplier.websiteUrl !== null && supplier.contactPolicy !== "no_contact" && (
          <a
            href={supplier.websiteUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-[#00696E] underline underline-offset-2"
          >
            Visit website
          </a>
        )}
      </div>
    </div>
  );
}

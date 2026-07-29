// TRANSPORT: server-fetch — server component. Reads GET /suppliers/:supplierSlug via
// @/lib/rnd/suppliers.api, with the session cookie forwarded by callerRequestOptions().
// The read is public. Fetches nothing else.
import Link from "next/link";
import { notFound } from "next/navigation";

import { RndErrorPanel } from "@/components/home/research-and-development/sections/rnd-status-panel";
import { formatIsoInstant } from "@/lib/rnd/format";
import {
  SUPPLIER_CONTACT_POLICY_LABELS,
  SUPPLIER_VERIFICATION_STATE_LABELS,
} from "@/lib/rnd/labels";
import { getSupplier } from "@/lib/rnd/suppliers.api";
import type { SupplierVerificationState } from "@/lib/rnd/suppliers.schemas";
import { callerRequestOptions } from "@/lib/server-http";

// `documents_pending` is amber rather than red — a moderator asking for paperwork is a
// step in progress, not a finding against the partner. Same mapping as the card.
const VERIFICATION_STATE_BADGE_CLASS: Record<SupplierVerificationState, string> = {
  verified: "bg-[#00696E]/10 text-[#00696E]",
  documents_pending: "bg-amber-100 text-amber-800",
  unverified: "bg-muted text-muted-foreground",
  suspended: "bg-red-100 text-red-800",
};

/**
 * One manufacturing / ODM listing.
 *
 * AN INACTIVE SUPPLIER IS A `404`, identical to one that never existed. Retirement here
 * is `isActive: false` and there is no `DELETE` — but the read hides both cases behind
 * the same status, so this page must not render a "withdrawn" or "suspended listing"
 * state from a 404. It renders `notFound()`, exactly as it would for a typo'd slug.
 *
 * NO PRICE AND NO QUOTE. The listing carries no money field anywhere in the backend:
 * currency derives from a project, a supplier belongs to none, and a quote belongs to an
 * engagement. A directory-level price would have to invent a currency.
 *
 * THE ENGAGEMENT CONTROLS ARE NOT HERE. `…/supplier-engagements` is project-scoped and
 * maintainer-gated; a cross-project page has no slug to engage on behalf of. Engaging a
 * partner happens inside the project.
 */
export default async function SupplierDetailPage({ supplierSlug }: { supplierSlug: string }) {
  const requestOptions = await callerRequestOptions();
  const supplierResult = await getSupplier(supplierSlug, requestOptions);

  if (!supplierResult.success) {
    if (supplierResult.error.code === "404") notFound();
    return (
      <div className="px-4 pt-4 lg:px-6 lg:pt-6">
        <RndErrorPanel message="Couldn't load this partner." />
      </div>
    );
  }

  const supplier = supplierResult.data;

  return (
    <div className="space-y-6 px-4 pt-4 pb-4 lg:px-6 lg:pt-6 lg:pb-6">
      <header className="space-y-2">
        <Link
          href="/research-and-development/go-to-market#supplier-directory"
          className="text-xs font-medium text-[#00696E]"
        >
          ← Manufacturing &amp; ODM partners
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-2xl font-semibold md:text-3xl">{supplier.name}</h1>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${VERIFICATION_STATE_BADGE_CLASS[supplier.verificationState]}`}
          >
            {SUPPLIER_VERIFICATION_STATE_LABELS[supplier.verificationState]}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {supplier.regionDisplayLabel ?? "Region not published"} ·{" "}
          {SUPPLIER_CONTACT_POLICY_LABELS[supplier.contactPolicy]}
        </p>
      </header>

      {supplier.summary !== null && (
        <p className="max-w-prose text-sm leading-6">{supplier.summary}</p>
      )}

      <dl className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#CAC4D0]/60 p-4">
          <dt className="text-xs text-muted-foreground">Lead time</dt>
          {/* Null reads as unpublished, never as 0 — which would advertise same-day
              turnaround the partner never offered. */}
          <dd className="text-lg font-semibold">
            {supplier.leadTimeDays === null ? "Not published" : `${supplier.leadTimeDays} days`}
          </dd>
        </div>
        <div className="rounded-2xl border border-[#CAC4D0]/60 p-4">
          <dt className="text-xs text-muted-foreground">Minimum order</dt>
          <dd className="text-lg font-semibold">
            {supplier.minimumOrderQuantity === null
              ? "No minimum"
              : supplier.minimumOrderQuantity.toLocaleString("en-US")}
          </dd>
        </div>
        <div className="rounded-2xl border border-[#CAC4D0]/60 p-4">
          <dt className="text-xs text-muted-foreground">Listed since</dt>
          <dd className="text-sm font-medium">{formatIsoInstant(supplier.createdAt)}</dd>
        </div>
      </dl>

      {supplier.capabilities.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium tracking-wide xl:text-lg">What they do</h2>
          <ul className="flex flex-wrap gap-2">
            {supplier.capabilities.map((capability) => (
              <li
                key={capability.id}
                className="rounded-full border border-[#CAC4D0] px-3 py-1.5 text-xs"
              >
                {capability.displayLabel}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Hidden under `no_contact`, which exists because a curated directory lists
          entities that never asked to be listed. Such a row is reference-only, and an
          outbound link would turn it into an inbox nobody consented to. */}
      {supplier.contactPolicy !== "no_contact" && supplier.websiteUrl !== null && (
        <a
          href={supplier.websiteUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-2 rounded-full bg-[#00696E]/10 px-3 py-1.5 text-xs font-medium text-[#00696E]"
        >
          Visit their website →
        </a>
      )}

      <p className="text-xs text-muted-foreground">
        A verification status is assigned by Qatoto, never claimed by the partner. To record that
        your project approached this partner, open the project&apos;s go-to-market tab — an
        engagement belongs to a project, not to this page.
      </p>
    </div>
  );
}

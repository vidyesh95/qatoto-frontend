// TRANSPORT: server-fetch — server component. Reads GET /suppliers/:supplierSlug via
// @/lib/rnd/suppliers.api, with the session cookie forwarded by callerRequestOptions().
// The read is public. Fetches nothing else.
import Link from "next/link";
import { notFound } from "next/navigation";

import { RndErrorPanel } from "@/components/home/research-and-development/sections/rnd-status-panel";
import HairlineDefinitionRow, {
  type HairlineDefinitionFact,
} from "@/components/home/shared/hairline-definition-row";
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
  verified: "bg-primary-imprint/10 text-primary-imprint",
  documents_pending: "bg-amber-100 text-amber-800",
  unverified: "bg-muted text-muted-foreground",
  suspended: "bg-red-100 text-red-800",
};

/**
 * The facts the row renders, in reading order.
 *
 * ⚠️ **"No minimum" IS A FACT, NOT AN ABSENCE, AND MUST NEVER BE DROPPED TO `null`.** A supplier
 * with no minimum order quantity has told a buyer something useful; a supplier who did not say has
 * not. The row drops `null` cells, so collapsing the two would delete real information — which is
 * why every string here is carried through exactly as this page already printed it.
 *
 * "Not published" is the other half of that pair: null reads as unpublished, never as 0, which
 * would advertise same-day turnaround the partner never offered.
 *
 * Local rather than shared, on the `buildClusterFacts` precedent: the null semantics are this
 * page's. ⚠️ This is the fourth such helper; if a fifth appears, extract the pattern.
 */
function buildSupplierFacts(supplier: {
  readonly leadTimeDays: number | null;
  readonly minimumOrderQuantity: number | null;
  readonly createdAt: string;
}): readonly HairlineDefinitionFact[] {
  return [
    {
      label: "Lead time",
      value: supplier.leadTimeDays === null ? "Not published" : `${supplier.leadTimeDays} days`,
    },
    {
      label: "Minimum order",
      value:
        supplier.minimumOrderQuantity === null
          ? "No minimum"
          : supplier.minimumOrderQuantity.toLocaleString("en-US"),
    },
    { label: "Listed since", value: formatIsoInstant(supplier.createdAt) },
  ];
}

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
          className="text-xs font-medium text-primary-imprint"
        >
          ← Manufacturing &amp; ODM partners
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-medium tracking-tight text-foreground lg:text-3xl">
            {supplier.name}
          </h1>
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

      {/* ⚠️ **ONE HAIRLINE ROW, NOT THREE BOXES** — §6's identical-card-grid ban, and the figures
          were `text-lg font-semibold`, a third type size against §3. Note the old recipe already
          disagreed with itself across files: the talent page used `text-xl` for the same shape. */}
      <HairlineDefinitionRow facts={buildSupplierFacts(supplier)} />

      {supplier.capabilities.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium tracking-wide xl:text-lg">What they do</h2>
          <ul className="flex flex-wrap gap-2">
            {supplier.capabilities.map((capability) => (
              <li
                key={capability.id}
                className="rounded-full border border-outline-variant px-3 py-1.5 text-xs"
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
          className="inline-flex items-center gap-2 rounded-full bg-primary-imprint/10 px-3 py-1.5 text-xs font-medium text-primary-imprint"
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

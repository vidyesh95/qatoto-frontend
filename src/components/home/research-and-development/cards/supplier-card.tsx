import type {
  SupplierContactPolicy,
  SupplierProfile,
  SupplierVerificationState,
} from "@/types/research-and-development";

const VERIFICATION_STATE_BADGES: Record<
  SupplierVerificationState,
  { label: string; className: string }
> = {
  // Platform-assigned, never claimed by the supplier: a new listing is always
  // unverified and there is no field on it a supplier can set.
  verified: { label: "Verified by Qatoto", className: "bg-[#00696E]/10 text-[#00696E]" },
  unverified: { label: "Unverified", className: "bg-muted text-muted-foreground" },
  suspended: { label: "Suspended", className: "bg-red-100 text-red-800" },
};

const CONTACT_POLICY_LABELS: Record<SupplierContactPolicy, string> = {
  open: "Accepting enquiries",
  request_only: "Enquiries by request",
  closed: "Not taking enquiries",
};

// Composed from integers, so the sentence localizes with the client. A null
// lead time reads as unpublished — never as 0, which would advertise same-day
// turnaround the supplier never offered.
function describeLeadTime(leadTimeDays: number | null): string {
  return leadTimeDays === null ? "Lead time not published" : `${leadTimeDays}-day lead time`;
}

function describeMinimumOrder(minimumOrderQuantity: number | null): string {
  return minimumOrderQuantity === null
    ? "No minimum order"
    : `Minimum order ${minimumOrderQuantity}`;
}

// Directory tile for a manufacturing / ODM partner. Carries no price on
// purpose: currency derives from a project, a supplier belongs to none, and a
// quote belongs to an engagement rather than to a public listing.
export default function SupplierCard({ supplier }: { supplier: SupplierProfile }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#CAC4D0]/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{supplier.name}</p>
          <p className="truncate text-xs text-muted-foreground">{supplier.regionDisplayLabel}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${VERIFICATION_STATE_BADGES[supplier.verificationState].className}`}
        >
          {VERIFICATION_STATE_BADGES[supplier.verificationState].label}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{supplier.summary}</p>
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
          {CONTACT_POLICY_LABELS[supplier.contactPolicy]}
        </span>
        {supplier.websiteUrl && supplier.contactPolicy !== "closed" && (
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

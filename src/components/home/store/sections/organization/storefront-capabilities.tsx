// TRANSPORT: props-only — receives the parsed storefront, fetches nothing.
//
// Production capabilities the seller claims. `oem` and `odm` stay as the buyer-facing
// acronyms because those are the terms buyers actually search for; the rest get prose.
// Note the framing: "capabilities the seller claims", not "verified capabilities" — the
// product page's sheet calls these verified, which they are not. Only the certifications
// below carry a platform decision.

import Image from "next/image";

import type { OrganizationCapability } from "@/lib/store/organizations.schemas";
import { CAPABILITY_KIND_LABELS } from "@/lib/store/organizations.schemas";
import StorefrontSection from "@/components/home/store/sections/organization/storefront-section";

export default function StorefrontCapabilities({
  capabilities,
}: {
  capabilities: OrganizationCapability[];
}) {
  if (capabilities.length === 0) return null;

  const orderedCapabilities = capabilities.toSorted(
    (first, second) => first.position - second.position,
  );

  return (
    <StorefrontSection
      title="Production capabilities"
      attribution="declared"
      description="What this seller says it can do in-house."
    >
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {orderedCapabilities.map((capability) => (
          <li key={capability.id} className="flex gap-2 rounded-lg bg-[#F2F4F4] px-3 py-2">
            <Image
              src="/icons/fact_check_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              width={18}
              height={18}
              alt=""
              // `self-start` matters: in a stretch-aligned flex row the icon's height
              // is overridden and next/image warns about the broken aspect ratio.
              className="mt-0.5 shrink-0 self-start opacity-70"
            />
            <div className="min-w-0">
              <p className="text-sm leading-5 font-medium text-[#191C1C]">
                {CAPABILITY_KIND_LABELS[capability.capabilityKind]}
              </p>
              {capability.detail && (
                <p className="text-xs leading-4 tracking-[0.4px] text-[#6F7979]">
                  {capability.detail}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </StorefrontSection>
  );
}

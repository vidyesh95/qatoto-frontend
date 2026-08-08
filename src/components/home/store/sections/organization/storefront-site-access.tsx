// TRANSPORT: props-only — receives the parsed storefront, fetches nothing.
//
// How freight reaches this seller's site. A mode the seller did not claim is simply
// ABSENT from the array — there is no "rail: false" row on the wire, and this component
// does not invent one. Rendering the four modes with three ticks and a cross would turn
// a set of claims into a scorecard the seller never filled in.

import Image from "next/image";

import type { OrganizationSiteAccess } from "@/lib/store/organizations.schemas";
import { SITE_ACCESS_MODE_ICONS, SITE_ACCESS_MODE_LABELS } from "@/lib/store/organizations.schemas";
import StorefrontSection from "@/components/home/store/sections/organization/storefront-section";

export default function StorefrontSiteAccess({
  siteAccess,
}: {
  siteAccess: OrganizationSiteAccess[];
}) {
  if (siteAccess.length === 0) return null;

  const orderedAccess = siteAccess.toSorted((first, second) => first.position - second.position);

  return (
    <StorefrontSection
      title="Freight and logistics"
      attribution="declared"
      description="Transport links the seller says its site has. Modes it did not claim are not listed."
    >
      <ul className="grid gap-2 lg:grid-cols-3">
        {orderedAccess.map((access) => (
          <li
            key={access.id}
            className="flex items-start gap-3 rounded-lg bg-[#F2F4F4] px-3 py-2.5"
          >
            <Image
              src={`/icons/${SITE_ACCESS_MODE_ICONS[access.accessMode]}`}
              width={22}
              height={22}
              alt=""
              className="mt-0.5 shrink-0 opacity-70"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-5 font-medium text-[#191C1C]">
                {SITE_ACCESS_MODE_LABELS[access.accessMode]}
              </p>
              <p className="text-xs leading-4 tracking-[0.4px] text-[#191C1C]">
                {access.facilityName}
                {access.distanceKm !== null &&
                  (access.distanceKm === 0 ? " · on site" : ` · ${access.distanceKm} km away`)}
              </p>
              {access.notes && (
                <p className="mt-0.5 text-[11px] leading-4 text-[#6F7979]">{access.notes}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </StorefrontSection>
  );
}

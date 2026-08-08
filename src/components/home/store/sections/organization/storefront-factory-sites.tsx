// TRANSPORT: props-only — receives the parsed storefront, fetches nothing.
//
// ENTIRELY UNBACKED. The seller profile API carries a factory COUNT, a combined area and
// one country code — there is no per-site table, so no street address, no per-plant line
// count, and no per-plant founding year exist on the wire. This section renders only
// while the page is running on mock data and disappears the moment a real response is
// parsed, which is why it takes `sites` and not the whole storefront.

import Image from "next/image";

import type { FactorySite } from "@/lib/store/organizations.schemas";
import { formatSquareMetresLabel } from "@/lib/store/organizations.schemas";
import StorefrontSection, {
  UnbackedFieldNote,
} from "@/components/home/store/sections/organization/storefront-section";

export default function StorefrontFactorySites({ sites }: { sites: FactorySite[] }) {
  if (sites.length === 0) return null;

  return (
    <StorefrontSection
      title="Factory locations"
      attribution="declared"
      description="Where this seller says it manufactures."
    >
      <ul className="grid gap-2 lg:grid-cols-3">
        {sites.map((site) => (
          <li key={site.id} className="rounded-lg bg-[#F2F4F4] px-3 py-2.5">
            <div className="flex items-start gap-2">
              <Image
                src="/icons/factory_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                width={20}
                height={20}
                alt=""
                className="mt-0.5 shrink-0 opacity-70"
              />
              <div className="min-w-0">
                <p className="text-sm leading-5 font-medium text-[#191C1C]">{site.name}</p>
                <p className="text-xs leading-4 tracking-[0.4px] text-[#6F7979]">
                  {site.addressLine}
                </p>
                <p className="text-xs leading-4 tracking-[0.4px] text-[#6F7979]">
                  {site.city}, {site.countryLabel}
                </p>
              </div>
            </div>

            <dl className="mt-2 grid grid-cols-3 gap-x-2">
              <div className="flex flex-col gap-0.5">
                <dt className="text-[11px] leading-4 text-[#6F7979]">Floor area</dt>
                <dd className="text-xs leading-4 font-medium text-[#191C1C]">
                  {formatSquareMetresLabel(site.floorAreaSquareMetres)}
                </dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-[11px] leading-4 text-[#6F7979]">Lines</dt>
                <dd className="text-xs leading-4 font-medium text-[#191C1C]">
                  {site.productionLineCount}
                </dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-[11px] leading-4 text-[#6F7979]">Since</dt>
                <dd className="text-xs leading-4 font-medium text-[#191C1C]">
                  {site.yearEstablished}
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>

      <UnbackedFieldNote>
        These per-site details are placeholders. The seller profile API stores a factory count and a
        combined area, not individual plant addresses, so this whole section disappears once the
        page reads live data.
      </UnbackedFieldNote>
    </StorefrontSection>
  );
}

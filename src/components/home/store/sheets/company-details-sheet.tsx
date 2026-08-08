// TRANSPORT: mock — reads the shared mock seller record. NOTHING here reaches a backend yet.
//
// Full company details. Reads the same seller record the storefront page renders — founding,
// location, factory photos, freight access, visit policy, ownership, business type — so the sheet
// and the page cannot disagree. It used to hold its own hardcoded copies of all five lists.
//
// Two things this sheet does NOT do, both of which the shared record made impossible: it does not
// print a "17 years in business" figure derived from a build-time clock, and it does not render a
// "Rail freight — not available" row. A mode the seller did not claim is simply ABSENT from
// `siteAccess`; inventing a crossed-out row turns a set of claims into a scorecard the seller
// never filled in.
//
// Wire-able from `GET /store/organizations/:slug` → `declaredProfile`, whose shape the mock
// already matches. The PDP will need a SECOND fetch for it: the product read's `seller` is thin
// (id, slug, displayName, countryCode, logoUrl, summary) and carries neither the declared profile
// nor the measured metrics.
"use client";

import Image from "next/image";
import Link from "next/link";

import StoreSheet from "@/components/home/store/shared/store-sheet";

import {
  BUSINESS_TYPE_LABELS,
  countryLabelFromCode,
  formatSquareMetresLabel,
  MEDIA_KIND_LABELS,
  SITE_ACCESS_MODE_ICONS,
  SITE_ACCESS_MODE_LABELS,
  VISIT_POLICY_LABELS,
} from "@/lib/store/organizations.schemas";
import {
  MOCK_PRODUCT_SELLER_SLUG,
  MOCK_PRODUCT_SELLER_STOREFRONT,
} from "@/mocks/store-organization-mocks";

const STOREFRONT = MOCK_PRODUCT_SELLER_STOREFRONT;
const DECLARED_PROFILE = STOREFRONT.declaredProfile;

type FactSpec = {
  iconFileName: string;
  label: string;
  value: string;
};

function buildOverviewFacts(): FactSpec[] {
  const facts: FactSpec[] = [];
  if (!DECLARED_PROFILE) return facts;

  if (DECLARED_PROFILE.yearFounded !== null) {
    facts.push({
      iconFileName: "description_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      label: "Founded",
      value: String(DECLARED_PROFILE.yearFounded),
    });
  }
  facts.push({
    iconFileName: "location_on_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    label: "Location",
    value: countryLabelFromCode(STOREFRONT.countryCode),
  });
  if (DECLARED_PROFILE.businessType !== null) {
    facts.push({
      iconFileName: "science_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      label: "Business type",
      value: BUSINESS_TYPE_LABELS[DECLARED_PROFILE.businessType],
    });
  }
  if (DECLARED_PROFILE.factoryCount !== null) {
    facts.push({
      iconFileName: "factory_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      label: "Factories",
      value:
        DECLARED_PROFILE.factoryAreaSquareMetres === null
          ? String(DECLARED_PROFILE.factoryCount)
          : `${DECLARED_PROFILE.factoryCount} · ${formatSquareMetresLabel(DECLARED_PROFILE.factoryAreaSquareMetres)} combined`,
    });
  }
  return facts;
}

const OVERVIEW_FACTS = buildOverviewFacts();
const FACTORY_PHOTOS = DECLARED_PROFILE?.media ?? [];
const SITE_ACCESS = DECLARED_PROFILE?.siteAccess ?? [];
const STAKEHOLDERS = DECLARED_PROFILE?.stakeholders ?? [];
const VISIT_POLICY = DECLARED_PROFILE?.visitPolicy ?? null;

export default function CompanyDetailsSheet({ onClose }: { onClose: () => void }) {
  return (
    <StoreSheet title="Company details" onClose={onClose}>
      <p className="px-4 pb-2 text-base font-medium text-[#191C1C]">{STOREFRONT.displayName}</p>

      <div className="px-4 pb-5">
        {/* Overview */}
        <ul className="flex flex-col gap-3">
          {OVERVIEW_FACTS.map((fact) => (
            <li key={fact.label} className="flex gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#D6E3FF]">
                <Image src={`/icons/${fact.iconFileName}`} width={20} height={20} alt="" />
              </span>
              <div className="flex-1">
                <p className="text-xs text-[#6F7979]">{fact.label}</p>
                <p className="text-sm text-[#191C1C]">{fact.value}</p>
              </div>
            </li>
          ))}
        </ul>

        {/* Factory photos */}
        <p className="mt-5 mb-2 text-sm font-medium text-[#191C1C]">Factory photos</p>
        <div className="grid grid-cols-2 gap-2">
          {FACTORY_PHOTOS.map((photo) => (
            <div key={photo.id} className="flex flex-col gap-1">
              <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-[#F5F5F5]">
                <Image
                  src={photo.imageUrl}
                  fill
                  sizes="(min-width: 640px) 220px, 45vw"
                  alt={photo.altText ?? MEDIA_KIND_LABELS[photo.mediaKind]}
                  className="object-cover"
                />
              </div>
              <span className="text-[11px] text-[#6F7979]">
                {photo.altText ?? MEDIA_KIND_LABELS[photo.mediaKind]}
              </span>
            </div>
          ))}
        </div>

        {/* Freight access — only the modes the seller actually claimed. */}
        <p className="mt-5 mb-2 text-sm font-medium text-[#191C1C]">Freight &amp; logistics</p>
        <ul className="flex flex-col gap-2">
          {SITE_ACCESS.map((access) => (
            <li
              key={access.id}
              className="flex items-center gap-3 rounded-lg bg-[#F2F4F4] px-3 py-2"
            >
              <Image
                src={`/icons/${SITE_ACCESS_MODE_ICONS[access.accessMode]}`}
                width={22}
                height={22}
                alt=""
              />
              <div className="flex-1">
                <p className="text-sm text-[#191C1C]">
                  {SITE_ACCESS_MODE_LABELS[access.accessMode]}
                </p>
                <p className="text-xs text-[#6F7979]">
                  {access.facilityName}
                  {access.distanceKm !== null &&
                    (access.distanceKm === 0 ? " · on site" : ` · ${access.distanceKm} km away`)}
                </p>
              </div>
            </li>
          ))}
        </ul>

        {/* Factory visit — the policy only. Days, hours and the fee have no backend
              column, so they live on the storefront page where they are labelled as
              placeholders rather than being asserted here as fact. */}
        {VISIT_POLICY !== null && (
          <>
            <p className="mt-5 mb-2 text-sm font-medium text-[#191C1C]">Factory visit</p>
            <div className="flex gap-3 rounded-lg bg-[#F2F4F4] px-3 py-2">
              <Image
                src="/icons/factory_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                width={22}
                height={22}
                alt=""
              />
              <p className="flex-1 text-xs leading-5 text-[#191C1C]">
                {VISIT_POLICY_LABELS[VISIT_POLICY]}.{" "}
                <Link
                  href={`/store/organizations/${MOCK_PRODUCT_SELLER_SLUG}`}
                  onClick={onClose}
                  className="font-medium text-[#2A76FD]"
                >
                  See visiting terms
                </Link>
              </p>
            </div>
          </>
        )}

        {/* Ownership */}
        <p className="mt-5 mb-2 text-sm font-medium text-[#191C1C]">Directors and ownership</p>
        <ul className="flex flex-col gap-3">
          {STAKEHOLDERS.map((stakeholder) => (
            <li key={stakeholder.id} className="flex gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#D6E3FF]">
                <Image
                  src="/icons/group_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                  width={20}
                  height={20}
                  alt=""
                />
              </span>
              <div className="flex-1">
                <p className="text-xs text-[#6F7979]">{stakeholder.roleTitle}</p>
                <p className="text-sm text-[#191C1C]">{stakeholder.fullName}</p>
              </div>
            </li>
          ))}
        </ul>

        <Link
          href={`/store/organizations/${MOCK_PRODUCT_SELLER_SLUG}`}
          onClick={onClose}
          className="mt-5 flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-medium tracking-[0.1px] text-[#00696E] outline -outline-offset-1 outline-[#6F7979]"
        >
          <Image
            src="/icons/storefront_24dp_00696E_FILL0_wght400_GRAD0_opsz24.svg"
            width={18}
            height={18}
            alt=""
          />
          View full company profile
        </Link>
      </div>
    </StoreSheet>
  );
}

// TRANSPORT: props-only — receives the parsed storefront, fetches nothing.
//
// Masthead of the seller storefront: cover art, logo, name, and the handful of facts a
// buyer scans before deciding to read further. Note what is NOT here — no aggregate
// "trust score" and no blended rating. The two numbers shown are a review average
// (derived from the catalog on screen) and a founding year (the seller's own claim), and
// each says which it is rather than sitting in one anonymous stat row.

import Image from "next/image";

import type { OrganizationStorefrontView } from "@/lib/store/organizations.schemas";
import { BUSINESS_TYPE_LABELS, countryLabelFromCode } from "@/lib/store/organizations.schemas";

function pickCoverImageUrl(storefront: OrganizationStorefrontView): string | null {
  const media = storefront.declaredProfile?.media ?? [];
  const showcase = media.find((item) => item.mediaKind === "showcase");
  const factory = media.find((item) => item.mediaKind === "factory");
  return showcase?.imageUrl ?? factory?.imageUrl ?? media[0]?.imageUrl ?? null;
}

// Weighted mean across the catalog. Cheap over one page of products and honestly
// scoped — this is "average across the products shown", not a platform seller score,
// and it is absent rather than zero when nothing has been reviewed.
function averageCatalogRating(
  storefront: OrganizationStorefrontView,
): { rating: number; reviewCount: number } | null {
  const rated = storefront.products.items.filter(
    (product) => product.reviewMetrics.averageRating !== null,
  );
  if (rated.length === 0) return null;

  const reviewCount = rated.reduce(
    (total, product) => total + product.reviewMetrics.reviewCount,
    0,
  );
  if (reviewCount === 0) return null;

  const weightedSum = rated.reduce(
    (total, product) =>
      total + (product.reviewMetrics.averageRating ?? 0) * product.reviewMetrics.reviewCount,
    0,
  );
  return { rating: weightedSum / reviewCount, reviewCount };
}

export default function StorefrontHero({ storefront }: { storefront: OrganizationStorefrontView }) {
  const coverImageUrl = pickCoverImageUrl(storefront);
  const declaredProfile = storefront.declaredProfile;
  const catalogRating = averageCatalogRating(storefront);

  return (
    <header>
      <div className="relative aspect-16/9 w-full overflow-hidden bg-[#F5F5F5] md:aspect-3/1 lg:rounded-b-2xl">
        {coverImageUrl && (
          <Image
            src={coverImageUrl}
            fill
            sizes="(min-width: 1024px) 1152px, 100vw"
            alt={`${storefront.displayName} premises`}
            className="object-cover"
            priority
          />
        )}
      </div>

      <div className="px-4 lg:px-6">
        <div className="-mt-8 flex items-end gap-3">
          {/* `logoUrl` is nullable on the wire — a seller that never uploaded a mark
              gets its initials rather than an empty grey square. */}
          {storefront.logoUrl ? (
            <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-[#F5F5F5] outline-2 outline-white">
              <Image src={storefront.logoUrl} fill sizes="64px" alt="" className="object-cover" />
            </div>
          ) : (
            <span className="grid size-16 shrink-0 place-items-center rounded-xl bg-[#D6E3FF] text-lg font-medium text-[#00696E] outline-2 outline-white">
              {storefront.displayName
                .split(/\s+/)
                .slice(0, 2)
                .map((namePart) => namePart.charAt(0).toUpperCase())
                .join("")}
            </span>
          )}
        </div>

        <h1 className="mt-3 text-lg leading-7 font-medium tracking-tight text-[#191C1C]">
          {storefront.displayName}
        </h1>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="flex items-center gap-1 text-sm leading-5 tracking-[0.25px] text-[#191C1C]">
            <Image
              src="/icons/location_on_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              width={18}
              height={18}
              alt=""
            />
            {countryLabelFromCode(storefront.countryCode)}
          </span>

          {declaredProfile?.businessType && (
            <span className="rounded bg-[#F2F4F4] px-2 py-0.5 text-xs font-medium tracking-[0.4px] text-[#6F7979]">
              {BUSINESS_TYPE_LABELS[declaredProfile.businessType]}
            </span>
          )}

          {/* The founding YEAR, not a derived "N years in business". Subtracting from
              the current year would need `new Date()` on a prerendered page, and the
              seller's own figure is the honest thing to print anyway. */}
          {declaredProfile?.yearFounded !== null && declaredProfile?.yearFounded !== undefined && (
            <span className="text-xs tracking-[0.4px] text-[#6F7979]">
              Founded {declaredProfile.yearFounded}, per the seller
            </span>
          )}
        </div>

        {catalogRating && (
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-sm bg-[#4A6364] p-1 text-[11px] leading-4 font-medium tracking-[0.5px] text-white">
              {catalogRating.rating.toFixed(1)}
              <span aria-hidden>★</span>
            </span>
            <span className="text-sm leading-5 font-medium tracking-[0.1px] text-[#6F7979]">
              {catalogRating.reviewCount.toLocaleString("en-US")} reviews across the products shown
            </span>
          </div>
        )}

        {storefront.summary && (
          <p className="mt-3 text-sm leading-5 tracking-[0.25px] text-[#191C1C]">
            {storefront.summary}
          </p>
        )}

        {storefront.websiteUrl && (
          <a
            href={storefront.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium tracking-wide text-[#2A76FD]"
          >
            <Image
              src="/icons/link_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              width={16}
              height={16}
              alt=""
            />
            Company website
          </a>
        )}
      </div>
    </header>
  );
}

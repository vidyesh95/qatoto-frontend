// TRANSPORT: props-only — renders one placed entity, no network.
//
// THE FOUR-ARM SWITCH. A rail placement points at a product, a category, an organization or a
// provider offering, and each needs a different card and a different link.
//
// THE LAST TWO ARMS ARE WHY THIS FILE EXISTS. `store_merchandising_entity_kind` has admitted
// `category` and `organization` since Phase 1, and the backend resolver DROPPED THEM SILENTLY until
// Phase 8 — a merchandiser could place a category in a rail, see nothing rendered, and get no error
// anywhere. It was the worst of the four A19 integrity bugs precisely because nothing failed. An
// exhaustive switch with a `never` default is what keeps the client from reintroducing it: a fifth
// entity kind becomes a compile error, not a blank tile.

import Image from "next/image";
import Link from "next/link";

import ProviderKindBadge from "@/components/commerce/shared/provider-kind-badge";
import CatalogProductCard from "@/components/home/store/cards/catalog-product-card";
import { countryLabelFromCode, formatCentsRangeLabel } from "@/lib/store/format";
import type { MerchandisingItem } from "@/lib/store/merchandising.schemas";
import { SERVICE_PRICING_MODEL_LABELS } from "@/lib/store/providers.schemas";

const TILE_CLASS =
  "flex h-full flex-col rounded-xl border border-[#CAC4D0]/60 p-3 transition-colors hover:border-[#2A76FD]";

export default function MerchandisingItemCard({ item }: { item: MerchandisingItem }) {
  switch (item.entityKind) {
    case "product":
      // Reuses the catalog tile rather than a rail-specific one, so a product looks the same
      // wherever it is placed and `hasVariants` keeps meaning "this is a from price".
      return <CatalogProductCard product={item.product} />;

    case "category":
      return (
        <Link href={`/store/categories/${item.category.slug}`} className={TILE_CLASS}>
          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-[#F5F5F5]">
            {item.category.imageUrl !== null && (
              <Image
                src={item.category.imageUrl}
                fill
                sizes="(min-width: 1024px) 264px, 45vw"
                alt={item.category.name}
                className="object-cover"
              />
            )}
          </div>
          <p className="mt-2 text-[11px] leading-4 font-medium tracking-[0.4px] text-[#6F7979] uppercase">
            Category
          </p>
          <p className="text-sm leading-5 font-medium text-[#191C1C]">{item.category.name}</p>
        </Link>
      );

    case "organization":
      return (
        <Link href={`/store/organizations/${item.organization.slug}`} className={TILE_CLASS}>
          <div className="flex items-center gap-2">
            {item.organization.logoUrl === null ? (
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#D6E3FF] text-xs font-medium text-[#00696E]">
                {item.organization.displayName.slice(0, 2).toUpperCase()}
              </span>
            ) : (
              <Image
                src={item.organization.logoUrl}
                alt=""
                width={40}
                height={40}
                className="size-10 shrink-0 rounded-full object-cover"
              />
            )}
            <p className="text-[11px] leading-4 font-medium tracking-[0.4px] text-[#6F7979] uppercase">
              Seller
            </p>
          </div>
          <p className="mt-2 line-clamp-2 text-sm leading-5 font-medium text-[#191C1C]">
            {item.organization.displayName}
          </p>
          <p className="text-[11px] leading-4 text-[#6F7979]">
            {countryLabelFromCode(item.organization.countryCode)}
          </p>
          {item.organization.summary !== null && (
            <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-[#6F7979]">
              {item.organization.summary}
            </p>
          )}
        </Link>
      );

    case "provider_offering": {
      const priceRangeLabel = formatCentsRangeLabel(
        item.offering.indicativePriceMinInCents,
        item.offering.indicativePriceMaxInCents,
        item.offering.currency,
      );
      return (
        <Link href={`/store/services/${item.offering.slug}`} className={TILE_CLASS}>
          <ProviderKindBadge providerKind={item.offering.providerKind} isCompact />
          <p className="mt-1 line-clamp-2 text-sm leading-5 font-medium text-[#191C1C]">
            {item.offering.title}
          </p>
          <p className="text-[11px] leading-4 text-[#6F7979]">{item.provider.displayName}</p>
          <p className="mt-auto pt-2 text-xs leading-4 font-medium text-[#191C1C]">
            {/* A quote-only offering has no range at all — the model's own label is the honest
                answer, and a `$0` would be an invented price. */}
            {priceRangeLabel ?? SERVICE_PRICING_MODEL_LABELS[item.offering.pricingModel]}
          </p>
        </Link>
      );
    }

    default: {
      const exhaustiveCheck: never = item;
      return exhaustiveCheck;
    }
  }
}

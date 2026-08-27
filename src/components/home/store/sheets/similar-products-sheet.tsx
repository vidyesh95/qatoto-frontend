// TRANSPORT: props-only — renders the companions the page fetched, no network.
//
// "View similar" — the relation graph, grouped by how each product relates.
//
// `sourceKind` DECIDES THE WORDING AND THAT IS THE WHOLE POINT OF SHOWING IT. A `seller_declared`
// relation is the SELLER'S CLAIM that its bolt fits a given bicycle; only `moderator_curated` has
// been checked by anyone. Fitment is a safety claim in every category where it matters, so a
// caption saying which one this is travels with every tile — see `companionSourceCaption`.
//
// GROUPED, NOT FLATTENED. "Spare part" and "Often bought together" are different relationships to
// the product being viewed, and merging them into one "similar products" grid loses the only
// information a buyer sourcing a replacement actually needs.
"use client";

import CatalogProductCard from "@/components/home/store/cards/catalog-product-card";
import ModalSheet from "@/components/home/shared/modal-sheet";
import { PRODUCT_RELATION_KIND_LABELS } from "@/lib/store/merchandising.schemas";
import { companionSourceCaption, type ProductCompanionGroup } from "@/lib/store/products.schemas";

export default function SimilarProductsSheet({
  companionGroups,
  onClose,
}: {
  readonly companionGroups: readonly ProductCompanionGroup[];
  readonly onClose: () => void;
}) {
  const populatedGroups = companionGroups.filter((group) => group.items.length > 0);

  return (
    <ModalSheet title="Related products" onClose={onClose}>
      <div className="flex flex-col gap-5 px-4 pb-6">
        {populatedGroups.map((group) => (
          <section key={group.relationKind}>
            <h3 className="pb-2 text-sm font-medium tracking-[0.1px] text-[#191C1C]">
              {PRODUCT_RELATION_KIND_LABELS[group.relationKind]}
            </h3>
            <ul className="grid grid-cols-2 gap-3">
              {group.items.map((companion) => (
                <li key={companion.product.id} className="flex flex-col">
                  <CatalogProductCard product={companion.product} />
                  <span className="mt-1 text-[11px] leading-4 text-[#6F7979]">
                    {companionSourceCaption(companion.sourceKind)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </ModalSheet>
  );
}

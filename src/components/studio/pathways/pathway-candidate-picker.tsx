"use client";

// TRANSPORT: client-query — searches `/store/search` and lazily reads one product for its variants.
//
// ⚠️ **`creatable-combobox.tsx` COULD NOT BE REUSED, AND THAT WAS CHECKED RATHER THAN ASSUMED.** It
// filters an array it is handed (`rankOptionMatches` is a local pass), exposes no `onQueryChange`,
// has no async or empty-result state, and is single-select. A candidate picker is server-searched,
// paged and multi-row. The overlay/toggle shape here follows `store-products-picker.tsx`; its DATA
// SOURCE is deliberately not followed, because that one is `GET /products/mine` — the author's own
// listings — and a curated set is supposed to mix other people's products with your own. That is
// the entire premise of the `ownCandidateShare` signal a moderator reads.
//
// ⚠️ **THE VARIANT STEP IS MANDATORY, NOT A REFINEMENT.** The backend refuses a candidate with
// `VARIANT_REQUIRED` when the product has active variants and none was named, and
// `VARIANT_NOT_APPLICABLE` when one is named for a product that has none. A search hit says
// nothing about variants, so choosing a product is a two-step act: pick it, then — only if it has
// variants — pick which one. Skipping the second step ships a picker whose every variant product
// fails on save.

import { useState } from "react";

import { getStoreProduct } from "@/lib/store/products.api";
import type { StoreProductDetail } from "@/lib/store/products.schemas";
import { useStoreProductSearchQuery } from "@/hooks/store/use-store-product-search";

/** What the picker hands back: everything the write needs, plus the names the editor renders. */
export interface PickedCandidate {
  readonly productId: string;
  readonly productTitle: string;
  readonly productPublicSlug: string;
  readonly variantId: string | null;
  readonly variantName: string | null;
  /**
   * ⚠️ **CARRIED BACK BECAUSE A SLOT CANNOT ASK FOR FEWER UNITS THAN THIS.** The server refuses a
   * candidate whose minimum order quantity exceeds its slot's quantity — found live, with a chair
   * whose MOQ is 10 dropped into a slot asking for 1. The editor shows the number rather than
   * letting the author discover it as a refusal on save.
   *
   * `null` is UNSTATED, not one — the same distinction the RFQ composer makes when it declines to
   * seed a quantity from a minimum the seller never gave. An unstated minimum imposes no floor.
   */
  readonly minimumOrderQuantity: number | null;
}

type PickerState =
  | { readonly status: "searching" }
  | { readonly status: "choosingVariant"; readonly product: StoreProductDetail }
  | { readonly status: "loadingProduct" }
  | { readonly status: "productUnavailable"; readonly message: string };

export default function PathwayCandidatePicker({
  onCandidatePicked,
  onClose,
}: {
  readonly onCandidatePicked: (candidate: PickedCandidate) => void;
  readonly onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [pickerState, setPickerState] = useState<PickerState>({ status: "searching" });

  const searchQuery = useStoreProductSearchQuery(query);

  const handleHitClick = async (publicSlug: string) => {
    setPickerState({ status: "loadingProduct" });
    // A search hit carries no variant information at all, so the only way to know whether this
    // product needs a variant is to read it. Done lazily, per pick, rather than for every hit.
    const result = await getStoreProduct(publicSlug);
    if (!result.success) {
      setPickerState({ status: "productUnavailable", message: result.error.message });
      return;
    }
    const product = result.data;
    if (product.variants.length === 0) {
      onCandidatePicked({
        productId: product.id,
        productTitle: product.title,
        productPublicSlug: product.publicSlug,
        // Omitted rather than nulled at the wire — see the editor. A product with no variants that
        // names one is `VARIANT_NOT_APPLICABLE`.
        variantId: null,
        variantName: null,
        minimumOrderQuantity: product.minimumOrderQuantity,
      });
      return;
    }
    setPickerState({ status: "choosingVariant", product });
  };

  return (
    <div className="rounded-2xl border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-medium">Add a product</h4>
        <button type="button" onClick={onClose} className="cursor-pointer text-xs underline">
          Close
        </button>
      </div>

      {pickerState.status === "choosingVariant" ? (
        <div className="mt-2 space-y-2">
          <p className="text-xs text-muted-foreground">
            <span className="text-foreground">{pickerState.product.title}</span> is sold in options.
            Pick the one this set calls for — a set cannot name the product alone.
          </p>
          <ul className="space-y-1">
            {pickerState.product.variants.map((variant) => (
              <li key={variant.id}>
                <button
                  type="button"
                  onClick={() =>
                    onCandidatePicked({
                      productId: pickerState.product.id,
                      productTitle: pickerState.product.title,
                      productPublicSlug: pickerState.product.publicSlug,
                      variantId: variant.id,
                      variantName: variant.name,
                      // The variant's own minimum, which can differ from the product's.
                      minimumOrderQuantity: variant.minimumOrderQuantity,
                    })
                  }
                  className="w-full cursor-pointer rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted"
                >
                  {variant.name}
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setPickerState({ status: "searching" })}
            className="cursor-pointer text-xs underline"
          >
            Back to search
          </button>
        </div>
      ) : (
        <>
          <input
            type="search"
            value={query}
            onChange={(changeEvent) => {
              setQuery(changeEvent.target.value);
              setPickerState({ status: "searching" });
            }}
            placeholder="Search every listing on the store"
            className="mt-2 w-full rounded-lg border border-border px-2 py-1.5 text-sm"
          />

          {pickerState.status === "loadingProduct" && (
            <p className="mt-2 text-xs text-muted-foreground">Checking that listing…</p>
          )}
          {pickerState.status === "productUnavailable" && (
            <output role="alert" className="mt-2 block text-xs text-red-700">
              {pickerState.message}
            </output>
          )}

          {searchQuery.isPending && query.trim().length >= 2 && (
            <p className="mt-2 text-xs text-muted-foreground">Searching…</p>
          )}
          {searchQuery.data?.success === false && (
            <output role="alert" className="mt-2 block text-xs text-red-700">
              {searchQuery.data.error.message}
            </output>
          )}
          {searchQuery.data?.success === true && searchQuery.data.data.items.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">Nothing matched that.</p>
          )}
          {searchQuery.data?.success === true && (
            <ul className="mt-2 space-y-1">
              {searchQuery.data.data.items.map((hit) => (
                <li key={hit.entityId}>
                  <button
                    type="button"
                    onClick={() => void handleHitClick(hit.publicSlug)}
                    className="w-full cursor-pointer rounded-lg px-2 py-1.5 text-left hover:bg-muted"
                  >
                    <span className="block text-sm text-foreground">{hit.title}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {hit.organizationDisplayName}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

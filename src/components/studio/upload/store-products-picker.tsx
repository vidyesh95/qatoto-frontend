"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

// Store products picker overlay — attach the creator's own listings so they
// render as shoppable cards on the watch page. Client only picks product ids
// for display; the backend re-validates ownership, price, and inventory.
export type MockStoreProduct = {
  id: string;
  title: string;
  priceLabel: string;
};

// Inline mock per UI phase — intentionally not imported from products-page.
export const MOCK_STORE_PRODUCTS: MockStoreProduct[] = [
  {
    id: "product-headphones",
    title: "Wireless Noise-Cancelling Headphones",
    priceLabel: "$129.99",
  },
  {
    id: "product-anime-figure",
    title: "Anime Collectible Figure — Limited Edition",
    priceLabel: "$89.00",
  },
  { id: "product-camera-kit", title: "4K Streaming Camera Kit", priceLabel: "$349.00" },
  { id: "product-desk-lamp", title: "Creator Desk Lamp with Ring Light", priceLabel: "$54.50" },
  { id: "product-brush-pack", title: "Digital Art Brush Pack (Download)", priceLabel: "$19.00" },
];

type StoreProductsPickerProps = {
  attachedProductIds: string[];
  onAttachedProductIdsChange: (productIds: string[]) => void;
  onDone: () => void;
};

export default function StoreProductsPicker({
  attachedProductIds,
  onAttachedProductIdsChange,
  onDone,
}: StoreProductsPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const matchingProducts = MOCK_STORE_PRODUCTS.filter((product) =>
    product.title.toLowerCase().includes(searchQuery.trim().toLowerCase()),
  );

  function handleProductToggle(productId: string) {
    const isAlreadyAttached = attachedProductIds.includes(productId);
    onAttachedProductIdsChange(
      isAlreadyAttached
        ? attachedProductIds.filter((attachedId) => attachedId !== productId)
        : [...attachedProductIds, productId],
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close product picker"
        onClick={onDone}
        className="fixed inset-0 z-60 cursor-default bg-black/40"
      />
      <div className="fixed inset-x-4 top-1/2 z-70 mx-auto flex max-h-[70dvh] w-auto max-w-md -translate-y-1/2 flex-col rounded-2xl border border-black/10 bg-background shadow-lg">
        {MOCK_STORE_PRODUCTS.length === 0 ? (
          <div className="flex flex-col items-center gap-4 p-8 text-center">
            <p className="text-sm text-muted-foreground">No products yet</p>
            <Link
              href="/studio/products/create"
              className="flex cursor-pointer items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium transition-opacity hover:opacity-90"
            >
              <Image
                src="/icons/local_mall_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt=""
                width={20}
                height={20}
              />
              Create store listing
            </Link>
          </div>
        ) : (
          <>
            <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-black/10 bg-background p-4">
              <Image
                src="/icons/search_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt=""
                width={20}
                height={20}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search your store products"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>

            <ul className="min-h-0 flex-1 overflow-y-auto py-2">
              {matchingProducts.length === 0 ? (
                <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No products match your search
                </li>
              ) : (
                matchingProducts.map((product) => {
                  const isAttached = attachedProductIds.includes(product.id);
                  return (
                    <li key={product.id}>
                      <button
                        type="button"
                        onClick={() => handleProductToggle(product.id)}
                        className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted"
                      >
                        <span
                          className={`flex size-5 shrink-0 items-center justify-center rounded border ${
                            isAttached ? "border-foreground bg-foreground" : "border-border"
                          }`}
                        >
                          {isAttached && (
                            <Image
                              src="/icons/check_18dp_FFFFFF_FILL1_wght400_GRAD0_opsz20.svg"
                              alt=""
                              width={14}
                              height={14}
                            />
                          )}
                        </span>
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                          <Image
                            src="/icons/local_mall_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                            alt=""
                            width={20}
                            height={20}
                          />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                          {product.title}
                        </span>
                        <span className="shrink-0 text-sm text-muted-foreground">
                          {product.priceLabel}
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>

            <div className="flex items-center justify-end border-t border-black/10 p-3">
              <button
                type="button"
                onClick={onDone}
                className="cursor-pointer rounded-full bg-primary px-5 py-2 text-sm font-medium transition-opacity hover:opacity-90"
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

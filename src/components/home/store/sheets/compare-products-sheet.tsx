// TRANSPORT: mock — the five products are local and the selection is never sent.
//
// "Add to Compare". The buyer ticks products to put side by side; the footer "Compare" button is
// the bottom option, and it now lives in `StoreSheet`'s `footer` slot rather than an absolutely
// positioned overlay — which is what the old `pb-[calc(80px+env(safe-area-inset-bottom))]` on the
// scroll region was reserving space for.
//
// Wire-able candidates from `GET /store/products/:productSlug/companions`. There is NO compare
// endpoint: the backend aligns nothing, so a real comparison table means fetching each product's
// `specifications[]` and aligning on `key` — which is why Alibaba's compare tray caps at four.
"use client";

import { useState } from "react";

import Image from "next/image";

import StoreSheet from "@/components/home/store/shared/store-sheet";

type CompareProduct = {
  id: string;
  name: string;
  price: string;
  imageSrc: string;
  isCurrent?: boolean;
};

const COMPARE_PRODUCTS: CompareProduct[] = [
  {
    id: "raspberry-red",
    name: "Louis Vuitton Folding Metal Chair",
    price: "$1230.79",
    imageSrc: "/dummy/chair_raspberry_red.avif",
    isCurrent: true,
  },
  {
    id: "royal-purple",
    name: "Royal Purple Folding Chair",
    price: "$1180.50",
    imageSrc: "/dummy/chair_royal_purple.avif",
  },
  {
    id: "sea-blue",
    name: "Sea Blue Folding Chair",
    price: "$1210.00",
    imageSrc: "/dummy/chair_sea_blue.avif",
  },
  {
    id: "charcoal-black",
    name: "Charcoal Black Folding Chair",
    price: "$1305.75",
    imageSrc: "/dummy/chair_charcoal_black.avif",
  },
  {
    id: "stacking",
    name: "Stacking Banquet Chair",
    price: "$640.99",
    imageSrc: "/dummy/stacking_chair.avif",
  },
];

export default function CompareProductsSheet({ onClose }: { onClose: () => void }) {
  const [products, setProducts] = useState<CompareProduct[]>(COMPARE_PRODUCTS);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(["raspberry-red"]);

  const toggleProduct = (productId: string) =>
    setSelectedProductIds((previous) =>
      previous.includes(productId)
        ? previous.filter((id) => id !== productId)
        : [...previous, productId],
    );

  // Close button deletes the product from the list entirely (and drops its
  // selection). Clear all only unselects — it leaves every product in the list.
  const removeProduct = (productId: string) => {
    setProducts((previous) => previous.filter((product) => product.id !== productId));
    setSelectedProductIds((previous) => previous.filter((id) => id !== productId));
  };

  const clearAll = () => setSelectedProductIds([]);

  const isCompareDisabled = selectedProductIds.length < 2;
  const hasSelection = selectedProductIds.length > 0;

  return (
    <StoreSheet
      title="Add to Compare"
      onClose={onClose}
      footer={
        <div className="flex items-center gap-3">
          <p className="flex-1 text-xs text-[#6F7979]">{selectedProductIds.length} selected</p>
          <button
            type="button"
            onClick={onClose}
            disabled={isCompareDisabled}
            className="rounded-full bg-[#00696E] px-6 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            Compare
          </button>
        </div>
      }
    >
      <div className="flex items-center gap-2 px-4 pb-2">
        <p className="flex-1 text-xs text-[#6F7979]">
          Pick at least two products to compare them side by side.
        </p>
        <button
          type="button"
          onClick={clearAll}
          aria-hidden={!hasSelection}
          tabIndex={hasSelection ? 0 : -1}
          className={`shrink-0 cursor-pointer text-xs font-medium text-[#00696E] ${
            hasSelection ? "" : "invisible"
          }`}
        >
          Clear all
        </button>
      </div>

      <div className="px-4 pb-2">
        <ul className="flex flex-col gap-2">
          {products.map((product) => {
            const isSelected = selectedProductIds.includes(product.id);
            const isCurrent = product.isCurrent ?? false;
            return (
              <li
                key={product.id}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
                  isSelected ? "border-[#00696E] bg-[#00696E]/5" : "border-[#E0E3E3]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleProduct(product.id)}
                  aria-pressed={isSelected}
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
                >
                  <div className="relative size-14 shrink-0 overflow-hidden rounded bg-[#F5F5F5]">
                    <Image
                      src={product.imageSrc}
                      fill
                      sizes="56px"
                      alt={product.name}
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#191C1C]">{product.name}</p>
                    <p className="text-sm text-[#191C1C]">{product.price}</p>
                    {isCurrent && (
                      <p className="text-[11px] font-medium text-[#00696E]">This product</p>
                    )}
                  </div>
                  <span
                    className={`grid size-6 shrink-0 place-items-center rounded border ${
                      isSelected ? "border-[#00696E] bg-[#00696E]" : "border-[#6F7979]"
                    }`}
                  >
                    {isSelected && (
                      <Image
                        src="/icons/check_18dp_FFFFFF_FILL1_wght400_GRAD0_opsz20.svg"
                        width={16}
                        height={16}
                        alt=""
                      />
                    )}
                  </span>
                </button>

                {/* Per-item delete — always visible, removes the product from the list. */}
                <button
                  type="button"
                  onClick={() => removeProduct(product.id)}
                  aria-label={`Remove ${product.name} from compare`}
                  className="shrink-0 cursor-pointer rounded-full p-1 transition-colors hover:bg-muted"
                >
                  <Image
                    src="/icons/delete_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                    width={18}
                    height={18}
                    alt=""
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </StoreSheet>
  );
}

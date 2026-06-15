"use client";

import { useEffect, useState } from "react";

import Image from "next/image";

// "Add to Compare" bottom sheet for the product page (UI-only phase, no fetch).
// Buyer ticks the products to put side by side; the footer "Compare" button is
// the bottom option. Selection lives in local state purely for UX feedback —
// nothing is sent. The current product is pre-selected and locked in.

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
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(["raspberry-red"]);

  useEffect(() => {
    const handleKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const toggleProduct = (productId: string) =>
    setSelectedProductIds((previous) =>
      previous.includes(productId)
        ? previous.filter((id) => id !== productId)
        : [...previous, productId],
    );

  const removeProduct = (productId: string) =>
    setSelectedProductIds((previous) => previous.filter((id) => id !== productId));

  const clearAll = () => setSelectedProductIds([]);

  const isCompareDisabled = selectedProductIds.length < 2;
  const hasRemovableSelection = selectedProductIds.length > 0;

  return (
    <>
      <button
        type="button"
        aria-label="Close compare products"
        onClick={onClose}
        className="fixed inset-0 z-55 bg-black/40"
      />

      <div
        aria-label="Add to compare"
        className="fixed inset-x-0 bottom-0 z-60 flex max-h-[85dvh] flex-col rounded-t-2xl bg-background shadow-lg sm:inset-0 sm:m-auto sm:h-max sm:max-h-[80dvh] sm:w-md sm:rounded-2xl sm:border sm:border-black/10"
      >
        {/* Drag handle — mobile affordance only. */}
        <div className="flex justify-center pt-3 sm:hidden">
          <span className="h-1.5 w-10 rounded-full bg-black/15" />
        </div>

        <header className="flex shrink-0 items-center gap-2 px-4 py-3">
          <h2 className="flex-1 text-base font-medium">Add to Compare</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded-full p-1 transition-colors hover:bg-muted"
          >
            <Image
              src="/icons/close_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              alt=""
              width={24}
              height={24}
            />
          </button>
        </header>

        <div className="flex shrink-0 items-center gap-2 px-4 pb-2">
          <p className="flex-1 text-xs text-[#6F7979]">
            Pick at least two products to compare them side by side.
          </p>
          {hasRemovableSelection && (
            <button
              type="button"
              onClick={clearAll}
              className="shrink-0 cursor-pointer text-xs font-medium text-[#00696E]"
            >
              Clear all
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(80px+env(safe-area-inset-bottom))]">
          <ul className="flex flex-col gap-2">
            {COMPARE_PRODUCTS.map((product) => {
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

                  {/* Per-item delete — any selected product, including the current one. */}
                  {isSelected && (
                    <button
                      type="button"
                      onClick={() => removeProduct(product.id)}
                      aria-label={`Remove ${product.name} from compare`}
                      className="shrink-0 cursor-pointer rounded-full p-1 transition-colors hover:bg-muted"
                    >
                      <Image
                        src="/icons/close_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                        width={18}
                        height={18}
                        alt=""
                      />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Sticky footer — Compare is the bottom option. */}
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 border-t border-[#CAC4D0]/60 bg-background px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
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
      </div>
    </>
  );
}

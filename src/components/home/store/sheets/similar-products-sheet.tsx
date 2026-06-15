"use client";

import { useEffect } from "react";

import Image from "next/image";

// "View similar" bottom sheet for the product page (UI-only phase, no fetch).
// Shows products close to the one being viewed as a two-column grid. What counts
// as "similar" is ranked by the backend later (heavy work, never the client's);
// here it's static mock data with the same chrome as the other product sheets.

type SimilarProduct = {
  name: string;
  price: string;
  rating: string;
  imageSrc: string;
};

const SIMILAR_PRODUCTS: SimilarProduct[] = [
  {
    name: "Royal Purple Folding Chair",
    price: "$1180.50",
    rating: "4.7",
    imageSrc: "/dummy/chair_royal_purple.avif",
  },
  {
    name: "Sea Blue Folding Chair",
    price: "$1210.00",
    rating: "4.6",
    imageSrc: "/dummy/chair_sea_blue.avif",
  },
  {
    name: "Charcoal Black Folding Chair",
    price: "$1305.75",
    rating: "4.8",
    imageSrc: "/dummy/chair_charcoal_black.avif",
  },
  {
    name: "Living Room Accent Chair",
    price: "$980.20",
    rating: "4.5",
    imageSrc: "/dummy/living_room_chair.avif",
  },
  {
    name: "Stacking Banquet Chair",
    price: "$640.99",
    rating: "4.4",
    imageSrc: "/dummy/stacking_chair.avif",
  },
  {
    name: "Raspberry Red Folding Chair",
    price: "$1230.79",
    rating: "4.8",
    imageSrc: "/dummy/chair_raspberry_red02.avif",
  },
];

export default function SimilarProductsSheet({ onClose }: { onClose: () => void }) {
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

  return (
    <>
      <button
        type="button"
        aria-label="Close similar products"
        onClick={onClose}
        className="fixed inset-0 z-55 bg-black/40"
      />

      <div
        aria-label="Similar products"
        className="fixed inset-x-0 bottom-0 z-60 flex max-h-[85dvh] flex-col rounded-t-2xl bg-background shadow-lg sm:inset-0 sm:m-auto sm:h-max sm:max-h-[80dvh] sm:w-md sm:rounded-2xl sm:border sm:border-black/10"
      >
        {/* Drag handle — mobile affordance only. */}
        <div className="flex justify-center pt-3 sm:hidden">
          <span className="h-1.5 w-10 rounded-full bg-black/15" />
        </div>

        <header className="flex shrink-0 items-center gap-2 px-4 py-3">
          <h2 className="flex-1 text-base font-medium">Similar products</h2>
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

        <p className="shrink-0 px-4 pb-2 text-xs text-[#6F7979]">
          Other chairs buyers compared with this one.
        </p>

        <div className="grid min-h-0 flex-1 grid-cols-2 gap-3 overflow-y-auto px-4 pb-[calc(16px+env(safe-area-inset-bottom))]">
          {SIMILAR_PRODUCTS.map((product) => (
            <button key={product.name} type="button" className="flex flex-col text-left">
              <div className="relative aspect-3/4 w-full overflow-hidden rounded-xl bg-[#F5F5F5]">
                <Image
                  src={product.imageSrc}
                  fill
                  sizes="(min-width: 640px) 220px, 45vw"
                  alt={product.name}
                  className="object-cover"
                />
              </div>
              <p className="mt-1.5 truncate text-sm font-medium text-[#191C1C]">{product.name}</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[#191C1C]">{product.price}</span>
                <span className="inline-flex items-center gap-0.5 text-xs text-[#4A6364]">
                  {product.rating}
                  <span aria-hidden>★</span>
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

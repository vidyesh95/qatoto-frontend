"use client";

import { useEffect } from "react";

import Image from "next/image";
import Link from "next/link";

// Manufacturer storefront bottom sheet (UI-only phase, no fetch). Shows the
// supplier's catalog as a masonry grid of mixed-size tiles; tapping a tile
// routes to that product's detail page. The real catalog, ranking, and which
// products belong to a manufacturer are the backend's job later — here it is
// static mock data with the same chrome as the other product sheets.

type StorefrontProduct = {
  id: string;
  name: string;
  price: string;
  rating: string;
  imageSrc: string;
  // Display-only tile span: "tall" tiles take more vertical room in the masonry.
  size: "tall" | "short";
};

const STOREFRONT_PRODUCTS: StorefrontProduct[] = [
  {
    id: "lv-folding-chair",
    name: "Raspberry Red Folding Chair",
    price: "$1230.79",
    rating: "4.8",
    imageSrc: "/dummy/chair_raspberry_red.avif",
    size: "tall",
  },
  {
    id: "lv-folding-chair",
    name: "Royal Purple Folding Chair",
    price: "$1180.50",
    rating: "4.7",
    imageSrc: "/dummy/chair_royal_purple.avif",
    size: "short",
  },
  {
    id: "lv-folding-chair",
    name: "Sea Blue Folding Chair",
    price: "$1210.00",
    rating: "4.6",
    imageSrc: "/dummy/chair_sea_blue.avif",
    size: "short",
  },
  {
    id: "lv-folding-chair",
    name: "Charcoal Black Folding Chair",
    price: "$1305.75",
    rating: "4.8",
    imageSrc: "/dummy/chair_charcoal_black.avif",
    size: "tall",
  },
  {
    id: "lv-folding-chair",
    name: "Living Room Accent Chair",
    price: "$980.20",
    rating: "4.5",
    imageSrc: "/dummy/living_room_chair.avif",
    size: "tall",
  },
  {
    id: "lv-folding-chair",
    name: "Stacking Banquet Chair",
    price: "$640.99",
    rating: "4.4",
    imageSrc: "/dummy/stacking_chair.avif",
    size: "short",
  },
  {
    id: "lv-folding-chair",
    name: "Raspberry Red Folding Chair (v2)",
    price: "$1245.00",
    rating: "4.8",
    imageSrc: "/dummy/chair_raspberry_red02.avif",
    size: "short",
  },
  {
    id: "lv-folding-chair",
    name: "Raspberry Red Folding Chair (v3)",
    price: "$1260.00",
    rating: "4.9",
    imageSrc: "/dummy/chair_raspberry_red03.avif",
    size: "tall",
  },
];

export default function StoreProductsSheet({ onClose }: { onClose: () => void }) {
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
        aria-label="Close store"
        onClick={onClose}
        className="fixed inset-0 z-55 bg-black/40"
      />

      <div
        aria-label="Manufacturer store"
        className="fixed inset-x-0 bottom-0 z-60 flex max-h-[85dvh] flex-col rounded-t-2xl bg-background shadow-lg sm:inset-0 sm:m-auto sm:h-max sm:max-h-[80dvh] sm:w-md sm:rounded-2xl sm:border sm:border-black/10"
      >
        {/* Drag handle — mobile affordance only. */}
        <div className="flex justify-center pt-3 sm:hidden">
          <span className="h-1.5 w-10 rounded-full bg-black/15" />
        </div>

        <header className="flex shrink-0 items-center gap-2 px-4 py-3">
          <Image
            src="/icons/storefront_24dp_00696E_FILL0_wght400_GRAD0_opsz24.svg"
            width={22}
            height={22}
            alt=""
          />
          <h2 className="flex-1 text-base font-medium">
            Guangdong Puda Electrical Appliance Co.
          </h2>
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
          More from this manufacturer. Tap a product to view its details.
        </p>

        {/* Masonry — `columns` lets tiles flow at mixed heights for a varied grid. */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(16px+env(safe-area-inset-bottom))]">
          <div className="columns-2 gap-3 [&>*]:mb-3">
            {STOREFRONT_PRODUCTS.map((product, productIndex) => (
              <Link
                key={`${product.id}-${productIndex}`}
                href={`/store/product/${product.id}`}
                onClick={onClose}
                className="block break-inside-avoid"
              >
                <div
                  className={`relative w-full overflow-hidden rounded-xl bg-[#F5F5F5] ${
                    product.size === "tall" ? "aspect-3/4" : "aspect-square"
                  }`}
                >
                  <Image
                    src={product.imageSrc}
                    fill
                    sizes="(min-width: 640px) 220px, 45vw"
                    alt={product.name}
                    className="object-cover"
                  />
                </div>
                <p className="mt-1.5 truncate text-sm font-medium text-[#191C1C]">
                  {product.name}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#191C1C]">{product.price}</span>
                  <span className="inline-flex items-center gap-0.5 text-xs text-[#4A6364]">
                    {product.rating}
                    <span aria-hidden>★</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

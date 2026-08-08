// TRANSPORT: mock — the six products below are local. NOTHING here reaches a backend yet.
//
// Wire-able now, and the endpoint exists: `GET /store/products/:productSlug/companions` returns
// relation-graph companions grouped by `relationKind`, each carrying a full product card and a
// `sourceKind`. Two rules come with it and neither is optional:
//
//   `sourceKind` GATES THE LANGUAGE. `seller_declared` is a CLAIM — a seller saying its bolt
//   fits a given bicycle — and may drive discovery but must never render as verified
//   compatibility. Only `moderator_curated` earns confirmatory wording. Fitment is a safety
//   claim in every category where it matters, so "compatible" is not a synonym for "related".
//
//   THE ROWS ARE PRODUCT CARDS, so this grid should render `CatalogProductCard` rather than the
//   bespoke tile below — which has no id, no href, and a price as a display string.
"use client";

import Image from "next/image";

import StoreSheet from "@/components/home/store/shared/store-sheet";

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
  return (
    <StoreSheet title="Similar products" onClose={onClose}>
      <p className="px-4 pb-2 text-xs text-[#6F7979]">
        Other chairs buyers compared with this one.
      </p>

      <div className="grid grid-cols-2 gap-3 px-4 pb-4">
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
    </StoreSheet>
  );
}

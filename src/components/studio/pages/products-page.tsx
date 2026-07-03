"use client";

import Image from "next/image";
import Link from "next/link";

interface MockProduct {
  name: string;
  skuCode: string;
  priceLabel: string;
  stockQuantity: number;
  status: "Active" | "Draft";
}

const MOCK_PRODUCTS: MockProduct[] = [
  {
    name: "Wireless Noise-Cancelling Headphones",
    skuCode: "QT-AUDIO-001",
    priceLabel: "$129.99",
    stockQuantity: 42,
    status: "Active",
  },
  {
    name: "Anime Collectible Figure — Limited Edition",
    skuCode: "QT-ANIME-014",
    priceLabel: "$89.00",
    stockQuantity: 8,
    status: "Active",
  },
  {
    name: "4K Streaming Camera Kit",
    skuCode: "QT-VIDEO-007",
    priceLabel: "$349.00",
    stockQuantity: 0,
    status: "Draft",
  },
  {
    name: "Creator Desk Lamp with Ring Light",
    skuCode: "QT-HOME-023",
    priceLabel: "$54.50",
    stockQuantity: 120,
    status: "Active",
  },
  {
    name: "Digital Art Brush Pack (Download)",
    skuCode: "QT-DIGI-102",
    priceLabel: "$19.00",
    stockQuantity: 999,
    status: "Draft",
  },
];

// Seller-facing list of store products with a link into the create-listing
// wizard. Mock data only — no backend yet (UI phase).
export default function ProductsPage() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">My Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your store listings and inventory.
          </p>
        </div>
        <Link
          href="/studio/products/create"
          className="flex cursor-pointer items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium transition-opacity hover:opacity-90"
        >
          <Image
            src="/icons/add_circle_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt=""
            width={20}
            height={20}
          />
          Add product
        </Link>
      </div>

      <ul className="mt-6 flex flex-col gap-2">
        {MOCK_PRODUCTS.map((product) => (
          <li
            key={product.skuCode}
            className="flex items-center justify-between gap-4 rounded-xl border border-border px-4 py-3"
          >
            <div className="flex min-w-0 items-center gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-secondary">
                <Image
                  src="/icons/local_mall_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                  alt=""
                  width={24}
                  height={24}
                />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{product.name}</p>
                <p className="text-xs text-muted-foreground">SKU: {product.skuCode}</p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-6">
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  product.status === "Active"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {product.status}
              </span>
              <span className="w-20 text-right text-sm font-medium text-foreground">
                {product.priceLabel}
              </span>
              <span className="w-24 text-right text-sm text-muted-foreground">
                {product.stockQuantity} in stock
              </span>
              <button
                type="button"
                className="cursor-pointer text-sm text-[#1DBDC5] hover:underline"
              >
                Edit
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useDeleteProductMutation, useMyProductsQuery } from "@/lib/products/hooks";
import { centsToPriceLabel } from "@/lib/products/schemas";

// Seller-facing list of store products, backed by GET /products/mine. Links into
// the create wizard and, per row, into edit / delete.
export default function ProductsPage() {
  const myProductsQuery = useMyProductsQuery(1);
  const deleteProductMutation = useDeleteProductMutation();
  // Id of the row awaiting a delete confirmation (inline two-step, no window.confirm).
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  function handleConfirmDelete(productId: string) {
    deleteProductMutation.mutate(productId, {
      onSettled: () => setConfirmingDeleteId(null),
    });
  }

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
            src="/icons/box_add_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt=""
            width={20}
            height={20}
          />
          Add product
        </Link>
      </div>

      <div className="mt-6">{renderProductsList()}</div>
    </div>
  );

  function renderProductsList() {
    if (myProductsQuery.isPending) {
      return <StatusPanel message="Loading your products…" />;
    }
    if (myProductsQuery.isError) {
      return (
        <StatusPanel
          message="Couldn't load your products."
          action={
            <button
              type="button"
              onClick={() => myProductsQuery.refetch()}
              className="cursor-pointer rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50"
            >
              Try again
            </button>
          }
        />
      );
    }

    const products = myProductsQuery.data.rows;
    if (products.length === 0) {
      return (
        <StatusPanel
          message="You haven't listed any products yet."
          action={
            <Link
              href="/studio/products/create"
              className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
            >
              Create your first listing
            </Link>
          }
        />
      );
    }

    return (
      <ul className="flex flex-col gap-2">
        {products.map((product) => (
          <li
            key={product.id}
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
                <p className="truncate text-sm font-medium text-foreground">{product.title}</p>
                <p className="text-xs text-muted-foreground">SKU: {product.sku ?? "—"}</p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-6">
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  product.status === "active"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {product.status === "active" ? "Active" : "Draft"}
              </span>
              <span className="w-20 text-right text-sm font-medium text-foreground">
                {centsToPriceLabel(product.priceInCents)}
              </span>
              <span className="w-24 text-right text-sm text-muted-foreground">
                {product.stockQuantity} in stock
              </span>
              {confirmingDeleteId === product.id ? (
                <span className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleConfirmDelete(product.id)}
                    disabled={deleteProductMutation.isPending}
                    className="cursor-pointer text-sm font-medium text-red-500 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deleteProductMutation.isPending ? "Deleting…" : "Confirm"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDeleteId(null)}
                    className="cursor-pointer text-sm text-muted-foreground hover:underline"
                  >
                    Cancel
                  </button>
                </span>
              ) : (
                <span className="flex items-center gap-6">
                  <Link
                    href={`/studio/products/create?id=${product.id}`}
                    className="cursor-pointer text-sm text-[#1DBDC5] hover:underline"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => setConfirmingDeleteId(product.id)}
                    className="cursor-pointer text-sm text-red-500 hover:underline"
                  >
                    Delete
                  </button>
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    );
  }
}

// Centered placeholder for loading / error / empty states.
function StatusPanel({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-border py-24">
      <p className="text-sm text-muted-foreground">{message}</p>
      {action}
    </div>
  );
}

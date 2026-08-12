// TRANSPORT: client-query — reads GET /commerce/saved-products.
"use client";

// THE PAGE THE SAVE AND BOOKMARK TOGGLES HAVE BEEN FEEDING SINCE PHASE 13 WITH NOWHERE TO SHOW IT.
//
// `PUT|DELETE /store/products/:slug/save` and `/bookmark` shipped with A11 and `engagement-bar.tsx`
// has been calling them all along. Nothing listed the result: the per-product counters were
// readable, the SET was not readable at all, so a buyer could mark two hundred products and had no
// way to find them again. `GET /commerce/saved-products` was built for this page.
//
// TWO KINDS, ONE PAGE. Save and bookmark are independent toggles with independent counters, so the
// default tab is BOTH — a buyer who pressed either does not think of them as separate lists, and
// asking them to guess which one they used is a filing system, not a wishlist.
//
// A ROW CAN DISAPPEAR AND THAT IS CORRECT. The server resolves ids through
// `resolveEligibleProductCardsByIds`, which drops anything unpublished, hidden by a moderator, or
// belonging to an organization that stopped trading — so a page can come back shorter than its
// limit. A wishlist is not a licence to keep rendering a listing the store has withdrawn.

import { useState } from "react";

import Link from "next/link";

import CatalogProductCard from "@/components/home/store/cards/catalog-product-card";
import StatusPanel from "@/components/home/shared/status-panel";
import { useSavedProductsQuery } from "@/hooks/store/saved-products";
import type { ListSavedProductsFilter } from "@/lib/store/catalog.schemas";

type SavedKind = NonNullable<ListSavedProductsFilter["kind"]>;

const KIND_LABELS: Readonly<Record<SavedKind, string>> = {
  saved: "Saved",
  bookmarked: "Bookmarked",
};

export default function WishlistPage() {
  const [selectedKind, setSelectedKind] = useState<SavedKind | undefined>(undefined);
  const savedQuery = useSavedProductsQuery(
    selectedKind === undefined ? {} : { kind: selectedKind },
  );

  return (
    <div className="pb-10">
      <header className="px-4 pt-4 lg:px-6">
        <h1 className="font-serif text-2xl font-semibold text-foreground md:text-3xl">Wishlist</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Everything you have saved or bookmarked.
        </p>
      </header>

      <fieldset className="mt-3 flex flex-wrap gap-2 px-4 lg:px-6">
        <legend className="sr-only">Filter by how you marked it</legend>
        <KindChip
          label="Everything"
          isSelected={selectedKind === undefined}
          onSelect={() => setSelectedKind(undefined)}
        />
        {(Object.keys(KIND_LABELS) as SavedKind[]).map((kind) => (
          <KindChip
            key={kind}
            label={KIND_LABELS[kind]}
            isSelected={selectedKind === kind}
            onSelect={() => setSelectedKind(kind)}
          />
        ))}
      </fieldset>

      <div className="mt-3 px-4 lg:px-6">{renderWishlist(savedQuery, selectedKind)}</div>
    </div>
  );
}

function KindChip({
  label,
  isSelected,
  onSelect,
}: {
  label: string;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium ${
        isSelected
          ? "border-transparent bg-[#00696E] text-white"
          : "border-border text-muted-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function renderWishlist(
  savedQuery: ReturnType<typeof useSavedProductsQuery>,
  selectedKind: SavedKind | undefined,
) {
  if (savedQuery.isPending) {
    return <p className="text-sm text-muted-foreground">Loading your wishlist…</p>;
  }

  const result = savedQuery.data;
  if (savedQuery.isError || result === undefined) {
    return (
      <StatusPanel
        message="Couldn't load your wishlist."
        className="border border-border px-6 py-16"
      />
    );
  }
  if (!result.success) {
    // A 401 renders the backend's own sentence — "Please sign in." — rather than an invented one.
    return (
      <StatusPanel
        message={result.error.message}
        className="border border-border px-6 py-16"
        action={
          result.error.code === "401" ? (
            <Link
              href="/sign-in"
              className="rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white"
            >
              Sign in
            </Link>
          ) : undefined
        }
      />
    );
  }

  if (result.data.items.length === 0) {
    return (
      <StatusPanel
        message={
          selectedKind === undefined
            ? "Nothing saved yet. The heart and bookmark on any listing put it here."
            : `Nothing ${KIND_LABELS[selectedKind].toLowerCase()} yet.`
        }
        className="border border-border px-6 py-16"
        action={
          <Link
            href="/store"
            className="rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white"
          >
            Browse the store
          </Link>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {result.data.items.map((product) => (
        <CatalogProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

// Store data layer for the B2B commerce surface. Mirrors the fetch+mock
// fallback shape of `cms.ts` / `videos.ts`: if `QATOTO_STORE_API_URL` is unset
// or the upstream call fails, every getter falls back to the in-file MOCK_*
// data so the UI renders without a backend. All getters are `"use cache"`.
//
// The backend is the source of truth. The category tree, pathway item sets,
// pricing, and product feeds returned here are display data only — the Express
// API must independently re-derive and re-authorize anything trusted.

import type { CategoryView, Pathway, StoreCategory, StoreHome } from "@/types/store";

import {
  hoverAt,
  MOCK_CATEGORIES,
  MOCK_CATEGORY_RAILS,
  MOCK_LEAF_RAILS,
  MOCK_PATHWAYS,
  MOCK_STORE_HOME,
} from "@/mocks/store-mocks";

const STORE_API_URL = process.env.QATOTO_STORE_API_URL;

async function storeFetch<T>(path: string): Promise<T | null> {
  if (!STORE_API_URL) return null;
  try {
    const res = await fetch(`${STORE_API_URL}${path}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data: T = await res.json();
    return data;
  } catch {
    return null;
  }
}

export async function getStoreHome(): Promise<StoreHome> {
  "use cache";
  const remote = await storeFetch<StoreHome>("/store/home");
  return remote ?? MOCK_STORE_HOME;
}

export async function getCategory(slug: string): Promise<CategoryView | null> {
  "use cache";
  const remote = await storeFetch<CategoryView>(`/store/categories/${encodeURIComponent(slug)}`);
  if (remote) return remote;

  const category = MOCK_CATEGORIES[slug];
  if (!category) return null;

  const children = category.childrenSlugs
    .map((child) => MOCK_CATEGORIES[child])
    .filter((c): c is StoreCategory => Boolean(c))
    .map((c, i) => ({ ...c, hoverBg: hoverAt(i) }));

  return {
    category,
    children,
    pathways: MOCK_PATHWAYS.map((p, i) => ({ ...p, hoverBg: hoverAt(i) })),
    // Each category surfaces its OWN themed feeds below the grid / pathways,
    // titled with the category name. Falls back to the generic leaf rails if a
    // slug has no pool yet.
    rails: MOCK_CATEGORY_RAILS[slug] ?? MOCK_LEAF_RAILS,
  };
}

// Flat list of every category slug, for prerendering the catch-all route.
// Slugs are globally unique, so single-segment paths cover the whole tree.
export async function getCategorySlugs(): Promise<string[]> {
  "use cache";
  const remote = await storeFetch<string[]>("/store/category-slugs");
  return remote ?? Object.keys(MOCK_CATEGORIES);
}

export async function getPathway(slug: string): Promise<Pathway | null> {
  "use cache";
  const remote = await storeFetch<Pathway>(`/store/pathways/${encodeURIComponent(slug)}`);
  if (remote) return remote;
  return MOCK_PATHWAYS.find((p) => p.slug === slug) ?? null;
}

// Every pathway slug, for prerendering the pathway detail route.
export async function getPathwaySlugs(): Promise<string[]> {
  "use cache";
  const remote = await storeFetch<string[]>("/store/pathway-slugs");
  return remote ?? MOCK_PATHWAYS.map((p) => p.slug);
}

// Turns a kebab-case slug into a display title, e.g. "living-room" -> "Living room".
export function prettifySlugForDisplay(slug: string): string {
  const spaced = slug.replace(/-/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

// The catch-all category route nests slugs for breadcrumbs/shareability
// (/store/furniture/home-furniture/chairs), but slugs are globally unique, so
// only the last segment is the node to render.
export function getLastSlugSegment(slug: string[]): string {
  return slug[slug.length - 1] ?? "";
}

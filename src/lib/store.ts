// Store data layer for the B2B commerce surface. Mirrors the fetch+mock
// fallback shape of `cms.ts` / `videos.ts`: if `QATOTO_STORE_API_URL` is unset
// or the upstream call fails, every getter falls back to the in-file MOCK_*
// data so the UI renders without a backend. All getters are `"use cache"`.
//
// The backend is the source of truth. The category tree, pathway item sets,
// pricing, and product feeds returned here are display data only — the Express
// API must independently re-derive and re-authorize anything trusted.

import type { CategoryView, Pathway, StoreCategory, StoreHome } from "@/types/store";
import type { OrganizationStorefrontView } from "@/lib/store/organizations.schemas";

import { StorefrontEnvelopeSchema } from "@/lib/store/organizations.schemas";
import {
  hoverAt,
  MOCK_CATEGORIES,
  MOCK_CATEGORY_RAILS,
  MOCK_LEAF_RAILS,
  MOCK_PATHWAYS,
  MOCK_STORE_HOME,
} from "@/mocks/store-mocks";
import { MOCK_ORGANIZATION_STOREFRONTS } from "@/mocks/store-organization-mocks";

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

/**
 * Same request, but the body stays `unknown` so the caller must parse it (CLAUDE.md
 * Pattern 2). `storeFetch` above annotates `await res.json()` as `T`, which is a type
 * assertion wearing a different hat — every getter added from here on uses this one and
 * a Zod schema instead.
 */
async function storeFetchUnknown(path: string): Promise<unknown> {
  if (!STORE_API_URL) return null;
  try {
    const res = await fetch(`${STORE_API_URL}${path}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return await res.json();
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

/**
 * A seller's storefront — `GET /store/organizations/:organizationSlug`.
 *
 * The response is parsed, never asserted: an unparseable body is treated exactly like a
 * failed request and falls back to the mock, because a backend that changed shape is not
 * a backend whose payload should be rendered on trust.
 *
 * The returned view carries `frontendOnlyProfile`, which is populated ONLY by the mock.
 * A real response yields `null` there and every section that reads it degrades to the
 * subset the backend genuinely has — registered capital, per-factory addresses and the
 * visit schedule/fee have no columns yet.
 */
export async function getOrganizationStorefront(
  slug: string,
): Promise<OrganizationStorefrontView | null> {
  "use cache";
  const payload = await storeFetchUnknown(`/store/organizations/${encodeURIComponent(slug)}`);
  const parsed = StorefrontEnvelopeSchema.safeParse(payload);
  if (parsed.success) {
    return { ...parsed.data.data, frontendOnlyProfile: null };
  }

  return MOCK_ORGANIZATION_STOREFRONTS[slug] ?? null;
}

/**
 * Every storefront slug, for prerendering the organization route. There is no
 * `/store/organization-slugs` route on the backend yet — the same gap as
 * `/store/category-slugs` and `/store/pathway-slugs` above — so this always falls back
 * to the mock keys. That list must stay non-empty: an empty `generateStaticParams`
 * fails the build under `cacheComponents`.
 */
export async function getOrganizationSlugs(): Promise<string[]> {
  "use cache";
  const remote = await storeFetch<string[]>("/store/organization-slugs");
  return remote ?? Object.keys(MOCK_ORGANIZATION_STOREFRONTS);
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

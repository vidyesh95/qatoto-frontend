import type { StoreSearchFilter } from "@/lib/store/catalog.schemas";

/**
 * React Query key factory for store client islands.
 * Phase 0–1 public reads are server-fetch; keys are ready for later cart/RFQ hooks.
 */
export const storeKeys = {
  all: ["store"] as const,
  home: () => [...storeKeys.all, "home"] as const,
  categories: (parentSlug?: string) =>
    [...storeKeys.all, "categories", parentSlug ?? "root"] as const,
  category: (slug: string, filter: Pick<StoreSearchFilter, "cursor" | "sort" | "limit"> = {}) =>
    [...storeKeys.all, "category", slug, filter] as const,
  search: (filter: StoreSearchFilter) => [...storeKeys.all, "search", filter] as const,
  product: (productSlug: string) => [...storeKeys.all, "product", productSlug] as const,
  organization: (organizationSlug: string, cursor?: string) =>
    [...storeKeys.all, "organization", organizationSlug, cursor ?? null] as const,
  pathway: (pathwaySlug: string) => [...storeKeys.all, "pathway", pathwaySlug] as const,
  rail: (railSlug: string, cursor?: string) =>
    [...storeKeys.all, "rail", railSlug, cursor ?? null] as const,
};

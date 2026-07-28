// TRANSPORT: server-fetch + client-query — callable from both sides via the optional
// `RequestOptions`.
//
// The three catalogue reads are PUBLIC. `getProjectLaunchReadiness` is NOT: it is
// `requireAuth` + project membership and answers `404` to everyone else, so it can
// only be called from a per-project surface where the caller is already a member.
// The cross-project `/go-to-market` page must not call it — it holds no slug and has
// no membership to prove.

import {
  buildQueryString,
  getJson,
  getPaginated,
  type ActionResponse,
  type PaginationMeta,
  type RequestOptions,
} from "@/lib/http";
import { PaginationMetaSchema } from "@/lib/rnd/shared.schemas";
import {
  LaunchReadinessSchema,
  LaunchReadyProjectSchema,
  SupplierCapabilitySchema,
  SupplierSchema,
  type LaunchReadiness,
  type LaunchReadyProject,
  type ListSuppliersFilter,
  type Supplier,
  type SupplierCapability,
} from "@/lib/rnd/suppliers.schemas";

/**
 * The public supplier / ODM directory.
 *
 * A repeated `capability` means **AND**, not OR — the backend groups and requires the
 * match count to equal the number of slugs passed. A partial match is a different
 * supplier, so combining two chips narrows rather than widens.
 */
export function listSuppliers(
  filter: ListSuppliersFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: Supplier[]; pagination: PaginationMeta }>> {
  return getPaginated(
    `/suppliers${buildQueryString({ ...filter })}`,
    SupplierSchema,
    PaginationMetaSchema,
    options,
  );
}

/**
 * One listing. An INACTIVE supplier is `404`, identical to one that never existed —
 * do not render a "withdrawn" state from a 404, because the two cases are
 * indistinguishable on purpose.
 */
export function getSupplier(
  supplierSlug: string,
  options?: RequestOptions,
): Promise<ActionResponse<Supplier>> {
  return getJson(`/suppliers/${supplierSlug}`, SupplierSchema, options);
}

/**
 * The seeded capability vocabulary behind the filter chips. Unpaginated, and there is
 * no POST — the vocabulary is seeded exactly as `discovery_skill` is.
 */
export function listSupplierCapabilities(
  options?: RequestOptions,
): Promise<ActionResponse<SupplierCapability[]>> {
  return getJson("/supplier-capabilities", SupplierCapabilitySchema.array(), options);
}

/** Active projects at `stage = go_to_market`, and what each one actually listed. */
export function listLaunchReadyProjects(
  filter: { readonly page?: number; readonly limit?: number } = {},
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: LaunchReadyProject[]; pagination: PaginationMeta }>> {
  return getPaginated(
    `/launch-ready-projects${buildQueryString({ ...filter })}`,
    LaunchReadyProjectSchema,
    PaginationMetaSchema,
    options,
  );
}

/**
 * The six derived readiness items for one project. MEMBER ONLY — a non-member gets
 * `404`, not `403`, so a stranger cannot probe which project slugs exist. Treat 404
 * as "no access or no such thing" and never render a permission hint.
 */
export function getProjectLaunchReadiness(
  projectSlug: string,
  options?: RequestOptions,
): Promise<ActionResponse<LaunchReadiness>> {
  return getJson(
    `/research-projects/${projectSlug}/launch-readiness`,
    LaunchReadinessSchema,
    options,
  );
}

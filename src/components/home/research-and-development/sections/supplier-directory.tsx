// TRANSPORT: props-only — presentational server component. Fetches nothing; suppliers,
// the capability vocabulary and the current selections arrive as props from
// go-to-market-page, which read GET /suppliers and GET /supplier-capabilities.
//
// NO LONGER A CLIENT ISLAND. Filtering moved into the query string, so the chips are
// Links and the backend does the AND-matching in SQL.
import FilterChipRow, {
  type FilterChipOption,
} from "@/components/home/research-and-development/sections/filter-chip-row";
import SupplierCard from "@/components/home/research-and-development/cards/supplier-card";
import type { PaginationMeta } from "@/lib/http";
import type { DiscoveryRegion } from "@/lib/rnd/discovery.schemas";
import {
  buildFilterHref,
  readMultiParam,
  readSingleParam,
  toggleMultiParamPatch,
  type RawSearchParams,
} from "@/lib/rnd/filter-href";
import { SUPPLIER_VERIFICATION_STATE_LABELS } from "@/lib/rnd/labels";
import {
  SUPPLIER_VERIFICATION_STATES,
  type Supplier,
  type SupplierCapability,
} from "@/lib/rnd/suppliers.schemas";

/**
 * The public supplier / ODM directory, with capability and verification filters.
 *
 * CAPABILITIES ARE MULTI-SELECT AND COMBINE AS **AND**, matching the API's repeated
 * `?capability=` parameter: asking for injection molding *and* tooling means a partner who
 * does both, not either. The backend enforces it with
 * `GROUP BY … HAVING count(distinct …) = n`, matched by SLUG equality — a display-label
 * substring match is the bug that makes "casting" match "broadcasting".
 *
 * THE REGION CHIPS ARE BACK, and off the right source. The first version built them from
 * `regionSlug` values found on the fetched page, which against a paginated feed offers
 * only the regions already visible and hides every other one. The vocabulary now comes
 * from `GET /discovery/regions` — the same read the problem map uses — and `?region=` is
 * applied by the backend in SQL. Single-select, because the backend takes one slug.
 *
 * The directory is read-only here and moderator-written on the backend: a self-serve public
 * listing would need a moderation queue, a rate limiter and an abuse story before it
 * earned its place. There is no `pending` state and no user-submission path.
 */
export default function SupplierDirectory({
  suppliers,
  capabilities,
  regions,
  pagination,
  searchParams,
}: {
  suppliers: Supplier[];
  capabilities: SupplierCapability[];
  regions: DiscoveryRegion[];
  pagination: PaginationMeta | null;
  searchParams: RawSearchParams;
}) {
  const selectedCapabilitySlugs = readMultiParam(searchParams, "capability");
  const selectedVerificationState = searchParams.verificationState;
  const selectedRegionSlug = readSingleParam(searchParams, "region");

  const capabilityChips: FilterChipOption[] = [
    {
      label: "Any capability",
      href: buildFilterHref(searchParams, { capability: undefined }),
      isSelected: selectedCapabilitySlugs.length === 0,
    },
    ...capabilities.map((capability) => ({
      label: capability.displayLabel,
      href: buildFilterHref(
        searchParams,
        toggleMultiParamPatch(searchParams, "capability", capability.slug),
      ),
      isSelected: selectedCapabilitySlugs.includes(capability.slug),
    })),
  ];

  const verificationChips: FilterChipOption[] = [
    {
      label: "Any status",
      href: buildFilterHref(searchParams, { verificationState: undefined }),
      isSelected: selectedVerificationState === undefined,
    },
    ...SUPPLIER_VERIFICATION_STATES.map((verificationState) => ({
      label: SUPPLIER_VERIFICATION_STATE_LABELS[verificationState],
      href: buildFilterHref(searchParams, { verificationState }),
      isSelected: selectedVerificationState === verificationState,
    })),
  ];

  const regionChips: FilterChipOption[] = [
    {
      label: "Any region",
      href: buildFilterHref(searchParams, { region: undefined }),
      isSelected: selectedRegionSlug === undefined,
    },
    ...regions.map((region) => ({
      label: region.displayLabel,
      href: buildFilterHref(searchParams, { region: region.slug }),
      isSelected: selectedRegionSlug === region.slug,
    })),
  ];

  return (
    <section id="supplier-directory" className="scroll-mt-20 space-y-4 px-4 lg:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium tracking-wide xl:text-lg">
          Manufacturing &amp; ODM partners
        </h2>
        {pagination !== null && (
          <p className="text-xs text-muted-foreground">
            {pagination.total} partner{pagination.total === 1 ? "" : "s"}
            {pagination.totalPages > 1 && ` · showing page ${pagination.page}`}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <FilterChipRow options={capabilityChips} ariaLabel="Filter by capability" />
        {regions.length > 0 && <FilterChipRow options={regionChips} ariaLabel="Filter by region" />}
        <FilterChipRow options={verificationChips} ariaLabel="Filter by verification status" />
        {selectedCapabilitySlugs.length > 1 && (
          <p className="text-[11px] text-muted-foreground">
            Showing partners with all {selectedCapabilitySlugs.length} selected capabilities.
          </p>
        )}
      </div>

      {suppliers.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {suppliers.map((supplier) => (
            <SupplierCard key={supplier.slug} supplier={supplier} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {selectedCapabilitySlugs.length > 1
            ? "No partner matches every selected capability — drop one and try again."
            : "No partner matches these filters yet."}
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        A verification status is assigned by Qatoto, never claimed by the partner. Directory
        listings carry no prices: a quote belongs to an engagement, in the project&apos;s own
        currency.
      </p>
    </section>
  );
}

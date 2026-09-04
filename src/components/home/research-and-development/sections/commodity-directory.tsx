// TRANSPORT: props-only — presentational server component. Fetches nothing; the chips are
// Links and the backend applies every filter in SQL.

import Link from "next/link";

import FilterChipRow, { type FilterChipOption } from "@/components/home/shared/filter-chip-row";
import { buildFilterHref, type RawSearchParams } from "@/lib/filter-href";
import type {
  ImportCommodity,
  ImportCommodityKindOption,
} from "@/lib/rnd/import-intelligence.schemas";
import { IMPORT_COMMODITY_KIND_LABELS } from "@/lib/rnd/labels";
import type { PaginationMeta } from "@/lib/http";

/**
 * The full HS6 catalogue — everything the country trades, scored or not.
 *
 * SEPARATE FROM THE LEADERBOARD ABOVE IT, deliberately. The leaderboard answers "where
 * should I look"; this answers "is my thing in here". A commodity with no assessment still
 * belongs in this list, and merging the two would either hide it or invent a rank for it.
 */
export default function CommodityDirectory({
  commodities,
  pagination,
  commodityKinds,
  searchParams,
}: {
  commodities: readonly ImportCommodity[];
  pagination: PaginationMeta | null;
  commodityKinds: readonly ImportCommodityKindOption[];
  searchParams: RawSearchParams;
}) {
  const selectedKind = searchParams["catalogueKind"];
  const selectedKindValue = typeof selectedKind === "string" ? selectedKind : undefined;

  const kindChips: FilterChipOption[] = [
    {
      label: "Everything",
      href: buildFilterHref(searchParams, { catalogueKind: undefined }),
      isSelected: selectedKindValue === undefined,
    },
    ...commodityKinds.map((option) => ({
      label: IMPORT_COMMODITY_KIND_LABELS[option.kind],
      href: buildFilterHref(searchParams, { catalogueKind: option.kind }),
      isSelected: selectedKindValue === option.kind,
    })),
  ];

  return (
    <section id="commodity-directory" className="scroll-mt-20 space-y-4 px-4 lg:px-6">
      <div className="space-y-1">
        <h2 className="font-serif text-xl">Every traded commodity</h2>
        <p className="text-sm text-muted-foreground">
          The Harmonized System catalogue, as the country actually files it. Codes and descriptions
          are the World Customs Organization&rsquo;s own.
        </p>
      </div>

      <FilterChipRow options={kindChips} ariaLabel="Filter the catalogue by kind" />

      {commodities.length === 0 ? (
        <p className="text-sm text-muted-foreground">No commodity matches these filters.</p>
      ) : (
        <>
          <ul className="divide-y divide-[#CAC4D0]/60 rounded-2xl border border-[#CAC4D0]/60">
            {commodities.map((commodity) => (
              <li key={commodity.hsCode}>
                <Link
                  href={`/research-and-development/import-intelligence/${commodity.hsCode}`}
                  className="flex items-baseline gap-3 px-4 py-3 hover:bg-muted/50"
                >
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {commodity.hsCode}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">{commodity.displayLabel}</span>
                  <span className="hidden shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs sm:inline">
                    {IMPORT_COMMODITY_KIND_LABELS[commodity.commodityKind]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {pagination === null ? null : (
            <p className="text-xs text-muted-foreground">
              {pagination.total} commodit{pagination.total === 1 ? "y" : "ies"}
              {pagination.totalPages > 1 ? ` · showing page ${pagination.page}` : ""}
            </p>
          )}
        </>
      )}
    </section>
  );
}

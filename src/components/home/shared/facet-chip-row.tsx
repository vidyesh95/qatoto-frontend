// TRANSPORT: props-only — presentational server component over `FilterChipRow`. Fetches nothing.
//
// HOISTED from `store-search-page.tsx`, which was the only surface with facet counts until the
// provider directory grew them. Nothing in it was search-specific, and a second copy would have
// been a second place for the two rules below to drift.

import FilterChipRow, { type FilterChipOption } from "@/components/home/shared/filter-chip-row";
import { buildFilterHref, readSingleParam, type RawSearchParams } from "@/lib/filter-href";

/** The wire shape every facet dimension arrives in — `{ value, count }`, from the backend. */
export interface FacetBucket {
  readonly value: string;
  readonly count: number;
}

/**
 * Reads an enum-valued facet bucket into display copy.
 *
 * WIDENS the label map rather than asserting the value into the enum. A bucket's `value` is a
 * `pgEnum` label the backend types as a plain string — a facet vocabulary is whatever the rows
 * contain — so an assertion here would be a claim about the network (Pattern 2) that breaks the
 * first time a new member is seeded. Degrading to the raw value is the same forward-compatibility
 * `.strip()` buys on the schema. Lifted from `catalog-facet-summary.tsx`, which says the same.
 */
function labelForFacetValue(
  labelsByEnumValue: Readonly<Record<string, string>>,
  facetValue: string,
): string {
  return labelsByEnumValue[facetValue] ?? facetValue;
}

/**
 * One facet dimension as a chip row.
 *
 * THE COUNT IS ON THE CHIP, and that is the whole point of a facet: "Made to order · 11" tells a
 * buyer whether the click is worth making. A chip without its count is just a filter.
 *
 * Returns null for a dimension with fewer than two buckets. One bucket is not a choice — every
 * result already has that value, so offering it narrows nothing and only adds noise.
 *
 * A ZERO-COUNT CHIP IS NEVER RENDERED, because the backend never emits one: a bucket absent is not
 * a bucket at zero. Do not pad a dimension out to its full enum here — that would reintroduce the
 * dead click the omission exists to prevent.
 */
export default function FacetChipRow({
  searchParams,
  queryKey,
  ariaLabel,
  buckets,
  labelsByEnumValue,
  formatValue,
}: {
  searchParams: RawSearchParams;
  queryKey: string;
  ariaLabel: string;
  buckets: readonly FacetBucket[];
  labelsByEnumValue?: Readonly<Record<string, string>>;
  formatValue?: (facetValue: string) => string;
}) {
  if (buckets.length < 2) return null;

  const activeValue = readSingleParam(searchParams, queryKey);

  const options: FilterChipOption[] = [
    {
      label: "Any",
      // `undefined` REMOVES the key — that is how a chip clears itself.
      href: buildFilterHref(searchParams, { [queryKey]: undefined }),
      isSelected: activeValue === undefined,
    },
    ...buckets.map((bucket) => ({
      label: `${
        formatValue?.(bucket.value) ??
        (labelsByEnumValue === undefined
          ? bucket.value
          : labelForFacetValue(labelsByEnumValue, bucket.value))
      } · ${String(bucket.count)}`,
      href: buildFilterHref(searchParams, { [queryKey]: bucket.value }),
      isSelected: activeValue === bucket.value,
    })),
  ];

  return <FilterChipRow options={options} ariaLabel={ariaLabel} />;
}

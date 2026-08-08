// TRANSPORT: props-only — renders counts it was handed, no network.
//
// THE FACETS AS A READ-ONLY SUMMARY, AND THAT IS DELIBERATE.
//
// `GET /store/categories/:slug` computes four facets — seller countries, stock states,
// sample policies and a price range — and accepts EXACTLY TWO query params: `limit` and
// `cursor`. There is no `?stockState=` on that route.
//
// So these cannot be chips. Making them chips would mean either sending a param the
// backend's `.strict()` schema rejects with a **422**, or filtering the fetched page in the
// browser — which silently lies about every page after the first and is the specific thing
// §2.4 of the backend contract forbids. A control that errors is worse than one that is
// missing, and a control that quietly narrows one page of twenty-four is worse than both.
//
// What they ARE good for is orientation: "66 listings, 41 of them from China, 11 made to
// order, $468 to $18,450" tells a buyer whether this category is worth drilling into. That
// is worth rendering, and it is honest, because a count is a count.
//
// TODO(backend): the filters exist as facets and not as query keys. Adding
// `sellerCountryCode`, `stockState`, `samplePolicy` and a price range to the category route
// makes every line below clickable. Filed alongside the search-filter gap (Appendix A25) —
// a facet the platform computes and the query cannot act on is an invitation to filter the
// fetched page.

import { formatCentsRangeLabel, formatCountLabel, countryLabelFromCode } from "@/lib/store/format";
import type { StoreCategoryFacets } from "@/lib/store/catalog.schemas";
import { SAMPLE_POLICY_LABELS, STOCK_STATE_LABELS } from "@/lib/store/organizations.schemas";

/**
 * Reads an enum-valued facet bucket into display copy.
 *
 * A facet bucket's `value` is a `pgEnum` label typed as a plain string — the backend does not
 * narrow it, because a facet vocabulary is whatever the rows contain. So the lookup WIDENS
 * the label map to `Record<string, string>` rather than asserting the value into the enum:
 * an assertion here would be a claim about the network (CLAUDE.md Pattern 2), and it would be
 * wrong the first time the backend seeds a new member. Widening degrades to the raw value
 * instead, which is the same forward-compatibility `.strip()` buys on the schema.
 */
function labelForFacetValue(
  labelsByEnumValue: Readonly<Record<string, string>>,
  facetValue: string,
): string {
  return labelsByEnumValue[facetValue] ?? facetValue;
}

export default function CatalogFacetSummary({ facets }: { facets: StoreCategoryFacets }) {
  const priceRangeLabel = formatCentsRangeLabel(
    facets.priceRangesInCents.minInCents,
    facets.priceRangesInCents.maxInCents,
    "USD",
  );

  const hasAnyFacet =
    facets.sellerCountryCodes.length > 0 ||
    facets.stockStates.length > 0 ||
    facets.samplePolicies.length > 0 ||
    priceRangeLabel !== null;

  if (!hasAnyFacet) return null;

  return (
    <section
      aria-label="What is in this category"
      className="mx-4 mt-4 rounded-xl bg-[#F2F4F4] px-4 py-3 lg:mx-6"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {priceRangeLabel !== null && (
          <FacetBlock
            title="Price range"
            lines={[
              `${priceRangeLabel} per unit`,
              `${formatCountLabel(facets.priceRangesInCents.count)} listings priced`,
            ]}
          />
        )}

        {facets.sellerCountryCodes.length > 0 && (
          <FacetBlock
            title="Seller countries"
            lines={facets.sellerCountryCodes
              .slice(0, 4)
              .map(
                (bucket) =>
                  `${countryLabelFromCode(bucket.value)} · ${formatCountLabel(bucket.count)}`,
              )}
          />
        )}

        {facets.stockStates.length > 0 && (
          <FacetBlock
            title="Availability"
            lines={facets.stockStates.map(
              (bucket) =>
                `${labelForFacetValue(STOCK_STATE_LABELS, bucket.value)} · ${formatCountLabel(
                  bucket.count,
                )}`,
            )}
          />
        )}

        {facets.samplePolicies.length > 0 && (
          <FacetBlock
            title="Samples"
            lines={facets.samplePolicies.map(
              (bucket) =>
                `${labelForFacetValue(SAMPLE_POLICY_LABELS, bucket.value)} · ${formatCountLabel(
                  bucket.count,
                )}`,
            )}
          />
        )}
      </div>
    </section>
  );
}

function FacetBlock({ title, lines }: { title: string; lines: readonly string[] }) {
  return (
    <div>
      <p className="text-[11px] leading-4 font-medium tracking-[0.5px] text-[#6F7979] uppercase">
        {title}
      </p>
      <ul className="mt-1 space-y-0.5">
        {lines.map((line) => (
          <li key={line} className="text-xs leading-4 text-[#191C1C]">
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}

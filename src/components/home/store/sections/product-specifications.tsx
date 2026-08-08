// TRANSPORT: props-only

import type { StoreProductSpecification } from "@/lib/store/catalog.schemas";

/**
 * The seller's structured specification rows.
 *
 * Replaces the mock "Product details" block, which showed a hardcoded chair's spec sheet on
 * every listing. These are `commerce_product_specification` rows, already ordered by
 * `position` by the caller.
 *
 * Renders nothing when the seller declared no specifications — an empty spec table implies
 * the product has no attributes, which is a different claim from "none were entered".
 */
export default function ProductSpecifications({
  specifications,
}: {
  specifications: readonly StoreProductSpecification[];
}) {
  if (specifications.length === 0) return null;

  return (
    <section className="space-y-3 px-4 py-4 lg:px-6">
      <h2 className="text-sm font-medium tracking-wide">Specifications</h2>
      <dl className="divide-y divide-[#E0E3E3] border-y border-[#E0E3E3]">
        {specifications.map((specification) => (
          <div key={specification.key} className="flex gap-4 py-2">
            <dt className="w-2/5 shrink-0 text-xs tracking-wide text-[#6F7979]">
              {specification.key}
            </dt>
            <dd className="text-xs tracking-wide text-[#191C1C]">{specification.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

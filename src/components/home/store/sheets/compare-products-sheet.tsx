// TRANSPORT: props-only — compares products the page already fetched, no network.
//
// "Add to Compare": tick companions to put side by side against the product being viewed.
//
// THE TABLE IS BUILT BY ALIGNING `specifications[]` ON `key`, and there is no compare endpoint
// because the backend aligns nothing. That is a layout job over data already fetched, not a
// computation pushed onto the client — no filtering, no ranking, no derived values.
//
// WHAT IS COMPARED IS WHAT EACH SELLER PUBLISHED. Two sellers describing the same attribute under
// different keys will not line up, and this shows a blank rather than guessing they meant the same
// thing. A dash means "this seller did not state it", never "it does not have it".
//
// CAPPED AT FOUR COLUMNS, the same cap Alibaba's tray uses — past that the table stops being
// readable on any phone, which is the constraint that matters here rather than query cost.
"use client";

import { useState } from "react";

import Image from "next/image";

import ModalSheet from "@/components/home/shared/modal-sheet";
import { formatScaledAttributeValue } from "@/lib/store/catalog.schemas";
import { formatCentsLabel } from "@/lib/store/format";
import type { ProductCompanionGroup, StoreProductDetail } from "@/lib/store/products.schemas";

const MAXIMUM_COMPARE_COLUMNS = 4;

/** The card shape both the viewed product and every companion can be reduced to. */
interface CompareColumn {
  readonly id: string;
  readonly title: string;
  readonly mainImageUrl: string | null;
  readonly priceInCents: number;
  readonly currency: string;
  readonly isCurrentProduct: boolean;
  /** Spec values by key. Only the viewed product has a full set; companions carry cards only. */
  readonly specificationsByKey: ReadonlyMap<string, string>;
}

/** One structured answer as a comparable string. Mirrors the spec sheet's own renderer. */
function renderComparableAttributeValue(
  attributeValue: StoreProductDetail["attributeValues"][number],
): string {
  switch (attributeValue.valueKind) {
    case "enum":
      return attributeValue.choiceLabel ?? attributeValue.choiceValue ?? "";
    case "number":
      return attributeValue.numericValueScaled === null || attributeValue.numericScale === null
        ? ""
        : formatScaledAttributeValue(
            attributeValue.numericValueScaled,
            attributeValue.numericScale,
            attributeValue.unitLabel,
          );
    case "text":
      return attributeValue.textValue ?? "";
    default: {
      const exhaustiveKind: never = attributeValue.valueKind;
      return exhaustiveKind;
    }
  }
}

export default function CompareProductsSheet({
  product,
  companionGroups,
  onClose,
}: {
  readonly product: StoreProductDetail;
  readonly companionGroups: readonly ProductCompanionGroup[];
  readonly onClose: () => void;
}) {
  // Deduplicated across groups: one product can be both a spare part and a frequent co-purchase,
  // and it must not appear twice in the tray.
  const companionsById = new Map(
    companionGroups
      .flatMap((group) => group.items)
      .map((companion) => [companion.product.id, companion.product]),
  );
  const companions = [...companionsById.values()];

  const [selectedProductIds, setSelectedProductIds] = useState<readonly string[]>([]);
  const [isComparing, setIsComparing] = useState(false);

  const toggleSelected = (productId: string) =>
    setSelectedProductIds((previous) =>
      previous.includes(productId)
        ? previous.filter((eachId) => eachId !== productId)
        : previous.length >= MAXIMUM_COMPARE_COLUMNS - 1
          ? previous
          : [...previous, productId],
    );

  const currentColumn: CompareColumn = {
    id: product.id,
    title: product.title,
    mainImageUrl: product.mainImageUrl,
    priceInCents: product.priceInCents,
    currency: product.currency,
    isCurrentProduct: true,
    /**
     * STORE §20. STRUCTURED ANSWERS FIRST, keyed on `attributeKey`.
     *
     * ⚠️ THIS IS THE ROW THE WHOLE FEATURE EXISTS FOR. Aligning two listings on a free-text
     * `key` only works when both sellers happened to type the same word — "Material" and
     * "material type" produce two rows that never line up, which is why this table has been
     * comparing almost nothing. An `attributeKey` is the same string on every listing in the
     * category by construction, so these rows align by definition rather than by luck.
     *
     * Free-text rows are still merged in underneath, keyed on their own `key`, so a listing that
     * answers something no attribute covers still shows it.
     */
    specificationsByKey: new Map([
      ...product.attributeValues.map((attributeValue): [string, string] => [
        attributeValue.label,
        renderComparableAttributeValue(attributeValue),
      ]),
      ...product.specifications.map((specification): [string, string] => [
        specification.key,
        specification.value,
      ]),
    ]),
  };

  const selectedColumns: readonly CompareColumn[] = companions
    .filter((companion) => selectedProductIds.includes(companion.id))
    .map((companion) => ({
      id: companion.id,
      title: companion.title,
      mainImageUrl: companion.mainImageUrl,
      priceInCents: companion.priceInCents,
      currency: companion.currency,
      isCurrentProduct: false,
      // A companion arrives as a CARD, which carries no specifications. The comparison therefore
      // shows the attributes this product publishes and leaves the others blank rather than
      // fetching every companion in full to fill a table the buyer may not open.
      specificationsByKey: new Map<string, string>(),
    }));

  const columns = [currentColumn, ...selectedColumns];
  const specificationKeys = [...currentColumn.specificationsByKey.keys()];

  return (
    <ModalSheet
      title={isComparing ? "Comparison" : "Add to compare"}
      onClose={onClose}
      {...(isComparing
        ? {
            leadingAction: (
              <button
                type="button"
                onClick={() => setIsComparing(false)}
                aria-label="Back to selection"
                className="cursor-pointer rounded-full p-1"
              >
                <Image
                  src="/icons/chevron_backward_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
                  width={24}
                  height={24}
                  alt=""
                />
              </button>
            ),
          }
        : {})}
      footer={
        isComparing ? undefined : (
          <div className="flex items-center gap-3">
            <p className="flex-1 text-xs text-[#6F7979]">
              {selectedProductIds.length} selected · up to {MAXIMUM_COMPARE_COLUMNS - 1}
            </p>
            <button
              type="button"
              disabled={selectedProductIds.length === 0}
              onClick={() => setIsComparing(true)}
              className="rounded-full bg-[#00696E] px-6 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              Compare
            </button>
          </div>
        )
      }
    >
      {isComparing ? (
        <div className="overflow-x-auto px-4 pb-6">
          <table className="w-max min-w-full border-collapse text-left">
            <thead>
              <tr>
                {/* The corner cell. Labelled for screen readers rather than left blank — a table
                    whose first column header is empty reads as an unlabelled row group. */}
                <th
                  scope="col"
                  className="w-28 shrink-0 pr-3 pb-2 text-xs font-medium text-[#6F7979]"
                >
                  <span className="sr-only">Attribute</span>
                </th>
                {columns.map((column) => (
                  <th key={column.id} className="w-40 pr-4 pb-2 align-top">
                    <span className="relative mb-1 block aspect-square w-28 overflow-hidden rounded bg-[#F5F5F5]">
                      {column.mainImageUrl !== null && (
                        <Image
                          src={column.mainImageUrl}
                          fill
                          sizes="112px"
                          alt={column.title}
                          className="object-cover"
                        />
                      )}
                    </span>
                    <span className="block text-xs leading-4 font-medium text-[#191C1C]">
                      {column.title}
                    </span>
                    {column.isCurrentProduct && (
                      <span className="mt-0.5 block text-[11px] text-[#00696E]">This product</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-[#CAC4D0]/60">
                <th className="py-2 pr-3 text-xs font-medium text-[#6F7979]">Price</th>
                {columns.map((column) => (
                  <td key={column.id} className="py-2 pr-4 text-xs text-[#191C1C]">
                    {formatCentsLabel(column.priceInCents, column.currency)}
                  </td>
                ))}
              </tr>
              {specificationKeys.map((specificationKey) => (
                <tr key={specificationKey} className="border-t border-[#CAC4D0]/60">
                  <th className="py-2 pr-3 text-xs font-medium text-[#6F7979]">
                    {specificationKey}
                  </th>
                  {columns.map((column) => (
                    <td key={column.id} className="py-2 pr-4 text-xs text-[#191C1C]">
                      {/* Blank means "this seller did not publish it", never "it lacks it". */}
                      {column.specificationsByKey.get(specificationKey) ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <p className="pt-3 text-[11px] leading-4 text-[#6F7979]">
            Attributes are each seller&apos;s own published specifications. A dash means the seller
            did not state that attribute — not that the product lacks it.
          </p>
        </div>
      ) : (
        <ul className="px-4 pb-6">
          {companions.map((companion) => {
            const isSelected = selectedProductIds.includes(companion.id);
            const isAtCap = !isSelected && selectedProductIds.length >= MAXIMUM_COMPARE_COLUMNS - 1;
            return (
              <li
                key={companion.id}
                className="flex items-center gap-3 border-b border-[#CAC4D0]/60 py-3"
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={isAtCap}
                  onChange={() => toggleSelected(companion.id)}
                  aria-label={`Compare ${companion.title}`}
                  className="size-4 shrink-0 accent-[#00696E]"
                />
                <span
                  aria-hidden
                  className="relative size-12 shrink-0 overflow-hidden rounded bg-[#F5F5F5]"
                >
                  {companion.mainImageUrl !== null && (
                    <Image
                      src={companion.mainImageUrl}
                      fill
                      sizes="48px"
                      alt=""
                      className="object-cover"
                    />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-[#191C1C]">{companion.title}</span>
                  <span className="block text-xs text-[#6F7979]">
                    {formatCentsLabel(companion.priceInCents, companion.currency)}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </ModalSheet>
  );
}

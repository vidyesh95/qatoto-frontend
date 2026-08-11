// TRANSPORT: props-only — renders server-owned values, no network.
//
// "Packaging and delivery". Collapsed by default (secondary info): the packaging spec rows, then a
// nested "Lead time" collapsible whose bands ARE the pricing tiers.
//
// EVERY NUMBER HERE IS AN INTEGER IN A NAMED UNIT ON THE WIRE — millimetres and grams — and the
// conversion to cm/kg happens at render. That is the point of the wire shape: a formatted string
// cannot be compared, converted or summed, so the backend never sends one.
//
// A NULL DIMENSION IS AN ABSENCE, NOT A ZERO. A seller who never declared package geometry produces
// nulls, and this renders the rows it has rather than "0 × 0 × 0 cm". The same nulls are what make
// `hasIncompletePackageData` true on a delivery estimate.
//
// THE LEAD-TIME BANDS COME FROM `pricingTiers[].leadTimeDays`, not a parallel array. A tier's own
// lead time is the promise attached to that quantity; `null` means the band declared none and the
// product's range applies, so it says so rather than inventing a number.

import Image from "next/image";

import { formatLeadTimeRangeLabel } from "@/lib/store/format";
import type { ProductPackaging, ProductPricingTier } from "@/lib/store/products.schemas";

/** Millimetres to centimetres, at one decimal, dropping a trailing `.0`. */
function millimetresToCentimetresLabel(millimetres: number): string {
  const centimetres = millimetres / 10;
  return Number.isInteger(centimetres) ? String(centimetres) : centimetres.toFixed(1);
}

function packageSizeLabel(packaging: ProductPackaging): string | null {
  const { packageLengthMm, packageWidthMm, packageHeightMm } = packaging;
  if (packageLengthMm === null || packageWidthMm === null || packageHeightMm === null) return null;
  return `${millimetresToCentimetresLabel(packageLengthMm)} × ${millimetresToCentimetresLabel(packageWidthMm)} × ${millimetresToCentimetresLabel(packageHeightMm)} cm`;
}

function grossWeightLabel(packageGrossWeightGrams: number | null): string | null {
  if (packageGrossWeightGrams === null) return null;
  const kilograms = packageGrossWeightGrams / 1000;
  return `${Number.isInteger(kilograms) ? kilograms : kilograms.toFixed(2)} kg`;
}

export default function PackagingAndDelivery({
  packaging,
  pricingTiers,
  leadTimeMinDays,
  leadTimeMaxDays,
}: {
  readonly packaging: ProductPackaging;
  readonly pricingTiers: readonly ProductPricingTier[];
  readonly leadTimeMinDays: number | null;
  readonly leadTimeMaxDays: number | null;
}) {
  const packagingRows = [
    packaging.unitsPerPackage === null
      ? null
      : { label: "Selling units", value: `${packaging.unitsPerPackage} per package` },
    (() => {
      const sizeLabel = packageSizeLabel(packaging);
      return sizeLabel === null ? null : { label: "Single package size", value: sizeLabel };
    })(),
    (() => {
      const weightLabel = grossWeightLabel(packaging.packageGrossWeightGrams);
      return weightLabel === null ? null : { label: "Single gross weight", value: weightLabel };
    })(),
  ].filter((row) => row !== null);

  const productLeadTimeLabel = formatLeadTimeRangeLabel(leadTimeMinDays, leadTimeMaxDays);
  const tiersWithLeadTime = pricingTiers.filter((tier) => tier.leadTimeDays !== null);

  // Nothing declared at all — the block would be an empty accordion.
  if (
    packagingRows.length === 0 &&
    productLeadTimeLabel === null &&
    tiersWithLeadTime.length === 0
  ) {
    return null;
  }

  return (
    <details className="group [&_summary]:list-none">
      <summary className="flex cursor-pointer items-center justify-between px-4 py-3 lg:px-6">
        <span className="text-sm leading-5 tracking-wide text-[#191C1C]">
          Packaging and delivery
        </span>
        <Image
          src="/icons/keyboard_arrow_down_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
          width={22}
          height={22}
          alt=""
          className="transition-transform group-open:rotate-180"
        />
      </summary>

      {packagingRows.length > 0 && (
        <dl className="px-4 pb-2 lg:px-6">
          {packagingRows.map((row) => (
            <div key={row.label} className="flex gap-2 border-b border-[#CAC4D0]/60 py-2">
              <dt className="w-2/5 text-sm font-medium text-[#6F7979]">{row.label}</dt>
              <dd className="flex-1 text-sm text-[#191C1C]">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {(productLeadTimeLabel !== null || tiersWithLeadTime.length > 0) && (
        <details className="group/lead-time px-4 pb-2 lg:px-6 [&_summary]:list-none">
          <summary className="flex cursor-pointer items-center justify-between py-2">
            <span className="text-sm leading-5 tracking-wide text-[#191C1C]">Lead time</span>
            <Image
              src="/icons/keyboard_arrow_down_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              width={20}
              height={20}
              alt=""
              className="transition-transform group-open/lead-time:rotate-180"
            />
          </summary>

          {/* Production time only. It is NOT a delivery date and never becomes one by adding
              shipping to it — see §19 for what an arrival window would take. */}
          {productLeadTimeLabel !== null && (
            <p className="py-2 text-xs leading-4 text-[#6F7979]">
              {productLeadTimeLabel} after the order is confirmed. Shipping time is separate.
            </p>
          )}

          {tiersWithLeadTime.length > 0 && (
            <dl>
              {tiersWithLeadTime.map((tier) => (
                <div
                  key={tier.minimumOrderQuantity}
                  className="flex gap-2 border-b border-[#CAC4D0]/60 py-2"
                >
                  <dt className="w-2/5 text-sm font-medium text-[#6F7979]">
                    {tier.minimumOrderQuantity}+ units
                  </dt>
                  <dd className="flex-1 text-sm text-[#191C1C]">{tier.leadTimeDays} days</dd>
                </div>
              ))}
            </dl>
          )}
        </details>
      )}
    </details>
  );
}

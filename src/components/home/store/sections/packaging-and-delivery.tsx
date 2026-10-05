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
//
// THE SHIPPING-TERMS ROW IS THE SELLER'S DECLARATION, NOT A CONTRACT. `defaultIncoterm` is what the
// seller says they normally sell on; nothing on the platform enforces it, and the quote or order
// states the term that binds. `null` renders no row — never a guessed EXW.

import Image from "next/image";

import { formatLeadTimeRangeLabel } from "@/lib/store/format";
import type { ProductPackaging, ProductPricingTier } from "@/lib/store/products.schemas";
import {
  formatIncotermLabel,
  INCOTERM_MAIN_CARRIAGE_ARRANGED_BY,
  QUOTE_INCOTERMS,
  type QuoteIncoterm,
} from "@/lib/store/quotes.schemas";

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

function findKnownIncoterm(incoterm: string): QuoteIncoterm | undefined {
  return QUOTE_INCOTERMS.find((knownIncoterm) => knownIncoterm === incoterm);
}

/** One line on who books the main carriage, or `null` for a code this client does not know. */
function describeMainCarriage(incoterm: string): string | null {
  const knownIncoterm = findKnownIncoterm(incoterm);
  if (knownIncoterm === undefined) return null;
  return INCOTERM_MAIN_CARRIAGE_ARRANGED_BY[knownIncoterm] === "buyer"
    ? "You arrange the main carriage."
    : "The seller arranges the main carriage.";
}

export default function PackagingAndDelivery({
  packaging,
  pricingTiers,
  leadTimeMinDays,
  leadTimeMaxDays,
  defaultIncoterm,
}: {
  readonly packaging: ProductPackaging;
  readonly pricingTiers: readonly ProductPricingTier[];
  readonly leadTimeMinDays: number | null;
  readonly leadTimeMaxDays: number | null;
  readonly defaultIncoterm: string | null;
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

  const incotermLabel = formatIncotermLabel(defaultIncoterm);
  const mainCarriageLine = defaultIncoterm === null ? null : describeMainCarriage(defaultIncoterm);

  // Nothing declared at all — the block would be an empty accordion.
  if (
    packagingRows.length === 0 &&
    productLeadTimeLabel === null &&
    tiersWithLeadTime.length === 0 &&
    incotermLabel === null
  ) {
    return null;
  }

  return (
    <details className="group [&_summary]:list-none">
      <summary className="flex cursor-pointer items-center justify-between px-4 py-3 lg:px-6">
        <span className="text-sm leading-5 tracking-wide text-foreground">
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
            <div key={row.label} className="flex gap-2 border-b border-outline-variant/60 py-2">
              <dt className="w-2/5 text-sm font-medium text-outline-strong">{row.label}</dt>
              <dd className="flex-1 text-sm text-foreground">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {incotermLabel !== null && (
        <dl className="px-4 pb-2 lg:px-6">
          <div className="flex gap-2 border-b border-outline-variant/60 py-2">
            <dt className="w-2/5 text-sm font-medium text-outline-strong">Shipping terms</dt>
            <dd className="flex-1 space-y-1">
              <p className="text-sm text-foreground">{incotermLabel}</p>
              <p className="text-xs leading-4 text-outline-strong">
                {mainCarriageLine === null ? "" : `${mainCarriageLine} `}
                Stated by the seller as their usual Incoterms® 2020 term. The term on your quote or
                order is the one that applies.
              </p>
            </dd>
          </div>
        </dl>
      )}

      {(productLeadTimeLabel !== null || tiersWithLeadTime.length > 0) && (
        <details className="group/lead-time px-4 pb-2 lg:px-6 [&_summary]:list-none">
          <summary className="flex cursor-pointer items-center justify-between py-2">
            <span className="text-sm leading-5 tracking-wide text-foreground">Lead time</span>
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
            <p className="py-2 text-xs leading-4 text-outline-strong">
              {productLeadTimeLabel} after the order is confirmed. Shipping time is separate.
            </p>
          )}

          {tiersWithLeadTime.length > 0 && (
            <dl>
              {tiersWithLeadTime.map((tier) => (
                <div
                  key={tier.minimumOrderQuantity}
                  className="flex gap-2 border-b border-outline-variant/60 py-2"
                >
                  <dt className="w-2/5 text-sm font-medium text-outline-strong">
                    {tier.minimumOrderQuantity}+ units
                  </dt>
                  <dd className="flex-1 text-sm text-foreground">{tier.leadTimeDays} days</dd>
                </div>
              ))}
            </dl>
          )}
        </details>
      )}
    </details>
  );
}

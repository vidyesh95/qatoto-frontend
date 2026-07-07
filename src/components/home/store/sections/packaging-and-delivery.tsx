import Image from "next/image";

// "Packaging and delivery" block on the product page. Collapsed by default
// (secondary info) with the packaging spec rows and a nested "Lead time"
// collapsible whose ranges mirror the pricing tiers. UI-only mock — real
// packaging and lead-time data come from the backend later.

const PACKAGING_ROWS = [
  { label: "Selling units", value: "Single item" },
  { label: "Single package size", value: "52 × 46 × 12 cm" },
  { label: "Single gross weight", value: "4.8 kg" },
];

const LEAD_TIMES = [
  { quantityRange: "1 – 49 sets", leadTime: "15 days" },
  { quantityRange: "50 – 499 sets", leadTime: "30 days" },
  { quantityRange: ">= 500 sets", leadTime: "To be negotiated" },
];

export default function PackagingAndDelivery() {
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

      <dl className="px-4 pb-2 lg:px-6">
        {PACKAGING_ROWS.map((row) => (
          <div key={row.label} className="flex gap-2 border-b border-[#CAC4D0]/60 py-2">
            <dt className="w-2/5 text-sm font-medium text-[#6F7979]">{row.label}</dt>
            <dd className="flex-1 text-sm text-[#191C1C]">{row.value}</dd>
          </div>
        ))}
      </dl>

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
        <dl>
          {LEAD_TIMES.map((row) => (
            <div key={row.quantityRange} className="flex gap-2 border-b border-[#CAC4D0]/60 py-2">
              <dt className="w-2/5 text-sm font-medium text-[#6F7979]">{row.quantityRange}</dt>
              <dd className="flex-1 text-sm text-[#191C1C]">{row.leadTime}</dd>
            </div>
          ))}
        </dl>
      </details>
    </details>
  );
}

// TRANSPORT: props-only — the fastener table. Arrives from the teardown detail page.

import { TEARDOWN_FASTENER_DRIVE_LABELS, type TeardownFastener } from "@/lib/blueprints/schemas";
import { formatCountLabel } from "@/lib/store/format";

const HEADER_CELL_CLASS = "px-3 py-2 font-medium";
const BODY_CELL_CLASS = "px-3 py-2";

/**
 * RENDERS NOTHING FOR AN EMPTY LIST. Most teardowns never itemise their fasteners, so an empty
 * "Fasteners" heading would be the common case rather than the exception.
 *
 * The table scrolls inside its own container rather than wrapping: five columns of designations
 * and part numbers do not reflow into a phone width legibly, and a horizontal scroll keeps the
 * rows readable instead of stacking them into an unreadable ladder.
 */
export default function FastenerBillOfMaterials({
  fasteners,
}: {
  readonly fasteners: readonly TeardownFastener[];
}) {
  if (fasteners.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-sm font-medium text-foreground">Fasteners</h2>
      <p className="mt-0.5 text-[11px] text-[#6F7979]">
        {formatCountLabel(fasteners.length)} line items
      </p>

      <div className="mt-2 max-w-2xl overflow-x-auto rounded-xl border border-[#CAC4D0]/60">
        <table className="w-full min-w-xl text-sm">
          <thead className="border-b border-[#CAC4D0]/60 text-left text-xs text-[#6F7979]">
            <tr>
              <th scope="col" className={HEADER_CELL_CLASS}>
                Standard
              </th>
              <th scope="col" className={HEADER_CELL_CLASS}>
                Size
              </th>
              <th scope="col" className={HEADER_CELL_CLASS}>
                Drive
              </th>
              <th scope="col" className={`${HEADER_CELL_CLASS} text-right`}>
                Qty
              </th>
              <th scope="col" className={HEADER_CELL_CLASS}>
                Supplier
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#CAC4D0]/60">
            {fasteners.map((fastener) => (
              <tr
                key={`${fastener.standardCode ?? "none"}-${fastener.sizeLabel}-${fastener.drive}`}
              >
                {/*
                  "Proprietary" IS THE VALUE, NOT A PLACEHOLDER. A null standard code means a
                  moulded snap or an adhesive strip — a part with no ISO number to quote, which is
                  a fact about the fastener rather than a gap in the data.
                */}
                <td className={`${BODY_CELL_CLASS} text-foreground`}>
                  {fastener.standardCode ?? <span className="text-[#6F7979]">Proprietary</span>}
                </td>
                <td className={`${BODY_CELL_CLASS} text-foreground`}>{fastener.sizeLabel}</td>
                <td className={`${BODY_CELL_CLASS} text-foreground`}>
                  {TEARDOWN_FASTENER_DRIVE_LABELS[fastener.drive]}
                </td>
                <td className={`${BODY_CELL_CLASS} text-right text-foreground tabular-nums`}>
                  {fastener.quantity}
                </td>
                <td className={BODY_CELL_CLASS}>
                  {fastener.supplier === null ? null : (
                    <a
                      href={fastener.supplier.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-foreground underline hover:text-[#00696E]"
                    >
                      {fastener.supplier.label}
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

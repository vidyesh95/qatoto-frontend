// TRANSPORT: props-only — the author's parts list. Arrives from the teardown detail page.

import type { TeardownListedPart } from "@/lib/blueprints/schemas";
import { formatCountLabel } from "@/lib/store/format";

const HEADER_CELL_CLASS = "px-3 py-2 font-medium";
const BODY_CELL_CLASS = "px-3 py-2";

/**
 * WHAT CAME OUT WHEN SOMEBODY OPENED THE UNIT, as a list.
 *
 * ⚠️ THIS IS THE PAGE KEEPING A PROMISE THE WIZARD MAKES. Its parts step tells an author there is
 * nowhere to upload a model yet, and that listing the parts here means "your teardown reads as a
 * list rather than a model". Without this section that sentence is false and the work is stored
 * where only a moderator can see it.
 *
 * ⚠️ IT IS NOT THE EXPLODED VIEW AND MUST NOT GROW INTO ONE. `TeardownExplorer` renders
 * `assembly.parts`, which carry geometry, a node name and a `.glb` each; these carry a label and a
 * material. A teardown may one day have both — twelve parts listed, nine of them modelled — so this
 * renders whenever the list is non-empty rather than only when there is no model.
 *
 * It is also not the bill of materials (`FastenerBillOfMaterials`) and not the composition
 * (`TeardownMaterialComposition`): both of those are claims about specific hardware, and this is
 * the contents page.
 *
 * RENDERS NOTHING FOR AN EMPTY LIST, like every sibling section — and an empty list is the common
 * case, because every teardown published before authoring existed has one.
 */
export default function TeardownPartsList({
  partsList,
}: {
  readonly partsList: readonly TeardownListedPart[];
}) {
  if (partsList.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-sm font-medium text-foreground">Parts</h2>
      <p className="mt-0.5 text-[11px] text-[#6F7979]">
        {formatCountLabel(partsList.length)} listed by the publisher, in the order they came out
      </p>

      <div className="mt-2 max-w-2xl overflow-hidden rounded-xl border border-[#CAC4D0]/60">
        <table className="w-full text-sm">
          <thead className="border-b border-[#CAC4D0]/60 text-left text-xs text-[#6F7979]">
            <tr>
              <th scope="col" className={HEADER_CELL_CLASS}>
                Part
              </th>
              <th scope="col" className={HEADER_CELL_CLASS}>
                Material
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#CAC4D0]/60">
            {partsList.map((listedPart, partIndex) => (
              /*
               * ⚠️ KEYED BY POSITION, DELIBERATELY. These rows carry no id — the wire has none —
               * and two parts of one unit legitimately share a label and a material ("Housing bolt,
               * M4" four times over). A composite key would collide on exactly the rows a reader
               * most expects to see repeated, and the list is never reordered in place.
               */
              <tr key={partIndex}>
                <td className={`${BODY_CELL_CLASS} text-foreground`}>{listedPart.label}</td>
                <td className={`${BODY_CELL_CLASS} text-[#6F7979]`}>{listedPart.material}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

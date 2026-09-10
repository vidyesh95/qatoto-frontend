// TRANSPORT: props-only — the material records arrive on the teardown.

import {
  TEARDOWN_COMPOSITION_ANALYSIS_METHOD_IS_MEASURED,
  TEARDOWN_COMPOSITION_ANALYSIS_METHOD_LABELS,
  TEARDOWN_DESIGNATION_SOURCE_IS_MEASURED,
  TEARDOWN_DESIGNATION_SOURCE_LABELS,
  TEARDOWN_MATERIAL_CLASS_LABELS,
  TEARDOWN_MANUFACTURING_METHOD_LABELS,
  hasSyntheticCompositionRow,
  type TeardownCompositionElement,
  type TeardownMaterial,
} from "@/lib/blueprints/schemas";

/**
 * WHAT THE THING IS MADE OF — the layer that turns a teardown from a picture into something a
 * factory can quote.
 *
 * ⚠️ THE SOURCE TRAVELS WITH THE DESIGNATION EVERYWHERE, and no renderer may drop it to save a
 * line. "6063-T5" read off a supplier's invoice and "6063-T5" concluded from an OES burn are the
 * same eleven characters and completely different claims — one is hearsay about a part, the other
 * is a measurement of it — and a founder committing tooling money is taking a different risk under
 * each. This is why `TEARDOWN_DESIGNATION_SOURCE_IS_MEASURED` exists as a `Record` rather than as a
 * comparison at the call site: a new source value has to declare which of the two it is.
 *
 * ⚠️ ELEMENT PERCENTAGES ARE NEVER REQUIRED AND AN EMPTY TABLE IS NOT A GAP. Most publishers can
 * identify a housing and a board and own no analyser, so `elements: []` is the ORDINARY state and
 * it renders as a row with no disclosure control — not as an empty table, not as "no data", and
 * not as a row that looks unfinished beside its neighbours.
 *
 * ⚠️ A ROW THAT WAS NOT MEASURED SAYS SO IN THE TABLE ITSELF. `declared_not_measured` and
 * `synthetic_example` are analysis methods on the wire precisely so this component cannot render a
 * datasheet figure as a scan. Every fixture number on this surface is `synthetic_example`, which is
 * what the banner beneath a table is for: a grid of element symbols and weight percents is the most
 * measurement-shaped thing on the page, and the shape alone is persuasive enough to need contradicting.
 *
 * NATIVE `<details>`, NOT A MODAL AND NOT CLIENT STATE. The case-study index already uses the
 * element for exactly this — a row that expands into its own evidence — so a reader who has been
 * there meets the same affordance, the section ships no JavaScript, and `docs/Design.md` §6's
 * "don't reach for a modal first" is satisfied by not having reached.
 */
function formatWeightPercentLabel(element: TeardownCompositionElement): string | null {
  if (element.weightPercentRange === null) return null;

  const { minimumPercent, maximumPercent } = element.weightPercentRange;
  // A single-valued range prints as one number. "12–12 %" is a range nobody wrote.
  return minimumPercent === maximumPercent
    ? `${minimumPercent} %`
    : `${minimumPercent}–${maximumPercent} %`;
}

function CompositionElementTable({
  elements,
  isOpenByDefault,
}: {
  readonly elements: readonly TeardownCompositionElement[];
  readonly isOpenByDefault: boolean;
}) {
  const hasSyntheticRow = elements.some(
    (element) => element.analysisMethod === "synthetic_example",
  );

  return (
    <details className="mt-2" open={isOpenByDefault}>
      <summary className="w-fit cursor-pointer list-none text-xs font-medium text-[#00696E] transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E]">
        Composition, {elements.length} {elements.length === 1 ? "element" : "elements"}
      </summary>

      {/*
        THE TABLE IS THE ONE THING ON THIS PAGE ALLOWED ITS OWN HORIZONTAL SCROLL. Four columns of
        exact values do not compress to 360 px without either wrapping a percent away from its
        element or truncating an instrument name, and both of those corrupt the value rather than
        just crowding it.
      */}
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[30rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-border">
              <th className="py-1.5 pr-4 text-[11px] font-medium tracking-[0.5px] text-muted-foreground uppercase">
                Element
              </th>
              <th className="py-1.5 pr-4 text-[11px] font-medium tracking-[0.5px] text-muted-foreground uppercase">
                Weight percent
              </th>
              <th className="py-1.5 pr-4 text-[11px] font-medium tracking-[0.5px] text-muted-foreground uppercase">
                Method
              </th>
              <th className="py-1.5 text-[11px] font-medium tracking-[0.5px] text-muted-foreground uppercase">
                Instrument
              </th>
            </tr>
          </thead>
          <tbody>
            {elements.map((element) => {
              const weightPercentLabel = formatWeightPercentLabel(element);

              return (
                <tr key={element.symbol} className="border-b border-black/5 align-top">
                  <td className="py-1.5 pr-4 text-sm text-foreground">{element.symbol}</td>
                  <td className="py-1.5 pr-4 text-sm text-foreground tabular-nums">
                    {/*
                      IDENTIFIED BUT NOT QUANTIFIED IS NOT ZERO, and it is not a dash either. The
                      words are shorter than the explanation and they are the only honest cell
                      contents: a trace element found by XRF and an element measured at 0 % are
                      opposite findings.
                    */}
                    {weightPercentLabel ?? (
                      <span className="text-muted-foreground">Not quantified</span>
                    )}
                  </td>
                  <td className="py-1.5 pr-4 text-sm text-foreground">
                    {TEARDOWN_COMPOSITION_ANALYSIS_METHOD_LABELS[element.analysisMethod]}
                    {element.operatorNote === null ? null : (
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {element.operatorNote}
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 text-sm text-muted-foreground">
                    {/*
                      The contract refuses an instrument on an unmeasured row, so an absent one here
                      always means the same thing and never needs a placeholder.
                    */}
                    {element.instrumentLabel ??
                      (TEARDOWN_COMPOSITION_ANALYSIS_METHOD_IS_MEASURED[element.analysisMethod]
                        ? ""
                        : "Not an instrument reading")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {hasSyntheticRow ? (
        <p className="mt-2 max-w-prose text-xs text-destructive">
          Some figures in this table are synthetic examples. They were invented to show the shape of
          a composition record and they are not a measurement of any unit.
        </p>
      ) : null}
    </details>
  );
}

function MaterialRow({
  material,
  isOpenByDefault,
}: {
  readonly material: TeardownMaterial;
  readonly isOpenByDefault: boolean;
}) {
  const isDesignationMeasured = TEARDOWN_DESIGNATION_SOURCE_IS_MEASURED[material.designationSource];

  // Process and finish are nullable inside a required set. Each absence renders nothing rather
  // than a labelled blank; a publisher who read an alloy off a marking usually knows neither.
  const secondaryFacts = [
    material.process === null ? undefined : TEARDOWN_MANUFACTURING_METHOD_LABELS[material.process],
    material.finish ?? undefined,
  ].filter((fact) => fact !== undefined);

  return (
    <li className="border-t border-border py-3">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <p className="text-sm font-medium text-foreground">{material.designation}</p>
        <p className="text-xs text-muted-foreground">
          {material.appliesToLabel} &middot;{" "}
          {TEARDOWN_MATERIAL_CLASS_LABELS[material.materialClass]}
        </p>
      </div>

      {/*
        THE SOURCE LINE, AND IT IS THE POINT OF THE ROW. A measured designation and a declared one
        wear the same eleven characters above; this is the only place they differ, so it renders on
        every row without exception and never behind a disclosure.
      */}
      <p className="mt-1 text-xs text-muted-foreground">
        {TEARDOWN_DESIGNATION_SOURCE_LABELS[material.designationSource]}
        {isDesignationMeasured ? null : (
          <span className="text-destructive"> &middot; declared, not measured</span>
        )}
      </p>

      {secondaryFacts.length === 0 ? null : (
        <p className="mt-1 text-xs text-muted-foreground">{secondaryFacts.join(" · ")}</p>
      )}

      {material.elements.length === 0 ? null : (
        <CompositionElementTable elements={material.elements} isOpenByDefault={isOpenByDefault} />
      )}
    </li>
  );
}

export default function TeardownMaterialComposition({
  materials,
  isOpenByDefault,
}: {
  readonly materials: readonly TeardownMaterial[];
  /** The density switch: `engineering` and `factory` open every table, `business` opens none. */
  readonly isOpenByDefault: boolean;
}) {
  // NO MATERIALS, NO SECTION. Not "no composition recorded", not an empty table — most teardowns
  // hold none and an empty state here would read as a defect in every one of them.
  if (materials.length === 0) return null;

  const hasAnySyntheticRow = materials.some(hasSyntheticCompositionRow);

  return (
    <section className="mt-8 max-w-2xl" aria-labelledby="teardown-composition">
      <h2 id="teardown-composition" className="text-sm font-medium text-foreground">
        Materials and composition
      </h2>
      <p className="mt-1 max-w-prose text-xs text-muted-foreground">
        Every designation below carries how the publisher arrived at it. A material named from a
        datasheet or a supplier is not the same claim as one measured off this unit.
      </p>

      <ul className="mt-3">
        {materials.map((material) => (
          <MaterialRow key={material.id} material={material} isOpenByDefault={isOpenByDefault} />
        ))}
      </ul>

      {hasAnySyntheticRow ? (
        <p className="mt-3 max-w-prose text-xs text-destructive">
          This teardown is a fixture. Its element figures are synthetic examples, not lab output.
        </p>
      ) : null}
    </section>
  );
}

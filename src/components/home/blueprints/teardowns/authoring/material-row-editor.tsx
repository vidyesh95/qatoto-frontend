// TRANSPORT: props-only — fully controlled by the step above it. No network, no internal draft.
"use client";

import { useState } from "react";

import CreatableCombobox, { appendOptionNameIfNew } from "@/components/ui/creatable-combobox";
import {
  LabeledEnumSelect,
  LabeledTextInput,
  RepeatableRowShell,
  RepeatableRowsShell,
} from "@/components/home/blueprints/teardowns/authoring/wizard-fields";
import type { MaterialDraftRow } from "@/components/home/blueprints/teardowns/authoring/wizard-shared";
import {
  TEARDOWN_DESIGNATION_SOURCE_IS_MEASURED,
  TEARDOWN_DESIGNATION_SOURCE_LABELS,
  TEARDOWN_DESIGNATION_SOURCES,
  TEARDOWN_DESIGNATION_SUGGESTIONS,
  TEARDOWN_MANUFACTURING_METHOD_LABELS,
  TEARDOWN_MANUFACTURING_METHODS,
  TEARDOWN_MATERIAL_CLASS_LABELS,
  TEARDOWN_MATERIAL_CLASSES,
} from "@/lib/blueprints/schemas";

export function newMaterialDraftRow(): MaterialDraftRow {
  return {
    rowId: crypto.randomUUID(),
    appliesToLabel: "",
    designation: "",
    // ⚠️ THE DEFAULT IS THE WEAKEST CLAIM, NOT THE STRONGEST. A row that starts on "Measured by
    // spectroscopy" is a row somebody submits with that source because they never looked at the
    // field, which would be the surface asserting a measurement nobody made.
    designationSource: "contributor_freetext",
    materialClass: "other",
    process: "",
    finish: "",
  };
}

/**
 * THE COMPOSITION EDITOR.
 *
 * ⚠️ THE DESIGNATION IS A COMBOBOX WITH A FREE-TEXT ESCAPE, AND THE ESCAPE IS THE POINT. A closed
 * list would refuse the first unusual polymer somebody actually measured, which is the material
 * most worth recording — the same argument `cofounders.schemas.ts` makes for `sector`: "the long
 * tail here is the whole point." The suggestions exist so that two publishers naming the same alloy
 * do not produce two entries nobody can group, not to bound what may be said.
 *
 * IDENTITY IS THE NAME, so this follows `idea-basics-step.tsx`'s category wiring exactly:
 * `onOptionSelect` and `onCreateRequest` both commit the same string, and `appendOptionNameIfNew`
 * adds a typed value to the session's option list. There is no server row behind a designation and
 * `appendOptionNameIfNew`'s own doc warns that owners who DO have one must not use it.
 *
 * ⚠️ THERE IS NO ELEMENT-TABLE EDITOR HERE, AND THERE MUST NOT BE ONE YET. An element table is a lab
 * result. A text field that accepts "Al: 97.5–99.35 %" invites somebody to type a figure they read
 * on a datasheet, or remembered, or guessed — and the composition section on the read page renders
 * those figures in a table that looks exactly like a measurement. `designationSource` exists to stop
 * declared data reading as measured data; a free-text percent field would hand that failure straight
 * back. Element rows arrive with a file from an analyser, not with a keyboard (`todo.md`).
 */
export default function MaterialRowEditor({
  materialRows,
  onMaterialRowsChange,
}: {
  readonly materialRows: readonly MaterialDraftRow[];
  readonly onMaterialRowsChange: (nextRows: readonly MaterialDraftRow[]) => void;
}) {
  /**
   * The suggestion list plus anything typed this session.
   *
   * Session-scoped on purpose: a designation somebody invents for one row should be offered on the
   * next row of the same submission, and forgotten afterwards. Persisting it would be minting a
   * taxonomy out of one person's typing.
   */
  const [designationOptionNames, setDesignationOptionNames] = useState<string[]>(() => [
    ...TEARDOWN_DESIGNATION_SUGGESTIONS,
  ]);

  function updateMaterialRow(rowId: string, patch: Partial<MaterialDraftRow>): void {
    onMaterialRowsChange(
      materialRows.map((row) => (row.rowId === rowId ? { ...row, ...patch } : row)),
    );
  }

  function commitDesignation(rowId: string, committedDesignation: string): void {
    setDesignationOptionNames((previousNames) =>
      appendOptionNameIfNew(previousNames, committedDesignation),
    );
    updateMaterialRow(rowId, { designation: committedDesignation });
  }

  return (
    <RepeatableRowsShell
      heading="Materials"
      description="One row per material you can name. Most publishers can name two or three, and that is a useful teardown — a row you are unsure of is worse than no row."
      emptyMessage="No materials recorded. The page will show no materials section at all, which is the ordinary state of a teardown."
      addLabel="Add a material"
      rowCount={materialRows.length}
      onAddRow={() => onMaterialRowsChange([...materialRows, newMaterialDraftRow()])}
    >
      {materialRows.map((row, rowIndex) => {
        const isMeasured = TEARDOWN_DESIGNATION_SOURCE_IS_MEASURED[row.designationSource];

        return (
          <RepeatableRowShell
            key={row.rowId}
            rowLabel={`Material ${rowIndex + 1}`}
            onRemoveRow={() =>
              onMaterialRowsChange(
                materialRows.filter((materialRow) => materialRow.rowId !== row.rowId),
              )
            }
          >
            <LabeledTextInput
              label="What it is the material of"
              value={row.appliesToLabel}
              onValueChange={(appliesToLabel) => updateMaterialRow(row.rowId, { appliesToLabel })}
              placeholder="Heatsink extrusion"
            />

            <div>
              <CreatableCombobox
                labelText="Designation"
                placeholderText="6063-T5"
                selectedOptionId={row.designation}
                options={designationOptionNames.map((optionName) => ({
                  optionId: optionName,
                  optionName,
                }))}
                onOptionSelect={(selectedDesignation) =>
                  commitDesignation(row.rowId, selectedDesignation)
                }
                onCreateRequest={(typedDesignation) =>
                  commitDesignation(row.rowId, typedDesignation)
                }
                helpText="Type anything. The list is a shortcut, not a limit."
              />
            </div>

            <LabeledEnumSelect
              label="How you know"
              value={row.designationSource}
              options={TEARDOWN_DESIGNATION_SOURCES}
              optionLabels={TEARDOWN_DESIGNATION_SOURCE_LABELS}
              onValueChange={(designationSource) =>
                designationSource === ""
                  ? undefined
                  : updateMaterialRow(row.rowId, { designationSource })
              }
              hint={
                isMeasured
                  ? "A reader is told this came from the unit itself."
                  : "A reader is told plainly that this was declared rather than measured."
              }
            />

            <LabeledEnumSelect
              label="What kind of material"
              value={row.materialClass}
              options={TEARDOWN_MATERIAL_CLASSES}
              optionLabels={TEARDOWN_MATERIAL_CLASS_LABELS}
              onValueChange={(materialClass) =>
                materialClass === "" ? undefined : updateMaterialRow(row.rowId, { materialClass })
              }
            />

            <LabeledEnumSelect
              label="How the part was made"
              value={row.process}
              options={TEARDOWN_MANUFACTURING_METHODS}
              optionLabels={TEARDOWN_MANUFACTURING_METHOD_LABELS}
              onValueChange={(process) => updateMaterialRow(row.rowId, { process })}
              emptyOptionLabel="I do not know"
              hint="Leave it as “I do not know” rather than guessing. Nothing is shown for an unknown."
            />

            <LabeledTextInput
              label="Surface finish"
              value={row.finish}
              onValueChange={(finish) => updateMaterialRow(row.rowId, { finish })}
              placeholder="Clear anodised"
              hint="Optional, and an empty field shows nothing."
            />
          </RepeatableRowShell>
        );
      })}
    </RepeatableRowsShell>
  );
}

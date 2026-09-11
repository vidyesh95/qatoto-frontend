// TRANSPORT: props-only — a dumb view over the wizard draft.

import {
  LabeledTextInput,
  RepeatableRowShell,
  RepeatableRowsShell,
} from "@/components/home/blueprints/teardowns/authoring/wizard-fields";
import type {
  PartDraftRow,
  TeardownWizardStepProps,
} from "@/components/home/blueprints/teardowns/authoring/wizard-shared";

function newPartDraftRow(): PartDraftRow {
  return { rowId: crypto.randomUUID(), label: "", material: "" };
}

/**
 * THE PARTS LIST — AND DELIBERATELY NOT AN ASSEMBLY.
 *
 * ⚠️ THERE IS NO GEOMETRY FIELD ON THIS STEP AND THE WRITE CONTRACT HAS NONE EITHER. The read
 * contract's exploded view is driven by a `.glb` per part, which is the shape an upload takes — and
 * there is no upload route. So a submission cannot produce a modelled teardown, and this step says
 * that plainly instead of offering a file field that goes nowhere or, worse, quietly omitting the
 * feature so a publisher wonders why their teardown has no 3D view.
 *
 * ⚠️ THIS LIST IS NOT THE BILL OF MATERIALS AND NOT THE COMPOSITION. It is "what came out when you
 * opened it" — the reader's map of the thing. What each part is MADE of, to a standard designation
 * with a source, is the next step, and the two are separate because most publishers can name twenty
 * parts and identify the material of three.
 */
export default function PartsStep({ draft, onDraftChange }: TeardownWizardStepProps) {
  function updatePartRow(rowId: string, patch: Partial<PartDraftRow>): void {
    onDraftChange({
      parts: draft.parts.map((row) => (row.rowId === rowId ? { ...row, ...patch } : row)),
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-medium text-foreground">No 3D model in this version</h2>
        <p className="mt-2 max-w-prose text-sm leading-6 text-muted-foreground">
          The exploded view on a teardown page is built from a 3D file for every part, and there is
          nowhere to upload one yet. List the parts here and your teardown reads as a list rather
          than a model. Nothing you write now is wasted when uploads open.
        </p>
      </div>

      <RepeatableRowsShell
        heading="Parts"
        description="What came out when you opened it, in the order you took it apart. Rough is fine: a reader wants the map, not an inventory."
        emptyMessage="No parts listed. The page will show your summary and your files without a parts list."
        addLabel="Add a part"
        rowCount={draft.parts.length}
        onAddRow={() => onDraftChange({ parts: [...draft.parts, newPartDraftRow()] })}
      >
        {draft.parts.map((row, rowIndex) => (
          <RepeatableRowShell
            key={row.rowId}
            rowLabel={`Part ${rowIndex + 1}`}
            onRemoveRow={() =>
              onDraftChange({ parts: draft.parts.filter((part) => part.rowId !== row.rowId) })
            }
          >
            <LabeledTextInput
              label="Part"
              value={row.label}
              onValueChange={(label) => updatePartRow(row.rowId, { label })}
              placeholder="Heatsink"
            />
            <LabeledTextInput
              label="What it seems to be made of"
              value={row.material}
              onValueChange={(material) => updatePartRow(row.rowId, { material })}
              placeholder="Extruded aluminium, anodised"
              hint="Your impression is enough here."
            />
          </RepeatableRowShell>
        ))}
      </RepeatableRowsShell>
    </div>
  );
}

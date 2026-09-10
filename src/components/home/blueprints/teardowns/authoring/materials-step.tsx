// TRANSPORT: props-only — a dumb view over the wizard draft.

import MaterialRowEditor from "@/components/home/blueprints/teardowns/authoring/material-row-editor";
import type { TeardownWizardStepProps } from "@/components/home/blueprints/teardowns/authoring/wizard-shared";

/**
 * WHAT THE THING IS MADE OF — the layer that turns a teardown into something a factory can quote.
 *
 * The editor itself is `MaterialRowEditor`, a client island: it holds the session's designation
 * option list, which is the one piece of state that is neither in the draft nor derivable from it.
 * This step is the framing around it, and the framing is doing real work — the paragraph below is
 * where a publisher is told, before they type anything, that saying how they know is not optional.
 */
export default function MaterialsStep({ draft, onDraftChange }: TeardownWizardStepProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-medium text-foreground">Say how you know, every time</h2>
        <p className="mt-2 max-w-prose text-sm leading-6 text-muted-foreground">
          &ldquo;6063-T5&rdquo; read off a supplier&rsquo;s invoice and &ldquo;6063-T5&rdquo;
          concluded from a scan are the same eleven characters and completely different claims.
          Somebody deciding whether to spend money on tooling is taking a different risk under each,
          so every material you list carries how you arrived at it, and a reader sees it.
        </p>
        <p className="mt-2 max-w-prose text-sm leading-6 text-muted-foreground">
          Two materials you are sure of beat ten you half-remember.
        </p>
      </div>

      <MaterialRowEditor
        materialRows={draft.materials}
        onMaterialRowsChange={(materials) => onDraftChange({ materials })}
      />
    </div>
  );
}

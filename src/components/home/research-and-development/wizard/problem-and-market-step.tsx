import type { NewIdeaStepProps } from "@/components/home/research-and-development/wizard/wizard-shared";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field-classes";

// Step 2: the demand story — who has the problem, where, and what evidence
// exists. Free text this phase; the Knowledge Hub cross-check is backend-later.
export default function ProblemAndMarketStep({ draft, onDraftChange }: NewIdeaStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className={LABEL_CLASS}>Problem it solves</span>
        <textarea
          value={draft.problemItSolves}
          onChange={(changeEvent) => onDraftChange({ problemItSolves: changeEvent.target.value })}
          placeholder="Who has this problem, and how bad is it?"
          rows={4}
          className={INPUT_CLASS}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className={LABEL_CLASS}>Target region</span>
        <input
          type="text"
          value={draft.targetRegion}
          onChange={(changeEvent) => onDraftChange({ targetRegion: changeEvent.target.value })}
          placeholder="e.g. East Africa"
          className={INPUT_CLASS}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className={LABEL_CLASS}>Demand evidence</span>
        <textarea
          value={draft.demandEvidenceNotes}
          onChange={(changeEvent) =>
            onDraftChange({ demandEvidenceNotes: changeEvent.target.value })
          }
          placeholder="Surveys, Civic Pulse reports, market stats — what shows people want this?"
          rows={3}
          className={INPUT_CLASS}
        />
      </label>
      <p className="text-xs text-muted-foreground">
        Tip: the Knowledge Hub lists where demand is highest — cite an insight if one fits.
      </p>
    </div>
  );
}

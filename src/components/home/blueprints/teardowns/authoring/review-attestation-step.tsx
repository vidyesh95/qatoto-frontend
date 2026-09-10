// TRANSPORT: props-only — a dumb view over the wizard draft.

import AttestationGate from "@/components/home/blueprints/teardowns/authoring/attestation-gate";
import type { TeardownWizardStepProps } from "@/components/home/blueprints/teardowns/authoring/wizard-shared";
import {
  TEARDOWN_SURVEY_METHOD_LABELS,
  TEARDOWN_SURVEY_METHODS,
  TEARDOWN_UNIT_ACQUISITION_LABELS,
} from "@/lib/blueprints/schemas";
import { formatIsoDateLabel } from "@/lib/store/format";

/** One read-back line. An unanswered field says so rather than rendering blank. */
function ReviewRow({ label, value }: { readonly label: string; readonly value: string | null }) {
  return (
    <div className="border-t border-black/5 py-2">
      <dt className="text-[11px] tracking-[0.5px] text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">
        {/*
          ⚠️ "NOT ANSWERED" HERE, EVEN THOUGH THE READ SURFACE WOULD RENDER NOTHING. The rules are
          opposite on purpose: on a published page an absence is a fact about the teardown and a
          placeholder would invent one. On a review screen an absence is a QUESTION THE AUTHOR HAS
          NOT ANSWERED, and showing a blank line is how somebody submits without noticing what they
          skipped.
        */}
        {value ?? <span className="text-muted-foreground">Not answered</span>}
      </dd>
    </div>
  );
}

/**
 * THE LAST SCREEN: read back everything, then gate on the four statements.
 *
 * ⚠️ THE READ-BACK IS NOT DECORATION. This is the only place a publisher sees the whole submission
 * at once, and it is the moment they can still notice that the acquisition line says something they
 * did not mean. Every field the wizard collects appears here, including the ones they left empty.
 */
export default function ReviewAttestationStep({ draft, onDraftChange }: TeardownWizardStepProps) {
  const surveyMethodLabel =
    draft.surveyMethods.length === 0
      ? null
      : TEARDOWN_SURVEY_METHODS.filter((method) => draft.surveyMethods.includes(method))
          .map((method) => TEARDOWN_SURVEY_METHOD_LABELS[method])
          .join(" · ");

  const permissionLabel =
    draft.provenanceKind === "licensed_open_source"
      ? draft.licenceName.trim() === ""
        ? null
        : draft.licenceName.trim()
      : draft.provenanceKind === "authorized_by_manufacturer"
        ? draft.authorizationNote.trim() === ""
          ? null
          : "Authorized by the manufacturer"
        : "No licence and no authorization";

  /**
   * ⚠️ ZERO IS "NONE", NOT "NOT ANSWERED", and the difference is the whole point of this screen.
   * An empty survey date is a question the publisher SKIPPED; zero documents is a question they
   * ANSWERED — most teardowns publish none. Rendering both as "Not answered" would send somebody
   * hunting back through four steps for a field that was never wrong.
   */
  const countedLabel = (count: number, singular: string, plural: string) =>
    count === 0 ? "None" : `${count} ${count === 1 ? singular : plural}`;

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-sm font-medium text-foreground">What you are submitting</h2>
        <dl className="mt-3 max-w-2xl">
          <ReviewRow label="Title" value={draft.title.trim() || null} />
          {/*
            ⚠️ THE SUMMARY READS BACK IN FULL, and it was missing from the first version of this
            screen. It is a REQUIRED field with a length rule, so leaving it out meant the contract
            could refuse a submission for a field the review page never showed — which is the exact
            dead end this screen exists to prevent.
          */}
          <ReviewRow label="Summary" value={draft.summary.trim() || null} />
          <ReviewRow label="Unit surveyed" value={draft.subjectProductName.trim() || null} />
          <ReviewRow
            label="How you got it"
            value={TEARDOWN_UNIT_ACQUISITION_LABELS[draft.unitAcquisition]}
          />
          {/*
            `formatIsoDateLabel`, NOT `formatIsoInstantAsDateLabel`: the draft holds a date-only
            `YYYY-MM-DD` from the native input, which is exactly what that function takes. The
            instant variant is for the wire value the collector builds from it.
          */}
          <ReviewRow
            label="Surveyed on"
            value={draft.surveyedOnDate === "" ? null : formatIsoDateLabel(draft.surveyedOnDate)}
          />
          <ReviewRow label="Methods" value={surveyMethodLabel} />
          <ReviewRow label="Permission" value={permissionLabel} />
          <ReviewRow
            label="Walkthrough"
            value={draft.walkthroughYoutubeUrl.trim() === "" ? "None" : "One YouTube link"}
          />
          <ReviewRow
            label="Documents"
            value={countedLabel(draft.documents.length, "document", "documents")}
          />
          <ReviewRow
            label="Fabrication files"
            value={countedLabel(draft.manufacturingFiles.length, "file", "files")}
          />
          <ReviewRow label="Parts" value={countedLabel(draft.parts.length, "part", "parts")} />
          <ReviewRow
            label="Materials"
            value={countedLabel(draft.materials.length, "material", "materials")}
          />
        </dl>
      </section>

      <div className="max-w-2xl">
        <label className="block">
          <span className="text-xs font-medium text-[#6F7979]">Tags</span>
          <input
            type="text"
            value={draft.tagsText}
            onChange={(changeEvent) => onDraftChange({ tagsText: changeEvent.target.value })}
            placeholder="cold-chain, solar, power-electronics"
            className="mt-1 w-full rounded-lg border border-[#6F7979] bg-transparent px-3 py-2 text-sm outline-none focus:border-[#00696E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E]"
          />
          <span className="mt-1 block text-xs text-muted-foreground">
            Separated by commas. These are how somebody browsing finds you.
          </span>
        </label>
      </div>

      <AttestationGate
        acceptedClauseIds={draft.acceptedAttestationClauseIds}
        onAcceptedClauseIdsChange={(acceptedAttestationClauseIds) =>
          onDraftChange({ acceptedAttestationClauseIds })
        }
      />
    </div>
  );
}

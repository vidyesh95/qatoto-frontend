// TRANSPORT: props-only — a dumb view over the wizard draft.

import {
  CheckboxRow,
  LabeledEnumSelect,
  LabeledTextArea,
  LabeledTextInput,
} from "@/components/home/blueprints/teardowns/authoring/wizard-fields";
import type { TeardownWizardStepProps } from "@/components/home/blueprints/teardowns/authoring/wizard-shared";
import {
  TEARDOWN_SUBJECT_KIND_REFUSALS,
  TEARDOWN_SUBJECT_KINDS,
} from "@/lib/blueprints/authoring.schemas";
import {
  BLUEPRINT_PROVENANCE_KINDS,
  TEARDOWN_SUBJECT_KIND_LABELS,
  TEARDOWN_SURVEY_METHOD_LABELS,
  TEARDOWN_SURVEY_METHOD_NOTES,
  TEARDOWN_SURVEY_METHODS,
  TEARDOWN_UNIT_ACQUISITION_LABELS,
  TEARDOWN_UNIT_ACQUISITIONS,
  type TeardownSurveyMethod,
} from "@/lib/blueprints/schemas";

/**
 * The provenance kind, in the publisher's language rather than the enum's.
 *
 * ⚠️ THE THIRD OPTION IS THE ORDINARY ONE AND IS LISTED LAST ANYWAY. Putting "no permission" first
 * would read as the discouraged answer; putting it last, after two that require a document, lets a
 * publisher rule the first two out and arrive at it — which is what most of them will honestly be.
 */
const PROVENANCE_KIND_PROMPTS: Record<(typeof BLUEPRINT_PROVENANCE_KINDS)[number], string> = {
  licensed_open_source: "It is published under an open-hardware licence I can name and link to",
  authorized_by_manufacturer: "The manufacturer gave me permission to publish this",
  community_reverse_engineered: "Neither: I bought one and worked it out myself",
};

/**
 * STEP ONE, AND IT IS FIRST FOR A REASON.
 *
 * ⚠️ THIS IS THE STEP THAT DECIDES WHETHER THE OTHER FOUR SHOULD BE FILLED IN. Somebody surveying a
 * unit they were handed under an NDA needs to meet that fact here, on screen one, not after twenty
 * minutes of typing material designations. Everything on this surface — the de-indexing, the
 * origin block above the bill of materials, the four attestation clauses — exists to keep leaked
 * material off the platform, and the cheapest place to keep it off is before it is typed.
 *
 * ⚠️ `proposed_design` IS RENDERED, DISABLED, WITH ITS REASON BESIDE IT. A hidden option teaches
 * nobody anything and invites the same person to look for it again next week. The refusal copy is
 * in the contract (`TEARDOWN_SUBJECT_KIND_REFUSALS`) rather than here, so the reason and the rule
 * cannot drift apart.
 */
export default function SubjectProvenanceStep({ draft, onDraftChange }: TeardownWizardStepProps) {
  function toggleSurveyMethod(method: TeardownSurveyMethod, nextIsChecked: boolean): void {
    const nextMethods = nextIsChecked
      ? [...draft.surveyMethods, method]
      : draft.surveyMethods.filter((existingMethod) => existingMethod !== method);
    onDraftChange({ surveyMethods: nextMethods });
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-sm font-medium text-foreground">What are you surveying?</h2>

        <div className="mt-3 space-y-2">
          {TEARDOWN_SUBJECT_KINDS.map((subjectKind) => {
            const refusalReason = TEARDOWN_SUBJECT_KIND_REFUSALS[subjectKind];
            const isRefused = refusalReason !== null;

            return (
              <div key={subjectKind}>
                <label
                  className={`flex items-start gap-3 ${isRefused ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                >
                  <input
                    type="radio"
                    name="teardown-subject-kind"
                    value={subjectKind}
                    checked={draft.subjectKind === subjectKind}
                    disabled={isRefused}
                    onChange={() => onDraftChange({ subjectKind })}
                    className="mt-0.5 size-4 shrink-0 accent-[#00696E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E]"
                  />
                  <span className="text-sm text-foreground">
                    {TEARDOWN_SUBJECT_KIND_LABELS[subjectKind]}
                  </span>
                </label>
                {/*
                  THE REASON SITS UNDER THE DISABLED OPTION, not in a tooltip. A tooltip is invisible
                  on a touch device, which is where a founder in this market is reading.
                */}
                {isRefused ? (
                  <p className="mt-1 ml-7 max-w-prose text-xs leading-5 text-muted-foreground">
                    {refusalReason}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <LabeledTextInput
          label="Title"
          value={draft.title}
          onValueChange={(title) => onDraftChange({ title })}
          placeholder="Solar cold-storage controller, board and all"
          hint="What somebody would search for. Say what it is, not how good the teardown is."
        />
        <LabeledTextInput
          label="The unit you took apart"
          value={draft.subjectProductName}
          onValueChange={(subjectProductName) => onDraftChange({ subjectProductName })}
          placeholder="400 L off-grid chest freezer control board"
          hint="The product as it is sold. This is what a reader checks your survey against."
        />
      </div>

      <LabeledTextArea
        label="Summary"
        value={draft.summary}
        onValueChange={(summary) => onDraftChange({ summary })}
        hint="One paragraph: what it is, and the one thing you found that a reader would not guess."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <LabeledEnumSelect
          label="How you got the unit"
          value={draft.unitAcquisition}
          options={TEARDOWN_UNIT_ACQUISITIONS}
          optionLabels={TEARDOWN_UNIT_ACQUISITION_LABELS}
          onValueChange={(unitAcquisition) =>
            unitAcquisition === "" ? undefined : onDraftChange({ unitAcquisition })
          }
          hint="Every option here is a lawful way to come by one. If none of them describes yours, stop."
        />
        <LabeledTextInput
          label="When you surveyed it"
          inputType="date"
          value={draft.surveyedOnDate}
          onValueChange={(surveyedOnDate) => onDraftChange({ surveyedOnDate })}
          hint="The day you measured it, which is not the day you write this up."
        />
      </div>

      <section>
        <h2 className="text-sm font-medium text-foreground">How you looked inside</h2>
        <p className="mt-1 max-w-prose text-xs text-muted-foreground">
          Pick every method you actually used. Each one says something different about what your
          numbers prove, and a reader is told which you claimed.
        </p>
        <div className="mt-2">
          {TEARDOWN_SURVEY_METHODS.map((method) => (
            <CheckboxRow
              key={method}
              label={TEARDOWN_SURVEY_METHOD_LABELS[method]}
              detail={TEARDOWN_SURVEY_METHOD_NOTES[method]}
              isChecked={draft.surveyMethods.includes(method)}
              onCheckedChange={(nextIsChecked) => toggleSurveyMethod(method, nextIsChecked)}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium text-foreground">Do you have permission from anyone?</h2>
        <div className="mt-3 space-y-2">
          {BLUEPRINT_PROVENANCE_KINDS.map((provenanceKind) => (
            <label key={provenanceKind} className="flex cursor-pointer items-start gap-3">
              <input
                type="radio"
                name="teardown-provenance-kind"
                value={provenanceKind}
                checked={draft.provenanceKind === provenanceKind}
                onChange={() => onDraftChange({ provenanceKind })}
                className="mt-0.5 size-4 shrink-0 accent-[#00696E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E]"
              />
              <span className="text-sm text-foreground">
                {PROVENANCE_KIND_PROMPTS[provenanceKind]}
              </span>
            </label>
          ))}
        </div>

        {/*
          ⚠️ ONE ARM'S FIELDS AT A TIME, because the contract refuses a row carrying both. Showing
          the licence pair and the authorisation box together would let somebody fill in both and
          then meet a validation error about a field they thought was optional.
        */}
        {draft.provenanceKind === "licensed_open_source" ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <LabeledTextInput
              label="Licence name"
              value={draft.licenceName}
              onValueChange={(licenceName) => onDraftChange({ licenceName })}
              placeholder="CERN-OHL-S v2"
              hint="Written properly, not an abbreviation you use in the workshop."
            />
            <LabeledTextInput
              label="Link to the licence"
              inputType="url"
              value={draft.licenceUrl}
              onValueChange={(licenceUrl) => onDraftChange({ licenceUrl })}
              placeholder="https://…"
              hint="A reader is told to read it, so it has to be somewhere they can."
            />
          </div>
        ) : null}

        {draft.provenanceKind === "authorized_by_manufacturer" ? (
          <div className="mt-4">
            <LabeledTextArea
              label="Who authorised it, and on what terms"
              value={draft.authorizationNote}
              onValueChange={(authorizationNote) => onDraftChange({ authorizationNote })}
              rowCount={3}
              hint="In your own words. A reader is told plainly that this permission is yours and does not pass to them, so do not describe it as a licence."
            />
          </div>
        ) : null}

        <div className="mt-4">
          <LabeledTextArea
            label="Anything you want to qualify"
            value={draft.provenanceNotes}
            onValueChange={(provenanceNotes) => onDraftChange({ provenanceNotes })}
            rowCount={2}
            hint="Optional. Leave it empty and nothing is shown."
          />
        </div>
      </section>
    </div>
  );
}

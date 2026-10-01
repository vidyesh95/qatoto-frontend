"use client";

import type { ReactNode } from "react";
import CaseStudyLessonRow, {
  type CaseStudyLessonRowFields,
} from "@/components/home/blueprints/cards/case-study-lesson-row";
import {
  EvidenceCompanyRowsEditor,
  OutcomeMetricRowsEditor,
  SourceRowsEditor,
  TextItemRowsEditor,
} from "@/components/home/blueprints/case-studies/authoring/case-study-row-editors";
import { type CaseStudyFormDraft } from "@/components/home/blueprints/case-studies/authoring/case-study-shared";
import CaseStudyStatements from "@/components/home/blueprints/case-studies/authoring/case-study-statements";
import {
  LabeledEnumSelect,
  LabeledTextArea,
  LabeledTextInput,
} from "@/components/home/blueprints/authoring/form-fields";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field-classes";
import type { CaseStudyOption } from "@/lib/blueprints/schemas";
import {
  CASE_STUDY_AUTHOR_RELATIONSHIP_CHOICES,
  CASE_STUDY_CURRENCIES,
  CASE_STUDY_CURRENCY_LABELS,
  CASE_STUDY_ONE_LINE_ACTION_MAXIMUM_CHARACTERS,
  CASE_STUDY_OUTCOME_SUMMARY_MAXIMUM_CHARACTERS,
  CASE_STUDY_TITLE_MAXIMUM_CHARACTERS,
} from "@/lib/blueprints/case-study-authoring.schemas";
import {
  BLUEPRINT_DISCIPLINE_LABELS,
  BLUEPRINT_DISCIPLINES,
  CASE_STUDY_AUTHOR_RELATIONSHIPS,
} from "@/lib/blueprints/schemas";

/** One titled part of the form, on the launch composer's pattern: a hairline above all but the first. */
export function FormSection({
  title,
  description,
  children,
}: {
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
}) {
  return (
    <section className="border-t border-border pt-6 first:border-t-0 first:pt-0">
      <h2 className="text-sm font-medium text-foreground">{title}</h2>
      {description === undefined ? null : (
        <p className="mt-1 max-w-prose text-xs text-muted-foreground">{description}</p>
      )}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

/**
 * One answer to "How do you know this?": a real radio, for `CheckboxRow`'s reason, since which of the
 * two a writer picked is what the statements and the reader note both rest on.
 */
export function RelationshipChoiceRow({
  label,
  detail,
  isChecked,
  onSelect,
}: {
  readonly label: string;
  readonly detail: string;
  readonly isChecked: boolean;
  readonly onSelect: () => void;
}) {
  return (
    <label className="grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 rounded-xl border border-border p-3 transition-colors has-checked:border-primary-imprint/60 has-checked:bg-primary-imprint/5">
      <input
        type="radio"
        name="case-study-author-relationship"
        checked={isChecked}
        onChange={onSelect}
        className="row-span-2 mt-0.5 size-4 accent-primary-imprint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint"
      />
      <span className="text-sm font-medium text-foreground">{label}</span>
      <span className="col-start-2 mt-0.5 text-xs leading-5 text-muted-foreground">{detail}</span>
    </label>
  );
}

/** A refusal that belongs to a whole section rather than one field, such as "add at least one step". */
export function SectionError({ message }: { readonly message: string | null }) {
  if (message === null) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

export function CaseStudyLessonAndRelationshipFields({
  formDraft,
  applyFormPatch,
  readFieldError,
}: {
  readonly formDraft: CaseStudyFormDraft;
  readonly applyFormPatch: (formPatch: Partial<CaseStudyFormDraft>) => void;
  readonly readFieldError: (fieldPath: string) => string | null;
}) {
  return (
    <>
      <FormSection title="The lesson">
        <LabeledTextInput
          label="The lesson"
          value={formDraft.title}
          onValueChange={(title) => applyFormPatch({ title })}
          placeholder="Budget for a second mould, not a perfect first one."
          hint="One instruction a reader can act on. It is the title everywhere this appears."
          characterLimit={CASE_STUDY_TITLE_MAXIMUM_CHARACTERS}
          errorMessage={readFieldError("title")}
        />
        <LabeledTextInput
          label="What to do"
          value={formDraft.oneLineAction}
          onValueChange={(oneLineAction) => applyFormPatch({ oneLineAction })}
          placeholder="Time each assembly step at two volumes before you requote a component."
          hint="The single action, in one line, under the lesson."
          characterLimit={CASE_STUDY_ONE_LINE_ACTION_MAXIMUM_CHARACTERS}
          errorMessage={readFieldError("oneLineAction")}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <LabeledEnumSelect
            label="Discipline"
            value={formDraft.discipline}
            options={BLUEPRINT_DISCIPLINES}
            optionLabels={BLUEPRINT_DISCIPLINE_LABELS}
            onValueChange={(discipline) => applyFormPatch({ discipline })}
            emptyOptionLabel="Choose one"
            errorMessage={readFieldError("discipline")}
          />
          <LabeledTextInput
            label="Sector"
            value={formDraft.sector}
            onValueChange={(sector) => applyFormPatch({ sector })}
            placeholder="Hardware"
            errorMessage={readFieldError("sector")}
          />
        </div>
        <LabeledTextInput
          label="What happened after"
          value={formDraft.outcomeSummary}
          onValueChange={(outcomeSummary) => applyFormPatch({ outcomeSummary })}
          placeholder="Shipped batch four at 512 cents a unit"
          hint="Optional. Leave it empty if nobody can say tidily what came of it."
          characterLimit={CASE_STUDY_OUTCOME_SUMMARY_MAXIMUM_CHARACTERS}
          errorMessage={readFieldError("outcomeSummary")}
        />
      </FormSection>

      <FormSection
        title="How you know this"
        description="Readers see your answer under your name. It also decides the two statements you tick at the end."
      >
        <fieldset className="space-y-2">
          <legend className="sr-only">How you know this</legend>
          {CASE_STUDY_AUTHOR_RELATIONSHIPS.map((authorRelationship) => (
            <RelationshipChoiceRow
              key={authorRelationship}
              label={CASE_STUDY_AUTHOR_RELATIONSHIP_CHOICES[authorRelationship].label}
              detail={CASE_STUDY_AUTHOR_RELATIONSHIP_CHOICES[authorRelationship].detail}
              isChecked={formDraft.authorRelationship === authorRelationship}
              onSelect={() => applyFormPatch({ authorRelationship, acceptedStatementIds: [] })}
            />
          ))}
        </fieldset>
        <SectionError message={readFieldError("authorRelationship")} />
      </FormSection>
    </>
  );
}

export function CaseStudyStoryAndActionsFields({
  formDraft,
  applyFormPatch,
  readFieldError,
}: {
  readonly formDraft: CaseStudyFormDraft;
  readonly applyFormPatch: (formPatch: Partial<CaseStudyFormDraft>) => void;
  readonly readFieldError: (fieldPath: string) => string | null;
}) {
  return (
    <>
      <FormSection title="The story">
        <LabeledTextArea
          label="Summary"
          value={formDraft.summary}
          onValueChange={(summary) => applyFormPatch({ summary })}
          rowCount={3}
          hint="One paragraph: what happened, in brief."
          errorMessage={readFieldError("summary")}
        />
        <LabeledTextArea
          label="Problem"
          value={formDraft.problem}
          onValueChange={(problem) => applyFormPatch({ problem })}
          hint="What was going wrong, before anybody fixed it."
          errorMessage={readFieldError("problem")}
        />
        <LabeledTextArea
          label="Context"
          value={formDraft.context}
          onValueChange={(context) => applyFormPatch({ context })}
          hint="Who this was, what they were building, and at what scale."
          errorMessage={readFieldError("context")}
        />
      </FormSection>

      <FormSection title="What they did" description="In the order they did it.">
        <TextItemRowsEditor
          rows={formDraft.actionStepRows}
          onRowsChange={(actionStepRows) => applyFormPatch({ actionStepRows })}
          fieldPath="actionSteps"
          rowNoun="Step"
          addLabel="Add a step"
          emptyMessage="No steps yet. A case study needs at least one."
          readFieldError={readFieldError}
        />
        <SectionError message={readFieldError("actionSteps")} />
      </FormSection>

      <FormSection
        title="What to avoid"
        description="Optional. The things that went wrong, in any order."
      >
        <TextItemRowsEditor
          rows={formDraft.pitfallRows}
          onRowsChange={(pitfallRows) => applyFormPatch({ pitfallRows })}
          fieldPath="pitfalls"
          rowNoun="Thing to avoid"
          addLabel="Add something to avoid"
          emptyMessage="Nothing listed yet."
          readFieldError={readFieldError}
        />
        <SectionError message={readFieldError("pitfalls")} />
      </FormSection>
    </>
  );
}

export function CaseStudyEvidenceAndNumbersFields({
  formDraft,
  applyFormPatch,
  readFieldError,
  readFieldErrorsUnder,
}: {
  readonly formDraft: CaseStudyFormDraft;
  readonly applyFormPatch: (formPatch: Partial<CaseStudyFormDraft>) => void;
  readonly readFieldError: (fieldPath: string) => string | null;
  readonly readFieldErrorsUnder: (fieldPathPrefix: string) => string | null;
}) {
  return (
    <>
      <FormSection
        title="Companies"
        description={
          formDraft.authorRelationship === "first_hand"
            ? "Optional. The businesses this happened at, with where and when. If you are not free to name one in public, you can withhold its name from readers."
            : "Optional. The businesses this happened at, with where and when. Name each one the way its sources name it."
        }
      >
        <EvidenceCompanyRowsEditor
          rows={formDraft.companyRows}
          onRowsChange={(companyRows) => applyFormPatch({ companyRows })}
          canWithholdNames={formDraft.authorRelationship === "first_hand"}
          readFieldError={readFieldError}
        />
        <SectionError message={readFieldError("evidenceCompanies")} />
      </FormSection>

      <FormSection title="The numbers">
        <LabeledTextInput
          label="Timeline"
          value={formDraft.timelineLabel}
          onValueChange={(timelineLabel) => applyFormPatch({ timelineLabel })}
          placeholder="11 months, four production runs"
          hint="Optional."
          errorMessage={readFieldError("timelineLabel")}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <LabeledTextInput
            label="Capital raised"
            value={formDraft.capitalRaisedText}
            onValueChange={(capitalRaisedText) => applyFormPatch({ capitalRaisedText })}
            placeholder="250000"
            errorMessage={readFieldError("capitalRaised.amountInCents")}
          />
          <LabeledEnumSelect
            label="Currency"
            value={formDraft.capitalRaisedCurrency}
            options={CASE_STUDY_CURRENCIES}
            optionLabels={CASE_STUDY_CURRENCY_LABELS}
            onValueChange={(capitalRaisedCurrency) => {
              if (capitalRaisedCurrency !== "") applyFormPatch({ capitalRaisedCurrency });
            }}
            errorMessage={readFieldError("capitalRaised.currency")}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Capital raised is optional. Leave it empty if it was not disclosed; an empty amount is
          never shown as zero.
        </p>
        <div>
          <h3 className="text-sm font-medium text-foreground">Figures</h3>
          <p className="mt-1 max-w-prose text-xs text-muted-foreground">
            Optional. The figures the lesson rests on, each with a label.
          </p>
        </div>
        <OutcomeMetricRowsEditor
          rows={formDraft.metricRows}
          onRowsChange={(metricRows) => applyFormPatch({ metricRows })}
          readFieldError={readFieldError}
          readFieldErrorsUnder={readFieldErrorsUnder}
        />
        <SectionError message={readFieldError("outcomeMetrics")} />
      </FormSection>

      <FormSection
        title="Sources"
        description={
          formDraft.authorRelationship === "public_sources"
            ? "Required for a case study from public sources: link every source a figure came from."
            : "Where the figures came from. With none, the page says there is no public source for this one."
        }
      >
        <SourceRowsEditor
          rows={formDraft.sourceRows}
          onRowsChange={(sourceRows) => applyFormPatch({ sourceRows })}
          readFieldError={readFieldError}
        />
        <SectionError message={readFieldError("sources")} />
      </FormSection>
    </>
  );
}

export function CaseStudyRelatedLessonsAndStatementsFields({
  formDraft,
  applyFormPatch,
  readFieldError,
  caseStudyOptions,
  updateRelatedLessonSlot,
  lessonRowPreview,
}: {
  readonly formDraft: CaseStudyFormDraft;
  readonly applyFormPatch: (formPatch: Partial<CaseStudyFormDraft>) => void;
  readonly readFieldError: (fieldPath: string) => string | null;
  readonly caseStudyOptions: readonly CaseStudyOption[];
  readonly updateRelatedLessonSlot: (slotIndex: number, selectedSlug: string) => void;
  readonly lessonRowPreview: CaseStudyLessonRowFields | null;
}) {
  return (
    <>
      <FormSection
        title="Related lessons"
        description="Optional. Up to three other case studies a reader should open next."
      >
        <div className="grid gap-4">
          {formDraft.relatedLessonSlotSlugs.map((slotSlug, slotIndex) => (
            // The slot position is the identity: three fixed selects that never reorder.
            // oxlint-disable-next-line react/no-array-index-key
            <label key={slotIndex} className="block">
              <span className={LABEL_CLASS}>Related lesson {slotIndex + 1}</span>
              <select
                value={slotSlug}
                onChange={(changeEvent) =>
                  updateRelatedLessonSlot(slotIndex, changeEvent.target.value)
                }
                className={`${INPUT_CLASS} mt-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint`}
              >
                <option value="">None</option>
                {caseStudyOptions.map((caseStudyOption) => (
                  <option key={caseStudyOption.slug} value={caseStudyOption.slug}>
                    {caseStudyOption.title}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <SectionError message={readFieldError("relatedLessonSlugs")} />
      </FormSection>

      <FormSection title="Tags">
        <LabeledTextInput
          label="Tags"
          value={formDraft.tagsText}
          onValueChange={(tagsText) => applyFormPatch({ tagsText })}
          placeholder="manufacturing, unit-economics, assembly"
          hint="Separated by commas."
          errorMessage={readFieldError("tags")}
        />
      </FormSection>

      <FormSection title="Before you send">
        <CaseStudyStatements
          authorRelationship={formDraft.authorRelationship}
          acceptedStatementIds={formDraft.acceptedStatementIds}
          onAcceptedStatementIdsChange={(acceptedStatementIds) =>
            applyFormPatch({ acceptedStatementIds })
          }
        />
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs tracking-wider text-muted-foreground uppercase">
            How it will look in the list
          </p>
          <div className="mt-3 px-3">
            {lessonRowPreview === null ? (
              <p className="text-sm text-muted-foreground">
                Fill in the lesson and its discipline to see the row.
              </p>
            ) : (
              <CaseStudyLessonRow lesson={lessonRowPreview} recordHref={null} />
            )}
          </div>
        </div>
      </FormSection>
    </>
  );
}

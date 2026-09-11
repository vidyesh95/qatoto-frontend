// TRANSPORT: props-only — the case-study form's draft shape, one pure collector and the field labels.
// No React, no network.
//
// The launch form's precedent (`showcase-launch-shared.ts`): the form holds text, and
// `collectCaseStudySubmission` converts it ONCE, when the writer presses Send, then lets the contract
// decide.

import type { CaseStudyLessonRowFields } from "@/components/home/blueprints/cards/case-study-lesson-row";
import { splitTagsText } from "@/components/home/blueprints/showcase/authoring/showcase-launch-shared";
import {
  CaseStudySubmissionDraftSchema,
  type CaseStudyCurrency,
  type CaseStudyStatementId,
  type CaseStudySubmissionDraft,
} from "@/lib/blueprints/case-study-authoring.schemas";
import type { BlueprintDiscipline, CaseStudyAuthorRelationship } from "@/lib/blueprints/schemas";

/** A step or a pitfall while it is being edited. `rowId` is client-only, for a stable React key. */
export interface TextItemDraftRow {
  readonly rowId: string;
  readonly text: string;
}

export interface EvidenceCompanyDraftRow {
  readonly rowId: string;
  /** Always the real name. Withheld or not it is sent, so a moderator can check it. */
  readonly name: string;
  /**
   * Hides the name from READERS only. Only a first-hand writer is offered it, and the contract refuses
   * it on any other answer.
   */
  readonly isNameWithheld: boolean;
  readonly locationLabel: string;
  readonly yearLabel: string;
}

/** The three kinds a figure can be, matching `BlueprintMetricValueSchema`'s arms. */
export const OUTCOME_METRIC_KINDS = ["count", "money", "percentage"] as const;
export type OutcomeMetricKind = (typeof OUTCOME_METRIC_KINDS)[number];

export const OUTCOME_METRIC_KIND_LABELS: Record<OutcomeMetricKind, string> = {
  count: "A count",
  money: "An amount of money",
  percentage: "A percentage",
};

export interface OutcomeMetricDraftRow {
  readonly rowId: string;
  readonly label: string;
  /** `""` until chosen. There is deliberately no default: a figure's kind changes what it means. */
  readonly kind: OutcomeMetricKind | "";
  readonly valueText: string;
  /** Read only when `kind` is `money`, and kept when it is not so switching back loses nothing. */
  readonly currency: CaseStudyCurrency;
}

export interface SourceDraftRow {
  readonly rowId: string;
  readonly label: string;
  readonly publisherLabel: string;
  readonly url: string;
}

/** How many related lessons the form offers, as that many selects. The contract caps it at three. */
export const RELATED_LESSON_SLOT_COUNT = 3;

/**
 * THE WHOLE FORM, EVERY SCALAR HELD AS TEXT, for the launch form's reason: a half-typed amount is not
 * a number yet.
 */
export interface CaseStudyFormDraft {
  readonly title: string;
  readonly oneLineAction: string;
  /** `""` until chosen. */
  readonly discipline: BlueprintDiscipline | "";
  readonly sector: string;
  readonly outcomeSummary: string;
  /** `""` until answered. Changing it clears `acceptedStatementIds`. */
  readonly authorRelationship: CaseStudyAuthorRelationship | "";
  readonly summary: string;
  readonly problem: string;
  readonly context: string;
  readonly actionStepRows: readonly TextItemDraftRow[];
  readonly pitfallRows: readonly TextItemDraftRow[];
  readonly companyRows: readonly EvidenceCompanyDraftRow[];
  readonly timelineLabel: string;
  readonly capitalRaisedText: string;
  readonly capitalRaisedCurrency: CaseStudyCurrency;
  readonly metricRows: readonly OutcomeMetricDraftRow[];
  readonly sourceRows: readonly SourceDraftRow[];
  /** One slug per select, `""` for none. Always `RELATED_LESSON_SLOT_COUNT` long. */
  readonly relatedLessonSlotSlugs: readonly string[];
  readonly tagsText: string;
  readonly acceptedStatementIds: readonly CaseStudyStatementId[];
}

export const EMPTY_CASE_STUDY_FORM_DRAFT: CaseStudyFormDraft = {
  title: "",
  oneLineAction: "",
  discipline: "",
  sector: "",
  outcomeSummary: "",
  authorRelationship: "",
  summary: "",
  problem: "",
  context: "",
  // ONE EMPTY STEP TO START, because a case study needs at least one and an empty list with an add
  // button reads as optional. A fixed id is enough: it is a key for the one row that exists at load.
  actionStepRows: [{ rowId: "first-action-step", text: "" }],
  pitfallRows: [],
  companyRows: [],
  timelineLabel: "",
  capitalRaisedText: "",
  capitalRaisedCurrency: "USD",
  metricRows: [],
  sourceRows: [],
  relatedLessonSlotSlugs: Array.from({ length: RELATED_LESSON_SLOT_COUNT }, () => ""),
  tagsText: "",
  acceptedStatementIds: [],
};

/** `""` → `null`, trimmed. An empty field means "not stated", never an empty value. */
function toNullableText(rawValue: string): string | null {
  const trimmedValue = rawValue.trim();
  return trimmedValue === "" ? null : trimmedValue;
}

const DECIMAL_AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;
const WHOLE_NUMBER_PATTERN = /^\d+$/;
const PERCENTAGE_PATTERN = /^-?\d+(\.\d{1,2})?$/;

/**
 * Typed money to integer hundredths (cents, paise). Grouping commas of either style are dropped, so
 * "2,50,000" and "250,000" both read. Anything unreadable becomes `NaN`, which the contract names.
 */
function parseAmountToMinorUnits(amountText: string): number {
  const cleanedAmountText = amountText
    .trim()
    .replace(/^[$₹]/, "")
    .replaceAll(",", "");
  return DECIMAL_AMOUNT_PATTERN.test(cleanedAmountText)
    ? Math.round(Number(cleanedAmountText) * 100)
    : Number.NaN;
}

function parseWholeNumber(countText: string): number {
  const cleanedCountText = countText.trim().replaceAll(",", "");
  return WHOLE_NUMBER_PATTERN.test(cleanedCountText) ? Number(cleanedCountText) : Number.NaN;
}

/** "43.8" or "43.8%" to basis points, 4380. */
function parsePercentageToBasisPoints(percentageText: string): number {
  const cleanedPercentageText = percentageText.trim().replace(/%$/, "").trim();
  return PERCENTAGE_PATTERN.test(cleanedPercentageText)
    ? Math.round(Number(cleanedPercentageText) * 100)
    : Number.NaN;
}

/** A figure's value in the contract's shape. An unchosen kind is sent as is, for the contract to name. */
function buildMetricValueCandidate(metricRow: OutcomeMetricDraftRow) {
  switch (metricRow.kind) {
    case "count":
      return { kind: "count", amount: parseWholeNumber(metricRow.valueText) };
    case "money":
      return {
        kind: "money",
        amountInCents: parseAmountToMinorUnits(metricRow.valueText),
        currency: metricRow.currency,
      };
    case "percentage":
      return { kind: "percentage", basisPoints: parsePercentageToBasisPoints(metricRow.valueText) };
    case "":
      return { kind: "" };
    default: {
      const exhaustiveCheck: never = metricRow.kind;
      return exhaustiveCheck;
    }
  }
}

export type CollectCaseStudySubmissionResult =
  | { readonly ok: true; readonly submission: CaseStudySubmissionDraft }
  | { readonly ok: false; readonly fieldErrors: Readonly<Record<string, string[]>> };

/**
 * PARSE THE WHOLE FORM ONCE, WHEN THE WRITER PRESSES SEND.
 *
 * ⚠️ THE CONTRACT DOES THE VALIDATING, NOT THIS FUNCTION. Everything here is shape conversion (text to
 * null, money to hundredths, a percentage to basis points, empty related slots dropped), then
 * `CaseStudySubmissionDraftSchema.safeParse` decides.
 */
export function collectCaseStudySubmission(
  formDraft: CaseStudyFormDraft,
): CollectCaseStudySubmissionResult {
  const candidate = {
    title: formDraft.title.trim(),
    oneLineAction: formDraft.oneLineAction.trim(),
    discipline: formDraft.discipline,
    sector: formDraft.sector.trim(),
    outcomeSummary: toNullableText(formDraft.outcomeSummary),
    authorRelationship: formDraft.authorRelationship,
    summary: formDraft.summary.trim(),
    problem: formDraft.problem.trim(),
    context: formDraft.context.trim(),
    actionSteps: formDraft.actionStepRows.map((stepRow) => stepRow.text.trim()),
    pitfalls: formDraft.pitfallRows.map((pitfallRow) => pitfallRow.text.trim()),
    evidenceCompanies: formDraft.companyRows.map((companyRow) => ({
      name: companyRow.name.trim(),
      isNameWithheld: companyRow.isNameWithheld,
      locationLabel: companyRow.locationLabel.trim(),
      yearLabel: companyRow.yearLabel.trim(),
    })),
    timelineLabel: toNullableText(formDraft.timelineLabel),
    capitalRaised:
      formDraft.capitalRaisedText.trim() === ""
        ? null
        : {
            amountInCents: parseAmountToMinorUnits(formDraft.capitalRaisedText),
            currency: formDraft.capitalRaisedCurrency,
          },
    outcomeMetrics: formDraft.metricRows.map((metricRow) => ({
      label: metricRow.label.trim(),
      value: buildMetricValueCandidate(metricRow),
    })),
    sources: formDraft.sourceRows.map((sourceRow) => ({
      label: sourceRow.label.trim(),
      publisherLabel: sourceRow.publisherLabel.trim(),
      url: sourceRow.url.trim(),
    })),
    relatedLessonSlugs: formDraft.relatedLessonSlotSlugs.filter((slotSlug) => slotSlug !== ""),
    tags: splitTagsText(formDraft.tagsText),
    acceptedStatementIds: formDraft.acceptedStatementIds,
  };

  const parsed = CaseStudySubmissionDraftSchema.safeParse(candidate);
  if (parsed.success) return { ok: true, submission: parsed.data };

  const fieldErrors: Record<string, string[]> = {};
  for (const issue of parsed.error.issues) {
    const fieldPath = issue.path.join(".") || "form";
    fieldErrors[fieldPath] = [...(fieldErrors[fieldPath] ?? []), issue.message];
  }
  return { ok: false, fieldErrors };
}

/**
 * The fields the index row renders, from the draft, or `null` until there is enough to show one.
 *
 * A LESSON AND A DISCIPLINE ARE THE FLOOR: the row leads with the lesson and names the discipline on
 * every line, so a preview without either would be a row the list can never contain. A company joins
 * the evidence line only once both its place and year are filled, the only part of it the row reads.
 */
export function buildLessonRowPreview(
  formDraft: CaseStudyFormDraft,
): CaseStudyLessonRowFields | null {
  if (formDraft.discipline === "" || formDraft.title.trim() === "") return null;

  return {
    title: formDraft.title.trim(),
    sector: formDraft.sector.trim(),
    discipline: formDraft.discipline,
    evidenceCompanies: formDraft.companyRows
      .filter(
        (companyRow) =>
          companyRow.locationLabel.trim() !== "" && companyRow.yearLabel.trim() !== "",
      )
      .map((companyRow) => ({
        // The preview is the READER'S row, so a withheld name is `null` here as it is on the page.
        name: companyRow.isNameWithheld ? null : companyRow.name.trim(),
        locationLabel: companyRow.locationLabel.trim(),
        yearLabel: companyRow.yearLabel.trim(),
      })),
    outcomeSummary: toNullableText(formDraft.outcomeSummary),
    oneLineAction: formDraft.oneLineAction.trim(),
    summary: formDraft.summary.trim(),
  };
}

/** The on-screen label for every top-level path the contract can name, IN THE ORDER THE PAGE ASKS. */
const CASE_STUDY_FIELD_LABELS_IN_PAGE_ORDER: readonly (readonly [string, string])[] = [
  ["title", "The lesson"],
  ["oneLineAction", "What to do"],
  ["discipline", "Discipline"],
  ["sector", "Sector"],
  ["outcomeSummary", "What happened after"],
  ["authorRelationship", "How you know this"],
  ["summary", "Summary"],
  ["problem", "Problem"],
  ["context", "Context"],
  ["actionSteps", "What they did"],
  ["pitfalls", "What to avoid"],
  ["evidenceCompanies", "Companies"],
  ["timelineLabel", "Timeline"],
  ["capitalRaised", "Capital raised"],
  ["outcomeMetrics", "Figures"],
  ["sources", "Sources"],
  ["relatedLessonSlugs", "Related lessons"],
  ["tags", "Tags"],
  ["acceptedStatementIds", "Before you send"],
];

const NESTED_FIELD_LABELS = new Map<string, string>([
  ["capitalRaised.amountInCents", "Capital raised, amount"],
  ["capitalRaised.currency", "Capital raised, currency"],
]);

/** What one row of each repeatable list is called, and its fields' labels. */
const REPEATABLE_ROW_LABELS = new Map<
  string,
  { readonly rowNoun: string; readonly fieldLabels: ReadonlyMap<string, string> }
>([
  ["actionSteps", { rowNoun: "Step", fieldLabels: new Map() }],
  ["pitfalls", { rowNoun: "Thing to avoid", fieldLabels: new Map() }],
  [
    "evidenceCompanies",
    {
      rowNoun: "Company",
      fieldLabels: new Map([
        ["name", "Name"],
        ["isNameWithheld", "Withhold name"],
        ["locationLabel", "Place"],
        ["yearLabel", "Year"],
      ]),
    },
  ],
  [
    "outcomeMetrics",
    {
      rowNoun: "Figure",
      fieldLabels: new Map([
        ["label", "Label"],
        ["value", "Value"],
      ]),
    },
  ],
  [
    "sources",
    {
      rowNoun: "Source",
      fieldLabels: new Map([
        ["label", "Label"],
        ["publisherLabel", "Publisher"],
        ["url", "Address"],
      ]),
    },
  ],
]);

/** Where a path's field sits on the page; a nested path sits with its parent. */
export function findCaseStudyFieldPosition(fieldPath: string): number {
  const [topLevelKey] = fieldPath.split(".");
  const position = CASE_STUDY_FIELD_LABELS_IN_PAGE_ORDER.findIndex(
    ([fieldKey]) => fieldKey === topLevelKey,
  );
  return position === -1 ? CASE_STUDY_FIELD_LABELS_IN_PAGE_ORDER.length : position;
}

/** A contract path as the words a writer can act on. An unmapped path falls back to itself. */
export function describeCaseStudyFieldPath(fieldPath: string): string {
  const nestedFieldLabel = NESTED_FIELD_LABELS.get(fieldPath);
  if (nestedFieldLabel !== undefined) return nestedFieldLabel;

  const [topLevelKey = "", rowIndexText = "", fieldKey] = fieldPath.split(".");
  const repeatableRowLabels = REPEATABLE_ROW_LABELS.get(topLevelKey);
  const rowIndex = Number.parseInt(rowIndexText, 10);
  if (repeatableRowLabels !== undefined && !Number.isNaN(rowIndex)) {
    const rowFieldLabel =
      fieldKey === undefined ? undefined : repeatableRowLabels.fieldLabels.get(fieldKey);
    const rowName = `${repeatableRowLabels.rowNoun} ${rowIndex + 1}`;
    return rowFieldLabel === undefined ? rowName : `${rowName}, ${rowFieldLabel}`;
  }

  const labelEntry = CASE_STUDY_FIELD_LABELS_IN_PAGE_ORDER[findCaseStudyFieldPosition(fieldPath)];
  if (labelEntry !== undefined) return labelEntry[1];
  return fieldPath === "form" ? "The case study" : fieldPath;
}

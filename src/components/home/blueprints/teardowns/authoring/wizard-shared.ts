// TRANSPORT: props-only — types, step vocabulary and one pure parser. No React, no network.
//
// The teardown wizard's own shared vocabulary, on the `wizard-shared.ts` precedent in the R&D
// wizard: this is NOT a generic wizard engine and should not become one. The repo has two
// multi-step forms already (`upload-modal.tsx`, `new-idea-wizard-page.tsx`) and neither shares
// machinery with the other — they share a SHAPE, copied deliberately, which is cheaper than an
// abstraction three callers would each need an escape hatch from.

import { buildYoutubeBlueprintVideo } from "@/components/home/blueprints/authoring/youtube-link-field";
import {
  TeardownSubmissionDraftSchema,
  type TeardownAttestationClauseId,
  type TeardownSubmissionDraft,
} from "@/lib/blueprints/authoring.schemas";
import type {
  BlueprintProvenanceKind,
  TeardownDesignationSource,
  TeardownManufacturingFileKind,
  TeardownManufacturingMethod,
  TeardownMaterialClass,
  TeardownSubjectKind,
  TeardownSurveyMethod,
  TeardownUnitAcquisition,
} from "@/lib/blueprints/schemas";

/**
 * The five steps, in order.
 *
 * ⚠️ THE ORDER IS AN ARGUMENT, NOT A CONVENIENCE. Provenance comes FIRST because it is the question
 * that decides whether the rest should be filled in at all: somebody surveying a unit they were
 * handed under an NDA should meet that fact on screen one, not after twenty minutes of typing
 * material designations. The read surface makes the same call — the origin block renders above the
 * bill of materials, for the same reason.
 */
export const TEARDOWN_WIZARD_STEPS = [
  { id: "subject", label: "Subject and provenance" },
  { id: "media", label: "Media and files" },
  { id: "parts", label: "Parts" },
  { id: "materials", label: "Materials" },
  { id: "review", label: "Review and attest" },
] as const;

export type TeardownWizardStepId = (typeof TEARDOWN_WIZARD_STEPS)[number]["id"];

/** One material row while it is being edited. */
export interface MaterialDraftRow {
  /** Client-side only, for a stable React key. Never sent. */
  readonly rowId: string;
  readonly appliesToLabel: string;
  readonly designation: string;
  readonly designationSource: TeardownDesignationSource;
  readonly materialClass: TeardownMaterialClass;
  /** `""` means the publisher does not know, which becomes `null`. */
  readonly process: TeardownManufacturingMethod | "";
  readonly finish: string;
}

/** One part row while it is being edited. */
export interface PartDraftRow {
  readonly rowId: string;
  readonly label: string;
  readonly material: string;
}

/** One file row while it is being edited. */
export interface FileDraftRow {
  readonly rowId: string;
  readonly kind: TeardownManufacturingFileKind;
  readonly title: string;
  readonly url: string;
}

/**
 * THE WHOLE FORM, FLAT, AND EVERY SCALAR HELD AS A STRING.
 *
 * ⚠️ STRINGS, NOT PARSED VALUES, AND THAT IS THE `weight-band-editor.tsx` RULE. A half-typed date is
 * not a date and a half-typed number is `NaN`; holding either as its final type means the form has
 * to represent "invalid" inside a type that cannot express it. So the draft holds text, and
 * `collectTeardownSubmission` below parses it ONCE, at submit.
 *
 * FLAT rather than nested, so `onDraftChange({ title })` is a shallow merge and every step is a
 * dumb view over the same object — the shape both existing wizards use.
 */
export interface TeardownWizardDraft {
  readonly subjectKind: TeardownSubjectKind;
  readonly title: string;
  readonly summary: string;
  readonly subjectProductName: string;
  readonly unitAcquisition: TeardownUnitAcquisition;
  readonly surveyMethods: readonly TeardownSurveyMethod[];
  /** `YYYY-MM-DD` from a native date input; widened to an ISO instant at submit. */
  readonly surveyedOnDate: string;
  readonly provenanceKind: BlueprintProvenanceKind;
  readonly licenceName: string;
  readonly licenceUrl: string;
  readonly authorizationNote: string;
  readonly provenanceNotes: string;
  readonly walkthroughYoutubeUrl: string;
  readonly documents: readonly FileDraftRow[];
  readonly manufacturingFiles: readonly FileDraftRow[];
  readonly parts: readonly PartDraftRow[];
  readonly materials: readonly MaterialDraftRow[];
  readonly tagsText: string;
  readonly acceptedAttestationClauseIds: readonly TeardownAttestationClauseId[];
}

/** What every step component receives. Dumb view, one patch callback. */
export interface TeardownWizardStepProps {
  readonly draft: TeardownWizardDraft;
  readonly onDraftChange: (draftPatch: Partial<TeardownWizardDraft>) => void;
}

export const EMPTY_TEARDOWN_WIZARD_DRAFT: TeardownWizardDraft = {
  subjectKind: "existing_physical_product",
  title: "",
  summary: "",
  subjectProductName: "",
  unitAcquisition: "retail_purchase",
  surveyMethods: ["empirical_teardown"],
  surveyedOnDate: "",
  provenanceKind: "community_reverse_engineered",
  licenceName: "",
  licenceUrl: "",
  authorizationNote: "",
  provenanceNotes: "",
  walkthroughYoutubeUrl: "",
  documents: [],
  manufacturingFiles: [],
  parts: [],
  materials: [],
  tagsText: "",
  acceptedAttestationClauseIds: [],
};

// The YouTube link conversion and its usability check live in
// `@/components/home/blueprints/authoring/youtube-link-field`, shared with the launch form.

/** `""` → `null`, trimmed. The wizard's empty text field means "not stated", never an empty value. */
function toNullableText(rawValue: string): string | null {
  const trimmedValue = rawValue.trim();
  return trimmedValue === "" ? null : trimmedValue;
}

export type CollectTeardownSubmissionResult =
  | { readonly ok: true; readonly submission: TeardownSubmissionDraft }
  | { readonly ok: false; readonly fieldErrors: Readonly<Record<string, string[]>> };

/**
 * PARSE THE WHOLE DRAFT ONCE, AT SUBMIT.
 *
 * ⚠️ THE CONTRACT DOES THE VALIDATING, NOT THIS FUNCTION. Everything here is shape conversion —
 * strings to nulls, a date to an instant, comma text to a tag array — and then
 * `TeardownSubmissionDraftSchema.safeParse` decides. That is what keeps the wizard and the wire in
 * step: a rule added to the schema is enforced here for free, and a rule written here instead would
 * be a second opinion the backend never hears about.
 *
 * ⚠️ THE PROVENANCE ARMS ARE BUILT FROM `provenanceKind`, NOT FROM WHICHEVER FIELD HAS TEXT IN IT.
 * A publisher who types a licence, changes their mind and picks "manufacturer authorised" leaves
 * stale text in `licenceName`; sending it would trip the contract's three-arm refinement and show
 * them an error about a field they can no longer see. The kind decides, and the other arm's text is
 * dropped.
 */
export function collectTeardownSubmission(
  draft: TeardownWizardDraft,
): CollectTeardownSubmissionResult {
  const isLicensed = draft.provenanceKind === "licensed_open_source";
  const isManufacturerAuthorized = draft.provenanceKind === "authorized_by_manufacturer";

  const candidate = {
    subjectKind: draft.subjectKind,
    title: draft.title.trim(),
    summary: draft.summary.trim(),
    provenance: {
      kind: draft.provenanceKind,
      subjectProductName: draft.subjectProductName.trim(),
      unitAcquisition: draft.unitAcquisition,
      surveyMethods: draft.surveyMethods,
      // A date input gives `YYYY-MM-DD`; the contract wants an instant. Midday UTC rather than
      // midnight, so a reader west of UTC does not see the day before the one that was picked.
      surveyedAt: draft.surveyedOnDate === "" ? "" : `${draft.surveyedOnDate}T12:00:00.000Z`,
      licence: isLicensed ? { name: draft.licenceName.trim(), url: draft.licenceUrl.trim() } : null,
      authorizationNote: isManufacturerAuthorized ? toNullableText(draft.authorizationNote) : null,
      // The publisher attests at submit, so the stamp is now. It is not a field they can type.
      attestationAcceptedAt: new Date().toISOString(),
      notes: toNullableText(draft.provenanceNotes),
    },
    materials: draft.materials.map((materialRow, materialIndex) => ({
      // Ids are the wire's, not the editor's: the row id exists only to key React.
      id: `mat-${materialIndex + 1}`,
      appliesToLabel: materialRow.appliesToLabel.trim(),
      partId: null,
      designation: materialRow.designation.trim(),
      designationSource: materialRow.designationSource,
      materialClass: materialRow.materialClass,
      process: materialRow.process === "" ? null : materialRow.process,
      finish: toNullableText(materialRow.finish),
      // ⚠️ ALWAYS EMPTY FROM THIS WIZARD, and that is deliberate rather than unfinished. An element
      // table is a lab result; offering a form for one would invite somebody to type numbers they
      // did not measure, which is the single failure `designationSource` exists to prevent. It
      // arrives with a file upload from an analyser, not with a text input (`todo.md`).
      elements: [],
    })),
    parts: draft.parts.map((partRow) => ({
      label: partRow.label.trim(),
      material: partRow.material.trim(),
    })),
    documents: draft.documents.map((fileRow) => ({
      kind: fileRow.kind,
      title: fileRow.title.trim(),
      url: fileRow.url.trim(),
    })),
    manufacturingFiles: draft.manufacturingFiles.map((fileRow) => ({
      kind: fileRow.kind,
      title: fileRow.title.trim(),
      url: fileRow.url.trim(),
    })),
    walkthroughVideo: buildYoutubeBlueprintVideo(draft.walkthroughYoutubeUrl),
    tags: draft.tagsText
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag !== ""),
    acceptedAttestationClauseIds: draft.acceptedAttestationClauseIds,
  };

  const parsed = TeardownSubmissionDraftSchema.safeParse(candidate);
  if (parsed.success) return { ok: true, submission: parsed.data };

  // Zod's flat field map, keyed by dotted path so a nested provenance error names the field the
  // publisher can actually see rather than "provenance".
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of parsed.error.issues) {
    const fieldPath = issue.path.join(".") || "form";
    fieldErrors[fieldPath] = [...(fieldErrors[fieldPath] ?? []), issue.message];
  }
  return { ok: false, fieldErrors };
}

/** Where a single, non-repeating field lives: the label the publisher sees and the step holding it. */
interface WizardFieldLocation {
  readonly label: string;
  readonly stepId: TeardownWizardStepId;
}

/**
 * Every scalar path the contract can name, keyed by the dotted path `collectTeardownSubmission`
 * builds. The labels are the on-screen labels, word for word, so a publisher can find the field by
 * reading.
 */
const SCALAR_FIELD_LOCATIONS = new Map<string, WizardFieldLocation>([
  ["subjectKind", { label: "What are you surveying?", stepId: "subject" }],
  ["title", { label: "Title", stepId: "subject" }],
  ["summary", { label: "Summary", stepId: "subject" }],
  ["provenance", { label: "Do you have permission from anyone?", stepId: "subject" }],
  ["provenance.kind", { label: "Do you have permission from anyone?", stepId: "subject" }],
  ["provenance.subjectProductName", { label: "The unit you took apart", stepId: "subject" }],
  ["provenance.unitAcquisition", { label: "How you got the unit", stepId: "subject" }],
  ["provenance.surveyMethods", { label: "How you looked inside", stepId: "subject" }],
  ["provenance.surveyedAt", { label: "When you surveyed it", stepId: "subject" }],
  ["provenance.licence", { label: "Licence", stepId: "subject" }],
  ["provenance.licence.name", { label: "Licence name", stepId: "subject" }],
  ["provenance.licence.url", { label: "Link to the licence", stepId: "subject" }],
  [
    "provenance.authorizationNote",
    { label: "Who authorised it, and on what terms", stepId: "subject" },
  ],
  ["provenance.notes", { label: "Anything you want to qualify", stepId: "subject" }],
  ["provenance.attestationAcceptedAt", { label: "Before you submit", stepId: "review" }],
  ["walkthroughVideo", { label: "YouTube link", stepId: "media" }],
  ["tags", { label: "Tags", stepId: "review" }],
  ["acceptedAttestationClauseIds", { label: "Before you submit", stepId: "review" }],
]);

/** A repeatable list: what one row is called, where the list lives, and its fields' labels. */
interface WizardRowListLocation {
  readonly rowNoun: string;
  readonly stepId: TeardownWizardStepId;
  readonly fieldLabels: ReadonlyMap<string, string>;
}

const ROW_LIST_LOCATIONS = new Map<string, WizardRowListLocation>([
  [
    "documents",
    {
      rowNoun: "Document",
      stepId: "media",
      fieldLabels: new Map([
        ["title", "Name"],
        ["kind", "Kind"],
        ["url", "Link"],
      ]),
    },
  ],
  [
    "manufacturingFiles",
    {
      rowNoun: "Fabrication file",
      stepId: "media",
      fieldLabels: new Map([
        ["title", "Name"],
        ["kind", "Kind"],
        ["url", "Link"],
      ]),
    },
  ],
  [
    "parts",
    {
      rowNoun: "Part",
      stepId: "parts",
      fieldLabels: new Map([
        ["label", "Part"],
        ["material", "What it seems to be made of"],
      ]),
    },
  ],
  [
    "materials",
    {
      rowNoun: "Material",
      stepId: "materials",
      fieldLabels: new Map([
        ["appliesToLabel", "What it is the material of"],
        ["designation", "Designation"],
        ["designationSource", "How you know"],
        ["materialClass", "What kind of material"],
        ["process", "How the part was made"],
        ["finish", "Surface finish"],
      ]),
    },
  ],
]);

function describeStep(stepId: TeardownWizardStepId): string {
  return `step ${TEARDOWN_WIZARD_STEPS.findIndex((step) => step.id === stepId) + 1}`;
}

/**
 * A contract path, as the words a publisher can act on: the field's own label and the step it is on.
 *
 * ⚠️ IT EXISTS BECAUSE THE ERROR BOX PRINTED THE RAW PATH. Submitting the empty form showed
 * "provenance.surveyedAt: Say when you surveyed the unit…" — the message was written for a founder,
 * and the name in front of it was written for the schema. "When you surveyed it, step 1" says which
 * box to fill and where it is.
 *
 * AN UNMAPPED PATH FALLS BACK TO ITSELF rather than to nothing, so a rule added to the contract
 * without a label here still tells the publisher something, and the gap is visible in review.
 */
export function describeTeardownFieldPath(fieldPath: string): string {
  const scalarLocation = SCALAR_FIELD_LOCATIONS.get(fieldPath);
  if (scalarLocation !== undefined) {
    return `${scalarLocation.label}, ${describeStep(scalarLocation.stepId)}`;
  }

  const [listKey = "", rowIndexText = "", fieldKey] = fieldPath.split(".");
  const rowListLocation = ROW_LIST_LOCATIONS.get(listKey);
  const rowIndex = Number.parseInt(rowIndexText, 10);
  if (rowListLocation === undefined || Number.isNaN(rowIndex)) {
    return fieldPath === "form" ? "The submission" : fieldPath;
  }

  const rowName = `${rowListLocation.rowNoun} ${rowIndex + 1}`;
  const fieldLabel = fieldKey === undefined ? undefined : rowListLocation.fieldLabels.get(fieldKey);
  return fieldLabel === undefined
    ? `${rowName}, ${describeStep(rowListLocation.stepId)}`
    : `${rowName}, ${fieldLabel}, ${describeStep(rowListLocation.stepId)}`;
}

/** The step a contract path belongs to, or `null` for a path no step owns. */
function resolveTeardownFieldStepId(fieldPath: string): TeardownWizardStepId | null {
  const scalarLocation = SCALAR_FIELD_LOCATIONS.get(fieldPath);
  if (scalarLocation !== undefined) return scalarLocation.stepId;

  const [listKey = ""] = fieldPath.split(".");
  return ROW_LIST_LOCATIONS.get(listKey)?.stepId ?? null;
}

/**
 * Orders two contract paths by the step they are on, for sorting the error list.
 *
 * ⚠️ THE CONTRACT REPORTS IN SCHEMA ORDER, NOT STEP ORDER. An empty submission listed a step-3 part
 * before a step-2 document and put "When you surveyed it, step 1" last, so a publisher working
 * through the list jumped forwards and back. `Array.prototype.sort` is stable, so two errors on the
 * same step keep the order the contract gave them; an unowned path sorts after every step.
 */
export function compareTeardownFieldPathsByStep(
  firstFieldPath: string,
  secondFieldPath: string,
): number {
  const findStepPosition = (fieldPath: string): number => {
    const stepId = resolveTeardownFieldStepId(fieldPath);
    return stepId === null
      ? TEARDOWN_WIZARD_STEPS.length
      : TEARDOWN_WIZARD_STEPS.findIndex((step) => step.id === stepId);
  };

  return findStepPosition(firstFieldPath) - findStepPosition(secondFieldPath);
}

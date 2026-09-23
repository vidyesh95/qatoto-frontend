// TRANSPORT: props-only — types, step vocabulary and one pure parser. No React, no network.
//
// The teardown wizard's own shared vocabulary, on the `wizard-shared.ts` precedent in the R&D
// wizard: this is NOT a generic wizard engine and should not become one. The repo has two
// multi-step forms already (`upload-modal.tsx`, `new-idea-wizard-page.tsx`) and neither shares
// machinery with the other — they share a SHAPE, copied deliberately, which is cheaper than an
// abstraction three callers would each need an escape hatch from.

import { z } from "zod";

import { buildYoutubeBlueprintVideo } from "@/components/home/blueprints/authoring/youtube-link-field";
import {
  TEARDOWN_ATTESTATION_CLAUSE_IDS,
  TeardownSubmissionDraftSchema,
  type TeardownAttestationClauseId,
  type TeardownSubmissionDraft,
} from "@/lib/blueprints/authoring.schemas";
import {
  BLUEPRINT_DOCUMENT_KINDS,
  BLUEPRINT_PROVENANCE_KINDS,
  TEARDOWN_DESIGNATION_SOURCES,
  TEARDOWN_MANUFACTURING_FILE_KINDS,
  TEARDOWN_MANUFACTURING_METHODS,
  TEARDOWN_MATERIAL_CLASSES,
  TEARDOWN_SUBJECT_KINDS,
  TEARDOWN_SURVEY_METHODS,
  TEARDOWN_UNIT_ACQUISITIONS,
  type BlueprintDocumentKind,
  type BlueprintProvenanceKind,
  type TeardownDesignationSource,
  type TeardownManufacturingFileKind,
  type TeardownManufacturingMethod,
  type TeardownMaterialClass,
  type TeardownSubjectKind,
  type TeardownSurveyMethod,
  type TeardownUnitAcquisition,
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

export const MaterialDraftRowSchema = z.object({
  rowId: z.string(),
  appliesToLabel: z.string(),
  designation: z.string(),
  designationSource: z.enum(TEARDOWN_DESIGNATION_SOURCES),
  materialClass: z.enum(TEARDOWN_MATERIAL_CLASSES),
  process: z.union([z.enum(TEARDOWN_MANUFACTURING_METHODS), z.literal("")]),
  finish: z.string(),
});

/** One part row while it is being edited. */
export interface PartDraftRow {
  readonly rowId: string;
  readonly label: string;
  readonly material: string;
}

export const PartDraftRowSchema = z.object({
  rowId: z.string(),
  label: z.string(),
  material: z.string(),
});

/**
 * One file row while it is being edited — in TWO shapes, because there are two vocabularies.
 */
export interface DocumentDraftRow {
  readonly rowId: string;
  readonly kind: BlueprintDocumentKind;
  readonly title: string;
  readonly source?: "pasted_link" | "uploaded";
  readonly url?: string;
  readonly uploadId?: string;
  readonly fileName?: string;
}

export const DocumentDraftRowSchema = z.object({
  rowId: z.string(),
  kind: z.enum(BLUEPRINT_DOCUMENT_KINDS),
  title: z.string(),
  source: z.enum(["pasted_link", "uploaded"]).optional(),
  url: z.string().optional(),
  uploadId: z.string().optional(),
  fileName: z.string().optional(),
});

export interface ManufacturingFileDraftRow {
  readonly rowId: string;
  readonly kind: TeardownManufacturingFileKind;
  readonly title: string;
  readonly source?: "pasted_link" | "uploaded";
  readonly url?: string;
  readonly uploadId?: string;
  readonly fileName?: string;
}

export const ManufacturingFileDraftRowSchema = z.object({
  rowId: z.string(),
  kind: z.enum(TEARDOWN_MANUFACTURING_FILE_KINDS),
  title: z.string(),
  source: z.enum(["pasted_link", "uploaded"]).optional(),
  url: z.string().optional(),
  uploadId: z.string().optional(),
  fileName: z.string().optional(),
});

/**
 * THE WHOLE FORM, FLAT, AND EVERY SCALAR HELD AS A STRING.
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
  readonly documents: readonly DocumentDraftRow[];
  readonly manufacturingFiles: readonly ManufacturingFileDraftRow[];
  readonly parts: readonly PartDraftRow[];
  readonly materials: readonly MaterialDraftRow[];
  readonly tagsText: string;
  readonly acceptedAttestationClauseIds: readonly TeardownAttestationClauseId[];
}

export const TeardownWizardDraftSchema: z.ZodType<TeardownWizardDraft> = z.object({
  subjectKind: z.enum(TEARDOWN_SUBJECT_KINDS),
  title: z.string(),
  summary: z.string(),
  subjectProductName: z.string(),
  unitAcquisition: z.enum(TEARDOWN_UNIT_ACQUISITIONS),
  surveyMethods: z.array(z.enum(TEARDOWN_SURVEY_METHODS)),
  surveyedOnDate: z.string(),
  provenanceKind: z.enum(BLUEPRINT_PROVENANCE_KINDS),
  licenceName: z.string(),
  licenceUrl: z.string(),
  authorizationNote: z.string(),
  provenanceNotes: z.string(),
  walkthroughYoutubeUrl: z.string(),
  documents: z.array(DocumentDraftRowSchema),
  manufacturingFiles: z.array(ManufacturingFileDraftRowSchema),
  parts: z.array(PartDraftRowSchema),
  materials: z.array(MaterialDraftRowSchema),
  tagsText: z.string(),
  acceptedAttestationClauseIds: z.array(z.enum(TEARDOWN_ATTESTATION_CLAUSE_IDS)),
});

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
    materials: draft.materials.map((materialRow) => ({
      // ⚠️ NO `id`. There is none on the wire at all: `teardown_material.id` is a global primary key
      // with no default, so an editor-minted `mat-1` would collide with the second author ever to
      // submit two materials. The server mints one when a moderator publishes. The row id here
      // exists only to key React.
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
    documents: draft.documents.map((fileRow) =>
      fileRow.source === "uploaded" && fileRow.uploadId
        ? {
            source: "uploaded" as const,
            kind: fileRow.kind,
            title: fileRow.title.trim(),
            uploadId: fileRow.uploadId,
          }
        : {
            source: "pasted_link" as const,
            kind: fileRow.kind,
            title: fileRow.title.trim(),
            url: (fileRow.url ?? "").trim(),
          },
    ),
    manufacturingFiles: draft.manufacturingFiles.map((fileRow) =>
      fileRow.source === "uploaded" && fileRow.uploadId
        ? {
            source: "uploaded" as const,
            kind: fileRow.kind,
            title: fileRow.title.trim(),
            uploadId: fileRow.uploadId,
          }
        : {
            source: "pasted_link" as const,
            kind: fileRow.kind,
            title: fileRow.title.trim(),
            url: (fileRow.url ?? "").trim(),
          },
    ),
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
  /*
   * ⚠️ THE FOUR BARE LIST PATHS, WHICH LOOK REDUNDANT BESIDE `ROW_LIST_LOCATIONS` AND ARE NOT.
   * A per-row issue arrives as `documents.0.kind` and that map resolves it; a LIST-LEVEL issue —
   * which is what an array `.max()` produces — arrives as bare `documents`, matches no row pattern,
   * and would be printed to the publisher as the raw path. These four are checked first.
   */
  ["documents", { label: "Documents", stepId: "media" }],
  ["manufacturingFiles", { label: "Fabrication files", stepId: "media" }],
  ["parts", { label: "Parts", stepId: "parts" }],
  ["materials", { label: "Materials", stepId: "materials" }],
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

function resolveTeardownFieldStepPosition(fieldPath: string): number {
  const stepId = resolveTeardownFieldStepId(fieldPath);
  return stepId === null
    ? TEARDOWN_WIZARD_STEPS.length
    : TEARDOWN_WIZARD_STEPS.findIndex((step) => step.id === stepId);
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
  return (
    resolveTeardownFieldStepPosition(firstFieldPath) -
    resolveTeardownFieldStepPosition(secondFieldPath)
  );
}

/**
 * Reconstitutes an editing draft from a stored submission draft (e.g. for rejected resubmission).
 */
export function teardownSubmissionDraftToWizardDraft(
  submission: TeardownSubmissionDraft,
): TeardownWizardDraft {
  const isLicensed = submission.provenance.kind === "licensed_open_source";
  const isManufacturerAuthorized = submission.provenance.kind === "authorized_by_manufacturer";

  return {
    subjectKind: submission.subjectKind,
    title: submission.title,
    summary: submission.summary,
    subjectProductName: submission.provenance.subjectProductName,
    unitAcquisition: submission.provenance.unitAcquisition,
    surveyMethods: submission.provenance.surveyMethods,
    surveyedOnDate: submission.provenance.surveyedAt
      ? submission.provenance.surveyedAt.slice(0, 10)
      : "",
    provenanceKind: submission.provenance.kind,
    licenceName:
      isLicensed && submission.provenance.licence ? submission.provenance.licence.name : "",
    licenceUrl:
      isLicensed && submission.provenance.licence ? submission.provenance.licence.url : "",
    authorizationNote: isManufacturerAuthorized
      ? (submission.provenance.authorizationNote ?? "")
      : "",
    provenanceNotes: submission.provenance.notes ?? "",
    walkthroughYoutubeUrl: submission.walkthroughVideo
      ? `https://www.youtube.com/watch?v=${submission.walkthroughVideo.youtubeVideoId}`
      : "",
    documents: submission.documents.map((doc, index) => ({
      rowId: `doc-${index + 1}`,
      kind: doc.kind,
      title: doc.title,
      source: "uploadId" in doc ? ("uploaded" as const) : ("pasted_link" as const),
      url: "url" in doc ? doc.url : "",
      uploadId: "uploadId" in doc ? doc.uploadId : undefined,
    })),
    manufacturingFiles: submission.manufacturingFiles.map((mfg, index) => ({
      rowId: `mfg-${index + 1}`,
      kind: mfg.kind,
      title: mfg.title,
      source: "uploadId" in mfg ? ("uploaded" as const) : ("pasted_link" as const),
      url: "url" in mfg ? mfg.url : "",
      uploadId: "uploadId" in mfg ? mfg.uploadId : undefined,
    })),
    parts: submission.parts.map((part, index) => ({
      rowId: `part-${index + 1}`,
      label: part.label,
      material: part.material,
    })),
    materials: submission.materials.map((mat, index) => ({
      rowId: `mat-${index + 1}`,
      appliesToLabel: mat.appliesToLabel,
      designation: mat.designation,
      designationSource: mat.designationSource,
      materialClass: mat.materialClass,
      process: mat.process ?? "",
      finish: mat.finish ?? "",
    })),
    tagsText: submission.tags.join(", "),
    acceptedAttestationClauseIds: [],
  };
}

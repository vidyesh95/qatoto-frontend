// TRANSPORT: props-only — types, step vocabulary and one pure parser. No React, no network.
//
// The teardown wizard's own shared vocabulary, on the `wizard-shared.ts` precedent in the R&D
// wizard: this is NOT a generic wizard engine and should not become one. The repo has two
// multi-step forms already (`upload-modal.tsx`, `new-idea-wizard-page.tsx`) and neither shares
// machinery with the other — they share a SHAPE, copied deliberately, which is cheaper than an
// abstraction three callers would each need an escape hatch from.

import {
  TeardownSubmissionDraftSchema,
  type TeardownAttestationClauseId,
  type TeardownSubmissionDraft,
} from "@/lib/blueprints/authoring.schemas";
import { extractYoutubeVideoId } from "@/lib/youtube";
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

/**
 * A pasted YouTube link becomes the video arm, or `null` when the field is empty.
 *
 * ⚠️ AN ID ON THE WIRE, NOT A URL — `extractYoutubeVideoId` at the boundary, exactly as
 * `create-studio-page.tsx` does, so a malformed link fails here rather than rendering as a blank box
 * later.
 *
 * ⚠️ THIS FUNCTION CANNOT REPORT A BAD LINK AND MUST NOT TRY. It returns `null` both for an empty
 * field and for text that does not parse, and the contract never sees the raw string, so a typo
 * would otherwise drop somebody's video silently. `isWalkthroughLinkUsable` below is what the step
 * checks before letting the publisher move on; keeping the two apart is what lets this stay total.
 *
 * ⚠️ `durationSeconds: null`, ALWAYS, AND THE WIZARD NEVER ASKS. Neither side of the wire can measure
 * it: the backend's only outbound YouTube call is oEmbed, which returns no duration. A typed runtime
 * would be a guess rendered as a badge over a video of some other length. `posterUrl` is DERIVED from
 * the id with no network call, `hqdefault` because `maxresdefault` 404s on non-HD uploads.
 */
function buildWalkthroughVideo(
  walkthroughYoutubeUrl: string,
): { source: "youtube"; youtubeVideoId: string; posterUrl: string; durationSeconds: null } | null {
  const youtubeVideoId = extractYoutubeVideoId(walkthroughYoutubeUrl);
  if (youtubeVideoId === null) return null;

  return {
    source: "youtube",
    youtubeVideoId,
    posterUrl: `https://i.ytimg.com/vi/${youtubeVideoId}/hqdefault.jpg`,
    durationSeconds: null,
  };
}

/**
 * Whether the walkthrough field is in a state the publisher can submit from.
 *
 * TRUE FOR EMPTY — most teardowns have no video and the field is optional. FALSE only for text that
 * is present and does not parse, which is the one case a step must surface: silently dropping a link
 * somebody pasted would lose their video with no explanation.
 */
export function isWalkthroughLinkUsable(walkthroughYoutubeUrl: string): boolean {
  return (
    walkthroughYoutubeUrl.trim() === "" || extractYoutubeVideoId(walkthroughYoutubeUrl) !== null
  );
}

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
    walkthroughVideo: buildWalkthroughVideo(draft.walkthroughYoutubeUrl),
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

// TRANSPORT: props-only — the launch form's draft shape, one pure collector, the field labels, the
// server's refusals as a union, and the write-up image helpers. No React, no network.
//
// The launch form's shared vocabulary, on the `wizard-shared.ts` precedent: the form holds text, and
// `collectShowcaseSubmission` converts it ONCE, at post time, then lets the contract decide.

import { z } from "zod";

import type { BlueprintDifficulty, BlueprintWriteUpImage } from "@/lib/blueprints/schemas";
import {
  ShowcaseSubmissionDraftSchema,
  type ShowcaseLaunchStatementId,
  type ShowcaseSubmissionDraft,
} from "@/lib/blueprints/showcase-authoring.schemas";
import type { ApiError } from "@/lib/http";
import { formatMegabytes, type ImageFileCheckFailure } from "@/lib/image-file-check";

/** One team row while it is being edited. `rowId` is client-only, for a stable React key. */
export interface TeamMemberDraftRow {
  readonly rowId: string;
  readonly displayName: string;
  readonly handle: string;
  readonly role: string;
}

/**
 * THE WHOLE FORM, FLAT, EVERY SCALAR HELD AS TEXT, for the `weight-band-editor.tsx` reason: a
 * half-typed cost is not a number and a half-picked date is not a date. The heading image is not
 * here; it is a `File` held by `useHeadingImagePick`, because it never becomes JSON.
 */
export interface ShowcaseLaunchFormDraft {
  readonly title: string;
  readonly tagline: string;
  readonly summary: string;
  /** Markdown, as typed. YouTube links and images live inside it. */
  readonly writeUp: string;
  readonly callToActionLabel: string;
  readonly callToActionUrl: string;
  readonly teamRows: readonly TeamMemberDraftRow[];
  /** `""` means "not built from a teardown published here". */
  readonly builtFromBlueprintSlug: string;
  /** `YYYY-MM-DD` from a native date input, or `""` for "today". */
  readonly launchedOnDate: string;
  /** `""` until chosen. There is deliberately no default. */
  readonly difficulty: BlueprintDifficulty | "";
  readonly costMinimumText: string;
  readonly costMaximumText: string;
  readonly tagsText: string;
  readonly acceptedLaunchStatementIds: readonly ShowcaseLaunchStatementId[];
  /**
   * Every image uploaded into the write-up this session, with the size the server measured.
   *
   * ⚠️ NEVER COPIED INTO THE DRAFT. The contract is `.strict()` and has no such key: the server finds
   * the images by reading the Markdown, and these exist only so the preview can reserve each image's
   * box the way the published page does. An image deleted from the text stays listed here, which is
   * harmless: the preview only looks up addresses the Markdown still contains.
   */
  readonly uploadedWriteUpImages: readonly BlueprintWriteUpImage[];
}

export const EMPTY_SHOWCASE_LAUNCH_FORM_DRAFT: ShowcaseLaunchFormDraft = {
  title: "",
  tagline: "",
  summary: "",
  writeUp: "",
  callToActionLabel: "",
  callToActionUrl: "",
  teamRows: [],
  builtFromBlueprintSlug: "",
  launchedOnDate: "",
  difficulty: "",
  costMinimumText: "",
  costMaximumText: "",
  tagsText: "",
  acceptedLaunchStatementIds: [],
  uploadedWriteUpImages: [],
};

/** Comma-separated tags, trimmed, empties dropped. Shared by the collector and the live preview. */
export function splitTagsText(tagsText: string): string[] {
  return tagsText
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag !== "");
}

/** `""` → `null`, trimmed. An empty field means "not stated", never an empty value. */
function toNullableText(rawValue: string): string | null {
  const trimmedValue = rawValue.trim();
  return trimmedValue === "" ? null : trimmedValue;
}

/** The instant a picked date stands for: midday UTC, so a reader west of UTC sees the same day. */
export function buildMiddayInstantForDate(launchedOnDate: string): string {
  return `${launchedOnDate}T12:00:00.000Z`;
}

/** `YYYY-MM-DD` of an instant in the browser's own time zone. */
function formatLocalDate(instant: Date): string {
  const monthNumber = String(instant.getMonth() + 1).padStart(2, "0");
  const dayNumber = String(instant.getDate()).padStart(2, "0");
  return `${instant.getFullYear()}-${monthNumber}-${dayNumber}`;
}

/**
 * The launch instant the form means.
 *
 * EMPTY MEANS NOW, read from the clock passed in at post time, never during render.
 *
 * ⚠️ TODAY IS CLAMPED TO NOW, OTHER DAYS ARE NOT. For somebody east of UTC who picks today in the
 * morning, midday UTC is still hours away, and the contract would refuse a launch that went out this
 * morning as "in the future". Clamping every date to now would hide a genuinely future date instead
 * of refusing it, so only today's date is clamped.
 */
function buildLaunchedAtInstant(launchedOnDate: string, postedAt: Date): string {
  if (launchedOnDate === "") return postedAt.toISOString();

  const middayInstantMs = Date.parse(buildMiddayInstantForDate(launchedOnDate));
  if (Number.isNaN(middayInstantMs)) return launchedOnDate;

  if (launchedOnDate === formatLocalDate(postedAt)) {
    return new Date(Math.min(middayInstantMs, postedAt.getTime())).toISOString();
  }
  return new Date(middayInstantMs).toISOString();
}

const DOLLAR_AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

/** Typed dollars to integer cents. Anything unreadable becomes `NaN`, which the contract names. */
function parseDollarsToCents(dollarsText: string): number {
  const trimmedDollarsText = dollarsText.trim().replace(/^\$/, "").replaceAll(",", "");
  return DOLLAR_AMOUNT_PATTERN.test(trimmedDollarsText)
    ? Math.round(Number(trimmedDollarsText) * 100)
    : Number.NaN;
}

/** Both empty is "nobody costed it" (`null`); one side filled is a half range the contract refuses. */
function buildCostRangeCandidate(costMinimumText: string, costMaximumText: string) {
  if (costMinimumText.trim() === "" && costMaximumText.trim() === "") return null;
  return {
    minimumInCents: parseDollarsToCents(costMinimumText),
    maximumInCents: parseDollarsToCents(costMaximumText),
    currency: "USD",
  };
}

export type CollectShowcaseSubmissionResult =
  | { readonly ok: true; readonly submission: ShowcaseSubmissionDraft }
  | { readonly ok: false; readonly fieldErrors: Readonly<Record<string, string[]>> };

/**
 * PARSE THE WHOLE FORM ONCE, WHEN THE MAKER PRESSES POST.
 *
 * ⚠️ THE CONTRACT DOES THE VALIDATING, NOT THIS FUNCTION. Everything here is shape conversion (text
 * to null, a date to an instant, dollars to cents, "@amara" to "amara"), then
 * `ShowcaseSubmissionDraftSchema.safeParse` decides, so a rule added to the schema is enforced here
 * for free.
 *
 * ⚠️ CALL IT FROM A CLICK HANDLER ONLY. It reads the clock, which is a build error during a server
 * prerender under `cacheComponents`.
 */
export function collectShowcaseSubmission(
  formDraft: ShowcaseLaunchFormDraft,
): CollectShowcaseSubmissionResult {
  const postedAt = new Date();
  const isCallToActionEmpty =
    formDraft.callToActionLabel.trim() === "" && formDraft.callToActionUrl.trim() === "";

  const candidate = {
    title: formDraft.title.trim(),
    tagline: formDraft.tagline.trim(),
    summary: formDraft.summary.trim(),
    writeUp: toNullableText(formDraft.writeUp),
    launchedAt: buildLaunchedAtInstant(formDraft.launchedOnDate, postedAt),
    difficulty: formDraft.difficulty,
    billOfMaterialsCostRange: buildCostRangeCandidate(
      formDraft.costMinimumText,
      formDraft.costMaximumText,
    ),
    tags: splitTagsText(formDraft.tagsText),
    team: formDraft.teamRows.map((teamRow) => ({
      displayName: teamRow.displayName.trim(),
      handle: teamRow.handle.trim().replace(/^@+/, ""),
      role: teamRow.role.trim(),
    })),
    builtFromBlueprintSlug:
      formDraft.builtFromBlueprintSlug === "" ? null : formDraft.builtFromBlueprintSlug,
    callToAction: isCallToActionEmpty
      ? null
      : { label: formDraft.callToActionLabel.trim(), url: formDraft.callToActionUrl.trim() },
    acceptedLaunchStatementIds: formDraft.acceptedLaunchStatementIds,
  };

  const parsed = ShowcaseSubmissionDraftSchema.safeParse(candidate);
  if (parsed.success) return { ok: true, submission: parsed.data };

  const fieldErrors: Record<string, string[]> = {};
  for (const issue of parsed.error.issues) {
    const fieldPath = issue.path.join(".") || "form";
    fieldErrors[fieldPath] = [...(fieldErrors[fieldPath] ?? []), issue.message];
  }
  return { ok: false, fieldErrors };
}

/**
 * The on-screen label for every path the contract can name, IN THE ORDER THE PAGE ASKS.
 *
 * Same fix as the teardown wizard and the rights-claim composer: the error box names the field a
 * maker can see, and lists problems top to bottom the way the form reads. `headingImage` is the one
 * client-only entry; the contract never sees the file.
 */
const SHOWCASE_FIELD_LABELS_IN_PAGE_ORDER: readonly (readonly [string, string])[] = [
  ["title", "Name"],
  ["tagline", "One-line pitch"],
  ["summary", "What is it?"],
  ["headingImage", "Heading image"],
  ["writeUp", "Write-up"],
  ["callToAction", "Link"],
  ["team", "Team"],
  ["builtFromBlueprintSlug", "Built from a teardown"],
  ["launchedAt", "Launch date"],
  ["difficulty", "How hard to build again"],
  ["billOfMaterialsCostRange", "Parts cost"],
  ["tags", "Tags"],
  ["acceptedLaunchStatementIds", "Before you post"],
];

const NESTED_FIELD_LABELS = new Map<string, string>([
  // The server's key for a draft it could not read at all, which only a broken client sends.
  ["draft", "The launch"],
  ["callToAction.label", "Link label"],
  ["callToAction.url", "Link address"],
  ["billOfMaterialsCostRange.minimumInCents", "Parts cost, lowest"],
  ["billOfMaterialsCostRange.maximumInCents", "Parts cost, highest"],
]);

const TEAM_MEMBER_FIELD_LABELS = new Map<string, string>([
  ["displayName", "Name"],
  ["handle", "Handle"],
  ["role", "Role"],
]);

/** Where a path's field sits on the page; a nested path sits with its parent. */
export function findShowcaseFieldPosition(fieldPath: string): number {
  const [topLevelKey] = fieldPath.split(".");
  const position = SHOWCASE_FIELD_LABELS_IN_PAGE_ORDER.findIndex(
    ([fieldKey]) => fieldKey === topLevelKey,
  );
  return position === -1 ? SHOWCASE_FIELD_LABELS_IN_PAGE_ORDER.length : position;
}

/** A contract path as the words a maker can act on. An unmapped path falls back to itself. */
export function describeShowcaseFieldPath(fieldPath: string): string {
  const nestedFieldLabel = NESTED_FIELD_LABELS.get(fieldPath);
  if (nestedFieldLabel !== undefined) return nestedFieldLabel;

  const [topLevelKey = "", rowIndexText = "", fieldKey] = fieldPath.split(".");
  const teamRowIndex = Number.parseInt(rowIndexText, 10);
  if (topLevelKey === "team" && !Number.isNaN(teamRowIndex)) {
    const teamFieldLabel =
      fieldKey === undefined ? undefined : TEAM_MEMBER_FIELD_LABELS.get(fieldKey);
    return teamFieldLabel === undefined
      ? `Team member ${teamRowIndex + 1}`
      : `Team member ${teamRowIndex + 1}, ${teamFieldLabel}`;
  }

  const labelEntry = SHOWCASE_FIELD_LABELS_IN_PAGE_ORDER[findShowcaseFieldPosition(fieldPath)];
  if (labelEntry !== undefined) return labelEntry[1];
  return fieldPath === "form" ? "The launch" : fieldPath;
}

/**
 * EVERY WAY THE SERVER CAN REFUSE A LAUNCH, as a union the composer renders exhaustively.
 *
 * ⚠️ BRANCHED ON THE HTTP STATUS, because the house envelope carries no machine error code. Two 409s
 * look alike and mean different things: a name that is taken carries `errors.title`; the idempotency
 * middleware's "this key was already used for a different request" carries nothing. The first is the
 * maker's to fix by renaming; the second means a launch from this attempt may already exist.
 *
 * ⚠️ A 422 FROM THE SERVER NAMES TOP-LEVEL FIELDS ONLY (`team`, not `team.0.handle`), because the
 * backend flattens its validation errors. The summary box names the field; a per-row slot stays empty.
 */
export type ShowcaseLaunchRefusal =
  | { readonly kind: "signInRequired" }
  | { readonly kind: "accountIncomplete"; readonly message: string }
  | { readonly kind: "launchNameConflict"; readonly message: string }
  | { readonly kind: "submissionAlreadyReceived" }
  | { readonly kind: "headingImageTooLarge" }
  | { readonly kind: "headingImageRefused"; readonly message: string }
  | {
      readonly kind: "fieldsRefused";
      readonly fieldErrors: Readonly<Record<string, string[]>>;
    }
  | { readonly kind: "rateLimited" }
  | { readonly kind: "replyUnreadable" }
  | { readonly kind: "unexpected"; readonly code: string; readonly message: string };

/**
 * `fieldErrors` IS PARSED, NOT TRUSTED. `http.ts` hands the envelope's `errors` over without
 * checking its shape, so a malformed one becomes "no field errors" here rather than a crash.
 */
const RefusalFieldErrorsSchema = z.record(z.string(), z.array(z.string()));

export function classifyShowcaseLaunchRefusal(apiError: ApiError): ShowcaseLaunchRefusal {
  const parsedFieldErrors = RefusalFieldErrorsSchema.safeParse(apiError.fieldErrors ?? {});
  const fieldErrors: Readonly<Record<string, string[]>> = parsedFieldErrors.success
    ? parsedFieldErrors.data
    : {};

  switch (apiError.code) {
    case "401":
      return { kind: "signInRequired" };
    case "403":
      return { kind: "accountIncomplete", message: apiError.message };
    case "409": {
      const titleMessages = fieldErrors["title"] ?? [];
      return titleMessages.length > 0
        ? { kind: "launchNameConflict", message: titleMessages.join(" ") }
        : { kind: "submissionAlreadyReceived" };
    }
    // By status alone, because a 413 from a proxy may arrive without a JSON body.
    case "413":
      return { kind: "headingImageTooLarge" };
    case "422": {
      const headingImageMessages = fieldErrors["headingImage"] ?? [];
      if (headingImageMessages.length > 0) {
        return { kind: "headingImageRefused", message: headingImageMessages.join(" ") };
      }
      return Object.keys(fieldErrors).length > 0
        ? { kind: "fieldsRefused", fieldErrors }
        : { kind: "unexpected", code: apiError.code, message: apiError.message };
    }
    case "429":
      return { kind: "rateLimited" };
    case "PARSE":
      return { kind: "replyUnreadable" };
    default:
      return { kind: "unexpected", code: apiError.code, message: apiError.message };
  }
}

/**
 * The field-level messages a refusal carries, keyed the way the composer's summary box reads them, or
 * `null` for a refusal that belongs to the launch as a whole.
 */
export function readShowcaseLaunchRefusalFieldErrors(
  refusal: ShowcaseLaunchRefusal,
): Readonly<Record<string, string[]>> | null {
  switch (refusal.kind) {
    case "launchNameConflict":
      return { title: [refusal.message] };
    case "headingImageRefused":
      return { headingImage: [refusal.message] };
    case "fieldsRefused":
      return refusal.fieldErrors;
    case "signInRequired":
    case "accountIncomplete":
    case "submissionAlreadyReceived":
    case "headingImageTooLarge":
    case "rateLimited":
    case "replyUnreadable":
    case "unexpected":
      return null;
    default: {
      const exhaustiveCheck: never = refusal;
      return exhaustiveCheck;
    }
  }
}

/** Where the write-up's cursor was when "Add an image" was pressed. */
export interface WriteUpTextSelection {
  readonly startOffset: number;
  readonly endOffset: number;
}

/**
 * Alt text from a file name: extension dropped, and the characters that would break the Markdown
 * image syntax replaced. A maker can edit it in the text afterwards.
 */
export function buildWriteUpImageAltText(fileName: string): string {
  const altText = fileName
    .replace(/\.[A-Za-z0-9]+$/, "")
    .replace(/[[\]()\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return altText === "" ? "Image" : altText;
}

/**
 * Puts `![alt](url)` where the cursor was, replacing any selected text, AS A PARAGRAPH OF ITS OWN.
 *
 * ⚠️ THE BLANK LINES ARE LOAD-BEARING. `ShowcaseWriteUp` gives an image the media column only when it
 * stands alone in its paragraph; an image mid-sentence renders inline and small.
 */
export function insertMarkdownImageAtSelection(
  markdown: string,
  selection: WriteUpTextSelection,
  altText: string,
  imageUrl: string,
): string {
  const startOffset = Math.min(Math.max(selection.startOffset, 0), markdown.length);
  const endOffset = Math.min(Math.max(selection.endOffset, startOffset), markdown.length);
  const textBefore = markdown.slice(0, startOffset);
  const textAfter = markdown.slice(endOffset);

  const leadingBreak =
    textBefore === "" || textBefore.endsWith("\n\n")
      ? ""
      : textBefore.endsWith("\n")
        ? "\n"
        : "\n\n";
  const trailingBreak =
    textAfter === "" || textAfter.startsWith("\n\n")
      ? ""
      : textAfter.startsWith("\n")
        ? "\n"
        : "\n\n";

  return `${textBefore}${leadingBreak}![${altText}](${imageUrl})${trailingBreak}${textAfter}`;
}

/** Why a write-up image was refused in the browser, before any upload. */
export function describeWriteUpImageCheckFailure(failure: ImageFileCheckFailure): string {
  switch (failure.reason) {
    case "unsupported_type":
      return "That file isn't a JPEG, PNG, WebP or AVIF image.";
    case "file_too_large":
      return `That image is ${formatMegabytes(failure.byteSize)}. The limit is 5 MB.`;
    case "undecodable":
      return "Couldn't read that image. If it came from an iPhone it may be HEIC; export it as JPEG first.";
    case "below_minimum_dimensions":
      return `That image is ${failure.widthPx} × ${failure.heightPx}. An image needs at least ${failure.minimumDimensionPx} pixels on each side.`;
    case "above_maximum_dimensions":
      return `That image is ${failure.widthPx} × ${failure.heightPx}. Neither side may be larger than ${failure.maximumDimensionPx} pixels.`;
    default: {
      const exhaustiveCheck: never = failure;
      return exhaustiveCheck;
    }
  }
}

/** Why the server refused a write-up image, in words beside the write-up field. */
export function describeWriteUpImageUploadRefusal(apiError: ApiError): string {
  switch (apiError.code) {
    case "401":
      return "Your session ended. Sign in again in another tab, then add the image again.";
    case "413":
      return "That image is over the 5 MB limit.";
    // The server's own sentence: a full-account refusal, the unused-uploads ceiling, or what is
    // wrong with the file.
    case "403":
    case "409":
    case "422":
      return apiError.message;
    case "429":
      return "You have uploaded a lot of images in a short time. Wait a few minutes, then try again.";
    case "NETWORK":
      return "The image could not be uploaded. Check your connection and try again.";
    default:
      return "The image could not be uploaded. Try again.";
  }
}

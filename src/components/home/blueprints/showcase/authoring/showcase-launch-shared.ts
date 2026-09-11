// TRANSPORT: props-only — the launch form's draft shape, one pure collector and the field labels.
// No React, no network.
//
// The launch form's shared vocabulary, on the `wizard-shared.ts` precedent: the form holds text, and
// `collectShowcaseSubmission` converts it ONCE, at post time, then lets the contract decide.

import type { BlueprintDifficulty } from "@/lib/blueprints/schemas";
import {
  ShowcaseSubmissionDraftSchema,
  type ShowcaseLaunchStatementId,
  type ShowcaseSubmissionDraft,
} from "@/lib/blueprints/showcase-authoring.schemas";

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

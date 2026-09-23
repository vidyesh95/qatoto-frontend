// TRANSPORT: props-only — the row comes from the queue; the decision goes out through
// `@/hooks/blueprints/teardown-moderation`.
"use client";

import Image from "next/image";
import { useState } from "react";

import { MutationErrorNotice } from "@/components/home/research-and-development/sections/mutation-feedback";
import {
  useModerateTeardownMutation,
  useRefreshTeardownReviewQueue,
} from "@/hooks/blueprints/teardown-moderation";
import { useResettableAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";
import {
  isTeardownManufacturingFileKind,
  summarizeTeardownAttestation,
  TeardownModerationDecisionSchema,
  TEARDOWN_MODERATOR_NOTE_MAXIMUM_CHARACTERS,
  TEARDOWN_REVIEW_FILE_KIND_LABELS,
  TEARDOWN_THUMBNAIL_URL_MAXIMUM_CHARACTERS,
  type TeardownModerationDecision,
  type TeardownModerationResult,
  type TeardownReviewFile,
  type TeardownReviewItem,
  type TeardownReviewMaterial,
  type TeardownReviewPayload,
} from "@/lib/blueprints/teardown-moderation.schemas";
import {
  BLUEPRINT_DIFFICULTIES,
  BLUEPRINT_DIFFICULTY_LABELS,
  BlueprintDifficultySchema,
  TEARDOWN_DESIGNATION_SOURCE_LABELS,
  TEARDOWN_MANUFACTURING_METHOD_LABELS,
  TEARDOWN_MATERIAL_CLASS_LABELS,
  TEARDOWN_PROVENANCE_KIND_LABELS,
  TEARDOWN_PROVENANCE_KIND_NOTES,
  TEARDOWN_SURVEY_METHOD_LABELS,
  TEARDOWN_UNIT_ACQUISITION_LABELS,
  type BlueprintDifficulty,
  type BlueprintProvenanceKind,
} from "@/lib/blueprints/schemas";
import { createHttpsOrSiteRelativeUrlSchema } from "@/lib/blueprints/url-source.schemas";
import type { ActionResponse, ApiError } from "@/lib/http";
import { formatIsoInstantAsDateLabel } from "@/lib/store/format";

const CARD_CLASS = "rounded-2xl border border-outline-variant/60 p-4";
const PRIMARY_BUTTON_CLASS =
  "cursor-pointer rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-40";
const QUIET_BUTTON_CLASS =
  "cursor-pointer rounded-full bg-background px-3 py-1.5 text-xs font-medium text-foreground outline -outline-offset-1 outline-border disabled:opacity-40";
const FIELD_CLASS =
  "mt-1 w-full rounded-lg border border-outline-variant/60 px-2 py-1.5 text-sm outline-none focus:border-primary";

type DecisionKind = TeardownModerationDecision["decision"];

/**
 * ⚠️ FIVE ARMS, THE SAME FIVE AS BOTH SIBLING QUEUES, AND IT DOES NOT GROW FOR THE DOCUMENT.
 *
 * This models what the MODERATOR is doing. The document union models what ARRIVED. They are
 * independent, and folding them together would multiply this switch by three while making two
 * thirds of the products unreachable — `confirmingPublish` over an unreadable document is not a
 * state, it is a bug. The document's arms are early returns above the state machine instead, exactly
 * as `decided` already is.
 */
type CardState =
  | { readonly status: "idle" }
  | { readonly status: "confirmingPublish" }
  | { readonly status: "deciding"; readonly decision: DecisionKind }
  | { readonly status: "refused"; readonly error: ApiError }
  | { readonly status: "decided"; readonly result: TeardownModerationResult };

/** The thumbnail address, checked here so a bad one never reaches an `<img src>`. */
const ThumbnailUrlSchema = createHttpsOrSiteRelativeUrlSchema(
  TEARDOWN_THUMBNAIL_URL_MAXIMUM_CHARACTERS,
);

export default function TeardownReviewCard({
  submission,
}: {
  readonly submission: TeardownReviewItem;
}) {
  const [moderatorNote, setModeratorNote] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState(() => readInitialThumbnailUrl(submission));
  const [difficulty, setDifficulty] = useState<BlueprintDifficulty | "">("");
  const [desiredSlug, setDesiredSlug] = useState("");
  const [cardState, setCardState] = useState<CardState>({ status: "idle" });

  const moderateTeardown = useModerateTeardownMutation();
  const refreshQueue = useRefreshTeardownReviewQueue();
  const { getIdempotencyKey, resetIdempotencyKey } = useResettableAttemptIdempotencyKey();

  const isNoteEmpty = moderatorNote.trim() === "";
  const isBusy = cardState.status === "deciding";

  /**
   * ⚠️ EVERY DECISION INPUT ROTATES THE KEY, not just the note. The server fingerprints the body, so
   * a moderator who fails a publish, corrects the thumbnail and retries with the old key gets a
   * REPLAY of the first body rather than the corrected one. Rotating before a send-back that never
   * reads those fields is unnecessary and harmless; a per-field branch would not be.
   */
  function markDecisionInputChanged(): void {
    resetIdempotencyKey();
    if (cardState.status === "refused") setCardState({ status: "idle" });
  }

  function handleModeratorNoteChange(nextNote: string): void {
    if (isBusy) return;
    setModeratorNote(nextNote);
    markDecisionInputChanged();
  }

  function handleThumbnailUrlChange(nextThumbnailUrl: string): void {
    if (isBusy) return;
    setThumbnailUrl(nextThumbnailUrl);
    markDecisionInputChanged();
  }

  function handleDifficultyChange(nextDifficulty: BlueprintDifficulty | ""): void {
    if (isBusy) return;
    setDifficulty(nextDifficulty);
    markDecisionInputChanged();
  }

  function handleDesiredSlugChange(nextDesiredSlug: string): void {
    if (isBusy) return;
    setDesiredSlug(nextDesiredSlug);
    markDecisionInputChanged();
  }

  function decide(decision: DecisionKind): void {
    const parsedDecision = TeardownModerationDecisionSchema.safeParse(
      buildModerationDecisionInput(decision, {
        moderatorNote,
        thumbnailUrl,
        difficulty,
        desiredSlug,
      }),
    );

    if (!parsedDecision.success) {
      setCardState({
        status: "refused",
        error: {
          code: "422",
          message: "That decision could not be sent.",
          fieldErrors: collectDecisionFieldErrors(parsedDecision.error.issues),
        },
      });
      return;
    }

    setCardState({ status: "deciding", decision });
    moderateTeardown.mutate(
      {
        submissionId: submission.submissionId,
        decision: parsedDecision.data,
        idempotencyKey: getIdempotencyKey(),
      },
      {
        onSuccess: (result: ActionResponse<TeardownModerationResult>) => {
          if (!result.success) {
            setCardState({ status: "refused", error: result.error });
            return;
          }
          resetIdempotencyKey();
          setCardState({ status: "decided", result: result.data });
        },
        onError: (error: Error) => {
          setCardState({ status: "refused", error: { code: "NETWORK", message: error.message } });
        },
      },
    );
  }

  if (cardState.status === "decided") {
    return <DecidedNotice title={submission.title} result={cardState.result} />;
  }

  if (submission.document.status === "client_unreadable") {
    return (
      <ClientUnreadableNotice
        submission={submission}
        issues={submission.document.issues}
        onRefreshQueue={refreshQueue}
      />
    );
  }

  const noteField = (
    <NoteField
      moderatorNote={moderatorNote}
      isBusy={isBusy}
      onNoteChange={handleModeratorNoteChange}
    />
  );
  const refusalBlock =
    cardState.status === "refused" ? (
      <RefusalBlock error={cardState.error} onRefreshQueue={refreshQueue} />
    ) : null;

  if (submission.document.status === "unparseable") {
    return (
      <UnpublishableDecision
        submission={submission}
        schemaVersion={submission.document.schemaVersion}
        issues={submission.document.issues}
        noteField={noteField}
        refusalBlock={refusalBlock}
        isBusy={isBusy}
        isNoteEmpty={isNoteEmpty}
        onSendBack={() => decide("rejected")}
      />
    );
  }

  const payload = submission.document.document;

  return (
    <article className={CARD_CLASS}>
      <SubmissionHeader submission={submission} />

      <PermissionBlock provenance={payload.provenance} />
      <SurveyFacts provenance={payload.provenance} />
      <AttestationList acceptedClauseIds={payload.acceptedAttestationClauseIds} />
      <ReviewProse heading="Publisher's notes" body={payload.provenance.notes ?? ""} />
      <ReviewProse heading="Summary" body={payload.summary} />
      <MaterialList materials={payload.materials} />
      <PartsTable parts={payload.parts} />
      <ReviewFileList heading="Documents" files={payload.documents} expects="document" />
      <ReviewFileList
        heading="Fabrication files"
        files={payload.manufacturingFiles}
        expects="manufacturing"
      />
      <WalkthroughBlock walkthroughVideo={payload.walkthroughVideo} />
      <TagLine tags={payload.tags} />

      <div className="mt-4 border-t border-outline-variant/60 pt-3">
        {noteField}

        {/*
          ⚠️ THE PUBLISH FIELDS SIT OUTSIDE THE CONFIRM BLOCK, and that is a state-machine argument
          rather than a layout one. The confirm block REPLACES the button row, so fields inside it
          would be torn down by a client-side refusal — which moves the card to `refused` — and the
          moderator's typed values would be orphaned behind a second Publish press.
        */}
        <PublishFields
          thumbnailUrl={thumbnailUrl}
          difficulty={difficulty}
          desiredSlug={desiredSlug}
          isBusy={isBusy}
          onThumbnailUrlChange={handleThumbnailUrlChange}
          onDifficultyChange={handleDifficultyChange}
          onDesiredSlugChange={handleDesiredSlugChange}
        />

        <DecisionControls
          cardState={cardState}
          isBusy={isBusy}
          isNoteEmpty={isNoteEmpty}
          onRequestPublish={() => setCardState({ status: "confirmingPublish" })}
          onConfirmPublish={() => decide("published")}
          onCancelPublish={() => setCardState({ status: "idle" })}
          onSendBack={() => decide("rejected")}
        />

        {refusalBlock}
      </div>
    </article>
  );
}

/** The walkthrough poster is the only thumbnail a submission can suggest; an unreadable one has none. */
function readInitialThumbnailUrl(submission: TeardownReviewItem): string {
  return submission.document.status === "present"
    ? (submission.document.document.walkthroughVideo?.posterUrl ?? "")
    : "";
}

/** The body for `TeardownModerationDecisionSchema`: a publish carries four fields, a send-back one. */
function buildModerationDecisionInput(
  decision: DecisionKind,
  fields: {
    readonly moderatorNote: string;
    readonly thumbnailUrl: string;
    readonly difficulty: BlueprintDifficulty | "";
    readonly desiredSlug: string;
  },
): unknown {
  const trimmedNote = fields.moderatorNote.trim();
  if (decision !== "published") return { decision, moderatorNote: trimmedNote };
  const trimmedSlug = fields.desiredSlug.trim();
  return {
    decision,
    moderatorNote: trimmedNote === "" ? null : trimmedNote,
    thumbnailUrl: fields.thumbnailUrl.trim(),
    difficulty: fields.difficulty,
    desiredSlug: trimmedSlug === "" ? null : trimmedSlug,
  };
}

/**
 * ⚠️ EVERY ISSUE, NOT `issues[0]`. A publish carries four fields a moderator fills in, so a
 * bad slug AND a bad thumbnail would otherwise surface one at a time — the second arriving
 * after the first is fixed, reading as a new failure. `MutationErrorNotice` already renders a
 * field map as a list.
 */
function collectDecisionFieldErrors(
  issues: readonly { readonly path: readonly PropertyKey[]; readonly message: string }[],
): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of issues) {
    const fieldKey = issue.path.join(".") || "decision";
    fieldErrors[fieldKey] = [...(fieldErrors[fieldKey] ?? []), issue.message];
  }
  return fieldErrors;
}

function DecidedNotice({
  title,
  result,
}: {
  readonly title: string;
  readonly result: TeardownModerationResult;
}) {
  return (
    <article className={CARD_CLASS}>
      <h2 className="text-sm font-medium">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {result.moderationState === "published"
          ? /*
             * The address as TEXT, not a link. The whole `/blueprints` surface is de-indexed, and
             * a moderator middle-clicking out of the console loses their place in the queue.
             */
            `Published at /blueprints/teardowns/${result.publicSlug ?? ""}.`
          : "Sent back to the publisher with your note."}
      </p>
    </article>
  );
}

function RefusalBlock({
  error,
  onRefreshQueue,
}: {
  readonly error: ApiError;
  readonly onRefreshQueue: () => void;
}) {
  return (
    <div className="mt-3 space-y-2">
      <MutationErrorNotice error={error} />
      {error.code === "409" ? (
        <button type="button" onClick={onRefreshQueue} className={QUIET_BUTTON_CLASS}>
          Refresh the queue
        </button>
      ) : null}
    </div>
  );
}

function SendBackHint({ isNoteEmpty }: { readonly isNoteEmpty: boolean }) {
  if (!isNoteEmpty) return null;
  return (
    <span className="text-xs text-muted-foreground">
      Sending back needs a note. It is the only thing the publisher sees.
    </span>
  );
}

/**
 * ⚠️ THIS CONSOLE COULD NOT READ IT, AND THAT IS NOT THE PUBLISHER'S FAULT.
 *
 * No decision is offered at all. A send-back note is the only thing they ever see, and sending
 * somebody's survey back over a bug in our own parser is the one unrecoverable mistake available
 * here. The issues are printed so they can go in a bug report.
 */
function ClientUnreadableNotice({
  submission,
  issues,
  onRefreshQueue,
}: {
  readonly submission: TeardownReviewItem;
  readonly issues: readonly string[];
  readonly onRefreshQueue: () => void;
}) {
  return (
    <article className={CARD_CLASS}>
      <SubmissionHeader submission={submission} />
      <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm">
        <h3 className="font-medium text-destructive">This console could not read it</h3>
        <p className="mt-1 text-muted-foreground">
          The server holds a submission this build does not understand. That is a fault here, not in
          the survey, so there is nothing to decide and no note to send. Report it with the detail
          below.
        </p>
        <IssueList issues={issues} />
      </div>
      <div className="mt-3">
        <button type="button" onClick={onRefreshQueue} className={QUIET_BUTTON_CLASS}>
          Refresh the queue
        </button>
      </div>
    </article>
  );
}

/**
 * ⚠️ THE SERVER COULD NOT READ IT EITHER, so the survey really is unpublishable and a send-back is
 * the remedy. The publish control is ABSENT rather than disabled: a greyed button invites a
 * moderator to hunt for the condition that ungreys it, and there is none — `POST …/moderate` with
 * `published` against this row is a hard 422.
 */
function UnpublishableDecision({
  submission,
  schemaVersion,
  issues,
  noteField,
  refusalBlock,
  isBusy,
  isNoteEmpty,
  onSendBack,
}: {
  readonly submission: TeardownReviewItem;
  readonly schemaVersion: number;
  readonly issues: readonly string[];
  readonly noteField: React.ReactNode;
  readonly refusalBlock: React.ReactNode;
  readonly isBusy: boolean;
  readonly isNoteEmpty: boolean;
  readonly onSendBack: () => void;
}) {
  return (
    <article className={CARD_CLASS}>
      <SubmissionHeader submission={submission} />
      <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm">
        <h3 className="font-medium text-destructive">This submission cannot be published</h3>
        <p className="mt-1 text-muted-foreground">
          It was written against an older version of the form (version {schemaVersion}) and no
          longer matches what a teardown has to carry. Send it back and ask for a fresh survey —
          your note is the only thing the publisher sees, so say what they should do rather than
          quoting the detail below.
        </p>
        <IssueList issues={issues} />
      </div>
      <div className="mt-4 border-t border-outline-variant/60 pt-3">
        {noteField}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onSendBack}
            disabled={isBusy || isNoteEmpty}
            className={QUIET_BUTTON_CLASS}
          >
            {isBusy ? "Sending back…" : "Send back"}
          </button>
          <SendBackHint isNoteEmpty={isNoteEmpty} />
        </div>
        {refusalBlock}
      </div>
    </article>
  );
}

function DecisionControls({
  cardState,
  isBusy,
  isNoteEmpty,
  onRequestPublish,
  onConfirmPublish,
  onCancelPublish,
  onSendBack,
}: {
  readonly cardState: CardState;
  readonly isBusy: boolean;
  readonly isNoteEmpty: boolean;
  readonly onRequestPublish: () => void;
  readonly onConfirmPublish: () => void;
  readonly onCancelPublish: () => void;
  readonly onSendBack: () => void;
}) {
  if (cardState.status === "confirmingPublish") {
    return (
      <div className="mt-2 rounded-lg bg-muted/40 p-3">
        <p className="text-xs">
          Publishing gives this survey a public address and puts somebody else&apos;s product on it.
          The address cannot be changed afterwards.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" onClick={onConfirmPublish} className={PRIMARY_BUTTON_CLASS}>
            Publish it
          </button>
          <button type="button" onClick={onCancelPublish} className={QUIET_BUTTON_CLASS}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  const decidingKind = cardState.status === "deciding" ? cardState.decision : null;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onRequestPublish}
        disabled={isBusy}
        className={PRIMARY_BUTTON_CLASS}
      >
        {decidingKind === "published" ? "Publishing…" : "Publish"}
      </button>
      <button
        type="button"
        onClick={onSendBack}
        disabled={isBusy || isNoteEmpty}
        className={QUIET_BUTTON_CLASS}
      >
        {decidingKind === "rejected" ? "Sending back…" : "Send back"}
      </button>
      <SendBackHint isNoteEmpty={isNoteEmpty} />
    </div>
  );
}

function TagLine({ tags }: { readonly tags: readonly string[] }) {
  if (tags.length === 0) return null;
  return <p className="mt-3 text-xs text-muted-foreground">Tags: {tags.join(", ")}</p>;
}

function SubmissionHeader({ submission }: { readonly submission: TeardownReviewItem }) {
  return (
    <header>
      <h2 className="text-base font-medium">{submission.title}</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">{submission.subjectProductName}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {submission.author.displayName}
        {submission.author.handle === null ? "" : ` @${submission.author.handle}`} &middot; sent{" "}
        {formatIsoInstantAsDateLabel(submission.submittedAt)}
      </p>
    </header>
  );
}

function IssueList({ issues }: { readonly issues: readonly string[] }) {
  if (issues.length === 0) return null;
  return (
    <ul className="mt-2 list-inside list-disc text-xs text-muted-foreground">
      {issues.map((issue) => (
        <li key={issue}>{issue}</li>
      ))}
    </ul>
  );
}

/**
 * WHERE THE UNIT CAME FROM AND WHAT PERMISSION CAME WITH IT — first, because it is the block that
 * decides whether this may be published at all.
 *
 * ⚠️ IT USES `TEARDOWN_PROVENANCE_KIND_LABELS`, NOT THE CHIP LABELS. The chip vocabulary fuses an
 * open-source licence and a manufacturer's private authorisation into one word, because a reader's
 * practical question is the same either way. A moderator's is the opposite: one is a public document
 * anybody can check, the other is one publisher's account of a conversation.
 */
function PermissionBlock({
  provenance,
}: {
  readonly provenance: TeardownReviewPayload["provenance"];
}) {
  return (
    <section className="mt-3 rounded-xl border border-outline-variant/60 p-3">
      <h3 className="text-xs font-medium text-muted-foreground">Permission</h3>
      <p className="mt-1 text-sm font-medium">{TEARDOWN_PROVENANCE_KIND_LABELS[provenance.kind]}</p>
      {renderPermissionEvidence(provenance)}
      <p className="mt-2 text-xs text-muted-foreground">
        {TEARDOWN_PROVENANCE_KIND_NOTES[provenance.kind]}
      </p>
    </section>
  );
}

/**
 * The three arms, keyed by a `Record` so a fourth provenance kind is a compile error here.
 *
 * No arm needs a null branch: the read provenance schema's own refinement makes a licence on the
 * authorised arm, or a note on the licensed one, unconstructible — which is the reason that schema
 * is reused whole rather than mirrored loosely.
 */
function renderPermissionEvidence(provenance: TeardownReviewPayload["provenance"]) {
  const evidenceByKind: Record<BlueprintProvenanceKind, () => React.ReactNode> = {
    licensed_open_source: () =>
      provenance.licence === null ? null : (
        <p className="mt-1 text-sm">
          <a
            href={provenance.licence.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-primary-imprint hover:underline"
          >
            {provenance.licence.name}
          </a>
          <span className="block text-xs break-all text-muted-foreground">
            {provenance.licence.url}
          </span>
        </p>
      ),
    authorized_by_manufacturer: () =>
      provenance.authorizationNote === null ? null : (
        <p className="mt-1 text-sm leading-6">{provenance.authorizationNote}</p>
      ),
    community_reverse_engineered: () => (
      <p className="mt-1 text-sm text-muted-foreground">No licence and no authorization.</p>
    ),
  };

  return evidenceByKind[provenance.kind]();
}

function SurveyFacts({ provenance }: { readonly provenance: TeardownReviewPayload["provenance"] }) {
  return (
    <section className="mt-3">
      <h3 className="text-xs font-medium text-muted-foreground">The survey</h3>
      <dl className="mt-1 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <FactRow
          label="How they got the unit"
          value={TEARDOWN_UNIT_ACQUISITION_LABELS[provenance.unitAcquisition]}
        />
        <FactRow label="Surveyed" value={formatIsoInstantAsDateLabel(provenance.surveyedAt)} />
        <FactRow
          label="How they looked inside"
          value={provenance.surveyMethods
            .map((surveyMethod) => TEARDOWN_SURVEY_METHOD_LABELS[surveyMethod])
            .join(" · ")}
        />
        <FactRow
          label="Statements accepted"
          value={formatIsoInstantAsDateLabel(provenance.attestationAcceptedAt)}
        />
      </dl>
    </section>
  );
}

/**
 * ⚠️ AN UNTICKED CLAUSE IS SHOWN, NOT OMITTED. The wizard cannot submit without all four, but the
 * wizard is a courtesy and anyone can post the body directly — and an absent tick is the one fact a
 * moderator cannot infer from anything else on this card.
 */
function AttestationList({ acceptedClauseIds }: { readonly acceptedClauseIds: readonly string[] }) {
  const attestation = summarizeTeardownAttestation(acceptedClauseIds);

  return (
    <section className="mt-3 rounded-xl bg-muted/40 p-3 text-xs">
      <h3 className="font-medium text-muted-foreground">What they swore to</h3>
      <ul className="mt-1 space-y-0.5">
        {attestation.clauses.map((clause) => (
          <li key={clause.id} className={clause.isAccepted ? "" : "text-destructive"}>
            {clause.isAccepted ? "✓" : "✗"} {clause.label}
          </li>
        ))}
      </ul>
      {attestation.unrecognizedClauseIds.length > 0 ? (
        <p className="mt-1 text-muted-foreground">
          This console does not recognise: {attestation.unrecognizedClauseIds.join(", ")}
        </p>
      ) : null}
    </section>
  );
}

function MaterialList({ materials }: { readonly materials: readonly TeardownReviewMaterial[] }) {
  if (materials.length === 0) return null;

  return (
    <section className="mt-3">
      <h3 className="text-xs font-medium text-muted-foreground">Materials</h3>
      <ul className="mt-1 space-y-2">
        {materials.map((material, materialIndex) => (
          // Keyed by position: a submission mints no id, and two rows may share a designation.
          <li key={materialIndex} className="rounded-xl border border-outline-variant/40 p-3">
            <p className="text-sm font-medium">{material.appliesToLabel}</p>
            <p className="mt-0.5 text-sm">
              {material.designation}
              {" · "}
              {/* The designation SOURCE prints on every row and never behind a disclosure. */}
              <span className="text-muted-foreground">
                {TEARDOWN_DESIGNATION_SOURCE_LABELS[material.designationSource]}
              </span>
            </p>
            <dl className="mt-1 grid gap-x-6 text-xs sm:grid-cols-2">
              <FactRow
                label="Class"
                value={TEARDOWN_MATERIAL_CLASS_LABELS[material.materialClass]}
              />
              {material.process === null ? null : (
                <FactRow
                  label="Process"
                  value={TEARDOWN_MANUFACTURING_METHOD_LABELS[material.process]}
                />
              )}
              {material.finish === null ? null : <FactRow label="Finish" value={material.finish} />}
            </dl>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PartsTable({ parts }: { readonly parts: TeardownReviewPayload["parts"] }) {
  if (parts.length === 0) return null;

  return (
    <section className="mt-3">
      <h3 className="text-xs font-medium text-muted-foreground">Parts</h3>
      <div className="mt-1 overflow-hidden rounded-xl border border-outline-variant/60">
        <table className="w-full text-sm">
          <thead className="border-b border-outline-variant/60 text-left text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">
                Part
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Material
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/60">
            {parts.map((listedPart, partIndex) => (
              // Keyed by position: "Housing bolt, M4" four times over is one unit's honest list.
              <tr key={partIndex}>
                <td className="px-3 py-2">{listedPart.label}</td>
                <td className="px-3 py-2 text-muted-foreground">{listedPart.material}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/**
 * One file list, used for both arrays.
 *
 * ⚠️ THE LABEL COMES FROM THE MERGED MAP, NEVER FROM ONE VOCABULARY'S. A `documents[]` row may carry
 * a fabrication label — the wizard sent that shape until it was split, and the backend still accepts
 * it from a caller on a cached bundle — and indexing the document map would render `undefined` into
 * the chip. A mis-vocabularied row is labelled CORRECTLY and marked: the moderator is the only person
 * who can see it, and the marker says the backend files each link by its own label anyway, so it is
 * not grounds for a send-back.
 */
function ReviewFileList({
  heading,
  files,
  expects,
}: {
  readonly heading: string;
  readonly files: readonly TeardownReviewFile[];
  readonly expects: "document" | "manufacturing";
}) {
  return (
    <section className="mt-3">
      <h3 className="text-xs font-medium text-muted-foreground">{heading}</h3>
      {files.length === 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">None.</p>
      ) : (
        <ul className="mt-1 space-y-1">
          {files.map((file, fileIndex) => {
            const isManufacturingKind = isTeardownManufacturingFileKind(file.kind);
            const isOtherVocabulary = isManufacturingKind === (expects === "document");

            return (
              // Keyed by position: a submission mints no file ids.
              <li key={fileIndex} className="text-sm">
                <span className="rounded-full border border-border px-2 py-0.5 text-xs">
                  {TEARDOWN_REVIEW_FILE_KIND_LABELS[file.kind]}
                </span>{" "}
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-primary-imprint hover:underline"
                >
                  {file.title}
                </a>
                <span className="block text-xs break-all text-muted-foreground">{file.url}</span>
                {isOtherVocabulary ? (
                  <span className="block text-xs text-muted-foreground">
                    Sent in the wrong list, from an older version of the form. It will be filed by
                    its own label when you publish, so this is not a reason to send it back.
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/**
 * ⚠️ A LINK OUT, NEVER AN IFRAME. The public page's click-to-load player exists for a reader's
 * privacy budget; mounting one here would put a third party inside the staff console for no gain.
 */
function WalkthroughBlock({
  walkthroughVideo,
}: {
  readonly walkthroughVideo: TeardownReviewPayload["walkthroughVideo"];
}) {
  if (walkthroughVideo === null) return null;

  return (
    <section className="mt-3">
      <h3 className="text-xs font-medium text-muted-foreground">Walkthrough</h3>
      <p className="mt-1 text-sm">
        <a
          href={`https://www.youtube.com/watch?v=${walkthroughVideo.youtubeVideoId}`}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="text-primary-imprint hover:underline"
        >
          {walkthroughVideo.youtubeVideoId}
        </a>
      </p>
    </section>
  );
}

function NoteField({
  moderatorNote,
  isBusy,
  onNoteChange,
}: {
  readonly moderatorNote: string;
  readonly isBusy: boolean;
  readonly onNoteChange: (nextNote: string) => void;
}) {
  return (
    <label className="block text-xs text-muted-foreground">
      Note to the publisher
      <textarea
        value={moderatorNote}
        onChange={(changeEvent) => onNoteChange(changeEvent.target.value)}
        maxLength={TEARDOWN_MODERATOR_NOTE_MAXIMUM_CHARACTERS}
        rows={3}
        disabled={isBusy}
        className={FIELD_CLASS}
      />
      <span className="mt-1 block text-xs tabular-nums">
        {moderatorNote.length} of{" "}
        {TEARDOWN_MODERATOR_NOTE_MAXIMUM_CHARACTERS.toLocaleString("en-US")}
      </span>
    </label>
  );
}

/**
 * THE TWO FIELDS THE PUBLISHER NEVER SENT, AND ONE THEY COULD NOT.
 *
 * `thumbnailUrl` and `difficulty` are required of every published blueprint and the wizard collects
 * neither — it cannot ask for a thumbnail, because there is no upload route. So this is where the
 * read contract gets satisfied, and the legend says so rather than letting a moderator believe the
 * publisher chose either.
 */
function PublishFields({
  thumbnailUrl,
  difficulty,
  desiredSlug,
  isBusy,
  onThumbnailUrlChange,
  onDifficultyChange,
  onDesiredSlugChange,
}: {
  readonly thumbnailUrl: string;
  readonly difficulty: BlueprintDifficulty | "";
  readonly desiredSlug: string;
  readonly isBusy: boolean;
  readonly onThumbnailUrlChange: (nextThumbnailUrl: string) => void;
  readonly onDifficultyChange: (nextDifficulty: BlueprintDifficulty | "") => void;
  readonly onDesiredSlugChange: (nextDesiredSlug: string) => void;
}) {
  return (
    <fieldset className="mt-3 rounded-xl border border-outline-variant/60 p-3">
      <legend className="px-1 text-xs font-medium text-muted-foreground">
        If you publish — the publisher sent none of this
      </legend>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs text-muted-foreground">
          Thumbnail address
          <input
            type="url"
            value={thumbnailUrl}
            onChange={(changeEvent) => onThumbnailUrlChange(changeEvent.target.value)}
            maxLength={TEARDOWN_THUMBNAIL_URL_MAXIMUM_CHARACTERS}
            disabled={isBusy}
            placeholder="https://…"
            className={FIELD_CLASS}
          />
        </label>

        <label className="block text-xs text-muted-foreground">
          Difficulty
          <select
            value={difficulty}
            onChange={(changeEvent) => {
              const parsedDifficulty = BlueprintDifficultySchema.safeParse(
                changeEvent.target.value,
              );
              onDifficultyChange(parsedDifficulty.success ? parsedDifficulty.data : "");
            }}
            disabled={isBusy}
            className={FIELD_CLASS}
          >
            {/* No pre-selection: the publisher stated nothing, and a default would invent a claim. */}
            <option value="">Choose one</option>
            {BLUEPRINT_DIFFICULTIES.map((blueprintDifficulty) => (
              <option key={blueprintDifficulty} value={blueprintDifficulty}>
                {BLUEPRINT_DIFFICULTY_LABELS[blueprintDifficulty]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-3 block text-xs text-muted-foreground">
        Address (optional)
        <input
          type="text"
          value={desiredSlug}
          onChange={(changeEvent) => onDesiredSlugChange(changeEvent.target.value)}
          maxLength={120}
          disabled={isBusy}
          placeholder="Leave blank to let the server choose"
          className={FIELD_CLASS}
        />
        <span className="mt-1 block text-xs">
          Lowercase, digits and single hyphens. It cannot be changed once the teardown is published.
        </span>
      </label>

      <ThumbnailPreview key={thumbnailUrl.trim()} thumbnailUrl={thumbnailUrl.trim()} />
    </fieldset>
  );
}

type ThumbnailPreviewState =
  | { readonly status: "blank" }
  | { readonly status: "invalid"; readonly message: string }
  | { readonly status: "ready"; readonly thumbnailUrl: string }
  | { readonly status: "broken"; readonly thumbnailUrl: string };

/**
 * The image, before the decision rather than after it.
 *
 * ⚠️ `unoptimized` FOR AN https ADDRESS, AND IT IS NOT A NICETY. `next/image` on a host that is not
 * in `next.config.ts`'s `remotePatterns` is a RUNTIME ERROR that takes the whole page down, and a
 * moderator pastes arbitrary hosts by definition. A site-relative path keeps the optimizer, which is
 * why this is an expression rather than a constant. Copied from the hero slide console.
 *
 * ⚠️ AN INVALID ADDRESS MOUNTS NO IMAGE AT ALL. That is the gate keeping `javascript:` and
 * `//evil.tld` out of an `src`.
 */
function ThumbnailPreview({ thumbnailUrl }: { readonly thumbnailUrl: string }) {
  const [hasFailedToLoad, setHasFailedToLoad] = useState(false);

  const previewState: ThumbnailPreviewState = (() => {
    if (thumbnailUrl === "") return { status: "blank" };
    const parsedUrl = ThumbnailUrlSchema.safeParse(thumbnailUrl);
    if (!parsedUrl.success) {
      return {
        status: "invalid",
        message:
          parsedUrl.error.issues[0]?.message ?? "That is not an address this site can serve.",
      };
    }
    return hasFailedToLoad ? { status: "broken", thumbnailUrl } : { status: "ready", thumbnailUrl };
  })();

  switch (previewState.status) {
    case "blank":
      return (
        <div className="mt-3 flex aspect-video w-40 items-center justify-center rounded-lg border border-dashed border-outline-variant/60 text-xs text-muted-foreground">
          Paste a link to see it
        </div>
      );
    case "invalid":
      return <p className="mt-3 max-w-prose text-xs text-destructive">{previewState.message}</p>;
    case "ready":
      return (
        <Image
          src={previewState.thumbnailUrl}
          alt=""
          width={160}
          height={90}
          unoptimized={previewState.thumbnailUrl.startsWith("https://")}
          onError={() => setHasFailedToLoad(true)}
          className="mt-3 aspect-video w-40 rounded-lg bg-muted object-cover"
        />
      );
    case "broken":
      // NOT a blocker. A host that refuses hotlinking from this origin is not grounds to refuse a
      // decision, and the server re-validates the address anyway.
      return (
        <p className="mt-3 max-w-prose text-xs text-muted-foreground">
          That link did not load here. The address may still be right — open it in a new tab to
          check.
        </p>
      );
    default: {
      const exhaustiveCheck: never = previewState;
      return exhaustiveCheck;
    }
  }
}

function ReviewProse({ heading, body }: { readonly heading: string; readonly body: string }) {
  if (body === "") return null;
  return (
    <section className="mt-3">
      <h3 className="text-xs font-medium text-muted-foreground">{heading}</h3>
      <p className="mt-1 text-sm leading-6">{body}</p>
    </section>
  );
}

function FactRow({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="border-t border-outline-variant/40 py-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

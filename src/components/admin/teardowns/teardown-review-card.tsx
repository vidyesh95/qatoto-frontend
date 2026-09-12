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
import type { ApiError } from "@/lib/http";
import { formatIsoInstantAsDateLabel } from "@/lib/store/format";

const CARD_CLASS = "rounded-2xl border border-[#CAC4D0]/60 p-4";
const PRIMARY_BUTTON_CLASS =
  "cursor-pointer rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-40";
const QUIET_BUTTON_CLASS =
  "cursor-pointer rounded-full bg-background px-3 py-1.5 text-xs font-medium text-foreground outline -outline-offset-1 outline-border disabled:opacity-40";
const FIELD_CLASS =
  "mt-1 w-full rounded-lg border border-[#CAC4D0]/60 px-2 py-1.5 text-sm outline-none focus:border-primary";

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
  const [thumbnailUrl, setThumbnailUrl] = useState(() =>
    submission.document.status === "present"
      ? (submission.document.document.walkthroughVideo?.posterUrl ?? "")
      : "",
  );
  const [difficulty, setDifficulty] = useState<BlueprintDifficulty | "">("");
  const [desiredSlug, setDesiredSlug] = useState("");
  const [cardState, setCardState] = useState<CardState>({ status: "idle" });

  const moderateTeardown = useModerateTeardownMutation();
  const refreshQueue = useRefreshTeardownReviewQueue();
  const { getIdempotencyKey, resetIdempotencyKey } = useResettableAttemptIdempotencyKey();

  const trimmedNote = moderatorNote.trim();
  const trimmedThumbnailUrl = thumbnailUrl.trim();
  const trimmedSlug = desiredSlug.trim();
  const isBusy = cardState.status === "deciding";

  /**
   * ⚠️ EVERY DECISION INPUT ROTATES THE KEY, not just the note. The server fingerprints the body, so
   * a moderator who fails a publish, corrects the thumbnail and retries with the old key gets a
   * REPLAY of the first body rather than the corrected one. Rotating before a send-back that never
   * reads those fields is unnecessary and harmless; a per-field branch would not be.
   */
  function applyDecisionInput(applyChange: () => void): void {
    if (isBusy) return;
    applyChange();
    resetIdempotencyKey();
    if (cardState.status === "refused") setCardState({ status: "idle" });
  }

  function decide(decision: DecisionKind): void {
    const parsedDecision = TeardownModerationDecisionSchema.safeParse(
      decision === "published"
        ? {
            decision,
            moderatorNote: trimmedNote === "" ? null : trimmedNote,
            thumbnailUrl: trimmedThumbnailUrl,
            difficulty,
            desiredSlug: trimmedSlug === "" ? null : trimmedSlug,
          }
        : { decision, moderatorNote: trimmedNote },
    );

    if (!parsedDecision.success) {
      /*
       * ⚠️ EVERY ISSUE, NOT `issues[0]`. A publish carries four fields a moderator fills in, so a
       * bad slug AND a bad thumbnail would otherwise surface one at a time — the second arriving
       * after the first is fixed, reading as a new failure. `MutationErrorNotice` already renders a
       * field map as a list.
       */
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsedDecision.error.issues) {
        const fieldKey = issue.path.join(".") || "decision";
        fieldErrors[fieldKey] = [...(fieldErrors[fieldKey] ?? []), issue.message];
      }
      setCardState({
        status: "refused",
        error: { code: "422", message: "That decision could not be sent.", fieldErrors },
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
        onSuccess: (result) => {
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
    return (
      <article className={CARD_CLASS}>
        <h2 className="text-sm font-medium">{submission.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {cardState.result.moderationState === "published"
            ? /*
               * The address as TEXT, not a link. The whole `/blueprints` surface is de-indexed, and
               * a moderator middle-clicking out of the console loses their place in the queue.
               */
              `Published at /blueprints/teardowns/${cardState.result.publicSlug ?? ""}.`
            : "Sent back to the publisher with your note."}
        </p>
      </article>
    );
  }

  const submissionHeader = <SubmissionHeader submission={submission} />;
  const noteField = (
    <NoteField
      moderatorNote={moderatorNote}
      isBusy={isBusy}
      onNoteChange={(nextNote) => applyDecisionInput(() => setModeratorNote(nextNote))}
    />
  );
  const refusalBlock =
    cardState.status === "refused" ? (
      <div className="mt-3 space-y-2">
        <MutationErrorNotice error={cardState.error} />
        {cardState.error.code === "409" ? (
          <button type="button" onClick={refreshQueue} className={QUIET_BUTTON_CLASS}>
            Refresh the queue
          </button>
        ) : null}
      </div>
    ) : null;

  /**
   * ⚠️ THIS CONSOLE COULD NOT READ IT, AND THAT IS NOT THE PUBLISHER'S FAULT.
   *
   * No decision is offered at all. A send-back note is the only thing they ever see, and sending
   * somebody's survey back over a bug in our own parser is the one unrecoverable mistake available
   * here. The issues are printed so they can go in a bug report.
   */
  if (submission.document.status === "client_unreadable") {
    return (
      <article className={CARD_CLASS}>
        {submissionHeader}
        <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm">
          <h3 className="font-medium text-destructive">This console could not read it</h3>
          <p className="mt-1 text-muted-foreground">
            The server holds a submission this build does not understand. That is a fault here, not
            in the survey, so there is nothing to decide and no note to send. Report it with the
            detail below.
          </p>
          <IssueList issues={submission.document.issues} />
        </div>
        <div className="mt-3">
          <button type="button" onClick={refreshQueue} className={QUIET_BUTTON_CLASS}>
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
  if (submission.document.status === "unparseable") {
    return (
      <article className={CARD_CLASS}>
        {submissionHeader}
        <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm">
          <h3 className="font-medium text-destructive">This submission cannot be published</h3>
          <p className="mt-1 text-muted-foreground">
            It was written against an older version of the form (version{" "}
            {submission.document.schemaVersion}) and no longer matches what a teardown has to carry.
            Send it back and ask for a fresh survey — your note is the only thing the publisher
            sees, so say what they should do rather than quoting the detail below.
          </p>
          <IssueList issues={submission.document.issues} />
        </div>
        <div className="mt-4 border-t border-[#CAC4D0]/60 pt-3">
          {noteField}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => decide("rejected")}
              disabled={isBusy || trimmedNote === ""}
              className={QUIET_BUTTON_CLASS}
            >
              {isBusy ? "Sending back…" : "Send back"}
            </button>
            {trimmedNote === "" ? (
              <span className="text-[11px] text-muted-foreground">
                Sending back needs a note. It is the only thing the publisher sees.
              </span>
            ) : null}
          </div>
          {refusalBlock}
        </div>
      </article>
    );
  }

  const payload = submission.document.document;

  return (
    <article className={CARD_CLASS}>
      {submissionHeader}

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
      {payload.tags.length > 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">Tags: {payload.tags.join(", ")}</p>
      ) : null}

      <div className="mt-4 border-t border-[#CAC4D0]/60 pt-3">
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
          onThumbnailUrlChange={(next) => applyDecisionInput(() => setThumbnailUrl(next))}
          onDifficultyChange={(next) => applyDecisionInput(() => setDifficulty(next))}
          onDesiredSlugChange={(next) => applyDecisionInput(() => setDesiredSlug(next))}
        />

        {cardState.status === "confirmingPublish" ? (
          <div className="mt-2 rounded-lg bg-muted/40 p-3">
            <p className="text-xs">
              Publishing gives this survey a public address and puts somebody else&apos;s product on
              it. The address cannot be changed afterwards.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => decide("published")}
                className={PRIMARY_BUTTON_CLASS}
              >
                Publish it
              </button>
              <button
                type="button"
                onClick={() => setCardState({ status: "idle" })}
                className={QUIET_BUTTON_CLASS}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCardState({ status: "confirmingPublish" })}
              disabled={isBusy}
              className={PRIMARY_BUTTON_CLASS}
            >
              {cardState.status === "deciding" && cardState.decision === "published"
                ? "Publishing…"
                : "Publish"}
            </button>
            <button
              type="button"
              onClick={() => decide("rejected")}
              disabled={isBusy || trimmedNote === ""}
              className={QUIET_BUTTON_CLASS}
            >
              {cardState.status === "deciding" && cardState.decision === "rejected"
                ? "Sending back…"
                : "Send back"}
            </button>
            {trimmedNote === "" ? (
              <span className="text-[11px] text-muted-foreground">
                Sending back needs a note. It is the only thing the publisher sees.
              </span>
            ) : null}
          </div>
        )}

        {refusalBlock}
      </div>
    </article>
  );
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
    <section className="mt-3 rounded-xl border border-[#CAC4D0]/60 p-3">
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
            className="text-[#00696E] hover:underline"
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
          <li key={materialIndex} className="rounded-xl border border-[#CAC4D0]/40 p-3">
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
      <div className="mt-1 overflow-hidden rounded-xl border border-[#CAC4D0]/60">
        <table className="w-full text-sm">
          <thead className="border-b border-[#CAC4D0]/60 text-left text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">
                Part
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Material
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#CAC4D0]/60">
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
 * ⚠️ THE LABEL COMES FROM THE MERGED MAP, NEVER FROM ONE VOCABULARY'S. Submissions carrying a
 * fabrication label in `documents[]` are already in the database, and indexing the document map
 * would render `undefined` into the chip. A mis-vocabularied row is labelled CORRECTLY and marked —
 * the moderator is the only person who can see it, and the marker says the backend files each link
 * by its own label anyway, so it is not grounds for a send-back.
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
                <span className="rounded-full border border-border px-2 py-0.5 text-[11px]">
                  {TEARDOWN_REVIEW_FILE_KIND_LABELS[file.kind]}
                </span>{" "}
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-[#00696E] hover:underline"
                >
                  {file.title}
                </a>
                <span className="block text-xs break-all text-muted-foreground">{file.url}</span>
                {isOtherVocabulary ? (
                  <span className="block text-[11px] text-muted-foreground">
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
          className="text-[#00696E] hover:underline"
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
      <span className="mt-1 block text-[11px] tabular-nums">
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
    <fieldset className="mt-3 rounded-xl border border-[#CAC4D0]/60 p-3">
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
            onChange={(changeEvent) =>
              onDifficultyChange(changeEvent.target.value as BlueprintDifficulty | "")
            }
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
        <span className="mt-1 block text-[11px]">
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
        <div className="mt-3 flex aspect-video w-40 items-center justify-center rounded-lg border border-dashed border-[#CAC4D0]/60 text-[11px] text-muted-foreground">
          Paste a link to see it
        </div>
      );
    case "invalid":
      return (
        <p className="mt-3 max-w-prose text-[11px] text-destructive">{previewState.message}</p>
      );
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
        <p className="mt-3 max-w-prose text-[11px] text-muted-foreground">
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
    <div className="border-t border-[#CAC4D0]/40 py-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

// TRANSPORT: client-query — the queue and the decision both call hooks in
// `@/hooks/store/admin-certifications`. The capability check reads `@/hooks/rnd/platform-roles`.
"use client";

// `/admin/certifications`. Where a seller's compliance claim becomes a fact buyers can filter on.
//
// WHY THIS PAGE HAD TO EXIST BEFORE THE FILTER COULD WORK. The decision route shipped without a
// queue: nothing listed a pending certification, so no moderator could learn an id, so no claim was
// ever approved — and the manufacturer directory's certification facet matches only APPROVED rows
// carrying one of eight closed `standardCode` values. Two halves of the surface looked finished and
// the middle was missing, so the facet matched nothing on a fully wired page.
//
// FOUR RULES, AND EVERY ONE OF THEM IS ABOUT A CLAIM SOMEBODY ELSE WILL RELY ON:
//
//  1. THE PAPER IS OPENED HERE, ON DEMAND, AND EVERY OPENING IS ON THE RECORD. No projection on
//     this surface carries an evidence id, URL or token; the certificate is fetched by asking for
//     the CERTIFICATION, the backend decrypts it, and a staff read writes `document_downloaded`
//     to that seller's own audit chain. So the viewer opens when somebody presses a button and
//     never on render — twenty rows rendering would be twenty entries in twenty sellers' records
//     for reads nobody made.
//  2. A REJECTION NEEDS A REASON AND AN APPROVAL CANNOT CARRY ONE. The seller reads the reason
//     verbatim in their own console; a refusal nobody explained is one they simply resubmit.
//  3. NOTHING IS OPTIMISTIC. Approving publishes a compliance claim to every buyer browsing the
//     directory. It appears here only once the server has said it happened.
//  4. THE CODE AND THE NAME ARE CHECKED SEPARATELY. `standardName` is free text the seller typed;
//     `standardCode` is the closed value the facet matches. A certificate whose name says ISO 14001
//     and whose code says `iso_9001` is a wrong filter entry, not a typo — reject it.
//
// Gated by `moderate_commerce` — the STORE capability, not `moderate_content` (§17.4).

import { useEffect, useState } from "react";

import { useOwnStaffContextQuery } from "@/hooks/rnd/platform-roles";
import {
  useCertificationEvidenceMutation,
  useCertificationsForModerationList,
  useDecideCertificationMutation,
} from "@/hooks/store/admin-certifications";
import { useResettableAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";
import {
  MODERATION_CERTIFICATION_STATE_LABELS,
  MODERATION_CERTIFICATION_STATES,
  type ModerationCertification,
  type ModerationCertificationState,
} from "@/lib/store/admin-certifications.schemas";
import {
  FACTORY_CERTIFICATION_LABELS,
  FACTORY_CERTIFICATIONS,
} from "@/lib/store/factories.schemas";
import { formatIsoInstantLabel } from "@/lib/store/format";

const CARD_CLASS = "rounded-2xl border border-[#CAC4D0]/60 p-4";

const PRIMARY_BUTTON_CLASS =
  "cursor-pointer rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-40";

const QUIET_BUTTON_CLASS =
  "cursor-pointer rounded-full bg-background px-3 py-1.5 text-xs font-medium text-foreground outline -outline-offset-1 outline-border disabled:opacity-40";

const FIELD_CLASS =
  "mt-1 w-full rounded-lg border border-[#CAC4D0]/60 px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary";

type QueueViewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty" }
  | {
      status: "ready";
      certifications: ModerationCertification[];
      hasNextPage: boolean;
      isFetchingNextPage: boolean;
      loadMoreErrorMessage: string | null;
      loadNextPage: () => void;
    };

export default function CertificationReviewPage() {
  const staffContextQuery = useOwnStaffContextQuery();
  const canDecideCertifications =
    staffContextQuery.data?.capabilities.includes("moderate_commerce") ?? false;

  const [state, setState] = useState<ModerationCertificationState>("pending");

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Certifications</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          A seller&apos;s compliance claim is published to buyers only after somebody here compares
          it against the certificate they uploaded. Approving one puts the factory into the
          directory&apos;s filter for that standard.
        </p>
      </header>

      {staffContextQuery.isError && (
        <output className="block rounded-2xl border border-[#CAC4D0]/60 bg-muted/40 p-3 text-sm text-muted-foreground">
          Couldn&apos;t check your permissions, so nothing here is loaded.
        </output>
      )}
      {staffContextQuery.isSuccess && !canDecideCertifications && (
        <output className="block rounded-2xl border border-[#CAC4D0]/60 bg-muted/40 p-3 text-sm text-muted-foreground">
          Deciding certifications needs the `moderate_commerce` capability. Your role is{" "}
          {staffContextQuery.data.platformRole ?? "none"}, so this page is not loaded.
        </output>
      )}

      {canDecideCertifications && (
        <>
          <div className="flex flex-wrap gap-2">
            {MODERATION_CERTIFICATION_STATES.map((queueState) => (
              <button
                key={queueState}
                type="button"
                onClick={() => setState(queueState)}
                className={
                  queueState === state
                    ? `${QUIET_BUTTON_CLASS} text-primary outline-primary`
                    : QUIET_BUTTON_CLASS
                }
              >
                {MODERATION_CERTIFICATION_STATE_LABELS[queueState]}
              </button>
            ))}
          </div>

          {/*
            KEYED BY THE STATE so switching tabs REMOUNTS the queue rather than reusing one
            accumulator across two different questions. `useKeysetList` has no `enabled`, so this
            is also how the read stays unfired until the capability answers: the subtree does not
            exist until then, rather than a disabled query sitting in `pending` forever.
          */}
          <CertificationQueue key={state} state={state} />
        </>
      )}
    </div>
  );
}

function CertificationQueue({ state }: { state: ModerationCertificationState }) {
  const queue = useCertificationsForModerationList(state);

  const viewState: QueueViewState = (() => {
    if (queue.isLoadingFirstPage) return { status: "loading" };
    if (queue.firstPageErrorMessage !== null) {
      return { status: "error", message: queue.firstPageErrorMessage };
    }
    if (queue.rows.length === 0) return { status: "empty" };
    return {
      status: "ready",
      certifications: queue.rows,
      hasNextPage: queue.hasNextPage,
      isFetchingNextPage: queue.isFetchingNextPage,
      loadMoreErrorMessage: queue.loadMoreErrorMessage,
      loadNextPage: queue.loadNextPage,
    };
  })();

  return renderQueue(viewState);
}

function renderQueue(viewState: QueueViewState) {
  switch (viewState.status) {
    case "loading":
      return <div className={`${CARD_CLASS} h-28 animate-pulse bg-muted/40`} aria-hidden />;
    case "error":
      return (
        <output className="block rounded-2xl border border-destructive/40 p-3 text-sm text-muted-foreground">
          {viewState.message}
        </output>
      );
    case "empty":
      return (
        <p className="rounded-2xl border border-[#CAC4D0]/60 bg-muted/40 p-3 text-sm text-muted-foreground">
          Nothing in this queue.
        </p>
      );
    case "ready":
      return (
        <div className="space-y-3">
          {viewState.certifications.map((certification) => (
            <CertificationRow key={certification.id} certification={certification} />
          ))}
          {viewState.hasNextPage && (
            <button
              type="button"
              disabled={viewState.isFetchingNextPage}
              onClick={viewState.loadNextPage}
              className={QUIET_BUTTON_CLASS}
            >
              {viewState.isFetchingNextPage ? "Loading…" : "Load older claims"}
            </button>
          )}
          {/* Beside the button, never instead of the rows: a failed second page must not blank
              the first one, and a 422 on a cursor the server issued is a real finding. */}
          {viewState.loadMoreErrorMessage !== null && (
            <p className="text-xs leading-4 text-destructive">{viewState.loadMoreErrorMessage}</p>
          )}
        </div>
      );
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}

/**
 * What the viewer is doing, as one value.
 *
 * `error` CARRIES THE BACKEND'S OWN SENTENCE rather than a generic line, because two of the
 * refusals on this route are instructions: the scanner has not finished (wait, do not decide) and
 * the scanner quarantined the file (refuse the claim without opening it).
 */
type EvidenceViewState =
  | { status: "closed" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "open"; objectUrl: string; mediaType: string };

function CertificationRow({ certification }: { certification: ModerationCertification }) {
  const [isRejecting, setIsRejecting] = useState(false);
  const [decisionReason, setDecisionReason] = useState("");
  const [evidence, setEvidence] = useState<EvidenceViewState>({ status: "closed" });
  const decideCertification = useDecideCertificationMutation();
  const loadEvidence = useCertificationEvidenceMutation();
  const { getIdempotencyKey, resetIdempotencyKey } = useResettableAttemptIdempotencyKey();

  /**
   * ONE PLACE REVOKES THE OBJECT URL, AND IT COVERS BOTH WAYS THE VIEWER ENDS.
   *
   * A blob URL pins its bytes in memory for the life of the document, and these bytes are
   * somebody's decrypted compliance paperwork. Closing the viewer replaces `evidence`, which runs
   * this cleanup; unmounting runs it too — and switching queue tabs remounts the whole list. A
   * revoke written at the close handler instead would miss the second case.
   */
  useEffect(() => {
    if (evidence.status !== "open") return undefined;
    const { objectUrl } = evidence;
    return () => URL.revokeObjectURL(objectUrl);
  }, [evidence]);

  function closeEvidence() {
    setEvidence({ status: "closed" });
  }

  function openEvidence() {
    if (evidence.status === "loading") return;
    setEvidence({ status: "loading" });
    loadEvidence.mutate(
      { organizationId: certification.organization.id, certificationId: certification.id },
      {
        onSuccess: (result) => {
          if (!result.success) {
            setEvidence({ status: "error", message: result.error.message });
            return;
          }
          setEvidence({
            status: "open",
            objectUrl: URL.createObjectURL(result.data.blob),
            mediaType: result.data.mediaType,
          });
        },
        onError: () => {
          setEvidence({
            status: "error",
            message: "That certificate could not be opened. Try again.",
          });
        },
      },
    );
  }

  const isDecidable = certification.state === "pending";
  const standardCodeLabel = readStandardCodeLabel(certification.standardCode);

  function submitDecision(input: Parameters<typeof decideCertification.mutate>[0]["input"]) {
    if (decideCertification.isPending) return;
    decideCertification.mutate(
      {
        certificationId: certification.id,
        input,
        idempotencyKey: getIdempotencyKey(),
      },
      {
        onSuccess: (result) => {
          if (!result.success) return;
          resetIdempotencyKey();
          setIsRejecting(false);
          setDecisionReason("");
        },
      },
    );
  }

  return (
    <article className={CARD_CLASS}>
      <h2 className="text-sm font-medium text-foreground">
        {certification.standardName}{" "}
        <span className="font-normal text-muted-foreground">
          · {MODERATION_CERTIFICATION_STATE_LABELS[certification.state]}
        </span>
      </h2>
      {/* BOTH NAMES. The certificate names the legal entity; the display name is who a buyer thinks
          they are dealing with, and a mismatch between them is itself a finding. */}
      <p className="mt-1 text-xs leading-4 text-muted-foreground">
        {certification.organization.legalName} · trading as {certification.organization.displayName}{" "}
        · {certification.organization.slug}
      </p>
      <p className="mt-1 text-xs leading-4 text-muted-foreground">
        {certification.issuerName} · {certification.certificateNumber} · valid{" "}
        {certification.validFrom} to {certification.validUntil}
      </p>
      <p className="mt-1 text-xs leading-4 text-muted-foreground">
        Filterable as: {standardCodeLabel} · submitted{" "}
        {formatIsoInstantLabel(certification.submittedAt)}
      </p>
      {certification.scopeSummary !== null && (
        <p className="mt-1 text-xs leading-4 text-muted-foreground">
          Scope: {certification.scopeSummary}
        </p>
      )}
      {certification.decisionReason !== null && (
        <p className="mt-1 text-xs leading-4 text-amber-800">{certification.decisionReason}</p>
      )}

      {/*
        THE PAPER, BESIDE THE CONTROLS THAT ACT ON IT. Fetched only when this button is pressed:
        a staff read is written to the seller's audit chain, so rendering one per row would fill
        somebody's permanent record with reads nobody made.
      */}
      <div className="mt-3">
        <button
          type="button"
          disabled={evidence.status === "loading"}
          onClick={evidence.status === "open" ? closeEvidence : openEvidence}
          className={QUIET_BUTTON_CLASS}
        >
          {readEvidenceButtonLabel(evidence)}
        </button>
        {renderEvidence(evidence, certification.standardName)}
      </div>

      {isDecidable && !isRejecting && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={decideCertification.isPending}
            onClick={() => submitDecision({ kind: "approve" })}
            className={PRIMARY_BUTTON_CLASS}
          >
            {decideCertification.isPending ? "Recording…" : "Approve and publish"}
          </button>
          <button
            type="button"
            disabled={decideCertification.isPending}
            onClick={() => setIsRejecting(true)}
            className={QUIET_BUTTON_CLASS}
          >
            Refuse with a reason
          </button>
        </div>
      )}

      {isDecidable && isRejecting && (
        <div className="mt-3">
          <label className="block text-xs text-muted-foreground">
            Reason the seller will read, word for word
            <textarea
              value={decisionReason}
              maxLength={2000}
              rows={3}
              onChange={(event) => setDecisionReason(event.target.value)}
              className={FIELD_CLASS}
            />
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={decideCertification.isPending || decisionReason.trim().length === 0}
              onClick={() =>
                submitDecision({ kind: "reject", decisionReason: decisionReason.trim() })
              }
              className={PRIMARY_BUTTON_CLASS}
            >
              {decideCertification.isPending ? "Recording…" : "Refuse this claim"}
            </button>
            <button
              type="button"
              disabled={decideCertification.isPending}
              onClick={() => {
                setIsRejecting(false);
                setDecisionReason("");
              }}
              className={QUIET_BUTTON_CLASS}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* The backend's own sentence. A 409 here means the row was already decided, or that a
          moderator is looking at a claim they submitted themselves and may not review. */}
      {decideCertification.data?.success === false && (
        <p className="mt-2 text-xs leading-4 text-destructive">
          {decideCertification.data.error.message}
        </p>
      )}
      {decideCertification.isError && (
        <p className="mt-2 text-xs leading-4 text-destructive">
          That decision did not record. Try again.
        </p>
      )}
    </article>
  );
}

function readEvidenceButtonLabel(evidence: EvidenceViewState): string {
  switch (evidence.status) {
    case "closed":
      return "Open the certificate";
    case "loading":
      return "Opening…";
    case "error":
      return "Try opening it again";
    case "open":
      return "Close the certificate";
    default: {
      const exhaustiveCheck: never = evidence;
      return exhaustiveCheck;
    }
  }
}

/**
 * The certificate itself.
 *
 * TWO RENDERERS AND NO THIRD. The backend's allowlist is PDF, JPEG and PNG, so an `<embed>` and
 * an `<img>` cover it; anything else means the allowlist changed underneath this component, and
 * saying so is better than guessing at a renderer for bytes nobody expected.
 *
 * `<img>` RATHER THAN `next/image`: the source is a `blob:` URL with no host for the optimizer to
 * fetch from, the same call the studio's upload previews make.
 */
function renderEvidence(evidence: EvidenceViewState, standardName: string) {
  switch (evidence.status) {
    case "closed":
      return null;
    case "loading":
      return <div className={`${CARD_CLASS} mt-2 h-40 animate-pulse bg-muted/40`} aria-hidden />;
    case "error":
      return <p className="mt-2 text-xs leading-4 text-destructive">{evidence.message}</p>;
    case "open":
      if (evidence.mediaType === "application/pdf") {
        return (
          <embed
            src={evidence.objectUrl}
            type="application/pdf"
            title={`Certificate for ${standardName}`}
            className="mt-2 h-[70vh] w-full rounded-xl border border-[#CAC4D0]/60"
          />
        );
      }
      if (evidence.mediaType === "image/jpeg" || evidence.mediaType === "image/png") {
        return (
          // eslint-disable-next-line @next/next/no-img-element -- a blob: URL has no host to optimize
          <img
            src={evidence.objectUrl}
            alt={`Certificate for ${standardName}`}
            className="mt-2 max-h-[70vh] w-full rounded-xl border border-[#CAC4D0]/60 object-contain"
          />
        );
      }
      return (
        <p className="mt-2 text-xs leading-4 text-destructive">
          That certificate arrived as {evidence.mediaType}, which this console cannot display.
          Decide it from the document surface instead.
        </p>
      );
    default: {
      const exhaustiveCheck: never = evidence;
      return exhaustiveCheck;
    }
  }
}

/**
 * The eight closed codes have labels; anything else has none.
 *
 * `null` IS A REAL ANSWER — a certificate outside the eight is unfilterable and still publishes —
 * and an unknown non-null value is a code the backend added that this client has not learned yet.
 * Neither may be rendered as though the seller picked one of ours.
 */
function readStandardCodeLabel(standardCode: string | null): string {
  if (standardCode === null) return "not one of the eight filterable standards";
  const known = FACTORY_CERTIFICATIONS.find((certification) => certification === standardCode);
  return known === undefined ? standardCode : FACTORY_CERTIFICATION_LABELS[known];
}

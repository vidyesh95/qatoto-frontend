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
//  1. THE DECISION IS THE POINT AND THE PAPER IS THE EVIDENCE. Nothing on this page shows the
//     certificate: no projection on this surface carries an evidence id, URL or token, because a
//     certificate carries registration numbers, site addresses and signatures. The moderator reads
//     it through the document surface that audits the read.
//  2. A REJECTION NEEDS A REASON AND AN APPROVAL CANNOT CARRY ONE. The seller reads the reason
//     verbatim in their own console; a refusal nobody explained is one they simply resubmit.
//  3. NOTHING IS OPTIMISTIC. Approving publishes a compliance claim to every buyer browsing the
//     directory. It appears here only once the server has said it happened.
//  4. THE CODE AND THE NAME ARE CHECKED SEPARATELY. `standardName` is free text the seller typed;
//     `standardCode` is the closed value the facet matches. A certificate whose name says ISO 14001
//     and whose code says `iso_9001` is a wrong filter entry, not a typo — reject it.
//
// Gated by `moderate_commerce` — the STORE capability, not `moderate_content` (§17.4).

import { useState } from "react";

import { useOwnStaffContextQuery } from "@/hooks/rnd/platform-roles";
import {
  useCertificationsForModerationQuery,
  useDecideCertificationMutation,
} from "@/hooks/store/admin-certifications";
import { useResettableAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";
import {
  MODERATION_CERTIFICATION_STATE_LABELS,
  MODERATION_CERTIFICATION_STATES,
  type ModerationCertification,
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
  | { status: "restricted" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty" }
  | { status: "ready"; certifications: ModerationCertification[]; hasMore: boolean };

export default function CertificationReviewPage() {
  const staffContextQuery = useOwnStaffContextQuery();
  const canDecideCertifications =
    staffContextQuery.data?.capabilities.includes("moderate_commerce") ?? false;

  const [state, setState] = useState<(typeof MODERATION_CERTIFICATION_STATES)[number]>("pending");
  const certificationsQuery = useCertificationsForModerationQuery(
    { state },
    canDecideCertifications,
  );

  const viewState: QueueViewState = (() => {
    // `restricted` FIRST, and before `loading`: a disabled query sits in `pending` forever, so
    // reading `isPending` first would spin at somebody who may not look.
    if (!canDecideCertifications) return { status: "restricted" };
    if (certificationsQuery.isPending) return { status: "loading" };
    if (certificationsQuery.isError) {
      return { status: "error", message: "That queue could not be loaded." };
    }
    const result = certificationsQuery.data;
    if (result === undefined) return { status: "loading" };
    if (!result.success) return { status: "error", message: result.error.message };
    if (result.data.items.length === 0) return { status: "empty" };
    return {
      status: "ready",
      certifications: result.data.items,
      hasMore: result.data.page.hasMore,
    };
  })();

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
      )}

      {renderQueue(viewState)}
    </div>
  );
}

function renderQueue(viewState: QueueViewState) {
  switch (viewState.status) {
    case "restricted":
      return null;
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
          {/* Said rather than paged: `nextCursor` exists on the wire and no control spends it yet,
              so the honest thing is to say the queue is longer than the page. */}
          {viewState.hasMore && (
            <p className="text-xs text-muted-foreground">
              More rows are waiting than fit on this page. Decide these and reload.
            </p>
          )}
        </div>
      );
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}

function CertificationRow({ certification }: { certification: ModerationCertification }) {
  const [isRejecting, setIsRejecting] = useState(false);
  const [decisionReason, setDecisionReason] = useState("");
  const decideCertification = useDecideCertificationMutation();
  const { getIdempotencyKey, resetIdempotencyKey } = useResettableAttemptIdempotencyKey();

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

// TRANSPORT: client-query — the two pending queues, both verdicts and the decision log all
// call hooks in `@/hooks/rnd/{projects,research-programs,platform-audit}`. The first
// backend-wired surface in the (admin) console; every other page here is still mock.
"use client";

import { useState } from "react";

import { MutationErrorNotice } from "@/components/home/research-and-development/sections/mutation-feedback";
import {
  useDecideResearchCategoryMutation,
  usePendingResearchCategoriesQuery,
} from "@/hooks/rnd/projects";
import { usePlatformAuditTrailQuery } from "@/hooks/rnd/platform-audit";
import { useOwnStaffContextQuery } from "@/hooks/rnd/platform-roles";
import {
  useDecidePaperCategoryMutation,
  usePendingPaperCategoriesQuery,
} from "@/hooks/rnd/research-programs";
import { ApiRequestError } from "@/lib/http";
import { formatIsoInstant } from "@/lib/rnd/format";
import { TAXONOMY_DECISION_EVENT_KINDS } from "@/lib/rnd/platform-audit.schemas";
import {
  CATEGORY_PIN_ICON_KEYS,
  CategoryPinIconKeySchema,
  type CategoryPinIconKey,
} from "@/lib/rnd/shared.schemas";

const AUDIT_PAGE_LIMIT = 50;

/** The two taxonomies normalised to what a queue row actually renders. Neither wire shape
 *  carries a submitter or a timestamp, so neither is offered here. */
type PendingCategoryRow = {
  categoryId: string;
  displayLabel: string;
  slug: string;
};

/** What a row hands back. The union mirrors the backend's own body schema: a rejection
 *  REQUIRES a note, an approval does not, and `pinIconKey` exists only on the approve arm of
 *  the project taxonomy. */
type CategoryVerdict =
  | { decision: "approve"; pinIconKey?: CategoryPinIconKey; note?: string }
  | { decision: "reject"; note: string };

// One list can be loading while the other is ready, so the state is per-queue rather than
// per-page. An exhaustive switch keeps a new variant from rendering as nothing.
type QueueViewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty" }
  | { status: "ready"; rows: PendingCategoryRow[] };

function toQueueViewState(query: {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  data: PendingCategoryRow[] | undefined;
}): QueueViewState {
  if (query.isPending) return { status: "loading" };
  if (query.isError || query.data === undefined) {
    return {
      status: "error",
      message:
        query.error instanceof ApiRequestError
          ? query.error.apiError.message
          : "Couldn't load this queue.",
    };
  }
  return query.data.length === 0 ? { status: "empty" } : { status: "ready", rows: query.data };
}

/**
 * The taxonomy moderation console.
 *
 * TWO TABLES, ONE CAPABILITY. `research_category` backs the founder wizard, the problem map,
 * clusters, market insights and skills; `research_paper_category` backs research paper
 * uploads. They are separate tables with separate routes, but one `moderate_taxonomy` holder
 * decides both — so splitting them across two pages would just hide half the queue.
 *
 * THE STAFF CHECK ASKS THE EXACT QUESTION. `GET /admin/whoami` reports the caller's own
 * capabilities, so this gates on `moderate_taxonomy` itself rather than on some other staff
 * route happening to answer 200. The decision log below is still its own read, and its
 * failure no longer implies anything about permissions.
 *
 * NOTHING HERE IS OPTIMISTIC. A verdict is terminal; deciding an already-decided category
 * answers `409` naming the status it holds, which means another moderator got there first.
 * That is a finding to read, not an action to retry.
 *
 * THE QUEUES THEMSELVES ARE PUBLIC READS. `?status=pending` needs no session on either
 * taxonomy — a proposed term is visible the moment it is proposed. Only the verdict is
 * gated, which is why a non-staff viewer still sees the lists.
 */
export default function CategoryReviewPage() {
  const staffContextQuery = useOwnStaffContextQuery();
  const projectCategoriesQuery = usePendingResearchCategoriesQuery();
  const paperCategoriesQuery = usePendingPaperCategoriesQuery();
  const auditQuery = usePlatformAuditTrailQuery({ limit: AUDIT_PAGE_LIMIT });

  const projectDecision = useDecideResearchCategoryMutation();
  const paperDecision = useDecidePaperCategoryMutation();

  // THE EXACT CAPABILITY, not a proxy. This used to infer staff status from the audit read
  // succeeding, which tested `moderate_content` — a capability that merely travels with
  // `moderate_taxonomy` under today's grant table rather than implying it. It also meant any
  // failure at all, a 401 or a dropped connection included, rendered as "you lack rights".
  const canDecideCategories =
    staffContextQuery.data?.capabilities.includes("moderate_taxonomy") ?? false;

  const firstError = [projectDecision.error, paperDecision.error].find(
    (error): error is ApiRequestError => error instanceof ApiRequestError,
  );

  const projectQueueState = toQueueViewState({
    isPending: projectCategoriesQuery.isPending,
    isError: projectCategoriesQuery.isError,
    error: projectCategoriesQuery.error,
    data: projectCategoriesQuery.data?.map((category) => ({
      categoryId: category.id,
      displayLabel: category.displayLabel,
      slug: category.slug,
    })),
  });

  const paperQueueState = toQueueViewState({
    isPending: paperCategoriesQuery.isPending,
    isError: paperCategoriesQuery.isError,
    error: paperCategoriesQuery.error,
    data: paperCategoriesQuery.data?.map((category) => ({
      categoryId: category.id,
      displayLabel: category.displayLabel,
      slug: category.slug,
    })),
  });

  // One unfiltered read serves as the probe; the two taxonomy kinds are picked out here
  // because the backend's `?eventKind=` takes a single value and two requests would be a
  // second probe for nothing. The heading says what the bound is.
  const taxonomyDecisions = (auditQuery.data?.rows ?? []).filter((entry) =>
    (TAXONOMY_DECISION_EVENT_KINDS as readonly string[]).includes(entry.eventKind),
  );

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Categories</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Terms proposed by users across both taxonomies. A category is usable the moment it is
          proposed — approving settles the name, rejecting takes it out of circulation everywhere.
        </p>
      </header>

      {/* Three distinct cases, said apart. The old single banner asserted "you lack rights"
          for all of them, including a check that never completed. */}
      {staffContextQuery.isError && (
        <output className="block rounded-2xl border border-[#CAC4D0]/60 bg-muted/40 p-3 text-sm text-muted-foreground">
          Couldn&apos;t check your permissions, so the queues below are read-only.
        </output>
      )}
      {staffContextQuery.isSuccess && !canDecideCategories && (
        <output className="block rounded-2xl border border-[#CAC4D0]/60 bg-muted/40 p-3 text-sm text-muted-foreground">
          Deciding categories needs the moderator or admin role. Your role is{" "}
          {staffContextQuery.data.platformRole ?? "none"}, so the queues below are read-only.
        </output>
      )}

      {firstError && <MutationErrorNotice error={firstError.apiError} />}

      <CategoryQueueSection
        title="Project & discovery taxonomy"
        description="Used by the founder wizard, the problem map, clusters, market insights and skills."
        state={projectQueueState}
        canDecide={canDecideCategories}
        isDeciding={projectDecision.isPending}
        supportsPinIcon
        onDecide={(categoryId, verdict) => {
          projectDecision.mutate({ categoryId, input: verdict });
        }}
      />

      <CategoryQueueSection
        title="Research paper taxonomy"
        description="Used by research paper uploads on a programme."
        state={paperQueueState}
        canDecide={canDecideCategories}
        isDeciding={paperDecision.isPending}
        supportsPinIcon={false}
        onDecide={(categoryId, verdict) => {
          // `pinIconKey` is not on this taxonomy's schema, and its body is `.strict()` — so
          // it is dropped here rather than sent and 422'd.
          paperDecision.mutate({
            categoryId,
            input:
              verdict.decision === "approve"
                ? {
                    decision: "approve",
                    ...(verdict.note === undefined ? {} : { note: verdict.note }),
                  }
                : verdict,
          });
        }}
      />

      {auditQuery.isSuccess && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Recent decisions</h2>
          <p className="text-xs text-muted-foreground">
            Taxonomy verdicts among the latest {AUDIT_PAGE_LIMIT} platform actions. Not the whole
            log.
          </p>
          {taxonomyDecisions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No taxonomy decisions in this window.</p>
          ) : (
            <ul className="space-y-2">
              {taxonomyDecisions.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-xl border border-[#CAC4D0]/60 bg-card p-3 text-xs"
                >
                  <p className="font-medium">{entry.actionLabel}</p>
                  <p className="text-muted-foreground">{entry.targetLabel}</p>
                  <p className="text-muted-foreground">
                    {/* Null when the account is gone — the id is shown rather than an
                        invented "Unknown moderator". The role is the snapshot taken at the
                        time, not what they hold now. */}
                    {entry.actorName ?? entry.actorUserId} · {entry.actorRoleSnapshot} ·{" "}
                    {formatIsoInstant(entry.occurredAt)}
                  </p>
                  {entry.detailNote !== "" && <p className="mt-1">{entry.detailNote}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function CategoryQueueSection({
  title,
  description,
  state,
  canDecide,
  isDeciding,
  supportsPinIcon,
  onDecide,
}: {
  title: string;
  description: string;
  state: QueueViewState;
  canDecide: boolean;
  isDeciding: boolean;
  supportsPinIcon: boolean;
  onDecide: (categoryId: string, verdict: CategoryVerdict) => void;
}) {
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-lg font-medium">{title}</h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {renderQueue()}
    </section>
  );

  function renderQueue() {
    switch (state.status) {
      case "loading":
        return <p className="text-sm text-muted-foreground">Loading…</p>;
      case "error":
        return (
          <p
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {state.message}
          </p>
        );
      case "empty":
        return <p className="text-sm text-muted-foreground">Nothing awaiting review.</p>;
      case "ready":
        return (
          <ul className="space-y-3">
            {state.rows.map((row) => (
              <PendingCategoryCard
                key={row.categoryId}
                row={row}
                canDecide={canDecide}
                isDeciding={isDeciding}
                supportsPinIcon={supportsPinIcon}
                onDecide={onDecide}
              />
            ))}
          </ul>
        );
      default: {
        const exhaustiveCheck: never = state;
        return exhaustiveCheck;
      }
    }
  }
}

function PendingCategoryCard({
  row,
  canDecide,
  isDeciding,
  supportsPinIcon,
  onDecide,
}: {
  row: PendingCategoryRow;
  canDecide: boolean;
  isDeciding: boolean;
  supportsPinIcon: boolean;
  onDecide: (categoryId: string, verdict: CategoryVerdict) => void;
}) {
  const [note, setNote] = useState("");
  const [pinIconKey, setPinIconKey] = useState<"" | CategoryPinIconKey>("");

  const trimmedNote = note.trim();
  // The backend's own asymmetry, mirrored rather than tightened: `note` is `min(1)` on the
  // reject arm and optional on approve. Requiring one on both would be a stricter rule than
  // the server's, invented here.
  const canReject = canDecide && !isDeciding && trimmedNote.length > 0;
  const canApprove = canDecide && !isDeciding;

  return (
    <li className="space-y-3 rounded-2xl border border-[#CAC4D0]/60 bg-card p-4">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{row.displayLabel}</p>
        <p className="font-mono text-xs text-muted-foreground">{row.slug}</p>
      </div>

      {canDecide && (
        <>
          <label className="block space-y-1 text-xs">
            <span className="font-medium">Note</span>
            <textarea
              value={note}
              onChange={(changeEvent) => setNote(changeEvent.target.value)}
              maxLength={2000}
              rows={2}
              placeholder="Required to reject. Optional when approving."
              className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
            />
          </label>

          {supportsPinIcon && (
            <label className="block space-y-1 text-xs">
              <span className="font-medium">Map pin icon (optional)</span>
              <select
                value={pinIconKey}
                onChange={(changeEvent) => {
                  // Parsed, not asserted. The "leave unchanged" option carries "", which
                  // fails the enum and correctly falls back to the unset state.
                  const parsedIconKey = CategoryPinIconKeySchema.safeParse(
                    changeEvent.target.value,
                  );
                  setPinIconKey(parsedIconKey.success ? parsedIconKey.data : "");
                }}
                className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
              >
                {/* Unset is sent as an ABSENT key, not a default value — the backend then
                    skips the column instead of stamping it. */}
                <option value="">Leave unchanged</option>
                {CATEGORY_PIN_ICON_KEYS.map((iconKey) => (
                  <option key={iconKey} value={iconKey}>
                    {iconKey}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!canApprove}
              onClick={() =>
                onDecide(row.categoryId, {
                  decision: "approve",
                  ...(pinIconKey === "" ? {} : { pinIconKey }),
                  ...(trimmedNote === "" ? {} : { note: trimmedNote }),
                })
              }
              className="cursor-pointer rounded-full bg-[#00696E] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#00393C] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Approve
            </button>
            <button
              type="button"
              disabled={!canReject}
              onClick={() => onDecide(row.categoryId, { decision: "reject", note: trimmedNote })}
              className="cursor-pointer rounded-full border border-[#BA1A1A] px-4 py-2 text-xs font-medium text-[#BA1A1A] transition-colors hover:bg-[#BA1A1A]/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Reject
            </button>
            {trimmedNote === "" && (
              <span className="text-[10px] text-muted-foreground">
                A note is required to reject.
              </span>
            )}
          </div>
        </>
      )}
    </li>
  );
}

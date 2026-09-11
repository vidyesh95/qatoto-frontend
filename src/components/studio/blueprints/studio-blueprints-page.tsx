// TRANSPORT: client-query — `GET /blueprints/teardowns/mine` through
// `@/hooks/blueprints/authoring`, which is mock-backed today.
"use client";

import Link from "next/link";

import StatusPanel from "@/components/home/shared/status-panel";
import { useMyTeardownSubmissionsQuery } from "@/hooks/blueprints/authoring";
import {
  BLUEPRINT_MODERATION_STATE_LABELS,
  buildBlueprintHref,
  type BlueprintModerationState,
} from "@/lib/blueprints/schemas";
import { formatIsoInstantAsDateLabel } from "@/lib/store/format";

/**
 * Chip chrome per state.
 *
 * ⚠️ A `Record` OVER THE WHOLE ENUM, so an eighth moderation state is a compile error here rather
 * than an unstyled chip somebody notices in production. It is also why `rejected` was caught
 * everywhere the moment it was added to the tuple.
 *
 * ⚠️ THE PALETTE STAYS INSIDE THE ONE HUE RULE. Four of the seven are neutral, `published` takes the
 * imprint wash and the two adverse states take `Destructive`. No green for published and no amber
 * for pending: `docs/Design.md` §2 allows one hue family plus one blue and one red, and a status
 * list is exactly where a rainbow gets introduced by accident.
 */
const MODERATION_STATE_CHIP_CLASS: Record<BlueprintModerationState, string> = {
  draft: "border-border bg-card text-muted-foreground",
  pending_review: "border-border bg-card text-foreground",
  published: "border-transparent bg-[#00696E] text-white",
  rejected: "border-destructive/40 bg-destructive/10 text-destructive",
  flagged: "border-destructive/40 bg-destructive/10 text-destructive",
  quarantined: "border-destructive/40 bg-destructive/10 text-destructive",
  removed: "border-border bg-card text-muted-foreground",
};

/**
 * What each state means to the AUTHOR, which is not what it means to a reader.
 *
 * A reader is told a quarantined teardown is under a claim; its author needs to know their work has
 * not been deleted. Same row, different audience, so this is a second record rather than a reuse of
 * the public chip notes.
 */
const MODERATION_STATE_AUTHOR_NOTES: Record<BlueprintModerationState, string | null> = {
  draft: "Not submitted yet. Nobody else can see it.",
  pending_review: "With a moderator. It is not public and cannot be found by searching.",
  published: null,
  rejected: null,
  flagged: null,
  quarantined: null,
  removed: "Taken down. The page is gone and the address answers as though it never existed.",
};

/**
 * The author's own teardowns.
 *
 * ⚠️ NO CAPABILITY GATING. This is somebody's own list, and no studio page gates a user's own
 * content behind a capability — auth alone is the gate, and the `(admin)` `staffContext` pattern
 * would be borrowing a permission check from a moderation queue this page is not.
 *
 * ⚠️ THE LIST DOES NOT SEE ANYTHING SUBMITTED THIS SESSION, and the wizard's receipt is where that
 * is disclosed rather than here. `submitTeardownForReview` stores nothing — there is no table — so
 * these rows are a fixed fixture set covering every state. Joining the two would need fake
 * persistence that loses an author's work on reload, or a second storage key CLAUDE.md forbids.
 */
export default function StudioBlueprintsPage() {
  const submissionsQuery = useMyTeardownSubmissionsQuery();

  return (
    <div className="px-4 py-6 lg:px-6">
      {/* `max-w-3xl`, THE SAME AS THE LIST, so the publish button's right edge lines up with the
          status chips below it. Full width, it sat at the far edge of the page, 300px past the
          column it belongs to. */}
      <div className="flex max-w-3xl flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-medium text-foreground">My teardowns</h1>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            Surveys you have submitted, and where each one has got to.
          </p>
        </div>
        <Link
          href="/blueprints/teardowns/new"
          className="rounded-full bg-[#00696E] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#00393C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E]"
        >
          Publish a teardown
        </Link>
      </div>

      {/* A SKELETON IN THE LIST'S OWN SHAPE, not a "Loading…" line: `product.md` asks for skeletons
          over spinners, and three rows of title, meta line and chip is what the list resolves into,
          so nothing jumps when it arrives. The real words are for screen readers. */}
      {submissionsQuery.isPending ? (
        <div className="mt-6 max-w-3xl">
          <p className="sr-only">Loading your teardowns</p>
          <ul aria-hidden="true" className="animate-pulse">
            {[0, 1, 2].map((placeholderIndex) => (
              <li
                key={placeholderIndex}
                className="flex items-start justify-between gap-4 border-t border-border py-4"
              >
                <div className="w-full max-w-md space-y-2">
                  <div className="h-4 w-3/4 rounded-full bg-muted" />
                  <div className="h-3 w-1/2 rounded-full bg-muted" />
                </div>
                <div className="h-6 w-20 shrink-0 rounded-full bg-muted" />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {submissionsQuery.isError ? (
        <div className="mt-6">
          <StatusPanel message="Couldn't load your teardowns. Please try again." />
        </div>
      ) : null}

      {/*
        AN EMPTY LIST IS NOT AN ERROR, and the copy says why it might be empty rather than just that
        it is. ⚠️ THIS BRANCH IS UNEXERCISED TODAY: the fixtures are never empty, so nothing renders
        it. It ships because it is what every real first-time author sees, and it is recorded in
        `todo.md` rather than dropped or faked behind a query param.
      */}
      {submissionsQuery.isSuccess && submissionsQuery.data.length === 0 ? (
        <div className="mt-6 max-w-xl">
          <h2 className="text-sm font-medium text-foreground">Nothing here yet</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            A teardown is your own survey of something you bought and took apart. Somebody with
            little capital reads it to work out whether they could build the same thing.
          </p>
        </div>
      ) : null}

      {submissionsQuery.isSuccess && submissionsQuery.data.length > 0 ? (
        <ul className="mt-6 max-w-3xl">
          {submissionsQuery.data.map((submission) => {
            const authorNote = MODERATION_STATE_AUTHOR_NOTES[submission.moderationState];

            return (
              <li key={submission.submissionId} className="border-t border-border py-4">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{submission.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {/* ⚠️ A DRAFT WAS NEVER SUBMITTED, so its date is when it was started. The
                          row used to read "submitted Sep 9, 2026" directly above its own note
                          "Not submitted yet", which is the page contradicting itself. */}
                      {submission.subjectProductName} &middot;{" "}
                      {submission.moderationState === "draft" ? "started" : "submitted"}{" "}
                      {formatIsoInstantAsDateLabel(submission.submittedAt)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${MODERATION_STATE_CHIP_CLASS[submission.moderationState]}`}
                  >
                    {BLUEPRINT_MODERATION_STATE_LABELS[submission.moderationState]}
                  </span>
                </div>

                {authorNote === null ? null : (
                  <p className="mt-2 max-w-prose text-xs text-muted-foreground">{authorNote}</p>
                )}

                {/*
                  ⚠️ THE MODERATOR'S OWN WORDS, VERBATIM. The contract refuses a `rejected` row that
                  carries no reason, because a rejection somebody cannot act on produces a
                  resubmission of the same thing and then a second rejection.
                */}
                {submission.moderatorNote === null ? null : (
                  <p className="mt-2 max-w-prose rounded-xl border border-border bg-card p-3 text-sm leading-6 text-foreground">
                    {submission.moderatorNote}
                  </p>
                )}

                {/* Only a published row has a public address — see `TeardownSubmissionSchema`. */}
                {submission.publicSlug === null ? null : (
                  <Link
                    href={buildBlueprintHref({
                      category: "teardown",
                      slug: submission.publicSlug,
                    })}
                    className="mt-2 inline-block text-sm font-medium text-[#00696E] transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E]"
                  >
                    View the page
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

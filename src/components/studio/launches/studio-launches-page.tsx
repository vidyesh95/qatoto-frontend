// TRANSPORT: client-query — `GET /blueprints/showcase/mine` through
// `@/hooks/blueprints/showcase-authoring`, which is mock-backed today.
"use client";

import Image from "next/image";
import Link from "next/link";

import StatusPanel from "@/components/home/shared/status-panel";
import {
  SUBMISSION_STATE_CHIP_CLASS,
  SUBMISSION_STATE_LABELS,
} from "@/components/studio/blueprints/moderation-state-chip";
import { useMyShowcaseSubmissionsQuery } from "@/hooks/blueprints/showcase-authoring";
import { buildBlueprintHref, type BlueprintSubmissionDisplayState } from "@/lib/blueprints/schemas";
import { formatIsoInstantAsDateLabel } from "@/lib/store/format";

/**
 * What each state means to the MAKER of a launch. A second record rather than a reuse of the
 * teardown notes, because "not in the feed" and "not public and cannot be found by searching" are
 * different sentences for different surfaces.
 */
const LAUNCH_STATE_AUTHOR_NOTES: Record<BlueprintSubmissionDisplayState, string | null> = {
  draft: "Not posted yet. Nobody else can see it.",
  pending_review: "With a moderator. It is not in the feed yet.",
  published: null,
  rejected: null,
  flagged: null,
  quarantined: null,
  removed: "Taken down. The page is gone and the address answers as though it never existed.",
  unknown: "This launch has a status this app does not know yet. Refresh the page.",
};

/**
 * The maker's own launches.
 *
 * ⚠️ MANAGEMENT ONLY, as `/studio/blueprints` is for teardowns: the form lives once, at
 * `/blueprints/showcase/new`, and this page links to it rather than embedding it. No home feature
 * component is imported here; shared pieces like `StatusPanel` are.
 *
 * ⚠️ THE LIST DOES NOT SEE ANYTHING POSTED THIS SESSION, and the launch receipt is where that is
 * disclosed. `submitShowcaseForReview` stores nothing, so these rows are a fixed fixture set.
 *
 * NO CAPABILITY GATING. It is somebody's own list; auth alone is the gate.
 */
export default function StudioLaunchesPage() {
  const submissionsQuery = useMyShowcaseSubmissionsQuery();

  return (
    <div className="px-4 py-6 lg:px-6">
      {/* `max-w-3xl`, the same as the list, so the post button's right edge lines up with the chips. */}
      <div className="flex max-w-3xl flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-medium text-foreground">My launches</h1>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            Builds you have posted, and where each one has got to.
          </p>
        </div>
        <Link
          href="/blueprints/showcase/new"
          className="rounded-full bg-[#00696E] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#00393C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E]"
        >
          Post a launch
        </Link>
      </div>

      {/* A skeleton in the list's own shape: a square image, two lines and a chip per row. */}
      {submissionsQuery.isPending ? (
        <div className="mt-6 max-w-3xl">
          <p className="sr-only">Loading your launches</p>
          <ul aria-hidden="true" className="animate-pulse">
            {[0, 1, 2].map((placeholderIndex) => (
              <li
                key={placeholderIndex}
                className="flex items-start justify-between gap-4 border-t border-border py-4"
              >
                <div className="flex w-full max-w-md items-start gap-3">
                  <div className="size-10 shrink-0 rounded-md bg-muted" />
                  <div className="w-full space-y-2">
                    <div className="h-4 w-3/4 rounded-full bg-muted" />
                    <div className="h-3 w-1/2 rounded-full bg-muted" />
                  </div>
                </div>
                <div className="h-6 w-20 shrink-0 rounded-full bg-muted" />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {submissionsQuery.isError ? (
        <div className="mt-6">
          <StatusPanel message="Couldn't load your launches. Please try again." />
        </div>
      ) : null}

      {/*
        AN EMPTY LIST IS NOT AN ERROR. ⚠️ UNEXERCISED TODAY: the fixtures are never empty. It ships
        because it is what every real first-time maker sees, and it is recorded in `todo.md`.
      */}
      {submissionsQuery.isSuccess && submissionsQuery.data.length === 0 ? (
        <div className="mt-6 max-w-xl">
          <h2 className="text-sm font-medium text-foreground">Nothing here yet</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            A launch is a working prototype or a finished build, posted with what it proved.
            Somebody deciding whether to back or buy it reads the launch first.
          </p>
        </div>
      ) : null}

      {submissionsQuery.isSuccess && submissionsQuery.data.length > 0 ? (
        <ul className="mt-6 max-w-3xl">
          {submissionsQuery.data.map((submission) => {
            const authorNote = LAUNCH_STATE_AUTHOR_NOTES[submission.moderationState];

            return (
              // THE IMAGE OWNS THE LEFT COLUMN AND EVERYTHING ELSE SITS BESIDE IT, chip included. With the
              // chip as the image's sibling it wrapped under the image on a phone, flush left, while the
              // notes below it were indented: two left edges in one row.
              <li
                key={submission.submissionId}
                className="flex items-start gap-3 border-t border-border py-4"
              >
                <Image
                  src={submission.headingImageUrl}
                  alt=""
                  width={40}
                  height={40}
                  className="size-10 shrink-0 rounded-md bg-muted object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{submission.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {submission.tagline} &middot;{" "}
                        {/* A draft was never posted, so its date is when it was started. */}
                        {submission.moderationState === "draft" ? "started" : "posted"}{" "}
                        {formatIsoInstantAsDateLabel(submission.submittedAt)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${SUBMISSION_STATE_CHIP_CLASS[submission.moderationState]}`}
                    >
                      {SUBMISSION_STATE_LABELS[submission.moderationState]}
                    </span>
                  </div>

                  {authorNote === null ? null : (
                    <p className="mt-2 max-w-prose text-xs text-muted-foreground">{authorNote}</p>
                  )}

                  {/* The moderator's own words, verbatim. The contract refuses a rejected row without them. */}
                  {submission.moderatorNote === null ? null : (
                    <p className="mt-2 max-w-prose rounded-xl border border-border bg-card p-3 text-sm leading-6 text-foreground">
                      {submission.moderatorNote}
                    </p>
                  )}

                  {/* Only a launch with a public address links to it. */}
                  {submission.publicSlug === null ? null : (
                    <Link
                      href={buildBlueprintHref({
                        category: "showcase",
                        slug: submission.publicSlug,
                      })}
                      className="mt-2 inline-block text-sm font-medium text-[#00696E] transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E]"
                    >
                      View the launch
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

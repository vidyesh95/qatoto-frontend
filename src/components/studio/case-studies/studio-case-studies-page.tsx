// TRANSPORT: client-query — `GET /blueprints/case-studies/mine` through
// `@/hooks/blueprints/case-study-authoring`, which is mock-backed today.
"use client";

import Link from "next/link";

import StatusPanel from "@/components/home/shared/status-panel";
import {
  SUBMISSION_STATE_CHIP_CLASS,
  SUBMISSION_STATE_LABELS,
} from "@/components/studio/blueprints/moderation-state-chip";
import { useMyCaseStudySubmissionsQuery } from "@/hooks/blueprints/case-study-authoring";
import {
  BLUEPRINT_DISCIPLINE_LABELS,
  buildBlueprintHref,
  type BlueprintSubmissionDisplayState,
} from "@/lib/blueprints/schemas";
import { formatIsoInstantAsDateLabel } from "@/lib/store/format";

/** What each state means to the WRITER of a case study, in this list's own words. */
const CASE_STUDY_STATE_AUTHOR_NOTES: Record<BlueprintSubmissionDisplayState, string | null> = {
  draft: "Not sent yet. Nobody else can see it.",
  pending_review: "With a moderator. It is not in the case-study list yet.",
  published: null,
  rejected: null,
  flagged: null,
  quarantined: null,
  removed: "Taken down. The page is gone and the address answers as though it never existed.",
  unknown: "This case study has a status this app does not know yet. Refresh the page.",
};

/**
 * The shared labels, with ONE WORD CHANGED. The shared `flagged` label, "IP concern reported", names
 * a teardown's report. A report on a case study is usually a company saying a figure about it is
 * wrong, and a chip that names the wrong kind of report tells the writer the wrong thing to fix.
 */
const CASE_STUDY_STATE_LABELS: Record<BlueprintSubmissionDisplayState, string> = {
  ...SUBMISSION_STATE_LABELS,
  flagged: "Report received",
};

/**
 * The writer's own case studies.
 *
 * ⚠️ MANAGEMENT ONLY, as My Launches is: the form lives once, at `/blueprints/case-studies/new`, and
 * this page links to it rather than embedding it.
 *
 * ⚠️ THE LIST DOES NOT SEE ANYTHING SENT THIS SESSION, and the receipt is where that is disclosed.
 *
 * NO CAPABILITY GATING. It is somebody's own list; auth alone is the gate.
 */
export default function StudioCaseStudiesPage() {
  const submissionsQuery = useMyCaseStudySubmissionsQuery();

  return (
    <div className="px-4 py-6 lg:px-6">
      {/* `max-w-3xl`, the same as the list, so the write button's right edge lines up with the chips. */}
      <div className="flex max-w-3xl flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-medium text-foreground">My case studies</h1>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            Lessons you have written, and where each one has got to.
          </p>
        </div>
        <Link
          href="/blueprints/case-studies/new"
          className="rounded-full bg-[#00696E] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#00393C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E]"
        >
          Write a case study
        </Link>
      </div>

      {submissionsQuery.isPending ? (
        <div className="mt-6 max-w-3xl">
          <p className="sr-only">Loading your case studies</p>
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
          <StatusPanel message="Couldn't load your case studies. Please try again." />
        </div>
      ) : null}

      {/* AN EMPTY LIST IS NOT AN ERROR. ⚠️ UNEXERCISED TODAY: the fixtures are never empty. */}
      {submissionsQuery.isSuccess && submissionsQuery.data.length === 0 ? (
        <div className="mt-6 max-w-xl">
          <h2 className="text-sm font-medium text-foreground">Nothing here yet</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            A case study is one lesson somebody learned the expensive way, written as a record a
            founder can act on.
          </p>
        </div>
      ) : null}

      {submissionsQuery.isSuccess && submissionsQuery.data.length > 0 ? (
        <ul className="mt-6 max-w-3xl">
          {submissionsQuery.data.map((submission) => {
            const authorNote = CASE_STUDY_STATE_AUTHOR_NOTES[submission.moderationState];

            return (
              <li key={submission.submissionId} className="border-t border-border py-4">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{submission.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {BLUEPRINT_DISCIPLINE_LABELS[submission.discipline]} &middot;{" "}
                      {/* A draft was never sent, so its date is when it was started. */}
                      {submission.moderationState === "draft" ? "started" : "sent"}{" "}
                      {formatIsoInstantAsDateLabel(submission.submittedAt)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${SUBMISSION_STATE_CHIP_CLASS[submission.moderationState]}`}
                  >
                    {CASE_STUDY_STATE_LABELS[submission.moderationState]}
                  </span>
                </div>

                <p className="mt-2 max-w-prose text-sm text-foreground">
                  {submission.oneLineAction}
                </p>

                {authorNote === null ? null : (
                  <p className="mt-2 max-w-prose text-xs text-muted-foreground">{authorNote}</p>
                )}

                {/* The moderator's own words, verbatim. The contract refuses a rejected row without them. */}
                {submission.moderatorNote === null ? null : (
                  <p className="mt-2 max-w-prose rounded-xl border border-border bg-card p-3 text-sm leading-6 text-foreground">
                    {submission.moderatorNote}
                  </p>
                )}

                {submission.publicSlug === null ? null : (
                  <Link
                    href={buildBlueprintHref({
                      category: "case_study",
                      slug: submission.publicSlug,
                    })}
                    className="mt-2 inline-block text-sm font-medium text-[#00696E] transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E]"
                  >
                    View the case study
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

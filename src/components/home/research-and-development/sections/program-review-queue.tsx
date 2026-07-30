// TRANSPORT: client-query — reads GET /research-programs/review-queue and writes
// POST …/:programSlug/moderate. Moderator only; the read 403s for anyone else.
"use client";

import Link from "next/link";
import { useState } from "react";

import {
  useModerateResearchProgramMutation,
  useProgramReviewQueueQuery,
} from "@/hooks/rnd/research-programs";
import { formatIsoInstant } from "@/lib/rnd/format";

/**
 * The moderator's programme review queue.
 *
 * RENDERS NOTHING AT ALL for a non-moderator. The read 403s, and an error panel saying so on
 * everybody's index page would be noise about a surface that is not theirs — so a failed read is
 * treated as "not for you" and the section disappears. That is the one place on this surface where
 * swallowing an error is right, because the error IS the answer.
 *
 * OLDEST FIRST, matching the backend: a queue sorted newest-first starves its own tail, and the
 * person who has been waiting longest is the one owed a decision.
 *
 * THE NOTE IS REQUIRED ON BOTH VERDICTS. It is the only thing the submitter will see, and a
 * rejection with no reason is not a review.
 */
export default function ProgramReviewQueue() {
  const queueQuery = useProgramReviewQueueQuery({ isEnabled: true });

  if (queueQuery.isPending) {
    return <p className="px-4 text-sm text-muted-foreground lg:px-6">Checking the queue…</p>;
  }

  // A 403 means this viewer is not a moderator. Nothing to say.
  if (queueQuery.isError || !queueQuery.data) return null;

  if (queueQuery.data.rows.length === 0) {
    return (
      <p className="px-4 text-sm text-muted-foreground lg:px-6">
        No programmes are awaiting review.
      </p>
    );
  }

  return (
    <ul className="space-y-3 px-4 lg:px-6">
      {queueQuery.data.rows.map((program) => (
        <ReviewQueueRow
          key={program.programId}
          programSlug={program.slug}
          title={program.title}
          tagline={program.tagline}
          createdAt={program.createdAt}
        />
      ))}
    </ul>
  );
}

function ReviewQueueRow({
  programSlug,
  title,
  tagline,
  createdAt,
}: {
  programSlug: string;
  title: string;
  tagline: string;
  createdAt: string;
}) {
  // One mutation per row, because the hook is keyed on the slug — a shared one would invalidate
  // the wrong programme's detail.
  const moderateMutation = useModerateResearchProgramMutation(programSlug);
  const [reviewerNote, setReviewerNote] = useState("");

  return (
    <li className="space-y-3 rounded-2xl border border-[#CAC4D0]/60 bg-card p-4">
      <div className="space-y-1">
        <Link
          href={`/research-and-development/programs/${programSlug}`}
          className="text-sm font-medium underline"
        >
          {title}
        </Link>
        <p className="text-sm text-muted-foreground">{tagline}</p>
        <p className="text-xs text-muted-foreground">Submitted {formatIsoInstant(createdAt)}</p>
      </div>

      <input
        value={reviewerNote}
        onChange={(event) => setReviewerNote(event.target.value)}
        maxLength={2000}
        placeholder="Your note — the submitter reads this"
        className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={moderateMutation.isPending || !reviewerNote.trim()}
          onClick={() =>
            moderateMutation.mutate({ decision: "published", reviewerNote: reviewerNote.trim() })
          }
          className="cursor-pointer rounded-full bg-[#00696E] px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#00393C] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Publish
        </button>
        <button
          type="button"
          disabled={moderateMutation.isPending || !reviewerNote.trim()}
          onClick={() =>
            moderateMutation.mutate({ decision: "rejected", reviewerNote: reviewerNote.trim() })
          }
          className="cursor-pointer rounded-full border border-[#BA1A1A] px-4 py-1.5 text-xs text-[#BA1A1A] transition-colors hover:bg-[#BA1A1A]/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Reject
        </button>
      </div>
    </li>
  );
}

// TRANSPORT: client-query — reads `GET /pitches/review-queue` and writes
// `POST /pitches/:pitchId/moderate`. Moderator only; the read 403s for anyone else.
"use client";

import Image from "next/image";
import { useState } from "react";

import { describeLinkDestination } from "@/components/pitches/pitch-shared";
import { INPUT_CLASS } from "@/components/ui/field-classes";
import { useModeratePitchMutation, usePitchReviewQueueQuery } from "@/hooks/rnd/pitches";
import { ApiRequestError } from "@/lib/http";
import type { PitchReviewQueueEntry } from "@/lib/rnd/pitches.schemas";

/**
 * The moderator's pitch review queue.
 *
 * RENDERS NOTHING AT ALL for a non-moderator, matching `program-review-queue.tsx`. The read
 * 403s, and an error panel about a surface that is not yours would be noise — here the
 * error IS the answer, which is the one place on this surface where swallowing one is right.
 *
 * ⚠️ WHAT A MODERATOR IS DECIDING, and it is narrower than it looks. Spam, scams, illegal
 * content, and whether the links go where the pitch says they go. NOT whether the venture is
 * any good, whether the raise is realistic, or whether the numbers on the third-party page
 * add up. Judging merit would make listing a pitch read as endorsing it, and Qatoto's whole
 * position — lists pitches, holds no funds, promises nothing — depends on not doing that.
 *
 * THE LINKS ARE ON THE CARD for that reason: where a pitch actually sends people is the
 * single most important thing to check, and making someone open the pitch to see it is how
 * that check gets skipped.
 *
 * A REJECTION REQUIRES A REASON. The submitter sees it and nothing else, so a rejection
 * without one is a wall rather than a decision — and the server refuses it anyway.
 */
export default function PitchReviewQueue() {
  const queueQuery = usePitchReviewQueueQuery(1);

  if (queueQuery.isPending) return null;

  // A 403 means this viewer is not a moderator. Nothing to say.
  if (queueQuery.error !== null) return null;

  if (queueQuery.data.rows.length === 0) {
    return (
      <section className="px-4 lg:px-6">
        <h2 className="font-serif text-xl font-semibold">Pitch review</h2>
        <p className="mt-1 text-sm text-muted-foreground">No pitches are waiting for review.</p>
      </section>
    );
  }

  return (
    <section className="space-y-3 px-4 lg:px-6">
      <header className="space-y-1">
        <h2 className="font-serif text-xl font-semibold">Pitch review</h2>
        <p className="text-sm text-muted-foreground">
          Oldest first. Check for spam, scams, illegal content and links that do not go where the
          pitch says — <strong>not</strong> whether the venture is a good one.
        </p>
      </header>

      <ul className="space-y-3">
        {queueQuery.data.rows.map((entry) => (
          <li key={entry.id}>
            <ReviewQueueCard entry={entry} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ReviewQueueCard({ entry }: { readonly entry: PitchReviewQueueEntry }) {
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);
  const moderateMutation = useModeratePitchMutation();

  const error =
    moderateMutation.error instanceof ApiRequestError ? moderateMutation.error : undefined;

  return (
    <article className="rounded-2xl border border-border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-medium text-foreground">{entry.title}</h3>
        <span className="text-xs text-muted-foreground">
          {entry.projectName} · {entry.submittedByName}
        </span>
      </div>

      {/* THE VIDEO IS THE LOUDEST THING ON A PITCH PAGE, so it is on the review card. Judging
          the text while the video goes unseen is the review missing the thing most likely to
          be the problem. */}
      {entry.pitchVideo !== null && (
        <div className="mt-2 flex items-center gap-3">
          {entry.pitchVideo.thumbnailUrl !== null && (
            <Image
              src={entry.pitchVideo.thumbnailUrl}
              alt=""
              width={128}
              height={72}
              className="aspect-video w-32 shrink-0 rounded-lg object-cover"
            />
          )}
          <a
            href={`/watch?v=${encodeURIComponent(entry.pitchVideo.videoId)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-foreground underline"
          >
            {entry.pitchVideo.title}
          </a>
        </div>
      )}
      {entry.pitchVideo === null && (
        <p className="mt-2 text-xs text-muted-foreground">No video on this pitch.</p>
      )}

      <p className="mt-2 text-sm whitespace-pre-line text-muted-foreground">{entry.summary}</p>

      <dl className="mt-3 space-y-1 text-xs">
        <div className="flex gap-2">
          <dt className="text-muted-foreground">Funding link</dt>
          <dd className="text-foreground">
            {entry.externalFundingUrl === null
              ? "none"
              : describeLinkDestination(entry.externalFundingUrl)}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-muted-foreground">Contact link</dt>
          <dd className="text-foreground">
            {entry.externalContactUrl === null
              ? "none"
              : describeLinkDestination(entry.externalContactUrl)}
          </dd>
        </div>
      </dl>

      {/* THE FULL URLS, as plain text rather than as anchors. A moderator needs to read
          exactly where a pitch points — including the path and query, which is where a
          lookalike hides — and a queue full of live links to unvetted destinations is a
          click away from being the attack it is meant to catch. */}
      {(entry.externalFundingUrl !== null || entry.externalContactUrl !== null) && (
        <pre className="mt-2 overflow-x-auto rounded-lg bg-secondary/50 p-2 text-xs text-muted-foreground">
          {[entry.externalFundingUrl, entry.externalContactUrl].filter(Boolean).join("\n")}
        </pre>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={moderateMutation.isPending}
          onClick={() => {
            moderateMutation.mutate({ pitchId: entry.id, input: { decision: "published" } });
          }}
          className="cursor-pointer rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-40"
        >
          {moderateMutation.isPending ? "Working…" : "Publish"}
        </button>
        <button
          type="button"
          onClick={() => {
            setIsRejecting((current) => !current);
          }}
          className="cursor-pointer rounded-full border border-border px-3 py-1.5 text-xs text-foreground"
        >
          Reject
        </button>
      </div>

      {isRejecting && (
        <form
          className="mt-3 flex flex-col gap-2"
          onSubmit={(submitEvent) => {
            submitEvent.preventDefault();
            moderateMutation.mutate({
              pitchId: entry.id,
              input: { decision: "rejected", reason: rejectionReason.trim() },
            });
          }}
        >
          <label className="text-xs text-muted-foreground" htmlFor={`reject-reason-${entry.id}`}>
            Why. The founder sees this sentence and nothing else, so make it something they can act
            on.
          </label>
          <textarea
            id={`reject-reason-${entry.id}`}
            className={INPUT_CLASS}
            rows={3}
            value={rejectionReason}
            onChange={(changeEvent) => {
              setRejectionReason(changeEvent.target.value);
            }}
          />
          <button
            type="submit"
            disabled={moderateMutation.isPending || rejectionReason.trim().length < 10}
            className="w-fit cursor-pointer rounded-full border border-border px-3 py-1.5 text-xs text-foreground disabled:opacity-40"
          >
            {moderateMutation.isPending ? "Rejecting…" : "Confirm rejection"}
          </button>
        </form>
      )}

      {error !== undefined && (
        <p className="mt-2 text-xs leading-4 text-destructive">{error.apiError.message}</p>
      )}
    </article>
  );
}

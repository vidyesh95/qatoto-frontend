"use client";

// TRANSPORT: client-query — the comment box, over `@/hooks/blueprints/comments`.

import { useState } from "react";

import { describeEngagementError } from "@/hooks/blueprints/engagement";

/** Mirrors `BLUEPRINT_COMMENT_BODY_MAXIMUM_CHARACTERS` and `*_comment_body_ck` on the server. */
const COMMENT_BODY_MAXIMUM_CHARACTERS = 2000;

/**
 * The composer.
 *
 * ⚠️ PENDING, NOT OPTIMISTIC. A like can be flipped and rolled back because the only thing at stake
 * is a number; a comment must not APPEAR to have posted when it did not. The box stays disabled and
 * keeps its text until the server answers, so a failed post is a retry rather than a loss.
 *
 * ⚠️ A SIGNED-OUT READER GETS A SENTENCE, NOT A DISABLED BOX. A greyed-out textarea with no
 * explanation is the shape that makes somebody click it repeatedly; `describeEngagementError`
 * separates 401 from 403 for the same reason, because those two need different affordances.
 *
 * The counter only appears in the last 200 characters. A counter that is always on reads as a limit
 * being enforced on somebody who was nowhere near it.
 */
export default function BlueprintCommentComposer({
  isSignedIn,
  isPending,
  placeholder,
  onSubmit,
}: {
  readonly isSignedIn: boolean;
  readonly isPending: boolean;
  readonly placeholder: string;
  readonly onSubmit: (body: string) => Promise<{ readonly error: unknown } | null>;
}) {
  const [body, setBody] = useState("");
  const [refusal, setRefusal] = useState<string | null>(null);

  if (!isSignedIn) {
    return (
      <p className="mt-4 rounded-md border border-[#CAC4D0]/60 bg-black/[0.02] px-3 py-2.5 text-sm text-muted-foreground">
        Sign in to join the discussion.
      </p>
    );
  }

  const remainingCharacters = COMMENT_BODY_MAXIMUM_CHARACTERS - body.trim().length;
  const isTooLong = remainingCharacters < 0;
  const canSubmit = body.trim().length > 0 && !isTooLong && !isPending;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!canSubmit) return;

    setRefusal(null);
    const failure = await onSubmit(body.trim());
    if (failure === null) {
      setBody("");
      return;
    }
    setRefusal(describeEngagementError(failure.error).message);
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="mt-4">
      <label htmlFor="blueprint-comment-body" className="sr-only">
        {placeholder}
      </label>
      <textarea
        id="blueprint-comment-body"
        value={body}
        onChange={(event) => {
          setBody(event.target.value);
        }}
        placeholder={placeholder}
        rows={3}
        disabled={isPending}
        className="w-full resize-y rounded-md border border-[#CAC4D0]/60 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E] disabled:opacity-60"
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        {/*
          An `<output>` rather than a `<span role="status">`: the repo's a11y rule maps that role to
          this tag, and it is the right one anyway — this IS the result of the reader's typing.
        */}
        <output className={`text-xs ${isTooLong ? "text-destructive" : "text-muted-foreground"}`}>
          {remainingCharacters <= 200 ? `${String(remainingCharacters)} characters left` : ""}
        </output>
        <button
          type="submit"
          disabled={!canSubmit}
          className="cursor-pointer rounded-md bg-[#00696E] px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E] disabled:cursor-default disabled:opacity-50"
        >
          {isPending ? "Posting…" : "Post"}
        </button>
      </div>
      {refusal === null ? null : (
        <output className="mt-2 block text-xs text-destructive">{refusal}</output>
      )}
    </form>
  );
}

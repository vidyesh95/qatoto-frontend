"use client";

// TRANSPORT: client-query — the real upvote control, used by the showcase DETAIL page only.
//
// ⚠️ `showcase-vote-box.tsx` STILL EXISTS AND IS STILL A `<span>`. That is not a leftover. It is
// rendered by the feed row and the launch link — LIST surfaces — where turning the count into a
// button would mean reading per-row viewer state for every card on the page. The detail page
// already pays for one viewer-state read, so it is the only place that can afford a real control.

import Image from "next/image";
import { useState } from "react";

import { describeEngagementError, useBlueprintToggleMutation } from "@/hooks/blueprints/engagement";
import { formatCompactCountLabel } from "@/lib/feed/format";
import { formatCountLabel } from "@/lib/store/format";

/**
 * A launch's upvote, as a control.
 *
 * ⚠️ THE COUNT IS OPTIMISTIC AND THEN SETTLES ON THE SERVER'S. It flips locally so the control
 * responds to a tap, takes the server's number on success, and rolls back on failure — a client
 * that kept its own guess would drift from every other reader's view of the same launch.
 *
 * ⚠️ A REFUSAL IS SHOWN, NOT SWALLOWED. `describeEngagementError` separates 401 from 403 because
 * they need different affordances: a signed-out reader needs a sign-in control, while an
 * anonymous-session reader is already "signed in" as far as the cookie is concerned and needs a
 * finish-signing-up one. Offering them sign-in is a loop with no exit.
 *
 * The 40×44 gutter, the compact/exact number pair and the visually-hidden noun are carried over
 * from the `<span>` unchanged, so the two render identically at rest.
 */
export default function ShowcaseVoteButton({
  slug,
  count,
  hasUpvoted,
}: {
  readonly slug: string;
  readonly count: number;
  readonly hasUpvoted: boolean;
}) {
  const [isSet, setIsSet] = useState(hasUpvoted);
  const [displayCount, setDisplayCount] = useState(count);
  const [refusal, setRefusal] = useState<string | null>(null);
  const toggle = useBlueprintToggleMutation("showcase", "upvote");

  function handleClick(): void {
    const nextIsSet = !isSet;
    const previousCount = displayCount;

    setRefusal(null);
    setIsSet(nextIsSet);
    setDisplayCount(nextIsSet ? previousCount + 1 : Math.max(previousCount - 1, 0));

    toggle.mutate(
      { slug, isSet: nextIsSet },
      {
        onSuccess: (result) => {
          // The server's own number, which is what every other reader sees.
          setIsSet(result.isSet);
          setDisplayCount(result.count);
        },
        onError: (error) => {
          setIsSet(!nextIsSet);
          setDisplayCount(previousCount);
          setRefusal(describeEngagementError(error).message);
        },
      },
    );
  }

  return (
    <span className="flex shrink-0 flex-col items-center">
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={isSet}
        disabled={toggle.isPending}
        className={`flex h-11 w-10 shrink-0 cursor-pointer flex-col items-center justify-center rounded-md transition-colors select-none hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint disabled:cursor-default ${
          isSet ? "text-primary-imprint" : "text-foreground"
        }`}
      >
        <Image
          src="/icons/keyboard_arrow_up_24dp_6F7979_FILL0_wght400_GRAD0_opsz24.svg"
          alt=""
          width={20}
          height={20}
          className="size-5"
        />
        <span className="text-xs leading-none font-medium tabular-nums">
          <span aria-hidden="true">{formatCompactCountLabel(displayCount)}</span>
          <span className="sr-only">
            {formatCountLabel(displayCount)} upvotes. {isSet ? "You upvoted this." : "Upvote this."}
          </span>
        </span>
      </button>
      {refusal === null ? null : (
        <output className="mt-1 block max-w-32 text-center text-xs text-destructive">
          {refusal}
        </output>
      )}
    </span>
  );
}

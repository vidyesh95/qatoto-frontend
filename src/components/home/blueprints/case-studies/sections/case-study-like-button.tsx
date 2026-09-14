"use client";

// TRANSPORT: client-query — the like control on a case study, over
// `@/hooks/blueprints/engagement`.
//
// ⚠️ THE COUNT IS OPTIMISTIC AND THEN SETTLES ON THE SERVER'S. It flips locally so the control
// responds to a tap, takes the server's number on success, and rolls back on failure — a client
// that kept its own guess would drift from every other reader's view of the same lesson.
//
// ⚠️ A SIGNED-OUT READER SEES A DISPLAY PILL, NOT A DISABLED BUTTON. A disabled button says
// "you cannot do this"; a readout says "this is a number", which is the true statement for
// somebody with no account.

import Image from "next/image";
import { useState } from "react";

import { describeEngagementError, useBlueprintToggleMutation } from "@/hooks/blueprints/engagement";
import { useBlueprintViewerStateQuery } from "@/hooks/blueprints/engagement";
import { useViewerSignedIn } from "@/hooks/use-viewer-signed-in";
import { formatCompactCountLabel } from "@/lib/feed/format";
import { formatCountLabel } from "@/lib/store/format";

export default function CaseStudyLikeButton({
  slug,
  likeCount,
  isViewerSignedIn,
}: {
  readonly slug: string;
  readonly likeCount: number;
  readonly isViewerSignedIn: boolean;
}) {
  const isSignedIn = useViewerSignedIn(isViewerSignedIn);
  const viewerState = useBlueprintViewerStateQuery({
    caseStudies: [slug],
    isSignedIn,
  });

  const like = useBlueprintToggleMutation("case_study", "like");

  const [likeState, setLikeState] = useState<{ isSet: boolean; count: number } | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);

  const isSet = likeState?.isSet ?? viewerState.data?.caseStudies[slug]?.hasLiked ?? false;
  const displayCount = likeState?.count ?? likeCount;

  function handleToggle(): void {
    const nextIsSet = !isSet;
    const previousCount = displayCount;

    setRefusal(null);
    setLikeState({
      isSet: nextIsSet,
      count: nextIsSet ? previousCount + 1 : Math.max(previousCount - 1, 0),
    });

    like.mutate(
      { slug, isSet: nextIsSet },
      {
        onSuccess: (result) => {
          setLikeState({ isSet: result.isSet, count: result.count });
        },
        onError: (error) => {
          setLikeState({ isSet, count: previousCount });
          setRefusal(describeEngagementError(error).message);
        },
      },
    );
  }

  if (!isSignedIn) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#CCE8E9] px-2.5 py-1 text-xs font-medium text-[#041F21] select-none">
        <Image
          src="/icons/favorite_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
          alt=""
          width={16}
          height={16}
          className="size-4 shrink-0"
        />
        <span className="tabular-nums">
          <span aria-hidden="true">{formatCompactCountLabel(displayCount)}</span>
          <span className="sr-only">{formatCountLabel(displayCount)} likes</span>
        </span>
      </span>
    );
  }

  return (
    <div className="inline-flex flex-col items-start">
      <button
        type="button"
        onClick={handleToggle}
        aria-pressed={isSet}
        disabled={like.isPending}
        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E] disabled:cursor-default ${
          isSet ? "bg-[#00696E] text-white" : "bg-[#CCE8E9] text-[#041F21] hover:bg-[#BCDEDF]"
        }`}
      >
        <Image
          src={`/icons/favorite_24dp_000000_FILL${isSet ? "1" : "0"}_wght400_GRAD0_opsz24.svg`}
          alt=""
          width={16}
          height={16}
          className={`size-4 shrink-0 ${isSet ? "invert" : ""}`}
        />
        <span className="tabular-nums">
          <span aria-hidden="true">{formatCompactCountLabel(displayCount)}</span>
          <span className="sr-only">
            {formatCountLabel(displayCount)} likes.{" "}
            {isSet ? "You liked this lesson." : "Like this lesson."}
          </span>
        </span>
      </button>
      {refusal === null ? null : (
        <output className="mt-1 block max-w-48 text-[11px] text-destructive">{refusal}</output>
      )}
    </div>
  );
}

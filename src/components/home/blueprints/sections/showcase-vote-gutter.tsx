"use client";

// TRANSPORT: client-query — the gutter island on the showcase detail page.
//
// ⚠️ IT EXISTS BECAUSE THE PAGE IS A SERVER COMPONENT AND THE CONTROL NEEDS TO KNOW WHO IS ASKING.
// The public showcase read is BARE and its payload is identical for every visitor — that is what
// buys it a cache and no limiter — so "have I already upvoted this?" cannot ride along in it. This
// island asks the one authenticated route that answers that question, for this one slug.

import ShowcaseVoteBox from "@/components/home/blueprints/sections/showcase-vote-box";
import ShowcaseVoteButton from "@/components/home/blueprints/sections/showcase-vote-button";
import { useBlueprintViewerStateQuery } from "@/hooks/blueprints/engagement";
import { useViewerSignedIn } from "@/hooks/use-viewer-signed-in";

/**
 * The upvote gutter: a control for a signed-in reader, the display `<span>` for everybody else.
 *
 * ⚠️ A SIGNED-OUT READER GETS THE `<span>`, NOT A DISABLED BUTTON. A disabled control says "you
 * cannot do this"; the span says "this is a number", which is the true statement for somebody with
 * no account. They are the same 40×44 shape at rest, so the layout does not move when the session
 * resolves.
 */
export default function ShowcaseVoteGutter({
  slug,
  count,
  isViewerSignedIn,
}: {
  readonly slug: string;
  readonly count: number;
  readonly isViewerSignedIn: boolean;
}) {
  const isSignedIn = useViewerSignedIn(isViewerSignedIn);
  const viewerState = useBlueprintViewerStateQuery({ showcases: [slug], isSignedIn });

  if (!isSignedIn) return <ShowcaseVoteBox count={count} />;

  /*
   * ⚠️ WHILE THE VIEWER STATE IS IN FLIGHT THE BUTTON RENDERS AS NOT-UPVOTED. That is a real
   * trade-off and the alternative is worse: a spinner in a 40px gutter, or a layout that shifts
   * when the answer lands. A reader who had already upvoted sees the filled state a moment later,
   * and a double-tap in that moment is a no-op — the server's composite primary key is the
   * idempotence, which is exactly why it exists.
   */
  const hasUpvoted = viewerState.data?.showcases[slug]?.hasUpvoted ?? false;

  return <ShowcaseVoteButton slug={slug} count={count} hasUpvoted={hasUpvoted} />;
}

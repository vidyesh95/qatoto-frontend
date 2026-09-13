"use client";

// TRANSPORT: client-query — one blueprint's discussion, over `@/hooks/blueprints/comments`.
//
// ⚠️ THIS REPLACED `const comments: readonly BlueprintComment[] = []` ON THE SHOWCASE DETAIL PAGE.
// That line was honest when it was written — there was no comment table — and it is not now:
// `showcase_launch_comment` and `teardown_comment` exist with a real write path.
//
// ⚠️ A CLIENT ISLAND, NOT A SERVER READ, AND THE REASON IS THE `hasLiked` ON EACH ROW. The thread is
// the one blueprints read that resolves an optional session, so a server-rendered first page would
// be somebody else's view of it — and the page around it is cached.

import BlueprintCommentComposer from "@/components/home/blueprints/sections/blueprint-comment-composer";
import BlueprintCommentThread from "@/components/home/blueprints/sections/blueprint-comment-thread";
import {
  useBlueprintCommentThread,
  useCreateBlueprintCommentMutation,
} from "@/hooks/blueprints/comments";
import { useViewerSignedIn } from "@/hooks/use-viewer-signed-in";
import type { BlueprintCommentArm } from "@/lib/blueprints/comments.api";

/**
 * The discussion section: the thread, a "load more" control, and the composer.
 *
 * ⚠️ THE COMPOSER IS SUPPRESSED ON A WITHHELD ROW. A quarantined teardown still renders its page,
 * but the server gates comment WRITES on `published` alone — nothing new may be endorsed or added
 * under an unresolved rights claim. `canComment` is threaded from the page rather than inferred
 * here, and the server refuses it either way: this component is not the only thing deciding.
 */
export default function BlueprintDiscussion({
  arm,
  slug,
  isViewerSignedIn,
  canComment,
}: {
  readonly arm: BlueprintCommentArm;
  readonly slug: string;
  readonly isViewerSignedIn: boolean;
  readonly canComment: boolean;
}) {
  const isSignedIn = useViewerSignedIn(isViewerSignedIn);
  const thread = useBlueprintCommentThread(arm, slug);
  const createComment = useCreateBlueprintCommentMutation(arm, slug);

  return (
    <>
      <BlueprintCommentThread comments={thread.rows} />

      {thread.hasNextPage ? (
        <button
          type="button"
          onClick={() => {
            thread.loadNextPage();
          }}
          disabled={thread.isFetchingNextPage}
          className="mt-3 cursor-pointer text-sm font-medium text-[#00696E] transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E] disabled:cursor-default disabled:opacity-50"
        >
          {thread.isFetchingNextPage ? "Loading…" : "Load more comments"}
        </button>
      ) : null}

      {/*
        ⚠️ A FAILED LOAD-MORE IS SHOWN AND DOES NOT BLANK THE THREAD. `useKeysetList` keeps the two
        apart deliberately — a 422 on a cursor the server issued is a real finding, and silently
        doing nothing would hide it.
      */}
      {thread.loadMoreErrorMessage === null ? null : (
        <output className="mt-3 block text-xs text-destructive">
          {thread.loadMoreErrorMessage}
        </output>
      )}

      {canComment ? (
        <BlueprintCommentComposer
          isSignedIn={isSignedIn}
          isPending={createComment.isPending}
          placeholder="Add to the discussion"
          onSubmit={async (body) => {
            try {
              await createComment.mutateAsync({ body, parentCommentId: null });
              return null;
            } catch (error: unknown) {
              return { error };
            }
          }}
        />
      ) : (
        /*
         * ⚠️ SAID OUT LOUD RATHER THAN LEFT BLANK. A thread with no box and no explanation reads as
         * a bug; this reads as a state, which is what it is.
         */
        <p className="mt-4 text-sm text-muted-foreground">
          The discussion is closed while this page is under review.
        </p>
      )}
    </>
  );
}

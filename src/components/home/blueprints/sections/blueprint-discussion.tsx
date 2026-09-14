"use client";

// TRANSPORT: client-query — one blueprint's discussion, over `@/hooks/blueprints/comments`.

import BlueprintCommentComposer from "@/components/home/blueprints/sections/blueprint-comment-composer";
import BlueprintCommentThread from "@/components/home/blueprints/sections/blueprint-comment-thread";
import {
  useBlueprintCommentLikeMutation,
  useBlueprintCommentThread,
  useCreateBlueprintCommentMutation,
  useDeleteBlueprintCommentMutation,
  useUpdateBlueprintCommentMutation,
} from "@/hooks/blueprints/comments";
import { useViewerSignedIn } from "@/hooks/use-viewer-signed-in";
import type { BlueprintCommentArm } from "@/lib/blueprints/comments.api";

/**
 * The discussion section: the thread, a "load more" control, and the composer.
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
  const deleteComment = useDeleteBlueprintCommentMutation(arm, slug);
  const likeMutation = useBlueprintCommentLikeMutation();
  const updateComment = useUpdateBlueprintCommentMutation(arm, slug);

  return (
    <>
      <BlueprintCommentThread
        comments={thread.rows}
        canComment={canComment}
        isSignedIn={isSignedIn}
        onToggleLike={async (commentId, isSet) => {
          await likeMutation.mutateAsync({ commentId, isSet });
        }}
        onReply={async (parentCommentId, body) => {
          await createComment.mutateAsync({ body, parentCommentId });
        }}
        onDeleteComment={async (commentId) => {
          await deleteComment.mutateAsync(commentId);
        }}
        onUpdateComment={async (commentId, body) => {
          await updateComment.mutateAsync({ commentId, body });
        }}
      />

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
        <p className="mt-4 text-sm text-muted-foreground">
          The discussion is closed while this page is under review.
        </p>
      )}
    </>
  );
}

// TRANSPORT: client-query — "use client" island calling useWatchProjectMutation.
// Writes POST/DELETE /research-projects/:slug/watch.
"use client";

import { useWatchProjectMutation } from "@/hooks/rnd/projects";

/**
 * Follow a project.
 *
 * IDEMPOTENT BY VERB, which is why this is two endpoints rather than one toggle:
 * `POST /watch` twice leaves one row and `DELETE /watch` twice leaves none, so a
 * double-tap on a slow connection is harmless instead of a race that decides the final
 * state by arrival order.
 *
 * `isWatchedByViewer` is COMPUTED PER REQUEST from the viewer's session, never a column,
 * so a signed-out visitor always sees the unfollowed state — and pressing it gets them a
 * `401` rather than a silently ignored click.
 */
export default function WatchProjectButton({
  projectSlug,
  isWatchedByViewer,
}: {
  projectSlug: string;
  isWatchedByViewer: boolean;
}) {
  const watchMutation = useWatchProjectMutation(projectSlug);

  return (
    <button
      type="button"
      disabled={watchMutation.isPending}
      onClick={() => watchMutation.mutate(!isWatchedByViewer)}
      aria-pressed={isWatchedByViewer}
      className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
        isWatchedByViewer
          ? "border-[#00696E] bg-[#00696E]/10 text-[#00696E]"
          : "border-[#6F7979] text-[#00696E]"
      }`}
    >
      {isWatchedByViewer ? "Following" : "Follow"}
    </button>
  );
}

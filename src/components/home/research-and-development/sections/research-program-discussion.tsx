// TRANSPORT: client-query — the composer, the reactions, the replies and the report control all
// call hooks in `@/hooks/rnd/research-programs`. The first page arrives as props.
"use client";

import { useState, type FormEvent } from "react";

import { useProgramPostMutation } from "@/hooks/rnd/research-programs";
import { ApiRequestError } from "@/lib/http";
import type {
  ResearchBranch,
  ResearchPost,
  ResearchPostTrack,
} from "@/lib/rnd/research-programs.schemas";

import { MutationErrorNotice } from "./mutation-feedback";
import { ResearchPostItem } from "./research-post-item";

type ResearchProgramDiscussionProps = {
  programSlug: string;
  track: ResearchPostTrack;
  posts: ResearchPost[];
  /** Only offered on the `idea` track, where filing a thread against a branch makes sense. */
  branches: ResearchBranch[];
  canPost: boolean;
  canModerate: boolean;
};

/**
 * ONE COMPONENT FOR BOTH DISCUSSION TRACKS, because the backend serves both from one table.
 *
 * The mock had two components — `project-immortal-discussion` for netizen ideas and
 * `project-immortal-informal-posts` for blog-style posts — with duplicated reaction, reply and
 * composer code. They differ in exactly two ways, both handled by the `track` prop:
 *
 *   `informal_paper` REQUIRES a title; `idea` must not have one. The backend refines this and
 *       answers 422, so the composer enforces the same rule rather than discovering it.
 *   `idea` can be filed against a research branch, which is what gives the branch map its
 *       per-node discussion count.
 *
 * Two components would mean two places to fix the next bug in either.
 */
export default function ResearchProgramDiscussion({
  programSlug,
  track,
  posts,
  branches,
  canPost,
  canModerate,
}: ResearchProgramDiscussionProps) {
  const postMutation = useProgramPostMutation(programSlug);

  const [title, setTitle] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [branchId, setBranchId] = useState("");

  const isTitled = track === "informal_paper";
  const mutationError =
    postMutation.error instanceof ApiRequestError ? postMutation.error : undefined;

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!bodyText.trim()) return;
    if (isTitled && !title.trim()) return;

    postMutation.mutate(
      {
        action: "post",
        track,
        // Null for an idea, non-null for an informal paper — the backend's CHECK requires
        // exactly this, so sending the other shape is a 422 rather than a surprise.
        title: isTitled ? title.trim() : null,
        bodyText: bodyText.trim(),
        branchId: !isTitled && branchId !== "" ? branchId : null,
      },
      {
        onSuccess: () => {
          setTitle("");
          setBodyText("");
          setBranchId("");
        },
      },
    );
  }

  return (
    <div className="space-y-4 px-4 lg:px-6">
      <p className="max-w-2xl text-sm text-muted-foreground">
        {isTitled
          ? "Blog-style thinking that does not need citations yet. Ideas here graduate into the formal track when somebody proves them."
          : "Anyone can post an idea. No credentials required — the argument is what matters."}
      </p>

      {canPost ? (
        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-2xl border border-[#CAC4D0]/60 bg-card p-4"
        >
          {isTitled && (
            <input
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={200}
              placeholder="A title for your post"
              className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
            />
          )}

          <textarea
            required
            value={bodyText}
            onChange={(event) => setBodyText(event.target.value)}
            maxLength={10_000}
            rows={3}
            placeholder={isTitled ? "What are you arguing?" : "What should we try?"}
            className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
          />

          {!isTitled && branches.length > 0 && (
            <label className="block space-y-1 text-xs">
              <span className="font-medium">About a branch? (optional)</span>
              <select
                value={branchId}
                onChange={(event) => setBranchId(event.target.value)}
                className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
              >
                <option value="">Programme-wide</option>
                {branches.map((branch) => (
                  <option key={branch.branchId} value={branch.branchId}>
                    {branch.title}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-muted-foreground">
                Filing it against a branch is what makes it show on the research map.
              </span>
            </label>
          )}

          <button
            type="submit"
            disabled={postMutation.isPending || !bodyText.trim() || (isTitled && !title.trim())}
            className="cursor-pointer rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#00393C] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {postMutation.isPending ? "Posting…" : isTitled ? "Publish post" : "Post idea"}
          </button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">Sign in to join the discussion.</p>
      )}

      {mutationError && <MutationErrorNotice error={mutationError.apiError} />}

      {posts.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {isTitled ? "No informal posts yet." : "No ideas posted yet. Be the first."}
        </p>
      ) : (
        <ul className="space-y-3">
          {posts.map((post) => (
            <ResearchPostItem
              key={post.postId}
              programSlug={programSlug}
              post={post}
              canInteract={canPost}
              canModerate={canModerate}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

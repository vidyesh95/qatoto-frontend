// TRANSPORT: client-query — the feed (paged by "Load more"), the composer, the reactions, the replies
// and the report control all call hooks in `@/hooks/rnd/research-programs`. The first page arrives
// as props and seeds the feed query.
"use client";

import { useState, type FormEvent } from "react";

import FilterChipRow, { type FilterChipOption } from "@/components/home/shared/filter-chip-row";
import { useProgramPostFeed, useProgramPostMutation } from "@/hooks/rnd/research-programs";
import { ApiRequestError } from "@/lib/http";
import type {
  ResearchBranch,
  ResearchPost,
  ResearchPostSort,
  ResearchPostTrack,
} from "@/lib/rnd/research-programs.schemas";

import BranchPickerField from "./branch-picker-field";
import { MutationErrorNotice } from "./mutation-feedback";
import { ResearchPostItem } from "./research-post-item";

type ResearchProgramDiscussionProps = {
  programSlug: string;
  track: ResearchPostTrack;
  /** This section's order, from its own URL key. */
  sort: ResearchPostSort;
  /** "Newest | Trending" as links, built server-side from the live URL so `?role=` survives. */
  sortChips: FilterChipOption[];
  /** The server-rendered first page under `sort`, which seeds the paged feed. */
  initialPage: { rows: ResearchPost[]; nextCursor: string | null };
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
  sort,
  sortChips,
  initialPage,
  branches,
  canPost,
  canModerate,
}: ResearchProgramDiscussionProps) {
  const postMutation = useProgramPostMutation(programSlug);
  const postFeed = useProgramPostFeed(programSlug, track, sort, initialPage);
  const posts = postFeed.rows;

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
          className="space-y-3 rounded-2xl border border-outline-variant/60 bg-card p-4"
        >
          {isTitled && (
            <input
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={200}
              aria-label="Post title"
              placeholder="A title for your post"
              className="w-full rounded-lg border border-outline-variant/60 px-3 py-2 text-sm"
            />
          )}

          <textarea
            required
            value={bodyText}
            onChange={(event) => setBodyText(event.target.value)}
            maxLength={10_000}
            rows={3}
            aria-label={isTitled ? "Your argument" : "Your idea"}
            placeholder={isTitled ? "What are you arguing?" : "What should we try?"}
            className="w-full rounded-lg border border-outline-variant/60 px-3 py-2 text-sm"
          />

          {/* No `branches.length > 0` gate: an empty tree is exactly when creating one matters. */}
          {!isTitled && (
            <BranchPickerField
              programSlug={programSlug}
              branches={branches}
              selectedBranchId={branchId}
              onBranchSelect={setBranchId}
              labelText="About a branch? (optional)"
              noBranchOptionLabel="Programme-wide"
              helpText="Filing it against a branch is what makes it show on the research map. Type a name that does not exist yet to create it."
              canCreateBranch={canPost}
            />
          )}

          <button
            type="submit"
            disabled={postMutation.isPending || !bodyText.trim() || (isTitled && !title.trim())}
            className="cursor-pointer rounded-full bg-primary-imprint px-4 py-2 text-sm font-medium text-primary-imprint-foreground transition-colors hover:bg-primary-imprint-deep disabled:cursor-not-allowed disabled:opacity-60"
          >
            {postMutation.isPending ? "Posting…" : isTitled ? "Publish post" : "Post idea"}
          </button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">Sign in to join the discussion.</p>
      )}

      {mutationError && <MutationErrorNotice error={mutationError.apiError} />}

      <div className="space-y-1">
        <FilterChipRow
          options={sortChips}
          ariaLabel={isTitled ? "Sort informal papers" : "Sort ideas"}
        />
        {/* Says what "Trending" means rather than leaving the word to be guessed — and that it is
            hourly, so a reaction a minute ago is not expected to move anything yet. */}
        {sort === "trending" && (
          <p className="text-xs text-muted-foreground">
            Reactions and replies from the last 7 days, updated hourly.
          </p>
        )}
      </div>

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

      {/* A failed page two must not blank page one, and must not silently do nothing either. */}
      {postFeed.loadMoreErrorMessage !== null && (
        <p role="alert" className="text-sm text-destructive">
          {postFeed.loadMoreErrorMessage}
        </p>
      )}
      {postFeed.hasNextPage && (
        <button
          type="button"
          onClick={postFeed.loadNextPage}
          disabled={postFeed.isFetchingNextPage}
          className="cursor-pointer rounded-full border border-outline-variant px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {postFeed.isFetchingNextPage ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}

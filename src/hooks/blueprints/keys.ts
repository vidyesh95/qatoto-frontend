// TRANSPORT: props-only — key factory, no network.
//
// ONE FILE, so an invalidation cannot drift from the query it is meant to clear. Mirrors `rndKeys`
// (`src/hooks/rnd/keys.ts`) and `productKeys` (`src/hooks/products.ts`), which is the repo's
// precedent and states the same rule.
//
// EVERY KEY STARTS WITH THE DOMAIN LITERAL `"blueprints"`, so one
// `invalidateQueries({ queryKey: blueprintKeys.all })` clears the whole domain without listing it.

export const blueprintKeys = {
  all: ["blueprints"] as const,
  /**
   * The signed-in author's own submissions.
   *
   * NO PAGE OR CURSOR IN THE KEY. The list is short, unpaged and scoped to one person server-side —
   * there is no id to pass — so a filter argument here would be a parameter nothing sends.
   */
  myTeardownSubmissions: () => ["blueprints", "teardowns", "mine"] as const,
  /** The signed-in maker's own launches. Unpaged and person-scoped, for the reason above. */
  myShowcaseSubmissions: () => ["blueprints", "showcase", "mine"] as const,
  /** The signed-in writer's own case studies. Unpaged and person-scoped, for the reason above. */
  myCaseStudySubmissions: () => ["blueprints", "case-studies", "mine"] as const,
  /**
   * The moderator's case-study review queue. No cursor in the key: `useKeysetList` holds the pages
   * under this one key, and a decision invalidates the whole queue.
   */
  caseStudyReviewQueue: () => ["blueprints", "case-studies", "admin", "review-queue"] as const,
  /** The moderator's launch review queue, for the same reason as the case-study queue above. */
  showcaseReviewQueue: () => ["blueprints", "showcase", "admin", "review-queue"] as const,
  /** The moderator's teardown review queue, for the same reason as the two queues above. */
  teardownReviewQueue: () => ["blueprints", "teardowns", "admin", "review-queue"] as const,
  /**
   * One blueprint's discussion thread.
   *
   * KEYED BY ARM AND SLUG, because that is what the route is keyed by. No cursor: `useKeysetList`
   * holds every page under this one key, so posting a comment invalidates the whole thread rather
   * than trying to splice a row into the right page.
   */
  commentThread: (arm: string, slug: string) => ["blueprints", arm, slug, "comments"] as const,
  /**
   * What this viewer has already done to a named set of blueprints.
   *
   * ⚠️ THE SLUGS ARE IN THE KEY, sorted, because they are the QUERY. Two detail pages asking about
   * different rows must not share a cache entry — and sorting means the same set asked for in a
   * different order is still one entry.
   */
  viewerState: (slugs: readonly string[]) =>
    ["blueprints", "engagement", "state", [...slugs].toSorted().join(",")] as const,
  /** The reporter's own list of reports. Person-scoped server-side, so no id in the key. */
  myReports: () => ["blueprints", "reports", "mine"] as const,
  /**
   * Everything under the draft store — every arm's list AND every single draft.
   *
   * ⚠️ IT EXISTS BECAUSE THREE MUTATIONS WERE SPELLING IT BY HAND. `drafts.ts` invalidated with a
   * raw `["blueprints", "drafts"]` literal in three `onSuccess` blocks, which worked by prefix
   * match and sat outside the one rule this file's header states: an invalidation must not be able
   * to drift from the query it clears. A saved draft changes both the list it belongs to and its
   * own entry, so this is deliberately the shared prefix of `myDrafts` and `draft` rather than a
   * third spelling beside them.
   */
  draftsRoot: () => ["blueprints", "drafts"] as const,
  /**
   * The author's own drafts, optionally filtered by arm.
   */
  myDrafts: (arm?: string) => ["blueprints", "drafts", "mine", arm ?? "all"] as const,
  /**
   * A single draft by id.
   *
   * ⚠️ NEVER CALL THIS WITH A PLACEHOLDER STRING. `useMyDraftQuery` used to key its disabled state
   * as `["blueprints", "drafts", "null"]`, which is byte-identical to `draft("null")` — so a draft
   * whose id really was `"null"` would have shared a cache entry with every disabled instance of
   * the hook. The disabled key is now `draftPlaceholder()` below, which no id can collide with
   * because a server-minted id never contains a space.
   */
  draft: (draftId: string) => ["blueprints", "drafts", draftId] as const,
  /** The key a disabled single-draft query parks on. Unreachable by any real id. */
  draftPlaceholder: () => ["blueprints", "drafts", "no draft selected"] as const,
  /**
   * The moderator's content-report queue.
   *
   * ⚠️ `status` IS IN THE KEY AND THE CURSOR IS NOT. The status is a SERVER filter — it changes
   * which rows come back — while the cursor is paging within one filter, which `useKeysetList`
   * already holds under a single key.
   */
  reportQueue: (status: string) => ["blueprints", "admin", "content-reports", status] as const,
};

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
};

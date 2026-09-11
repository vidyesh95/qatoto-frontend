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
};

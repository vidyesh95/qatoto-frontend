"use client";

// TRANSPORT: client-query — the React Query key factory for the store's authenticated surface.
//
// ONE FILE, so invalidation cannot drift. Mirrors `rndKeys` and `productKeys`, the repo's precedents.
// The failure mode it prevents is specific and, on this surface, expensive: a mutation invalidates
// `["store", "cart"]` while the query registered `["cart"]`, nothing refetches, and the buyer keeps
// looking at a pre-mutation total — which is a price they are not going to be charged.
//
// Every key starts with the literal `"store"`, so `invalidateQueries({ queryKey: storeKeys.all })`
// clears this domain and nothing else. Note the PUBLIC catalog reads are NOT here: those are server
// fetches and never touch React Query, which is why this file is short and stays short.

export const storeKeys = {
  all: ["store"] as const,

  /**
   * The cart. NO organization id in the key, deliberately.
   *
   * The cart belongs to a buyer organization, but the ACTIVE organization is server-derived from the
   * session — the client never asserts which one it is (§0). Putting an id the client believes in
   * into the key would cache one organization's cart under another's name the moment the server
   * disagreed. Switching organizations invalidates `all` instead.
   */
  cart: () => ["store", "cart"] as const,

  /**
   * A checkout preparation, keyed by its own id.
   *
   * Keyed rather than singleton because a prepare is a real, expiring stock reservation with an
   * identity — `confirm` echoes `prepareId` back — so two prepares are two different things and must
   * not share a cache entry.
   */
  checkoutPrepare: (prepareId: string) => ["store", "checkout", "prepare", prepareId] as const,

  /**
   * The organization ids the caller belongs to.
   *
   * One entry for the session. Not keyed by user: the session IS the user, and putting a client-held
   * user id in the key would let a stale one outlive a sign-out.
   */
  viewerOrganizations: () => ["store", "organizations", "mine"] as const,

  /**
   * An organization's saved addresses.
   *
   * Keyed by the organization id BECAUSE THE ROUTE IS — this is the one place an id belongs in a
   * key on this surface, since it addresses the resource rather than asserting a permission. The
   * id itself came from the server (`/organizations/mine`), never from client storage.
   *
   * The rows carry decrypted PII, so this entry must not be persisted anywhere.
   */
  organizationAddresses: (organizationId: string) =>
    ["store", "organizations", organizationId, "addresses"] as const,

  /**
   * An order list, keyed by WHICH ENDPOINT it came from.
   *
   * `"buyer"` and `"provider"` are two different reads with two different authorizations — not one read
   * with a filter — so they must not share a cache entry. The same order can legitimately appear in
   * both when an organization sells to itself, and one key would make each overwrite the other.
   */
  orderList: (which: "buyer" | "provider") => ["store", "orders", "list", which] as const,
  order: (orderId: string) => ["store", "orders", orderId] as const,
  orderFulfillment: (orderId: string) => ["store", "orders", orderId, "fulfillment"] as const,
  /**
   * THE MODE IS PART OF THE KEY, not a detail of the request.
   *
   * Every mode rates a different lane and returns a different window, and the no-mode answer —
   * `freight: unknown / mode_not_selected` with the covered modes listed — is a distinct, cacheable
   * result rather than a loading state. Keying only on the order id would let a buyer's air quote
   * overwrite the sea one in the cache and make the mode picker look broken.
   */
  orderArrivalWindow: (orderId: string, mode: string | null) =>
    ["store", "orders", orderId, "arrival-window", mode] as const,

  engagementList: () => ["store", "engagements", "list"] as const,
  engagement: (engagementId: string) => ["store", "engagements", engagementId] as const,

  /**
   * An RFQ list, keyed by which endpoint it came from — same reasoning as `orderList`.
   *
   * Here the two reads differ by more than authorization: `/rfqs/mine` includes DRAFTS and
   * `/provider/rfqs` never does. One cache entry would let a draft leak into the provider queue on a
   * refetch, which is a requirement published before its buyer chose to.
   */
  rfqList: (which: "buyer" | "provider") => ["store", "rfqs", "list", which] as const,
  rfq: (rfqId: string) => ["store", "rfqs", rfqId] as const,

  quote: (quoteId: string) => ["store", "quotes", quoteId] as const,

  /**
   * The canonical comparison, keyed by RFQ — because comparison is RFQ-scoped: the quotes being compared
   * are the answers to one requirement.
   */
  quoteComparison: (rfqId: string) => ["store", "rfqs", rfqId, "quotes"] as const,

  /**
   * The quote-scoped comparison, keyed by QUOTE id.
   *
   * A SEPARATE ENTRY from `quoteComparison`, not a duplicate of it: this read resolves the quote to find
   * its RFQ and then lists that RFQ's quotes, so it is two round trips and its own cache identity. Sharing
   * the RFQ key would require knowing the RFQ id to invalidate it, which is exactly what a page holding
   * only a quote id does not have.
   */
  quoteComparisonByQuote: (quoteId: string) => ["store", "quotes", quoteId, "comparison"] as const,

  /**
   * The caller organization's own service offerings — `GET …/offerings/mine`.
   *
   * Invalidated after a create so `/studio/services` shows the new draft. No organization id in the key,
   * for the same reason `cart` has none: the active organization is server-derived.
   */
  providerOfferingsMine: () => ["store", "provider", "offerings", "mine"] as const,

  /**
   * A product's engagement counters plus the caller's own save/bookmark state.
   *
   * Keyed by SLUG, because that is what every engagement route is addressed by, and the product
   * page has the slug before it has the id.
   *
   * The server component already rendered this object with the page; the client entry exists so a
   * toggle has somewhere authoritative to write the server's response back to. That is also why
   * nothing here is optimistic — see `useProductEngagement`.
   */
  productEngagement: (productSlug: string) =>
    ["store", "products", productSlug, "engagement"] as const,

  /**
   * One page of a product's reviews, keyed by the FILTER as well as the slug.
   *
   * The filter is in the key because sorting and rating filters are SERVER reads: two filters are
   * two different answers, and sharing one entry would show the previous filter's rows while the
   * new one loads.
   */
  productReviews: (productSlug: string, filterKey: string) =>
    ["store", "products", productSlug, "reviews", filterKey] as const,

  productQuestions: (productSlug: string) =>
    ["store", "products", productSlug, "questions"] as const,
  productQuestionAnswers: (productSlug: string, questionId: string) =>
    ["store", "products", productSlug, "questions", questionId, "answers"] as const,

  /**
   * An indicative delivery estimate, keyed by destination AND quantity.
   *
   * Both change the answer — a heavier consignment prices from a different weight break — so
   * neither may be dropped from the key.
   */
  productDeliveryEstimate: (
    productSlug: string,
    destinationCountryCode: string,
    quantity: number,
  ) =>
    [
      "store",
      "products",
      productSlug,
      "delivery-estimate",
      destinationCountryCode,
      quantity,
    ] as const,

  // NO KEY FOR THE DELIVERY-ADDRESS REVEAL, deliberately. It is a mutation, and caching decrypted PII
  // under an order id is how it ends up in a devtools panel and a persisted cache. See
  // `useRevealDeliveryAddress`.
} as const;

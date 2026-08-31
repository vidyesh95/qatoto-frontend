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
  orderList: (which: "buyer" | "provider", state?: string) =>
    ["store", "orders", "list", which, state] as const,
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

  /**
   * One payment intent, keyed by ITS OWN id rather than the order's.
   *
   * An order can have several intents over its life — a failed attempt is terminal and the next
   * payment is a new row — so keying on the order would let a dead attempt's final state sit in the
   * cache under the live one's name, on the one screen where that reads as "you already paid".
   *
   * The id itself comes from `order.paymentIntentId` (A38), which is the server's answer to which
   * intent is the live one.
   */
  paymentIntent: (paymentIntentId: string) => ["store", "payments", paymentIntentId] as const,

  /**
   * Refunds against one order.
   *
   * Keyed by ORDER because that is the filter this read is always made with — the order page's
   * refund history. An unfiltered organization-wide refund inbox would be a different list and would
   * want its own key rather than sharing this one.
   */
  orderRefunds: (orderId: string) => ["store", "orders", orderId, "refunds"] as const,

  /**
   * One dispute and its timeline.
   *
   * The note write answers the whole timeline, so this entry is WRITTEN rather than invalidated —
   * see `useAddDisputeNote`. That only works because one key holds the whole object.
   */
  dispute: (disputeId: string) => ["store", "disputes", disputeId] as const,
  disputeList: (state: string | undefined) => ["store", "disputes", "list", state] as const,

  /**
   * The PREFIX over every dispute-list entry. Opening a dispute changes which state filter the
   * order belongs under, so the entry that must refetch is often not the one on screen.
   */
  disputeLists: () => ["store", "disputes", "list"] as const,

  /** The cross-order shipment queue. `which` is the ENDPOINT, so the two must not share an entry. */
  shipmentQueue: (which: "buyer" | "provider", state: string | undefined) =>
    ["store", "shipments", which, state] as const,

  /**
   * The PREFIX over every shipment queue entry, for invalidation after a write.
   *
   * A write invalidates this rather than one `shipmentQueue(which, state)`: a new shipment or a new
   * event changes which state filter a row belongs to, so the entry that must refetch is often the
   * one the caller was not looking at.
   */
  shipmentQueues: () => ["store", "shipments"] as const,

  /**
   * One shipment in full, WITH ITS LEGS — `GET /commerce/shipments/:shipmentId`.
   *
   * A SEPARATE PREFIX FROM `shipmentQueues()` ON PURPOSE. Folding it under `["store","shipments"]`
   * would put a detail entry in the same namespace as `shipmentQueue(which, state)`, where the
   * third element means "which endpoint" — a detail id sitting in that slot reads as a third side
   * of the queue. Leg commands invalidate all three keys explicitly instead.
   */
  shipmentDetail: (shipmentId: string) => ["store", "shipment-detail", shipmentId] as const,

  /** One leg's event history — finer-grained than its shipment's, and read on demand. */
  shipmentLegEvents: (legId: string) => ["store", "shipment-leg-events", legId] as const,

  /**
   * What this organization has been paid, over one window.
   *
   * NO ORGANIZATION ID IN THE KEY, following this file's own rule: the route is not addressed by
   * one. The server resolves the seller from the session's active organization, so switching
   * organizations changes the answer for the same key — which is correct, because switching
   * organizations invalidates every commerce entry in this cache anyway.
   *
   * BOTH BOUNDS ARE IN THE KEY because both change the server's answer, and `undefined` is a
   * distinct and meaningful value here: no window at all is the lifetime figure, which is a
   * different response from any bounded one.
   */
  providerEarnings: (from: string | undefined, to: string | undefined) =>
    ["store", "provider", "earnings", from, to] as const,

  /**
   * Both parties' settlement attestations on one order.
   *
   * The write answers the whole list, so this entry is WRITTEN rather than invalidated — the same
   * shape `dispute` uses, and it works for the same reason: one key holds the whole object.
   */
  orderSettlementAttestations: (orderId: string) =>
    ["store", "orders", orderId, "settlement-attestations"] as const,

  /**
   * The thread inbox and one thread's messages.
   *
   * `threadInboxRoot` exists so a write can clear every filtered variant at once — a new message
   * moves a thread's preview and its position regardless of which `resourceKind` filter is showing.
   */
  threadInboxRoot: () => ["store", "threads", "inbox"] as const,
  threadInbox: (resourceKind: string | undefined) =>
    ["store", "threads", "inbox", resourceKind] as const,
  threadMessages: (threadId: string) => ["store", "threads", threadId, "messages"] as const,

  /**
   * The caller's wishlist — bookmarked listings.
   *
   * NOT KEYED BY KIND ANY MORE. It used to be, because an absent `kind` meant BOTH; the backend's
   * migration 0120 removed that parameter along with the idea that a like belongs in a list. One
   * list, one key.
   *
   * No `*Root` twin either, unlike `threadInbox` above — that pair exists because the inbox has
   * filtered variants to clear at once, and this has exactly one shape. A bookmark write
   * invalidates this key directly. A LIKE MUST NOT — a like changes a public counter and no list,
   * so invalidating here on a like would refetch the wishlist to prove nothing changed.
   */
  bookmarkedProducts: () => ["store", "bookmarked-products"] as const,

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
   * The provider's own bids across every RFQ, optionally narrowed to one status.
   *
   * `status` IS PART OF THE KEY because the backend filters in SQL and returns a keyset page — two
   * filters are two different paginations, and sharing one entry would splice pages from different
   * result sets together. `undefined` is its own entry, which is the unfiltered list.
   */
  providerQuoteList: (status?: string) => ["store", "quotes", "provider", status ?? "all"] as const,

  /**
   * The buyer's reviewable completions, optionally narrowed to unreviewed ones.
   *
   * `reviewable` IS PART OF THE KEY for the same reason `status` is above: the backend filters in
   * SQL and returns a keyset page, so two filters are two paginations.
   */
  buyerCompletionList: (reviewable?: boolean) =>
    ["store", "completions", reviewable === undefined ? "all" : String(reviewable)] as const,

  /** One review the caller wrote, with its media — the only author-facing review read. */
  ownReview: (reviewId: string) => ["store", "reviews", reviewId] as const,

  /**
   * Reviews written about the caller's organization, keyed by the whole filter.
   *
   * `sellerReviewInboxRoot` is the PREFIX a reply write invalidates: a reply changes whether a row
   * matches `unreplied`, so every filter of the inbox is stale, not just the one on screen.
   */
  sellerReviewInboxRoot: () => ["store", "seller-reviews"] as const,
  sellerReviewInbox: (filterKey: string) => ["store", "seller-reviews", filterKey] as const,

  /**
   * The caller organization's own service offerings — `GET …/offerings/mine`.
   *
   * Invalidated after a create so `/studio/services` shows the new draft. No organization id in the key,
   * for the same reason `cart` has none: the active organization is server-derived.
   */
  /**
   * The public directory, keyed by its FILTER — a list narrowed to `freight_forwarder` is a
   * different question from the unfiltered one and must not share a cache entry.
   */
  providerDirectory: (filter: { readonly providerKind?: string }) =>
    ["store", "providers", "directory", filter.providerKind ?? "all"] as const,
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

  /**
   * `sellerQuestionInboxRoot` is the PREFIX an answer write invalidates: answering flips
   * `hasSellerAnswer`, which decides whether a row matches `unansweredOnly` — so EVERY filter of the
   * inbox is stale, not just the one on screen. Same shape and same reason as
   * `sellerReviewInboxRoot` above.
   */
  sellerQuestionInboxRoot: () => ["store", "seller-questions"] as const,
  sellerQuestionInbox: (filterKey: string) => ["store", "seller-questions", filterKey] as const,

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

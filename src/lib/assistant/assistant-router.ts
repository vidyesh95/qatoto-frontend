// TRANSPORT: props-only — pure text matching. No fetching, no React, no DOM, no model.
//
// THE ASSISTANT'S DETERMINISTIC ROUTER: THE PART THAT WORKS IN EVERY BROWSER.
//
// Most of what people ask an assistant on a site like this is "take me to X" or "find Y". Neither
// needs a language model, so this file answers them first, synchronously, from a table: no network,
// no download, no Premium AI. A browser with no model at all can still use the assistant for places
// and searches, and a browser with one does not spend a prompt on "my orders".
//
// IT ANSWERS ONLY WHEN IT UNDERSTOOD THE WHOLE REQUEST. The coverage gate below lets the router
// take a request only when, once the wrapper ("go to", "show me"), the matched phrase and filler
// words are removed, at most one word is left over. "go to my orders" routes; "what's the difference
// between funding and governance for equity" does not, and goes to the chat's model. A question
// that opens like a question ("what", "why", "is there") is the model's too. A router that grabbed
// every sentence containing "orders" would be worse than none.
//
// IT OFFERS; THE VIEWER ACTS. A match becomes a card with an Open link (`assistant-action-card.tsx`).
// Nothing here navigates, and a search is a link to the real results page, run when tapped.
//
// EVERY DESTINATION DECLARES ITS PHRASES. `ASSISTANT_DESTINATION_PHRASES` is a `Record` over the
// destination keys, so a new destination is a compile error until it says what people call it.
// A phrase listed under several keys is DELIBERATELY ambiguous ("videos", "projects", "search"):
// a tie becomes a "did you mean" choice rather than a guess.

import {
  ASSISTANT_DESTINATION_KEYS,
  ASSISTANT_DESTINATIONS,
  type AssistantDestinationKey,
} from "@/lib/assistant/assistant-destinations";
import {
  ASSISTANT_SEARCH_QUERY_MAXIMUM_LENGTH,
  type AssistantSearchScope,
} from "@/lib/assistant/assistant-reply.schemas";

export type AssistantRouterMatch =
  | { readonly kind: "destination"; readonly destinationKey: AssistantDestinationKey }
  | { readonly kind: "search"; readonly scope: AssistantSearchScope; readonly query: string }
  /** Two or three destinations the words fit equally well. */
  | { readonly kind: "choices"; readonly destinationKeys: readonly AssistantDestinationKey[] }
  /** Not understood. Up to three places sharing a word with it, for a browser with no model. */
  | {
      readonly kind: "none";
      readonly nearbyDestinationKeys: readonly AssistantDestinationKey[];
    };

/** What people call each place. The destination's own label is added to these automatically. */
export const ASSISTANT_DESTINATION_PHRASES: Record<AssistantDestinationKey, readonly string[]> = {
  home_feed: ["home", "home feed", "homepage", "home page", "feed", "latest videos", "videos"],
  search_everything: ["search", "search everything", "site search"],
  browse_store: ["store", "shop", "marketplace", "store front"],
  search_store: ["search", "store search", "search products", "product search"],
  store_categories: ["categories", "category", "product categories", "store categories"],
  open_cart: ["cart", "my cart", "basket", "shopping cart", "checkout"],
  your_orders: [
    "orders",
    "order",
    "my orders",
    "returns",
    "refund",
    "refunds",
    "track my order",
    "order status",
  ],
  wishlist: ["wishlist", "wish list", "saved products"],
  find_factories: [
    "factories",
    "factory",
    "manufacturers",
    "manufacturer",
    "factory directory",
    "suppliers",
    "supplier",
    "odm",
    "oem",
  ],
  request_quote: [
    "rfq",
    "rfqs",
    "quote",
    "quotation",
    "get a quote",
    "request for quotation",
    "raise an rfq",
  ],
  trade_services: [
    "logistics",
    "freight",
    "shipping",
    "customs",
    "service providers",
    "trade service providers",
  ],
  find_cofounder: ["cofounder", "co founder", "cofounders", "find a co founder"],
  business_forum: ["forum", "forums", "discussions", "discussion"],
  explore_blueprints: ["blueprint"],
  teardowns: ["teardown", "tear down", "tear downs", "bill of materials", "bom"],
  showcase: ["launches", "launch", "prototypes", "prototype launches"],
  case_studies: ["case study", "manufacturing lessons", "lessons"],
  post_an_idea: [
    "idea",
    "new idea",
    "submit an idea",
    "share an idea",
    "start a project",
    "new project",
  ],
  problem_map: ["problems", "reported problems", "problem"],
  market_research: ["market research", "research papers", "papers", "prior art"],
  research_programs: [
    "research programs",
    "programmes",
    "programs",
    "programme",
    "program",
  ],
  team_building: ["open roles", "roles", "jobs", "join a team", "projects"],
  talent: ["freelancers", "hire", "hire someone", "people for hire", "specialists"],
  funding: ["fund a project", "invest", "investing", "back a project", "raise money", "projects"],
  build_log: ["daily updates", "updates", "build updates", "projects"],
  governance: ["statements", "commitments", "month end statements"],
  library: ["playlists", "playlist", "liked videos", "saved videos", "likes", "videos"],
  watch_history: ["history", "watch history", "watched videos", "videos"],
  messages: ["inbox", "dms", "direct messages"],
  creator_studio: ["creator studio", "dashboard", "my videos", "my products", "my listings"],
  sell_a_product: [
    "sell",
    "sell a product",
    "sell something",
    "new listing",
    "create a listing",
    "list a product",
  ],
  roadmap: ["features", "what qatoto can do"],
  customer_service: ["help", "support", "contact support", "customer support", "account help"],
};

/** Opening words that only frame a request. Longest first, so "show me" wins over "show". */
const NAVIGATION_WRAPPERS: readonly string[] = [
  "please take me to",
  "where can i find",
  "where do i find",
  "can you take me to",
  "could you take me to",
  "i would like to",
  "take me to",
  "bring me to",
  "navigate to",
  "how do i",
  "how can i",
  "i want to",
  "i need to",
  "let me see",
  "can you",
  "could you",
  "where is",
  "where are",
  "go to",
  "goto",
  "open up",
  "show me",
  "please",
  "open",
  "show",
  "view",
  "wheres",
].toSorted((leftWrapper, rightWrapper) => rightWrapper.length - leftWrapper.length);

/** Words that start a search. Checked after the wrappers above are removed. */
const SEARCH_VERBS: readonly string[] = [
  "where can i buy",
  "search for",
  "look for",
  "looking for",
  "look up",
  "find me",
  "get me",
  "show me",
  "i need",
  "i want",
  "search",
  "find",
  "buy",
].toSorted((leftVerb, rightVerb) => rightVerb.length - leftVerb.length);

/** A request that opens like a question is the model's, unless a wrapper above consumed it. */
const QUESTION_OPENERS = new Set([
  "what",
  "whats",
  "why",
  "how",
  "when",
  "who",
  "which",
  "explain",
  "tell",
  "does",
  "do",
  "is",
  "are",
  "should",
  "would",
  "will",
]);

/** Words that carry nothing a destination or a search needs. Ignored by the coverage gate. */
const FILLER_WORDS = new Set([
  "a",
  "an",
  "the",
  "my",
  "me",
  "i",
  "to",
  "of",
  "for",
  "on",
  "in",
  "at",
  "and",
  "page",
  "pages",
  "section",
  "please",
  "qatoto",
  "here",
  "now",
  "up",
  "your",
  "some",
  "any",
  "all",
  "it",
  "that",
  "this",
  "thanks",
  "thank",
  "you",
  "is",
  "are",
  "where",
]);

/** The most words a routed request may have; anything longer is a sentence for the model. */
const ROUTABLE_WORD_LIMIT = 12;
/** Content words a destination match may leave unexplained ("find" in "find factories"). */
const DESTINATION_LEFTOVER_WORD_LIMIT = 1;
const CHOICE_LIMIT = 3;
const NEARBY_DESTINATION_LIMIT = 3;

/** Lowercase words, with apostrophes dropped ("what's" is "whats") and punctuation as spaces. */
export function tokenizeRequest(requestText: string): readonly string[] {
  return requestText
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter((word) => word.length > 0);
}

function startsWithWords(words: readonly string[], prefixWords: readonly string[]): boolean {
  return (
    prefixWords.length <= words.length &&
    prefixWords.every((prefixWord, wordIndex) => words[wordIndex] === prefixWord)
  );
}

/**
 * Wrappers that can also open a search. "show me solar panels" and "where can i find solar pumps"
 * are searches once the wrapper is gone; "show me my orders" is still a place, because a subject
 * that is wholly a destination is never searched for (`matchSearchSubject`).
 */
const SEARCH_OPENING_WRAPPERS = new Set([
  "where can i find",
  "where do i find",
  "show me",
  "show",
  "let me see",
]);

/** Removes every leading wrapper ("please show me", "can you take me to"). */
function stripNavigationWrappers(words: readonly string[]): {
  readonly remainingWords: readonly string[];
  readonly didStripSearchOpener: boolean;
} {
  let remainingWords = words;
  let didStripSearchOpener = false;
  let didStrip = true;
  while (didStrip) {
    didStrip = false;
    for (const wrapper of NAVIGATION_WRAPPERS) {
      const wrapperWords = tokenizeRequest(wrapper);
      if (startsWithWords(remainingWords, wrapperWords)) {
        remainingWords = remainingWords.slice(wrapperWords.length);
        didStripSearchOpener ||= SEARCH_OPENING_WRAPPERS.has(wrapper);
        didStrip = true;
        break;
      }
    }
  }
  return { remainingWords, didStripSearchOpener };
}

/** Every phrase a destination answers to, tokenized once. */
const DESTINATION_PHRASE_WORDS: ReadonlyArray<{
  readonly destinationKey: AssistantDestinationKey;
  readonly phraseWordLists: readonly (readonly string[])[];
}> = ASSISTANT_DESTINATION_KEYS.map((destinationKey) => ({
  destinationKey,
  phraseWordLists: [
    ASSISTANT_DESTINATIONS[destinationKey].label,
    ...ASSISTANT_DESTINATION_PHRASES[destinationKey],
  ]
    .map(tokenizeRequest)
    .filter((phraseWords) => phraseWords.length > 0),
}));

interface DestinationScore {
  readonly destinationKey: AssistantDestinationKey;
  /** Words in its longest phrase found in the request. */
  readonly matchedWordCount: number;
  /** Content words of the request that phrase does not explain. */
  readonly leftoverWordCount: number;
}

/** Where a phrase occurs as whole consecutive words, or -1. */
function findPhrase(words: readonly string[], phraseWords: readonly string[]): number {
  for (let startIndex = 0; startIndex + phraseWords.length <= words.length; startIndex += 1) {
    if (phraseWords.every((phraseWord, offset) => words[startIndex + offset] === phraseWord)) {
      return startIndex;
    }
  }
  return -1;
}

function countContentWords(words: readonly string[]): number {
  return words.filter((word) => !FILLER_WORDS.has(word)).length;
}

function scoreDestinations(words: readonly string[]): readonly DestinationScore[] {
  const destinationScores: DestinationScore[] = [];
  for (const { destinationKey, phraseWordLists } of DESTINATION_PHRASE_WORDS) {
    let bestScore: DestinationScore | null = null;
    for (const phraseWords of phraseWordLists) {
      const phraseStartIndex = findPhrase(words, phraseWords);
      if (phraseStartIndex === -1) continue;
      if (bestScore !== null && bestScore.matchedWordCount >= phraseWords.length) continue;
      const leftoverWords = [
        ...words.slice(0, phraseStartIndex),
        ...words.slice(phraseStartIndex + phraseWords.length),
      ];
      bestScore = {
        destinationKey,
        matchedWordCount: phraseWords.length,
        leftoverWordCount: countContentWords(leftoverWords),
      };
    }
    if (bestScore !== null) destinationScores.push(bestScore);
  }
  return destinationScores;
}

/** The destination match this request fully explains, if any, as a single key or a tie. */
function matchDestination(words: readonly string[]): AssistantRouterMatch | null {
  const coveredScores = scoreDestinations(words).filter(
    (destinationScore) => destinationScore.leftoverWordCount <= DESTINATION_LEFTOVER_WORD_LIMIT,
  );
  if (coveredScores.length === 0) return null;
  // Fewest unexplained words first, then the longest phrase: "search the store" is the store
  // search, not "Search" with "store" left over.
  const bestLeftoverWordCount = Math.min(
    ...coveredScores.map((destinationScore) => destinationScore.leftoverWordCount),
  );
  const leastLeftoverScores = coveredScores.filter(
    (destinationScore) => destinationScore.leftoverWordCount === bestLeftoverWordCount,
  );
  const bestMatchedWordCount = Math.max(
    ...leastLeftoverScores.map((destinationScore) => destinationScore.matchedWordCount),
  );
  const bestKeys = leastLeftoverScores
    .filter((destinationScore) => destinationScore.matchedWordCount === bestMatchedWordCount)
    .map((destinationScore) => destinationScore.destinationKey);
  const [onlyKey, ...otherKeys] = bestKeys;
  if (onlyKey === undefined) return null;
  if (otherKeys.length === 0) return { kind: "destination", destinationKey: onlyKey };
  return { kind: "choices", destinationKeys: bestKeys.slice(0, CHOICE_LIMIT) };
}

/** True when a destination phrase explains every content word: "find factories", not a search. */
function isWhollyADestination(words: readonly string[]): boolean {
  return scoreDestinations(words).some((destinationScore) => destinationScore.leftoverWordCount === 0);
}

const SCOPE_WORDS: Record<AssistantSearchScope, ReadonlySet<string>> = {
  store: new Set(["store", "shop", "marketplace", "products", "product"]),
  videos: new Set(["videos", "video"]),
  research_programs: new Set(["programmes", "programme", "programs", "program", "research"]),
};
const SCOPE_CONNECTORS = new Set(["in", "on", "from", "at", "about", "for", "of", "with"]);
const QUERY_EDGE_FILLER = new Set([
  "a",
  "an",
  "the",
  "some",
  "any",
  "me",
  "for",
  "about",
  "on",
  "of",
  "with",
  "in",
]);

function findScopeOfWord(word: string): AssistantSearchScope | null {
  for (const [scope, scopeWords] of Object.entries(SCOPE_WORDS)) {
    if (scopeWords.has(word) && isAssistantSearchScope(scope)) return scope;
  }
  return null;
}

function isAssistantSearchScope(candidate: string): candidate is AssistantSearchScope {
  return candidate === "store" || candidate === "videos" || candidate === "research_programs";
}

function trimEdgeFiller(words: readonly string[]): readonly string[] {
  let startIndex = 0;
  let endIndex = words.length;
  while (startIndex < endIndex && QUERY_EDGE_FILLER.has(words[startIndex] ?? "")) startIndex += 1;
  while (endIndex > startIndex && QUERY_EDGE_FILLER.has(words[endIndex - 1] ?? "")) endIndex -= 1;
  return words.slice(startIndex, endIndex);
}

/**
 * The scope and the words to search for, from what follows a search verb (or from a request that
 * opens with a scope, "videos about drones"). The scope words themselves are removed from the query.
 */
function readSearch(
  words: readonly string[],
): { readonly scope: AssistantSearchScope; readonly query: string } | null {
  let scope: AssistantSearchScope | null = null;
  let queryWords = [...words];

  // A trailing "in the store", "on videos".
  const lastWord = queryWords.at(-1);
  const trailingScope = lastWord === undefined ? null : findScopeOfWord(lastWord);
  if (trailingScope !== null) {
    let scopeStartIndex = queryWords.length - 1;
    while (
      scopeStartIndex > 0 &&
      (queryWords[scopeStartIndex - 1] === "the" ||
        SCOPE_CONNECTORS.has(queryWords[scopeStartIndex - 1] ?? ""))
    ) {
      scopeStartIndex -= 1;
    }
    if (scopeStartIndex > 0) {
      scope = trailingScope;
      queryWords = queryWords.slice(0, scopeStartIndex);
    }
  }

  // A leading "videos about", "products for".
  const firstWord = queryWords[0];
  const leadingScope = firstWord === undefined ? null : findScopeOfWord(firstWord);
  if (scope === null && leadingScope !== null && SCOPE_CONNECTORS.has(queryWords[1] ?? "")) {
    scope = leadingScope;
    queryWords = queryWords.slice(2);
  }

  // A scope word anywhere else: "drone videos".
  if (scope === null) {
    const scopeWordIndex = queryWords.findIndex((word) => findScopeOfWord(word) !== null);
    const scopeWord = queryWords[scopeWordIndex];
    if (scopeWord !== undefined && queryWords.length > 1) {
      scope = findScopeOfWord(scopeWord);
      queryWords = queryWords.filter((_word, wordIndex) => wordIndex !== scopeWordIndex);
    }
  }

  const query = trimEdgeFiller(queryWords)
    .join(" ")
    .slice(0, ASSISTANT_SEARCH_QUERY_MAXIMUM_LENGTH)
    .trim();
  if (query.length === 0) return null;
  return { scope: scope ?? "store", query };
}

/** Searches for a subject, unless the subject is itself a place ("my orders"). */
function matchSearchSubject(subjectWords: readonly string[]): AssistantRouterMatch | null {
  if (subjectWords.length === 0 || isWhollyADestination(subjectWords)) return null;
  const search = readSearch(subjectWords);
  return search === null ? null : { kind: "search", scope: search.scope, query: search.query };
}

/** A search request whose subject is not itself a place: "find solar pumps", "videos about drones". */
function matchSearch(words: readonly string[]): AssistantRouterMatch | null {
  let subjectWords: readonly string[] | null = null;
  for (const searchVerb of SEARCH_VERBS) {
    const verbWords = tokenizeRequest(searchVerb);
    if (startsWithWords(words, verbWords)) {
      subjectWords = words.slice(verbWords.length);
      break;
    }
  }
  if (subjectWords === null) {
    const firstWord = words[0];
    const isScopeLed =
      firstWord !== undefined &&
      findScopeOfWord(firstWord) !== null &&
      SCOPE_CONNECTORS.has(words[1] ?? "");
    if (!isScopeLed) return null;
    subjectWords = words;
  }
  return matchSearchSubject(subjectWords);
}

/** Up to three places that share a content word with the request, most shared words first. */
function findNearbyDestinations(words: readonly string[]): readonly AssistantDestinationKey[] {
  const contentWords = new Set(
    words.filter((word) => !FILLER_WORDS.has(word) && !QUESTION_OPENERS.has(word)),
  );
  if (contentWords.size === 0) return [];
  return DESTINATION_PHRASE_WORDS.map(({ destinationKey, phraseWordLists }) => ({
    destinationKey,
    sharedWordCount: new Set(
      phraseWordLists.flat().filter((phraseWord) => contentWords.has(phraseWord)),
    ).size,
  }))
    .filter((nearbyCandidate) => nearbyCandidate.sharedWordCount > 0)
    .toSorted(
      (leftCandidate, rightCandidate) =>
        rightCandidate.sharedWordCount - leftCandidate.sharedWordCount,
    )
    .slice(0, NEARBY_DESTINATION_LIMIT)
    .map((nearbyCandidate) => nearbyCandidate.destinationKey);
}

/** Routes one request. Pure and synchronous: the same words always give the same answer. */
export function routeAssistantRequest(requestText: string): AssistantRouterMatch {
  const allWords = tokenizeRequest(requestText);
  const noMatch: AssistantRouterMatch = {
    kind: "none",
    nearbyDestinationKeys: findNearbyDestinations(allWords),
  };
  if (allWords.length === 0 || allWords.length > ROUTABLE_WORD_LIMIT) return noMatch;

  const { remainingWords: requestWords, didStripSearchOpener } = stripNavigationWrappers(allWords);
  const firstWord = requestWords[0];
  if (firstWord === undefined || QUESTION_OPENERS.has(firstWord)) return noMatch;

  return (
    matchSearch(requestWords) ??
    matchDestination(requestWords) ??
    (didStripSearchOpener ? matchSearchSubject(requestWords) : null) ??
    noMatch
  );
}

const SEARCH_RESULT_PATHS: Record<
  AssistantSearchScope,
  { readonly path: string; readonly queryParameter: string }
> = {
  // `store-search-page.tsx` reads `query`.
  store: { path: "/store/search", queryParameter: "query" },
  // The navbar form's own field name, so `/search`'s contract is fixed by that markup.
  videos: { path: "/search", queryParameter: "query" },
  // `research-and-development/programs/page.tsx` reads `q`.
  research_programs: { path: "/research-and-development/programs", queryParameter: "q" },
};

/** The real results page for a routed search, opened when the viewer taps it. */
export function buildRouterSearchHref(scope: AssistantSearchScope, query: string): string {
  const searchResultPath = SEARCH_RESULT_PATHS[scope];
  return `${searchResultPath.path}?${new URLSearchParams({
    [searchResultPath.queryParameter]: query,
  }).toString()}`;
}

/**
 * A routed turn as the model sees it in the history, so a model answering later in the same chat
 * knows what was already offered and the history has no gap where the router answered.
 */
export function describeRouterMatchForHistory(
  routerMatch: AssistantRouterMatch,
  searchScopeLabels: Record<AssistantSearchScope, string>,
): string {
  switch (routerMatch.kind) {
    case "destination":
      return `Offered a link to ${ASSISTANT_DESTINATIONS[routerMatch.destinationKey].label}.`;
    case "search":
      return `Offered a search of ${searchScopeLabels[routerMatch.scope]} for “${routerMatch.query}”.`;
    case "choices":
      return `Offered a choice of ${routerMatch.destinationKeys
        .map((destinationKey) => ASSISTANT_DESTINATIONS[destinationKey].label)
        .join(", ")}.`;
    case "none":
      return "Did not recognise that as a place or a search.";
    default: {
      const exhaustiveCheck: never = routerMatch;
      return exhaustiveCheck;
    }
  }
}

// TRANSPORT: mock — every getter below serves `@/mocks/blueprints-mocks`. No network call is
// made yet, and there is no `/blueprints` read on the Express backend to make one against.
//
// THE GETTER IS THE POINT. `src/lib/cms.ts` is the precedent: import sites see only these
// functions, never the fixture array, so wiring a real endpoint later is an edit to this file
// rather than a rewrite of every component. `@/mocks/anime-mocks` was wired the other way — its
// components imported the arrays directly — and that is exactly why the surface stayed mock.
//
// WHEN THE BACKEND ARRIVES, each getter becomes the `remote ?? MOCK` shape `cms.ts:48-71` uses,
// and the parse below stops being a fixture check and starts being CLAUDE.md Pattern 2 — an
// untrusted payload through `.strip()`. The parse is written now so that swap changes one line.

import { MOCK_BLUEPRINTS, MOCK_SHOWCASE_COMMENTS } from "@/mocks/blueprints-mocks";
import {
  type Blueprint,
  type BlueprintCategory,
  type BlueprintComment,
  BlueprintCommentSchema,
  type BlueprintOfCategory,
  type BlueprintPage,
  BlueprintSchema,
  type CaseStudyBlueprint,
  DEFAULT_SHOWCASE_SORT,
  type BlueprintDifficulty,
  type BlueprintDiscipline,
  RESERVED_BLUEPRINT_SLUGS,
  type ShowcaseBlueprint,
  type ShowcaseSort,
  type TeardownBlueprint,
  type TeardownMediaFilter,
} from "@/lib/blueprints/schemas";
import type { FacetBucket } from "@/components/home/shared/facet-chip-row";

/**
 * Parse a fixture through the contract.
 *
 * A malformed fixture is a DEVELOPER ERROR, not a runtime state, so this throws rather than
 * returning a tagged result — there is no user-facing story for "the file in this repo is wrong",
 * and swallowing it would let a typo render as a blank card. Once these rows arrive over the
 * network the failure becomes ordinary and this returns a result instead.
 */
function parseBlueprint(candidate: unknown): Blueprint {
  return BlueprintSchema.parse(candidate);
}

/** Newest first — the order every rail and the hub index rely on. */
function byNewestFirst(left: Blueprint, right: Blueprint): number {
  return Date.parse(right.createdAt) - Date.parse(left.createdAt);
}

/**
 * A slug a static route already owns, so no blueprint may answer on it.
 *
 * `/blueprints/showcase` is a list route; a blueprint slugged `showcase` would be permanently
 * unreachable, and a visitor would get a 200 showing the WRONG page — worse than a 404. The
 * guard lives here rather than in a route file because `getBlueprint`, `listBlueprintSlugs` and
 * the sitemap each reach the data independently, and a guard in one of them leaks through the
 * other two. Derived from `BLUEPRINT_CATEGORY_SEGMENTS` so the segments and the guard cannot drift.
 */
function isReservedSlug(slug: string): boolean {
  return RESERVED_BLUEPRINT_SLUGS.includes(slug);
}

/**
 * The narrowing both category getters below rely on, written as a TYPE PREDICATE rather than a
 * cast. `blueprint.category === category` does not narrow a generic arm on its own, and the
 * obvious fix — `as BlueprintOfCategory<TCategory>` — is the assertion CLAUDE.md Pattern 2 rules
 * out. A predicate makes the same claim in the one place a reader can check it.
 */
function isBlueprintOfCategory<TCategory extends BlueprintCategory>(
  blueprint: Blueprint,
  category: TCategory,
): blueprint is BlueprintOfCategory<TCategory> {
  return blueprint.category === category;
}

export async function listBlueprints(): Promise<Blueprint[]> {
  "use cache";
  return MOCK_BLUEPRINTS.map(parseBlueprint).toSorted(byNewestFirst);
}

/**
 * One category's blueprints, NARROWED to that category's arm.
 *
 * The narrowing is the reason this exists rather than each list route filtering `listBlueprints`.
 * `blueprints.filter((blueprint) => blueprint.category === category)` returns the full union —
 * `.filter` without a type predicate does not narrow the element type — so a showcase feed built
 * that way could not read `launchedAt` without a cast, and CLAUDE.md Pattern 2 forbids the cast.
 *
 * MODULE-PRIVATE. The three filtered, paged getters below supersede it for every page on the
 * surface, and an exported wrapper with no caller is unverified code.
 */
async function listBlueprintsByCategory<TCategory extends BlueprintCategory>(
  category: TCategory,
): Promise<BlueprintOfCategory<TCategory>[]> {
  "use cache";
  // The callback carries the predicate signature explicitly rather than leaning on TS 5.5's
  // inferred predicates — an inferred one through a delegating call is not something to bet the
  // arm fields of three list routes on.
  const matching = MOCK_BLUEPRINTS.map(parseBlueprint).filter(
    (blueprint): blueprint is BlueprintOfCategory<TCategory> =>
      isBlueprintOfCategory(blueprint, category),
  );
  return matching.toSorted(byNewestFirst);
}

export async function getBlueprint(slug: string): Promise<Blueprint | null> {
  "use cache";
  if (isReservedSlug(slug)) return null;
  const match = MOCK_BLUEPRINTS.find((blueprint) => blueprint.slug === slug);
  return match ? parseBlueprint(match) : null;
}

/**
 * One blueprint, but only if it lives under the category that was asked for.
 *
 * A teardown slug requested at `/blueprints/showcase/<slug>` must 404. Returning it would render
 * a teardown through the launch-feed layout, reading arm fields that are not there — so the
 * category is part of the lookup, not a thing the page checks afterwards and forgets to.
 */
export async function getBlueprintByCategory<TCategory extends BlueprintCategory>(
  category: TCategory,
  slug: string,
): Promise<BlueprintOfCategory<TCategory> | null> {
  "use cache";
  const blueprint = await getBlueprint(slug);
  if (blueprint === null) return null;
  return isBlueprintOfCategory(blueprint, category) ? blueprint : null;
}

// --- Keyset paging ------------------------------------------------------------
//
// KEYSET, NOT OFFSET, matching the only navigable paging control in this repo. Offset pages exist
// on the wire in R&D (`src/lib/rnd/shared.schemas.ts:14`) but nothing renders a next link for one;
// every server-rendered "show more" in the repo goes through `CursorPageControl`.
//
// THE PAGE LIMITS ARE SMALL BECAUSE THE DATA IS FIXTURES. R&D uses 24 (`talent-page.tsx:27`) and
// the store passes none at all, taking the backend default. Twelve teardowns behind a limit of 24
// would mean the paging control never rendered — code that ships unexercised, which is the exact
// failure this surface argues against everywhere else. These rise when there is real inventory;
// they are not a considered product decision about how many teardowns fit on a page.

/** 12 teardown fixtures → 2 pages. Eight is also two clean rows of the four-column grid. */
export const TEARDOWNS_PAGE_LIMIT = 8;
/** 10 showcase fixtures → 2 pages (6 + 4), under either sort and with no tag applied. */
export const SHOWCASE_PAGE_LIMIT = 6;
/** 10 case-study fixtures → 2 pages (6 + 4), with no discipline applied. */
export const CASE_STUDIES_PAGE_LIMIT = 6;

/**
 * The cursor is the last row's id, base64url-encoded.
 *
 * THE ENCODING IS THE POINT, not the payload. `CursorPageControl` requires an OPAQUE token — never
 * parsed, compared or incremented — and a bare `bp-007` sitting in the query string invites
 * exactly that. Encoding makes the opacity real rather than aspirational, and lets the backend
 * swap in its own encoding (a sort key plus a tie-break id) without a caller noticing.
 *
 * An id-only cursor is valid under EVERY order, which is why the showcase feed can offer two sorts
 * without a second cursor scheme: a hand-edited `?sort=top&cursor=<cursor minted under newest>`
 * still resolves (the id exists in both orders) and starts after that row in the `top` order.
 * The backend will encode the sort key beside the id and 422 a foreign cursor — and there is still
 * no `error` arm to render that into, deliberately (`todo.md` §1a).
 */
function encodeBlueprintCursor(blueprintId: string): string {
  return Buffer.from(blueprintId, "utf8").toString("base64url");
}

/**
 * Where the requested page starts.
 *
 * AN UNRESOLVABLE CURSOR IS DROPPED AND THE FIRST PAGE IS SERVED, rather than erroring. That is
 * this repo's documented behaviour for a hand-edited query param on a server page — see
 * `factory-directory-page.tsx:57-58` on `readEnumParam` turning `?capabilityKind=banana` into "no
 * filter" instead of a 422 page. The backend will answer 422 for a cursor it did not mint, and
 * handling that is the job of the `error` arm these view states deliberately do not have yet.
 */
function resolveStartIndex(rows: readonly { id: string }[], cursor: string | undefined): number {
  if (cursor === undefined) return 0;

  const decodedId = Buffer.from(cursor, "base64url").toString("utf8");
  const cursorIndex = rows.findIndex((row) => row.id === decodedId);
  return cursorIndex === -1 ? 0 : cursorIndex + 1;
}

/** Slice one keyset page out of an already filtered and sorted list. */
function toBlueprintPage<TBlueprint extends { id: string }>(
  rows: readonly TBlueprint[],
  cursor: string | undefined,
  limit: number,
): BlueprintPage<TBlueprint> {
  const startIndex = resolveStartIndex(rows, cursor);
  const items = rows.slice(startIndex, startIndex + limit);
  const lastItem = items.at(-1);
  const hasMore = startIndex + items.length < rows.length;

  return {
    items,
    // Both halves agree or the control renders nothing — `cursor-page-control.tsx:25-27`.
    page: {
      nextCursor: hasMore && lastItem !== undefined ? encodeBlueprintCursor(lastItem.id) : null,
      hasMore,
    },
  };
}

// --- The three list reads -----------------------------------------------------
//
// FILTERING AND SORTING LIVE HERE, NOT IN THE PAGE COMPONENTS, and that is a change from how this
// surface first shipped. A page cannot page a list it has not finished filtering, and the shape
// below is the one a real endpoint answers — compare `listForumThreads({ board, cursor })` in
// `src/lib/store/forum.api.ts:46`. When the backend lands, these filters become query params and
// the predicates are deleted rather than moved into a component.

export interface ListTeardownsFilter {
  readonly difficulty?: BlueprintDifficulty;
  readonly media?: TeardownMediaFilter;
  readonly tag?: string;
  readonly cursor?: string;
  readonly limit?: number;
}

/**
 * A `Record` over the media enum, so a fourth filter is a compile error here rather than a value
 * the index offers and the getter silently ignores — the `SHOWCASE_SORT_COMPARATORS` precedent.
 */
const TEARDOWN_MEDIA_PREDICATES: Record<
  TeardownMediaFilter,
  (teardown: TeardownBlueprint) => boolean
> = {
  assembly: (teardown) => teardown.assembly !== null,
  video: (teardown) => teardown.walkthroughVideo !== null,
  documents: (teardown) => teardown.documents.length > 0,
};

export async function listTeardowns(
  filter: ListTeardownsFilter = {},
): Promise<BlueprintPage<TeardownBlueprint>> {
  "use cache";
  const teardowns = await listBlueprintsByCategory("teardown");

  const matching = teardowns.filter(
    (teardown) =>
      (filter.difficulty === undefined || teardown.difficulty === filter.difficulty) &&
      (filter.media === undefined || TEARDOWN_MEDIA_PREDICATES[filter.media](teardown)) &&
      (filter.tag === undefined || teardown.tags.includes(filter.tag)),
  );

  return toBlueprintPage(matching, filter.cursor, filter.limit ?? TEARDOWNS_PAGE_LIMIT);
}

export interface ListShowcasesFilter {
  readonly tag?: string;
  /** Omitted means `DEFAULT_SHOWCASE_SORT`. */
  readonly sort?: ShowcaseSort;
  readonly cursor?: string;
  readonly limit?: number;
}

/**
 * NEWEST LAUNCH FIRST, BY `launchedAt` AND NOT `createdAt`.
 *
 * A launch is announced on a date its author chose; `createdAt` is when the row was typed. The two
 * differ by days in the fixtures on purpose, so an order built on the wrong field is visible
 * rather than plausible. The sort lives beside the filter because a cursor into an unstable order
 * is meaningless.
 *
 * THE ID IS THE TIE-BREAK, and every comparator on this surface ends in it. `toSorted` is stable,
 * but stability only preserves INPUT order, and the input here is `byNewestFirst` over `createdAt`
 * — a different field. A cursor into an order two renders could disagree about would skip or
 * repeat a row.
 */
function byMostRecentlyLaunched(left: ShowcaseBlueprint, right: ShowcaseBlueprint): number {
  return (
    Date.parse(right.launchedAt) - Date.parse(left.launchedAt) || left.id.localeCompare(right.id)
  );
}

/**
 * MOST UPVOTED FIRST, then most recently launched, then id. Ties on a vote count are real —
 * `bp-025` and `bp-018` both sit at 96 in the fixtures on purpose — so a tie falls back to the
 * whole newest order rather than to input order, and `top` is a total order on its own.
 */
function byMostUpvoted(left: ShowcaseBlueprint, right: ShowcaseBlueprint): number {
  return right.upvoteCount - left.upvoteCount || byMostRecentlyLaunched(left, right);
}

/** A `Record` over the sort enum, so a third sort is a compile error here rather than a silent default. */
const SHOWCASE_SORT_COMPARATORS: Record<
  ShowcaseSort,
  (left: ShowcaseBlueprint, right: ShowcaseBlueprint) => number
> = {
  newest: byMostRecentlyLaunched,
  top: byMostUpvoted,
};

export async function listShowcases(
  filter: ListShowcasesFilter = {},
): Promise<BlueprintPage<ShowcaseBlueprint>> {
  "use cache";
  const showcases = await listBlueprintsByCategory("showcase");

  const matching = showcases
    .filter((showcase) => filter.tag === undefined || showcase.tags.includes(filter.tag))
    .toSorted(SHOWCASE_SORT_COMPARATORS[filter.sort ?? DEFAULT_SHOWCASE_SORT]);

  return toBlueprintPage(matching, filter.cursor, filter.limit ?? SHOWCASE_PAGE_LIMIT);
}

export interface ListCaseStudiesFilter {
  readonly discipline?: BlueprintDiscipline;
  readonly cursor?: string;
  readonly limit?: number;
}

export async function listCaseStudies(
  filter: ListCaseStudiesFilter = {},
): Promise<BlueprintPage<CaseStudyBlueprint>> {
  "use cache";
  const caseStudies = await listBlueprintsByCategory("case_study");

  const matching = caseStudies
    .filter(
      (caseStudy) => filter.discipline === undefined || caseStudy.discipline === filter.discipline,
    )
    .toSorted(byNewestFirst);

  return toBlueprintPage(matching, filter.cursor, filter.limit ?? CASE_STUDIES_PAGE_LIMIT);
}

/**
 * The case studies a lesson points at, in the order it names them.
 *
 * IT RESOLVES SLUGS; IT DOES NOT RANK. `relatedLessonSlugs` is an authored list, so the author's
 * order is the answer and a "relevance" sort here would be this layer inventing an opinion the row
 * does not carry.
 *
 * ⚠️ IT GOES THROUGH `isReservedSlug` LIKE EVERY OTHER READ. That guard is in this module rather
 * than a route file precisely because each getter reaches the data independently — a fourth entry
 * point that skipped it would be the leak the comment above `isReservedSlug` warns about.
 *
 * AN UNRESOLVABLE SLUG IS DROPPED, not rendered as a dead row. It is the same call `resolveStartIndex`
 * makes for a cursor that no longer matches: a stale reference is an absence, and absence renders
 * nothing.
 */
export async function listRelatedCaseStudies(
  slugs: readonly string[],
): Promise<CaseStudyBlueprint[]> {
  "use cache";
  if (slugs.length === 0) return [];

  const caseStudies = await listBlueprintsByCategory("case_study");
  const caseStudiesBySlug = new Map(caseStudies.map((caseStudy) => [caseStudy.slug, caseStudy]));

  return slugs
    .filter((slug) => !isReservedSlug(slug))
    .map((slug) => caseStudiesBySlug.get(slug))
    .filter((caseStudy) => caseStudy !== undefined);
}

// --- Discussion ---------------------------------------------------------------

/**
 * One showcase's comment thread, whole.
 *
 * NOT PAGED, AND THAT IS DELIBERATE. The three list getters above are keyset-paged because their
 * indexes render `CursorPageControl`; a thread does not. Hacker News puts the entire discussion on
 * the page and so does this, which means no `?commentsCursor=` on a detail route that has no query
 * params today and no paging control that the fixtures — a handful of rows each — could exercise.
 * The comment above `TEARDOWNS_PAGE_LIMIT` argues against exactly that kind of unexercised code.
 * When real threads run to hundreds this takes the `filter`/`BlueprintPage` shape its neighbours
 * already have (`todo.md` §Blueprint discussion).
 *
 * THE ORDER IS THE WATCH THREAD'S: top-level newest first, replies oldest first
 * (`video-comment-thread.tsx`). A reader arriving from a video meets the convention they just left.
 * Replies read oldest-first because a reply chain is a conversation and a conversation is read
 * forwards; top-level rows read newest-first because the newest is the reason to come back.
 *
 * FLAT, NOT PRE-GROUPED. The renderer buckets replies under their parent in one pass — that is
 * assembling a layout, not filtering a list, and the flat ordered array is the shape a real
 * endpoint answers.
 */
export async function listShowcaseComments(showcaseSlug: string): Promise<BlueprintComment[]> {
  "use cache";
  const comments = (MOCK_SHOWCASE_COMMENTS[showcaseSlug] ?? []).map((candidate) =>
    BlueprintCommentSchema.parse(candidate),
  );

  const topLevel = comments
    .filter((comment) => comment.parentCommentId === null)
    .toSorted(
      (left, right) =>
        Date.parse(right.createdAt) - Date.parse(left.createdAt) ||
        left.commentId.localeCompare(right.commentId),
    );

  const repliesByParentId = new Map<string, BlueprintComment[]>();
  for (const comment of comments) {
    if (comment.parentCommentId === null) continue;
    const siblings = repliesByParentId.get(comment.parentCommentId) ?? [];
    siblings.push(comment);
    repliesByParentId.set(comment.parentCommentId, siblings);
  }

  // Interleaved parent-then-its-replies, so the renderer never re-derives the order — and a reply
  // whose parent is missing is DROPPED here rather than rendered at the top level, where it would
  // read as an answer to the wrong comment.
  return topLevel.flatMap((parent) => [
    parent,
    ...(repliesByParentId.get(parent.commentId) ?? []).toSorted(
      (left, right) =>
        Date.parse(left.createdAt) - Date.parse(right.createdAt) ||
        left.commentId.localeCompare(right.commentId),
    ),
  ]);
}

/**
 * Tag counts for one category's WHOLE set, not for the page being rendered.
 *
 * ITS OWN GETTER BECAUSE A FACET COUNT IS AN AGGREGATE, and an aggregate over a page is a
 * different, wrong number: counts that shrank as a reader clicked through pages would make
 * "cold-chain · 3" mean something new on every render. On the wire this arrives beside the list
 * from the backend, which is the other reason it is not derived in a component.
 */
export async function listBlueprintTagFacets(category: BlueprintCategory): Promise<FacetBucket[]> {
  "use cache";
  const countsByTag = new Map<string, number>();
  for (const blueprint of MOCK_BLUEPRINTS.map(parseBlueprint)) {
    if (blueprint.category !== category) continue;
    for (const tag of blueprint.tags) countsByTag.set(tag, (countsByTag.get(tag) ?? 0) + 1);
  }

  return [...countsByTag]
    .map(([value, count]) => ({ value, count }))
    .toSorted((left, right) => right.count - left.count || left.value.localeCompare(right.value));
}

/**
 * Every published slug, for `generateStaticParams`.
 *
 * NO `withSentinelValues` HERE, and that is deliberate rather than an oversight. The sentinel
 * exists because a failed backend read returns `[]` and `cacheComponents` throws
 * `EmptyGenerateStaticParamsError` on an empty list. A fixture array cannot be empty, so the
 * blogs precedent (`src/app/(information)/blogs/[slug]/page.tsx`) applies instead. Add the
 * sentinel at the same moment this starts reading a real endpoint, not before — and when you do,
 * FILTER FIRST AND WRAP SECOND. `withSentinelValues(filtered)` is right; filtering the wrapped
 * list can drop the sentinel itself, which is the exact throw the sentinel exists to prevent.
 */
export async function listBlueprintSlugs(): Promise<string[]> {
  "use cache";
  return MOCK_BLUEPRINTS.map((blueprint) => blueprint.slug).filter((slug) => !isReservedSlug(slug));
}

/** One category's slugs, for that category's nested `generateStaticParams`. */
export async function listBlueprintSlugsByCategory(category: BlueprintCategory): Promise<string[]> {
  "use cache";
  return MOCK_BLUEPRINTS.filter((blueprint) => blueprint.category === category)
    .map((blueprint) => blueprint.slug)
    .filter((slug) => !isReservedSlug(slug));
}

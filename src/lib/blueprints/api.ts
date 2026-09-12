// TRANSPORT: mock — ONE getter is left, and it is the last mock on this surface.
//
// ⚠️ WHAT THIS FILE USED TO BE. Every list, detail, slug-list, option-list and facet read for all
// three blueprint arms. They are gone, arm by arm, to `teardown-public.api.ts`,
// `showcase-public.api.ts` and `case-study-public.api.ts` — DELETED rather than kept as a fallback,
// because the `remote ?? MOCK` shape this header used to promise is the exact failure those files
// argue against: it makes "the backend is down" and "there is nothing here" the same page, which on
// a public surface means a visitor is shown invented builds under real headings with nothing to say
// so. `catalog.api.ts` is the model instead, and every page branches on `ActionResponse`.
//
// Deleted here, in order: `listTeardowns`, `listTeardownOptions`, `listBlueprintTagFacets` (the
// teardown round); then `listBlueprints`, `listCaseStudies`, `listCaseStudyOptions`,
// `listRelatedCaseStudies`, `getBlueprint`, `getBlueprintByCategory`, `listBlueprintSlugs`,
// `listBlueprintSlugsByCategory`, the three page-limit constants the getters used, and the whole
// fixture cursor implementation (`encodeBlueprintCursor`, `resolveStartIndex`, `toBlueprintPage`).
//
// ⚠️ `listRelatedCaseStudies` HAS NO REPLACEMENT HERE ON PURPOSE. Resolving an authored slug list is
// a VISIBILITY decision, so it belongs to the server: the detail read returns
// `{ caseStudy, relatedLessons }` with the invisible edges already dropped and the author's order
// kept. A separate call could have answered 200 while the detail 404'd.
//
// WHAT SURVIVES, and why: `getTeardownMarketSignal`, because the market signal has no table on
// either side and its store half would otherwise join REAL listings onto an invented product — see
// its own docblock. `SHOWCASE_PAGE_LIMIT`, because the showcase feed skeleton draws that many
// placeholder rows and a literal there could drift from the page it stands in for.

import {
  MOCK_BLUEPRINTS,
  MOCK_STORE_LISTING_SIGNALS_BY_CATEGORY_SLUG,
} from "@/mocks/blueprints-mocks";
import {
  type Blueprint,
  type BlueprintCategory,
  type BlueprintModerationState,
  type BlueprintOfCategory,
  BlueprintSchema,
  type ShowcaseBlueprint,
  type TeardownBlueprint,
  type TeardownStoreListingSignal,
  TeardownStoreListingSignalSchema,
} from "@/lib/blueprints/schemas";

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

/**
 * WHICH MODERATION STATES A LIST MAY CONTAIN.
 *
 * A LIST AND A DETAIL READ DISAGREE ON PURPOSE, and the difference is the whole moderation
 * feature. An index is a recommendation — putting a quarantined row in one is Qatoto suggesting a
 * teardown it has just withheld the files from — so a list carries `published` and `flagged` only.
 * A DETAIL READ IS A DIRECT REQUEST for one row, and a reader who followed a link that already
 * exists is owed the reason it changed rather than a 404 that reads as a broken bookmark.
 *
 * `flagged` IS IN BOTH. A report is an allegation nobody has ruled on; delisting on the strength of
 * one would turn the report control into a takedown control, which is the failure mode every
 * notice-and-takedown system is judged on.
 *
 * `draft` AND `pending_review` ARE IN NEITHER, and that is the "moderator approval before public
 * display" rule enforced in the one place every read passes through. `removed` is in neither
 * either: it answers 404, indistinguishable from a slug that never existed, on the store category
 * precedent (`src/lib/store/catalog.api.ts`) — a stranger must not be able to probe which rows were
 * taken down.
 */
const PUBLICLY_LISTABLE_MODERATION_STATES: readonly BlueprintModerationState[] = [
  "published",
  "flagged",
];

/**
 * Whether one blueprint may be handed to the public at all.
 *
 * ⚠️ THE `category` BYPASS IS GONE. It read "only the teardown arm carries `moderationState` today
 * … when they gain the field this switches to reading the shared shape and the `category` check
 * goes", and case studies have now gained it. The remaining bypass is the SHOWCASE arm's, which is
 * served entirely by `showcase-public.api.ts` and never reaches this function — this file's
 * showcase getters were deleted when that landed.
 */
function isBlueprintVisible(
  blueprint: Blueprint,
  allowedStates: readonly BlueprintModerationState[],
): boolean {
  if (blueprint.category === "showcase") return true;
  return allowedStates.includes(blueprint.moderationState);
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
 * surface, and an exported wrapper with no caller is unverified code. `listTeardownOptions` is the
 * one other reader, and it narrows what it hands out to a slug and a title.
 */
async function listBlueprintsByCategory<TCategory extends BlueprintCategory>(
  category: TCategory,
): Promise<BlueprintOfCategory<TCategory>[]> {
  "use cache";
  // The callback carries the predicate signature explicitly rather than leaning on TS 5.5's
  // inferred predicates — an inferred one through a delegating call is not something to bet the
  // arm fields of three list routes on.
  const matching = MOCK_BLUEPRINTS.map(parseBlueprint)
    .filter((blueprint) => isBlueprintVisible(blueprint, PUBLICLY_LISTABLE_MODERATION_STATES))
    .filter((blueprint): blueprint is BlueprintOfCategory<TCategory> =>
      isBlueprintOfCategory(blueprint, category),
    );
  return matching.toSorted(byNewestFirst);
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

/** 10 showcase fixtures → 2 pages (6 + 4), under either sort and with no tag applied. */
export const SHOWCASE_PAGE_LIMIT = 6;

// --- The three list reads -----------------------------------------------------
//
// FILTERING AND SORTING LIVE HERE, NOT IN THE PAGE COMPONENTS, and that is a change from how this
// surface first shipped. A page cannot page a list it has not finished filtering, and the shape
// below is the one a real endpoint answers — compare `listForumThreads({ board, cursor })` in
// `src/lib/store/forum.api.ts:46`. When the backend lands, these filters become query params and
// the predicates are deleted rather than moved into a component.

// --- Market signal ------------------------------------------------------------
//
// THE ONE QUESTION A TEARDOWN CANNOT ANSWER BY ITSELF: does anybody want the thing. The whole
// argument for building a known product rather than an invention is that the demand question is
// already settled — so a teardown that shows the reader nothing about demand has dropped the half
// of the pitch that made it worth reading.
//
// ⚠️ ONLY REAL ROWS COUNT, AND ATTENTION IS NOT DEMAND. `viewCount`, `likeCount` and `saveCount`
// are on the row and are deliberately NOT part of this: forty thousand people reading a teardown
// is forty thousand people reading a teardown. What counts is somebody having listed the product
// for sale, or somebody having shipped a build from these files.
//
// ⚠️ NO SIGNAL SUPPRESSES THE WHOLE BLOCK. There is no "no builds yet", no "no listings" and no
// empty card, and that is `docs/PRODUCT.md` Principle 2 applied at the section level rather than
// the field level. An empty state here would read as a verdict on the product — a founder does not
// need Qatoto's fixtures telling them nobody wants a thing.

export interface TeardownMarketSignal {
  /** Live listings of the same product class. The PRIMARY signal; commerce is the strongest one held. */
  readonly storeListings: readonly TeardownStoreListingSignal[];
  /** Builds published from this teardown. Secondary: evidence of feasibility as much as of demand. */
  readonly showcases: readonly ShowcaseBlueprint[];
}

/**
 * What the market-signal band renders, or `null` when there is nothing real to say.
 *
 * ⚠️ THE STORE HALF IS THE ONE MOCK IN THIS GETTER THAT IS NOT MOCK BY ACCIDENT. `searchStore` and
 * `getStoreCategory` (`src/lib/store/catalog.api.ts`) are live, wired reads against the Express
 * backend, and pointing this at them is a `.map` — `TeardownStoreListingSignalSchema` is a
 * field-for-field subset of `StoreSearchHitSchema` precisely so that it is. It stays mock for one
 * reason: every teardown on this surface is INVENTED, so the class its `storeProductClass` names is
 * invented too, and joining real listings onto a fabricated product would present real commerce as
 * evidence about something that does not exist. The swap happens when the teardowns are real, in
 * this file, and nothing above it changes (`todo.md` §Blueprint market signal).
 *
 * THE SHOWCASE HALF IS ALREADY REAL IN THE ONLY SENSE THAT MATTERS: it is a reverse lookup on
 * `builtFromBlueprintSlug`, a field the contract already carries, so it will keep working unchanged
 * against a backend.
 */
export async function getTeardownMarketSignal(
  teardown: TeardownBlueprint,
): Promise<TeardownMarketSignal | null> {
  "use cache";
  const storeListings =
    teardown.storeProductClass === null
      ? []
      : (
          MOCK_STORE_LISTING_SIGNALS_BY_CATEGORY_SLUG[teardown.storeProductClass.categorySlug] ?? []
        ).map((candidate) => TeardownStoreListingSignalSchema.parse(candidate));

  const showcases = (await listBlueprintsByCategory("showcase")).filter(
    (showcase) => showcase.builtFromBlueprintSlug === teardown.slug,
  );

  if (storeListings.length === 0 && showcases.length === 0) return null;
  return { storeListings, showcases };
}

/*
 * `listTeardowns`, `listTeardownOptions`, `TeardownOption`, `TEARDOWN_MEDIA_PREDICATES` and
 * `listBlueprintTagFacets` WERE DELETED HERE, not kept as a fallback.
 *
 * The teardown reads now come from `@/lib/blueprints/teardown-public.api`, which calls the backend
 * and returns `ActionResponse`. Keeping these beside it would recreate the exact failure that file's
 * header argues against: a caller reaching for the fixture version would turn "the backend is down"
 * back into "there is nothing here", showing a visitor invented teardowns under a real heading.
 *
 * `listBlueprintTagFacets` went with them because the facets now arrive IN the index payload — they
 * are counted over the same population the list filters, and a separate call could 200 while the
 * list failed. Its last caller was the teardown index, which no longer makes a second call.
 *
 * The case-study getters below stay: that arm has no tables yet.
 */

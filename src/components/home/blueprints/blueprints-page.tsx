// TRANSPORT: server-fetch — all three rails read the Express backend now, through
// `listPublicTeardowns`, `listPublicCaseStudies` and `listPublicShowcases`. See the note on the
// read below. Originally:
// TRANSPORT: mock — reads `listTeardowns`, `listCaseStudies` and `listShowcases` from
// `@/lib/blueprints/api`, which serve fixtures. The HERO does not: it is a real server-fetch of
// `GET /blueprints/hero-slides`, rendered by `BlueprintsHeroCarouselSection` below.
//
// THE HUB IS A LANDING PAGE, NOT THE WHOLE SURFACE. Each arm has its own route with its own
// design, and the lanes here are a teaser into them: a few of the newest plus a way through. The
// lanes stay because a hub that showed only three category links would show no actual build, which
// is the one thing a visitor came for.
//
// ⚠️ IT SHIPS NO CLIENT JAVASCRIPT OF ITS OWN NOW, and that fell out of the redesign rather than
// being chased. `BlueprintRail` was the last `"use client"` on this path — it needed `useRef` to
// scroll-page a horizontal track — and the track was the YouTube shape this redesign exists to
// remove. Deleting it made the whole hub, hero aside, a server component.
//
// THREE LANES, THREE SHAPES, AND THAT IS THE REDESIGN. The page used to render an icon row over
// three identical rails of identical cards, which `docs/Design.md` §6 bans by name twice over —
// see `blueprint-lane.tsx`, which carries the argument. A teardown previews as a picture, a case
// study as a sentence, a showcase as a dated row.
//
// ⚠️ THE LANES ARE READ THROUGH THE THREE TYPED GETTERS, NOT `listBlueprints` + a group-by. That is
// a correctness fix, not tidying: the old hub sorted everything by `createdAt`, so its showcase
// rail was in a DIFFERENT ORDER from the showcase feed it linked to, which sorts by `launchedAt`.
// One arm, two orders, and the hub's was the wrong one. Each getter also applies its own arm's
// ordering and paging rules, so the teaser is genuinely the top of the list it links to.

import { Suspense } from "react";

import CaseStudyLessonLink from "@/components/home/blueprints/cards/case-study-lesson-link";
import ShowcaseLaunchLink from "@/components/home/blueprints/cards/showcase-launch-link";
import TeardownGridCard, {
  EAGER_TEARDOWN_CARD_COUNT,
} from "@/components/home/blueprints/cards/teardown-grid-card";
import BlueprintLane from "@/components/home/blueprints/sections/blueprint-lane";
import BlueprintsHeroCarouselSection from "@/components/home/blueprints/sections/blueprints-hero-carousel-section";
import { listPublicCaseStudies } from "@/lib/blueprints/case-study-public.api";
import { listPublicShowcases } from "@/lib/blueprints/showcase-public.api";
import { listPublicTeardowns } from "@/lib/blueprints/teardown-public.api";
import type {
  CaseStudyBlueprint,
  ShowcaseBlueprint,
  TeardownBlueprint,
} from "@/lib/blueprints/schemas";

/**
 * TWO VARIANTS, NOT THREE. There is deliberately no `error` arm.
 *
 * The getters read an in-repo fixture array, so they cannot fail the way a network read can — and
 * an unreachable branch is worse than no branch: it never renders during development, so the first
 * time it did run would be the first time anyone saw it. The moment these getters read the backend,
 * `error` joins this union and the `switch` below stops compiling until it is handled, which is the
 * whole point of writing it as a union now.
 *
 * `src/lib/view-state.ts` makes the same argument in reverse about its missing `loading` variant.
 */
type BlueprintsViewState =
  | { status: "empty" }
  | {
      status: "ready";
      teardowns: readonly TeardownBlueprint[];
      caseStudies: readonly CaseStudyBlueprint[];
      showcases: readonly ShowcaseBlueprint[];
    };

/**
 * A TEASER, NOT THE ARM. Each lane shows the newest few and its heading carries the rest.
 *
 * THE THREE NUMBERS DIFFER BECAUSE THE THREE SHAPES DO. Four teardown cards are one grid row at
 * `xl` and two at `sm`; four lesson rows are four lines; five launch rows are the shortest feed
 * that still reads as a chronology rather than a pair. A single shared constant would have made
 * three lanes of visibly different heights for no reason a reader could see.
 */
const TEARDOWN_TEASER_LIMIT = 4;
const CASE_STUDY_TEASER_LIMIT = 4;
const SHOWCASE_TEASER_LIMIT = 5;

export default async function BlueprintsPage() {
  const [teardownResponse, caseStudyResponse, showcaseResponse] = await Promise.all([
    listPublicTeardowns({ limit: TEARDOWN_TEASER_LIMIT }),
    listPublicCaseStudies({ limit: CASE_STUDY_TEASER_LIMIT }),
    listPublicShowcases({ limit: SHOWCASE_TEASER_LIMIT }),
  ]);

  /*
   * ONE ARM FAILING DOES NOT TAKE THE HUB DOWN. All three rails read a backend now, and each is
   * guarded separately — the case-study one was the last that was not, so until this landed a
   * failing case-study read THREW the whole hub rather than dropping one lane. Dropping the page
   * because one read failed would hide arms that are perfectly renderable, so a failed read renders
   * as no rail: the same as having posted nothing yet, which on a TEASER rail is the same thing to
   * the reader. The arm's own index page tells the two apart, because there it matters — that is
   * where a visitor went to see everything, and there "we could not load this" and "there is
   * nothing" are different answers.
   */
  const teardowns = teardownResponse.success ? teardownResponse.data.items : [];
  const caseStudies = caseStudyResponse.success ? caseStudyResponse.data.items : [];
  const showcases = showcaseResponse.success ? showcaseResponse.data.items : [];

  const isEveryArmEmpty =
    teardowns.length === 0 && caseStudies.length === 0 && showcases.length === 0;

  const viewState: BlueprintsViewState = isEveryArmEmpty
    ? { status: "empty" }
    : { status: "ready", teardowns, caseStudies, showcases };

  return (
    <div className="pb-12">
      {/*
        THE MASTHEAD: THE HEADER LEFT, THE HERO RIGHT, FROM `lg` UP. The header still comes first in
        source and reading order — the hero used to sit above it, so the page opened with a rotating
        image and only then said what it was. What changed is the ground beside the hero: left-aligned
        under the header it was a 328px card with ~870px of empty page to its right at 1440, which read
        as an orphan rather than a feature. Beside the header, bottom-aligned to the description, the
        two close one band. Below `lg` they stack exactly as before.

        If the hero renders nothing (backend down, or every slide deactivated), the auto column
        collapses to zero and the header simply has the row to itself.
      */}
      <div className="grid gap-5 px-4 pt-6 pb-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-10 lg:px-6 lg:pt-8 lg:pb-10">
        <header className="min-w-0">
          <h1 className="text-2xl font-medium tracking-tight text-foreground lg:text-3xl">
            Blueprints
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground lg:text-base lg:leading-7">
            Engineering teardowns, working prototypes and what happened when they went to
            manufacture. Schematics, tolerances and bills of materials, published in the open.
          </p>
        </header>

        {/* The fallback matches the carousel's own frame exactly — `blueprints-hero-carousel.tsx`
            and `loading-skeleton.tsx`. It used to be full-width at every breakpoint against a hero
            that is 328px from `md` up, so the desktop layout jumped when the slides resolved. */}
        <Suspense
          fallback={
            <div className="h-44 w-full rounded-xl bg-muted md:aspect-video md:h-auto md:w-82" />
          }
        >
          <BlueprintsHeroCarouselSection />
        </Suspense>
      </div>

      <div className="space-y-12">{renderLanes(viewState)}</div>
    </div>
  );
}

/**
 * AN EMPTY ARM RENDERS NOTHING AT ALL — no heading, no "nothing here yet" box. Absence renders
 * nothing (PRODUCT.md Principle 2), and a lane whose only content is an apology is worse than a
 * page with two lanes.
 *
 * THE ORDER IS THE READER'S JOURNEY AND NOT `BLUEPRINT_CATEGORIES`. That tuple is
 * teardown / showcase / case_study, which is the order the pgEnum will carry. Here it is teardown,
 * then case study, then showcase: can I make this, what did somebody learn making it, what did
 * people just launch. Written out as three sections rather than mapped, because each arm's teaser
 * is a different element and a generic renderer over three shapes is a switch in disguise.
 */
function renderLanes(viewState: BlueprintsViewState) {
  switch (viewState.status) {
    case "empty":
      return (
        <p className="px-4 text-sm text-[#6F7979] lg:px-6">
          No blueprints have been published yet.
        </p>
      );
    case "ready": {
      const hasCaseStudies = viewState.caseStudies.length > 0;
      const hasShowcases = viewState.showcases.length > 0;

      return (
        <>
          {viewState.teardowns.length === 0 ? null : (
            <BlueprintLane category="teardown" seeAllLabel="See all teardowns">
              <div className="grid gap-x-4 gap-y-8 sm:grid-cols-2 xl:grid-cols-4">
                {viewState.teardowns.map((teardown, teardownIndex) => (
                  <TeardownGridCard
                    key={teardown.id}
                    teardown={teardown}
                    shouldLoadImageEagerly={teardownIndex < EAGER_TEARDOWN_CARD_COUNT}
                  />
                ))}
              </div>
            </BlueprintLane>
          )}

          {/*
            THE TWO TEXT LANES SHARE A ROW FROM `xl` UP. Both are lists of sentences, and stacked
            full-width at 1440 each line ran to ~1100px with the right two-thirds of every row empty.
            Side by side they read as one ledger in two columns, and the page loses a screen of
            scroll. Reading order is unchanged: case studies first, launches second.

            Only when BOTH have rows. One lane alone keeps the full width rather than leaving an empty
            half-column that reads as something failed to load (PRODUCT.md Principle 2).
          */}
          {hasCaseStudies || hasShowcases ? (
            <div
              className={`grid gap-y-12 ${hasCaseStudies && hasShowcases ? "xl:grid-cols-2" : ""}`}
            >
              {hasCaseStudies ? (
                <BlueprintLane category="case_study" seeAllLabel="See all case studies">
                  {/* The list owns the hairlines between rows and the lane owns the rule above
                      them, so no row carries a border of its own. `divide-border` rather than
                      `black/5`, which is invisible on the dark ground. */}
                  <ul className="divide-y divide-border">
                    {viewState.caseStudies.map((caseStudy) => (
                      <li key={caseStudy.id}>
                        <CaseStudyLessonLink caseStudy={caseStudy} />
                      </li>
                    ))}
                  </ul>
                </BlueprintLane>
              ) : null}

              {hasShowcases ? (
                <BlueprintLane category="showcase" seeAllLabel="See all launches">
                  {/* No dividers between launch rows — the gap is the separator, which is the
                      feed's own construction (`showcase-feed-page.tsx`), and it is also what keeps
                      this column visibly a different shape from the ruled lessons beside it. */}
                  <ul className="space-y-1">
                    {viewState.showcases.map((showcase) => (
                      <li key={showcase.id}>
                        <ShowcaseLaunchLink showcase={showcase} />
                      </li>
                    ))}
                  </ul>
                </BlueprintLane>
              ) : null}
            </div>
          ) : null}
        </>
      );
    }
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}

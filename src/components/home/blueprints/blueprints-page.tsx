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
import ShowcaseFeedRow from "@/components/home/blueprints/cards/showcase-feed-row";
import TeardownGridCard from "@/components/home/blueprints/cards/teardown-grid-card";
import BlueprintLane from "@/components/home/blueprints/sections/blueprint-lane";
import BlueprintsHeroCarouselSection from "@/components/home/blueprints/sections/blueprints-hero-carousel-section";
import { listCaseStudies, listShowcases, listTeardowns } from "@/lib/blueprints/api";
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
  const [teardownPage, caseStudyPage, showcasePage] = await Promise.all([
    listTeardowns({ limit: TEARDOWN_TEASER_LIMIT }),
    listCaseStudies({ limit: CASE_STUDY_TEASER_LIMIT }),
    listShowcases({ limit: SHOWCASE_TEASER_LIMIT }),
  ]);

  const isEveryArmEmpty =
    teardownPage.items.length === 0 &&
    caseStudyPage.items.length === 0 &&
    showcasePage.items.length === 0;

  const viewState: BlueprintsViewState = isEveryArmEmpty
    ? { status: "empty" }
    : {
        status: "ready",
        teardowns: teardownPage.items,
        caseStudies: caseStudyPage.items,
        showcases: showcasePage.items,
      };

  return (
    <div className="pb-10">
      {/* THE HEADER COMES FIRST. The hero used to sit above it, so the page opened with a rotating
          image and only then said what it was. It is also the one real read on this surface, which
          is an argument for keeping it and not for leading with it. */}
      <header className="px-4 pt-4 lg:px-6">
        <h1 className="text-xl font-medium text-foreground lg:text-2xl">Blueprints</h1>
        <p className="mt-1 max-w-2xl text-sm text-[#6F7979]">
          Engineering teardowns, working prototypes and what happened when they went to manufacture.
          Schematics, tolerances and bills of materials, published in the open.
        </p>
      </header>

      {/* The fallback matches the carousel's own frame exactly — `blueprints-hero-carousel.tsx:121`
          and `loading-skeleton.tsx`. It used to be full-width at every breakpoint against a hero
          that is 328px from `md` up, so the desktop layout jumped when the slides resolved. */}
      <Suspense
        fallback={
          <div className="flex px-4 pt-3 pb-2 lg:px-6">
            <div className="h-44 w-full rounded-xl bg-muted md:aspect-video md:h-auto md:w-82" />
          </div>
        }
      >
        <BlueprintsHeroCarouselSection />
      </Suspense>

      <div className="mt-4 space-y-8">{renderLanes(viewState)}</div>
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
    case "ready":
      return (
        <>
          {viewState.teardowns.length === 0 ? null : (
            <BlueprintLane category="teardown" seeAllLabel="See all teardowns">
              <div className="grid gap-x-4 gap-y-6 px-4 sm:grid-cols-2 lg:px-6 xl:grid-cols-4">
                {viewState.teardowns.map((teardown) => (
                  <TeardownGridCard key={teardown.id} teardown={teardown} />
                ))}
              </div>
            </BlueprintLane>
          )}

          {viewState.caseStudies.length === 0 ? null : (
            <BlueprintLane category="case_study" seeAllLabel="See all case studies">
              {/* The rows carry their own `border-t`, so the list closes with one `border-b` —
                  the same construction the index uses, for the same reason. */}
              <div className="border-b border-black/5">
                {viewState.caseStudies.map((caseStudy) => (
                  <CaseStudyLessonLink key={caseStudy.id} caseStudy={caseStudy} />
                ))}
              </div>
            </BlueprintLane>
          )}

          {viewState.showcases.length === 0 ? null : (
            <BlueprintLane category="showcase" seeAllLabel="See all launches">
              {/* No dividers between launch rows — the gap is the separator, which is the feed's
                  own construction (`showcase-feed-page.tsx`) and not a hub decision. */}
              <ul className="space-y-6 px-4 lg:px-6">
                {viewState.showcases.map((showcase) => (
                  <li key={showcase.id}>
                    <ShowcaseFeedRow showcase={showcase} />
                  </li>
                ))}
              </ul>
            </BlueprintLane>
          )}
        </>
      );
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}

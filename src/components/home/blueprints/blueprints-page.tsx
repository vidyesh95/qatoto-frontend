// TRANSPORT: mock — reads `@/lib/blueprints/api`, which serves fixtures. The HERO does not:
// it is a real server-fetch of `GET /blueprints/hero-slides`, rendered by
// `BlueprintsHeroCarouselSection` below.
//
// THIS IS A SERVER COMPONENT, and that is the one structural improvement over the /anime page it
// replaces. That page was `"use client"` because its rails imported mock arrays directly, which
// meant it could not import the async hero section and had to take it as a pre-rendered
// `heroSlot` prop. Here the data arrives from `"use cache"` getters on the server, so the hero
// composes as an ordinary child and only the rails — which need `useRef` for scrolling — ship
// any client JavaScript.
//
// THE HUB IS A LANDING PAGE, NOT THE WHOLE SURFACE. Each category now has its own route with its
// own design, and the rails here are a teaser into them: a strip of the newest few plus a way
// through. The rails stay because a hub that showed only three category tiles would show no
// actual build, which is the one thing a visitor came for.

import { Suspense } from "react";

import BlueprintRail from "@/components/home/blueprints/rails/blueprint-rail";
import BlueprintsHeroCarouselSection from "@/components/home/blueprints/sections/blueprints-hero-carousel-section";
import CategoryLinks, {
  type CategoryLink,
} from "@/components/home/blueprints/sections/category-links";
import { listBlueprints } from "@/lib/blueprints/api";
import {
  BLUEPRINT_CATEGORIES,
  BLUEPRINT_CATEGORY_BLURBS,
  BLUEPRINT_CATEGORY_LABELS,
  type Blueprint,
  type BlueprintCategory,
  buildBlueprintCategoryHref,
} from "@/lib/blueprints/schemas";

/**
 * TWO VARIANTS, NOT THREE. There is deliberately no `error` arm.
 *
 * `listBlueprints` reads an in-repo fixture array, so it cannot fail the way a network read can —
 * and an unreachable branch is worse than no branch: it never renders during development, so the
 * first time it did run would be the first time anyone saw it. The moment this getter reads the
 * backend, `error` joins this union and the `switch` below stops compiling until it is handled,
 * which is the whole point of writing it as a union now.
 *
 * `src/lib/view-state.ts` makes the same argument in reverse about its missing `loading` variant.
 */
type BlueprintsViewState =
  | { status: "empty" }
  | { status: "ready"; blueprintsByCategory: Map<BlueprintCategory, Blueprint[]> };

/**
 * A TEASER, NOT THE CATEGORY. The rail shows the newest few and the "See all" carries the rest —
 * a rail that scrolled through all twelve teardowns would be the index, rendered worse.
 */
const RAIL_TEASER_LIMIT = 8;

const CATEGORY_ICONS: Record<BlueprintCategory, string> = {
  teardown: "/icons/architecture_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  showcase: "/icons/science_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  case_study: "/icons/factory_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
};

const CATEGORY_LINKS: readonly CategoryLink[] = BLUEPRINT_CATEGORIES.map((category) => ({
  icon: CATEGORY_ICONS[category],
  label: BLUEPRINT_CATEGORY_LABELS[category],
  href: buildBlueprintCategoryHref(category),
}));

function groupByCategory(blueprints: Blueprint[]): Map<BlueprintCategory, Blueprint[]> {
  const grouped = new Map<BlueprintCategory, Blueprint[]>();
  for (const category of BLUEPRINT_CATEGORIES) {
    const matching = blueprints.filter((blueprint) => blueprint.category === category);
    if (matching.length > 0) grouped.set(category, matching.slice(0, RAIL_TEASER_LIMIT));
  }
  return grouped;
}

export default async function BlueprintsPage() {
  const blueprints = await listBlueprints();

  const viewState: BlueprintsViewState =
    blueprints.length === 0
      ? { status: "empty" }
      : { status: "ready", blueprintsByCategory: groupByCategory(blueprints) };

  return (
    <div className="pb-10">
      <Suspense fallback={<div className="mx-4 aspect-video rounded bg-muted lg:mx-6" />}>
        <BlueprintsHeroCarouselSection />
      </Suspense>

      <header className="px-4 pt-4 lg:px-6">
        <h1 className="text-xl font-medium text-foreground lg:text-2xl">Blueprints</h1>
        <p className="mt-1 max-w-2xl text-sm text-[#6F7979]">
          Engineering teardowns, working prototypes and what happened when they went to manufacture.
          Schematics, tolerances and bills of materials, published in the open.
        </p>
      </header>

      <div className="mt-3">
        <CategoryLinks categories={CATEGORY_LINKS} />
      </div>

      <div className="mt-4 space-y-8">{renderRails(viewState)}</div>
    </div>
  );
}

function renderRails(viewState: BlueprintsViewState) {
  switch (viewState.status) {
    case "empty":
      return (
        <p className="px-4 text-sm text-[#6F7979] lg:px-6">
          No blueprints have been published yet.
        </p>
      );
    case "ready":
      return [...viewState.blueprintsByCategory].map(([category, blueprints]) => (
        <BlueprintRail
          key={category}
          title={BLUEPRINT_CATEGORY_LABELS[category]}
          blurb={BLUEPRINT_CATEGORY_BLURBS[category]}
          blueprints={blueprints}
          seeAllHref={buildBlueprintCategoryHref(category)}
        />
      ));
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}

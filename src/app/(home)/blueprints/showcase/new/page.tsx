import { Suspense } from "react";
import type { Metadata } from "next";

import ShowcaseLaunchPage from "@/components/home/blueprints/showcase/authoring/showcase-launch-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  // `noindex`, like every route on this surface while the fixtures are invented, and like the
  // teardown form beside it: a posting form has nothing for a crawler.
  robots: { index: false, follow: false },
  title: "Post a launch · Blueprints",
  description:
    "Post a working prototype or a finished build: what it is, what it proved, and who built it.",
  alternates: { canonical: "/blueprints/showcase/new" },
};

export default function NewShowcaseLaunchRoute() {
  return (
    <div className="px-4 pt-5 pb-12 lg:px-6">
      {/* REQUIRED BY `?draftId=`, not optional tidiness. The composer reads `useSearchParams()` to
          resume a saved draft, and under Cache Components a component that does so must sit under a
          Suspense boundary or the build refuses the route. */}
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading the form…</p>}>
        <ShowcaseLaunchPage />
      </Suspense>
    </div>
  );
}

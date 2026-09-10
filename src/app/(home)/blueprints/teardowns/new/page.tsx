import type { Metadata } from "next";

import TeardownWizard from "@/components/home/blueprints/teardowns/authoring/teardown-wizard";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  // `noindex`, like every other route on this surface while the fixtures are invented — and with
  // more reason here: an authoring form has nothing for a crawler and every reason not to be one of
  // the first results for "publish a teardown".
  robots: { index: false, follow: false },
  title: "Publish a teardown · Blueprints",
  description:
    "Publish your own survey of a unit you obtained lawfully: what it is, how you looked inside, and what it is made of.",
  alternates: { canonical: "/blueprints/teardowns/new" },
};

export default function NewTeardownRoute() {
  return (
    <div className="px-4 pt-5 pb-12 lg:px-6">
      <TeardownWizard />
    </div>
  );
}

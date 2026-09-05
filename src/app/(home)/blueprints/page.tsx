import type { Metadata } from "next";

import BlueprintsPage from "@/components/home/blueprints/blueprints-page";

export const metadata: Metadata = {
  title: "Blueprints",
  description:
    "Engineering teardowns, working prototypes and manufacturing case studies — schematics, tolerances and bills of materials, published in the open.",
  alternates: { canonical: "/blueprints" },
};

export default function BlueprintsRoute() {
  return <BlueprintsPage />;
}

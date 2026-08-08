import type { Metadata } from "next";
import SeriesPage from "@/components/studio/series/series-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Series",
  description: "Series page for Qatoto Creator Studio",
};

export default function StudioSeries() {
  return <SeriesPage />;
}

import type { Metadata } from "next";
import SeriesPage from "@/components/studio/series/series-page";

export const metadata: Metadata = {
  title: "Series",
  description: "Series page for Qatoto Creator Studio",
};

export default function StudioSeries() {
  return <SeriesPage />;
}

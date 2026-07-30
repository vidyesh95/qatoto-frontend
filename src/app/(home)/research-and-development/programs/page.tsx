import type { Metadata } from "next";

import ResearchProgramsIndexPage from "@/components/home/research-and-development/research-programs-index-page";

export const metadata: Metadata = {
  title: "Research programmes · R&D",
  description:
    "Open, long-horizon research programmes on Qatoto — propose a branch, publish a paper, log your effort",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { q } = await searchParams;
  // A repeated `?q=` gives an array; take the first rather than passing one through to a
  // `.strict()` query schema that would 422.
  const searchText = Array.isArray(q) ? q[0] : q;
  return <ResearchProgramsIndexPage searchText={searchText} />;
}

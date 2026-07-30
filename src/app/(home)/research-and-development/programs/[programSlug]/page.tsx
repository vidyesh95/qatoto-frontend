import type { Metadata } from "next";

import ResearchProgramPage from "@/components/home/research-and-development/research-program-page";
import { getResearchProgram, listResearchProgramSlugs } from "@/lib/rnd/research-programs.api";
import { withSentinelValues } from "@/lib/rnd/static-params";

/**
 * Prerender every published slug — a dynamic route needs this under `cacheComponents`.
 *
 * `withSentinelValues` because an EMPTY array throws `EmptyGenerateStaticParamsError`, and a
 * database with no published program yet is an ordinary state rather than a build failure. A
 * failed read returns `[]` for the same reason: an unreachable backend must not fail the build,
 * and those params then render on demand.
 */
export async function generateStaticParams() {
  const slugsResult = await listResearchProgramSlugs();
  return withSentinelValues(slugsResult.success ? slugsResult.data : []).map((programSlug) => ({
    programSlug,
  }));
}

/** No session forwarded — metadata is shared by every visitor, including strangers. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ programSlug: string }>;
}): Promise<Metadata> {
  const { programSlug } = await params;
  const programResult = await getResearchProgram(programSlug);
  if (!programResult.success) return { title: "Research programme · R&D" };
  return {
    title: `${programResult.data.title} · R&D`,
    description: programResult.data.tagline,
  };
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ programSlug: string }>;
  searchParams: Promise<{ role?: string | string[] }>;
}) {
  const [{ programSlug }, { role }] = await Promise.all([params, searchParams]);
  // A repeated `?role=` gives an array; take the first, and let the page validate it against the
  // enum. Passing an array through would fail the roster read for a malformed URL.
  const roleFilter = Array.isArray(role) ? role[0] : role;
  return <ResearchProgramPage programSlug={programSlug} roleFilter={roleFilter} />;
}

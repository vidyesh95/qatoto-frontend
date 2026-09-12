// TRANSPORT: server-fetch — every read here is public and is awaited by a server component.
// `RequestOptions` is threaded anyway so a client island can call one later without the signature
// changing.
//
// WIRED. These four reads call the Express backend. With them, `@/lib/blueprints/api` no longer
// serves any arm's list or detail — only the teardown market signal, which has no table yet.
//
// `@/lib/blueprints/api` IS NOT A MODEL FOR THIS FILE, and neither is `@/lib/cms`. Those getters
// return a bare value and fall back to fixtures when a fetch fails, which makes "the backend is
// down" and "there is nothing here" the same answer — on a public page that means a visitor is
// shown invented lessons under real headings, with nothing to say so. Everything here returns
// `ActionResponse` and the pages branch on it, the way `@/lib/store/catalog.api` does.
//
// ⚠️ THE WITHHELD COMPANY NAME NEVER ARRIVES HERE, AND THAT IS THE SERVER'S DOING. A first-hand
// writer may keep a company's name from readers; the backend's one serializer writes `null` in its
// place on every public read, which is why `CaseStudyEvidenceCompanySchema.name` is nullable. No
// component may try to recover it, and the moderator read that does carry it lives in
// `case-study-moderation.api.ts` — which no component under `components/home` or `components/studio`
// may import.
//
// NO `"use cache"`. `getJson` sends `credentials: "include"`, and a cache boundary over a
// cookie-bearing fetch is a cache-key question these reads do not need to answer.

import {
  CaseStudyDetailSchema,
  CaseStudyIndexPageSchema,
  CaseStudyOptionListSchema,
  CaseStudySlugListSchema,
  type BlueprintDiscipline,
  type CaseStudyDetail,
  type CaseStudyIndexPage,
  type CaseStudyOption,
} from "@/lib/blueprints/schemas";
import { buildQueryString, getJson, type ActionResponse, type RequestOptions } from "@/lib/http";

export interface ListPublicCaseStudiesFilter {
  readonly discipline?: BlueprintDiscipline;
  readonly cursor?: string;
  readonly limit?: number;
}

/**
 * One page of visible case studies, newest first.
 *
 * ONE TYPED FILTER AND NO SORT, which is the whole surface this index offers. The server drops an
 * unknown `?sort=` rather than honouring an order the reader was never shown.
 *
 * Paging means echoing `page.nextCursor` back as `?cursor=`. The token is opaque: the server minted
 * it and answers 422 for anything it did not mint, rather than silently restarting the list.
 */
export function listPublicCaseStudies(
  filter: ListPublicCaseStudiesFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<CaseStudyIndexPage>> {
  const path = `/blueprints/case-studies${buildQueryString({ ...filter })}`;
  return getJson(path, CaseStudyIndexPageSchema, options);
}

/**
 * One case study by its address, with its related lessons already resolved.
 *
 * ⚠️ THE RELATED LESSONS COME BACK RESOLVED, IN THE AUTHOR'S ORDER, AND ALREADY FILTERED. An edge
 * whose target is not visible is dropped by the server rather than rendered as a dead row, and
 * nothing here ranks them — the authored list is the answer. `listRelatedCaseStudies` is gone
 * because that resolution is a visibility decision, and a second call could 200 while this one
 * 404s.
 *
 * A case study awaiting review or sent back is a **404**, identical to a slug that never existed.
 * The two are indistinguishable on purpose, so a stranger cannot probe what is in the queue.
 */
export function getPublicCaseStudy(
  slug: string,
  options?: RequestOptions,
): Promise<ActionResponse<CaseStudyDetail>> {
  return getJson(
    `/blueprints/case-studies/${encodeURIComponent(slug)}`,
    CaseStudyDetailSchema,
    options,
  );
}

/** Every visible slug, for `generateStaticParams`. Unpaged: one short string per case study. */
export function listPublicCaseStudySlugs(
  options?: RequestOptions,
): Promise<ActionResponse<string[]>> {
  return getJson("/blueprints/case-studies/slugs", CaseStudySlugListSchema, options);
}

/**
 * Slug and title for every visible case study, sorted by title, for the composer's select.
 *
 * A lesson a moderator has withheld from every index must not come back through a new case study's
 * links, which is why this reads the gate rather than listing everything.
 */
export function listCaseStudyOptions(
  options?: RequestOptions,
): Promise<ActionResponse<CaseStudyOption[]>> {
  return getJson("/blueprints/case-studies/options", CaseStudyOptionListSchema, options);
}

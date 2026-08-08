// TRANSPORT: server-fetch — the two reads are public and awaited by server components. The write
// below is NOT: it is session-scoped and called from a `"use client"` composer.
//
// MOCK-BACKED: every call resolves a fixture. No `/store/factories` endpoint exists yet —
// `STORE_BACKEND_STRUCTURE.md` A25 records the gap. To wire one, swap `resolveMockRead` for
// `getJson` (or the write for `sendJson`) and drop the fixture argument for `options`. Same argument
// order, same return type: nothing above this layer changes, because nothing above it ever knew.

import {
  buildQueryString,
  getJson,
  sendJson,
  type ActionResponse,
  type RequestOptions,
} from "@/lib/http";
import {
  CreatedFactoryInquirySchema,
  FactoryDetailSchema,
  FactoryDirectoryPageSchema,
  type CreatedFactoryInquiry,
  type CreateFactoryInquiryInput,
  type FactoryDetail,
  type FactoryDirectoryPage,
  type ListFactoriesFilter,
} from "@/lib/store/factories.schemas";
import { resolveMockDetail, resolveMockRead } from "@/lib/store/mock-transport";
import {
  MOCK_CREATED_FACTORY_INQUIRY,
  MOCK_FACTORY_DETAILS_BY_SLUG,
  MOCK_FACTORY_DIRECTORY_PAGE,
} from "@/mocks/store/factories-mocks";

/**
 * The manufacturer directory — `GET /store/factories`.
 *
 * THE PATH IS BUILT FROM THE REAL FILTER even though nothing is called. That is the point of
 * `resolveMockRead` taking a path: `buildQueryString` runs, the camelCase keys and snake_case enum
 * values are exercised, and a `?capabilityKind=contract-manufacturing` typo shows up in the dev log
 * today instead of as a 422 the week the endpoint lands.
 */
export function listStoreFactories(
  filter: ListFactoriesFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<FactoryDirectoryPage>> {
  const path = `/store/factories${buildQueryString({ ...filter })}`;
  return resolveMockRead(path, FactoryDirectoryPageSchema, options, MOCK_FACTORY_DIRECTORY_PAGE);
  // return getJson(path, FactoryDirectoryPageSchema, options);
}

/**
 * One factory — `GET /store/factories/:factorySlug`.
 *
 * A slug with no fixture answers 404, which is what the detail page turns into `notFound()`. The
 * backend will answer 404 for "no such factory" AND for "not visible to you" with one code, so a
 * renderer must never turn one into a permission hint.
 */
export function getStoreFactory(
  factorySlug: string,
  options?: RequestOptions,
): Promise<ActionResponse<FactoryDetail>> {
  const path = `/store/factories/${factorySlug}`;
  return resolveMockDetail(
    path,
    FactoryDetailSchema,
    options,
    MOCK_FACTORY_DETAILS_BY_SLUG,
    factorySlug,
  );
  // return getJson(path, FactoryDetailSchema, options);
}

// --- Writes ------------------------------------------------------------------

/**
 * `POST /commerce/factories/:factorySlug/inquiries` — creates a DRAFT inquiry.
 *
 * IT DOES NOT SEND AND IT NOTIFIES NOBODY. The row comes back `state: "draft"`, visible to nobody
 * outside the buyer's organization; sending is a separate call behind its own validation. Every word
 * on the success screen must say draft, and none may say sent — the same discipline `rfq-composer`
 * spells out for `POST /commerce/rfqs`.
 *
 * Requires an `Idempotency-Key`, minted once per attempt in component state. A fresh key on a retry
 * is a second inquiry sitting in the factory's queue for somebody to close by hand.
 */
export function createFactoryInquiry(
  factorySlug: string,
  input: CreateFactoryInquiryInput,
  options?: RequestOptions,
): Promise<ActionResponse<CreatedFactoryInquiry>> {
  const path = `/commerce/factories/${factorySlug}/inquiries`;
  void input;
  // A FIXED row rather than an echo of the input — see the fixture's own comment. An echoed
  // reference could name an inquiry that does not resolve, and the first click would 404.
  return resolveMockRead(path, CreatedFactoryInquirySchema, options, MOCK_CREATED_FACTORY_INQUIRY);
  // return sendJson(path, "POST", input, CreatedFactoryInquirySchema, options);
}

// Imported for the wiring lines above; referenced so they survive while every call is mock-backed.
void getJson;
void sendJson;

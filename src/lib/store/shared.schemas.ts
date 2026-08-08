// TRANSPORT: props-only — schemas shared across the store domain, no network of their own.
//
// The pieces that appear in more than one store contract. Anything used by fewer than
// three domains stays in its own `*.schemas.ts` next to the label map that keys it —
// `organizations.schemas.ts` is the precedent and it is the right one.
//
// Authority for every enum tuple here is `src/db/schema.ts` in the backend repo. These
// are `pgEnum` labels sent verbatim in both directions: DATA, not identifiers. Do not
// "correct" one to kebab-case (CLAUDE.md wire-casing rule) — `z.enum` would reject the
// real value and the page would render its error branch against a healthy backend.

import { z } from "zod";

/**
 * A keyset page footer. Every public store list carries exactly this pair.
 *
 * `nextCursor` is an OPAQUE server token. Echo it back verbatim as `?cursor=`; never
 * construct, parse, compare or increment one. The backend encodes a sort key and a
 * tie-break id into it and answers `422` for anything it did not mint.
 */
export const CursorPageSchema = z
  .object({
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  })
  .strip();

export type CursorPage = z.infer<typeof CursorPageSchema>;

/**
 * A timestamp as it actually arrives: an ISO string.
 *
 * DELIBERATELY NOT `z.coerce.date()`. The backend's own projections are inconsistent
 * about this — `commerce-rfqs.service.ts` types `createdAt: string` while orders, cart
 * and fulfillment type it `Date` — and every one of them is a string by the time
 * `JSON.stringify` has run. Coercing at the boundary would hide that inconsistency
 * behind a `Date` whose timezone handling then differs from the string-splitting the
 * storefront's certification dates already do on purpose. Format at render instead.
 */
export const IsoDateTimeSchema = z.string();

/**
 * A calendar date with no time component, `YYYY-MM-DD`.
 *
 * Kept apart from `IsoDateTimeSchema` because the two are read differently: a date-only
 * value must be compared by string parts, never through `new Date()`, which would shift
 * it a day for anyone west of UTC. `certification-validity-pill.tsx` already does this.
 */
export const IsoDateSchema = z.string();

/**
 * The nine seeded connector kinds.
 *
 * One organization may hold several of them — verification is recorded PER KIND, so a
 * verified freight forwarder is not thereby an approved customs broker. Never render a
 * generic verified tick from one kind's approval.
 */
export const PROVIDER_KINDS = [
  "freight_forwarder",
  "logistics_operator",
  "customs_broker",
  "insurance_provider",
  "inspection_agency",
  "testing_certification_lab",
  "marketing_agency",
  "warehouse_provider",
  "foreign_exchange_facilitator",
] as const;

export type ProviderKind = (typeof PROVIDER_KINDS)[number];

/** Transport modes on a freight offering and on a shipment leg. */
export const FREIGHT_TRANSPORT_MODES = ["air", "sea", "land", "rail", "multimodal"] as const;

export type FreightTransportMode = (typeof FREIGHT_TRANSPORT_MODES)[number];

/**
 * What a merchandising placement points at.
 *
 * All four arms resolve now. Two of them — `category` and `organization` — used to be
 * dropped silently by the backend's resolver, so a staff member could place one and see
 * nothing rendered with no error anywhere. An exhaustive switch over this union is what
 * keeps that from recurring on the client.
 */
export const MERCHANDISING_ENTITY_KINDS = [
  "product",
  "category",
  "organization",
  "provider_offering",
] as const;

export type MerchandisingEntityKind = (typeof MERCHANDISING_ENTITY_KINDS)[number];

/**
 * How a rail chooses what it shows.
 *
 * `trending_placeholder` returns an EMPTY LIST unconditionally and is kept forever on
 * purpose: while it exists, backing the ranking engine out is a per-rail data edit
 * rather than a deploy. A rail carrying it is not broken — render nothing, not an error.
 */
export const RAIL_STRATEGIES = [
  "curated",
  "newest",
  "trending_placeholder",
  "trending",
  "recommended",
] as const;

export type RailStrategy = (typeof RAIL_STRATEGIES)[number];

/**
 * A presentation token, never a class name.
 *
 * The API is forbidden from returning Tailwind classes; it returns a semantic accent and
 * the client maps it. `src/types/store.ts`'s `hoverBg: "group-hover:bg-yellow-100"` is
 * the anti-pattern being retired — a class string on the wire couples the backend to one
 * client's stylesheet and cannot be themed, localized, or rendered by a native app.
 *
 * Parsed as a plain string rather than an enum: the backend column is free text, and a
 * `z.enum` here would fail the whole page for an accent nobody has styled yet. The label
 * map in `labels.ts` falls back instead.
 */
export const AccentTokenSchema = z.string();

/**
 * An amount of money. ALWAYS integer cents, ALWAYS beside its own currency.
 *
 * There is no store-wide currency: a kit sourced from three countries has three totals
 * and no single number. Never add two amounts whose currencies differ — that invents an
 * FX rate, and the backend refuses to do it for exactly that reason.
 */
export const MoneySchema = z
  .object({
    amountInCents: z.number().int(),
    currency: z.string(),
  })
  .strip();

export type Money = z.infer<typeof MoneySchema>;

/**
 * Wraps a row schema into the `{ items, page }` envelope the public store reads use.
 *
 * A helper rather than a hand-written pair per domain, because the ONE thing that must
 * never drift is the page footer — a domain that spells it `{ cursor, more }` would make
 * `CursorPageControl` un-shareable.
 */
export function cursorPageOf<TRow extends z.ZodTypeAny>(rowSchema: TRow) {
  return z
    .object({
      items: z.array(rowSchema),
      page: CursorPageSchema,
    })
    .strip();
}

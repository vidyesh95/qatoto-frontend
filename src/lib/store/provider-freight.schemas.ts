import { z } from "zod";

import {
  AdminFreightRateCardSchema,
  FreightRateCardStateSchema,
  type AdminFreightRateCard,
  type FreightRateBreakInput,
  type FreightRateCardState,
} from "@/lib/store/admin-freight.schemas";
import { type FreightMode } from "@/lib/store/freight.schemas";
import { cursorPageOf } from "@/lib/store/shared.schemas";

/**
 * §19.12 — the lanes an APPROVED FREIGHT PROVIDER authors for itself.
 *
 * THE ROW SHAPES ARE THE STAFF ONES, IMPORTED RATHER THAN REDECLARED. Both surfaces answer with
 * the SAME server projection — §19.10 settled that there is one vocabulary in both directions of
 * the exchange, `bandsEditable` included — so a provider-flavoured copy of the row would be a
 * second spelling of one concept to keep in sync forever.
 *
 * THE INPUTS ARE WHERE THE TWO SURFACES GENUINELY DIVERGE, and every difference is a refusal:
 *
 *   - `providerOrganizationId` IS ABSENT. The server derives it from the session, and its schema
 *     is `.strict()`, so sending one is a 422 on the WHOLE submission rather than an ignored key.
 *     A staff operator authors on behalf of any provider; a forwarder may only ever author its own.
 *   - `sourceForwarderName` IS ABSENT for the same reason. It is the provenance §19.6 puts on the
 *     wire beside the price, and the server writes the caller's own organization display name —
 *     so a free-text one would let a forwarder publish under a carrier's or a rival's name.
 *   - `validFrom` IS REQUIRED. It is required on the staff client too, but only by convention
 *     there; here the server refuses a past or absent value outright (§19.11 step 1), because a
 *     card in force the instant it exists can never have its bands edited and no PATCH can correct
 *     it.
 *
 * ⚠️ BOTH ABSENT FIELDS ARRIVE BACK UNDER `errors.form`, NOT UNDER A FIELD KEY, because a
 * `.strict()` rejection is an object-level parse issue. `renderFieldErrors` is what makes that
 * readable; a composer that walked only named fields would report a bare 422.
 */

// --- Rows (the shared projection) ----------------------------------------------

export const ProviderFreightRateCardPageSchema = cursorPageOf(AdminFreightRateCardSchema);
export type ProviderFreightRateCardPage = z.infer<typeof ProviderFreightRateCardPageSchema>;

/**
 * The create response. `supersededRateCardId` is the ONLY report that this create closed a live
 * card of the author's own on the same lane — no later read announces it, so a composer that drops
 * it loses the fact permanently.
 */
export const CreateProviderFreightRateCardResultSchema = z.object({
  rateCard: AdminFreightRateCardSchema,
  supersededRateCardId: z.string().nullable(),
});
export type CreateProviderFreightRateCardResult = z.infer<
  typeof CreateProviderFreightRateCardResultSchema
>;

/** The four non-create writes answer the same one-key envelope. */
export const ProviderFreightRateCardResultSchema = z.object({
  rateCard: AdminFreightRateCardSchema,
});
export type ProviderFreightRateCardResult = z.infer<typeof ProviderFreightRateCardResultSchema>;

// --- List filter ----------------------------------------------------------------

/**
 * NO `providerOrganizationId`, and its absence is the access rule rather than a shortened list:
 * the caller may only ever see its own cards, so a filter for whose cards to show would be a field
 * with exactly one legal value. The server's query schema is `.strict()`, so sending one is a 422.
 *
 * `state` IS still a filter and still not a display rule — the rating read's predicate is the
 * validity WINDOW, so a `superseded` card may legitimately still be pricing a lane.
 */
export interface ListProviderFreightRateCardsFilter {
  readonly originCountryCode?: string;
  readonly destinationCountryCode?: string;
  readonly mode?: FreightMode;
  readonly state?: FreightRateCardState;
  readonly limit?: number;
  readonly cursor?: string;
}

// --- Write bodies ----------------------------------------------------------------

/**
 * A new card, authored complete.
 *
 * A RUNTIME SCHEMA RATHER THAN A BARE INTERFACE, which is where this departs from
 * `admin-freight.schemas.ts`'s `CreateFreightRateCardInput`. That one is a plain type, so nothing
 * checks a body before it goes out — acceptable when every field was typed into a labelled input.
 * ⚠️ HERE THE PASTE BOX PRODUCES BODIES NO HUMAN TYPED, so the last chance to catch a mis-parsed
 * column before it becomes a published tariff is right here.
 */
/*
 * `z.strictObject` rather than `z.object().strict()`: same refusal, and the non-deprecated Zod 4
 * spelling. The strictness is the point, not decoration — it is the client-side mirror of the
 * server's `.strict()` body, and it is what stops `providerOrganizationId` or
 * `sourceForwarderName` reaching the wire and 422-ing the whole submission.
 */
export const CreateProviderFreightRateCardInputSchema = z.strictObject({
  originCountryCode: z.string().regex(/^[A-Z]{2}$/),
  destinationCountryCode: z.string().regex(/^[A-Z]{2}$/),
  mode: z.enum(["air", "sea", "land", "rail"]),
  currency: z.string().regex(/^[A-Z]{3}$/),
  validFrom: z.string().min(1),
  validUntil: z.string().min(1).optional(),
  /**
   * §19.9. The forwarder's OWN divisor, cm³ per kilogram — required, never defaulted. Ocean LCL
   * is 1000 (the W/M revenue ton), road around 3000, air 5000 or 6000 depending on who quotes.
   *
   * ⚠️ THE BOUND CATCHES A DECIMAL SLIP AND NOTHING SUBTLER. A road divisor typed onto an air
   * card sits inside 100–20000 and underbills every bulky consignment on that lane, quietly.
   */
  volumetricDivisorCm3PerKg: z.number().int().min(100).max(20_000),
  breaks: z
    .array(
      z.object({
        minBillableWeightGrams: z.number().int().min(0),
        minVolumeCubicCm: z.number().int().min(0),
        unitPriceInCents: z.number().int().min(1),
        minimumChargeInCents: z.number().int().min(0),
        transitDaysMin: z.number().int().min(0).max(365),
        transitDaysMax: z.number().int().min(0).max(365),
      }),
    )
    .min(1)
    .max(20),
});
export type CreateProviderFreightRateCardInput = z.infer<
  typeof CreateProviderFreightRateCardInputSchema
>;

/**
 * The only two edits a card admits, exactly as the backend declares them.
 *
 * BOTH ARMS NARROW. Nothing here restates a price or pushes a window outward — extending validity
 * is re-selling an expired list under its old provenance. Lane, mode, currency, `validFrom`, the
 * forwarder name and the divisor are all immutable, and `.strict()` makes sending one a 422 rather
 * than an ignored key. The edit path for a price is a NEW card, which supersedes.
 */
export type UpdateProviderFreightRateCardInput =
  | { readonly intent: "shorten_window"; readonly validUntil: string }
  | { readonly intent: "withdraw"; readonly reasonNote: string };

/** Re-exported so a composer needs one import for the row and the band it edits. */
export type { AdminFreightRateCard, FreightRateBreakInput, FreightRateCardState };
export { FreightRateCardStateSchema };

// TRANSPORT: props-only — schemas and types, no network of its own.
//
// Client contract for `GET /commerce/sourcing/quote-lines` (A44).

import { z } from "zod";

import { cursorPageOf, IsoDateTimeSchema } from "@/lib/store/shared.schemas";

/**
 * One accepted quote product line, as a cost basis candidate.
 *
 * `unitPriceInCents` IS ALREADY PER UNIT, which is the fact that made this feature buildable at
 * all: no batch-to-order-line apportionment is needed, and none is invented.
 *
 * `currency` IS THE QUOTE'S, and may differ from the listing's selling currency. That is not an
 * error to correct — a seller may buy in CNY and sell in USD, and converting would be the client
 * inventing an exchange rate.
 */
export const SourcingQuoteLineSchema = z
  .object({
    quoteProductLineId: z.string(),
    quoteId: z.string(),
    rfqId: z.string(),
    rfqTitle: z.string(),
    revisionNumber: z.number().int(),
    providerOrganizationId: z.string(),
    providerDisplayName: z.string(),
    titleSnapshot: z.string(),
    quantity: z.number().int(),
    unitPriceInCents: z.number().int(),
    lineTotalInCents: z.number().int(),
    currency: z.string(),
    acceptedAt: IsoDateTimeSchema,
  })
  .strip();

export const SourcingQuoteLinePageSchema = cursorPageOf(SourcingQuoteLineSchema);

export type SourcingQuoteLine = z.infer<typeof SourcingQuoteLineSchema>;
export type SourcingQuoteLinePage = z.infer<typeof SourcingQuoteLinePageSchema>;

export interface ListSourcingQuoteLinesFilter {
  readonly cursor?: string;
  readonly limit?: number;
}

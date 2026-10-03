// TRANSPORT: client-query — the signed-in account accepting the current Terms, from the banner.

import { z } from "zod";

import { sendJson, type ActionResponse, type RequestOptions } from "@/lib/http";
import { IsoDateTimeSchema } from "@/lib/store/shared.schemas";

const TermsAcceptanceSchema = z.object({
  termsVersion: z.string(),
  termsAcceptedAt: IsoDateTimeSchema,
});

export type TermsAcceptance = z.infer<typeof TermsAcceptanceSchema>;

/**
 * `POST /users/me/terms-acceptance`. Echoes the version the reader was SHOWN.
 *
 * IDEMPOTENT PER VERSION on the server — a second press returns the existing acceptance and records
 * nothing new, so no idempotency key is minted. A **409** means the Terms changed after the page
 * loaded: the reader must reload and read them, never be accepted on their behalf. A **403** is an
 * anonymous session, which is not an account that can agree to anything.
 */
export function acceptCurrentTerms(
  acceptedTermsVersion: string,
  options?: RequestOptions,
): Promise<ActionResponse<TermsAcceptance>> {
  return sendJson(
    "/users/me/terms-acceptance",
    "POST",
    { acceptedTermsVersion },
    TermsAcceptanceSchema,
    options,
  );
}

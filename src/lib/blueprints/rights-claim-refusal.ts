// TRANSPORT: props-only — classifies a refusal from `rights-claim.api.ts`. No network of its own.

import { z } from "zod";

import type { ApiError } from "@/lib/http";

/**
 * EVERY WAY A CLAIM CAN FAIL TO ARRIVE, as a union the composer renders exhaustively.
 *
 * ⚠️ BRANCHED ON THE HTTP STATUS, because the house envelope carries no machine error code — the
 * `ShowcaseLaunchRefusal` precedent.
 *
 * ⚠️ THREE ARMS OFFER THE EMAILED NOTICE AND FIVE DO NOT, and `readEmailedNoticeFallbackReason`
 * below is the one place that decides which. The emailed notice exists so a legal notice never
 * depends on the API being up, so it is offered when the claim could not be RECEIVED: no connection
 * or a server error (`unreachable`), a rate limit (`rateLimited`), or a claimant with no session
 * (`signInRequired`, because a rights holder without an account must still be able to reach a
 * person). It is not offered when the claim was received already (409), is not allowed (403), is
 * about a teardown that is gone (404), needs a field fixed (422), or may already be stored (an
 * unreadable reply): an email there would be a second copy of something Qatoto already answered.
 */
export type RightsClaimRefusal =
  | { readonly kind: "signInRequired" }
  | { readonly kind: "notPermitted"; readonly message: string }
  | { readonly kind: "teardownGone" }
  | { readonly kind: "claimAlreadyOpen"; readonly message: string }
  | { readonly kind: "fieldsRefused"; readonly fieldErrors: Readonly<Record<string, string[]>> }
  | { readonly kind: "rateLimited" }
  | { readonly kind: "replyUnreadable" }
  | { readonly kind: "unreachable" };

/** Parsed, not trusted: `http.ts` hands `errors` over without checking its shape. */
const RefusalFieldErrorsSchema = z.record(z.string(), z.array(z.string()));

export function classifyRightsClaimRefusal(apiError: ApiError): RightsClaimRefusal {
  const parsedFieldErrors = RefusalFieldErrorsSchema.safeParse(apiError.fieldErrors ?? {});
  const fieldErrors: Readonly<Record<string, string[]>> = parsedFieldErrors.success
    ? parsedFieldErrors.data
    : {};

  switch (apiError.code) {
    case "401":
      return { kind: "signInRequired" };
    case "403":
      return { kind: "notPermitted", message: apiError.message };
    case "404":
      return { kind: "teardownGone" };
    /*
     * Both 409s land here and the server's sentence tells them apart: "you already have an open
     * claim" from the service, or the idempotency middleware's reused-key answer. The composer
     * rotates the key on every edit, so the second only arrives from a retry that changed nothing.
     */
    case "409":
      return { kind: "claimAlreadyOpen", message: apiError.message };
    case "422":
      return Object.keys(fieldErrors).length > 0
        ? { kind: "fieldsRefused", fieldErrors }
        : { kind: "fieldsRefused", fieldErrors: { form: [apiError.message] } };
    case "429":
      return { kind: "rateLimited" };
    /*
     * ⚠️ NOT `unreachable`. The server answered and this page could not read the reply, so the claim
     * may already be stored. Sending again with the same key returns the same receipt if it was.
     */
    case "PARSE":
      return { kind: "replyUnreadable" };
    default:
      // NETWORK and every 5xx: the claim did not arrive, or nobody can say that it did.
      return { kind: "unreachable" };
  }
}

/** The three refusals that hand the claimant the emailed notice. */
export type EmailedNoticeFallbackReason = "unreachable" | "rateLimited" | "signInRequired";

/**
 * Which fallback this refusal gets, or `null` when it gets none. See the union's docblock for why
 * these three and not the others; this switch is the one place that decides.
 */
export function readEmailedNoticeFallbackReason(
  refusal: RightsClaimRefusal,
): EmailedNoticeFallbackReason | null {
  switch (refusal.kind) {
    case "unreachable":
    case "rateLimited":
    case "signInRequired":
      return refusal.kind;
    case "notPermitted":
    case "teardownGone":
    case "claimAlreadyOpen":
    case "fieldsRefused":
    case "replyUnreadable":
      return null;
    default: {
      const exhaustiveCheck: never = refusal;
      return exhaustiveCheck;
    }
  }
}

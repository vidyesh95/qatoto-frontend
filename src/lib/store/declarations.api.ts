// TRANSPORT: client-query — order-scoped, read and written from a client island.
//
// Third-party declarations: a party's own record of cover or a laboratory report it arranged for an
// order. See `declarations.schemas.ts` for what a declaration is and, more importantly, is not.

import { getJson, sendJson, type ActionResponse, type RequestOptions } from "@/lib/http";
import {
  OrderDeclarationListSchema,
  type OrderDeclarationList,
  type RecordDeclarationInput,
} from "@/lib/store/declarations.schemas";

function declarationsPath(orderId: string): string {
  return `/commerce/orders/${encodeURIComponent(orderId)}/declarations`;
}

/**
 * Both parties' declarations on one order, withdrawn ones included and labelled, plus the current
 * disclaimer text — `GET /commerce/orders/:orderId/declarations`. Parties only; anyone else gets the
 * same 404 an unknown id gets.
 */
export function listOrderDeclarations(
  orderId: string,
  options?: RequestOptions,
): Promise<ActionResponse<OrderDeclarationList>> {
  return getJson(declarationsPath(orderId), OrderDeclarationListSchema, options);
}

/**
 * Records this party's declaration — `POST /commerce/orders/:orderId/declarations`.
 *
 * REQUIRES AN `Idempotency-Key`, minted once per attempt in component state.
 *
 * THE REFUSALS, none of them a retry:
 *   - **409, stale disclaimer** — the notice changed since the page loaded. The reader must reload
 *     and read the new text; acknowledging it on their behalf would defeat the record.
 *   - **409, cancelled order.**
 *   - **422** — a leg that is not on this order, or an evidence document that is not yours or has
 *     not finished its safety scan.
 *
 * ANSWERS 201 WITH THE WHOLE LIST, so the writer sees their row beside the other party's.
 */
export function recordOrderDeclaration(
  orderId: string,
  input: RecordDeclarationInput,
  options?: RequestOptions,
): Promise<ActionResponse<OrderDeclarationList>> {
  return sendJson(declarationsPath(orderId), "POST", input, OrderDeclarationListSchema, options);
}

/**
 * Withdraws one of this party's own declarations —
 * `POST /commerce/orders/:orderId/declarations/:declarationId/withdraw`.
 *
 * NO IDEMPOTENCY KEY, by the backend's design: a repeat is a 409 ("already withdrawn"), not a
 * second effect. The other party pressing it gets a 403. The row stays on the read, labelled.
 */
export function withdrawOrderDeclaration(
  orderId: string,
  declarationId: string,
  options?: RequestOptions,
): Promise<ActionResponse<OrderDeclarationList>> {
  return sendJson(
    `${declarationsPath(orderId)}/${encodeURIComponent(declarationId)}/withdraw`,
    "POST",
    {},
    OrderDeclarationListSchema,
    options,
  );
}

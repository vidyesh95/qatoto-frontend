// TRANSPORT: client-query — a thread is organization-scoped and read from a client island.
//
// WIRED, AND THIS FILE IS NEW BECAUSE THE CHAT SHEET HELD ITS MESSAGES IN `useState` AND SENT
// NOTHING. That sheet said so in its own UI rather than only in a comment, which was the right call
// while it was true: a composer that looks live and posts nowhere leaves the buyer believing the
// seller has been contacted.
//
// THE SEQUENCE IS INQUIRY → THREAD → MESSAGES, and it cannot be shortened. `POST /commerce/threads`
// accepts `rfq` and `quote` ONLY; widening it to `product` would have been a cross-tenant leak,
// because the thread's unique index is `(resourceKind, resourceId)` and a thread keyed on a product
// id would be one thread per product shared by every buyer who ever asked about it. So a product
// conversation is opened by `POST /commerce/products/:productId/inquiries`, which creates the
// inquiry and its 1:1 thread together and hands back the id.
//
// ATTACHMENTS HAVE NO UPLOAD PATH FROM HERE, and that is the one thing still missing. The message
// body accepts `encryptedDocumentIds` — ids of documents ALREADY uploaded and authorized — and the
// only multipart routes in the backend are verification evidence and customization assets. There is
// no first-party video ingest anywhere either. The composer's attachment control is disabled and
// names the reason rather than picking a file that goes nowhere.

import {
  buildQueryString,
  getJson,
  sendJson,
  type ActionResponse,
  type RequestOptions,
} from "@/lib/http";
import {
  ProductInquirySchema,
  ThreadInboxPageSchema,
  ThreadMessagePageSchema,
  ThreadMessageSchema,
  type AppendThreadMessageInput,
  type ListMessagesFilter,
  type ListThreadsFilter,
  type ProductInquiry,
  type ThreadInboxPage,
  type ThreadMessage,
  type ThreadMessagePage,
} from "@/lib/store/messages.schemas";

/**
 * Opens — or returns — the conversation about one product.
 *
 * IT IS `createOrGet`, SO PRESSING IT TWICE IS SAFE and the second press returns the same inquiry
 * and the same thread. That is why it is the entry point rather than a separate "do I already have
 * one" read: the client never has to decide whether a conversation exists.
 *
 * `thread` IS NON-NULL ON THIS RESPONSE and null on the inquiry LIST, which is a queue. The id here
 * is the only place a product conversation's thread id is published.
 *
 * Requires an `Idempotency-Key`, minted once per attempt in component state.
 */
export function createOrGetProductInquiry(
  productId: string,
  options?: RequestOptions,
): Promise<ActionResponse<ProductInquiry>> {
  return sendJson(
    `/commerce/products/${encodeURIComponent(productId)}/inquiries`,
    "POST",
    undefined,
    ProductInquirySchema,
    options,
  );
}

/**
 * The caller's thread inbox — `GET /commerce/threads` (A38).
 *
 * BEFORE THIS EXISTED, every thread the frontend could reach was one it had created in the same
 * session: `POST /commerce/threads` returned an id and nothing else ever yielded one, so a reload
 * made the conversation unreachable. The same absence made §14's settlement agreements dead, since
 * their routes are keyed on the same id.
 */
export function listThreads(
  filter: ListThreadsFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<ThreadInboxPage>> {
  return getJson(
    `/commerce/threads${buildQueryString({ ...filter })}`,
    ThreadInboxPageSchema,
    options,
  );
}

/**
 * One thread's messages — `GET /commerce/threads/:threadId/messages`.
 *
 * Cursor-paged, `limit` 1..100. A caller who is not a participant gets a 404, not a 403, so the
 * route cannot be used to probe which threads exist.
 */
export function listThreadMessages(
  threadId: string,
  filter: ListMessagesFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<ThreadMessagePage>> {
  const path = `/commerce/threads/${encodeURIComponent(threadId)}/messages${buildQueryString({ ...filter })}`;
  return getJson(path, ThreadMessagePageSchema, options);
}

/**
 * Posts a message — `POST /commerce/threads/:threadId/messages`.
 *
 * ANSWERS THE ONE MESSAGE, not the thread. `bodyText` is 1..10000 characters.
 *
 * Requires an `Idempotency-Key`: a retried message posts twice into a conversation nobody can edit.
 */
export function appendThreadMessage(
  threadId: string,
  input: AppendThreadMessageInput,
  options?: RequestOptions,
): Promise<ActionResponse<ThreadMessage>> {
  return sendJson(
    `/commerce/threads/${encodeURIComponent(threadId)}/messages`,
    "POST",
    input,
    ThreadMessageSchema,
    options,
  );
}

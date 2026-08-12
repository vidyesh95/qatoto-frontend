// TRANSPORT: props-only — schemas and display maps, no network of their own.
//
// Client contract for `POST /commerce/products/:productId/inquiries`, `GET /commerce/threads`,
// `GET|POST /commerce/threads/:threadId/messages` (A14, A38).
//
// Transcribed from `commerce-messages.service.ts` — `CommerceThreadProjection` (:43),
// `CommerceMessageProjection` (:57), `CommerceThreadInboxEntry` (:474) — and
// `commerce-product-inquiry.service.ts` — `ProductInquiryProjection` (:30).

import { z } from "zod";

import { cursorPageOf, IsoDateTimeSchema } from "@/lib/store/shared.schemas";

/**
 * `commerce_thread_resource_kind`, as the INBOX filter accepts it.
 *
 * FOUR HERE, TWO ON THE CREATE. `POST /commerce/threads` takes only `rfq` and `quote`; a product or
 * manufacturing inquiry thread is created by its OWN route, because the thread's unique index is
 * `(resourceKind, resourceId)` — a thread keyed on a product id would be ONE THREAD PER PRODUCT
 * ACROSS ALL BUYERS, which is a cross-tenant leak rather than a conversation.
 */
export const THREAD_RESOURCE_KINDS = [
  "rfq",
  "quote",
  "product_inquiry",
  "manufacturing_inquiry",
] as const;

export type ThreadResourceKind = (typeof THREAD_RESOURCE_KINDS)[number];

export const THREAD_PARTICIPANT_ROLES = ["buyer", "provider", "moderator"] as const;

export const ThreadParticipantSchema = z
  .object({
    organizationId: z.string(),
    participantRole: z.enum(THREAD_PARTICIPANT_ROLES),
  })
  .strip();

export const ThreadSchema = z
  .object({
    id: z.string(),
    resourceKind: z.enum(THREAD_RESOURCE_KINDS),
    resourceId: z.string(),
    createdByOrganizationId: z.string(),
    createdByMemberId: z.string(),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
    participants: z.array(ThreadParticipantSchema),
  })
  .strip();

/**
 * One message.
 *
 * `authorOrganizationId` IS THE ONLY IDENTITY ON THE WIRE — there is no author display name. A
 * message is between ORGANIZATIONS, and the individual who typed it is not published on a
 * commercial record that outlives their membership. Render the side, not the person.
 *
 * `encryptedDocumentIds` are ids of documents ALREADY uploaded and authorized elsewhere. This route
 * attaches, it does not upload.
 */
export const ThreadMessageSchema = z
  .object({
    id: z.string(),
    threadId: z.string(),
    authorOrganizationId: z.string(),
    authorMemberId: z.string(),
    bodyText: z.string(),
    createdAt: IsoDateTimeSchema,
    encryptedDocumentIds: z.array(z.string()),
  })
  .strip();

export const ThreadMessagePageSchema = cursorPageOf(ThreadMessageSchema);

/** The inbox row: a thread plus a preview, or `null` when nobody has written into it yet. */
export const ThreadInboxEntrySchema = ThreadSchema.extend({
  lastMessage: z
    .object({
      id: z.string(),
      authorOrganizationId: z.string(),
      bodyPreview: z.string(),
      createdAt: IsoDateTimeSchema,
    })
    .strip()
    .nullable(),
}).strip();

export const ThreadInboxPageSchema = cursorPageOf(ThreadInboxEntrySchema);

/**
 * `POST /commerce/products/:productId/inquiries` — creates the inquiry AND its thread.
 *
 * `thread` IS PRESENT ON CREATE AND NULL ON THE LIST READ. The list is a queue and deliberately
 * does not fan out to threads; the create is the one call that hands back the id a conversation
 * needs, which is exactly the shape A38 spent nine routes fixing elsewhere.
 */
export const ProductInquirySchema = z
  .object({
    id: z.string(),
    productId: z.string(),
    buyerOrganizationId: z.string(),
    sellerOrganizationId: z.string(),
    convertedToRfqId: z.string().nullable(),
    createdAt: IsoDateTimeSchema,
    thread: ThreadSchema.nullable(),
  })
  .strip();

export type Thread = z.infer<typeof ThreadSchema>;
export type ThreadMessage = z.infer<typeof ThreadMessageSchema>;
export type ThreadMessagePage = z.infer<typeof ThreadMessagePageSchema>;
export type ThreadInboxEntry = z.infer<typeof ThreadInboxEntrySchema>;
export type ThreadInboxPage = z.infer<typeof ThreadInboxPageSchema>;
export type ProductInquiry = z.infer<typeof ProductInquirySchema>;

export interface ListThreadsFilter {
  readonly resourceKind?: ThreadResourceKind;
  readonly limit?: number;
  readonly cursor?: string;
}

export interface ListMessagesFilter {
  readonly limit?: number;
  readonly cursor?: string;
}

/**
 * `POST /commerce/threads/:threadId/messages`.
 *
 * `encryptedDocumentIds` TAKES IDS OF ALREADY-AUTHORIZED DOCUMENTS. There is no upload path that
 * produces one from this surface — the only multipart routes are verification evidence and
 * customization assets — so the composer's attachment control stays disabled and says so.
 */
export interface AppendThreadMessageInput {
  readonly bodyText: string;
  readonly encryptedDocumentIds?: readonly string[];
}

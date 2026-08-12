// TRANSPORT: client-query — opens the conversation with
// POST /commerce/products/:productId/inquiries, then reads and writes
// GET|POST /commerce/threads/:threadId/messages.
"use client";

// THIS SHEET USED TO HOLD ITS MESSAGES IN `useState` AND SEND NOTHING, and it said so in its own UI
// rather than only in a comment — the right call while it was true, because a composer that looks
// live and posts nowhere leaves a buyer believing the seller has been contacted.
//
// THE SEQUENCE IS INQUIRY → THREAD → MESSAGES, and it cannot be shortened. `POST /commerce/threads`
// takes `rfq` and `quote` only; widening it to `product` would be a cross-tenant leak, because the
// thread's unique index is `(resourceKind, resourceId)` and a thread keyed on a product id would be
// ONE THREAD PER PRODUCT SHARED BY EVERY BUYER who ever asked about it. So the product route creates
// the inquiry and its 1:1 thread together.
//
// IT NEEDS A PRODUCT, which is why this component takes a `productId` and the organization
// storefront no longer opens it. There is no organization-level thread kind —
// `commerce_thread_resource_kind` is rfq, quote, order, service_engagement, dispute,
// product_inquiry, manufacturing_inquiry — so "message this seller" with no product attached is not
// a conversation the backend can open. The storefront points at an RFQ instead.
//
// THE INQUIRY IS OPENED ON MOUNT, and that is safe SPECIFICALLY because the route is `createOrGet`:
// reopening the sheet returns the same inquiry and the same thread rather than a second one. It is
// not a write the buyer has to be warned about — nothing is sent to the seller until a message is.
//
// ATTACHMENTS ARE DISABLED AND SAY WHY. `encryptedDocumentIds` takes ids of documents already
// uploaded and authorized, and the only multipart routes in this backend are verification evidence
// and customization assets. There is no first-party video ingest anywhere either.

import { useEffect, useMemo, useState } from "react";

import MutationNotice from "@/components/home/store/shared/mutation-notice";
import {
  useAppendThreadMessage,
  useCreateProductInquiry,
  useThreadMessagesQuery,
} from "@/hooks/store/messages";
import { newIdempotencyKey } from "@/lib/idempotency";
import { formatIsoInstantLabel } from "@/lib/store/format";
import type { ThreadMessage } from "@/lib/store/messages.schemas";

export default function ManufacturerChatSheet({
  productId,
  sellerDisplayName,
  viewerOrganizationId,
  onClose,
}: {
  readonly productId: string;
  readonly sellerDisplayName: string;
  /**
   * Which side the reader is, so a bubble can be aligned.
   *
   * `null` while the viewer's organizations have not resolved. Every message then renders as the
   * other side's, which is the safe default: attributing the seller's words to the buyer is worse
   * than a moment of flat layout.
   */
  readonly viewerOrganizationId: string | null;
  readonly onClose: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [inquiryIdempotencyKey] = useState(newIdempotencyKey);
  const [messageIdempotencyKey, setMessageIdempotencyKey] = useState(newIdempotencyKey);

  const createInquiry = useCreateProductInquiry();
  const inquiryResult = createInquiry.data;
  const threadId = inquiryResult?.success === true ? (inquiryResult.data.thread?.id ?? null) : null;

  const messagesQuery = useThreadMessagesQuery(threadId);
  const appendMessage = useAppendThreadMessage();

  // `createOrGet`, so this is idempotent by construction — see the header.
  useEffect(() => {
    createInquiry.mutate({ productId, idempotencyKey: inquiryIdempotencyKey });
    // Deliberately once per mount: the mutation object identity changes on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  useEffect(() => {
    const handleKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const messages = useMemo<readonly ThreadMessage[]>(() => {
    const result = messagesQuery.data;
    if (result === undefined || !result.success) return [];
    // OLDEST FIRST — a conversation reads in the order it happened. The read is cursor-paged
    // newest-first, so this reverses rather than trusting arrival order.
    return result.data.items.toSorted((left, right) =>
      left.createdAt.localeCompare(right.createdAt),
    );
  }, [messagesQuery.data]);

  const trimmedDraft = draft.trim();
  const isSendable = trimmedDraft.length > 0 && threadId !== null && !appendMessage.isPending;

  return (
    <>
      <button
        type="button"
        aria-label="Close chat"
        onClick={onClose}
        className="fixed inset-0 z-55 bg-black/40"
      />

      <div
        aria-label={`Chat with ${sellerDisplayName}`}
        className="fixed inset-x-0 bottom-0 z-60 flex h-[90dvh] flex-col rounded-t-2xl bg-background shadow-lg sm:inset-0 sm:m-auto sm:h-[80dvh] sm:w-md sm:rounded-2xl sm:border sm:border-black/10"
      >
        <div className="flex justify-center pt-3 sm:hidden">
          <span className="h-1.5 w-10 rounded-full bg-black/15" />
        </div>

        <header className="flex shrink-0 items-center justify-between gap-3 px-4 py-3">
          <p className="text-sm font-medium text-foreground">{sellerDisplayName}</p>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer text-xs text-muted-foreground"
          >
            Close
          </button>
        </header>

        <div className="flex-1 space-y-2 overflow-y-auto px-4 pb-3">
          {renderConversation({
            isOpening: createInquiry.isPending,
            openError:
              inquiryResult !== undefined && !inquiryResult.success
                ? inquiryResult.error.message
                : null,
            hasThrownOpening: createInquiry.isError,
            isLoadingMessages: messagesQuery.isPending && threadId !== null,
            messages,
            viewerOrganizationId,
          })}
        </div>

        <div className="shrink-0 border-t border-border px-4 py-3">
          <div className="flex items-end gap-2">
            <textarea
              className="min-h-10 flex-1 resize-none rounded-2xl border border-border px-3 py-2 text-sm"
              rows={1}
              maxLength={10_000}
              placeholder={threadId === null ? "Opening…" : "Write a message"}
              value={draft}
              disabled={threadId === null}
              onChange={(changeEvent) => setDraft(changeEvent.target.value)}
            />
            <button
              type="button"
              disabled={!isSendable}
              onClick={() => {
                if (threadId === null) return;
                appendMessage.mutate(
                  { threadId, bodyText: trimmedDraft, idempotencyKey: messageIdempotencyKey },
                  {
                    onSuccess: (result) => {
                      if (!result.success) return;
                      setDraft("");
                      // A new key for the next message — the one just used belongs to this send.
                      setMessageIdempotencyKey(newIdempotencyKey());
                    },
                  },
                );
              }}
              className="cursor-pointer rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              Send
            </button>
          </div>

          {/* The one thing still missing, named rather than mocked. */}
          <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">
            Attachments aren&apos;t available here yet — there is no upload route for message files.
          </p>

          <MutationNotice
            result={appendMessage.data}
            hasThrown={appendMessage.isError}
            fallbackMessage="Couldn't reach the server. Your message wasn't sent."
          />
        </div>
      </div>
    </>
  );
}

function renderConversation({
  isOpening,
  openError,
  hasThrownOpening,
  isLoadingMessages,
  messages,
  viewerOrganizationId,
}: {
  isOpening: boolean;
  openError: string | null;
  hasThrownOpening: boolean;
  isLoadingMessages: boolean;
  messages: readonly ThreadMessage[];
  viewerOrganizationId: string | null;
}) {
  if (isOpening) {
    return <p className="pt-4 text-xs text-muted-foreground">Opening the conversation…</p>;
  }
  if (hasThrownOpening) {
    return (
      <p role="alert" className="pt-4 text-xs text-destructive">
        Couldn&apos;t reach the server. Nothing was sent.
      </p>
    );
  }
  if (openError !== null) {
    // The backend's own sentence — a 403 here means the workspace is not active yet, and saying
    // "something went wrong" would hide the one thing the buyer can act on.
    return (
      <p role="alert" className="pt-4 text-xs text-destructive">
        {openError}
      </p>
    );
  }
  if (isLoadingMessages) {
    return <p className="pt-4 text-xs text-muted-foreground">Loading messages…</p>;
  }
  if (messages.length === 0) {
    return (
      <p className="pt-4 text-xs text-muted-foreground">
        No messages yet. The seller is notified when you send the first one.
      </p>
    );
  }

  return (
    <ul className="space-y-2 pt-2">
      {messages.map((message) => {
        const isOwnMessage =
          viewerOrganizationId !== null && message.authorOrganizationId === viewerOrganizationId;
        return (
          <li
            key={message.id}
            className={`max-w-[85%] rounded-2xl px-3 py-2 ${
              isOwnMessage ? "ml-auto bg-[#00696E] text-white" : "bg-muted text-foreground"
            }`}
          >
            <p className="text-sm leading-5 whitespace-pre-line">{message.bodyText}</p>
            <p
              className={`mt-0.5 text-[11px] ${isOwnMessage ? "text-white/70" : "text-muted-foreground"}`}
            >
              {formatIsoInstantLabel(message.createdAt)}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

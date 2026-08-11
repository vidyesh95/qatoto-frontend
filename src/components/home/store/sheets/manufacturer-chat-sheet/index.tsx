// TRANSPORT: mock — messages live in `useState` and NOTHING IS SENT. The sheet says so, in the UI,
// rather than only in this comment: a composer that looks live and posts nowhere is worse than one
// that admits it, because the buyer walks away believing the seller has been contacted.
// The long note above the component explains what exists on the backend and why this is
// the one store sheet that keeps its own shell.
"use client";

import { useEffect, useState } from "react";

import Image from "next/image";

import AttachmentMenu from "@/components/home/store/sheets/manufacturer-chat-sheet/attachment-menu";
import {
  type ChatMessage,
  MOCK_MESSAGES,
} from "@/components/home/store/sheets/manufacturer-chat-sheet/chat-message";
import MessageBubble from "@/components/home/store/sheets/manufacturer-chat-sheet/message-bubble";

// Buyers and manufacturers exchange messages here and share image/video catalogs and PDFs.
//
// THE ONLY STORE SHEET THAT KEEPS ITS OWN SHELL, and the reason is the header. `StoreSheet` takes
// a `title: string` and renders it as an `<h2>`; a conversation's header is a PARTICIPANT — avatar,
// name, verification state — plus a composer footer and a 90dvh panel so the message list has room.
// Expressing that would mean three more optional props on the shared shell used by exactly one
// caller, at which point the shell stops being a shell. Nine sheets share it; this one does not.
//
// TWO THINGS WERE REMOVED FROM THIS HEADER RATHER THAN CARRIED FORWARD.
//
// It printed "Chat evidence #1523645" under the seller's name, which asserts that Qatoto keeps a
// numbered evidence record of the conversation and mediates from it. No such record exists:
// disputes are order-scoped (`POST /commerce/orders/:orderId/disputes`) and there is no
// participant-facing dispute read at all, let alone a chat-evidence id. A case number is exactly
// the kind of claim a buyer would cite later.
//
// It also described itself as a "trust banner". A thread between two organizations is not a trust
// signal, and the verified tick beside the name means one specific thing — the seller organization
// passed verification — not that the conversation is supervised.
//
// WIRE PATH, once this is built: `POST /commerce/products/:productId/inquiries` returns the
// inquiry AND its thread, then `GET`/`POST /commerce/threads/:threadId/messages`. Note
// `POST /commerce/threads` accepts only `rfq | quote`, and widening it to `product` would have
// been a cross-tenant leak — the thread's unique index is `(resourceKind, resourceId)`, so a
// thread keyed on the product id would be ONE THREAD PER PRODUCT ACROSS ALL BUYERS, handing every
// buyer every other buyer's negotiation. The inquiry row is the resource the thread points at.
//
// Attachments have no route yet: `POST /commerce/threads/:threadId/messages` takes ids of
// documents that are ALREADY authorized, and the only upload paths are verification evidence and
// customization assets. There is no first-party video ingest anywhere in the codebase either, so a
// message video follows the review-media shape — an external id under a supply CHECK — or it does
// not ship.
export default function ManufacturerChatSheet({
  sellerDisplayName,
  onClose,
}: {
  readonly sellerDisplayName: string;
  readonly onClose: () => void;
}) {
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES);

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

  return (
    <>
      <button
        type="button"
        aria-label="Close chat"
        onClick={onClose}
        className="fixed inset-0 z-55 bg-black/40"
      />

      <div
        aria-label="Chat with manufacturer"
        className="fixed inset-x-0 bottom-0 z-60 flex h-[90dvh] flex-col rounded-t-2xl bg-background shadow-lg sm:inset-0 sm:m-auto sm:h-[80dvh] sm:w-md sm:rounded-2xl sm:border sm:border-black/10"
      >
        {/* Drag handle — mobile affordance only. */}
        <div className="flex justify-center pt-3 sm:hidden">
          <span className="h-1.5 w-10 rounded-full bg-black/15" />
        </div>

        <header className="flex shrink-0 items-center gap-3 px-4 py-3">
          <span className="relative size-9 shrink-0 overflow-hidden rounded-full bg-[#F5F5F5]">
            <Image
              src="/dummy/chair_raspberry_red.avif"
              fill
              sizes="36px"
              alt=""
              className="object-cover"
            />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 text-sm font-medium text-[#191C1C]">
              <span className="truncate">{sellerDisplayName}</span>
              <Image
                src="/icons/verified_24dp_00696E_FILL1_wght400_GRAD0_opsz24.svg"
                width={14}
                height={14}
                alt="Verified manufacturer"
                className="shrink-0"
              />
            </p>
            <p className="text-[11px] text-[#6F7979]">Verified seller organization</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded-full p-1 transition-colors hover:bg-muted"
          >
            <Image
              src="/icons/close_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              alt=""
              width={24}
              height={24}
            />
          </button>
        </header>

        <div className="h-px shrink-0 bg-[#CAC4D0]" />

        {/* Message list */}
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
          <div className="flex justify-center">
            <span className="rounded-full bg-[#EDEFEF] px-3 py-1 text-[11px] text-[#6F7979]">
              10 June 2026
            </span>
          </div>
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </div>

        {/* SAID IN THE UI, NOT ONLY IN A COMMENT. The composer below looks live and posts nowhere;
            a buyer who types into it and walks away believing the seller was contacted is the
            failure this banner exists to prevent. It goes when the thread routes are wired. */}
        <p className="mx-4 mb-2 shrink-0 rounded-lg bg-[#FFF8E1] px-3 py-2 text-[11px] leading-4 text-[#6F4E00]">
          Messaging is not connected yet — nothing sent from here reaches the seller. Use “Send
          inquiry” on the product, or the seller’s storefront, to make contact.
        </p>

        {/* Composer — relative anchor so the attachment menu floats above it
            with a transparent surround, keeping the chat visible behind. */}
        <div className="relative flex shrink-0 items-center gap-2 px-4 pt-1 pb-[calc(12px+env(safe-area-inset-bottom))]">
          <AttachmentMenu
            isOpen={isAttachMenuOpen}
            onOpenChange={setIsAttachMenuOpen}
            onMessagesPicked={(picked) => setMessages((previous) => [...previous, ...picked])}
          />

          <div className="flex flex-1 items-center gap-2 rounded-full bg-[#EDEFEF] px-4 py-2.5">
            <span className="flex-1 text-sm text-[#6F7979]">Type a message</span>
            <Image
              src="/icons/mic_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              width={20}
              height={20}
              alt=""
            />
          </div>
          <button
            type="button"
            aria-label="Send message"
            className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-[#00696E]"
          >
            <Image
              src="/icons/send_24dp_FFFFFF_FILL1_wght400_GRAD0_opsz24.svg"
              width={20}
              height={20}
              alt=""
            />
          </button>
        </div>
      </div>
    </>
  );
}

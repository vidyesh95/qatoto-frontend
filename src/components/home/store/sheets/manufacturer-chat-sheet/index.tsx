"use client";

import { useEffect, useState } from "react";

import Image from "next/image";

import AttachmentMenu from "@/components/home/store/sheets/manufacturer-chat-sheet/attachment-menu";
import {
  type ChatMessage,
  MOCK_MESSAGES,
} from "@/components/home/store/sheets/manufacturer-chat-sheet/chat-message";
import MessageBubble from "@/components/home/store/sheets/manufacturer-chat-sheet/message-bubble";

// Manufacturer chat bottom sheet (UI-only phase, no fetch, no send). Buyers and
// manufacturers exchange messages here and share image/video catalogs and PDFs;
// Qatoto also uses this thread to verify and mediate disputes, hence the trust
// banner at the top. The real thread, file uploads, identity, and dispute state
// are all backend-owned later — this is static mock chrome only.
export default function ManufacturerChatSheet({ onClose }: { onClose: () => void }) {
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
              <span className="truncate">Guangdong Puda Electrical</span>
              <Image
                src="/icons/verified_24dp_00696E_FILL1_wght400_GRAD0_opsz24.svg"
                width={14}
                height={14}
                alt="Verified manufacturer"
                className="shrink-0"
              />
            </p>
            <p className="text-[11px] text-[#6F7979]">Chat evidence #1523645</p>
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

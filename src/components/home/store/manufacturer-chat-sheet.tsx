"use client";

import { useEffect } from "react";

import Image from "next/image";

// Manufacturer chat bottom sheet (UI-only phase, no fetch, no send). Buyers and
// manufacturers exchange messages here and share image/video catalogs and PDFs;
// Qatoto also uses this thread to verify and mediate disputes, hence the trust
// banner at the top. The real thread, file uploads, identity, and dispute state
// are all backend-owned later — this is static mock chrome only.

// A message is a sender + one content kind. Modeled as a discriminated union so
// the render switch is exhaustive and no impossible bubble can exist.
type ChatMessage = { id: string; sender: "buyer" | "manufacturer" | "qatoto"; time: string } & (
  | { kind: "text"; text: string }
  | { kind: "image"; imageSrc: string; caption?: string }
  | { kind: "video"; imageSrc: string; caption?: string }
  | { kind: "document"; fileName: string; fileMeta: string }
);

const MESSAGES: ChatMessage[] = [
  {
    id: "m1",
    sender: "qatoto",
    time: "10 Jun 2026 · 09:12",
    kind: "text",
    text: "Qatoto opened this thread to verify the dispute. Share photos, videos, or invoices as evidence — both parties can see everything here.",
  },
  {
    id: "m2",
    sender: "buyer",
    time: "10 Jun 2026 · 09:14",
    kind: "text",
    text: "Two chairs arrived with a scratched frame. Sending photos now.",
  },
  {
    id: "m3",
    sender: "buyer",
    time: "10 Jun 2026 · 09:15",
    kind: "image",
    imageSrc: "/dummy/chair_charcoal_black.avif",
    caption: "Scratch on the left leg.",
  },
  {
    id: "m4",
    sender: "manufacturer",
    time: "10 Jun 2026 · 11:02",
    kind: "text",
    text: "Thanks. Our QC video for this batch is attached — please confirm the unit number.",
  },
  {
    id: "m5",
    sender: "manufacturer",
    time: "10 Jun 2026 · 11:03",
    kind: "video",
    imageSrc: "/dummy/stacking_chair.avif",
    caption: "Pre-shipment QC · batch #LV-2291",
  },
  {
    id: "m6",
    sender: "manufacturer",
    time: "10 Jun 2026 · 11:04",
    kind: "document",
    fileName: "LV-folding-chair-catalog-2026.pdf",
    fileMeta: "PDF · 4.2 MB · 18 pages",
  },
  {
    id: "m7",
    sender: "buyer",
    time: "10 Jun 2026 · 14:27",
    kind: "text",
    text: "Unit numbers match. Requesting replacement for the two damaged sets.",
  },
];

function MessageBubble({ message }: { message: ChatMessage }) {
  const isOwn = message.sender === "buyer";
  const isSystem = message.sender === "qatoto";

  if (isSystem) {
    return (
      <div className="mx-auto flex max-w-[88%] flex-col gap-1 rounded-xl bg-[#E0F3F1] px-3 py-2">
        <div className="flex items-start gap-2">
          <Image
            src="/icons/verified_24dp_00696E_FILL1_wght400_GRAD0_opsz24.svg"
            width={16}
            height={16}
            alt=""
            className="mt-0.5 shrink-0"
          />
          <p className="text-xs leading-4 text-[#00504D]">
            {message.kind === "text" ? message.text : ""}
          </p>
        </div>
        <span className="text-[10px] text-[#4A6364]">{message.time}</span>
      </div>
    );
  }

  const bubbleClass = isOwn
    ? "self-end bg-[#00696E] text-white"
    : "self-start bg-[#EDEFEF] text-[#191C1C]";

  return (
    <div
      className={`flex max-w-[78%] flex-col gap-1 rounded-2xl p-1.5 ${bubbleClass} ${
        message.kind === "text" ? "px-3 py-2" : ""
      }`}
    >
      {renderContent(message, isOwn)}
      <span
        className={`px-1.5 text-[10px] ${isOwn ? "self-end text-white/70" : "self-start text-[#6F7979]"}`}
      >
        {message.time}
      </span>
    </div>
  );
}

function renderContent(message: ChatMessage, isOwn: boolean) {
  switch (message.kind) {
    case "text":
      return <p className="text-sm leading-5">{message.text}</p>;

    case "image":
      return (
        <>
          <div className="relative aspect-square w-44 overflow-hidden rounded-xl bg-black/10">
            <Image
              src={message.imageSrc}
              fill
              sizes="176px"
              alt={message.caption ?? "Shared image"}
              className="object-cover"
            />
          </div>
          {message.caption && (
            <p className={`px-1.5 text-xs ${isOwn ? "text-white/90" : "text-[#6F7979]"}`}>
              {message.caption}
            </p>
          )}
        </>
      );

    case "video":
      return (
        <>
          <div className="relative aspect-video w-52 overflow-hidden rounded-xl bg-black/10">
            <Image
              src={message.imageSrc}
              fill
              sizes="208px"
              alt={message.caption ?? "Shared video"}
              className="object-cover"
            />
            <span className="absolute inset-0 grid place-items-center">
              <span className="grid size-10 place-items-center rounded-full bg-black/55">
                <Image
                  src="/icons/featured_video_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
                  width={20}
                  height={20}
                  alt=""
                  className="invert"
                />
              </span>
            </span>
          </div>
          {message.caption && (
            <p className={`px-1.5 text-xs ${isOwn ? "text-white/90" : "text-[#6F7979]"}`}>
              {message.caption}
            </p>
          )}
        </>
      );

    case "document":
      return (
        <div className="flex items-center gap-2 px-1.5 py-1">
          <span
            className={`grid size-9 shrink-0 place-items-center rounded-lg ${
              isOwn ? "bg-white/20" : "bg-[#D6E3FF]"
            }`}
          >
            <Image
              src="/icons/description_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              width={20}
              height={20}
              alt=""
              className={isOwn ? "invert" : ""}
            />
          </span>
          <span className="min-w-0">
            <p className="truncate text-sm font-medium">{message.fileName}</p>
            <p className={`text-[11px] ${isOwn ? "text-white/80" : "text-[#6F7979]"}`}>
              {message.fileMeta}
            </p>
          </span>
        </div>
      );

    default: {
      const exhaustiveCheck: never = message;
      return exhaustiveCheck;
    }
  }
}

// Attachment kinds the composer can share. Visual only — no upload is wired up.
const ATTACHMENTS = [
  { label: "Photos", icon: "/icons/add_photo_alternate_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg" },
  { label: "Video", icon: "/icons/video_library_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg" },
  { label: "Catalog / PDF", icon: "/icons/description_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg" },
];

export default function ManufacturerChatSheet({ onClose }: { onClose: () => void }) {
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
          {MESSAGES.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </div>

        {/* Attachment shortcuts */}
        <div className="flex shrink-0 gap-2 overflow-x-auto border-t border-[#CAC4D0]/60 px-4 py-2">
          {ATTACHMENTS.map((attachment) => (
            <button
              key={attachment.label}
              type="button"
              className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-[#191C1C] outline -outline-offset-1 outline-[#6F7979]"
            >
              <Image src={attachment.icon} width={18} height={18} alt="" />
              {attachment.label}
            </button>
          ))}
        </div>

        {/* Composer */}
        <div className="flex shrink-0 items-center gap-2 px-4 pt-1 pb-[calc(12px+env(safe-area-inset-bottom))]">
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M3.4 20.4 21 12 3.4 3.6 3 10l12 2-12 2z" fill="#FAFDFC" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}

"use client";

import Image from "next/image";

import type { ChatMessage } from "@/components/home/store/sheets/manufacturer-chat-sheet/chat-message";

// Attachment sources the composer can open. Each maps to a native file input:
// `accept` filters the picker and `kind` decides which bubble the picked file
// becomes. No backend upload — the file is previewed locally via an object URL
// (UI phase).
type AttachmentSource = {
  label: string;
  icon: string;
  kind: "image" | "video" | "document";
  accept: string;
  multiple?: boolean;
};

const ATTACHMENTS: AttachmentSource[] = [
  {
    label: "Photos",
    icon: "/icons/image_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    kind: "image",
    accept: "image/*",
    multiple: true,
  },
  {
    label: "Video",
    icon: "/icons/video_library_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    kind: "video",
    accept: "video/*",
    multiple: true,
  },
  {
    label: "Upload PDF",
    icon: "/icons/description_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    kind: "document",
    accept: "application/pdf",
    multiple: true,
  },
];

// Human-readable file size for document bubbles, e.g. "4.2 MB".
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let size = bytes / 1024;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

// Turn a freshly-picked File into a chat bubble. Images/videos get a local
// object URL for preview; PDFs show name + size only.
function buildMessageFromFile(kind: AttachmentSource["kind"], file: File): ChatMessage {
  const time = new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const base = { id: crypto.randomUUID(), sender: "buyer" as const, time };

  switch (kind) {
    case "image":
      return { ...base, kind: "image", imageSrc: URL.createObjectURL(file), caption: file.name };
    case "video":
      return { ...base, kind: "video", videoSrc: URL.createObjectURL(file), caption: file.name };
    case "document":
      return {
        ...base,
        kind: "document",
        fileName: file.name,
        fileMeta: `PDF · ${formatFileSize(file.size)}`,
      };
    default: {
      const exhaustiveCheck: never = kind;
      return exhaustiveCheck;
    }
  }
}

// Attachment shortcuts revealed by the composer's plus button. Owns picking
// files and turning them into chat messages; the parent just receives the
// resulting messages and open/closed state.
export default function AttachmentMenu({
  isOpen,
  onOpenChange,
  onMessagesPicked,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onMessagesPicked: (messages: ChatMessage[]) => void;
}) {
  function handleFilesPicked(kind: AttachmentSource["kind"], fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const picked = Array.from(fileList).map((file) => buildMessageFromFile(kind, file));
    onMessagesPicked(picked);
    onOpenChange(false);
  }

  return (
    <>
      {isOpen && (
        <div className="absolute bottom-full left-4 mb-1 flex flex-col items-start gap-1">
          {ATTACHMENTS.map((attachment) => (
            <label
              key={attachment.label}
              className="flex cursor-pointer items-center gap-2 rounded-full bg-background px-3 py-1.5 text-sm text-[#191C1C] outline -outline-offset-1 outline-[#6F7979]"
            >
              <Image src={attachment.icon} width={20} height={20} alt="" />
              {attachment.label}
              <input
                type="file"
                aria-label={attachment.label}
                accept={attachment.accept}
                multiple={attachment.multiple}
                className="hidden"
                onChange={(changeEvent) => {
                  handleFilesPicked(attachment.kind, changeEvent.target.files);
                  changeEvent.target.value = "";
                }}
              />
            </label>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => onOpenChange(!isOpen)}
        aria-label="Add attachment"
        aria-expanded={isOpen}
        className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full transition-colors hover:bg-muted"
      >
        <Image
          src={`/icons/add_circle_24dp_000000_FILL${isOpen ? 1 : 0}_wght400_GRAD0_opsz24.svg`}
          width={26}
          height={26}
          alt=""
        />
      </button>
    </>
  );
}

import Image from "next/image";

import type { ChatMessage } from "@/components/home/store/sheets/manufacturer-chat-sheet/chat-message";

export default function MessageBubble({ message }: { message: ChatMessage }) {
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
              unoptimized={message.imageSrc.startsWith("blob:")}
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
            {message.videoSrc ? (
              <video
                src={message.videoSrc}
                controls
                aria-label={message.caption ?? "Shared video"}
                className="absolute inset-0 size-full object-cover"
              >
                <track kind="captions" />
              </video>
            ) : (
              <>
                <Image
                  src={message.imageSrc ?? ""}
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
              </>
            )}
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

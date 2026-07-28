// TRANSPORT: props-only — client island. Holds interaction state only; all data
// arrives as props from a server parent. Fetches nothing, so it needs no
// QueryProvider. If this ever calls a hook in src/hooks/rnd, relabel it client-query.
"use client";

import Image from "next/image";
import { useState } from "react";

import type { TeamMember, WorkshopChatMessage } from "@/types/research-and-development";

type WorkshopChatProps = {
  initialChatMessages: WorkshopChatMessage[];
  teamMembers: TeamMember[];
};

// Team-chat panel with a working composer (§14.5). Sending appends to the local
// transcript and nothing leaves the browser — messaging, delivery and read
// state are backend-owned later. The composer is a real form rather than a
// decorative div so the interaction is honest about what it does.
export default function WorkshopChat({ initialChatMessages, teamMembers }: WorkshopChatProps) {
  const [chatMessages, setChatMessages] = useState<WorkshopChatMessage[]>(initialChatMessages);
  const [draftMessageText, setDraftMessageText] = useState("");

  const findAuthor = (authorMemberId: string) =>
    teamMembers.find((teamMember) => teamMember.id === authorMemberId);

  const handleSendSubmit = (submitEvent: React.FormEvent) => {
    submitEvent.preventDefault();
    if (draftMessageText.trim() === "") return;
    setChatMessages((currentMessages) => [
      ...currentMessages,
      {
        id: `local-message-${currentMessages.length}`,
        authorMemberId: "viewer",
        sentAtLabel: "Just now",
        messageText: draftMessageText.trim(),
      },
    ]);
    setDraftMessageText("");
  };

  return (
    <div className="max-w-2xl space-y-4 px-4 lg:px-6">
      <div className="space-y-3">
        {chatMessages.map((chatMessage) => {
          const author = findAuthor(chatMessage.authorMemberId);
          const isFromViewer = chatMessage.authorMemberId === "viewer";
          return (
            <div key={chatMessage.id} className="flex items-start gap-2.5">
              {author ? (
                <Image
                  src={author.avatarImageSrc}
                  width={32}
                  height={32}
                  alt={author.name}
                  className="size-8 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#00696E]/10 text-xs font-medium text-[#00696E]">
                  You
                </span>
              )}
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {author?.name ?? (isFromViewer ? "You" : "Teammate")}
                  </span>{" "}
                  · {chatMessage.sentAtLabel}
                </p>
                <p
                  className={`mt-1 w-fit rounded-2xl px-3 py-2 text-sm ${
                    isFromViewer ? "bg-[#00696E]/10" : "bg-muted"
                  }`}
                >
                  {chatMessage.messageText}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSendSubmit} className="flex items-center gap-2">
        <input
          type="text"
          value={draftMessageText}
          onChange={(changeEvent) => setDraftMessageText(changeEvent.target.value)}
          placeholder="Message the team…"
          aria-label="Message the team"
          className="flex-1 rounded-full border border-[#6F7979] bg-transparent px-4 py-2.5 text-sm outline-none focus:border-[#00696E]"
        />
        <button
          type="submit"
          disabled={draftMessageText.trim() === ""}
          className="cursor-pointer rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send
        </button>
      </form>

      <p className="text-xs text-muted-foreground">
        Messages stay in this session — nothing is sent and nobody is notified.
      </p>
    </div>
  );
}

import Image from "next/image";

import type { TeamMember, WorkshopChatMessage } from "@/types/research-and-development";

type WorkshopChatProps = {
  chatMessages: WorkshopChatMessage[];
  teamMembers: TeamMember[];
};

// Team-chat panel: static transcript of the project channel. Display-only
// mock — the composer row is deliberately decorative (a styled div, not an
// input) so nothing pretends to send; messaging is backend-owned later.
export default function WorkshopChat({ chatMessages, teamMembers }: WorkshopChatProps) {
  const findAuthor = (authorMemberId: string) =>
    teamMembers.find((teamMember) => teamMember.id === authorMemberId);

  return (
    <div className="max-w-2xl space-y-4 px-4 lg:px-6">
      <div className="space-y-3">
        {chatMessages.map((chatMessage) => {
          const author = findAuthor(chatMessage.authorMemberId);
          return (
            <div key={chatMessage.id} className="flex items-start gap-2.5">
              {author && (
                <Image
                  src={author.avatarImageSrc}
                  width={32}
                  height={32}
                  alt={author.name}
                  className="size-8 shrink-0 rounded-full object-cover"
                />
              )}
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{author?.name ?? "Teammate"}</span>{" "}
                  · {chatMessage.sentAtLabel}
                </p>
                <p className="mt-1 w-fit rounded-2xl bg-muted px-3 py-2 text-sm">
                  {chatMessage.messageText}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="rounded-full border border-[#6F7979] px-4 py-2.5 text-sm text-muted-foreground">
        Message the team…
      </div>
    </div>
  );
}

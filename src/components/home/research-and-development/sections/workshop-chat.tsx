// TRANSPORT: props-only — presentational server component. Fetches nothing; messages
// and the roster arrive as props from a parent that read GET …/workshop.
import Image from "next/image";

import { formatIsoInstant } from "@/lib/rnd/format";
import type { ProjectTeamMember } from "@/lib/rnd/projects.schemas";
import type { WorkshopChatMessage } from "@/lib/rnd/workshop.schemas";

type WorkshopChatProps = {
  chatMessages: WorkshopChatMessage[];
  teamMembers: ProjectTeamMember[];
};

/**
 * The team-chat transcript, read-only.
 *
 * THE COMPOSER IS GONE, and the component stopped being a client island with it. It
 * appended to `useState` and nothing left the browser — a send button that convincingly
 * "sends" is the most misleading control on this page, because a member could believe
 * they had told their team something. `POST …/workshop/chat` is shipped and this pass
 * is reads-only.
 *
 * `chatMessages` is the recent OLDEST-FIRST slice the workshop snapshot carries; it has
 * no cursor. Older history comes from `GET …/workshop/chat`, whose envelope keys its
 * array `messages` and whose `sentAtMs_id` cursor is opaque — that read lands with the
 * "load older" control, not before.
 */
export default function WorkshopChat({ chatMessages, teamMembers }: WorkshopChatProps) {
  function findAuthor(authorMemberId: string): ProjectTeamMember | undefined {
    return teamMembers.find((teamMember) => teamMember.memberId === authorMemberId);
  }

  return (
    <div className="max-w-2xl space-y-4 px-4 lg:px-6">
      <div className="space-y-3">
        {chatMessages.map((chatMessage) => {
          const author = findAuthor(chatMessage.authorMemberId);
          return (
            <div key={chatMessage.id} className="flex items-start gap-2.5">
              {author?.avatarImageUrl ? (
                <Image
                  src={author.avatarImageUrl}
                  width={32}
                  height={32}
                  alt={author.name}
                  className="size-8 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-xs font-medium">
                  {(author?.name ?? "?").slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">
                  {/* An unresolvable author id renders as a former member, never as an
                      invented name — the roster carries only ACTIVE members. */}
                  <span className="font-medium text-foreground">
                    {author?.name ?? "Former member"}
                  </span>{" "}
                  · {formatIsoInstant(chatMessage.sentAt)}
                  {chatMessage.editedAt && " · edited"}
                </p>
                <p className="mt-1 w-fit rounded-2xl bg-muted px-3 py-2 text-sm">
                  {chatMessage.messageText}
                </p>
              </div>
            </div>
          );
        })}
        {chatMessages.length === 0 && (
          <p className="text-sm text-muted-foreground">No messages yet.</p>
        )}
      </div>
    </div>
  );
}

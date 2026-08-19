// TRANSPORT: props-only — presentational server component. Fetches nothing; messages
// and the roster arrive as props from a parent that read GET …/workshop. Each row is a
// client island, because editing and deleting are the author's own.
import WorkshopChatMessageIsland from "@/components/home/research-and-development/sections/workshop-chat-message-island";
import type { ProjectTeamMember } from "@/lib/rnd/projects.schemas";
import type { WorkshopChatMessage } from "@/lib/rnd/workshop.schemas";

type WorkshopChatProps = {
  projectSlug: string;
  chatMessages: WorkshopChatMessage[];
  teamMembers: ProjectTeamMember[];
};

/**
 * The team-chat transcript.
 *
 * THE COMPOSER IS STILL NOT HERE — it is `workshop-chat-composer.tsx`, mounted beneath
 * this by the page. What changed is that each ROW is now a client island: `editedAt` has
 * always been rendered here and until now nothing in the product could set it, because
 * there was no edit control anywhere. `PATCH` and `DELETE …/workshop/chat/:messageId` are
 * shipped, and the author's own controls live in the island.
 *
 * THIS COMPONENT STAYS A SERVER COMPONENT. It fetches nothing and decides nothing; it
 * resolves each author against the roster and hands one message to one island — the same
 * relationship `funding-tab.tsx` has with the islands it mounts.
 *
 * `chatMessages` is the recent OLDEST-FIRST slice the workshop snapshot carries; it has
 * no cursor. Older history comes from `GET …/workshop/chat`, whose envelope keys its
 * array `messages` and whose `sentAtMs_id` cursor is opaque — that read lands with the
 * "load older" control, not before.
 */
export default function WorkshopChat({
  projectSlug,
  chatMessages,
  teamMembers,
}: WorkshopChatProps) {
  function findAuthor(authorMemberId: string): ProjectTeamMember | undefined {
    return teamMembers.find((teamMember) => teamMember.memberId === authorMemberId);
  }

  return (
    <div className="max-w-2xl space-y-4 px-4 lg:px-6">
      <div className="space-y-3">
        {chatMessages.map((chatMessage) => (
          <WorkshopChatMessageIsland
            key={chatMessage.id}
            projectSlug={projectSlug}
            chatMessage={chatMessage}
            author={findAuthor(chatMessage.authorMemberId)}
          />
        ))}
        {chatMessages.length === 0 && (
          <p className="text-sm text-muted-foreground">No messages yet.</p>
        )}
      </div>
    </div>
  );
}

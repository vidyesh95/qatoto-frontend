// TRANSPORT: client-query — "use client" island. One message row; writes
// PATCH|DELETE …/workshop/chat/:messageId. Needs QueryProvider, which (home)/layout.tsx mounts.
"use client";

import Image from "next/image";
import { useState } from "react";

import { MutationErrorNotice } from "@/components/home/research-and-development/sections/mutation-feedback";
import { useWorkshopChatMessageMutation } from "@/hooks/rnd/workshop";
import { useIsHydrated } from "@/hooks/use-is-hydrated";
import { useSession } from "@/lib/auth-client";
import { ApiRequestError } from "@/lib/http";
import { formatIsoInstant } from "@/lib/rnd/format";
import type { ProjectTeamMember } from "@/lib/rnd/projects.schemas";
import type { WorkshopChatMessage } from "@/lib/rnd/workshop.schemas";

/**
 * One message in the transcript, with its author's own controls.
 *
 * THIS IS WHAT MAKES `editedAt` REACHABLE. The transcript has always rendered "· edited"
 * from that column and nothing in the app could set it, because there was no edit control
 * anywhere — the field described a state the product could not produce.
 *
 * THE OWNERSHIP GATE IS UX, NOT SECURITY. `WorkshopChatMessage` carries `authorMemberId`
 * and the session carries a USER id, so the roster is what bridges them: a member row maps
 * `memberId → userId`. The backend re-authorizes both verbs regardless (CLAUDE.md, "the
 * client is hostile"); hiding the buttons only spares a reader a control that would 403.
 *
 * AND IT WAITS FOR HYDRATION, WHICH IS NOT OPTIONAL HERE. `useSession()` reads a
 * module-level atom that may already have resolved before this island hydrates, so gating
 * markup on it directly renders a different tree on the client than the server sent — the
 * exact bug documented in `use-viewer-avatar-url.ts`, and here it would swap a `<p>` for a
 * `<form>`: an ELEMENT-TYPE mismatch, which React resolves by discarding the subtree.
 * `useIsHydrated()` is false for BOTH the server render and the hydration render, so both
 * emit no controls and agree; the buttons appear on the render after.
 *
 * NOTHING IS OPTIMISTIC. Chat is polled rather than streamed, so an optimistic edit would
 * show a correction the team cannot have seen yet, and an optimistic delete would show the
 * author a message gone from a transcript everybody else still has.
 */
export default function WorkshopChatMessageIsland({
  projectSlug,
  chatMessage,
  author,
}: {
  projectSlug: string;
  chatMessage: WorkshopChatMessage;
  author: ProjectTeamMember | undefined;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftBodyText, setDraftBodyText] = useState(chatMessage.messageText);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const isHydrated = useIsHydrated();
  const { data: session } = useSession();
  const chatMessageMutation = useWorkshopChatMessageMutation(projectSlug);

  const mutationError =
    chatMessageMutation.error instanceof ApiRequestError
      ? chatMessageMutation.error.apiError
      : null;

  // An unresolvable author cannot be the viewer: the roster carries only ACTIVE members, so
  // a message whose author has left has no `userId` to match and correctly offers nothing.
  const isViewerTheAuthor =
    isHydrated && author !== undefined && session?.user.id === author.userId;

  return (
    <div className="flex items-start gap-2.5">
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
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">
          {/* An unresolvable author id renders as a former member, never as an
              invented name — the roster carries only ACTIVE members. */}
          <span className="font-medium text-foreground">{author?.name ?? "Former member"}</span> ·{" "}
          {formatIsoInstant(chatMessage.sentAt)}
          {chatMessage.editedAt && " · edited"}
        </p>

        {isEditing ? (
          <form
            className="mt-1 space-y-1"
            onSubmit={(submitEvent) => {
              submitEvent.preventDefault();
              chatMessageMutation.mutate(
                { action: "update", messageId: chatMessage.id, bodyText: draftBodyText },
                { onSuccess: () => setIsEditing(false) },
              );
            }}
          >
            <textarea
              required
              rows={2}
              value={draftBodyText}
              onChange={(changeEvent) => setDraftBodyText(changeEvent.target.value)}
              className="w-full rounded-xl border border-[#CAC4D0] p-2 text-sm"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={chatMessageMutation.isPending}
                className="cursor-pointer rounded-full bg-[#00696E] px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
              >
                {chatMessageMutation.isPending ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraftBodyText(chatMessage.messageText);
                  setIsEditing(false);
                }}
                className="cursor-pointer rounded-full border border-[#CAC4D0] px-3 py-1 text-xs font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <p className="mt-1 w-fit rounded-2xl bg-muted px-3 py-2 text-sm">
            {chatMessage.messageText}
          </p>
        )}

        {isViewerTheAuthor && !isEditing && (
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="cursor-pointer text-xs text-muted-foreground underline"
            >
              Edit
            </button>
            {isConfirmingDelete ? (
              <>
                <button
                  type="button"
                  disabled={chatMessageMutation.isPending}
                  onClick={() =>
                    chatMessageMutation.mutate({ action: "delete", messageId: chatMessage.id })
                  }
                  className="cursor-pointer text-xs font-medium text-red-700 underline disabled:opacity-50"
                >
                  {chatMessageMutation.isPending ? "Deleting…" : "Really delete"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(false)}
                  className="cursor-pointer text-xs text-muted-foreground underline"
                >
                  Keep it
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
                className="cursor-pointer text-xs text-muted-foreground underline"
              >
                Delete
              </button>
            )}
          </div>
        )}

        {mutationError !== null && (
          <div className="mt-1">
            <MutationErrorNotice error={mutationError} />
          </div>
        )}
      </div>
    </div>
  );
}

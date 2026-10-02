// TRANSPORT: props-only — renders the saved chats it is given and reports what the viewer picks.
"use client";

// THE ASSISTANT'S CHAT LIST: NEW CHAT, THE SAVED ONES, AND THE TWO SETTINGS.
//
// A hairline-free list on the conversation-sidebar pattern: newest first, the title the first
// question gave it, and one meta line saying which model answered and when. The active row wears
// Surface Wash, the shape this product uses for "current" (docs/Design.md §5), plus
// `aria-current`, so the pill is never the only signal.
//
// DELETE IS ALWAYS FINDABLE. On a fine pointer from `lg` up it fades in on hover or focus, the
// desktop convention; on touch, and in the phone-width list, it is always shown, because a control
// that only hover reveals does not exist on a phone, and at the 10-chat limit it is the only way on.
// Deleting asks once, IN THE ROW, not in a dialog: the chat lives only in this browser, so the
// question says that, and Keep is as easy to reach as Delete.
//
// AT THE LIMIT, NEW CHAT BECOMES A SENTENCE. Nothing is evicted to make room: removing the oldest
// chat to fit a new one would delete the viewer's data without asking.

import { useEffect, useRef, useState } from "react";

import Image from "next/image";

import { ASSISTANT_MODEL_NAMES } from "@/components/assistant/assistant-brain-state";
import {
  ASSISTANT_CONVERSATION_LIMIT,
  type AssistantConversation,
} from "@/lib/assistant/assistant-conversation.schemas";

export type AssistantSettingsView = "memory" | "appearance";

const FOCUS_RING_CLASS_NAME =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint";

const QUIET_ROW_BUTTON_CLASS_NAME = `flex w-full cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-left text-sm leading-5 font-medium text-foreground transition-colors hover:bg-muted ${FOCUS_RING_CLASS_NAME}`;

const sameDayTimeFormat = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});
const otherDayDateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

/** "2:05 PM" for today, "Oct 1" before that. Exact, never "a while ago". */
function formatConversationTime(updatedAtMs: number, listedAtMs: number): string {
  const updatedAt = new Date(updatedAtMs);
  const listedAt = new Date(listedAtMs);
  const isSameDay =
    updatedAt.getFullYear() === listedAt.getFullYear() &&
    updatedAt.getMonth() === listedAt.getMonth() &&
    updatedAt.getDate() === listedAt.getDate();
  return isSameDay ? sameDayTimeFormat.format(updatedAt) : otherDayDateFormat.format(updatedAt);
}

export default function AssistantConversationRail({
  conversations,
  activeConversationId,
  isDraftActive,
  isConversationListFull,
  listedAtMs,
  activeSettingsView,
  memoryNoteCount,
  onSelectConversation,
  onStartNewChat,
  onDeleteConversation,
  onOpenSettings,
}: {
  /** Already newest first. */
  readonly conversations: readonly AssistantConversation[];
  readonly activeConversationId: string;
  readonly isDraftActive: boolean;
  readonly isConversationListFull: boolean;
  /** When the panel opened; "today" in the meta line is measured from here. */
  readonly listedAtMs: number;
  readonly activeSettingsView: AssistantSettingsView | null;
  readonly memoryNoteCount: number;
  readonly onSelectConversation: (conversationId: string) => void;
  readonly onStartNewChat: () => void;
  readonly onDeleteConversation: (conversationId: string) => void;
  readonly onOpenSettings: (settingsView: AssistantSettingsView) => void;
}) {
  const [confirmingDeleteConversationId, setConfirmingDeleteConversationId] = useState<
    string | null
  >(null);
  const keepButtonRef = useRef<HTMLButtonElement>(null);

  // The confirm replaces the row whose delete button had focus; without moving focus to Keep, it
  // would fall to <body>. Keep, not Delete, so a second Enter cannot delete by accident.
  useEffect(() => {
    if (confirmingDeleteConversationId !== null) keepButtonRef.current?.focus();
  }, [confirmingDeleteConversationId]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-2 pt-2">
        {isConversationListFull ? (
          <p className="px-3 py-2 text-xs leading-4 text-muted-foreground">
            {ASSISTANT_CONVERSATION_LIMIT} chats are saved in this browser. Delete one to start
            another.
          </p>
        ) : (
          <button
            type="button"
            onClick={onStartNewChat}
            aria-current={isDraftActive && activeSettingsView === null ? "true" : undefined}
            className={`${QUIET_ROW_BUTTON_CLASS_NAME} aria-[current=true]:bg-primary`}
          >
            <Image
              src="/icons/add_circle_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              alt=""
              width={18}
              height={18}
            />
            New chat
          </button>
        )}
      </div>

      <nav aria-label="Saved chats" className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {conversations.length > 0 && (
          <ul className="space-y-0.5">
            {conversations.map((conversation) => {
              const isActive =
                conversation.conversationId === activeConversationId && activeSettingsView === null;
              const isConfirmingDelete =
                conversation.conversationId === confirmingDeleteConversationId;
              const modelName =
                conversation.lockedModel === null
                  ? null
                  : ASSISTANT_MODEL_NAMES[conversation.lockedModel];
              const timeLabel = formatConversationTime(conversation.updatedAtMs, listedAtMs);

              if (isConfirmingDelete) {
                return (
                  <li
                    key={conversation.conversationId}
                    className="space-y-2 rounded-2xl bg-muted px-3 py-2.5"
                  >
                    <p className="text-xs leading-4 text-foreground">
                      <span className="font-medium">Delete “{conversation.title}”?</span> It is only
                      in this browser, so it can&apos;t be recovered.
                    </p>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmingDeleteConversationId(null);
                          onDeleteConversation(conversation.conversationId);
                        }}
                        className={`cursor-pointer rounded-full bg-destructive px-3 py-1.5 text-xs leading-4 font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 ${FOCUS_RING_CLASS_NAME}`}
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        ref={keepButtonRef}
                        onClick={() => setConfirmingDeleteConversationId(null)}
                        className={`cursor-pointer rounded-full px-3 py-1.5 text-xs leading-4 font-medium text-foreground transition-colors hover:bg-muted ${FOCUS_RING_CLASS_NAME}`}
                      >
                        Keep
                      </button>
                    </div>
                  </li>
                );
              }

              return (
                <li key={conversation.conversationId} className="group/chat-row relative">
                  <button
                    type="button"
                    onClick={() => onSelectConversation(conversation.conversationId)}
                    aria-current={isActive ? "true" : undefined}
                    className={`block w-full cursor-pointer rounded-2xl py-2 pr-10 pl-3 text-left transition-colors hover:bg-muted aria-[current=true]:bg-primary ${FOCUS_RING_CLASS_NAME}`}
                  >
                    <span className="block truncate text-sm leading-5 font-medium text-foreground">
                      {conversation.title}
                    </span>
                    <span className="block truncate text-xs leading-4 text-muted-foreground">
                      {`${modelName ?? "No model yet"} · ${timeLabel}`}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDeleteConversationId(conversation.conversationId)}
                    className={`absolute top-1/2 right-1.5 -translate-y-1/2 cursor-pointer rounded-full p-1.5 transition-[opacity,background-color] hover:bg-background lg:pointer-fine:opacity-0 lg:pointer-fine:group-focus-within/chat-row:opacity-100 lg:pointer-fine:group-hover/chat-row:opacity-100 ${FOCUS_RING_CLASS_NAME}`}
                  >
                    <Image
                      src="/icons/delete_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                      alt=""
                      width={18}
                      height={18}
                    />
                    <span className="sr-only">Delete chat: {conversation.title}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      <div className="space-y-0.5 border-t border-border px-2 py-2">
        <button
          type="button"
          onClick={() => onOpenSettings("memory")}
          aria-current={activeSettingsView === "memory" ? "true" : undefined}
          className={`${QUIET_ROW_BUTTON_CLASS_NAME} aria-[current=true]:bg-primary`}
        >
          <Image
            src="/icons/history_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt=""
            width={18}
            height={18}
          />
          <span className="flex-1">Memory</span>
          <span className="text-xs leading-4 text-muted-foreground">{memoryNoteCount}</span>
        </button>
        <button
          type="button"
          onClick={() => onOpenSettings("appearance")}
          aria-current={activeSettingsView === "appearance" ? "true" : undefined}
          className={`${QUIET_ROW_BUTTON_CLASS_NAME} aria-[current=true]:bg-primary`}
        >
          <Image
            src="/icons/settings_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt=""
            width={18}
            height={18}
          />
          Appearance
        </button>
      </div>
    </div>
  );
}

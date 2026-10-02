// TRANSPORT: props-only — renders the conversation held by `use-assistant-brain.ts`.
"use client";

// ONE CONVERSATION, RENDERED BY AN EXHAUSTIVE SWITCH.
//
// Six kinds of answer: pending, failed, a model's answer, a ROUTER match (a card, no model), and
// the router-only reply for when nothing could answer ("only places and searches work here"),
// which offers the places that share a word with the question.
//
// Each assistant entry is pending, answered or failed, never two at once. An answered reply shows
// its text, then whatever it OFFERED: a link to one place, the results of one search (labelled as a
// search, so three links are not mistaken for the model's own knowledge), and a note it could
// remember if the viewer says so. Nothing here navigates, searches or saves on its own.
//
// Answers this browser could not keep say so under the answer, once each: the panel promises chats
// are saved here, so a refused write is told, not swallowed.
//
// Which model answered is said ONCE, by the chat's header, not under every answer: a chat's model
// is locked by its first answer, so every answer in it came from the same one.
//
// Streaming text is NOT in a live region — a screen reader would announce every word. The panel
// owns one polite region that receives each finished reply once.

import Link from "next/link";

import type {
  AssistantMessage,
  AssistantSaveProblem,
  AssistantSearchState,
} from "@/components/assistant/use-assistant-brain";
import AssistantActionCard from "@/components/assistant/assistant-action-card";
import { ASSISTANT_CHIP_CLASS_NAME } from "@/components/assistant/assistant-panel-sections";
import {
  ASSISTANT_CONVERSATION_LIMIT,
  ASSISTANT_CONVERSATION_MESSAGE_LIMIT,
} from "@/lib/assistant/assistant-conversation.schemas";
import { ASSISTANT_DESTINATIONS } from "@/lib/assistant/assistant-destinations";
import { ASSISTANT_SEARCH_SCOPE_LABELS } from "@/lib/assistant/assistant-search";

export default function AssistantMessageList({
  messages,
  memoryNotes,
  onSaveNote,
  onNavigate,
}: {
  readonly messages: readonly AssistantMessage[];
  readonly memoryNotes: readonly string[];
  readonly onSaveNote: (memoryNote: string) => void;
  readonly onNavigate: () => void;
}) {
  return (
    <ol className="space-y-3">
      {messages.map((message) => (
        <li key={message.messageKey}>
          <AssistantMessageItem
            message={message}
            memoryNotes={memoryNotes}
            onSaveNote={onSaveNote}
            onNavigate={onNavigate}
          />
        </li>
      ))}
    </ol>
  );
}

function AssistantMessageItem({
  message,
  memoryNotes,
  onSaveNote,
  onNavigate,
}: {
  readonly message: AssistantMessage;
  readonly memoryNotes: readonly string[];
  readonly onSaveNote: (memoryNote: string) => void;
  readonly onNavigate: () => void;
}) {
  if (message.role === "user") {
    return (
      <p className="ml-8 rounded-xl bg-muted px-3 py-2 text-sm leading-5 font-medium break-words whitespace-pre-wrap text-foreground">
        <span className="sr-only">You: </span>
        {message.text}
      </p>
    );
  }

  switch (message.status) {
    case "pending":
      return (
        <p className="mr-8 text-sm leading-5 font-medium break-words whitespace-pre-wrap text-foreground">
          {message.partialText.length > 0 ? (
            message.partialText
          ) : (
            <span className="text-muted-foreground">Thinking…</span>
          )}
        </p>
      );
    case "failed":
      return (
        <p className="mr-8 text-sm leading-5 font-medium text-muted-foreground">
          {message.message}
        </p>
      );
    case "routed":
      return (
        <div className="mr-8 space-y-2">
          <AssistantActionCard
            offer={message.routerMatch}
            isFromRouter
            onNavigate={onNavigate}
          />
          {message.saveProblem !== null && (
            <p className="text-xs leading-4 text-destructive">
              {describeSaveProblem(message.saveProblem)}
            </p>
          )}
        </div>
      );
    case "unrouted":
      return (
        <div className="mr-8 space-y-2">
          <p className="text-sm leading-5 font-medium text-muted-foreground">{message.message}</p>
          {message.nearbyDestinationKeys.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label="Places that might help">
              {message.nearbyDestinationKeys.map((destinationKey) => (
                <li key={destinationKey}>
                  <Link
                    href={ASSISTANT_DESTINATIONS[destinationKey].href}
                    onClick={onNavigate}
                    className={ASSISTANT_CHIP_CLASS_NAME}
                  >
                    {ASSISTANT_DESTINATIONS[destinationKey].label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    case "answered": {
      const destinationKey = message.reply.destinationKey;
      const rememberNote = message.reply.rememberNote;
      const isNoteSaved = rememberNote !== null && memoryNotes.includes(rememberNote);
      return (
        <div className="mr-8 space-y-2">
          <p className="text-sm leading-5 font-medium break-words whitespace-pre-wrap text-foreground">
            {message.reply.reply}
          </p>
          {message.saveProblem !== null && (
            <p className="text-xs leading-4 text-destructive">
              {describeSaveProblem(message.saveProblem)}
            </p>
          )}
          {destinationKey !== null && (
            <AssistantActionCard
              offer={{ kind: "destination", destinationKey }}
              isFromRouter={false}
              onNavigate={onNavigate}
            />
          )}
          <SearchBlock searchState={message.search} onNavigate={onNavigate} />
          {rememberNote !== null &&
            (isNoteSaved ? (
              <p className="text-xs leading-4 text-muted-foreground">Saved to memory.</p>
            ) : (
              <button
                type="button"
                onClick={() => onSaveNote(rememberNote)}
                className={`cursor-pointer text-left ${ASSISTANT_CHIP_CLASS_NAME}`}
              >
                Remember: {rememberNote}
              </button>
            ))}
        </div>
      );
    }
    default: {
      const exhaustiveCheck: never = message;
      return exhaustiveCheck;
    }
  }
}

function describeSaveProblem(saveProblem: AssistantSaveProblem): string {
  switch (saveProblem) {
    case "storage_refused":
      return "Couldn't save this chat in this browser. Storage is full or blocked.";
    case "list_full":
      return `Not saved: ${ASSISTANT_CONVERSATION_LIMIT} chats are already saved in this browser. Delete one to keep new ones.`;
    case "conversation_full":
      return `Not saved: this chat already holds ${ASSISTANT_CONVERSATION_MESSAGE_LIMIT} messages.`;
    case "model_mismatch":
      return "Not saved: this chat answers with the other model.";
    default: {
      const exhaustiveCheck: never = saveProblem;
      return exhaustiveCheck;
    }
  }
}

function SearchBlock({
  searchState,
  onNavigate,
}: {
  readonly searchState: AssistantSearchState;
  readonly onNavigate: () => void;
}) {
  switch (searchState.status) {
    case "none":
      return null;
    case "loading":
      return (
        <p className="text-xs leading-4 text-muted-foreground">
          Searching {ASSISTANT_SEARCH_SCOPE_LABELS[searchState.scope]} for “{searchState.query}”…
        </p>
      );
    case "failed":
      return (
        <p className="text-xs leading-4 text-muted-foreground">
          Could not search {ASSISTANT_SEARCH_SCOPE_LABELS[searchState.scope]} for “
          {searchState.query}” just now.
        </p>
      );
    case "done":
      return (
        <div className="space-y-1">
          <p className="text-xs leading-4 text-muted-foreground">
            {searchState.results.length === 0
              ? `Nothing in ${ASSISTANT_SEARCH_SCOPE_LABELS[searchState.scope]} matches “${searchState.query}”.`
              : `Searched ${ASSISTANT_SEARCH_SCOPE_LABELS[searchState.scope]} for “${searchState.query}”:`}
          </p>
          {searchState.results.length > 0 && (
            <ul className="space-y-1">
              {searchState.results.map((searchResult) => (
                <li key={searchResult.href}>
                  <Link
                    href={searchResult.href}
                    onClick={onNavigate}
                    className="text-xs leading-4 font-medium text-foreground underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint"
                  >
                    {searchResult.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    default: {
      const exhaustiveCheck: never = searchState;
      return exhaustiveCheck;
    }
  }
}

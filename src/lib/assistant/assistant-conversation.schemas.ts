// TRANSPORT: props-only — schemas and pure operations. No fetching, no React, no DOM.
//
// THE ASSISTANT'S SAVED CHATS, AND THE ONLY WAYS THEY CHANGE.
//
// Chats live in the ONE browser-preferences key (`src/lib/browser-preferences.ts`), never a second
// key and never IndexedDB: the privacy policy tells readers there is one key and the data panel
// erases exactly that one. That makes these limits a budget, not a preference. The whole blob is
// read and parsed on app load, so a chat list that grows without bound is jank on every page.
// `scripts/build-assistant-worst-case-preferences.mjs` builds the blob at these limits and its
// header says how the parse was measured.
//
// ONLY ANSWERED TURNS ARE SAVED. A question is written together with its answer, as one pair, and
// only once the answer has arrived. A pending reply is not a result and a failed one is not worth
// keeping, so neither survives a reload: a chat restored from storage can never show a "Thinking…"
// that nothing will ever finish.
//
// A CHAT'S MODEL IS LOCKED BY ITS FIRST ANSWER, FOR GOOD. There is deliberately no unlock. A viewer
// who chatted with Gemini Nano was told nothing they typed leaves the device; switching that chat to
// the cloud would send its whole history to Google. The way out is a new chat with the other model.
//
// A NEW CHAT IS NOT SAVED UNTIL IT HAS AN ANSWER. Until then it is a draft id held in memory, so an
// opened-and-abandoned chat costs nothing and never counts against the limit.
//
// No directive: `browser-preferences.ts` is read from server-rendered code and imports this.

import { z } from "zod";

import {
  ASSISTANT_TURN_TEXT_MAXIMUM_LENGTH,
  AssistantReplySchema,
  type AssistantReply,
} from "@/lib/assistant/assistant-reply.schemas";

/** How many chats one browser keeps. The 11th needs one deleted first; nothing is evicted. */
export const ASSISTANT_CONVERSATION_LIMIT = 10;
/** Messages per chat, which is 10 question-and-answer pairs. */
export const ASSISTANT_CONVERSATION_MESSAGE_LIMIT = 20;
export const ASSISTANT_CONVERSATION_TITLE_MAXIMUM_LENGTH = 40;

/** Which model answered. The same two words `use-assistant-brain.ts` calls a chat route. */
export const ASSISTANT_MODEL_ROUTES = ["on_device", "cloud"] as const;
export type AssistantModelRoute = (typeof ASSISTANT_MODEL_ROUTES)[number];

const SavedUserMessageSchema = z.object({
  role: z.literal("user"),
  text: z.string().trim().min(1).max(ASSISTANT_TURN_TEXT_MAXIMUM_LENGTH),
});

const SavedAssistantMessageSchema = z.object({
  role: z.literal("assistant"),
  reply: AssistantReplySchema,
  answeredBy: z.enum(ASSISTANT_MODEL_ROUTES),
});

export const SavedAssistantConversationMessageSchema = z.discriminatedUnion("role", [
  SavedUserMessageSchema,
  SavedAssistantMessageSchema,
]);
export type SavedAssistantConversationMessage = z.infer<
  typeof SavedAssistantConversationMessageSchema
>;

export const AssistantConversationSchema = z.object({
  conversationId: z.uuid(),
  title: z.string().trim().min(1).max(ASSISTANT_CONVERSATION_TITLE_MAXIMUM_LENGTH),
  createdAtMs: z.number().int().nonnegative(),
  updatedAtMs: z.number().int().nonnegative(),
  /** Null only in a value this file never writes: a saved chat always has its first answer. */
  lockedModel: z.enum(ASSISTANT_MODEL_ROUTES).nullable(),
  messages: z
    .array(SavedAssistantConversationMessageSchema)
    .max(ASSISTANT_CONVERSATION_MESSAGE_LIMIT),
});
export type AssistantConversation = z.infer<typeof AssistantConversationSchema>;

export const AssistantConversationListSchema = z
  .array(AssistantConversationSchema)
  .max(ASSISTANT_CONVERSATION_LIMIT);

/**
 * THE LIST AS THE BLOB STORES IT: UNVALIDATED ON LOAD, TOLERANT ONE CHAT AT A TIME ON READ.
 *
 * `browser-preferences.ts` keeps this field as `unknown[]` and does not validate it on app load
 * (its comment has the measurement). These two functions do it when the panel reads the chats.
 *
 * One chat this build cannot read (an older shape, a hand edit in devtools) costs that chat alone:
 * it is dropped, and anything past the limit is cut rather than refused. The blob's own schema
 * fails as a whole, so validating chats there would let one bad chat reset the viewer's language,
 * country and memory notes as well.
 */
export function parseStoredConversations(
  storedConversations: readonly unknown[],
): readonly AssistantConversation[] {
  return storedConversations
    .flatMap((storedConversation) => {
      const parsedConversation = AssistantConversationSchema.safeParse(storedConversation);
      return parsedConversation.success ? [parsedConversation.data] : [];
    })
    .slice(0, ASSISTANT_CONVERSATION_LIMIT);
}

/**
 * Keyed by the stored array itself. The preferences snapshot keeps the same array until the stored
 * string changes, so every render between two writes reuses one validation instead of repeating it.
 */
const parsedConversationsByStoredArray = new WeakMap<
  readonly unknown[],
  readonly AssistantConversation[]
>();

/** The saved chats, validated on first read and cached. The only way components should read them. */
export function readAssistantConversations(
  storedConversations: readonly unknown[],
): readonly AssistantConversation[] {
  const cachedConversations = parsedConversationsByStoredArray.get(storedConversations);
  if (cachedConversations !== undefined) return cachedConversations;
  const parsedConversations = parseStoredConversations(storedConversations);
  parsedConversationsByStoredArray.set(storedConversations, parsedConversations);
  return parsedConversations;
}

/**
 * The title a chat is listed under: its first question, whitespace collapsed, cut to fit. Derived
 * here rather than asked of a model, so it costs nothing and cannot be invented.
 */
export function buildConversationTitle(firstQuestionText: string): string {
  const collapsedText = firstQuestionText.trim().replace(/\s+/g, " ");
  if (collapsedText.length <= ASSISTANT_CONVERSATION_TITLE_MAXIMUM_LENGTH) return collapsedText;
  return `${collapsedText.slice(0, ASSISTANT_CONVERSATION_TITLE_MAXIMUM_LENGTH - 1).trimEnd()}…`;
}

/** A chat with no room for one more question and its answer. */
export function isConversationFull(conversation: AssistantConversation): boolean {
  return conversation.messages.length + 2 > ASSISTANT_CONVERSATION_MESSAGE_LIMIT;
}

export function isConversationListFull(conversations: readonly AssistantConversation[]): boolean {
  return conversations.length >= ASSISTANT_CONVERSATION_LIMIT;
}

/** The first saved form of a chat, written together with its first answer. */
export function createConversation({
  conversationId,
  questionText,
  reply,
  answeredBy,
  nowMs,
}: {
  readonly conversationId: string;
  readonly questionText: string;
  readonly reply: AssistantReply;
  readonly answeredBy: AssistantModelRoute;
  readonly nowMs: number;
}): AssistantConversation {
  return {
    conversationId,
    title: buildConversationTitle(questionText),
    createdAtMs: nowMs,
    updatedAtMs: nowMs,
    lockedModel: answeredBy,
    messages: [
      { role: "user", text: questionText },
      { role: "assistant", reply, answeredBy },
    ],
  };
}

export type AppendAnsweredPairResult =
  | { readonly status: "saved"; readonly conversations: readonly AssistantConversation[] }
  /** The chat already holds its 10 pairs. */
  | { readonly status: "conversation_full" }
  /** A new chat, and this browser already keeps its 10. */
  | { readonly status: "list_full" }
  /** The chat is locked to the other model. Only reachable through a hand-edited blob. */
  | { readonly status: "model_mismatch" };

/**
 * Saves one answered question into the list, creating the chat if this is its first answer.
 *
 * Applied to a FRESH read of storage at write time (`updatePreference`), matched by id, so a chat
 * another tab saved a moment ago is carried through rather than overwritten by a stale list.
 */
export function appendAnsweredPair(
  conversations: readonly AssistantConversation[],
  {
    conversationId,
    questionText,
    reply,
    answeredBy,
    nowMs,
  }: {
    readonly conversationId: string;
    readonly questionText: string;
    readonly reply: AssistantReply;
    readonly answeredBy: AssistantModelRoute;
    readonly nowMs: number;
  },
): AppendAnsweredPairResult {
  const existingConversation = conversations.find(
    (conversation) => conversation.conversationId === conversationId,
  );

  if (existingConversation === undefined) {
    if (isConversationListFull(conversations)) return { status: "list_full" };
    return {
      status: "saved",
      conversations: [
        ...conversations,
        createConversation({ conversationId, questionText, reply, answeredBy, nowMs }),
      ],
    };
  }

  if (isConversationFull(existingConversation)) return { status: "conversation_full" };
  if (
    existingConversation.lockedModel !== null &&
    existingConversation.lockedModel !== answeredBy
  ) {
    return { status: "model_mismatch" };
  }

  const updatedConversation: AssistantConversation = {
    ...existingConversation,
    updatedAtMs: nowMs,
    lockedModel: existingConversation.lockedModel ?? answeredBy,
    messages: [
      ...existingConversation.messages,
      { role: "user", text: questionText },
      { role: "assistant", reply, answeredBy },
    ],
  };
  return {
    status: "saved",
    conversations: conversations.map((conversation) =>
      conversation.conversationId === conversationId ? updatedConversation : conversation,
    ),
  };
}

export function deleteConversation(
  conversations: readonly AssistantConversation[],
  conversationId: string,
): readonly AssistantConversation[] {
  return conversations.filter((conversation) => conversation.conversationId !== conversationId);
}

/** Newest activity first, the order the rail lists them in. */
export function sortConversationsByRecency(
  conversations: readonly AssistantConversation[],
): readonly AssistantConversation[] {
  return conversations.toSorted(
    (leftConversation, rightConversation) =>
      rightConversation.updatedAtMs - leftConversation.updatedAtMs,
  );
}

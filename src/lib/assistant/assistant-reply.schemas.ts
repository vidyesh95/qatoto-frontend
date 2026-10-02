// TRANSPORT: props-only — schemas only. No fetching, no React, no DOM.
//
// ONE REPLY SHAPE FOR BOTH BRAINS.
//
// Chrome's on-device model and Gemini in the cloud both answer with this object, so the panel has
// one thing to render whichever answered. Both are CONSTRAINED to it — the device by
// `responseConstraint` (the JSON Schema exported below), the cloud by the backend's `responseSchema`
// — and both are PARSED with it here anyway, because constrained decoding is a strong hint, not a
// trust boundary (AGENTS.md Pattern 2).
//
// `reply` IS LAST ON PURPOSE. Constrained decoding writes properties in schema order, so while the
// on-device model streams, everything the panel needs to act on has already arrived and the reply
// text streams in at the end, where `extractStreamingReplyText` can surface it word by word.
//
// THE MODEL CHOOSES; THE CLIENT DECIDES. `destinationKey` renders as a link the viewer clicks,
// `search` runs one public search the viewer could have typed themselves, and `rememberNote` is an
// offer the viewer must accept. Nothing in this object makes anything happen on its own.

import { z } from "zod";

import { ASSISTANT_DESTINATION_KEYS } from "@/lib/assistant/assistant-destinations";

/** The expressions a reply may ask the mascot to wear. A subset: no reply should look disgusted. */
export const ASSISTANT_REPLY_EXPRESSIONS = [
  "neutral",
  "joy",
  "excited",
  "thinking",
  "surprised",
  "sad",
  "embarrassed",
  "pouting",
  "enlightened",
] as const;

export const ASSISTANT_SEARCH_SCOPES = ["store", "videos", "research_programs"] as const;
export type AssistantSearchScope = (typeof ASSISTANT_SEARCH_SCOPES)[number];

export const ASSISTANT_REPLY_MAXIMUM_LENGTH = 800;
export const ASSISTANT_SEARCH_QUERY_MAXIMUM_LENGTH = 80;
export const ASSISTANT_REMEMBER_NOTE_MAXIMUM_LENGTH = 200;

export const AssistantReplySchema = z.object({
  expression: z.enum(ASSISTANT_REPLY_EXPRESSIONS),
  destinationKey: z.enum(ASSISTANT_DESTINATION_KEYS).nullable(),
  search: z
    .object({
      scope: z.enum(ASSISTANT_SEARCH_SCOPES),
      query: z.string().trim().min(1).max(ASSISTANT_SEARCH_QUERY_MAXIMUM_LENGTH),
    })
    .nullable(),
  rememberNote: z.string().trim().min(1).max(ASSISTANT_REMEMBER_NOTE_MAXIMUM_LENGTH).nullable(),
  reply: z.string().trim().min(1).max(ASSISTANT_REPLY_MAXIMUM_LENGTH),
});

export type AssistantReply = z.infer<typeof AssistantReplySchema>;

/** For Chrome's `responseConstraint`. Generated, so it cannot drift from the parser above. */
export const ASSISTANT_REPLY_JSON_SCHEMA = z.toJSONSchema(AssistantReplySchema);

/** One turn of the conversation, as both brains receive it. */
export interface AssistantConversationTurn {
  readonly role: "user" | "assistant";
  readonly text: string;
}

/** How much history is sent with each question. The backend refuses more. */
export const ASSISTANT_HISTORY_TURN_LIMIT = 10;
export const ASSISTANT_TURN_TEXT_MAXIMUM_LENGTH = 800;

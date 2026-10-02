// TRANSPORT: client-query — writes POST /assistant/replies (200, synchronous, stateless).
//
// THE CLOUD BRAIN: GEMINI FLASH-LITE, THROUGH QATOTO, FOR SIGNED-IN PEOPLE.
//
// Used only when Chrome's on-device model is not available (or still downloading). The request
// carries the conversation so far, the page the viewer is on and their saved notes; the SERVER
// writes the instructions around them, so this route cannot be repurposed as a free general model.
// The backend stores none of it.
//
// Every refusal is a value (AGENTS.md Pattern 3): 401 asks the viewer to sign in, 403 to finish
// signing up (an anonymous session), 429 says they have asked a lot, 503 says the model is not
// reachable. `use-assistant-brain.ts` turns those codes into the panel's states.

import {
  AssistantReplySchema,
  type AssistantConversationTurn,
  type AssistantReply,
} from "@/lib/assistant/assistant-reply.schemas";
import { sendJson, type ActionResponse } from "@/lib/http";

/** Above the backend's own 15 s model timeout, so its 503 arrives before ours fires. */
const CLOUD_REPLY_TIMEOUT_MS = 20_000;

export function requestCloudReply(input: {
  readonly messages: readonly AssistantConversationTurn[];
  readonly pathname: string;
  readonly memoryNotes: readonly string[];
}): Promise<ActionResponse<AssistantReply>> {
  return sendJson("/assistant/replies", "POST", input, AssistantReplySchema, {
    timeoutMs: CLOUD_REPLY_TIMEOUT_MS,
  });
}

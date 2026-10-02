// TRANSPORT: client-query — writes POST /assistant/replies (200, synchronous, stateless).
//
// THE CLOUD BRAIN: GEMINI, THROUGH QATOTO, FOR PREMIUM AI ACCOUNTS ONLY.
//
// Used only when Chrome's on-device model is not available (or still downloading), and only for
// an account holding Premium AI (`assistant_cloud_entitlement`, granted by Qatoto's admins). It
// spends Qatoto's Gemini key, which is why everyone else chats on their own device or not at all. The request
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
import { z } from "zod";

import { getJson, sendJson, type ActionResponse, type ApiError } from "@/lib/http";

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

const CloudAccessSchema = z.object({ hasCloudAccess: z.boolean() });

/** `GET /assistant/cloud-access` — does the signed-in caller have Premium AI? */
export function getAssistantCloudAccess(): Promise<ActionResponse<{ hasCloudAccess: boolean }>> {
  return getJson("/assistant/cloud-access", CloudAccessSchema);
}

const PremiumRequiredDetailsSchema = z.object({ reason: z.literal("premium_required") });

/**
 * Tells the backend's two 403s apart: "this account has no Premium AI" carries
 * `data.reason: "premium_required"`; the anonymous-account refusal carries no reason.
 */
export function isPremiumRequiredError(error: ApiError): boolean {
  return error.code === "403" && PremiumRequiredDetailsSchema.safeParse(error.details).success;
}

// TRANSPORT: props-only — pure state shapes. No React, no DOM, no network.
//
// WHICH MODEL ANSWERS A CHAT, AND WHETHER IT CAN.
//
// Two independent inputs: what Chrome says about its on-device model, and whether the viewer's
// account holds Premium AI. Each becomes one model OPTION the picker lists (available, downloadable,
// downloading, unavailable with a reason, or still checking). A chat then resolves to exactly one
// state, so the panel cannot draw a download button and a composer that sends nowhere at the same
// time (AGENTS.md Pattern 1).
//
// THE VIEWER CHOOSES THE MODEL, PER CHAT. A new chat starts with their last pick, or, with no pick,
// with Gemini Nano when this browser has it or can download it (nothing leaves the device and it is
// free for everyone), then with the cloud for a Premium AI account. A pick that is not usable right
// now (the cloud after signing out) falls back to that same order rather than stranding the chat.
//
// A CHAT'S FIRST MODEL ANSWER LOCKS ITS MODEL, AND THERE IS NO UNLOCK. Moving a Gemini Nano chat to the
// cloud would send a history the viewer was told never leaves the device. When the locked model is
// not available here any more, no model answers in it (the router still takes places and searches)
// and the way on is a new chat.
//
// THE CLOUD (Google Gemini through Qatoto) IS PREMIUM AI ONLY: it spends Qatoto's key. Apple's and
// Samsung's on-device models have no web API, so there is no third model to list.

import {
  ASSISTANT_CONVERSATION_LIMIT,
  ASSISTANT_CONVERSATION_MESSAGE_LIMIT,
  type AssistantModelRoute,
} from "@/lib/assistant/assistant-conversation.schemas";
import type { AssistantPreferredModel } from "@/lib/browser-preferences";

export type OnDeviceModelStatus =
  | { readonly status: "checking" }
  | { readonly status: "ready" }
  | { readonly status: "downloadable" }
  | { readonly status: "downloading"; readonly progressPercent: number | null }
  | { readonly status: "unavailable" };

/** What the viewer's account allows on the cloud route. `anonymous` is a guest session. */
export type ViewerCloudAccess =
  | { readonly status: "checking" }
  | { readonly status: "signed_out" }
  | { readonly status: "anonymous" }
  | { readonly status: "not_premium" }
  | { readonly status: "premium" };

/** The cloud route's refusals that end it for this account (`use-assistant-brain.ts`). */
export type NoChatReason = "signed_out" | "anonymous" | "not_premium";

/** Why a model cannot answer here. `not_in_browser` is the on-device model's only one. */
export type ModelUnavailableReason = "not_in_browser" | NoChatReason;

export type ModelOptionAvailability =
  | { readonly status: "checking" }
  | { readonly status: "available" }
  | { readonly status: "downloadable" }
  | { readonly status: "downloading"; readonly progressPercent: number | null }
  | { readonly status: "unavailable"; readonly reason: ModelUnavailableReason };

export interface AssistantModelAvailability {
  readonly on_device: ModelOptionAvailability;
  readonly cloud: ModelOptionAvailability;
}

export function readModelAvailability({
  onDeviceModelStatus,
  viewerCloudAccess,
}: {
  readonly onDeviceModelStatus: OnDeviceModelStatus;
  readonly viewerCloudAccess: ViewerCloudAccess;
}): AssistantModelAvailability {
  return {
    on_device: readOnDeviceAvailability(onDeviceModelStatus),
    cloud: readCloudAvailability(viewerCloudAccess),
  };
}

function readOnDeviceAvailability(
  onDeviceModelStatus: OnDeviceModelStatus,
): ModelOptionAvailability {
  switch (onDeviceModelStatus.status) {
    case "checking":
      return { status: "checking" };
    case "ready":
      return { status: "available" };
    case "downloadable":
      return { status: "downloadable" };
    case "downloading":
      return {
        status: "downloading",
        progressPercent: onDeviceModelStatus.progressPercent,
      };
    case "unavailable":
      return { status: "unavailable", reason: "not_in_browser" };
    default: {
      const exhaustiveCheck: never = onDeviceModelStatus;
      return exhaustiveCheck;
    }
  }
}

function readCloudAvailability(viewerCloudAccess: ViewerCloudAccess): ModelOptionAvailability {
  switch (viewerCloudAccess.status) {
    case "checking":
      return { status: "checking" };
    case "premium":
      return { status: "available" };
    case "signed_out":
    case "anonymous":
    case "not_premium":
      return { status: "unavailable", reason: viewerCloudAccess.status };
    default: {
      const exhaustiveCheck: never = viewerCloudAccess;
      return exhaustiveCheck;
    }
  }
}

/**
 * Whether the picker lets the viewer choose this model. A downloadable Nano is choosable: choosing
 * it is what shows the download button.
 */
export function isModelOptionSelectable(availability: ModelOptionAvailability): boolean {
  switch (availability.status) {
    case "available":
    case "downloadable":
    case "downloading":
      return true;
    case "checking":
    case "unavailable":
      return false;
    default: {
      const exhaustiveCheck: never = availability;
      return exhaustiveCheck;
    }
  }
}

/**
 * The model a chat uses: its locked model, else the viewer's pick when usable, else Nano when this
 * browser has or can get it, else the cloud when usable, else Nano (whose reason the pane shows).
 */
export function resolveConversationModel({
  lockedModel,
  preferredModel,
  modelAvailability,
}: {
  readonly lockedModel: AssistantModelRoute | null;
  readonly preferredModel: AssistantPreferredModel;
  readonly modelAvailability: AssistantModelAvailability;
}): AssistantModelRoute {
  if (lockedModel !== null) return lockedModel;
  if (preferredModel !== null && isModelOptionSelectable(modelAvailability[preferredModel])) {
    return preferredModel;
  }
  if (isModelOptionSelectable(modelAvailability.on_device)) return "on_device";
  if (isModelOptionSelectable(modelAvailability.cloud)) return "cloud";
  return "on_device";
}

/** What the active chat needs before it can take a question, as one value. */
export type ConversationChatState =
  | { readonly status: "checking" }
  | { readonly status: "ready"; readonly route: AssistantModelRoute }
  | { readonly status: "needs_download"; readonly progressPercent: number | null }
  | { readonly status: "awaiting_download_click" }
  | {
      readonly status: "locked_unavailable";
      readonly lockedModel: AssistantModelRoute;
      readonly reason: ModelUnavailableReason;
    }
  | {
      readonly status: "unselected_unavailable";
      readonly route: AssistantModelRoute;
      readonly reason: ModelUnavailableReason;
      /** Why the other model is not usable either, for the line that explains there is no chat. */
      readonly otherReason: ModelUnavailableReason | null;
    }
  /** A saved chat holding its 10 question-and-answer pairs. */
  | { readonly status: "full" }
  /** A new chat, and this browser already keeps its 10. */
  | { readonly status: "list_full" };

/** `null` for a new chat that has no answer yet and so is not saved. */
export interface ActiveConversationFacts {
  readonly lockedModel: AssistantModelRoute | null;
  readonly isFull: boolean;
}

export function selectConversationChatState({
  savedConversation,
  isConversationListFull,
  preferredModel,
  modelAvailability,
}: {
  readonly savedConversation: ActiveConversationFacts | null;
  readonly isConversationListFull: boolean;
  readonly preferredModel: AssistantPreferredModel;
  readonly modelAvailability: AssistantModelAvailability;
}): ConversationChatState {
  if (savedConversation !== null && savedConversation.isFull) return { status: "full" };
  if (savedConversation === null && isConversationListFull) return { status: "list_full" };

  const lockedModel = savedConversation?.lockedModel ?? null;
  // An unlocked chat's choice is not settled while either model is still being asked about: the
  // answer could change which one it falls back to.
  if (
    lockedModel === null &&
    (modelAvailability.on_device.status === "checking" ||
      (preferredModel === "cloud" && modelAvailability.cloud.status === "checking") ||
      (!isModelOptionSelectable(modelAvailability.on_device) &&
        modelAvailability.cloud.status === "checking"))
  ) {
    return { status: "checking" };
  }

  const route = resolveConversationModel({ lockedModel, preferredModel, modelAvailability });
  const availability = modelAvailability[route];
  switch (availability.status) {
    case "checking":
      return { status: "checking" };
    case "available":
      return { status: "ready", route };
    case "downloadable":
      return { status: "awaiting_download_click" };
    case "downloading":
      return { status: "needs_download", progressPercent: availability.progressPercent };
    case "unavailable": {
      if (lockedModel !== null) {
        return { status: "locked_unavailable", lockedModel, reason: availability.reason };
      }
      const otherAvailability = modelAvailability[route === "on_device" ? "cloud" : "on_device"];
      return {
        status: "unselected_unavailable",
        route,
        reason: availability.reason,
        otherReason: otherAvailability.status === "unavailable" ? otherAvailability.reason : null,
      };
    }
    default: {
      const exhaustiveCheck: never = availability;
      return exhaustiveCheck;
    }
  }
}

export interface AssistantModelOptionDescription {
  readonly route: AssistantModelRoute;
  readonly name: string;
  /** Where the words go, in one sentence. */
  readonly privacyLine: string;
  readonly isSelectable: boolean;
  /** Why it cannot answer yet or here; `null` when it can. */
  readonly reasonText: string | null;
}

export const ASSISTANT_MODEL_NAMES: Record<AssistantModelRoute, string> = {
  on_device: "Gemini Nano",
  cloud: "Google Gemini",
};

const ASSISTANT_MODEL_PRIVACY_LINES: Record<AssistantModelRoute, string> = {
  on_device: "Built into Chrome. Runs on this device; nothing you type leaves it.",
  cloud: "Premium AI, through Qatoto. Your questions go to Google; Qatoto does not keep them.",
};

/** The label a locked chat wears instead of the picker. */
export const ASSISTANT_LOCKED_MODEL_LABELS: Record<AssistantModelRoute, string> = {
  on_device: "Answered by Gemini Nano, on this device",
  cloud: "Answered by Google Gemini, through Qatoto",
};

/**
 * Premium AI is granted by Qatoto per account and cannot be bought here, so no reason may read as
 * an offer to purchase it.
 */
export function describeUnavailableReason(reason: ModelUnavailableReason): string {
  switch (reason) {
    case "not_in_browser":
      return "Not available in this browser";
    case "signed_out":
      return "Sign in to use";
    case "anonymous":
    case "not_premium":
      return "Premium AI accounts only";
    default: {
      const exhaustiveCheck: never = reason;
      return exhaustiveCheck;
    }
  }
}

function describeAvailabilityReason(availability: ModelOptionAvailability): string | null {
  switch (availability.status) {
    case "available":
      return null;
    case "checking":
      return "Checking";
    case "downloadable":
      return "Download in Chrome first";
    case "downloading":
      return availability.progressPercent === null
        ? "Downloading in Chrome"
        : `Downloading in Chrome: ${availability.progressPercent}%`;
    case "unavailable":
      return describeUnavailableReason(availability.reason);
    default: {
      const exhaustiveCheck: never = availability;
      return exhaustiveCheck;
    }
  }
}

export function describeModelOption(
  route: AssistantModelRoute,
  availability: ModelOptionAvailability,
): AssistantModelOptionDescription {
  return {
    route,
    name: ASSISTANT_MODEL_NAMES[route],
    privacyLine: ASSISTANT_MODEL_PRIVACY_LINES[route],
    isSelectable: isModelOptionSelectable(availability),
    reasonText: describeAvailabilityReason(availability),
  };
}

/**
 * The model strip, a status live region at the top of the pane: which model this chat uses and
 * where the words go, or plainly that there is none and why. Announced when it changes, such as a
 * download finishing.
 */
export function describeChatStateLine(chatState: ConversationChatState): string {
  switch (chatState.status) {
    case "checking":
      return "Finding out which model this browser can use…";
    case "ready":
      return `${ASSISTANT_MODEL_NAMES[chatState.route]}. ${ASSISTANT_MODEL_PRIVACY_LINES[chatState.route]}`;
    case "awaiting_download_click":
    case "needs_download":
      return `Gemini Nano. ${ASSISTANT_MODEL_PRIVACY_LINES.on_device}`;
    case "locked_unavailable":
      return `This chat used ${ASSISTANT_MODEL_NAMES[chatState.lockedModel]}, which isn't available here.`;
    case "unselected_unavailable":
      return `${describeNoChatLine(chatState.otherReason)} Places and searches still work.`;
    case "full":
      return `This chat has reached ${ASSISTANT_CONVERSATION_MESSAGE_LIMIT} messages. Start a new chat to continue.`;
    case "list_full":
      return `${ASSISTANT_CONVERSATION_LIMIT} chats are saved in this browser. Delete one to start another.`;
    default: {
      const exhaustiveCheck: never = chatState;
      return exhaustiveCheck;
    }
  }
}

/** No model at all: Nano is not in this browser, and the cloud says why it is not theirs. */
function describeNoChatLine(cloudReason: ModelUnavailableReason | null): string {
  switch (cloudReason) {
    case null:
    case "not_in_browser":
    case "anonymous":
      return "No chat model here. Chat runs on Chrome's built-in Gemini Nano on desktop, which this browser does not have.";
    case "signed_out":
      return "No chat model here. Chat runs on Chrome's built-in Gemini Nano on desktop, which this browser does not have. Premium AI accounts can also chat through Google Gemini after signing in.";
    case "not_premium":
      return "No chat model here. Chat runs on Chrome's built-in Gemini Nano on desktop, which this browser does not have. Cloud answers through Google Gemini are for Premium AI accounts, which Qatoto turns on.";
    default: {
      const exhaustiveCheck: never = cloudReason;
      return exhaustiveCheck;
    }
  }
}

/**
 * What the assistant says when the router did not understand a request and no model can answer
 * this chat: why not, and that places and searches still work. Never a guess at an answer.
 */
export function describeRouterOnlyFallback(chatState: ConversationChatState): string {
  switch (chatState.status) {
    case "unselected_unavailable":
      return "No chat model in this browser, so only places and searches work here.";
    case "checking":
      return "Still finding out which model this browser can use. Places and searches work now.";
    case "awaiting_download_click":
    case "needs_download":
      return "Gemini Nano isn't downloaded yet. Places and searches work now.";
    case "locked_unavailable":
      return `This chat's model, ${ASSISTANT_MODEL_NAMES[chatState.lockedModel]}, isn't available here, so only places and searches work in it.`;
    // A ready model takes the question itself, and a full chat or list takes no question at all.
    case "ready":
    case "full":
    case "list_full":
      return "Only places and searches work here right now.";
    default: {
      const exhaustiveCheck: never = chatState;
      return exhaustiveCheck;
    }
  }
}

// TRANSPORT: props-only — pure state shapes. No React, no DOM, no network.
//
// WHICH MODEL ANSWERS, AS ONE UNION.
//
// Two inputs decide it: what Chrome says about its on-device model, and whether the viewer's
// account holds Premium AI. They combine into exactly one of these states, so the panel cannot
// show a download button and a composer that sends nowhere at the same time (AGENTS.md
// Pattern 1).
//
// ON-DEVICE WINS WHEN IT IS READY, because nothing leaves the device, and it is free for everyone,
// signed in or not. THE CLOUD (Google Gemini through Qatoto) IS PREMIUM AI ONLY: it spends Qatoto's
// key. Everyone else without an on-device model gets `no_chat` — the mascot, Places, memory and
// settings stay, the composer does not render. Apple's and Samsung's on-device models have no web
// API, so there is no third route to fall back to.

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

export type NoChatReason = "signed_out" | "anonymous" | "not_premium";

export type AssistantBrainState =
  | { readonly status: "checking" }
  | { readonly status: "on_device_ready" }
  | { readonly status: "on_device_downloadable"; readonly canChatViaCloud: boolean }
  | {
      readonly status: "on_device_downloading";
      readonly progressPercent: number | null;
      readonly canChatViaCloud: boolean;
    }
  | { readonly status: "cloud_ready" }
  | { readonly status: "no_chat"; readonly reason: NoChatReason };

export function selectAssistantBrainState({
  onDeviceModelStatus,
  viewerCloudAccess,
}: {
  readonly onDeviceModelStatus: OnDeviceModelStatus;
  readonly viewerCloudAccess: ViewerCloudAccess;
}): AssistantBrainState {
  const canChatViaCloud = viewerCloudAccess.status === "premium";
  switch (onDeviceModelStatus.status) {
    case "checking":
      return { status: "checking" };
    case "ready":
      return { status: "on_device_ready" };
    case "downloadable":
      return { status: "on_device_downloadable", canChatViaCloud };
    case "downloading":
      return {
        status: "on_device_downloading",
        progressPercent: onDeviceModelStatus.progressPercent,
        canChatViaCloud,
      };
    case "unavailable":
      switch (viewerCloudAccess.status) {
        case "checking":
          return { status: "checking" };
        case "premium":
          return { status: "cloud_ready" };
        case "signed_out":
        case "anonymous":
        case "not_premium":
          return { status: "no_chat", reason: viewerCloudAccess.status };
        default: {
          const exhaustiveCheck: never = viewerCloudAccess;
          return exhaustiveCheck;
        }
      }
    default: {
      const exhaustiveCheck: never = onDeviceModelStatus;
      return exhaustiveCheck;
    }
  }
}

export type AssistantChatRoute = "on_device" | "cloud" | "none";

export function selectAssistantChatRoute(brainState: AssistantBrainState): AssistantChatRoute {
  switch (brainState.status) {
    case "on_device_ready":
      return "on_device";
    case "cloud_ready":
      return "cloud";
    case "on_device_downloadable":
    case "on_device_downloading":
      return brainState.canChatViaCloud ? "cloud" : "none";
    case "checking":
    case "no_chat":
      return "none";
    default: {
      const exhaustiveCheck: never = brainState;
      return exhaustiveCheck;
    }
  }
}

export interface AssistantModelDescription {
  /** The model by name, or that there is none yet. Shown first, at medium weight. */
  readonly heading: string;
  /** Where the words go, in one sentence. */
  readonly detail: string;
}

/**
 * WHICH MODEL IS ANSWERING, IN WORDS, for the strip at the top of the panel. A viewer should never
 * have to guess whether what they type leaves their device, so every state names the model it will
 * use — or says plainly that there is none yet and what would give them one.
 */
export function describeAssistantModel(brainState: AssistantBrainState): AssistantModelDescription {
  switch (brainState.status) {
    case "checking":
      return {
        heading: "Model: checking",
        detail: "Finding out which model this browser can use…",
      };
    case "on_device_ready":
      return {
        heading: "Model: Gemini Nano, built into Chrome",
        detail: "Runs on this device; nothing you type leaves it.",
      };
    case "cloud_ready":
      return {
        heading: "Model: Google Gemini, through Qatoto (cloud)",
        detail: "Premium AI: your questions are sent to Google Gemini. Qatoto does not keep them.",
      };
    case "on_device_downloadable":
    case "on_device_downloading":
      return brainState.canChatViaCloud
        ? {
            heading: "Model: Google Gemini, through Qatoto (cloud)",
            detail:
              "Premium AI, until Chrome's built-in Gemini Nano is downloaded; then answers stay on this device.",
          }
        : {
            heading: "No model yet",
            detail: "Download Chrome's built-in Gemini Nano below to chat on this device.",
          };
    case "no_chat":
      return {
        heading: "No chat model here",
        detail: describeNoChatReason(brainState.reason),
      };
    default: {
      const exhaustiveCheck: never = brainState;
      return exhaustiveCheck;
    }
  }
}

/**
 * Why there is no chat, in the viewer's terms. Premium AI is granted by Qatoto per account and
 * cannot be bought here, so no sentence may read as an offer to purchase it.
 */
function describeNoChatReason(reason: NoChatReason): string {
  switch (reason) {
    case "signed_out":
      return "Chat runs on Chrome's built-in Gemini Nano on desktop, which this browser does not have. Premium AI accounts can also chat through Google Gemini after signing in.";
    case "anonymous":
      return "Chat runs on Chrome's built-in Gemini Nano on desktop, which this browser does not have.";
    case "not_premium":
      return "Chat runs on Chrome's built-in Gemini Nano on desktop, which this browser does not have. Cloud answers through Google Gemini are for Premium AI accounts, which Qatoto turns on.";
    default: {
      const exhaustiveCheck: never = reason;
      return exhaustiveCheck;
    }
  }
}

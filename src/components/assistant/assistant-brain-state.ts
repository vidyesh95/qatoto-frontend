// TRANSPORT: props-only — pure state shapes. No React, no DOM, no network.
//
// WHICH MODEL ANSWERS, AS ONE UNION.
//
// Two inputs decide it: what Chrome says about its on-device model, and whether the viewer is signed
// in (the cloud route is for signed-in people only). They combine into exactly one of these states,
// so the panel cannot show a download button and a sign-in prompt and a composer that sends nowhere
// all at once (AGENTS.md Pattern 1).
//
// ON-DEVICE WINS WHEN IT IS READY, because nothing leaves the device. While it is merely available
// to download, a signed-in viewer chats through the cloud and is offered the download beside it.

export type OnDeviceModelStatus =
  | { readonly status: "checking" }
  | { readonly status: "ready" }
  | { readonly status: "downloadable" }
  | { readonly status: "downloading"; readonly progressPercent: number | null }
  | { readonly status: "unavailable" };

/** A refusal the cloud route gave, which outranks what the session claims until the next sign-in. */
export type CloudRefusal = "sign_in_required" | "finish_sign_up" | null;

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
  | { readonly status: "finish_sign_up" }
  | { readonly status: "sign_in_required" };

export function selectAssistantBrainState({
  onDeviceModelStatus,
  isSessionPending,
  isSignedIn,
  cloudRefusal,
}: {
  readonly onDeviceModelStatus: OnDeviceModelStatus;
  readonly isSessionPending: boolean;
  readonly isSignedIn: boolean;
  readonly cloudRefusal: CloudRefusal;
}): AssistantBrainState {
  const canChatViaCloud = isSignedIn && cloudRefusal === null;
  switch (onDeviceModelStatus.status) {
    case "checking":
      return { status: "checking" };
    case "ready":
      return { status: "on_device_ready" };
    case "downloadable":
      return isSessionPending
        ? { status: "checking" }
        : { status: "on_device_downloadable", canChatViaCloud };
    case "downloading":
      return isSessionPending
        ? { status: "checking" }
        : {
            status: "on_device_downloading",
            progressPercent: onDeviceModelStatus.progressPercent,
            canChatViaCloud,
          };
    case "unavailable":
      if (isSessionPending) return { status: "checking" };
      if (cloudRefusal !== null) return { status: cloudRefusal };
      return isSignedIn ? { status: "cloud_ready" } : { status: "sign_in_required" };
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
    case "finish_sign_up":
    case "sign_in_required":
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
        detail: "Your questions are sent to Google Gemini. Qatoto does not keep them.",
      };
    case "on_device_downloadable":
    case "on_device_downloading":
      return brainState.canChatViaCloud
        ? {
            heading: "Model: Google Gemini, through Qatoto (cloud)",
            detail:
              "Until Chrome's built-in Gemini Nano is downloaded; then answers stay on this device.",
          }
        : {
            heading: "No model yet",
            detail:
              "Download Chrome's built-in Gemini Nano below, or sign in to use Google Gemini through Qatoto.",
          };
    case "sign_in_required":
      return {
        heading: "No model available here",
        detail: "Sign in to use Google Gemini through Qatoto.",
      };
    case "finish_sign_up":
      return {
        heading: "No model available",
        detail: "Finish setting up your account to use Google Gemini through Qatoto.",
      };
    default: {
      const exhaustiveCheck: never = brainState;
      return exhaustiveCheck;
    }
  }
}

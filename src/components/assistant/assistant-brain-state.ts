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

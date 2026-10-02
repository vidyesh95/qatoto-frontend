import { describe, expect, it } from "vitest";

import {
  describeModelOption,
  readModelAvailability,
  resolveConversationModel,
  selectConversationChatState,
  type AssistantModelAvailability,
  type ModelOptionAvailability,
} from "./assistant-brain-state";

const AVAILABLE: ModelOptionAvailability = { status: "available" };
const CHECKING: ModelOptionAvailability = { status: "checking" };
const DOWNLOADABLE: ModelOptionAvailability = { status: "downloadable" };
const NOT_IN_BROWSER: ModelOptionAvailability = { status: "unavailable", reason: "not_in_browser" };
const SIGNED_OUT: ModelOptionAvailability = { status: "unavailable", reason: "signed_out" };
const NOT_PREMIUM: ModelOptionAvailability = { status: "unavailable", reason: "not_premium" };

function buildAvailability(
  onDevice: ModelOptionAvailability,
  cloud: ModelOptionAvailability,
): AssistantModelAvailability {
  return { on_device: onDevice, cloud };
}

describe("readModelAvailability", () => {
  it("maps Chrome's model status and the account's cloud access to one option each", () => {
    expect(
      readModelAvailability({
        onDeviceModelStatus: { status: "downloading", progressPercent: 40 },
        viewerCloudAccess: { status: "anonymous" },
      }),
    ).toEqual({
      on_device: { status: "downloading", progressPercent: 40 },
      cloud: { status: "unavailable", reason: "anonymous" },
    });
  });
});

describe("resolveConversationModel", () => {
  it("always keeps a chat's locked model, usable or not", () => {
    expect(
      resolveConversationModel({
        lockedModel: "cloud",
        preferredModel: "on_device",
        modelAvailability: buildAvailability(AVAILABLE, SIGNED_OUT),
      }),
    ).toBe("cloud");
  });

  it("uses the viewer's pick when it can answer", () => {
    expect(
      resolveConversationModel({
        lockedModel: null,
        preferredModel: "cloud",
        modelAvailability: buildAvailability(AVAILABLE, AVAILABLE),
      }),
    ).toBe("cloud");
  });

  it("falls back from an unusable pick to Nano, then to the cloud", () => {
    expect(
      resolveConversationModel({
        lockedModel: null,
        preferredModel: "cloud",
        modelAvailability: buildAvailability(DOWNLOADABLE, SIGNED_OUT),
      }),
    ).toBe("on_device");
    expect(
      resolveConversationModel({
        lockedModel: null,
        preferredModel: null,
        modelAvailability: buildAvailability(NOT_IN_BROWSER, AVAILABLE),
      }),
    ).toBe("cloud");
  });
});

describe("selectConversationChatState", () => {
  const newChat = { savedConversation: null, isConversationListFull: false } as const;

  it("is ready on the resolved model", () => {
    expect(
      selectConversationChatState({
        ...newChat,
        preferredModel: null,
        modelAvailability: buildAvailability(AVAILABLE, NOT_PREMIUM),
      }),
    ).toEqual({ status: "ready", route: "on_device" });
  });

  it("waits while a new chat's fallback is still unknown", () => {
    expect(
      selectConversationChatState({
        ...newChat,
        preferredModel: null,
        modelAvailability: buildAvailability(CHECKING, AVAILABLE),
      }),
    ).toEqual({ status: "checking" });
    expect(
      selectConversationChatState({
        ...newChat,
        preferredModel: null,
        modelAvailability: buildAvailability(NOT_IN_BROWSER, CHECKING),
      }),
    ).toEqual({ status: "checking" });
  });

  it("asks for the download click, then shows its progress", () => {
    expect(
      selectConversationChatState({
        ...newChat,
        preferredModel: "on_device",
        modelAvailability: buildAvailability(DOWNLOADABLE, AVAILABLE),
      }),
    ).toEqual({ status: "awaiting_download_click" });
    expect(
      selectConversationChatState({
        ...newChat,
        preferredModel: "on_device",
        modelAvailability: buildAvailability(
          { status: "downloading", progressPercent: 12 },
          AVAILABLE,
        ),
      }),
    ).toEqual({ status: "needs_download", progressPercent: 12 });
  });

  it("keeps a locked chat off the other model when its own is gone", () => {
    expect(
      selectConversationChatState({
        savedConversation: { lockedModel: "cloud", isFull: false },
        isConversationListFull: false,
        preferredModel: "on_device",
        modelAvailability: buildAvailability(AVAILABLE, SIGNED_OUT),
      }),
    ).toEqual({ status: "locked_unavailable", lockedModel: "cloud", reason: "signed_out" });
  });

  it("is ready again for a locked cloud chat once the account signs back in", () => {
    expect(
      selectConversationChatState({
        savedConversation: { lockedModel: "cloud", isFull: false },
        isConversationListFull: false,
        preferredModel: null,
        modelAvailability: buildAvailability(NOT_IN_BROWSER, AVAILABLE),
      }),
    ).toEqual({ status: "ready", route: "cloud" });
  });

  it("says there is no model, with the cloud's own reason, when neither can answer", () => {
    expect(
      selectConversationChatState({
        ...newChat,
        preferredModel: null,
        modelAvailability: buildAvailability(NOT_IN_BROWSER, NOT_PREMIUM),
      }),
    ).toEqual({
      status: "unselected_unavailable",
      route: "on_device",
      reason: "not_in_browser",
      otherReason: "not_premium",
    });
  });

  it("puts a full chat and a full list ahead of every model state", () => {
    expect(
      selectConversationChatState({
        savedConversation: { lockedModel: "on_device", isFull: true },
        isConversationListFull: true,
        preferredModel: null,
        modelAvailability: buildAvailability(AVAILABLE, AVAILABLE),
      }),
    ).toEqual({ status: "full" });
    expect(
      selectConversationChatState({
        savedConversation: null,
        isConversationListFull: true,
        preferredModel: null,
        modelAvailability: buildAvailability(AVAILABLE, AVAILABLE),
      }),
    ).toEqual({ status: "list_full" });
  });
});

describe("describeModelOption", () => {
  it("keeps a downloadable Nano choosable, and says what it needs", () => {
    expect(describeModelOption("on_device", DOWNLOADABLE)).toMatchObject({
      isSelectable: true,
      reasonText: "Download in Chrome first",
    });
  });

  it("disables the cloud with a reason that is never an offer to buy", () => {
    expect(describeModelOption("cloud", SIGNED_OUT)).toMatchObject({
      isSelectable: false,
      reasonText: "Sign in to use",
    });
    expect(describeModelOption("cloud", NOT_PREMIUM)).toMatchObject({
      isSelectable: false,
      reasonText: "Premium AI accounts only",
    });
  });

  it("has no reason when the model can answer", () => {
    expect(describeModelOption("cloud", AVAILABLE).reasonText).toBeNull();
  });
});

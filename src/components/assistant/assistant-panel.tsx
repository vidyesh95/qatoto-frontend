// TRANSPORT: client-query — through `use-assistant-brain.ts`: POST /assistant/replies on the cloud
// route and the public search reads; Chrome's built-in model on the device route.
"use client";

// THE ASSISTANT'S PANEL: SAVED CHATS BESIDE THE ONE ON SCREEN.
//
// Mounting this is what starts the assistant's brain (`useAssistantBrain`): Chrome is not asked
// about its model, and no session exists, until the viewer opens the panel. It is also the only
// place the saved chats are VALIDATED: `browser-preferences.ts` stores them unchecked so the app's
// load-time parse stays inside one frame, and `readAssistantConversations` checks them here.
//
// TWO COLUMNS FROM `lg`, ONE BELOW. At `lg` the chat list sits in a rail beside the chat, split by a
// single hairline (no box inside the panel's box). Narrower, there is one pane and a "Chats" button
// swaps it to the list: no drawer over the chat, nothing modal.
//
// NON-MODAL. No scrim, no focus trap: it is a helper beside the page, and the page stays usable.
// Escape closes it and returns focus to the mascot's button, which `assistant-root.tsx` owns.
//
// WHICH CHAT IS ON SCREEN is the root's state, not this file's, so it survives closing the panel.
// Chat writes go through `updatePreference`, against a fresh read of storage, matched by id.

import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  type RefObject,
} from "react";

import Image from "next/image";

import AssistantConversationRail, {
  type AssistantSettingsView,
} from "@/components/assistant/assistant-conversation-rail";
import AssistantMessageList from "@/components/assistant/assistant-message-list";
import AssistantModelPicker from "@/components/assistant/assistant-model-picker";
import {
  AppearanceSection,
  ChatStateNotice,
  MemorySection,
  PlacesSection,
  RouterExamples,
} from "@/components/assistant/assistant-panel-sections";
import {
  describeChatStateLine,
  resolveConversationModel,
} from "@/components/assistant/assistant-brain-state";
import {
  useAssistantBrain,
  type AssistantPairSaveStatus,
} from "@/components/assistant/use-assistant-brain";
import {
  appendAnsweredPair,
  deleteConversation,
  isConversationListFull,
  readAssistantConversations,
  sortConversationsByRecency,
  type AssistantConversation,
  type AssistantModelRoute,
  type AssistantPairAnswer,
} from "@/lib/assistant/assistant-conversation.schemas";
import { ASSISTANT_TURN_TEXT_MAXIMUM_LENGTH } from "@/lib/assistant/assistant-reply.schemas";
import type { MascotExpression } from "@/lib/assistant/mascot-expressions";
import { computeAssistantPanelBottomPx } from "@/lib/assistant/mascot-display";
import type { MascotDockSide, MascotSize, MascotSpeed } from "@/lib/browser-preferences";
import { useBrowserPreferences } from "@/state/browser-preferences-context";

export const ASSISTANT_PANEL_ID = "qatoto-assistant-panel";

const POINT_AT_PANEL_MS = 1_500;
/** Tailwind's `lg`, where the rail sits beside the chat and the panel stays open on navigation. */
const TWO_COLUMN_MEDIA_QUERY = "(min-width: 64rem)";

/** Which chat the viewer last chose. Held by `assistant-root.tsx` so it outlives the panel. */
export type AssistantConversationSelection =
  | { readonly kind: "unset" }
  | { readonly kind: "saved"; readonly conversationId: string }
  /** A new chat: an id with no saved form until its first answer. */
  | { readonly kind: "draft"; readonly conversationId: string };

type PaneView = "chat" | "list" | AssistantSettingsView;

const SETTINGS_VIEW_HEADINGS: Record<AssistantSettingsView, string> = {
  memory: "What it remembers",
  appearance: "How it looks and moves",
};

/**
 * The chat on screen. A choice that no longer exists (deleted here or in another tab) falls back
 * to the most recent chat, and with none, to a new one.
 */
function resolveActiveConversation({
  conversationSelection,
  conversations,
  fallbackDraftConversationId,
}: {
  readonly conversationSelection: AssistantConversationSelection;
  readonly conversations: readonly AssistantConversation[];
  readonly fallbackDraftConversationId: string;
}): { readonly conversationId: string; readonly savedConversation: AssistantConversation | null } {
  if (conversationSelection.kind !== "unset") {
    const selectedConversation = conversations.find(
      (conversation) => conversation.conversationId === conversationSelection.conversationId,
    );
    if (selectedConversation !== undefined) {
      return {
        conversationId: selectedConversation.conversationId,
        savedConversation: selectedConversation,
      };
    }
    if (conversationSelection.kind === "draft") {
      return { conversationId: conversationSelection.conversationId, savedConversation: null };
    }
  }
  const mostRecentConversation = conversations[0];
  return mostRecentConversation === undefined
    ? { conversationId: fallbackDraftConversationId, savedConversation: null }
    : {
        conversationId: mostRecentConversation.conversationId,
        savedConversation: mostRecentConversation,
      };
}

function recordAnsweredPairInPreferences(
  updatePreference: ReturnType<typeof useBrowserPreferences>["updatePreference"],
  answeredPair: {
    readonly conversationId: string;
    readonly questionText: string;
    readonly answer: AssistantPairAnswer;
    readonly answeredAtMs: number;
  },
): AssistantPairSaveStatus {
  const saveOutcome: { status: AssistantPairSaveStatus } = { status: "storage_refused" };
  const didStorageAcceptWrite = updatePreference("assistantConversations", (storedValue) => {
    const appendResult = appendAnsweredPair(readAssistantConversations(storedValue), {
      conversationId: answeredPair.conversationId,
      questionText: answeredPair.questionText,
      answer: answeredPair.answer,
      nowMs: answeredPair.answeredAtMs,
    });
    if (appendResult.status !== "saved") {
      saveOutcome.status = appendResult.status;
      return storedValue;
    }
    saveOutcome.status = "saved";
    return appendResult.conversations;
  });
  if (saveOutcome.status === "saved" && !didStorageAcceptWrite) return "storage_refused";
  return saveOutcome.status;
}

function computeLastAnsweredText(
  lastMessage: ReturnType<typeof useAssistantBrain>["messages"][number] | undefined,
): string {
  if (lastMessage?.role === "assistant") {
    if (lastMessage.status === "answered") return lastMessage.reply.reply;
    if (lastMessage.status === "failed") return lastMessage.message;
  }
  return "";
}

function computeLastMessageKey(
  conversationId: string,
  lastMessage: ReturnType<typeof useAssistantBrain>["messages"][number] | undefined,
  paneView: PaneView,
): string {
  if (lastMessage === undefined) {
    return `${conversationId}-none-${paneView}`;
  }
  const statusOrRole = lastMessage.role === "assistant" ? lastMessage.status : "user";
  return `${conversationId}-${lastMessage.messageKey}-${statusOrRole}-${paneView}`;
}

function computePanelBottomStyle(
  mascotSize: MascotSize,
): CSSProperties & Record<`--${string}`, string> {
  const panelBottomPx = computeAssistantPanelBottomPx(mascotSize);
  return {
    "--assistant-panel-bottom": `${panelBottomPx.mobile}px`,
    "--assistant-panel-bottom-desktop": `${panelBottomPx.desktop}px`,
  };
}

function AssistantPanelHeader({
  paneView,
  conversationsCount,
  headingRef,
  onSetPaneView,
  onClose,
}: {
  readonly paneView: PaneView;
  readonly conversationsCount: number;
  readonly headingRef: RefObject<HTMLHeadingElement | null>;
  readonly onSetPaneView: (paneView: PaneView) => void;
  readonly onClose: () => void;
}) {
  return (
    <header className="flex items-center gap-2 border-b border-border px-3 py-2.5">
      {paneView === "chat" && (
        <button
          type="button"
          onClick={() => onSetPaneView("list")}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-xs leading-4 font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint lg:hidden"
        >
          <Image
            src="/icons/forum_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt=""
            width={16}
            height={16}
          />
          Chats
          <span className="text-muted-foreground">{conversationsCount}</span>
        </button>
      )}
      {paneView === "list" && (
        <button
          type="button"
          onClick={() => onSetPaneView("chat")}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-xs leading-4 font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint lg:hidden"
        >
          <Image
            src="/icons/arrow_back_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt=""
            width={16}
            height={16}
          />
          Back to chat
        </button>
      )}
      <h2
        ref={headingRef}
        id={`${ASSISTANT_PANEL_ID}-heading`}
        tabIndex={-1}
        className="min-w-0 flex-1 truncate px-1 text-sm font-medium text-foreground focus:outline-none"
      >
        Qatoto assistant
      </h2>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close assistant"
        className="cursor-pointer rounded-full p-1 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint"
      >
        <Image
          src="/icons/close_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
          alt=""
          width={20}
          height={20}
        />
      </button>
    </header>
  );
}

function AssistantSettingsPane({
  activeSettingsView,
  memoryNotes,
  mascotSize,
  mascotSpeed,
  dockSide,
  onBackToChat,
  onRemoveNote,
  onClearNotes,
  onMascotSizeChange,
  onMascotSpeedChange,
  onDockSideChange,
}: {
  readonly activeSettingsView: AssistantSettingsView;
  readonly memoryNotes: readonly string[];
  readonly mascotSize: MascotSize;
  readonly mascotSpeed: MascotSpeed;
  readonly dockSide: MascotDockSide;
  readonly onBackToChat: () => void;
  readonly onRemoveNote: (noteIndex: number) => void;
  readonly onClearNotes: () => void;
  readonly onMascotSizeChange: (mascotSize: MascotSize) => void;
  readonly onMascotSpeedChange: (mascotSpeed: MascotSpeed) => void;
  readonly onDockSideChange: (dockSide: MascotDockSide) => void;
}) {
  return (
    <>
      <div className="flex items-center gap-1 border-b border-border px-2 py-2">
        <button
          type="button"
          onClick={onBackToChat}
          className="cursor-pointer rounded-full p-1 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint"
        >
          <Image
            src="/icons/arrow_back_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt=""
            width={18}
            height={18}
          />
          <span className="sr-only">Back to the chat</span>
        </button>
        <h3 className="text-sm leading-5 font-medium text-foreground">
          {SETTINGS_VIEW_HEADINGS[activeSettingsView]}
        </h3>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {activeSettingsView === "memory" ? (
          <MemorySection
            memoryNotes={memoryNotes}
            onRemoveNote={onRemoveNote}
            onClearNotes={onClearNotes}
          />
        ) : (
          <AppearanceSection
            mascotSize={mascotSize}
            mascotSpeed={mascotSpeed}
            dockSide={dockSide}
            onMascotSizeChange={onMascotSizeChange}
            onMascotSpeedChange={onMascotSpeedChange}
            onDockSideChange={onDockSideChange}
          />
        )}
      </div>
    </>
  );
}

function AssistantChatComposer({
  draftQuestion,
  isModelReady,
  isAwaitingReply,
  canSend,
  onDraftQuestionChange,
  onSubmitDraft,
}: {
  readonly draftQuestion: string;
  readonly isModelReady: boolean;
  readonly isAwaitingReply: boolean;
  readonly canSend: boolean;
  readonly onDraftQuestionChange: (draftQuestion: string) => void;
  readonly onSubmitDraft: () => void;
}) {
  const handleComposerSubmit = (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    onSubmitDraft();
  };

  const handleComposerKeyDown = (keyboardEvent: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      keyboardEvent.key !== "Enter" ||
      keyboardEvent.shiftKey ||
      keyboardEvent.nativeEvent.isComposing
    ) {
      return;
    }
    keyboardEvent.preventDefault();
    onSubmitDraft();
  };

  return (
    <form
      onSubmit={handleComposerSubmit}
      className="flex items-end gap-2 border-t border-border px-3 py-3"
    >
      <label htmlFor={`${ASSISTANT_PANEL_ID}-question`} className="sr-only">
        Ask the assistant
      </label>
      <textarea
        id={`${ASSISTANT_PANEL_ID}-question`}
        value={draftQuestion}
        onChange={(changeEvent) => onDraftQuestionChange(changeEvent.target.value)}
        onKeyDown={handleComposerKeyDown}
        maxLength={ASSISTANT_TURN_TEXT_MAXIMUM_LENGTH}
        rows={2}
        placeholder={isModelReady ? "Ask anything" : "Go to a place or search, like “my orders”"}
        className="min-h-10 flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm leading-5 text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint disabled:cursor-not-allowed disabled:opacity-40"
      />
      <button
        type="submit"
        disabled={!canSend}
        className="cursor-pointer rounded-full bg-primary-imprint px-4 py-2 text-sm font-medium text-primary-imprint-foreground transition-colors hover:bg-primary-imprint-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isAwaitingReply ? "Asking…" : "Send"}
      </button>
    </form>
  );
}

function AssistantChatPane({
  activeConversationTitle,
  conversationId,
  paneView,
  lockedModel,
  selectedModel,
  modelAvailability,
  isListFull,
  chatState,
  isModelReady,
  isComposerShown,
  isAwaitingReply,
  canSend,
  messages,
  memoryNotes,
  isActiveConversationStorageRefused,
  draftQuestion,
  onSelectModel,
  onStartNewChatWith,
  onStartNewChat,
  onStartOnDeviceDownload,
  onSaveNote,
  onNavigate,
  onSendMessage,
  onDraftQuestionChange,
  onSubmitDraft,
}: {
  readonly activeConversationTitle: string;
  readonly conversationId: string;
  readonly paneView: PaneView;
  readonly lockedModel: AssistantModelRoute | null;
  readonly selectedModel: ReturnType<typeof resolveConversationModel>;
  readonly modelAvailability: ReturnType<typeof useAssistantBrain>["modelAvailability"];
  readonly isListFull: boolean;
  readonly chatState: ReturnType<typeof useAssistantBrain>["chatState"];
  readonly isModelReady: boolean;
  readonly isComposerShown: boolean;
  readonly isAwaitingReply: boolean;
  readonly canSend: boolean;
  readonly messages: ReturnType<typeof useAssistantBrain>["messages"];
  readonly memoryNotes: readonly string[];
  readonly isActiveConversationStorageRefused: boolean;
  readonly draftQuestion: string;
  readonly onSelectModel: (model: AssistantModelRoute) => void;
  readonly onStartNewChatWith: (model: AssistantModelRoute) => void;
  readonly onStartNewChat: () => void;
  readonly onStartOnDeviceDownload: () => void;
  readonly onSaveNote: (memoryNote: string) => void;
  readonly onNavigate: () => void;
  readonly onSendMessage: (messageText: string) => void;
  readonly onDraftQuestionChange: (draftQuestion: string) => void;
  readonly onSubmitDraft: () => void;
}) {
  const conversationScrollAreaRef = useRef<HTMLDivElement>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const lastScrolledMessageKeyRef = useRef("");

  const lastMessage = messages.at(-1);
  const lastMessageKey = computeLastMessageKey(conversationId, lastMessage, paneView);

  useEffect(() => {
    if (lastScrolledMessageKeyRef.current === lastMessageKey) return;
    lastScrolledMessageKeyRef.current = lastMessageKey;
    if (lastMessage === undefined) {
      conversationScrollAreaRef.current?.scrollTo({ top: 0 });
      return;
    }
    conversationEndRef.current?.scrollIntoView({ block: "end" });
  }, [lastMessageKey, lastMessage]);

  const lastAnsweredText = computeLastAnsweredText(lastMessage);

  return (
    <>
      <div className="space-y-1.5 border-b border-border px-4 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="min-w-0 truncate text-sm leading-5 font-medium text-foreground">
            {activeConversationTitle}
          </h3>
          <AssistantModelPicker
            idPrefix={ASSISTANT_PANEL_ID}
            lockedModel={lockedModel}
            selectedModel={selectedModel}
            modelAvailability={modelAvailability}
            canStartNewChat={!isListFull}
            onSelectModel={onSelectModel}
            onStartNewChatWith={onStartNewChatWith}
          />
        </div>
        {/* WHICH MODEL THIS CHAT USES, always, before anything is typed. An <output> is a
            status live region, so a change (a download finishing) is announced. */}
        <output className="block text-xs leading-4 text-muted-foreground">
          {describeChatStateLine(chatState)}
        </output>
      </div>

      <div
        ref={conversationScrollAreaRef}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3"
      >
        <ChatStateNotice
          chatState={chatState}
          canStartNewChat={!isListFull}
          onDownloadClick={onStartOnDeviceDownload}
          onStartNewChat={onStartNewChat}
        />

        {messages.length > 0 ? (
          <AssistantMessageList
            messages={messages}
            memoryNotes={memoryNotes}
            onSaveNote={onSaveNote}
            onNavigate={onNavigate}
          />
        ) : (
          <>
            {isComposerShown && (
              <>
                <p className="text-xs leading-4 text-muted-foreground">
                  {isModelReady
                    ? "Ask where something is on Qatoto, or ask it to find a product, a video or a research programme. Places and searches open at once; anything else goes to the model, which can be wrong, so check what it links to."
                    : "Ask for a place or a search. These work in any browser, with no model."}
                </p>
                <RouterExamples
                  isDisabled={isAwaitingReply}
                  onExampleClick={(exampleText) => onSendMessage(exampleText)}
                />
              </>
            )}
            <PlacesSection onNavigate={onNavigate} />
          </>
        )}
        {isActiveConversationStorageRefused && (
          <p className="text-xs leading-4 text-destructive">
            Couldn&apos;t save this chat in this browser. Storage is full or blocked, so it will be
            gone after a reload.
          </p>
        )}
        <div ref={conversationEndRef} />
        <p className="sr-only" aria-live="polite">
          {lastAnsweredText}
        </p>
      </div>

      {isComposerShown && (
        <AssistantChatComposer
          draftQuestion={draftQuestion}
          isModelReady={isModelReady}
          isAwaitingReply={isAwaitingReply}
          canSend={canSend}
          onDraftQuestionChange={onDraftQuestionChange}
          onSubmitDraft={onSubmitDraft}
        />
      )}
    </>
  );
}

function AssistantRailPane({
  isOpenOnMobile,
  conversations,
  activeConversationId,
  isDraftActive,
  isListFull,
  panelOpenedAtMs,
  activeSettingsView,
  memoryNoteCount,
  onSelectConversation,
  onStartNewChat,
  onDeleteConversation,
  onOpenSettings,
}: {
  readonly isOpenOnMobile: boolean;
  readonly conversations: readonly AssistantConversation[];
  readonly activeConversationId: string;
  readonly isDraftActive: boolean;
  readonly isListFull: boolean;
  readonly panelOpenedAtMs: number;
  readonly activeSettingsView: AssistantSettingsView | null;
  readonly memoryNoteCount: number;
  readonly onSelectConversation: (conversationId: string) => void;
  readonly onStartNewChat: () => void;
  readonly onDeleteConversation: (conversationId: string) => void;
  readonly onOpenSettings: (paneView: PaneView) => void;
}) {
  return (
    <div
      className={`${isOpenOnMobile ? "flex" : "hidden"} min-h-0 w-full flex-col lg:flex lg:w-52 lg:shrink-0 lg:border-r lg:border-border`}
    >
      <AssistantConversationRail
        conversations={conversations}
        activeConversationId={activeConversationId}
        isDraftActive={isDraftActive}
        isConversationListFull={isListFull}
        listedAtMs={panelOpenedAtMs}
        activeSettingsView={activeSettingsView}
        memoryNoteCount={memoryNoteCount}
        onSelectConversation={onSelectConversation}
        onStartNewChat={onStartNewChat}
        onDeleteConversation={onDeleteConversation}
        onOpenSettings={onOpenSettings}
      />
    </div>
  );
}

export default function AssistantPanel({
  pathname,
  dockSide,
  memoryNotes,
  conversationSelection,
  fallbackDraftConversationId,
  panelOpenedAtMs,
  onConversationSelectionChange,
  onClose,
  onMood,
  onPointAt,
  onSaveNote,
  onRemoveNote,
  onClearNotes,
  onDockSideChange,
  mascotSize,
  mascotSpeed,
  onMascotSizeChange,
  onMascotSpeedChange,
}: {
  readonly pathname: string;
  readonly dockSide: MascotDockSide;
  readonly memoryNotes: readonly string[];
  readonly conversationSelection: AssistantConversationSelection;
  /** The id a new chat gets when nothing is chosen and nothing is saved. Stable for the session. */
  readonly fallbackDraftConversationId: string;
  /** When the viewer opened the panel, for the rail's "today" times. Taken in the click handler. */
  readonly panelOpenedAtMs: number;
  readonly onConversationSelectionChange: (selection: AssistantConversationSelection) => void;
  readonly onClose: () => void;
  readonly onMood: (expression: MascotExpression, holdMs: number) => void;
  /** Viewport coordinates the mascot should point toward, and for how long. */
  readonly onPointAt: (targetX: number, targetY: number, holdMs: number) => void;
  readonly onSaveNote: (memoryNote: string) => void;
  readonly onRemoveNote: (noteIndex: number) => void;
  readonly onClearNotes: () => void;
  readonly onDockSideChange: (dockSide: MascotDockSide) => void;
  readonly mascotSize: MascotSize;
  readonly mascotSpeed: MascotSpeed;
  readonly onMascotSizeChange: (mascotSize: MascotSize) => void;
  readonly onMascotSpeedChange: (mascotSpeed: MascotSpeed) => void;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [draftQuestion, setDraftQuestion] = useState("");
  const [paneView, setPaneView] = useState<PaneView>("chat");
  const { preferences, setPreference, updatePreference } = useBrowserPreferences();

  const conversations = sortConversationsByRecency(
    readAssistantConversations(preferences.assistantConversations),
  );
  const isListFull = isConversationListFull(conversations);
  const activeConversation = resolveActiveConversation({
    conversationSelection,
    conversations,
    fallbackDraftConversationId,
  });
  const preferredModel = preferences.assistantPreferredModel;

  const pointMascotAtPanel = () => {
    const panelRect = panelRef.current?.getBoundingClientRect();
    if (panelRect === undefined) return;
    onPointAt(
      panelRect.left + panelRect.width / 2,
      panelRect.top + panelRect.height / 2,
      POINT_AT_PANEL_MS,
    );
  };

  const handleAnsweredPair = (answeredPair: {
    readonly conversationId: string;
    readonly questionText: string;
    readonly answer: AssistantPairAnswer;
    readonly answeredAtMs: number;
  }): AssistantPairSaveStatus => recordAnsweredPairInPreferences(updatePreference, answeredPair);

  const {
    modelAvailability,
    chatState,
    canTakeQuestion,
    messages,
    isActiveConversationStorageRefused,
    isAwaitingReply,
    sendMessage,
    startOnDeviceDownload,
  } = useAssistantBrain({
    pathname,
    memoryNotes,
    activeConversation,
    isConversationListFull: isListFull,
    preferredModel,
    onAnsweredPair: handleAnsweredPair,
    onMood,
    onDestinationOffered: pointMascotAtPanel,
  });

  const lockedModel = activeConversation.savedConversation?.lockedModel ?? null;
  const selectedModel = resolveConversationModel({
    lockedModel,
    preferredModel,
    modelAvailability,
  });
  const isComposerShown = canTakeQuestion;
  const isModelReady = chatState.status === "ready";
  const canSend = isComposerShown && !isAwaitingReply && draftQuestion.trim().length > 0;

  const pointMascotAtPanelOnOpen = useEffectEvent(pointMascotAtPanel);
  useEffect(() => {
    headingRef.current?.focus();
    pointMascotAtPanelOnOpen();
  }, []);

  const submitDraft = () => {
    if (!canSend) return;
    const questionText = draftQuestion;
    setDraftQuestion("");
    void sendMessage(questionText);
  };

  const handleNavigate = () => {
    if (!window.matchMedia(TWO_COLUMN_MEDIA_QUERY).matches) onClose();
  };

  const handleSelectConversation = (conversationId: string) => {
    onConversationSelectionChange({ kind: "saved", conversationId });
    setPaneView("chat");
  };

  const handleStartNewChat = () => {
    onConversationSelectionChange({ kind: "draft", conversationId: crypto.randomUUID() });
    setPaneView("chat");
  };

  const handleStartNewChatWith = (model: AssistantModelRoute) => {
    setPreference("assistantPreferredModel", model);
    handleStartNewChat();
  };

  const handleDeleteConversation = (conversationId: string) => {
    updatePreference("assistantConversations", (storedValue) =>
      deleteConversation(readAssistantConversations(storedValue), conversationId),
    );
    if (conversationId === activeConversation.conversationId) {
      onConversationSelectionChange({ kind: "unset" });
    }
  };

  const handleSelectModel = (model: AssistantModelRoute) => {
    setPreference("assistantPreferredModel", model);
  };

  const panelBottomStyle = computePanelBottomStyle(mascotSize);
  const activeSettingsView: AssistantSettingsView | null =
    paneView === "memory" || paneView === "appearance" ? paneView : null;
  const activeConversationTitle = activeConversation.savedConversation?.title ?? "New chat";

  return (
    <section
      ref={panelRef}
      id={ASSISTANT_PANEL_ID}
      style={panelBottomStyle}
      aria-labelledby={`${ASSISTANT_PANEL_ID}-heading`}
      className={`fixed inset-x-3 bottom-(--assistant-panel-bottom) z-40 flex h-[min(60dvh,calc(100dvh-var(--assistant-panel-bottom)-4.5rem))] flex-col rounded-xl border border-border bg-background shadow-lg md:inset-x-auto md:bottom-(--assistant-panel-bottom-desktop) md:h-[min(70dvh,calc(100dvh-var(--assistant-panel-bottom-desktop)-4.5rem))] md:w-96 lg:h-[min(40rem,calc(100dvh-var(--assistant-panel-bottom-desktop)-4.5rem))] lg:w-160 ${
        dockSide === "right" ? "md:right-6" : "md:left-6"
      }`}
    >
      <AssistantPanelHeader
        paneView={paneView}
        conversationsCount={conversations.length}
        headingRef={headingRef}
        onSetPaneView={setPaneView}
        onClose={onClose}
      />

      <div className="flex min-h-0 flex-1">
        <AssistantRailPane
          isOpenOnMobile={paneView === "list"}
          conversations={conversations}
          activeConversationId={activeConversation.conversationId}
          isDraftActive={activeConversation.savedConversation === null}
          isListFull={isListFull}
          panelOpenedAtMs={panelOpenedAtMs}
          activeSettingsView={activeSettingsView}
          memoryNoteCount={memoryNotes.length}
          onSelectConversation={handleSelectConversation}
          onStartNewChat={handleStartNewChat}
          onDeleteConversation={handleDeleteConversation}
          onOpenSettings={setPaneView}
        />

        <div
          className={`${paneView === "list" ? "hidden" : "flex"} min-h-0 min-w-0 flex-1 flex-col lg:flex`}
        >
          {activeSettingsView !== null ? (
            <AssistantSettingsPane
              activeSettingsView={activeSettingsView}
              memoryNotes={memoryNotes}
              mascotSize={mascotSize}
              mascotSpeed={mascotSpeed}
              dockSide={dockSide}
              onBackToChat={() => setPaneView("chat")}
              onRemoveNote={onRemoveNote}
              onClearNotes={onClearNotes}
              onMascotSizeChange={onMascotSizeChange}
              onMascotSpeedChange={onMascotSpeedChange}
              onDockSideChange={onDockSideChange}
            />
          ) : (
            <AssistantChatPane
              activeConversationTitle={activeConversationTitle}
              conversationId={activeConversation.conversationId}
              paneView={paneView}
              lockedModel={lockedModel}
              selectedModel={selectedModel}
              modelAvailability={modelAvailability}
              isListFull={isListFull}
              chatState={chatState}
              isModelReady={isModelReady}
              isComposerShown={isComposerShown}
              isAwaitingReply={isAwaitingReply}
              canSend={canSend}
              messages={messages}
              memoryNotes={memoryNotes}
              isActiveConversationStorageRefused={isActiveConversationStorageRefused}
              draftQuestion={draftQuestion}
              onSelectModel={handleSelectModel}
              onStartNewChatWith={handleStartNewChatWith}
              onStartNewChat={handleStartNewChat}
              onStartOnDeviceDownload={startOnDeviceDownload}
              onSaveNote={onSaveNote}
              onNavigate={handleNavigate}
              onSendMessage={(questionText) => void sendMessage(questionText)}
              onDraftQuestionChange={setDraftQuestion}
              onSubmitDraft={submitDraft}
            />
          )}
        </div>
      </div>
    </section>
  );
}

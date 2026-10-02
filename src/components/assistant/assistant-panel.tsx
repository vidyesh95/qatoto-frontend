// TRANSPORT: client-query — through `use-assistant-brain.ts`: POST /assistant/replies on the cloud
// route and the public search reads; Chrome's built-in model on the device route.
"use client";

// THE ASSISTANT'S PANEL: A CONVERSATION, AND THE THINGS AROUND IT.
//
// Mounting this is what starts the assistant's brain (`useAssistantBrain`): Chrome is not asked
// about its model, and no session exists, until the viewer opens the panel.
//
// NON-MODAL. No scrim, no focus trap: it is a helper beside the page, and the page stays usable.
// Escape closes it and returns focus to the mascot's button, which `assistant-root.tsx` owns.
//
// Order inside: where questions go (BrainNotice), the conversation, the places list Part 1 shipped,
// what it remembers, the dock-side switch (the keyboard alternative to dragging), and the composer
// pinned at the bottom.

import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import Image from "next/image";

import AssistantMessageList from "@/components/assistant/assistant-message-list";
import {
  AppearanceSection,
  BrainNotice,
  MemorySection,
  PlacesSection,
} from "@/components/assistant/assistant-panel-sections";
import {
  describeAssistantModel,
  selectAssistantChatRoute,
} from "@/components/assistant/assistant-brain-state";
import { useAssistantBrain } from "@/components/assistant/use-assistant-brain";
import { ASSISTANT_TURN_TEXT_MAXIMUM_LENGTH } from "@/lib/assistant/assistant-reply.schemas";
import type { MascotExpression } from "@/lib/assistant/mascot-expressions";
import { computeAssistantPanelBottomPx } from "@/lib/assistant/mascot-display";
import type { MascotDockSide, MascotSize, MascotSpeed } from "@/lib/browser-preferences";

export const ASSISTANT_PANEL_ID = "qatoto-assistant-panel";

const POINT_AT_PANEL_MS = 1_500;

export default function AssistantPanel({
  pathname,
  dockSide,
  memoryNotes,
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
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const [draftQuestion, setDraftQuestion] = useState("");
  /** One layout read, on open or when a reply carries a link — never per frame. */
  const pointMascotAtPanel = () => {
    const panelRect = panelRef.current?.getBoundingClientRect();
    if (panelRect === undefined) return;
    onPointAt(
      panelRect.left + panelRect.width / 2,
      panelRect.top + panelRect.height / 2,
      POINT_AT_PANEL_MS,
    );
  };
  const { brainState, messages, isAwaitingReply, sendMessage, startOnDeviceDownload } =
    useAssistantBrain({
      pathname,
      memoryNotes,
      onMood,
      onDestinationOffered: pointMascotAtPanel,
    });
  const chatRoute = selectAssistantChatRoute(brainState);
  const modelDescription = describeAssistantModel(brainState);
  const canSend = chatRoute !== "none" && !isAwaitingReply && draftQuestion.trim().length > 0;

  const pointMascotAtPanelOnOpen = useEffectEvent(pointMascotAtPanel);
  useEffect(() => {
    headingRef.current?.focus();
    pointMascotAtPanelOnOpen();
  }, []);

  // Keep the newest turn in view as it streams. One scroll call, not a layout read per word.
  const lastMessage = messages.at(-1);
  const lastMessageKey =
    lastMessage === undefined
      ? "none"
      : `${lastMessage.messageId}-${lastMessage.role === "assistant" ? lastMessage.status : "user"}`;
  // Compared against the last key scrolled for (`main-scroll-reset.tsx` precedent), so the
  // dependency is a real input: a new turn or a turn that finished, never every streamed word.
  const lastScrolledMessageKeyRef = useRef("");
  useEffect(() => {
    if (lastScrolledMessageKeyRef.current === lastMessageKey) return;
    lastScrolledMessageKeyRef.current = lastMessageKey;
    conversationEndRef.current?.scrollIntoView({ block: "end" });
  }, [lastMessageKey]);

  // The one live region: each finished reply, announced once.
  const lastAnsweredText =
    lastMessage?.role === "assistant" && lastMessage.status === "answered"
      ? lastMessage.reply.reply
      : lastMessage?.role === "assistant" && lastMessage.status === "failed"
        ? lastMessage.message
        : "";

  const submitDraft = () => {
    if (!canSend) return;
    const questionText = draftQuestion;
    setDraftQuestion("");
    void sendMessage(questionText);
  };

  const handleComposerSubmit = (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    submitDraft();
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
    submitDraft();
  };

  // The panel sits above the docked mascot, so a bigger mascot pushes it up. CSS variables let one
  // class serve both the phone offset and the desktop one. Its height is capped so its top stays
  // 4.5rem below the viewport's top, clear of the 56px navbar that paints above it.
  const panelBottomPx = computeAssistantPanelBottomPx(mascotSize);
  const panelBottomStyle: CSSProperties & Record<`--${string}`, string> = {
    "--assistant-panel-bottom": `${panelBottomPx.mobile}px`,
    "--assistant-panel-bottom-desktop": `${panelBottomPx.desktop}px`,
  };

  return (
    <section
      ref={panelRef}
      id={ASSISTANT_PANEL_ID}
      style={panelBottomStyle}
      aria-labelledby={`${ASSISTANT_PANEL_ID}-heading`}
      className={`fixed inset-x-3 bottom-(--assistant-panel-bottom) z-40 flex max-h-[min(60dvh,calc(100dvh_-_var(--assistant-panel-bottom)_-_4.5rem))] flex-col rounded-xl border border-border bg-background shadow-lg md:inset-x-auto md:bottom-(--assistant-panel-bottom-desktop) md:max-h-[min(70dvh,calc(100dvh_-_var(--assistant-panel-bottom-desktop)_-_4.5rem))] md:w-96 ${
        dockSide === "right" ? "md:right-6" : "md:left-6"
      }`}
    >
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h2
          ref={headingRef}
          id={`${ASSISTANT_PANEL_ID}-heading`}
          tabIndex={-1}
          className="text-sm font-medium text-foreground focus:outline-none"
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

      {/* WHICH MODEL IS ANSWERING, always, before anything is typed. An <output> is a status live
          region, so a change (the download finishing and Gemini Nano taking over) is announced. */}
      <output className="block border-b border-border px-4 py-2 text-xs leading-4">
        <span className="font-medium text-foreground">{modelDescription.heading}.</span>{" "}
        <span className="text-muted-foreground">{modelDescription.detail}</span>
      </output>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3">
        <BrainNotice brainState={brainState} onDownloadClick={startOnDeviceDownload} />

        {messages.length === 0 ? (
          <p className="text-xs leading-4 text-muted-foreground">
            Ask where something is on Qatoto, or ask it to find a product, a video or a research
            programme. It can be wrong, so check what it links to.
          </p>
        ) : (
          <AssistantMessageList
            messages={messages}
            memoryNotes={memoryNotes}
            onSaveNote={onSaveNote}
            onNavigate={onClose}
          />
        )}
        <div ref={conversationEndRef} />
        <p className="sr-only" aria-live="polite">
          {lastAnsweredText}
        </p>

        <div className="space-y-3 border-t border-border pt-3">
          <PlacesSection onNavigate={onClose} />
          <MemorySection
            memoryNotes={memoryNotes}
            onRemoveNote={onRemoveNote}
            onClearNotes={onClearNotes}
          />
          <AppearanceSection
            mascotSize={mascotSize}
            mascotSpeed={mascotSpeed}
            dockSide={dockSide}
            onMascotSizeChange={onMascotSizeChange}
            onMascotSpeedChange={onMascotSpeedChange}
            onDockSideChange={onDockSideChange}
          />
        </div>
      </div>

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
          onChange={(changeEvent) => setDraftQuestion(changeEvent.target.value)}
          onKeyDown={handleComposerKeyDown}
          disabled={chatRoute === "none"}
          maxLength={ASSISTANT_TURN_TEXT_MAXIMUM_LENGTH}
          rows={2}
          placeholder={
            chatRoute === "none" ? "Questions are not available here yet" : "Ask anything"
          }
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
    </section>
  );
}

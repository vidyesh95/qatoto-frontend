// TRANSPORT: props-only — no API calls; listens to in-memory assistant signals.
"use client";

// AI ASSIST MODE, MOUNTED. Only `assistant-gate.tsx` imports this, and only lazily, so nothing here
// reaches a page where the mode is off.
//
// THREE LAYERS, AND ONLY ONE OF THEM IS ORNAMENT:
//  - `MascotStage`, the canvas: aria-hidden and pointer-transparent. The character is decoration.
//  - The mascot BOX: a fixed DOM element the controller moves over the drawing by transform. It
//    holds the real `<button>` that opens the panel and the speech bubble's live region, so
//    keyboard and screen-reader users reach the same two things a pointer does.
//  - `AssistantPanel`, opened from that button.
//
// The live region is mounted ALWAYS, and only its text changes. A polite region that is inserted
// together with its text is not reliably announced; one that already exists is, once.

import { useEffect, useRef, useState } from "react";

import { usePathname } from "next/navigation";

import AssistantPanel, { ASSISTANT_PANEL_ID } from "@/components/assistant/assistant-panel";
import type { MascotController } from "@/components/assistant/mascot-controller";
import MascotStage, { type MascotStageStatus } from "@/components/assistant/mascot-stage";
import { resolveSignalReaction } from "@/components/assistant/mascot-state";
import { subscribeToAssistantSignals } from "@/lib/assistant/assistant-signals";
import {
  MASCOT_FRAME_SIZE_PX,
  MASCOT_STATIC_FALLBACK_URL,
} from "@/lib/assistant/mascot-atlas.schemas";

type SpeechBubble =
  | { readonly status: "hidden" }
  | { readonly status: "shown"; readonly text: string; readonly shownAtMs: number };

const SPEECH_BUBBLE_DURATION_MS = 6_000;
const PANEL_OPEN_MOOD_DURATION_MS = 2_000;

export default function AssistantRoot() {
  const mascotBoxRef = useRef<HTMLDivElement>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const controllerRef = useRef<MascotController | null>(null);
  const [stageStatus, setStageStatus] = useState<MascotStageStatus>({ status: "loading" });
  const [speechBubble, setSpeechBubble] = useState<SpeechBubble>({ status: "hidden" });
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const pathname = usePathname();

  useEffect(
    () =>
      subscribeToAssistantSignals((signal) => {
        const reaction = resolveSignalReaction(signal);
        controllerRef.current?.react(reaction);
        setSpeechBubble({ status: "shown", text: reaction.bubbleText, shownAtMs: Date.now() });
      }),
    [],
  );

  useEffect(() => {
    if (speechBubble.status !== "shown") return undefined;
    const hideTimeout = window.setTimeout(() => {
      setSpeechBubble({ status: "hidden" });
    }, SPEECH_BUBBLE_DURATION_MS);
    return () => {
      window.clearTimeout(hideTimeout);
    };
  }, [speechBubble]);

  // A perch that navigation removed fires no event, so tell the tracker to look again. Compared
  // against the last path, on the `main-scroll-reset.tsx` precedent, so the dependency is a real
  // input rather than a bare trigger.
  const lastSeenPathnameRef = useRef<string | null>(null);
  useEffect(() => {
    if (lastSeenPathnameRef.current === pathname) return;
    lastSeenPathnameRef.current = pathname;
    controllerRef.current?.markLayoutDirty();
  }, [pathname]);

  useEffect(() => {
    if (!isPanelOpen) return undefined;
    const handleEscapeKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key !== "Escape") return;
      setIsPanelOpen(false);
      openButtonRef.current?.focus();
    };
    document.addEventListener("keydown", handleEscapeKeyDown);
    return () => {
      document.removeEventListener("keydown", handleEscapeKeyDown);
    };
  }, [isPanelOpen]);

  const handleOpenButtonClick = () => {
    if (!isPanelOpen)
      controllerRef.current?.showInteractionMood("joy", null, PANEL_OPEN_MOOD_DURATION_MS);
    setIsPanelOpen(!isPanelOpen);
  };

  const handlePanelClose = () => {
    setIsPanelOpen(false);
  };

  const isMascotShown = stageStatus.status !== "loading";

  return (
    <>
      <MascotStage
        mascotBoxRef={mascotBoxRef}
        controllerRef={controllerRef}
        onStatusChange={setStageStatus}
      />

      {/* Positioned by the controller's transform while the canvas runs. With no canvas there is
          no controller, so the static fallback sits in the dock corner by CSS instead. */}
      <div
        ref={mascotBoxRef}
        data-bubble-side="right"
        style={{ width: MASCOT_FRAME_SIZE_PX, height: MASCOT_FRAME_SIZE_PX }}
        className={`group pointer-events-none fixed z-40 ${
          stageStatus.status === "unavailable"
            ? "right-3 bottom-24 md:right-6 md:bottom-6"
            : "top-0 left-0"
        }`}
      >
        {stageStatus.status === "unavailable" && (
          // A plain <img>: one small static file, and next/image would add a request for nothing.
          // oxlint-disable-next-line nextjs/no-img-element
          <img
            src={MASCOT_STATIC_FALLBACK_URL}
            alt=""
            width={MASCOT_FRAME_SIZE_PX}
            height={MASCOT_FRAME_SIZE_PX}
            className="size-full"
          />
        )}

        {isMascotShown && (
          <button
            ref={openButtonRef}
            type="button"
            onClick={handleOpenButtonClick}
            aria-label={isPanelOpen ? "Close Qatoto assistant" : "Open Qatoto assistant"}
            aria-expanded={isPanelOpen}
            aria-controls={ASSISTANT_PANEL_ID}
            className="pointer-events-auto absolute inset-0 cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint"
          />
        )}

        <div
          aria-live="polite"
          className="pointer-events-none absolute bottom-full mb-2 w-max max-w-64 group-data-[bubble-side=left]:left-0 group-data-[bubble-side=right]:right-0"
        >
          {speechBubble.status === "shown" && (
            <p
              key={speechBubble.shownAtMs}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm leading-5 font-medium text-foreground shadow-lg"
            >
              {speechBubble.text}
            </p>
          )}
        </div>
      </div>

      {isPanelOpen && <AssistantPanel onClose={handlePanelClose} />}
    </>
  );
}

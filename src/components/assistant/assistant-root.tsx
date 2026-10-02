// TRANSPORT: client-query — the panel it opens asks POST /assistant/replies on the cloud route;
// this file itself listens to in-memory assistant signals and writes browser preferences.
"use client";

// AI ASSIST MODE, MOUNTED. Only `assistant-gate.tsx` imports this, and only lazily, so nothing here
// reaches a page where the mode is off.
//
// THREE LAYERS, AND ONLY ONE OF THEM IS ORNAMENT:
//  - `MascotStage`, the canvas: aria-hidden and pointer-transparent. The character is decoration.
//  - The mascot BOX: a fixed DOM element the controller moves over the drawing by transform. It
//    holds the real `<button>` that opens the panel and the speech bubble's live region, so
//    keyboard and screen-reader users reach the same two things a pointer does.
//  - `AssistantPanel`, opened from that button: the conversation and everything around it.
//
// THE BUTTON IS ALSO THE DRAG HANDLE. A press that moves more than DRAG_THRESHOLD_PX picks the
// mascot up; letting go glides it to the dock on the nearer side and saves that side in the
// browser-preferences blob. A press that does not move is an ordinary click. Keyboard users get the
// same choice from a button in the panel, because dragging is not something a keyboard can do.
//
// The live region is mounted ALWAYS, and only its text changes. A polite region that is inserted
// together with its text is not reliably announced; one that already exists is, once.

import { useEffect, useRef, useState, type PointerEvent } from "react";

import { usePathname } from "next/navigation";

import AssistantPanel, { ASSISTANT_PANEL_ID } from "@/components/assistant/assistant-panel";
import type { MascotController } from "@/components/assistant/mascot-controller";
import MascotStage, { type MascotStageStatus } from "@/components/assistant/mascot-stage";
import { resolveSignalReaction } from "@/components/assistant/mascot-state";
import { subscribeToAssistantSignals } from "@/lib/assistant/assistant-signals";
import {
  MASCOT_DISPLAY_SCALE_DESKTOP,
  MASCOT_FRAME_HEIGHT_PX,
  MASCOT_FRAME_WIDTH_PX,
  MASCOT_STATIC_FALLBACK_URL,
} from "@/lib/assistant/mascot-atlas.schemas";
import type { MascotExpression } from "@/lib/assistant/mascot-expressions";
import { ASSISTANT_MEMORY_NOTE_LIMIT, type MascotDockSide } from "@/lib/browser-preferences";
import { useBrowserPreferences } from "@/state/browser-preferences-context";

type SpeechBubble =
  | { readonly status: "hidden" }
  | { readonly status: "shown"; readonly text: string; readonly shownAtMs: number };

interface MascotDragGesture {
  readonly pointerId: number;
  readonly startX: number;
  readonly startY: number;
  isDragging: boolean;
}

const SPEECH_BUBBLE_DURATION_MS = 6_000;
const PANEL_OPEN_MOOD_DURATION_MS = 2_000;
const DRAG_THRESHOLD_PX = 6;
/** The box before the canvas measures it, and the size of the no-WebGL still. */
const FALLBACK_BOX_WIDTH_PX = Math.round(MASCOT_FRAME_WIDTH_PX * MASCOT_DISPLAY_SCALE_DESKTOP);
const FALLBACK_BOX_HEIGHT_PX = Math.round(MASCOT_FRAME_HEIGHT_PX * MASCOT_DISPLAY_SCALE_DESKTOP);

export default function AssistantRoot() {
  const mascotBoxRef = useRef<HTMLDivElement>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const controllerRef = useRef<MascotController | null>(null);
  const [stageStatus, setStageStatus] = useState<MascotStageStatus>({ status: "loading" });
  const [speechBubble, setSpeechBubble] = useState<SpeechBubble>({ status: "hidden" });
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const pathname = usePathname();
  const { preferences, setPreference } = useBrowserPreferences();
  const dockSide = preferences.assistantDockSide;
  const memoryNotes = preferences.assistantMemoryNotes;
  const dragGestureRef = useRef<MascotDragGesture | null>(null);
  const shouldSuppressNextClickRef = useRef(false);

  // The side can change from the panel's button or from another tab's write to the same blob.
  useEffect(() => {
    controllerRef.current?.setDockSide(dockSide);
  }, [dockSide]);

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
    if (shouldSuppressNextClickRef.current) {
      shouldSuppressNextClickRef.current = false;
      return;
    }
    if (!isPanelOpen)
      controllerRef.current?.showInteractionMood("joy", PANEL_OPEN_MOOD_DURATION_MS);
    setIsPanelOpen(!isPanelOpen);
  };

  const handleOpenButtonPointerDown = (pointerEvent: PointerEvent<HTMLButtonElement>) => {
    if (pointerEvent.button !== 0 || controllerRef.current === null) return;
    dragGestureRef.current = {
      pointerId: pointerEvent.pointerId,
      startX: pointerEvent.clientX,
      startY: pointerEvent.clientY,
      isDragging: false,
    };
    pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId);
  };

  const handleOpenButtonPointerMove = (pointerEvent: PointerEvent<HTMLButtonElement>) => {
    const dragGesture = dragGestureRef.current;
    const controller = controllerRef.current;
    if (dragGesture === null || controller === null) return;
    if (dragGesture.pointerId !== pointerEvent.pointerId) return;
    if (!dragGesture.isDragging) {
      const movedDistancePx = Math.hypot(
        pointerEvent.clientX - dragGesture.startX,
        pointerEvent.clientY - dragGesture.startY,
      );
      if (movedDistancePx < DRAG_THRESHOLD_PX) return;
      dragGesture.isDragging = true;
      controller.beginDrag(dragGesture.startX, dragGesture.startY);
    }
    controller.dragTo(pointerEvent.clientX, pointerEvent.clientY);
  };

  const handleOpenButtonPointerEnd = (pointerEvent: PointerEvent<HTMLButtonElement>) => {
    const dragGesture = dragGestureRef.current;
    if (dragGesture === null || dragGesture.pointerId !== pointerEvent.pointerId) return;
    dragGestureRef.current = null;
    if (!dragGesture.isDragging || controllerRef.current === null) return;
    // The browser still fires a click after a drag ends on the same element; that is not a click.
    shouldSuppressNextClickRef.current = true;
    const nextDockSide = controllerRef.current.endDrag();
    if (nextDockSide !== dockSide) setPreference("assistantDockSide", nextDockSide);
  };

  const handlePanelClose = () => {
    setIsPanelOpen(false);
  };

  const handleMood = (expression: MascotExpression, holdMs: number) => {
    controllerRef.current?.showInteractionMood(expression, holdMs);
  };

  const handlePointAt = (targetX: number, targetY: number, holdMs: number) => {
    controllerRef.current?.pointAt(targetX, targetY, holdMs);
  };

  const handleSaveNote = (memoryNote: string) => {
    if (memoryNotes.includes(memoryNote)) return;
    setPreference(
      "assistantMemoryNotes",
      [...memoryNotes, memoryNote].slice(-ASSISTANT_MEMORY_NOTE_LIMIT),
    );
  };

  const handleRemoveNote = (noteIndex: number) => {
    setPreference(
      "assistantMemoryNotes",
      memoryNotes.filter((_memoryNote, candidateIndex) => candidateIndex !== noteIndex),
    );
  };

  const handleClearNotes = () => {
    setPreference("assistantMemoryNotes", []);
  };

  const handleDockSideChange = (nextDockSide: MascotDockSide) => {
    setPreference("assistantDockSide", nextDockSide);
  };

  const isMascotShown = stageStatus.status !== "loading";

  return (
    <>
      <MascotStage
        mascotBoxRef={mascotBoxRef}
        controllerRef={controllerRef}
        initialDockSide={dockSide}
        onStatusChange={setStageStatus}
      />

      {/* Positioned by the controller's transform while the canvas runs. With no canvas there is
          no controller, so the static fallback sits in the dock corner by CSS instead. */}
      <div
        ref={mascotBoxRef}
        data-bubble-side={dockSide}
        style={{ width: FALLBACK_BOX_WIDTH_PX, height: FALLBACK_BOX_HEIGHT_PX }}
        className={`group pointer-events-none fixed z-40 ${
          stageStatus.status !== "unavailable"
            ? "top-0 left-0"
            : dockSide === "right"
              ? "right-3 bottom-24 md:right-6 md:bottom-6"
              : "bottom-24 left-3 md:bottom-6 md:left-6"
        }`}
      >
        {stageStatus.status === "unavailable" && (
          // A plain <img>: one small static file, and next/image would add a request for nothing.
          // oxlint-disable-next-line nextjs/no-img-element
          <img
            src={MASCOT_STATIC_FALLBACK_URL}
            alt=""
            width={FALLBACK_BOX_WIDTH_PX}
            height={FALLBACK_BOX_HEIGHT_PX}
            className="size-full"
          />
        )}

        {isMascotShown && (
          <button
            ref={openButtonRef}
            type="button"
            onClick={handleOpenButtonClick}
            onPointerDown={handleOpenButtonPointerDown}
            onPointerMove={handleOpenButtonPointerMove}
            onPointerUp={handleOpenButtonPointerEnd}
            onPointerCancel={handleOpenButtonPointerEnd}
            aria-label={isPanelOpen ? "Close Qatoto assistant" : "Open Qatoto assistant"}
            aria-expanded={isPanelOpen}
            aria-controls={ASSISTANT_PANEL_ID}
            className="pointer-events-auto absolute inset-0 cursor-pointer touch-none rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint"
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

      {isPanelOpen && (
        <AssistantPanel
          pathname={pathname}
          dockSide={dockSide}
          memoryNotes={memoryNotes}
          onClose={handlePanelClose}
          onMood={handleMood}
          onPointAt={handlePointAt}
          onSaveNote={handleSaveNote}
          onRemoveNote={handleRemoveNote}
          onClearNotes={handleClearNotes}
          onDockSideChange={handleDockSideChange}
        />
      )}
    </>
  );
}

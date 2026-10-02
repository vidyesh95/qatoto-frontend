// TRANSPORT: props-only — renders state and authored constants.
"use client";

// THE PANEL'S STANDING SECTIONS: what a chat needs before it can answer, where things are, what it
// remembers, and how the mascot looks and moves.
//
// WHICH MODEL ANSWERS is said once, by the model strip at the top of the chat pane
// (`describeChatStateLine`). `ChatStateNotice` only carries what the strip cannot: the download
// button and its progress, the sign-in link, and the new-chat way out of a chat that cannot go on.
// It repeats none of the strip's words.
//
// THE DOWNLOAD COPY STATES ONLY WHAT IS TRUE. Chrome documents the disk it needs (about 22 GB free)
// and does not report the download's own size, so no size is printed: a wrong number is worse than
// none. The progress bar is real — it is Chrome's own `downloadprogress` — or, when Chrome started
// the download somewhere this page cannot monitor, an indeterminate bar that says so. The download
// runs in Chrome, not on this page, so nothing here waits on it and the panel stays usable.
//
// PLACES ARE THE EMPTY STATE OF A NEW CHAT, and Memory and Appearance are settings panes the rail
// opens. None of them is behind a disclosure any more: each now has a place of its own.

import Link from "next/link";

import type { ConversationChatState } from "@/components/assistant/assistant-brain-state";
import MascotAppearanceControls from "@/components/assistant/mascot-appearance-controls";
import type { MascotDockSide, MascotSize, MascotSpeed } from "@/lib/browser-preferences";
import { ROADMAP_AUDIENCES, type CapabilityRoute } from "@/lib/roadmap/site-capabilities";

const FOCUS_RING_CLASS_NAME =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint";
const QUIET_LINK_CLASS_NAME = `underline underline-offset-2 ${FOCUS_RING_CLASS_NAME}`;
const QUIET_BUTTON_CLASS_NAME = `cursor-pointer rounded-full px-3 py-1.5 text-xs leading-4 font-medium text-foreground transition-colors hover:bg-muted ${FOCUS_RING_CLASS_NAME}`;
const PRIMARY_BUTTON_CLASS_NAME = `cursor-pointer rounded-full bg-primary-imprint px-4 py-1.5 text-xs font-medium text-primary-imprint-foreground transition-colors hover:bg-primary-imprint-deep ${FOCUS_RING_CLASS_NAME}`;

export function ChatStateNotice({
  chatState,
  canStartNewChat,
  onDownloadClick,
  onStartNewChat,
}: {
  readonly chatState: ConversationChatState;
  /** False at the chat limit: a new chat then could never be saved, so it is not offered here. */
  readonly canStartNewChat: boolean;
  readonly onDownloadClick: () => void;
  readonly onStartNewChat: () => void;
}) {
  switch (chatState.status) {
    case "checking":
    case "ready":
    case "list_full":
      return null;
    case "awaiting_download_click":
      return (
        <div className="space-y-2 rounded-xl bg-muted px-3 py-3">
          <p className="text-xs leading-4 text-muted-foreground">
            Chrome downloads Gemini Nano once and runs it on this device, so your questions never
            leave it. It needs about 22 GB of free disk space. You can keep using the page while it
            downloads.
          </p>
          <button type="button" onClick={onDownloadClick} className={PRIMARY_BUTTON_CLASS_NAME}>
            Download Gemini Nano
          </button>
        </div>
      );
    case "needs_download":
      return (
        <div className="space-y-2 rounded-xl bg-muted px-3 py-3">
          <p className="text-xs leading-4 text-muted-foreground">
            {chatState.progressPercent === null
              ? "Chrome is downloading Gemini Nano. This page cannot see its progress."
              : `Chrome is downloading Gemini Nano: ${chatState.progressPercent}%.`}
          </p>
          <progress
            className="h-1.5 w-full accent-primary-imprint"
            max={100}
            {...(chatState.progressPercent === null ? {} : { value: chatState.progressPercent })}
            aria-label="Gemini Nano download"
          />
        </div>
      );
    case "locked_unavailable":
      return (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {canStartNewChat && (
            <button type="button" onClick={onStartNewChat} className={PRIMARY_BUTTON_CLASS_NAME}>
              New chat
            </button>
          )}
          {chatState.reason === "signed_out" && (
            <p className="text-xs leading-4 text-muted-foreground">
              <Link href="/sign-in" className={QUIET_LINK_CLASS_NAME}>
                Sign in
              </Link>{" "}
              to carry on with this chat.
            </p>
          )}
        </div>
      );
    case "unselected_unavailable":
      // Only a signed-out viewer has something to do: sign in, in case their account has Premium
      // AI. Everyone else is told why by the model strip; there is nothing to click.
      return chatState.otherReason === "signed_out" ? (
        <p className="text-xs leading-4 text-muted-foreground">
          Have Premium AI?{" "}
          <Link href="/sign-in" className={QUIET_LINK_CLASS_NAME}>
            Sign in
          </Link>{" "}
          to chat. The places below work either way.
        </p>
      ) : null;
    case "full":
      return canStartNewChat ? (
        <button type="button" onClick={onStartNewChat} className={PRIMARY_BUTTON_CLASS_NAME}>
          New chat
        </button>
      ) : null;
    default: {
      const exhaustiveCheck: never = chatState;
      return exhaustiveCheck;
    }
  }
}

interface DestinationGroup {
  readonly audienceId: string;
  readonly headline: string;
  readonly routes: readonly CapabilityRoute[];
}

/** One chip per href per audience: several capabilities share a destination (Build log, Talent). */
const DESTINATION_GROUPS: readonly DestinationGroup[] = ROADMAP_AUDIENCES.map((audience) => {
  const routesByHref = new Map<string, CapabilityRoute>();
  for (const capability of audience.capabilities) {
    for (const route of capability.routes) {
      if (!routesByHref.has(route.href)) routesByHref.set(route.href, route);
    }
  }
  return {
    audienceId: audience.id,
    headline: audience.headline,
    routes: [...routesByHref.values()],
  };
}).filter((destinationGroup) => destinationGroup.routes.length > 0);

export const ASSISTANT_CHIP_CLASS_NAME = `inline-block rounded-full border border-border bg-background/70 px-3 py-1.5 text-xs leading-4 font-medium text-foreground transition-colors hover:bg-muted ${FOCUS_RING_CLASS_NAME}`;

/** A new chat's empty state: every place on Qatoto, grouped by what the viewer came to do. */
export function PlacesSection({ onNavigate }: { readonly onNavigate: () => void }) {
  return (
    <section aria-labelledby="assistant-places-heading" className="space-y-3">
      <h3
        id="assistant-places-heading"
        className="text-xs leading-4 font-medium tracking-eyebrow text-muted-foreground uppercase"
      >
        Places
      </h3>
      {DESTINATION_GROUPS.map((destinationGroup) => (
        <section key={destinationGroup.audienceId}>
          <h4 className="text-xs leading-4 font-medium text-foreground">
            {destinationGroup.headline}
          </h4>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {destinationGroup.routes.map((route) => (
              <li key={route.href}>
                <Link href={route.href} onClick={onNavigate} className={ASSISTANT_CHIP_CLASS_NAME}>
                  {route.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </section>
  );
}

export function MemorySection({
  memoryNotes,
  onRemoveNote,
  onClearNotes,
}: {
  readonly memoryNotes: readonly string[];
  readonly onRemoveNote: (noteIndex: number) => void;
  readonly onClearNotes: () => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs leading-4 text-muted-foreground">
        Notes you saved, kept in this browser only. The assistant reads them with each question, in
        every chat.
      </p>
      {memoryNotes.length === 0 ? (
        <p className="text-xs leading-4 text-muted-foreground">
          Nothing saved. When an answer offers to remember something, tap Remember.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-border">
            {memoryNotes.map((memoryNote, noteIndex) => (
              <li key={`${noteIndex}-${memoryNote}`} className="flex items-start gap-2 py-1.5">
                <span className="min-w-0 flex-1 text-sm leading-5 break-words text-foreground">
                  {memoryNote}
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveNote(noteIndex)}
                  className={QUIET_BUTTON_CLASS_NAME}
                >
                  Forget<span className="sr-only">: {memoryNote}</span>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={onClearNotes} className={QUIET_BUTTON_CLASS_NAME}>
            Forget everything
          </button>
        </>
      )}
    </div>
  );
}

/**
 * How the mascot looks and moves, for this browser: size, speed and which corner it rests in.
 * The size and speed controls are shared with the account menu's AI Assist panel.
 */
export function AppearanceSection({
  mascotSize,
  mascotSpeed,
  dockSide,
  onMascotSizeChange,
  onMascotSpeedChange,
  onDockSideChange,
}: {
  readonly mascotSize: MascotSize;
  readonly mascotSpeed: MascotSpeed;
  readonly dockSide: MascotDockSide;
  readonly onMascotSizeChange: (mascotSize: MascotSize) => void;
  readonly onMascotSpeedChange: (mascotSpeed: MascotSpeed) => void;
  readonly onDockSideChange: (dockSide: MascotDockSide) => void;
}) {
  const otherDockSide: MascotDockSide = dockSide === "right" ? "left" : "right";

  return (
    <div className="space-y-3">
      <MascotAppearanceControls
        idPrefix="assistant-panel"
        mascotSize={mascotSize}
        mascotSpeed={mascotSpeed}
        onMascotSizeChange={onMascotSizeChange}
        onMascotSpeedChange={onMascotSpeedChange}
      />
      <button
        type="button"
        onClick={() => onDockSideChange(otherDockSide)}
        className={`cursor-pointer text-xs leading-4 font-medium text-foreground underline underline-offset-2 ${FOCUS_RING_CLASS_NAME}`}
      >
        Move to the {otherDockSide} corner
      </button>
    </div>
  );
}

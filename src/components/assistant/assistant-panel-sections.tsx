// TRANSPORT: props-only — renders state and authored constants.
"use client";

// THE PANEL'S STANDING SECTIONS: which model answers, where things are, what it remembers, and
// how the mascot looks and moves.
//
// WHICH MODEL ANSWERS is said once, by the model strip at the top of the panel
// (`describeAssistantModel`). `BrainNotice` only carries what the strip cannot: the download button
// and its progress, and the sign-in / finish-sign-up links. It repeats none of the strip's words.
//
// THE DOWNLOAD COPY STATES ONLY WHAT IS TRUE. Chrome documents the disk it needs (about 22 GB free)
// and does not report the download's own size, so no size is printed: a wrong number is worse than
// none. The progress bar is real — it is Chrome's own `downloadprogress` — or, when Chrome started
// the download somewhere this page cannot monitor, an indeterminate bar that says so.

import Link from "next/link";

import type { AssistantBrainState } from "@/components/assistant/assistant-brain-state";
import MascotAppearanceControls from "@/components/assistant/mascot-appearance-controls";
import type { MascotDockSide, MascotSize, MascotSpeed } from "@/lib/browser-preferences";
import { ROADMAP_AUDIENCES, type CapabilityRoute } from "@/lib/roadmap/site-capabilities";

const QUIET_LINK_CLASS_NAME =
  "underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint";
const QUIET_BUTTON_CLASS_NAME =
  "cursor-pointer rounded-full px-3 py-1.5 text-xs leading-4 font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint";

export function BrainNotice({
  brainState,
  onDownloadClick,
}: {
  readonly brainState: AssistantBrainState;
  readonly onDownloadClick: () => void;
}) {
  switch (brainState.status) {
    case "checking":
    case "on_device_ready":
    case "cloud_ready":
      return null;
    case "on_device_downloadable":
      return (
        <div className="space-y-2 rounded-xl border border-border px-3 py-3">
          <p className="text-xs leading-4 text-muted-foreground">
            This browser can run the assistant on your device, so your questions never leave it.
            Chrome downloads the model once and needs about 22 GB of free disk space for it.
          </p>
          <button
            type="button"
            onClick={onDownloadClick}
            className="cursor-pointer rounded-full bg-primary-imprint px-4 py-1.5 text-xs font-medium text-primary-imprint-foreground transition-colors hover:bg-primary-imprint-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint"
          >
            Download on-device model
          </button>
        </div>
      );
    case "on_device_downloading":
      return (
        <div className="space-y-2 rounded-xl border border-border px-3 py-3">
          <p className="text-xs leading-4 text-muted-foreground">
            {brainState.progressPercent === null
              ? "Chrome is downloading the on-device model. This page cannot see its progress."
              : `Chrome is downloading the on-device model: ${brainState.progressPercent}%.`}
          </p>
          <progress
            className="h-1.5 w-full accent-primary-imprint"
            max={100}
            {...(brainState.progressPercent === null ? {} : { value: brainState.progressPercent })}
            aria-label="On-device model download"
          />
        </div>
      );
    case "no_chat":
      // Only a signed-out viewer has something to do: sign in, in case their account has Premium
      // AI. Everyone else is told why by the model strip; there is nothing to click.
      return brainState.reason === "signed_out" ? (
        <p className="text-xs leading-4 text-muted-foreground">
          Have Premium AI?{" "}
          <Link href="/sign-in" className={QUIET_LINK_CLASS_NAME}>
            Sign in
          </Link>{" "}
          to chat. The places below work either way.
        </p>
      ) : null;
    default: {
      const exhaustiveCheck: never = brainState;
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

export const ASSISTANT_CHIP_CLASS_NAME =
  "inline-block rounded-full border border-border bg-background/70 px-3 py-1.5 text-xs leading-4 font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint";

export function PlacesSection({ onNavigate }: { readonly onNavigate: () => void }) {
  return (
    <details className="group/places">
      <summary className="cursor-pointer text-xs leading-4 font-medium text-foreground">
        Places, by what you came to do
      </summary>
      {DESTINATION_GROUPS.map((destinationGroup) => (
        <section key={destinationGroup.audienceId} className="mt-3">
          <h3 className="text-xs leading-4 font-medium text-muted-foreground">
            {destinationGroup.headline}
          </h3>
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
    </details>
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
    <details>
      <summary className="cursor-pointer text-xs leading-4 font-medium text-foreground">
        What it remembers ({memoryNotes.length})
      </summary>
      <p className="mt-2 text-xs leading-4 text-muted-foreground">
        Notes you saved, kept in this browser only. The assistant reads them with each question.
      </p>
      {memoryNotes.length > 0 && (
        <>
          <ul className="mt-2 divide-y divide-border">
            {memoryNotes.map((memoryNote, noteIndex) => (
              <li key={`${noteIndex}-${memoryNote}`} className="flex items-start gap-2 py-1.5">
                <span className="min-w-0 flex-1 text-xs leading-4 break-words text-foreground">
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
          <button
            type="button"
            onClick={onClearNotes}
            className={`mt-1 ${QUIET_BUTTON_CLASS_NAME}`}
          >
            Forget everything
          </button>
        </>
      )}
    </details>
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
    <details>
      <summary className="cursor-pointer text-xs leading-4 font-medium text-foreground">
        How it looks and moves
      </summary>
      <div className="mt-2 space-y-3">
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
          className="cursor-pointer text-xs leading-4 font-medium text-foreground underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint"
        >
          Move to the {otherDockSide} corner
        </button>
      </div>
    </details>
  );
}

// TRANSPORT: props-only — renders state and authored constants.
"use client";

// THE PANEL'S STANDING SECTIONS: which model answers, where things are, and what it remembers.
//
// `BrainNotice` is the one place the panel says where a question will go, and it says it before the
// question is asked. On-device needs no notice beyond the header badge (nothing leaves the
// device); the cloud route says Gemini and Qatoto by name, because that is where the words go.
//
// THE DOWNLOAD COPY STATES ONLY WHAT IS TRUE. Chrome documents the disk it needs (about 22 GB free)
// and does not report the download's own size, so no size is printed: a wrong number is worse than
// none. The progress bar is real — it is Chrome's own `downloadprogress` — or, when Chrome started
// the download somewhere this page cannot monitor, an indeterminate bar that says so.

import Link from "next/link";

import type { AssistantBrainState } from "@/components/assistant/assistant-brain-state";
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
      return <p className="text-xs leading-4 text-muted-foreground">Checking this browser…</p>;
    case "on_device_ready":
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
          <CloudMeanwhileLine canChatViaCloud={brainState.canChatViaCloud} />
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
          <CloudMeanwhileLine canChatViaCloud={brainState.canChatViaCloud} />
        </div>
      );
    case "cloud_ready":
      return (
        <p className="text-xs leading-4 text-muted-foreground">
          This browser cannot run the model itself, so your questions go to Google Gemini through
          Qatoto. Qatoto does not keep them.
        </p>
      );
    case "finish_sign_up":
      return (
        <p className="text-xs leading-4 text-muted-foreground">
          Finish setting up your account to ask questions here.{" "}
          <Link href="/sign-up" className={QUIET_LINK_CLASS_NAME}>
            Finish signing up
          </Link>
        </p>
      );
    case "sign_in_required":
      return (
        <p className="text-xs leading-4 text-muted-foreground">
          This browser cannot run the assistant&apos;s model itself.{" "}
          <Link href="/sign-in" className={QUIET_LINK_CLASS_NAME}>
            Sign in
          </Link>{" "}
          to ask through Qatoto instead. The places below work either way.
        </p>
      );
    default: {
      const exhaustiveCheck: never = brainState;
      return exhaustiveCheck;
    }
  }
}

function CloudMeanwhileLine({ canChatViaCloud }: { readonly canChatViaCloud: boolean }) {
  return (
    <p className="text-xs leading-4 text-muted-foreground">
      {canChatViaCloud ? (
        "Until it is ready, your questions go to Google Gemini through Qatoto, which does not keep them."
      ) : (
        <>
          Until it is ready,{" "}
          <Link href="/sign-in" className={QUIET_LINK_CLASS_NAME}>
            sign in
          </Link>{" "}
          to ask through Qatoto instead.
        </>
      )}
    </p>
  );
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

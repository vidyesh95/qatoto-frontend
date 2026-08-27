"use client";

import Image from "next/image";
import { useState } from "react";
import type { StudioVideoVisibility, UploadDraft } from "@/lib/videos/studio-view";

// Step 4 — visibility. THREE TIERS, NOT FOUR. `investor_only` and NDA-gated playback
// exist in the enum (`VIDEO_VISIBILITIES`) and a badge still renders for a row that
// carries them, but they are UNREACHABLE FROM THIS WIZARD and the option is not offered.
//
// Every video created here is a YouTube link, and `createVideo` opens with
// `assertGatingSupported("youtube", …)` — videoSource hardcoded — so the pair is refused
// before the oEmbed call, and `video_gating_ck` refuses it at the storage layer too. The
// bytes live on youtube.com; anyone with the link watches them signed in or not, so
// gating them would be a false security promise. Offering the tier anyway shipped a
// control that answered `GATING_UNSUPPORTED_FOR_SOURCE` every single time.
//
// This comes back only if self-hosted video does (STUDIO §0 defers it explicitly).
const VISIBILITY_OPTIONS: Array<{
  value: StudioVideoVisibility;
  label: string;
  description: string;
}> = [
  {
    value: "private",
    label: "Private",
    description: "Only you can watch this video.",
  },
  {
    value: "unlisted",
    label: "Unlisted",
    description: "Anyone with the link can watch.",
  },
  {
    value: "public",
    label: "Public",
    description: "Everyone can watch this video.",
  },
];

type VisibilityStepProps = {
  draft: UploadDraft;
  onDraftChange: (patch: Partial<UploadDraft>) => void;
};

export default function VisibilityStep({ draft, onDraftChange }: VisibilityStepProps) {
  const [isScheduleSectionOpen, setIsScheduleSectionOpen] = useState(
    draft.scheduledPublishDate !== "",
  );

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-2xl border border-border p-6">
        <div>
          <h3 className="text-base font-semibold text-foreground">Visibility</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose when and who can see your video.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {VISIBILITY_OPTIONS.map((visibilityOption) => {
            const isSelected = draft.visibility === visibilityOption.value;
            return (
              <button
                key={visibilityOption.value}
                type="button"
                onClick={() => onDraftChange({ visibility: visibilityOption.value })}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                  isSelected ? "border-[#1DBDC5] bg-secondary/50" : "border-border hover:bg-muted"
                }`}
              >
                <span
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
                    isSelected ? "border-foreground bg-foreground" : "border-border"
                  }`}
                >
                  {isSelected && (
                    <Image
                      src="/icons/check_18dp_FFFFFF_FILL1_wght400_GRAD0_opsz20.svg"
                      alt=""
                      width={12}
                      height={12}
                    />
                  )}
                </span>
                <span>
                  <span className="block text-sm font-medium text-foreground">
                    {visibilityOption.label}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {visibilityOption.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-border p-6">
        <button
          type="button"
          onClick={() => setIsScheduleSectionOpen(!isScheduleSectionOpen)}
          className="flex cursor-pointer items-center justify-between text-left"
        >
          <div>
            <h3 className="text-base font-semibold text-foreground">Schedule</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Select a date to make your video public.
            </p>
          </div>
          <Image
            src="/icons/keyboard_arrow_down_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt=""
            width={20}
            height={20}
            className={isScheduleSectionOpen ? "rotate-180" : ""}
          />
        </button>

        {isScheduleSectionOpen && (
          <div className="flex flex-col gap-2">
            <input
              type="datetime-local"
              aria-label="Scheduled publish date and time"
              value={draft.scheduledPublishDate}
              onChange={(event) => onDraftChange({ scheduledPublishDate: event.target.value })}
              className="h-12 rounded-lg border border-border bg-transparent px-3 text-sm outline-none focus:border-[#1DBDC5] sm:w-80"
            />
            {draft.scheduledPublishDate !== "" && (
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  Will publish on {formatScheduledDateLabel(draft.scheduledPublishDate)}.
                </p>
                <button
                  type="button"
                  onClick={() => onDraftChange({ scheduledPublishDate: "" })}
                  className="cursor-pointer text-xs text-muted-foreground underline hover:text-foreground"
                >
                  Clear schedule
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2 rounded-2xl border border-border p-6">
        <h3 className="text-base font-semibold text-foreground">Before you publish</h3>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
          <li>Check your video for copyright and privacy issues.</li>
          <li>Make sure links, roles, and attached products are up to date.</li>
          <li>You can change visibility any time from My videos.</li>
        </ul>
      </section>
    </div>
  );
}

function formatScheduledDateLabel(scheduledPublishDate: string) {
  const parsedDate = new Date(scheduledPublishDate);
  if (Number.isNaN(parsedDate.getTime())) return scheduledPublishDate;
  return parsedDate.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

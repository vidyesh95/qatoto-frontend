"use client";

import Image from "next/image";
import { useState } from "react";
import { StudioVideoVisibility, UploadDraft } from "@/state/studio-videos-context";

// Step 4 — visibility. Qatoto adds a fourth tier (Investor-only, optionally
// NDA-gated) beyond YouTube's private/unlisted/public. NDA acceptance and
// investor identity are enforced server-side — this UI only records intent.
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
  {
    value: "investor-only",
    label: "Investor-only",
    description: "A private pitch visible to selected investors only.",
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

        {draft.visibility === "investor-only" && (
          <div className="flex flex-col gap-2 rounded-xl bg-secondary/50 p-4">
            <button
              type="button"
              onClick={() => onDraftChange({ isNdaRequired: !draft.isNdaRequired })}
              className="flex cursor-pointer items-start gap-3 text-left"
            >
              <span
                className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border ${
                  draft.isNdaRequired ? "border-foreground bg-foreground" : "border-border"
                }`}
              >
                {draft.isNdaRequired && (
                  <Image
                    src="/icons/check_18dp_FFFFFF_FILL1_wght400_GRAD0_opsz20.svg"
                    alt=""
                    width={14}
                    height={14}
                  />
                )}
              </span>
              <span className="text-sm text-foreground">
                Require NDA acceptance before playback
              </span>
            </button>
            <p className="text-xs text-muted-foreground">
              NDA acceptance and investor identity are verified server-side — viewers accept the NDA
              before the video plays.
            </p>
          </div>
        )}
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

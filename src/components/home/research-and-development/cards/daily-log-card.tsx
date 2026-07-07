import Image from "next/image";

import type { AiSummaryChipKind, DailyLog, TeamMember } from "@/types/research-and-development";

const AI_SUMMARY_CHIP_COLOR_CLASSES: Record<AiSummaryChipKind, string> = {
  blocker: "bg-red-100 text-red-800",
  progress: "bg-green-100 text-green-800",
  velocity: "bg-blue-100 text-blue-800",
  suggestion: "bg-amber-100 text-amber-800",
};

// Daily-log feed entry: author header with the Proof of Effort badge, a
// video-thumbnail placeholder with a play glyph, a clamped transcript that
// expands via native <details> (zero JS), and kind-colored AI summary chips.
// AI analysis and effort verification are display-only mocks — backend later.
export default function DailyLogCard({ log, author }: { log: DailyLog; author?: TeamMember }) {
  return (
    <div className="space-y-2 rounded-2xl border border-[#CAC4D0]/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        {author && (
          <>
            <Image
              src={author.avatarImageSrc}
              width={32}
              height={32}
              alt={author.name}
              className="size-8 shrink-0 rounded-full object-cover"
            />
            <span className="text-sm font-medium">{author.name}</span>
          </>
        )}
        <span className="text-xs text-muted-foreground">{log.date}</span>
        {log.isEffortVerified && (
          <span className="flex items-center gap-1 text-xs text-[#00696E]">
            <Image
              src="/icons/fact_check_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
              width={16}
              height={16}
              alt=""
            />
            Proof of Effort verified
          </span>
        )}
      </div>
      <div className="relative aspect-video w-full overflow-hidden rounded-xl">
        <Image
          src={log.videoThumbnailSrc}
          fill
          sizes="(min-width: 1024px) 640px, 100vw"
          alt={`Daily log video from ${log.date}`}
          className="object-cover"
        />
        <div className="absolute inset-0 grid place-items-center">
          <span className="grid size-12 place-items-center rounded-full bg-white/90 text-[#191C1C]">
            ▶
          </span>
        </div>
      </div>
      <p className="line-clamp-2 text-sm">{log.transcriptExcerpt}</p>
      <details>
        <summary className="cursor-pointer text-xs font-medium text-[#00696E]">
          Read full log
        </summary>
        <p className="mt-1 text-sm text-muted-foreground">{log.detail}</p>
      </details>
      <div className="flex flex-wrap gap-1.5">
        {log.aiSummaryChips.map((aiSummaryChip) => (
          <span
            key={`${aiSummaryChip.kind}-${aiSummaryChip.label}`}
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${AI_SUMMARY_CHIP_COLOR_CLASSES[aiSummaryChip.kind]}`}
          >
            {aiSummaryChip.label}
          </span>
        ))}
      </div>
    </div>
  );
}

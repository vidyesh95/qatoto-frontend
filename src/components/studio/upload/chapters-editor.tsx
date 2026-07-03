"use client";

import Image from "next/image";
import { VideoChapter } from "@/state/studio-videos-context";

// Manual chapters editor (no AI auto-detect). Rules mirror YouTube's and are
// surfaced as inline hints only for the UI phase — the backend re-validates on
// real save. Saving with invalid rows is allowed for now.
const MINIMUM_CHAPTERS_TO_SHOW_ON_PLAYER = 3;
const MINIMUM_CHAPTER_LENGTH_IN_SECONDS = 10;

type ChaptersEditorProps = {
  chapters: VideoChapter[];
  onChaptersChange: (chapters: VideoChapter[]) => void;
};

export default function ChaptersEditor({ chapters, onChaptersChange }: ChaptersEditorProps) {
  function handleAddChapterClick() {
    const newChapter: VideoChapter = {
      id: crypto.randomUUID(),
      timestampLabel: chapters.length === 0 ? "00:00" : "",
      title: "",
    };
    onChaptersChange([...chapters, newChapter]);
  }

  function handleChapterFieldChange(chapterId: string, patch: Partial<VideoChapter>) {
    onChaptersChange(
      chapters.map((chapter) => (chapter.id === chapterId ? { ...chapter, ...patch } : chapter)),
    );
  }

  function handleRemoveChapterClick(chapterId: string) {
    onChaptersChange(chapters.filter((chapter) => chapter.id !== chapterId));
  }

  function handleMoveChapterClick(chapterIndex: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? chapterIndex - 1 : chapterIndex + 1;
    if (targetIndex < 0 || targetIndex >= chapters.length) return;
    const reorderedChapters = [...chapters];
    [reorderedChapters[chapterIndex], reorderedChapters[targetIndex]] = [
      reorderedChapters[targetIndex],
      reorderedChapters[chapterIndex],
    ];
    onChaptersChange(reorderedChapters);
  }

  const chapterErrors = validateChapters(chapters);
  const validChapterCount = chapters.length - chapterErrors.filter(Boolean).length;
  const missingChapterCount = MINIMUM_CHAPTERS_TO_SHOW_ON_PLAYER - validChapterCount;

  return (
    <div className="flex flex-col gap-3">
      {chapters.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No chapters yet — add one to let viewers jump around.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {chapters.map((chapter, chapterIndex) => (
            <li key={chapter.id} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={chapter.timestampLabel}
                  onChange={(event) =>
                    handleChapterFieldChange(chapter.id, { timestampLabel: event.target.value })
                  }
                  placeholder="00:00"
                  className="h-10 w-24 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#1DBDC5]"
                />
                <input
                  type="text"
                  value={chapter.title}
                  onChange={(event) =>
                    handleChapterFieldChange(chapter.id, { title: event.target.value })
                  }
                  placeholder="Chapter title, e.g. Demo"
                  className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#1DBDC5]"
                />
                <button
                  type="button"
                  onClick={() => handleMoveChapterClick(chapterIndex, "up")}
                  disabled={chapterIndex === 0}
                  aria-label="Move chapter up"
                  className="cursor-pointer rounded-full p-1.5 transition-colors hover:bg-muted disabled:cursor-default disabled:opacity-30"
                >
                  <Image
                    src="/icons/keyboard_arrow_down_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                    alt=""
                    width={20}
                    height={20}
                    className="rotate-180"
                  />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveChapterClick(chapterIndex, "down")}
                  disabled={chapterIndex === chapters.length - 1}
                  aria-label="Move chapter down"
                  className="cursor-pointer rounded-full p-1.5 transition-colors hover:bg-muted disabled:cursor-default disabled:opacity-30"
                >
                  <Image
                    src="/icons/keyboard_arrow_down_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                    alt=""
                    width={20}
                    height={20}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveChapterClick(chapter.id)}
                  aria-label="Remove chapter"
                  className="cursor-pointer rounded-full p-1.5 transition-colors hover:bg-muted"
                >
                  <Image
                    src="/icons/delete_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                    alt=""
                    width={20}
                    height={20}
                  />
                </button>
              </div>
              {chapterErrors[chapterIndex] && (
                <p className="text-xs text-destructive">{chapterErrors[chapterIndex]}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {chapters.length > 0 && missingChapterCount > 0 && (
        <p className="text-xs text-muted-foreground">
          Add {missingChapterCount} more valid chapter{missingChapterCount === 1 ? "" : "s"} to show
          chapters on the player (minimum {MINIMUM_CHAPTERS_TO_SHOW_ON_PLAYER}).
        </p>
      )}

      <div>
        <button
          type="button"
          onClick={handleAddChapterClick}
          className="flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50"
        >
          <Image
            src="/icons/add_circle_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt=""
            width={20}
            height={20}
          />
          Add chapter
        </button>
      </div>
    </div>
  );
}

// Accepts mm:ss or hh:mm:ss; returns total seconds or null when malformed.
function parseTimestampToSeconds(timestampLabel: string): number | null {
  const timestampMatch = timestampLabel.trim().match(/^(?:(\d{1,2}):)?(\d{1,2}):([0-5]\d)$/);
  if (!timestampMatch) return null;
  const [, hoursPart, minutesPart, secondsPart] = timestampMatch;
  const hours = hoursPart ? Number(hoursPart) : 0;
  const minutes = Number(minutesPart);
  const seconds = Number(secondsPart);
  if (minutes > 59 && hoursPart) return null;
  return hours * 3600 + minutes * 60 + seconds;
}

// One error message per row (null = valid). Later rows are judged against the
// nearest earlier row that parsed, so a single typo doesn't cascade.
function validateChapters(chapters: VideoChapter[]): Array<string | null> {
  let previousValidSeconds: number | null = null;

  return chapters.map((chapter, chapterIndex) => {
    const chapterSeconds = parseTimestampToSeconds(chapter.timestampLabel);

    if (chapterSeconds === null) {
      return "Use mm:ss or hh:mm:ss, e.g. 02:30";
    }
    if (chapterIndex === 0 && chapterSeconds !== 0) {
      return "First chapter must start at 00:00";
    }
    if (previousValidSeconds !== null) {
      if (chapterSeconds <= previousValidSeconds) {
        return "Timestamps must be strictly ascending";
      }
      if (chapterSeconds - previousValidSeconds < MINIMUM_CHAPTER_LENGTH_IN_SECONDS) {
        return `Each chapter must be at least ${MINIMUM_CHAPTER_LENGTH_IN_SECONDS} seconds long`;
      }
    }
    previousValidSeconds = chapterSeconds;
    return null;
  });
}

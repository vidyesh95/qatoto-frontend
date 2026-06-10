"use client";

import { useState } from "react";

import Image from "next/image";

type Chapter = {
  title: string;
  time: string;
  thumbSrc: string;
};

type TranscriptLine = {
  time: string;
  text: string;
};

export type WatchInfoPanelProps = {
  videoId: string;
  chapters: Chapter[];
  transcriptTitle: string;
  transcript: TranscriptLine[];
  onClose?: () => void;
  className?: string;
};

type Tab = "chapters" | "transcript";

/** Parse a "mm:ss" or "hh:mm:ss" timestamp into whole seconds. */
function timeToSeconds(time: string): number {
  return time
    .split(":")
    .map(Number)
    .reduce((acc, part) => acc * 60 + part, 0);
}

export default function WatchInfoPanel({
  videoId,
  chapters,
  transcriptTitle,
  transcript,
  onClose,
  className = "",
}: WatchInfoPanelProps) {
  const [tab, setTab] = useState<Tab>("chapters");
  const [selectedChapter, setSelectedChapter] = useState<string>(chapters[0]?.title ?? "");
  const [open, setOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showTimestamps, setShowTimestamps] = useState(true);

  function handleClose() {
    setOpen(false);
    onClose?.();
  }

  if (!open) return null;

  function shareChapter(time: string) {
    const seconds = timeToSeconds(time);
    const url = `${window.location.origin}/watch?v=${encodeURIComponent(videoId)}&t=${seconds}`;
    void navigator.clipboard?.writeText(url);
  }

  return (
    <aside
      className={`flex flex-col overflow-hidden rounded-xl border border-[#E5E7E7] bg-background ${className}`}
    >
      {/* Header */}
      <div className="flex shrink-0 flex-row items-center justify-between border-b border-[#E5E7E7] py-2 pr-2 pl-4">
        <h2 className="text-lg">In this video</h2>
        <div className="flex flex-row items-center gap-2">
          {tab === "transcript" && (
            <div className="relative">
              <button
                type="button"
                aria-label="more options"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="cursor-pointer rounded-full p-2 hover:bg-black/10"
                onClick={() => setMenuOpen((v) => !v)}
              >
                <Image
                  src="/icons/more_vert_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                  width={24}
                  height={24}
                  alt=""
                />
              </button>
              {menuOpen && (
                <>
                  <button
                    type="button"
                    aria-label="close menu"
                    tabIndex={-1}
                    className="fixed inset-0 z-10 cursor-default"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div
                    role="menu"
                    className="absolute top-full right-0 z-20 mt-1 min-w-56 rounded-lg border border-[#E5E7E7] bg-background py-1 shadow-lg"
                  >
                    <button
                      type="button"
                      role="menuitemcheckbox"
                      aria-checked={showTimestamps}
                      className="flex w-full cursor-pointer flex-row items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-[#F1F3F3]"
                      onClick={() => {
                        setShowTimestamps((v) => !v);
                        setMenuOpen(false);
                      }}
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                        {showTimestamps && (
                          <Image
                            src="/icons/check_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                            width={18}
                            height={18}
                            alt=""
                          />
                        )}
                      </span>
                      Toggle timestamps
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          <button
            type="button"
            aria-label="close"
            className="cursor-pointer rounded-full p-2 hover:bg-black/10"
            onClick={handleClose}
          >
            <Image
              src="/icons/close_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              width={24}
              height={24}
              alt=""
            />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex shrink-0 flex-row items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setTab("chapters")}
          className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            tab === "chapters" ? "bg-foreground text-background" : "bg-[#F1F3F3] text-foreground"
          }`}
        >
          Chapters
        </button>
        <button
          type="button"
          onClick={() => setTab("transcript")}
          className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            tab === "transcript" ? "bg-foreground text-background" : "bg-[#F1F3F3] text-foreground"
          }`}
        >
          Transcript
        </button>
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "chapters" ? (
          <ul>
            {chapters.map((chapter) => (
              <li
                key={chapter.title}
                className={`group flex flex-row items-center gap-3 px-4 py-2.5 hover:bg-[#F1F3F3] ${
                  selectedChapter === chapter.title ? "bg-primary/30" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedChapter(chapter.title)}
                  className="flex min-w-0 flex-1 cursor-pointer flex-row items-center gap-3 text-left"
                >
                  <Image
                    src={chapter.thumbSrc}
                    width={96}
                    height={54}
                    alt=""
                    className="aspect-video w-24 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{chapter.title}</p>
                    <span className="mt-1 inline-block rounded-md bg-[#EAF1FB] px-1.5 py-0.5 text-xs font-medium text-[#1B66C9]">
                      {chapter.time}
                    </span>
                  </div>
                </button>
                <div
                  className={`flex shrink-0 flex-row items-center gap-3 pr-1 transition-opacity group-hover:opacity-100 has-focus-visible:opacity-100 ${
                    selectedChapter === chapter.title ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <button
                    type="button"
                    aria-label={`share chapter "${chapter.title}"`}
                    className="cursor-pointer rounded-full p-2 hover:bg-black/10"
                    onClick={() => shareChapter(chapter.time)}
                  >
                    <Image
                      src="/icons/share_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                      width={24}
                      height={24}
                      alt=""
                    />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col">
            {/* Search */}
            <div className="flex flex-row items-center gap-3 px-5 py-2">
              <Image
                src="/icons/search_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                width={22}
                height={22}
                alt=""
              />
              <input
                type="text"
                aria-label="Search in video"
                placeholder="Search in video"
                className="flex-1 bg-transparent text-base outline-none placeholder:text-[#6F7979]"
              />
            </div>

            <h3 className="px-5 pt-4 pb-2 text-xl font-bold">{transcriptTitle}</h3>

            <ul className="px-5 pb-4">
              {transcript.map((line) => (
                <li key={line.time} className="flex flex-row gap-4 py-2.5">
                  {showTimestamps && (
                    <span className="shrink-0 self-start rounded-md bg-[#EAF1FB] px-1.5 py-0.5 text-xs font-medium text-[#1B66C9]">
                      {line.time}
                    </span>
                  )}
                  <p className="text-[15px] leading-relaxed">{line.text}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Footer (transcript only) */}
      {tab === "transcript" && (
        <div className="shrink-0 border-t border-[#E5E7E7] px-5 py-3">
          <button type="button" className="flex flex-row items-center gap-1 text-sm font-medium">
            English
            <Image
              src="/icons/chevron_forward_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
              width={18}
              height={18}
              alt=""
              className="rotate-90"
            />
          </button>
        </div>
      )}
    </aside>
  );
}

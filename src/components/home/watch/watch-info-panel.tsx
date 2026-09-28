"use client";

import { useState } from "react";

import Image from "next/image";

type Chapter = {
  title: string;
  time: string;
  /**
   * Per-chapter still.
   *
   * OPTIONAL, because the real ones have none. `GET /feed/watch/:videoId` returns chapters as
   * `{ startSeconds, title }` — generating a frame at a timestamp would mean decoding video the
   * platform does not host. The row falls back to a text-only layout rather than a broken image.
   */
  thumbSrc?: string;
};

type TranscriptLine = {
  /** NULL for a plain-text transcript, which carries no timing — no badge is drawn for it. */
  time: string | null;
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
  const hasTranscript = transcript.length > 0;
  // A video with a transcript and no chapters opens on the transcript rather than an empty list.
  const [tab, setTab] = useState<Tab>(
    chapters.length === 0 && hasTranscript ? "transcript" : "chapters",
  );
  const [transcriptSearchText, setTranscriptSearchText] = useState("");
  const normalizedTranscriptSearchText = transcriptSearchText.trim().toLowerCase();
  const visibleTranscript =
    normalizedTranscriptSearchText === ""
      ? transcript
      : transcript.filter((line) =>
          line.text.toLowerCase().includes(normalizedTranscriptSearchText),
        );
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
      className={`flex flex-col overflow-hidden rounded-xl border border-border bg-background ${className}`}
    >
      {/* Header */}
      <div className="flex shrink-0 flex-row items-center justify-between border-b border-border py-2 pr-2 pl-4">
        <h2 className="text-lg">In this video</h2>
        <div className="flex flex-row items-center gap-2">
          {hasTranscript && tab === "transcript" && (
            <div className="relative">
              <button
                type="button"
                aria-label="more options"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="cursor-pointer rounded-full p-2 hover:bg-muted"
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
                    className="absolute top-full right-0 z-20 mt-1 min-w-56 rounded-lg border border-border bg-background py-1 shadow-lg"
                  >
                    <button
                      type="button"
                      role="menuitemcheckbox"
                      aria-checked={showTimestamps}
                      className="flex w-full cursor-pointer flex-row items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted"
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
            className="cursor-pointer rounded-full p-2 hover:bg-muted"
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
            tab === "chapters" ? "bg-foreground text-background" : "bg-muted text-foreground"
          }`}
        >
          Chapters
        </button>
        {/*
          HIDDEN WHEN THERE IS NO TRANSCRIPT. The transcript is the creator's own uploaded subtitle
          file or text — the platform runs no speech-to-text — so most videos have none, and a tab
          that opens onto nothing is a control that cannot do what it says.
        */}
        {hasTranscript && (
          <button
            type="button"
            onClick={() => setTab("transcript")}
            className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === "transcript" ? "bg-foreground text-background" : "bg-muted text-foreground"
            }`}
          >
            Transcript
          </button>
        )}
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "chapters" ? (
          <ul>
            {chapters.map((chapter) => (
              <li
                key={chapter.title}
                className={`group flex flex-row items-center gap-3 px-4 py-2.5 hover:bg-muted ${
                  selectedChapter === chapter.title ? "bg-primary/30" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedChapter(chapter.title)}
                  className="flex min-w-0 flex-1 cursor-pointer flex-row items-center gap-3 text-left"
                >
                  {chapter.thumbSrc !== undefined && (
                    <Image
                      src={chapter.thumbSrc}
                      width={96}
                      height={54}
                      alt=""
                      className="aspect-video w-24 shrink-0 rounded-lg object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{chapter.title}</p>
                    <span className="mt-1 inline-block rounded-md bg-secondary px-1.5 py-0.5 text-xs font-medium text-primary-imprint">
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
                    className="cursor-pointer rounded-full p-2 hover:bg-muted"
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
                aria-label="Search the transcript"
                placeholder="Search the transcript"
                value={transcriptSearchText}
                onChange={(event) => setTranscriptSearchText(event.target.value)}
                className="flex-1 bg-transparent text-base outline-none placeholder:text-outline-strong"
              />
            </div>

            <h3 className="px-5 pt-4 pb-2 text-xl font-bold">{transcriptTitle}</h3>

            {visibleTranscript.length === 0 && (
              <p className="px-5 pb-4 text-sm text-muted-foreground">
                No lines match “{transcriptSearchText.trim()}”.
              </p>
            )}

            <ul className="px-5 pb-4">
              {/* Index keys: the list is static per video, and neither times (a plain-text
                  transcript has none) nor texts are unique. */}
              {visibleTranscript.map((line, lineIndex) => (
                <li key={lineIndex} className="flex flex-row gap-4 py-2.5">
                  {/* `min-w-16` + tabular digits: "0:04", "12:30" and "1:02:03" are different widths,
                      and without a shared minimum each row's text started at a different x. */}
                  {showTimestamps && line.time !== null && (
                    <span className="min-w-16 shrink-0 self-start rounded-md bg-secondary px-1.5 py-0.5 text-center text-xs font-medium text-primary-imprint tabular-nums">
                      {line.time}
                    </span>
                  )}
                  <p className="text-sm leading-relaxed">{line.text}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* NO LANGUAGE PICKER. There was an "English" button here with no handler: a creator uploads
          one transcript per video, so there is no second language for it to switch to. */}
    </aside>
  );
}

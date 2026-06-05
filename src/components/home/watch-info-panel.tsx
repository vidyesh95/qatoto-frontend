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
  chapters: Chapter[];
  transcriptTitle: string;
  transcript: TranscriptLine[];
  onClose?: () => void;
  className?: string;
};

type Tab = "chapters" | "transcript";

export default function WatchInfoPanel({
  chapters,
  transcriptTitle,
  transcript,
  onClose,
  className = "",
}: WatchInfoPanelProps) {
  const [tab, setTab] = useState<Tab>("chapters");

  return (
    <aside
      className={`flex flex-col rounded-xl border border-[#E5E7E7] bg-background overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="flex flex-row items-center justify-between pl-4 pr-2 py-2 border-b border-[#E5E7E7] shrink-0">
        <h2 className="text-lg">In this video</h2>
        <div className="flex flex-row items-center gap-2">
          {tab === "transcript" && (
            <button
              type="button"
              aria-label="more options"
              className="p-2 hover:bg-black/10 rounded-full cursor-pointer"
            >
              <Image
                src="/icons/more_vert_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                width={24}
                height={24}
                alt=""
              />
            </button>
          )}
          <button
            type="button"
            aria-label="close"
            className="p-2 hover:bg-black/10 rounded-full cursor-pointer"
            onClick={onClose}
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
      <div className="flex flex-row items-center gap-2 px-4 py-3 shrink-0">
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
      <div className="flex-1 min-h-0 overflow-y-auto">
        {tab === "chapters" ? (
          <ul>
            {chapters.map((chapter, index) => (
              <li
                key={chapter.title}
                className={`group flex flex-row items-center gap-3 px-4 py-2.5 ${
                  index === 0 ? "bg-[#F1F3F3]" : ""
                }`}
              >
                <Image
                  src={chapter.thumbSrc}
                  width={96}
                  height={54}
                  alt=""
                  className="w-24 aspect-video rounded-lg object-cover shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{chapter.title}</p>
                  <span className="inline-block mt-1 rounded-md bg-[#EAF1FB] px-1.5 py-0.5 text-xs font-medium text-[#1B66C9]">
                    {chapter.time}
                  </span>
                </div>
                {index === 0 && (
                  <div className="flex flex-row items-center gap-3 shrink-0 pr-1">
                    <button type="button" aria-label="share chapter">
                      <Image
                        src="/icons/share_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                        width={20}
                        height={20}
                        alt=""
                      />
                    </button>
                  </div>
                )}
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
                className="flex-1 bg-transparent text-base placeholder:text-[#6F7979] outline-none"
              />
            </div>

            <h3 className="px-5 pt-4 pb-2 text-xl font-bold">{transcriptTitle}</h3>

            <ul className="px-5 pb-4">
              {transcript.map((line) => (
                <li key={line.time} className="flex flex-row gap-4 py-2.5">
                  <span className="shrink-0 self-start rounded-md bg-[#EAF1FB] px-1.5 py-0.5 text-xs font-medium text-[#1B66C9]">
                    {line.time}
                  </span>
                  <p className="text-[15px] leading-relaxed">{line.text}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Footer (transcript only) */}
      {tab === "transcript" && (
        <div className="border-t border-[#E5E7E7] px-5 py-3 shrink-0">
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

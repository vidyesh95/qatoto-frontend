"use client";

import { useState } from "react";

import { MAX_VIDEO_TRANSCRIPT_BYTES } from "@/lib/videos/api";
import type { VideoTranscriptFormat, VideoTranscriptSummary } from "@/lib/videos/schemas";

/**
 * What the next save will do to the transcript. HELD BY THE MODAL, for the reason the thumbnail
 * and documents are: a `File` is not JSON, and `PUT /videos/:videoId/transcript` needs a videoId
 * that does not exist until after create.
 */
export type PendingTranscriptChange =
  | { readonly kind: "unchanged" }
  | { readonly kind: "replace"; readonly transcriptFile: File; readonly sourceLabel: string }
  | { readonly kind: "remove" };

const TRANSCRIPT_FORMAT_LABELS: Record<VideoTranscriptFormat, string> = {
  srt: "SubRip (.srt)",
  vtt: "WebVTT (.vtt)",
  text: "Plain text",
};

function formatKilobytes(byteCount: number): string {
  return `${Math.max(1, Math.round(byteCount / 1024)).toLocaleString("en-US")} KB`;
}

/**
 * An optional transcript the creator already has — a subtitle file, or text they paste.
 *
 * ⚠️ **NOTHING HERE TRANSCRIBES ANYTHING, AND THE COPY MUST NOT SUGGEST IT DOES.** Qatoto never
 * holds a video's audio (it stays on YouTube), so there is nothing for speech-to-text to run on and
 * no cost to pay for one. What the creator uploads is shown in the watch page's Transcript tab. The
 * captions inside the YouTube player are YouTube's and are not touched.
 *
 * The format is not chosen here: the server reads the bytes and decides srt, vtt or text. The size
 * check is courtesy; the server holds the same 1 MB cap and re-checks every line.
 */
export default function TranscriptField({
  savedTranscript,
  pendingChange,
  onPendingChangeChange,
}: {
  readonly savedTranscript: VideoTranscriptSummary | null;
  readonly pendingChange: PendingTranscriptChange;
  readonly onPendingChangeChange: (nextChange: PendingTranscriptChange) => void;
}) {
  const [pastedText, setPastedText] = useState("");
  const [rejectionMessage, setRejectionMessage] = useState<string | null>(null);

  function stageTranscriptFile(transcriptFile: File, sourceLabel: string): void {
    if (transcriptFile.size > MAX_VIDEO_TRANSCRIPT_BYTES) {
      setRejectionMessage(
        `That transcript is ${formatKilobytes(transcriptFile.size)}. The limit is 1 MB.`,
      );
      return;
    }
    setRejectionMessage(null);
    onPendingChangeChange({ kind: "replace", transcriptFile, sourceLabel });
  }

  function handleTranscriptFileChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const [pickedFile] = Array.from(event.target.files ?? []);
    if (pickedFile !== undefined) stageTranscriptFile(pickedFile, pickedFile.name);
    // Cleared so picking the same file again after cancelling fires `change`.
    event.target.value = "";
  }

  function handleUsePastedTextClick(): void {
    const trimmedText = pastedText.trim();
    if (trimmedText === "") return;
    stageTranscriptFile(
      new File([trimmedText], "transcript.txt", { type: "text/plain" }),
      "Pasted text",
    );
    setPastedText("");
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-foreground">
        {describeTranscriptState(savedTranscript, pendingChange)}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <label className="cursor-pointer rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary-imprint hover:bg-secondary/50">
          {savedTranscript === null ? "Upload .srt or .vtt" : "Replace with a file"}
          <input
            type="file"
            accept=".srt,.vtt,.txt,text/vtt,text/plain,application/x-subrip"
            className="sr-only"
            onChange={handleTranscriptFileChange}
          />
        </label>
        {pendingChange.kind !== "unchanged" && (
          <button
            type="button"
            onClick={() => onPendingChangeChange({ kind: "unchanged" })}
            className="cursor-pointer rounded-full px-4 py-2 text-sm font-medium text-primary-imprint"
          >
            Cancel
          </button>
        )}
        {savedTranscript !== null && pendingChange.kind === "unchanged" && (
          <button
            type="button"
            onClick={() => onPendingChangeChange({ kind: "remove" })}
            className="cursor-pointer rounded-full px-4 py-2 text-sm font-medium text-destructive"
          >
            Remove transcript
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="upload-transcript-paste" className="text-sm font-medium text-foreground">
          Or paste the text
        </label>
        <textarea
          id="upload-transcript-paste"
          value={pastedText}
          onChange={(event) => setPastedText(event.target.value)}
          rows={4}
          placeholder="Paste subtitle text, or plain paragraphs separated by a blank line"
          className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary-imprint"
        />
        <div>
          <button
            type="button"
            onClick={handleUsePastedTextClick}
            disabled={pastedText.trim() === ""}
            className="cursor-pointer rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Use pasted text
          </button>
        </div>
      </div>

      {rejectionMessage !== null && (
        <p role="alert" className="text-sm text-destructive">
          {rejectionMessage}
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        Shown in the Transcript tab under the video. Export a .srt or .vtt from YouTube Studio or
        your editor, up to 1 MB. Timestamps come from the file; plain text shows without them.
        Captions inside the YouTube player are unchanged.
      </p>
    </div>
  );
}

function describeTranscriptState(
  savedTranscript: VideoTranscriptSummary | null,
  pendingChange: PendingTranscriptChange,
): string {
  switch (pendingChange.kind) {
    case "replace":
      return `Will upload on save: ${pendingChange.sourceLabel} (${formatKilobytes(pendingChange.transcriptFile.size)}).`;
    case "remove":
      return "The transcript will be removed when you save.";
    case "unchanged":
      return savedTranscript === null
        ? "No transcript yet."
        : `Saved: ${TRANSCRIPT_FORMAT_LABELS[savedTranscript.format]}, ${savedTranscript.segmentCount.toLocaleString("en-US")} ${savedTranscript.segmentCount === 1 ? "line" : "lines"}.`;
    default: {
      const exhaustiveCheck: never = pendingChange;
      return exhaustiveCheck;
    }
  }
}

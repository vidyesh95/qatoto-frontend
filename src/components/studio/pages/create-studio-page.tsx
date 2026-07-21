"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import UploadVideoModal from "@/components/studio/upload/upload-modal";
import { extractYoutubeVideoId } from "@/lib/youtube";

// Landing view of the Creator Studio. Two ways in: upload video files to
// Qatoto, or link a video already hosted on YouTube. Either one opens the same
// 4-step upload modal, which commits the video to the studio-videos context.
// Picked files queue locally — the first opens right away, the rest wait behind
// an "Edit details" button. No upload backend yet (UI phase).

// Only one wizard can be open at a time, so the open source is a single union
// rather than one piece of state per upload path.
type ActiveUpload =
  | { kind: "none" }
  | { kind: "file"; fileIndex: number }
  | { kind: "youtube"; youtubeUrl: string };

export default function CreateStudioPage() {
  const [selectedVideoFiles, setSelectedVideoFiles] = useState<File[]>([]);
  const [activeUpload, setActiveUpload] = useState<ActiveUpload>({ kind: "none" });
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [youtubeUrlInput, setYoutubeUrlInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const trimmedYoutubeUrl = youtubeUrlInput.trim();
  const isYoutubeUrlValid = extractYoutubeVideoId(trimmedYoutubeUrl) !== null;
  const shouldShowYoutubeUrlError = trimmedYoutubeUrl !== "" && !isYoutubeUrlValid;

  function addVideoFiles(incomingFiles: FileList | null) {
    if (!incomingFiles) return;
    const videoFiles = Array.from(incomingFiles).filter((file) => file.type.startsWith("video/"));
    if (videoFiles.length === 0) return;
    setSelectedVideoFiles((previousFiles) => [...previousFiles, ...videoFiles]);
    // Auto-open the modal for the first file of this batch unless one is open.
    if (activeUpload.kind === "none") {
      setActiveUpload({ kind: "file", fileIndex: selectedVideoFiles.length });
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingOver(false);
    addVideoFiles(event.dataTransfer.files);
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingOver(true);
  }

  function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
    // Ignore drag-leave events fired when moving over child elements.
    const dragLeaveTarget = event.relatedTarget;
    if (dragLeaveTarget instanceof Node && event.currentTarget.contains(dragLeaveTarget)) return;
    setIsDraggingOver(false);
  }

  function handleSelectFilesClick() {
    fileInputRef.current?.click();
  }

  function handleFileInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    addVideoFiles(event.target.files);
    event.target.value = "";
  }

  function handleRemoveFileClick(fileIndexToRemove: number) {
    setSelectedVideoFiles((previousFiles) =>
      previousFiles.filter((_, fileIndex) => fileIndex !== fileIndexToRemove),
    );
    // Keep the open modal pointing at the same file if an earlier row goes away.
    if (activeUpload.kind === "file" && fileIndexToRemove < activeUpload.fileIndex) {
      setActiveUpload({ kind: "file", fileIndex: activeUpload.fileIndex - 1 });
    }
  }

  function handleEditDetailsClick(fileIndexToEdit: number) {
    setActiveUpload({ kind: "file", fileIndex: fileIndexToEdit });
  }

  function handleAddYoutubeVideoSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isYoutubeUrlValid) return;
    setActiveUpload({ kind: "youtube", youtubeUrl: trimmedYoutubeUrl });
  }

  // Fires on Save and on X-close alike — both commit the video to the shared
  // list, so whichever input produced it is done and gets cleared.
  function handleUploadModalClose() {
    if (activeUpload.kind === "file") {
      const committedFileIndex = activeUpload.fileIndex;
      setSelectedVideoFiles((previousFiles) =>
        previousFiles.filter((_, fileIndex) => fileIndex !== committedFileIndex),
      );
    } else if (activeUpload.kind === "youtube") {
      setYoutubeUrlInput("");
    }
    setActiveUpload({ kind: "none" });
  }

  const activeUploadFile =
    activeUpload.kind === "file" ? (selectedVideoFiles[activeUpload.fileIndex] ?? null) : null;

  return (
    <div className="p-6">
      {/* Link a YouTube-hosted video */}
      <form
        onSubmit={handleAddYoutubeVideoSubmit}
        className="mx-auto flex w-full max-w-2xl flex-col gap-3"
      >
        <div className="text-center">
          <p className="text-lg font-medium text-foreground">Add a video from YouTube</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Paste the link to a video you already host on YouTube.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="url"
            inputMode="url"
            value={youtubeUrlInput}
            onChange={(changeEvent) => setYoutubeUrlInput(changeEvent.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
            aria-label="YouTube video link"
            aria-invalid={shouldShowYoutubeUrlError}
            className="min-w-0 flex-1 rounded-full border border-border bg-transparent px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-[#1DBDC5]"
          />
          <button
            type="submit"
            disabled={!isYoutubeUrlValid}
            className="flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-40"
          >
            Add video
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          {shouldShowYoutubeUrlError
            ? "Enter a valid YouTube video link."
            : "Watch, Shorts and youtu.be links all work."}
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        By linking and submitting your videos to Qatoto, you acknowledge that you agree to
        Qatoto&apos;s <TermsLink>Terms of Service</TermsLink> and{" "}
        <TermsLink>Community Guidelines.</TermsLink>
        <br />
        Please make sure that you do not violate others{" "}
        <TermsLink>copyright or privacy rights.</TermsLink>
      </p>

      {/* OR divider */}
      <div className="my-8 flex items-center gap-4">
        <hr className="flex-1 border-border" />
        <span className="text-lg font-medium text-foreground">OR</span>
        <hr className="flex-1 border-border" />
      </div>

      {/* Upload dropzone */}
      <div
        inert
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`opacity-50 flex flex-col items-center justify-center gap-4 rounded-2xl border py-12 transition-colors ${
          isDraggingOver ? "border-[#1DBDC5] bg-secondary/50" : "border-border"
        }`}
      >
        <span className="flex size-32 items-center justify-center rounded-full bg-secondary">
          <Image
            src="/icons/upload_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
            alt=""
            width={48}
            height={48}
          />
        </span>
        <p className="text-lg font-medium text-foreground">
          {isDraggingOver ? "Drop files to upload" : "Drag and drop video files to upload"}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={handleSelectFilesClick}
          className="flex cursor-pointer items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium transition-opacity hover:opacity-90"
        >
          <Image
            src="/icons/upload_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
            alt=""
            width={20}
            height={20}
          />
          Select files
        </button>
      </div>

      {/* Selected files */}
      {selectedVideoFiles.length > 0 && (
        <ul className="mt-6 flex flex-col gap-2">
          {selectedVideoFiles.map((videoFile, fileIndex) => (
            <li
              key={`${videoFile.name}-${videoFile.size}-${fileIndex}`}
              className="flex items-center justify-between rounded-xl border border-border px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{videoFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSizeLabel(videoFile.size)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleEditDetailsClick(fileIndex)}
                  className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
                >
                  Edit details
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveFileClick(fileIndex)}
                  className="cursor-pointer text-sm text-muted-foreground hover:text-foreground"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        By uploading and submitting your videos to Qatoto, you acknowledge that you agree to
        Qatoto&apos;s <TermsLink>Terms of Service</TermsLink> and{" "}
        <TermsLink>Community Guidelines.</TermsLink>
        <br />
        Please make sure that you do not violate others{" "}
        <TermsLink>copyright or privacy rights.</TermsLink>
      </p>

      {activeUpload.kind === "youtube" && (
        <UploadVideoModal
          key={activeUpload.youtubeUrl}
          mode="create"
          source={{ kind: "youtube", youtubeUrl: activeUpload.youtubeUrl }}
          onClose={handleUploadModalClose}
        />
      )}

      {activeUpload.kind === "file" && activeUploadFile && (
        <UploadVideoModal
          key={`${activeUploadFile.name}-${activeUploadFile.size}-${activeUpload.fileIndex}`}
          mode="create"
          source={{ kind: "file", videoFile: activeUploadFile }}
          onClose={handleUploadModalClose}
        />
      )}
    </div>
  );
}

function formatFileSizeLabel(fileSizeInBytes: number) {
  if (fileSizeInBytes >= 1_000_000_000) {
    return `${(fileSizeInBytes / 1_000_000_000).toFixed(1)} GB`;
  }
  if (fileSizeInBytes >= 1_000_000) {
    return `${(fileSizeInBytes / 1_000_000).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(fileSizeInBytes / 1_000))} KB`;
}

// Inline teal accent link used across the acknowledgement copy.
function TermsLink({ children }: { children: React.ReactNode }) {
  return <span className="cursor-pointer text-[#1DBDC5] hover:underline">{children}</span>;
}

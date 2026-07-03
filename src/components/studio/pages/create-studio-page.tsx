"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";

// Landing view of the Creator Studio: an upload dropzone card and a "Go Live
// Stream" alternative. Dropzone accepts video files via drag-and-drop or the
// file picker and lists them locally — no upload backend yet (UI phase).
export default function CreateStudioPage() {
  const [selectedVideoFiles, setSelectedVideoFiles] = useState<File[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function addVideoFiles(incomingFiles: FileList | null) {
    if (!incomingFiles) return;
    const videoFiles = Array.from(incomingFiles).filter((file) =>
      file.type.startsWith("video/"),
    );
    if (videoFiles.length === 0) return;
    setSelectedVideoFiles((previousFiles) => [...previousFiles, ...videoFiles]);
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
  }

  return (
    <div className="p-6">
      {/* Upload dropzone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`flex flex-col items-center justify-center gap-4 rounded-2xl border py-24 transition-colors ${
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
              <button
                type="button"
                onClick={() => handleRemoveFileClick(fileIndex)}
                className="cursor-pointer text-sm text-muted-foreground hover:text-foreground"
              >
                Remove
              </button>
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

      {/* OR divider */}
      <div className="my-8 flex items-center gap-4">
        <hr className="flex-1 border-border" />
        <span className="text-lg font-medium text-foreground">OR</span>
        <hr className="flex-1 border-border" />
      </div>

      {/* Go live */}
      <div className="flex justify-center">
        <button
          type="button"
          className="flex cursor-pointer items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium transition-opacity hover:opacity-90"
        >
          <Image
            src="/icons/stream_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt=""
            width={20}
            height={20}
          />
          Go Live Stream
        </button>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        By streaming and submitting your videos to Qatoto, you acknowledge that you agree to
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

      {/* Create store listing */}
      <div className="flex justify-center">
        <Link
          href="/studio/products"
          className="flex cursor-pointer items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium transition-opacity hover:opacity-90"
        >
          <Image
            src="/icons/local_mall_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt=""
            width={20}
            height={20}
          />
          Create Store Listing
        </Link>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        List your product on the Qatoto Store to reach buyers, partners, and B2B customers.
      </p>
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

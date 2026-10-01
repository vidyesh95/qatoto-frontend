"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Area } from "react-easy-crop";
import { useSession } from "@/lib/auth-client";
import { API_BASE_URL } from "@/lib/api";
import {
  ACCEPTED_PHOTO_TYPES,
  MAX_PHOTO_BYTES,
  getCroppedWebpBlob,
  readUploadErrorMessage,
} from "./profile-photo-crop-utils";
import { ProfilePhotoCropperStage } from "./profile-photo-cropper";

type ProfilePhotoPanelProps = {
  /** Current avatar URL (from OAuth, a prior upload, or the placeholder). */
  currentPhotoUrl: string;
  /** Whether the account has a real stored avatar (vs. the placeholder). Gates "Remove". */
  hasExistingPhoto: boolean;
  /** Return to the settings action list. */
  onBack: () => void;
};

type UploadState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "removing" }
  | { status: "error"; message: string };

export function ProfilePhotoPanel({
  currentPhotoUrl,
  hasExistingPhoto,
  onBack,
}: ProfilePhotoPanelProps) {
  const { refetch } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>({ status: "idle" });
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const croppedAreaPixelsRef = useRef<Area | null>(null);
  const [confirmedBlob, setConfirmedBlob] = useState<Blob | null>(null);
  const [confirmedPreviewUrl, setConfirmedPreviewUrl] = useState<string | null>(null);

  const handleCropComplete = useCallback((_croppedArea: Area, croppedPixels: Area) => {
    croppedAreaPixelsRef.current = croppedPixels;
  }, []);

  useEffect(() => {
    if (selectedFile === null) return undefined;
    const objectUrl = URL.createObjectURL(selectedFile);
    queueMicrotask(() => {
      setPreviewUrl(objectUrl);
    });
    return () => {
      URL.revokeObjectURL(objectUrl);
      queueMicrotask(() => {
        setPreviewUrl(null);
      });
    };
  }, [selectedFile]);

  useEffect(() => {
    if (confirmedBlob === null) return undefined;
    const objectUrl = URL.createObjectURL(confirmedBlob);
    queueMicrotask(() => {
      setConfirmedPreviewUrl(objectUrl);
    });
    return () => {
      URL.revokeObjectURL(objectUrl);
      queueMicrotask(() => {
        setConfirmedPreviewUrl(null);
      });
    };
  }, [confirmedBlob]);

  const isSaving = uploadState.status === "saving";
  const isRemoving = uploadState.status === "removing";
  const isBusy = isSaving || isRemoving;
  const isSaveDisabled = isBusy || confirmedBlob === null;
  const canRemove = hasExistingPhoto && selectedFile === null;

  const handleFileChange = (inputEvent: React.ChangeEvent<HTMLInputElement>) => {
    const file = inputEvent.target.files?.[0];
    if (file === undefined) return;

    if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
      setUploadState({ status: "error", message: "Use a JPEG, PNG, or WebP image." });
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setUploadState({ status: "error", message: "Image must be 5 MB or smaller." });
      return;
    }

    setSelectedFile(file);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    croppedAreaPixelsRef.current = null;
    setConfirmedBlob(null);
    setUploadState({ status: "idle" });
  };

  const handleConfirmCrop = async () => {
    if (previewUrl === null || croppedAreaPixelsRef.current === null) return;
    const croppedBlob = await getCroppedWebpBlob(
      previewUrl,
      croppedAreaPixelsRef.current,
      rotation,
    ).catch(() => null);
    if (croppedBlob === null) {
      setUploadState({ status: "error", message: "Couldn't crop the image. Please try again." });
      return;
    }
    setConfirmedBlob(croppedBlob);
  };

  const handleRecrop = () => {
    setConfirmedBlob(null);
  };

  const handleRemove = async () => {
    if (!canRemove || isBusy) return;
    setUploadState({ status: "removing" });

    try {
      const response = await fetch(`${API_BASE_URL}/users/me/photo`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        setUploadState({ status: "error", message: readUploadErrorMessage(errorPayload) });
        return;
      }

      await refetch();
      onBack();
    } catch {
      setUploadState({ status: "error", message: "Network error. Please try again." });
    }
  };

  const handleSubmit = async (formEvent: React.FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    if (isSaveDisabled || confirmedBlob === null) return;
    setUploadState({ status: "saving" });

    const formData = new FormData();
    formData.append("photo", confirmedBlob, "avatar.webp");

    try {
      const response = await fetch(`${API_BASE_URL}/users/me/photo`, {
        method: "PATCH",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        setUploadState({ status: "error", message: readUploadErrorMessage(errorPayload) });
        return;
      }

      await refetch();
      onBack();
    } catch {
      setUploadState({ status: "error", message: "Network error. Please try again." });
    }
  };

  return (
    <div>
      <header className="sticky top-0 z-10 flex flex-row items-center gap-4 border-b border-border bg-background p-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="cursor-pointer rounded-full p-1 transition-colors hover:bg-muted"
        >
          <Image
            src="/icons/arrow_back_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt=""
            width={24}
            height={24}
          />
        </button>
        <h2 className="text-xl font-medium text-secondary-foreground">Set profile photo</h2>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-4">
        <div className="flex flex-col items-center gap-4">
          {confirmedPreviewUrl !== null ? (
            <>
              <Image
                src={confirmedPreviewUrl}
                alt="Cropped profile photo"
                width={160}
                height={160}
                unoptimized
                className="aspect-square size-40 rounded-full border border-border object-cover"
              />
              <button
                type="button"
                onClick={handleRecrop}
                disabled={isBusy}
                className="cursor-pointer rounded-full border border-border px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                Recrop
              </button>
            </>
          ) : previewUrl !== null ? (
            <ProfilePhotoCropperStage
              previewUrl={previewUrl}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={handleCropComplete}
              onConfirmCrop={handleConfirmCrop}
            />
          ) : (
            <Image
              src={currentPhotoUrl}
              alt="Profile photo preview"
              width={160}
              height={160}
              className="aspect-square size-40 rounded-full border border-border object-cover"
            />
          )}
          <input
            ref={fileInputRef}
            type="file"
            aria-label="Profile photo file"
            accept={ACCEPTED_PHOTO_TYPES.join(",")}
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer rounded-full border border-border px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-muted"
          >
            Choose photo
          </button>
          <span className="text-xs text-muted-foreground">
            JPEG, PNG, or WebP up to 5 MB. Replaces any photo from a linked account.
          </span>
          {uploadState.status === "error" ? (
            <span className="text-xs text-destructive">{uploadState.message}</span>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={isSaveDisabled}
          className="cursor-pointer rounded-full bg-primary px-4 py-3 text-sm font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "Saving…" : "Save"}
        </button>

        {canRemove ? (
          <button
            type="button"
            onClick={handleRemove}
            disabled={isBusy}
            className="cursor-pointer rounded-full border border-destructive/40 px-4 py-3 text-sm font-medium text-destructive transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRemoving ? "Removing…" : "Remove photo"}
          </button>
        ) : null}
      </form>
    </div>
  );
}

"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { useSession } from "@/lib/auth-client";

/** One actionable row in the settings list. */
type SettingsItem = {
  /** Visible label. */
  label: string;
  /** Icon path under `public/icons` (or `public/...` for brand marks). */
  icon: string;
  /** Optional click handler; omitted rows are inert nav stubs for now. */
  onClick?: () => void;
};

type SettingsPanelProps = {
  /** Invoked by the header back button. */
  onBack: () => void;
  /** Sign the user out (owned by the parent menu). */
  onSignOut: () => void;
};

/**
 * Presentational "Settings" panel: header, a profile card (avatar, portrait,
 * handle), and the account-action list. Swapped into the account menu like the
 * Appearance / Location / Language panels.
 *
 * Nothing here is a trust boundary — every action that mutates account state
 * must be re-validated and authorized by the Express backend.
 */
export function SettingsPanel({ onBack, onSignOut }: SettingsPanelProps) {
  const { data: session } = useSession();
  const avatarSrc = session?.user.image ?? "/dummy/profile_photo_girl.avif";

  // Which view of the settings panel is showing: the action list, or a sub-editor.
  const [view, setView] = useState<"list" | "full-name" | "profile-photo">("list");

  if (view === "full-name") {
    return (
      <FullNamePanel initialFullName={session?.user.name ?? ""} onBack={() => setView("list")} />
    );
  }

  if (view === "profile-photo") {
    return (
      <ProfilePhotoPanel
        currentPhotoUrl={avatarSrc}
        hasExistingPhoto={Boolean(session?.user.image)}
        onBack={() => setView("list")}
      />
    );
  }

  const items: SettingsItem[] = [
    {
      label: "Your account",
      icon: "/icons/account_circle_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    },
    {
      label: "Switch account",
      icon: "/icons/switch_account_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    },
    {
      label: "Sign out",
      icon: "/icons/logout_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      onClick: onSignOut,
    },
    { label: "Set password", icon: "/icons/lock_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg" },
    {
      label: "Set handle",
      icon: "/icons/alternate_email_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    },
    {
      label: "Set phone number",
      icon: "/icons/add_call_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    },
    {
      label: "Set full name",
      icon: "/icons/id_card_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      onClick: () => setView("full-name"),
    },
    {
      label: "Set profile photo",
      icon: "/icons/add_photo_alternate_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      onClick: () => setView("profile-photo"),
    },
    { label: "Link Google account", icon: "/icons/google_logo_tint.svg" },
    { label: "Link Apple account", icon: "/icons/apple_logo_tint.svg" },
    { label: "Set email address", icon: "/icons/mail_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg" },
    {
      label: "Set recovery email address",
      icon: "/icons/forward_to_inbox_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    },
    { label: "Time watched", icon: "/icons/bar_chart_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg" },
    {
      label: "Your data in app account",
      icon: "/icons/storage_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    },
  ];

  return (
    <div>
      <header className="sticky top-0 z-10 flex flex-row items-center gap-4 border-b border-black/10 bg-background p-4">
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
        <h2 className="text-xl font-medium text-secondary-foreground">Settings</h2>
      </header>

      <section className="relative m-4 mt-8 flex flex-col gap-4 rounded-2xl bg-card p-4 pt-16 shadow-sm">
        <Image
          src={avatarSrc}
          alt=""
          width={320}
          height={320}
          className="aspect-square h-auto w-full rounded-xl border border-background object-cover"
        />
        <div className="rounded-xl bg-muted px-4 py-3 text-center text-base leading-6 tracking-[0.5px] text-secondary-foreground">
          @drDong2w
        </div>
        <Image
          src={avatarSrc}
          alt="Current avatar"
          width={64}
          height={64}
          className="absolute -top-4 left-4 aspect-square size-16 rounded-lg border border-background object-cover"
        />
      </section>

      <ul>
        {items.map((item) => (
          <li key={item.label}>
            <button
              type="button"
              onClick={item.onClick}
              className="flex w-full cursor-pointer flex-row items-center gap-4 p-4 transition-colors hover:bg-muted"
            >
              <Image src={item.icon} alt="" width={24} height={24} className="size-6 shrink-0" />
              <span className="text-sm font-medium text-secondary-foreground">{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

type FullNamePanelProps = {
  /** Current account name, prefilled into the field (from OAuth or a prior edit). */
  initialFullName: string;
  /** Return to the settings action list. */
  onBack: () => void;
};

/**
 * Editor for the account's full name. The name initially comes from the Google
 * or GitHub OAuth profile, but the user may overwrite it with anything they want.
 *
 * Not a trust boundary — the Express backend must re-validate the name (length,
 * allowed characters, profanity, ownership of the session) and is the only
 * authority that persists it. Submitting here only sends the request.
 */
/** What the save request is currently doing. */
type SaveState = { status: "idle" } | { status: "saving" } | { status: "error"; message: string };

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** Best-effort read of the backend's 422 `fieldErrors` / generic error message. */
function readErrorMessage(payload: unknown): string {
  const fallback = "Couldn't save your name. Please try again.";
  if (typeof payload !== "object" || payload === null) return fallback;
  const body = payload as { fieldErrors?: { fullName?: string[] }; message?: string };
  return body.fieldErrors?.fullName?.[0] ?? body.message ?? fallback;
}

function FullNamePanel({ initialFullName, onBack }: FullNamePanelProps) {
  const { refetch } = useSession();
  const [fullName, setFullName] = useState(initialFullName);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });

  const trimmedFullName = fullName.trim();
  const isSaving = saveState.status === "saving";
  const isSaveDisabled =
    isSaving || trimmedFullName.length === 0 || trimmedFullName === initialFullName;

  const handleSubmit = async (formEvent: React.FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    if (isSaveDisabled) return;
    setSaveState({ status: "saving" });

    try {
      const response = await fetch(`${API_BASE_URL}/users/me`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: trimmedFullName }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        setSaveState({ status: "error", message: readErrorMessage(errorPayload) });
        return;
      }

      // Backend persisted the new name; pull a fresh session so it shows everywhere.
      await refetch();
      onBack();
    } catch {
      setSaveState({ status: "error", message: "Network error. Please try again." });
    }
  };

  return (
    <div>
      <header className="sticky top-0 z-10 flex flex-row items-center gap-4 border-b border-black/10 bg-background p-4">
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
        <h2 className="text-xl font-medium text-secondary-foreground">Set full name</h2>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-secondary-foreground">Full name</span>
          <input
            type="text"
            aria-label="Full name"
            value={fullName}
            onChange={(inputEvent) => {
              setFullName(inputEvent.target.value);
              if (saveState.status === "error") setSaveState({ status: "idle" });
            }}
            placeholder="Enter your full name"
            maxLength={100}
            className="rounded-xl border border-black/10 bg-card px-4 py-3 text-base text-secondary-foreground outline-none focus:border-primary"
          />
          <span className="text-xs text-muted-foreground">
            This is the name shown on your profile. You can change it anytime.
          </span>
          {saveState.status === "error" ? (
            <span className="text-xs text-red-600">{saveState.message}</span>
          ) : null}
        </label>

        <button
          type="submit"
          disabled={isSaveDisabled}
          className="cursor-pointer rounded-full bg-primary px-4 py-3 text-sm font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}

type ProfilePhotoPanelProps = {
  /** Current avatar URL (from OAuth, a prior upload, or the placeholder). */
  currentPhotoUrl: string;
  /** Whether the account has a real stored avatar (vs. the placeholder). Gates "Remove". */
  hasExistingPhoto: boolean;
  /** Return to the settings action list. */
  onBack: () => void;
};

/** What the upload/remove request is currently doing. */
type UploadState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "removing" }
  | { status: "error"; message: string };

/** Client-side guard rails — fast UX feedback only; the backend re-validates. */
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Best-effort read of the backend's error message. */
function readUploadErrorMessage(payload: unknown): string {
  const fallback = "Couldn't save your photo. Please try again.";
  if (typeof payload !== "object" || payload === null) return fallback;
  const body = payload as { message?: string };
  return body.message ?? fallback;
}

/** Load an object-URL into an HTMLImageElement so we can draw it to a canvas. */
function loadImageElement(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () => reject(new Error("Could not load image")));
    image.src = source;
  });
}

/** Bounding box of an image after rotating it `rotationDegrees`. */
function rotatedBoundingBox(width: number, height: number, rotationDegrees: number) {
  const rotationRadians = (rotationDegrees * Math.PI) / 180;
  return {
    width:
      Math.abs(Math.cos(rotationRadians) * width) + Math.abs(Math.sin(rotationRadians) * height),
    height:
      Math.abs(Math.sin(rotationRadians) * width) + Math.abs(Math.cos(rotationRadians) * height),
  };
}

/**
 * Crop `imageSource` to `cropArea` (pixel coords from react-easy-crop), applying
 * `rotationDegrees`, and re-encode as WebP. The backend still re-validates and
 * re-encodes — this is only so the user uploads what they actually framed.
 */
async function getCroppedWebpBlob(
  imageSource: string,
  cropArea: Area,
  rotationDegrees: number,
): Promise<Blob | null> {
  const image = await loadImageElement(imageSource);
  const context = document.createElement("canvas").getContext("2d");
  if (context === null) return null;
  const canvas = context.canvas;

  // Draw the whole image rotated about its centre into a box big enough to hold it.
  const boundingBox = rotatedBoundingBox(image.width, image.height, rotationDegrees);
  canvas.width = boundingBox.width;
  canvas.height = boundingBox.height;
  context.translate(boundingBox.width / 2, boundingBox.height / 2);
  context.rotate((rotationDegrees * Math.PI) / 180);
  context.drawImage(image, -image.width / 2, -image.height / 2);

  // Lift out just the cropped rectangle, then resize the canvas down to it.
  const croppedPixels = context.getImageData(
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
  );
  canvas.width = cropArea.width;
  canvas.height = cropArea.height;
  context.putImageData(croppedPixels, 0, 0);

  return new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.9));
}

/**
 * Editor for the account's profile photo. The photo may initially come from the
 * Google or GitHub OAuth profile, but once the user uploads their own, the
 * backend must mark it as user-owned so later OAuth links never overwrite it.
 *
 * Not a trust boundary — the Express backend must re-validate the file (type,
 * size, dimensions, ownership of the session), store it, and is the only
 * authority that persists the avatar URL. This panel only sends the request.
 */
function ProfilePhotoPanel({ currentPhotoUrl, hasExistingPhoto, onBack }: ProfilePhotoPanelProps) {
  const { refetch } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>({ status: "idle" });
  // Cropper view state (only meaningful while a freshly picked image is open).
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  // The confirmed crop result, awaiting the final Save. null = still cropping.
  const [confirmedBlob, setConfirmedBlob] = useState<Blob | null>(null);
  const [confirmedPreviewUrl, setConfirmedPreviewUrl] = useState<string | null>(null);

  const handleCropComplete = useCallback((_croppedArea: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  // Revoke the confirmed-crop object URL when it changes or the panel unmounts.
  useEffect(() => {
    if (confirmedPreviewUrl === null) return undefined;
    return () => URL.revokeObjectURL(confirmedPreviewUrl);
  }, [confirmedPreviewUrl]);

  // Revoke the object URL when the preview changes or the panel unmounts.
  useEffect(() => {
    if (previewUrl === null) return undefined;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const isSaving = uploadState.status === "saving";
  const isRemoving = uploadState.status === "removing";
  const isBusy = isSaving || isRemoving;
  const isSaveDisabled = isBusy || confirmedBlob === null;
  // Remove only makes sense for a real stored photo and when no new pick is pending.
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
    setPreviewUrl(URL.createObjectURL(file));
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setCroppedAreaPixels(null);
    setConfirmedBlob(null);
    setConfirmedPreviewUrl(null);
    setUploadState({ status: "idle" });
  };

  const handleConfirmCrop = async () => {
    if (previewUrl === null || croppedAreaPixels === null) return;
    const croppedBlob = await getCroppedWebpBlob(previewUrl, croppedAreaPixels, rotation).catch(
      () => null,
    );
    if (croppedBlob === null) {
      setUploadState({ status: "error", message: "Couldn't crop the image. Please try again." });
      return;
    }
    setConfirmedBlob(croppedBlob);
    setConfirmedPreviewUrl(URL.createObjectURL(croppedBlob));
  };

  const handleRecrop = () => {
    setConfirmedBlob(null);
    setConfirmedPreviewUrl(null);
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

      // Backend cleared the photo and unlocked OAuth re-seeding; refresh session.
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

      // Backend stored the new photo and marked it user-owned; refresh session.
      await refetch();
      onBack();
    } catch {
      setUploadState({ status: "error", message: "Network error. Please try again." });
    }
  };

  return (
    <div>
      <header className="sticky top-0 z-10 flex flex-row items-center gap-4 border-b border-black/10 bg-background p-4">
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
            // Confirm step: review the cropped result before saving.
            <>
              <Image
                src={confirmedPreviewUrl}
                alt="Cropped profile photo"
                width={160}
                height={160}
                unoptimized
                className="aspect-square size-40 rounded-full border border-black/10 object-cover"
              />
              <button
                type="button"
                onClick={handleRecrop}
                disabled={isBusy}
                className="cursor-pointer rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                Recrop
              </button>
            </>
          ) : previewUrl !== null ? (
            // Crop stage — drag to reposition, slider to zoom, buttons to rotate.
            <>
              <div className="relative aspect-square w-full max-w-80 overflow-hidden rounded-xl bg-black">
                <Cropper
                  image={previewUrl}
                  crop={crop}
                  zoom={zoom}
                  rotation={rotation}
                  aspect={1}
                  cropShape="round"
                  showGrid
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onRotationChange={setRotation}
                  onCropComplete={handleCropComplete}
                />
              </div>

              <input
                type="range"
                aria-label="Zoom"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(rangeEvent) => setZoom(Number(rangeEvent.target.value))}
                className="w-full max-w-80 cursor-pointer accent-primary"
              />

              <div className="flex flex-row flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setRotation((current) => (current - 90 + 360) % 360)}
                  className="cursor-pointer rounded-full border border-black/10 px-3 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-muted"
                >
                  Rotate left
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((current) => (current + 90) % 360)}
                  className="cursor-pointer rounded-full border border-black/10 px-3 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-muted"
                >
                  Rotate right
                </button>
              </div>

              <button
                type="button"
                onClick={handleConfirmCrop}
                className="cursor-pointer rounded-full bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:opacity-90"
              >
                Confirm crop
              </button>
            </>
          ) : (
            <Image
              src={currentPhotoUrl}
              alt="Profile photo preview"
              width={160}
              height={160}
              className="aspect-square size-40 rounded-full border border-black/10 object-cover"
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
            className="cursor-pointer rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-muted"
          >
            Choose photo
          </button>
          <span className="text-xs text-muted-foreground">
            JPEG, PNG, or WebP up to 5 MB. Replaces any photo from a linked account.
          </span>
          {uploadState.status === "error" ? (
            <span className="text-xs text-red-600">{uploadState.message}</span>
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
            className="cursor-pointer rounded-full border border-red-200 px-4 py-3 text-sm font-medium text-red-600 transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRemoving ? "Removing…" : "Remove photo"}
          </button>
        ) : null}
      </form>
    </div>
  );
}

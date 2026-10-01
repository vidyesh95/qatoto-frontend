"use client";

import Cropper, { type Area } from "react-easy-crop";

export function ProfilePhotoCropperStage({
  previewUrl,
  crop,
  zoom,
  rotation,
  onCropChange,
  onZoomChange,
  onRotationChange,
  onCropComplete,
  onConfirmCrop,
}: {
  readonly previewUrl: string;
  readonly crop: { x: number; y: number };
  readonly zoom: number;
  readonly rotation: number;
  readonly onCropChange: (crop: { x: number; y: number }) => void;
  readonly onZoomChange: (zoom: number) => void;
  readonly onRotationChange: (rotation: number) => void;
  readonly onCropComplete: (croppedArea: Area, croppedAreaPixels: Area) => void;
  readonly onConfirmCrop: () => void;
}) {
  return (
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
          onCropChange={onCropChange}
          onZoomChange={onZoomChange}
          onRotationChange={onRotationChange}
          onCropComplete={onCropComplete}
        />
      </div>

      <input
        type="range"
        aria-label="Zoom"
        min={1}
        max={3}
        step={0.01}
        value={zoom}
        onChange={(rangeEvent) => onZoomChange(Number(rangeEvent.target.value))}
        className="w-full max-w-80 cursor-pointer accent-primary"
      />

      <div className="flex flex-row flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => onRotationChange((rotation - 90 + 360) % 360)}
          className="cursor-pointer rounded-full border border-border px-3 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-muted"
        >
          Rotate left
        </button>
        <button
          type="button"
          onClick={() => onRotationChange((rotation + 90) % 360)}
          className="cursor-pointer rounded-full border border-border px-3 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-muted"
        >
          Rotate right
        </button>
      </div>

      <button
        type="button"
        onClick={onConfirmCrop}
        className="cursor-pointer rounded-full bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:opacity-90"
      >
        Confirm crop
      </button>
    </>
  );
}

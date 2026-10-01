"use client";

import { toOrdinalLabel } from "@/lib/format-ordinal";

export interface SlideOrderControlsProps {
  readonly index: number;
  readonly slideCount: number;
  readonly isReordering: boolean;
  readonly onMove: (targetPosition: number) => void;
}

export function SlideOrderControls({
  index,
  slideCount,
  isReordering,
  onMove,
}: SlideOrderControlsProps) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        disabled={isReordering || index === 0}
        onClick={() => onMove(index - 1)}
        aria-label="Move up one place"
        className="cursor-pointer rounded-full border border-outline-variant/60 px-2 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-40"
      >
        ▲
      </button>
      <button
        type="button"
        disabled={isReordering || index === slideCount - 1}
        onClick={() => onMove(index + 1)}
        aria-label="Move down one place"
        className="cursor-pointer rounded-full border border-outline-variant/60 px-2 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-40"
      >
        ▼
      </button>
      <label className="ml-2 flex items-center gap-1 text-xs text-muted-foreground">
        Show as
        <select
          value={index}
          disabled={isReordering}
          onChange={(event) => onMove(Number(event.target.value))}
          className="cursor-pointer rounded-lg border border-outline-variant/60 bg-background p-1 text-xs disabled:cursor-not-allowed disabled:opacity-40"
        >
          {Array.from({ length: slideCount }, (_unused, position) => (
            <option key={position} value={position}>
              {toOrdinalLabel(position)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export interface SlideActionButtonsProps {
  readonly activeToggleLabel: string;
  readonly onToggleActive: () => void;
  readonly isEditing: boolean;
  readonly onToggleEditing: () => void;
  readonly isReplacingImage: boolean;
  readonly onToggleReplacingImage: () => void;
  readonly isReplaceImagePending: boolean;
  readonly isConfirmingDelete: boolean;
  readonly onToggleConfirmingDelete: (confirming: boolean) => void;
  readonly onDelete: () => void;
  readonly isDeleting: boolean;
  readonly isMutating: boolean;
}

export function SlideActionButtons({
  activeToggleLabel,
  onToggleActive,
  isEditing,
  onToggleEditing,
  isReplacingImage,
  onToggleReplacingImage,
  isReplaceImagePending,
  isConfirmingDelete,
  onToggleConfirmingDelete,
  onDelete,
  isDeleting,
  isMutating,
}: SlideActionButtonsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={isMutating}
        onClick={onToggleActive}
        className="cursor-pointer rounded-full border border-outline-variant/60 px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
      >
        {activeToggleLabel}
      </button>

      <button
        type="button"
        onClick={onToggleEditing}
        className="cursor-pointer rounded-full border border-outline-variant/60 px-3 py-1 text-xs"
      >
        {isEditing ? "Cancel edit" : "Edit"}
      </button>

      <button
        type="button"
        disabled={isMutating}
        onClick={onToggleReplacingImage}
        className="cursor-pointer rounded-full border border-outline-variant/60 px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isReplaceImagePending
          ? "Replacing…"
          : isReplacingImage
            ? "Cancel replace"
            : "Replace image"}
      </button>

      {isConfirmingDelete ? (
        <span className="flex items-center gap-2 text-xs">
          Really delete?
          <button
            type="button"
            disabled={isDeleting}
            onClick={onDelete}
            className="cursor-pointer rounded-full bg-destructive px-3 py-1 text-xs text-destructive-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            Yes, delete
          </button>
          <button
            type="button"
            onClick={() => onToggleConfirmingDelete(false)}
            className="cursor-pointer rounded-full border border-outline-variant/60 px-3 py-1 text-xs"
          >
            Cancel
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => onToggleConfirmingDelete(true)}
          className="cursor-pointer rounded-full border border-destructive/40 px-3 py-1 text-xs text-destructive"
        >
          Delete
        </button>
      )}
    </div>
  );
}

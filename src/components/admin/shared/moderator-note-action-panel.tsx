import type { ApiError } from "@/lib/http";
import { MutationErrorNotice } from "@/components/home/research-and-development/sections/mutation-feedback";

const PRIMARY_BUTTON_CLASS =
  "cursor-pointer rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-40";
const QUIET_BUTTON_CLASS =
  "cursor-pointer rounded-full bg-background px-3 py-1.5 text-xs font-medium text-foreground outline -outline-offset-1 outline-border disabled:opacity-40";
const FIELD_CLASS =
  "mt-1 w-full rounded-lg border border-outline-variant/60 px-2 py-1.5 text-sm outline-none focus:border-primary";

export interface ModeratorNoteActionPanelProps {
  readonly recipientRole: "writer" | "maker";
  readonly moderatorNote: string;
  readonly maximumNoteCharacters: number;
  readonly isBusy: boolean;
  readonly isNoteEmpty: boolean;
  readonly isConfirmingPublish: boolean;
  readonly isDecidingPublish: boolean;
  readonly isDecidingReject: boolean;
  readonly refusedError: ApiError | null;
  readonly publishConfirmationMessage: string;
  readonly onNoteChange: (nextNote: string) => void;
  readonly onConfirmPublishClick: () => void;
  readonly onCancelPublishClick: () => void;
  readonly onPublishConfirm: () => void;
  readonly onRejectClick: () => void;
  readonly onRefreshQueueClick: () => void;
}

export function ModeratorNoteActionPanel({
  recipientRole,
  moderatorNote,
  maximumNoteCharacters,
  isBusy,
  isNoteEmpty,
  isConfirmingPublish,
  isDecidingPublish,
  isDecidingReject,
  refusedError,
  publishConfirmationMessage,
  onNoteChange,
  onConfirmPublishClick,
  onCancelPublishClick,
  onPublishConfirm,
  onRejectClick,
  onRefreshQueueClick,
}: ModeratorNoteActionPanelProps) {
  return (
    <div className="mt-4 border-t border-outline-variant/60 pt-3">
      <label className="block text-xs text-muted-foreground">
        Note to the {recipientRole}
        <textarea
          value={moderatorNote}
          maxLength={maximumNoteCharacters}
          rows={3}
          disabled={isBusy}
          onChange={(changeEvent) => onNoteChange(changeEvent.target.value)}
          className={FIELD_CLASS}
        />
      </label>
      <p className="mt-1 text-xs text-muted-foreground tabular-nums">
        {moderatorNote.length} of {maximumNoteCharacters.toLocaleString("en-US")}
      </p>

      {isConfirmingPublish ? (
        <div className="mt-2 rounded-lg bg-muted/40 p-3">
          <p className="text-xs">{publishConfirmationMessage}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={onPublishConfirm} className={PRIMARY_BUTTON_CLASS}>
              Publish it
            </button>
            <button type="button" onClick={onCancelPublishClick} className={QUIET_BUTTON_CLASS}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isBusy}
            onClick={onConfirmPublishClick}
            className={PRIMARY_BUTTON_CLASS}
          >
            {isDecidingPublish ? "Publishing…" : "Publish"}
          </button>
          <button
            type="button"
            disabled={isBusy || isNoteEmpty}
            onClick={onRejectClick}
            className={QUIET_BUTTON_CLASS}
          >
            {isDecidingReject ? "Sending back…" : "Send back"}
          </button>
          {isNoteEmpty ? (
            <span className="text-xs text-muted-foreground">
              Sending back needs a note. It is the only thing the {recipientRole} sees.
            </span>
          ) : null}
        </div>
      )}

      {refusedError !== null ? (
        <div className="mt-3 space-y-2">
          <MutationErrorNotice error={refusedError} />
          {refusedError.code === "409" ? (
            <button type="button" onClick={onRefreshQueueClick} className={QUIET_BUTTON_CLASS}>
              Refresh the queue
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

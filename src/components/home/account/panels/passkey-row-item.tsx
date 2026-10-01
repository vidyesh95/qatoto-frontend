"use client";

import Image from "next/image";
import type { Passkey } from "@better-auth/passkey/client";

const PASSKEY_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

function formatPasskeyCreatedDate(createdAt: Date | string) {
  return PASSKEY_DATE_FORMATTER.format(new Date(createdAt));
}

export type PasskeyMutationState =
  | { status: "idle" }
  | { status: "registering" }
  | { status: "confirm-delete"; passkeyId: string }
  | { status: "deleting"; passkeyId: string }
  | { status: "renaming"; passkeyId: string }
  | { status: "rename-saving"; passkeyId: string }
  | { status: "rename-error"; passkeyId: string; message: string }
  | { status: "error"; message: string };

function PasskeyRenamingActions({
  passkeyId,
  isSaving,
  renameDraftName,
  errorMessage,
  onSave,
  onCancel,
}: {
  readonly passkeyId: string;
  readonly isSaving: boolean;
  readonly renameDraftName: string;
  readonly errorMessage: string | null;
  readonly onSave: (passkeyId: string) => void;
  readonly onCancel: () => void;
}) {
  return (
    <div className="flex flex-row items-center justify-end gap-4">
      {errorMessage ? (
        <span className="flex-1 text-xs text-destructive">{errorMessage}</span>
      ) : null}
      <button
        type="button"
        onClick={onCancel}
        disabled={isSaving}
        className="cursor-pointer text-sm font-medium text-secondary-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={() => onSave(passkeyId)}
        disabled={isSaving || renameDraftName.trim().length === 0}
        className="cursor-pointer text-sm font-medium text-primary-imprint disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSaving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}

function PasskeyDeleteConfirmActions({
  passkeyId,
  onConfirm,
  onCancel,
}: {
  readonly passkeyId: string;
  readonly onConfirm: (passkeyId: string) => void;
  readonly onCancel: () => void;
}) {
  return (
    <div className="flex flex-row items-center justify-between gap-4">
      <span className="text-sm text-secondary-foreground">Remove this passkey?</span>
      <div className="flex flex-row gap-4">
        <button
          type="button"
          onClick={onCancel}
          className="cursor-pointer text-sm font-medium text-secondary-foreground"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onConfirm(passkeyId)}
          className="cursor-pointer text-sm font-medium text-destructive"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

function PasskeyDefaultActions({
  rowPasskey,
  isMutationInFlight,
  isDeleting,
  onStartRename,
  onConfirmDeletePrompt,
}: {
  readonly rowPasskey: Passkey;
  readonly isMutationInFlight: boolean;
  readonly isDeleting: boolean;
  readonly onStartRename: (passkey: Passkey) => void;
  readonly onConfirmDeletePrompt: (passkeyId: string) => void;
}) {
  return (
    <div className="flex flex-row justify-end gap-4">
      <button
        type="button"
        onClick={() => onStartRename(rowPasskey)}
        disabled={isMutationInFlight}
        className="cursor-pointer text-sm font-medium text-primary-imprint disabled:cursor-not-allowed disabled:opacity-50"
      >
        Rename
      </button>
      <button
        type="button"
        onClick={() => onConfirmDeletePrompt(rowPasskey.id)}
        disabled={isMutationInFlight}
        className="cursor-pointer text-sm font-medium text-destructive disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isDeleting ? "Removing…" : "Remove"}
      </button>
    </div>
  );
}

export function PasskeyRowItem({
  rowPasskey,
  mutationState,
  renameDraftName,
  onRenameDraftNameChange,
  onStartRename,
  onSaveRename,
  onCancelRename,
  onConfirmDeletePrompt,
  onCancelDeletePrompt,
  onConfirmDelete,
  isMutationInFlight,
}: {
  readonly rowPasskey: Passkey;
  readonly mutationState: PasskeyMutationState;
  readonly renameDraftName: string;
  readonly onRenameDraftNameChange: (val: string) => void;
  readonly onStartRename: (passkey: Passkey) => void;
  readonly onSaveRename: (passkeyId: string) => void;
  readonly onCancelRename: () => void;
  readonly onConfirmDeletePrompt: (passkeyId: string) => void;
  readonly onCancelDeletePrompt: () => void;
  readonly onConfirmDelete: (passkeyId: string) => void;
  readonly isMutationInFlight: boolean;
}) {
  const isRowRenaming =
    (mutationState.status === "renaming" ||
      mutationState.status === "rename-saving" ||
      mutationState.status === "rename-error") &&
    mutationState.passkeyId === rowPasskey.id;
  const rowRenameErrorMessage =
    mutationState.status === "rename-error" && mutationState.passkeyId === rowPasskey.id
      ? mutationState.message
      : null;
  const isRowConfirmingDelete =
    mutationState.status === "confirm-delete" && mutationState.passkeyId === rowPasskey.id;
  const isRowDeleting =
    mutationState.status === "deleting" && mutationState.passkeyId === rowPasskey.id;

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-row items-center gap-4">
        <Image
          src="/icons/passkey_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
          alt=""
          width={24}
          height={24}
          className="size-6 shrink-0"
        />
        <div className="flex flex-1 flex-col">
          {isRowRenaming ? (
            <input
              type="text"
              aria-label="Passkey name"
              value={renameDraftName}
              onChange={(inputEvent) => onRenameDraftNameChange(inputEvent.target.value)}
              placeholder="Passkey name"
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-secondary-foreground outline-none focus:border-primary"
            />
          ) : (
            <span className="text-sm font-medium text-secondary-foreground">
              {rowPasskey.name ?? "Passkey"}
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            Created {formatPasskeyCreatedDate(rowPasskey.createdAt)}
          </span>
        </div>
        {rowPasskey.backedUp ? (
          <span className="flex shrink-0 flex-row items-center gap-1 text-xs font-medium text-primary-imprint">
            <Image
              src="/icons/check_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              alt=""
              width={16}
              height={16}
            />
            Synced
          </span>
        ) : null}
      </div>

      {isRowRenaming ? (
        <PasskeyRenamingActions
          passkeyId={rowPasskey.id}
          isSaving={mutationState.status === "rename-saving"}
          renameDraftName={renameDraftName}
          errorMessage={rowRenameErrorMessage}
          onSave={onSaveRename}
          onCancel={onCancelRename}
        />
      ) : isRowConfirmingDelete ? (
        <PasskeyDeleteConfirmActions
          passkeyId={rowPasskey.id}
          onConfirm={onConfirmDelete}
          onCancel={onCancelDeletePrompt}
        />
      ) : (
        <PasskeyDefaultActions
          rowPasskey={rowPasskey}
          isMutationInFlight={isMutationInFlight}
          isDeleting={isRowDeleting}
          onStartRename={onStartRename}
          onConfirmDeletePrompt={onConfirmDeletePrompt}
        />
      )}
    </li>
  );
}

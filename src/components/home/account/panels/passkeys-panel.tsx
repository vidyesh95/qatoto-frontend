"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { Passkey } from "@better-auth/passkey/client";
import { authClient } from "@/lib/auth-client";

/**
 * Manages the WebAuthn passkeys on the signed-in account: list, create,
 * rename, delete. All ceremonies and checks run on the Express backend via
 * Better Auth (`/api/auth/passkey/*`); registration requires the active
 * session (`requireSession: true` server-side), so this panel only ever adds
 * passkeys to the account that is already signed in.
 *
 * Not a trust boundary — the backend verifies every WebAuthn response and
 * scopes list/delete/rename to the session user.
 */

/** The fetch lifecycle of the passkey list, refetched after every mutation. */
type PasskeyListState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; passkeys: Passkey[] };

/** At most one mutation is in flight or pending confirmation at a time. */
type PasskeyMutationState =
  | { status: "idle" }
  | { status: "registering" }
  | { status: "confirm-delete"; passkeyId: string }
  | { status: "deleting"; passkeyId: string }
  | { status: "renaming"; passkeyId: string }
  | { status: "rename-saving"; passkeyId: string }
  | { status: "error"; message: string };

type PasskeysPanelProps = {
  /** Return to the settings action list. */
  onBack: () => void;
};

function formatPasskeyCreatedDate(createdAt: Date | string) {
  return new Date(createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function PasskeysPanel({ onBack }: PasskeysPanelProps) {
  const [passkeyListState, setPasskeyListState] = useState<PasskeyListState>({
    status: "loading",
  });
  const [mutationState, setMutationState] = useState<PasskeyMutationState>({ status: "idle" });
  const [renameDraftName, setRenameDraftName] = useState("");
  // Bumped after every successful mutation to refetch the list.
  const [listRefreshCount, setListRefreshCount] = useState(0);
  // Assume support until the effect below can check; avoids SSR window access.
  const [isWebAuthnSupported, setIsWebAuthnSupported] = useState(true);

  useEffect(() => {
    if (typeof window.PublicKeyCredential === "undefined") setIsWebAuthnSupported(false);
  }, []);

  useEffect(() => {
    let isActive = true;
    setPasskeyListState({ status: "loading" });
    void (async () => {
      const { data: passkeys, error } = await authClient.passkey.listUserPasskeys();
      if (!isActive) return;
      if (error || !passkeys) {
        setPasskeyListState({ status: "error" });
        return;
      }
      setPasskeyListState({ status: "ready", passkeys });
    })();
    return () => {
      isActive = false;
    };
  }, [listRefreshCount]);

  async function handleCreatePasskey() {
    setMutationState({ status: "registering" });
    const { error } = await authClient.passkey.addPasskey();
    if (error) {
      const registrationErrorCode = "code" in error ? error.code : undefined;
      // Dismissing the OS prompt is a normal outcome, not an error to surface.
      if (registrationErrorCode === "REGISTRATION_CANCELLED") {
        setMutationState({ status: "idle" });
        return;
      }
      setMutationState({
        status: "error",
        message:
          registrationErrorCode === "PREVIOUSLY_REGISTERED"
            ? "This device already has a passkey for your account."
            : registrationErrorCode === "SESSION_REQUIRED"
              ? "Please sign in again to add a passkey."
              : "Couldn't create the passkey. Please try again.",
      });
      return;
    }
    setMutationState({ status: "idle" });
    setListRefreshCount((refreshCount) => refreshCount + 1);
  }

  async function handleConfirmDelete(passkeyId: string) {
    setMutationState({ status: "deleting", passkeyId });
    const { error } = await authClient.passkey.deletePasskey({ id: passkeyId });
    if (error) {
      setMutationState({
        status: "error",
        message: "Couldn't remove the passkey. Please try again.",
      });
      return;
    }
    setMutationState({ status: "idle" });
    setListRefreshCount((refreshCount) => refreshCount + 1);
  }

  function handleStartRename(targetPasskey: Passkey) {
    setRenameDraftName(targetPasskey.name ?? "");
    setMutationState({ status: "renaming", passkeyId: targetPasskey.id });
  }

  async function handleSaveRename(passkeyId: string) {
    const trimmedName = renameDraftName.trim();
    if (trimmedName.length === 0) return;
    setMutationState({ status: "rename-saving", passkeyId });
    const { error } = await authClient.passkey.updatePasskey({ id: passkeyId, name: trimmedName });
    if (error) {
      setMutationState({
        status: "error",
        message: "Couldn't rename the passkey. Please try again.",
      });
      return;
    }
    setMutationState({ status: "idle" });
    setListRefreshCount((refreshCount) => refreshCount + 1);
  }

  const isMutationInFlight =
    mutationState.status === "registering" ||
    mutationState.status === "deleting" ||
    mutationState.status === "rename-saving";

  function renderPasskeyRow(rowPasskey: Passkey) {
    const isRowRenaming =
      (mutationState.status === "renaming" || mutationState.status === "rename-saving") &&
      mutationState.passkeyId === rowPasskey.id;
    const isRowConfirmingDelete =
      mutationState.status === "confirm-delete" && mutationState.passkeyId === rowPasskey.id;
    const isRowDeleting =
      mutationState.status === "deleting" && mutationState.passkeyId === rowPasskey.id;

    return (
      <li
        key={rowPasskey.id}
        className="flex flex-col gap-3 rounded-xl border border-black/10 bg-card p-4"
      >
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
                onChange={(inputEvent) => setRenameDraftName(inputEvent.target.value)}
                placeholder="Passkey name"
                className="rounded-lg border border-black/10 bg-background px-3 py-1.5 text-sm text-secondary-foreground outline-none focus:border-primary"
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
            <span className="flex shrink-0 flex-row items-center gap-1 text-xs font-medium text-[#00696E]">
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
          <div className="flex flex-row justify-end gap-4">
            <button
              type="button"
              onClick={() => setMutationState({ status: "idle" })}
              disabled={mutationState.status === "rename-saving"}
              className="cursor-pointer text-sm font-medium text-secondary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSaveRename(rowPasskey.id)}
              disabled={
                mutationState.status === "rename-saving" || renameDraftName.trim().length === 0
              }
              className="cursor-pointer text-sm font-medium text-[#00696E] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mutationState.status === "rename-saving" ? "Saving…" : "Save"}
            </button>
          </div>
        ) : isRowConfirmingDelete ? (
          <div className="flex flex-row items-center justify-between gap-4">
            <span className="text-sm text-secondary-foreground">Remove this passkey?</span>
            <div className="flex flex-row gap-4">
              <button
                type="button"
                onClick={() => setMutationState({ status: "idle" })}
                className="cursor-pointer text-sm font-medium text-secondary-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDelete(rowPasskey.id)}
                className="cursor-pointer text-sm font-medium text-red-600"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-row justify-end gap-4">
            <button
              type="button"
              onClick={() => handleStartRename(rowPasskey)}
              disabled={isMutationInFlight}
              className="cursor-pointer text-sm font-medium text-[#00696E] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Rename
            </button>
            <button
              type="button"
              onClick={() =>
                setMutationState({ status: "confirm-delete", passkeyId: rowPasskey.id })
              }
              disabled={isMutationInFlight}
              className="cursor-pointer text-sm font-medium text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRowDeleting ? "Removing…" : "Remove"}
            </button>
          </div>
        )}
      </li>
    );
  }

  function renderListSection() {
    switch (passkeyListState.status) {
      case "loading":
        return <p className="text-sm text-muted-foreground">Loading your passkeys…</p>;
      case "error":
        return (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-red-600">Couldn't load your passkeys.</p>
            <button
              type="button"
              onClick={() => setListRefreshCount((refreshCount) => refreshCount + 1)}
              className="cursor-pointer self-start text-sm font-medium text-[#00696E]"
            >
              Try again
            </button>
          </div>
        );
      case "ready":
        if (passkeyListState.passkeys.length === 0) {
          return (
            <p className="text-sm text-muted-foreground">
              You don't have any passkeys yet. Create one to sign in with your fingerprint, face, or
              screen lock instead of a password.
            </p>
          );
        }
        return (
          <ul className="flex flex-col gap-3">{passkeyListState.passkeys.map(renderPasskeyRow)}</ul>
        );
      default: {
        const exhaustiveCheck: never = passkeyListState;
        return exhaustiveCheck;
      }
    }
  }

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
        <h2 className="text-xl font-medium text-secondary-foreground">Passkeys</h2>
      </header>

      <div className="flex flex-col gap-6 p-4">
        <p className="text-sm text-muted-foreground">
          Passkeys let you sign in with your fingerprint, face, or screen lock on devices where
          you've created one.
        </p>

        {renderListSection()}

        {mutationState.status === "error" ? (
          <span className="text-xs text-red-600">{mutationState.message}</span>
        ) : null}

        <button
          type="button"
          onClick={handleCreatePasskey}
          disabled={!isWebAuthnSupported || isMutationInFlight}
          className="cursor-pointer rounded-full bg-primary px-4 py-3 text-sm font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        >
          {mutationState.status === "registering" ? "Waiting for your device…" : "Create a passkey"}
        </button>
        {!isWebAuthnSupported ? (
          <span className="text-xs text-muted-foreground">
            Your browser doesn't support passkeys.
          </span>
        ) : null}
      </div>
    </div>
  );
}

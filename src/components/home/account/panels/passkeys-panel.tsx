"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { Passkey } from "@better-auth/passkey/client";
import { authClient } from "@/lib/auth-client";
import { useInvalidatePasskeys } from "@/hooks/account/passkeys";
import { useIsWebAuthnSupported } from "@/hooks/use-is-web-authn-supported";
import { PasskeyRowItem, type PasskeyMutationState } from "./passkey-row-item";

type PasskeyListState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; passkeys: Passkey[] };

type PasskeysPanelProps = {
  /** Return to the settings action list. */
  onBack: () => void;
};

export function PasskeysPanel({ onBack }: PasskeysPanelProps) {
  const [passkeyListState, setPasskeyListState] = useState<PasskeyListState>({
    status: "loading",
  });
  const [mutationState, setMutationState] = useState<PasskeyMutationState>({ status: "idle" });
  const [renameDraftName, setRenameDraftName] = useState("");
  const invalidatePasskeys = useInvalidatePasskeys();
  const isWebAuthnSupported = useIsWebAuthnSupported();

  async function loadPasskeys() {
    const { data: passkeys, error } = await authClient.passkey.listUserPasskeys();
    if (error || !passkeys) {
      setPasskeyListState({ status: "error" });
      return;
    }
    setPasskeyListState({ status: "ready", passkeys });
  }

  useEffect(() => {
    let isActive = true;
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
  }, []);

  async function handleCreatePasskey() {
    setMutationState({ status: "registering" });
    const { error } = await authClient.passkey.addPasskey();
    if (error) {
      const registrationErrorCode = "code" in error ? error.code : undefined;
      if (
        registrationErrorCode === "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY" ||
        registrationErrorCode === "ERROR_CEREMONY_ABORTED"
      ) {
        setMutationState({ status: "idle" });
        return;
      }
      setMutationState({
        status: "error",
        message:
          registrationErrorCode === "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED"
            ? "This device already has a passkey for your account."
            : registrationErrorCode === "SESSION_REQUIRED"
              ? "Please sign in again to add a passkey."
              : "Couldn't create the passkey. Please try again.",
      });
      return;
    }
    setMutationState({ status: "idle" });
    await loadPasskeys();
    void invalidatePasskeys();
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
    await loadPasskeys();
    void invalidatePasskeys();
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
        status: "rename-error",
        passkeyId,
        message: "Couldn't rename the passkey. Please try again.",
      });
      return;
    }
    setMutationState({ status: "idle" });
    await loadPasskeys();
    void invalidatePasskeys();
  }

  const isMutationInFlight =
    mutationState.status === "registering" ||
    mutationState.status === "deleting" ||
    mutationState.status === "rename-saving";

  function renderListSection() {
    switch (passkeyListState.status) {
      case "loading":
        return <p className="text-sm text-muted-foreground">Loading your passkeys…</p>;
      case "error":
        return (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-destructive">Couldn't load your passkeys.</p>
            <button
              type="button"
              onClick={() => void loadPasskeys()}
              className="cursor-pointer self-start text-sm font-medium text-primary-imprint"
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
          <ul className="flex flex-col gap-3">
            {passkeyListState.passkeys.map((rowPasskey) => (
              <PasskeyRowItem
                key={rowPasskey.id}
                rowPasskey={rowPasskey}
                mutationState={mutationState}
                renameDraftName={renameDraftName}
                onRenameDraftNameChange={setRenameDraftName}
                onStartRename={handleStartRename}
                onSaveRename={handleSaveRename}
                onCancelRename={() => setMutationState({ status: "idle" })}
                onConfirmDeletePrompt={(passkeyId) =>
                  setMutationState({ status: "confirm-delete", passkeyId })
                }
                onCancelDeletePrompt={() => setMutationState({ status: "idle" })}
                onConfirmDelete={handleConfirmDelete}
                isMutationInFlight={isMutationInFlight}
              />
            ))}
          </ul>
        );
      default: {
        const exhaustiveCheck: never = passkeyListState;
        return exhaustiveCheck;
      }
    }
  }

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
        <h2 className="text-xl font-medium text-secondary-foreground">Passkeys</h2>
      </header>

      <div className="flex flex-col gap-6 p-4">
        <p className="text-sm text-muted-foreground">
          Passkeys let you sign in with your fingerprint, face, or screen lock on devices where
          you've created one.
        </p>

        {renderListSection()}

        {mutationState.status === "error" ? (
          <span className="text-xs text-destructive">{mutationState.message}</span>
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

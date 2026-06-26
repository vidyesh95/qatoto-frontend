"use client";

import Image from "next/image";
import { useState } from "react";
import { useSession } from "@/lib/auth-client";
import { API_BASE_URL } from "@/lib/api";

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

/** Best-effort read of the backend's 422 `fieldErrors` / generic error message. */
function readErrorMessage(payload: unknown): string {
  const fallback = "Couldn't save your name. Please try again.";
  if (typeof payload !== "object" || payload === null) return fallback;
  const body = payload as { fieldErrors?: { fullName?: string[] }; message?: string };
  return body.fieldErrors?.fullName?.[0] ?? body.message ?? fallback;
}

export function FullNamePanel({ initialFullName, onBack }: FullNamePanelProps) {
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

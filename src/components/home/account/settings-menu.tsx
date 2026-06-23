"use client";

import Image from "next/image";
import { useState } from "react";
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
  const [view, setView] = useState<"list" | "full-name">("list");

  if (view === "full-name") {
    return (
      <FullNamePanel initialFullName={session?.user.name ?? ""} onBack={() => setView("list")} />
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
          className="aspect-square w-full rounded-xl border border-background object-cover"
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

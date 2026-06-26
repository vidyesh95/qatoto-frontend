"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { authClient, useSession } from "@/lib/auth-client";
import { FullNamePanel } from "@/components/home/account/full-name-panel";
import { ProfilePhotoPanel } from "@/components/home/account/profile-photo-panel";
import { HandlePanel } from "@/components/home/account/handle-panel";
import { SocialLinkPanel } from "@/components/home/account/social-link-panel";
import { EmailCredentialPanel } from "@/components/home/account/email-credential-panel";

/** One actionable row in the settings list. */
type SettingsItem = {
  /** Visible label. */
  label: string;
  /** Icon path under `public/icons` (or `public/...` for brand marks). */
  icon: string;
  /** Optional click handler; omitted rows are inert nav stubs for now. */
  onClick?: () => void;
  /** Right-aligned status chip (e.g. "Connected") for already-linked actions. */
  badge?: string;
  /** When true, the row is shown but not actionable. */
  disabled?: boolean;
};

/** Which providers are linked to the account — drives the "Connected" chips. */
type LinkedAccountsState =
  | { status: "loading" }
  | { status: "ready"; providerIds: Set<string> }
  | { status: "error" };

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
  const [view, setView] = useState<
    | "list"
    | "full-name"
    | "profile-photo"
    | "handle"
    | "link-google"
    | "link-github"
    | "email-credential"
  >("list");

  // Which providers are linked, so the list can show "Connected" chips and hide
  // "Set email address" once a credential exists. Re-fetched whenever the list is
  // shown — including after returning from a sub-panel that just linked something.
  const [linkedAccountsState, setLinkedAccountsState] = useState<LinkedAccountsState>({
    status: "loading",
  });

  useEffect(() => {
    if (view !== "list") return undefined;
    let isActive = true;
    void (async () => {
      const { data: linkedAccounts, error } = await authClient.listAccounts();
      if (!isActive) return;
      if (error || !linkedAccounts) {
        setLinkedAccountsState({ status: "error" });
        return;
      }
      setLinkedAccountsState({
        status: "ready",
        providerIds: new Set(linkedAccounts.map((linkedAccount) => linkedAccount.providerId)),
      });
    })();
    return () => {
      isActive = false;
    };
  }, [view]);

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

  if (view === "handle") {
    return <HandlePanel onBack={() => setView("list")} />;
  }

  if (view === "link-google") {
    return <SocialLinkPanel provider="google" onBack={() => setView("list")} />;
  }

  if (view === "link-github") {
    return <SocialLinkPanel provider="github" onBack={() => setView("list")} />;
  }

  if (view === "email-credential") {
    return <EmailCredentialPanel onBack={() => setView("list")} />;
  }

  const providerIds =
    linkedAccountsState.status === "ready" ? linkedAccountsState.providerIds : null;
  const isGoogleLinked = providerIds?.has("google") ?? false;
  const isGithubLinked = providerIds?.has("github") ?? false;
  const hasCredential = providerIds?.has("credential") ?? false;

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
      onClick: () => setView("handle"),
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
    {
      label: "Link Google account",
      icon: "/icons/google_logo_tint.svg",
      onClick: () => setView("link-google"),
      badge: isGoogleLinked ? "Connected" : undefined,
    },
    {
      label: "Link Github account",
      icon: "/icons/github_logo_light.svg",
      onClick: () => setView("link-github"),
      badge: isGithubLinked ? "Connected" : undefined,
    },
    {
      label: hasCredential ? "Email & password enabled" : "Set email address",
      icon: "/icons/mail_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      onClick: () => setView("email-credential"),
      badge: hasCredential ? "Connected" : undefined,
    },
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
          @{session?.user.handle ?? "…"}
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
              disabled={item.disabled}
              className="flex w-full cursor-pointer flex-row items-center gap-4 p-4 transition-colors hover:bg-muted disabled:cursor-default disabled:hover:bg-transparent"
            >
              <Image src={item.icon} alt="" width={24} height={24} className="size-6 shrink-0" />
              <span className="flex-1 text-left text-sm font-medium text-secondary-foreground">
                {item.label}
              </span>
              {item.badge ? (
                <span className="flex shrink-0 flex-row items-center gap-1 text-xs font-medium text-[#00696E]">
                  <Image
                    src="/icons/check_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                    alt=""
                    width={16}
                    height={16}
                  />
                  {item.badge}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useSession } from "@/lib/auth-client";
import { API_BASE_URL } from "@/lib/api";
import { FullNamePanel } from "@/components/home/account/panels/full-name-panel";
import { ProfilePhotoPanel } from "@/components/home/account/panels/profile-photo-panel";
import { HandlePanel } from "@/components/home/account/panels/handle-panel";
import { SocialLinkPanel } from "@/components/home/account/panels/social-link-panel";
import { EmailCredentialPanel } from "@/components/home/account/panels/email-credential-panel";
import { ChangePasswordPanel } from "@/components/home/account/panels/change-password-panel";
import { PasskeysPanel } from "@/components/home/account/panels/passkeys-panel";
import { PhoneNumberPanel } from "@/components/home/account/panels/phone-number-panel";
import { SwitchAccountPanel } from "@/components/home/account/menus/switch-account-menu";

/** One actionable row in the settings list. */
type SettingsItem = {
  /** Visible label. */
  label: string;
  /** Optional muted second line under the label (e.g. the linked provider email). */
  subtitle?: string;
  /** Icon path under `public/icons` (or `public/...` for brand marks). */
  icon: string;
  /** Optional click handler; omitted rows are inert nav stubs for now. */
  onClick?: () => void;
  /** Right-aligned status chip (e.g. "Connected") for already-linked actions. */
  badge?: string;
  /** When true, the row is shown but not actionable. */
  disabled?: boolean;
};

/** Backend contract for GET /users/me/linked-accounts (untrusted — parsed, not asserted). */
const LinkedAccountsResponseSchema = z
  .object({
    data: z.array(z.object({ providerId: z.string(), email: z.string().nullable() }).strip()),
  })
  .strip();

/** Which providers are linked and the email each is linked as — drives the chips + subtitles. */
type LinkedAccountsState =
  | { status: "loading" }
  | { status: "ready"; accountsByProvider: Map<string, string | null> }
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
    | "phone-number"
    | "link-google"
    | "link-github"
    | "email-credential"
    | "change-password"
    | "passkeys"
    | "switch-account"
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
      try {
        const response = await fetch(`${API_BASE_URL}/users/me/linked-accounts`, {
          credentials: "include",
        });
        const rawBody: unknown = await response.json();
        if (!isActive) return;
        const parsed = LinkedAccountsResponseSchema.safeParse(rawBody);
        if (!response.ok || !parsed.success) {
          setLinkedAccountsState({ status: "error" });
          return;
        }
        const accountsByProvider = new Map(
          parsed.data.data.map((linkedAccount) => [linkedAccount.providerId, linkedAccount.email]),
        );
        setLinkedAccountsState({ status: "ready", accountsByProvider });
      } catch {
        if (isActive) setLinkedAccountsState({ status: "error" });
      }
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

  if (view === "switch-account") {
    return <SwitchAccountPanel onBack={() => setView("list")} onSignOutAll={onSignOut} />;
  }

  if (view === "phone-number") {
    return (
      <PhoneNumberPanel
        initialPhoneNumber={session?.user.phoneNumber ?? ""}
        onBack={() => setView("list")}
      />
    );
  }

  const accountsByProvider =
    linkedAccountsState.status === "ready" ? linkedAccountsState.accountsByProvider : null;
  const googleEmail = accountsByProvider?.get("google") ?? null;
  const githubEmail = accountsByProvider?.get("github") ?? null;
  const credentialEmail = accountsByProvider?.get("credential") ?? null;

  if (view === "link-google") {
    return (
      <SocialLinkPanel provider="google" linkedEmail={googleEmail} onBack={() => setView("list")} />
    );
  }

  if (view === "link-github") {
    return (
      <SocialLinkPanel provider="github" linkedEmail={githubEmail} onBack={() => setView("list")} />
    );
  }

  if (view === "email-credential") {
    return <EmailCredentialPanel onBack={() => setView("list")} />;
  }

  if (view === "change-password") {
    return <ChangePasswordPanel onBack={() => setView("list")} />;
  }

  if (view === "passkeys") {
    return <PasskeysPanel onBack={() => setView("list")} />;
  }

  const isGoogleLinked = accountsByProvider?.has("google") ?? false;
  const isGithubLinked = accountsByProvider?.has("github") ?? false;
  const hasCredential = accountsByProvider?.has("credential") ?? false;
  const isLinkedAccountsReady = linkedAccountsState.status === "ready";

  const items: SettingsItem[] = [
    {
      label: "Your account",
      icon: "/icons/account_circle_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    },
    {
      label: "Switch account",
      icon: "/icons/switch_account_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      onClick: () => setView("switch-account"),
    },
    {
      label: "Sign out",
      icon: "/icons/logout_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      onClick: onSignOut,
    },
    {
      label: "Set or change password",
      icon: "/icons/lock_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      onClick: () => setView(hasCredential ? "change-password" : "email-credential"),
      disabled: !isLinkedAccountsReady,
    },
    {
      label: "Passkeys",
      icon: "/icons/passkey_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      onClick: () => setView("passkeys"),
    },
    {
      label: "Set handle",
      icon: "/icons/alternate_email_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      onClick: () => setView("handle"),
    },
    {
      label: session?.user.phoneNumberVerified ? "Phone number verified" : "Set phone number",
      subtitle: session?.user.phoneNumber ?? undefined,
      icon: "/icons/add_call_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      onClick: () => setView("phone-number"),
      badge: session?.user.phoneNumberVerified ? "Verified" : undefined,
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
      subtitle: googleEmail ?? undefined,
      icon: "/icons/google_logo_tint.svg",
      onClick: () => setView("link-google"),
      badge: isGoogleLinked ? "Connected" : undefined,
    },
    {
      label: "Link Github account",
      subtitle: githubEmail ?? undefined,
      icon: "/icons/github_logo_light.svg",
      onClick: () => setView("link-github"),
      badge: isGithubLinked ? "Connected" : undefined,
    },
    {
      label: hasCredential ? "Email & password enabled" : "Set email address",
      subtitle: credentialEmail ?? undefined,
      icon: "/icons/mail_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      onClick: () => setView("email-credential"),
      badge: hasCredential ? "Connected" : undefined,
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
              <span className="flex flex-1 flex-col text-left">
                <span className="text-sm font-medium text-secondary-foreground">{item.label}</span>
                {item.subtitle ? (
                  <span className="text-xs text-muted-foreground">{item.subtitle}</span>
                ) : null}
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

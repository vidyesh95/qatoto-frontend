import type { useSession } from "@/lib/auth-client";
import type { AccountEditor } from "./your-account-rows";
import type { SettingsItem } from "./settings-menu-views";

export function buildSettingsItems({
  session,
  accountsByProvider,
  onOpenView,
  onOpenEditor,
  onSignOut,
}: {
  readonly session: ReturnType<typeof useSession>["data"];
  readonly accountsByProvider: ReadonlyMap<string, string | null> | null;
  readonly onOpenView: (
    kind: "your-account" | "feed-preferences" | "watch-time" | "data-and-privacy",
  ) => void;
  readonly onOpenEditor: (editor: AccountEditor) => void;
  readonly onSignOut: () => void;
}): SettingsItem[] {
  const googleEmail = accountsByProvider?.get("google") ?? null;
  const githubEmail = accountsByProvider?.get("github") ?? null;
  const credentialEmail = accountsByProvider?.get("credential") ?? null;

  const isGoogleLinked = accountsByProvider?.has("google") ?? false;
  const isGithubLinked = accountsByProvider?.has("github") ?? false;
  const hasCredential = accountsByProvider?.has("credential") ?? false;
  const isLinkedAccountsReady = accountsByProvider !== null;

  return [
    {
      label: "Your account",
      icon: "/icons/account_circle_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      onClick: () => onOpenView("your-account"),
    },
    {
      label: "Switch account",
      icon: "/icons/switch_account_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      onClick: () => onOpenEditor("switch-account"),
    },
    {
      label: "Sign out",
      icon: "/icons/logout_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      onClick: onSignOut,
    },
    {
      label: "Set or change password",
      icon: "/icons/lock_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      onClick: () => onOpenEditor(hasCredential ? "change-password" : "email-credential"),
      disabled: !isLinkedAccountsReady,
    },
    {
      label: "Passkeys",
      icon: "/icons/passkey_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      onClick: () => onOpenEditor("passkeys"),
    },
    {
      label: "Set handle",
      icon: "/icons/alternate_email_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      onClick: () => onOpenEditor("handle"),
    },
    {
      label: "Channel profile",
      icon: "/icons/link_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      onClick: () => onOpenEditor("channel-profile"),
    },
    {
      label: session?.user.phoneNumberVerified ? "Phone number verified" : "Set phone number",
      subtitle: session?.user.phoneNumber ?? undefined,
      icon: "/icons/add_call_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      onClick: () => onOpenEditor("phone-number"),
      badge: session?.user.phoneNumberVerified ? "Verified" : undefined,
    },
    {
      label: "Set full name",
      icon: "/icons/id_card_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      onClick: () => onOpenEditor("full-name"),
    },
    {
      label: "Set profile photo",
      icon: "/icons/add_photo_alternate_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      onClick: () => onOpenEditor("profile-photo"),
    },
    {
      label: "Link Google account",
      subtitle: googleEmail ?? undefined,
      icon: "/icons/google_logo_tint.svg",
      onClick: () => onOpenEditor("link-google"),
      badge: isGoogleLinked ? "Connected" : undefined,
    },
    {
      label: "Link Github account",
      subtitle: githubEmail ?? undefined,
      icon: "/icons/github_logo_light.svg",
      onClick: () => onOpenEditor("link-github"),
      badge: isGithubLinked ? "Connected" : undefined,
    },
    {
      label: hasCredential ? "Email & password enabled" : "Set email address",
      subtitle: credentialEmail ?? undefined,
      icon: "/icons/mail_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      onClick: () => onOpenEditor("email-credential"),
      badge: hasCredential ? "Connected" : undefined,
    },
    {
      label: "Feed preferences",
      icon: "/icons/visibility_off_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
      onClick: () => onOpenView("feed-preferences"),
    },
    {
      label: "Time watched",
      icon: "/icons/history_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      onClick: () => onOpenView("watch-time"),
    },
    {
      label: "Your data & privacy",
      icon: "/icons/storage_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      onClick: () => onOpenView("data-and-privacy"),
    },
  ];
}

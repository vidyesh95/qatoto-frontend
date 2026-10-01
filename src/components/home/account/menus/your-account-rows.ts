import type { useSession } from "@/lib/auth-client";

/** One of the editors `menus/settings-menu.tsx` hosts. The values ARE that component's view names. */
export type AccountEditor =
  | "full-name"
  | "profile-photo"
  | "handle"
  | "channel-profile"
  | "phone-number"
  | "link-google"
  | "link-github"
  | "email-credential"
  | "change-password"
  | "passkeys"
  | "switch-account"
  | "delete-account";

/** One row of the detail list. */
export type AccountDetailRow =
  | {
      readonly kind: "editor";
      readonly label: string;
      readonly icon: string;
      readonly value: string;
      readonly badge?: string;
      readonly editor: AccountEditor;
    }
  | {
      readonly kind: "static";
      readonly label: string;
      readonly icon: string;
      readonly value: string;
      readonly badge?: string;
    }
  | {
      readonly kind: "copy";
      readonly label: string;
      readonly icon: string;
      readonly value: string;
    };

/** Shown wherever a read has not landed. NEVER "Not set" — an unanswered question is not a "no". */
export const UNKNOWN_VALUE = "Checking…";

const MEMBER_SINCE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

function formatMemberSinceDate(createdAt: Date | string): string {
  return MEMBER_SINCE_FORMATTER.format(new Date(createdAt));
}

function providerValue(
  accountsByProvider: ReadonlyMap<string, string | null> | null,
  providerId: string,
): string {
  if (accountsByProvider === null) return UNKNOWN_VALUE;
  if (!accountsByProvider.has(providerId)) return "Not linked";
  return accountsByProvider.get(providerId) ?? "Linked";
}

export function buildAccountDetailRows({
  session,
  accountsByProvider,
  passkeyCount,
}: {
  readonly session: ReturnType<typeof useSession>["data"];
  readonly accountsByProvider: ReadonlyMap<string, string | null> | null;
  readonly passkeyCount: number | null;
}): AccountDetailRow[] {
  return [
    {
      kind: "editor",
      label: "Full name",
      icon: "/icons/id_card_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      value: session?.user.name ?? UNKNOWN_VALUE,
      editor: "full-name",
    },
    {
      kind: "editor",
      label: "Profile photo",
      icon: "/icons/add_photo_alternate_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      value: !session ? UNKNOWN_VALUE : session.user.image ? "Set" : "Not set",
      editor: "profile-photo",
    },
    {
      kind: "editor",
      label: "Handle",
      icon: "/icons/alternate_email_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      value: session?.user.handle ? `@${session.user.handle}` : "Not set",
      editor: "handle",
    },
    {
      kind: "editor",
      label: "Channel profile",
      icon: "/icons/link_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      value: "Description and links",
      editor: "channel-profile",
    },
    {
      kind: "static",
      label: "Email",
      icon: "/icons/mail_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      value: session?.user.email ?? UNKNOWN_VALUE,
      ...(session?.user.emailVerified ? { badge: "Verified" } : {}),
    },
    {
      kind: "editor",
      label: "Phone number",
      icon: "/icons/add_call_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      value: session?.user.phoneNumber ?? "Not set",
      ...(session?.user.phoneNumberVerified ? { badge: "Verified" } : {}),
      editor: "phone-number",
    },
    {
      kind: "editor",
      label: "Password",
      icon: "/icons/lock_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      value:
        accountsByProvider === null
          ? UNKNOWN_VALUE
          : accountsByProvider.has("credential")
            ? "Set"
            : "Not set",
      editor: accountsByProvider?.has("credential") ? "change-password" : "email-credential",
    },
    {
      kind: "editor",
      label: "Passkeys",
      icon: "/icons/passkey_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      value:
        passkeyCount === null
          ? UNKNOWN_VALUE
          : passkeyCount === 0
            ? "None yet"
            : `${passkeyCount} registered`,
      editor: "passkeys",
    },
    {
      kind: "editor",
      label: "Google",
      icon: "/icons/google_logo_tint.svg",
      value: providerValue(accountsByProvider, "google"),
      ...(accountsByProvider?.has("google") ? { badge: "Connected" } : {}),
      editor: "link-google",
    },
    {
      kind: "editor",
      label: "GitHub",
      icon: "/icons/github_logo_light.svg",
      value: providerValue(accountsByProvider, "github"),
      ...(accountsByProvider?.has("github") ? { badge: "Connected" } : {}),
      editor: "link-github",
    },
    {
      kind: "static",
      label: "Member since",
      icon: "/icons/history_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      value: session ? formatMemberSinceDate(session.user.createdAt) : UNKNOWN_VALUE,
    },
    {
      kind: "copy",
      label: "Account ID",
      icon: "/icons/shield_person_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      value: session?.user.id ?? UNKNOWN_VALUE,
    },
  ];
}

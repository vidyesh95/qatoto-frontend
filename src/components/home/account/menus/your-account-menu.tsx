// TRANSPORT: client-query — the Better Auth session, `GET /users/me/linked-accounts`, and the
// passkey list. No writes of its own.
"use client";

// WHAT THE ACCOUNT HOLDER'S ACCOUNT ACTUALLY SAYS, in one place.
//
// The Settings list beside this file answers "what can I change"; every row there is an imperative
// ("Set handle", "Set phone number") and the current value rides along as a subtitle, which is the
// wrong way round for someone who came to READ their account rather than edit it. This panel is the
// other half: label on the left, VALUE on the right, one row per fact — and the row is still the
// way into the editor that owns it, so nothing is lost by looking first.
//
// IT OWNS NO EDITORS. `onOpenEditor` hands the choice back to `menus/settings-menu.tsx`, which
// already hosts all ten of them and already knows how to render each one. Duplicating that switch
// here would mean two places to keep in step every time a panel gains a prop.
//
// NOTHING HERE IS A TRUST BOUNDARY. Every value is a display of what the session says; the Express
// backend re-authorizes each editor's write regardless (CLAUDE.md).

import Image from "next/image";
import { useState } from "react";

import { useLinkedAccountsQuery } from "@/hooks/account/linked-accounts";
import { usePasskeysQuery } from "@/hooks/account/passkeys";
import { useSession } from "@/lib/auth-client";

/** One of the editors `menus/settings-menu.tsx` hosts. The values ARE that component's view names. */
export type AccountEditor =
  | "full-name"
  | "profile-photo"
  | "handle"
  | "phone-number"
  | "link-google"
  | "link-github"
  | "email-credential"
  | "change-password"
  | "passkeys"
  | "switch-account";

/**
 * One row of the detail list.
 *
 * A DISCRIMINATED UNION RATHER THAN AN OPTIONAL `editor`, because the three row kinds are three
 * different controls — a button that navigates, a plain line of text, and a line of text with a
 * copy affordance. An optional field would let a row be a button with nowhere to go, which is
 * exactly the inert stub this surface has shipped before (CLAUDE.md Pattern 1).
 */
type AccountDetailRow =
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

type YourAccountPanelProps = {
  /** Header back button — returns to the settings action list. */
  onBack: () => void;
  /** Open one of the editors the parent hosts. */
  onOpenEditor: (editor: AccountEditor) => void;
};

/** Shown wherever a read has not landed. NEVER "Not set" — an unanswered question is not a "no". */
const UNKNOWN_VALUE = "Checking…";

export function YourAccountPanel({ onBack, onOpenEditor }: YourAccountPanelProps) {
  const { data: session } = useSession();
  const linkedAccountsQuery = useLinkedAccountsQuery();
  const passkeysQuery = usePasskeysQuery();

  // Which row's value was last copied, so the button can say so. Cleared by the next copy.
  const [copiedRowLabel, setCopiedRowLabel] = useState<string | null>(null);

  const avatarSrc = session?.user.image ?? "/dummy/profile_photo_girl.avif";

  // Null while the read is in flight or has failed — "we do not know yet", never "not linked".
  // Claiming Google is unlinked because a request has not landed is how somebody links it twice.
  const linkedAccountsResult = linkedAccountsQuery.data;
  const accountsByProvider =
    linkedAccountsResult?.success === true
      ? new Map(linkedAccountsResult.data.map((account) => [account.providerId, account.email]))
      : null;

  const passkeysResult = passkeysQuery.data;
  const passkeyCount = passkeysResult?.success === true ? passkeysResult.data.length : null;

  const handleCopyAccountId = async (row: AccountDetailRow) => {
    try {
      await navigator.clipboard.writeText(row.value);
      setCopiedRowLabel(row.label);
    } catch {
      // A clipboard the browser refuses is not worth an error state — the value is on screen and
      // selectable either way.
      setCopiedRowLabel(null);
    }
  };

  const rows: AccountDetailRow[] = [
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
      // STATIC ON PURPOSE. There is no endpoint that changes the address an account signs in with —
      // `PATCH /users/me` takes a full name and nothing else. A chevron here would promise an
      // editor that does not exist. Linking an email CREDENTIAL is a different thing, and it is the
      // Password row below.
      kind: "static",
      label: "Email",
      icon: "/icons/mail_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      value: session?.user.email ?? UNKNOWN_VALUE,
      ...(session?.user.emailVerified ? { badge: "Verified" } : {}),
    },
    {
      // ALWAYS "Not set" TODAY. `phoneNumber` is declared client-side in `lib/auth-client.ts` via
      // `inferAdditionalFields`, but the backend has no phoneNumber plugin and no `phone_number`
      // column — the field type-checks and is `undefined` at runtime. The row and its editor stay
      // because both already shipped; the honest value is the one the session actually holds.
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
      // ONE ROW, TWO EDITORS. Whether this is "set a password" or "change the one you have" is
      // `accountsByProvider.has("credential")` and nothing else — the same branch the settings list
      // makes. Until the provider list lands, the row is inert rather than guessing.
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
        <h2 className="text-xl font-medium text-secondary-foreground">Your account</h2>
      </header>

      <section className="m-4 flex flex-row items-center gap-4 rounded-2xl bg-card p-4 shadow-sm">
        <Image
          src={avatarSrc}
          alt=""
          width={64}
          height={64}
          className="aspect-square size-16 shrink-0 rounded-lg border border-background object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-medium text-secondary-foreground">
            {session?.user.name ?? UNKNOWN_VALUE}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {session?.user.handle ? `@${session.user.handle}` : "No handle yet"}
          </p>
        </div>
      </section>

      {linkedAccountsQuery.data?.success === false ? (
        <p className="px-4 pb-2 text-sm text-muted-foreground">
          Couldn&apos;t check which sign-in methods are linked. The rows below still open.
        </p>
      ) : null}

      <ul>
        {rows.map((row) => (
          <li key={row.label}>
            {row.kind === "editor" ? (
              <button
                type="button"
                onClick={() => onOpenEditor(row.editor)}
                className="flex w-full cursor-pointer flex-row items-center gap-4 p-4 text-left transition-colors hover:bg-muted"
              >
                <AccountDetailRowBody row={row} />
                <Image
                  src="/icons/chevron_forward_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
                  alt=""
                  width={24}
                  height={24}
                  className="size-6 shrink-0"
                />
              </button>
            ) : row.kind === "copy" ? (
              <div className="flex w-full flex-row items-center gap-4 p-4">
                <AccountDetailRowBody row={row} />
                <button
                  type="button"
                  onClick={() => void handleCopyAccountId(row)}
                  aria-label={`Copy ${row.label}`}
                  className="flex shrink-0 cursor-pointer flex-row items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-secondary-foreground transition-colors hover:bg-muted"
                >
                  <Image
                    src="/icons/content_copy_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                    alt=""
                    width={16}
                    height={16}
                  />
                  {copiedRowLabel === row.label ? "Copied" : "Copy"}
                </button>
              </div>
            ) : (
              <div className="flex w-full flex-row items-center gap-4 p-4">
                <AccountDetailRowBody row={row} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The label/value pair and its badge, shared by all three row shells above. */
function AccountDetailRowBody({ row }: { row: AccountDetailRow }) {
  return (
    <>
      <Image src={row.icon} alt="" width={24} height={24} className="size-6 shrink-0" />
      <span className="flex min-w-0 flex-1 flex-col text-left">
        <span className="text-sm font-medium text-secondary-foreground">{row.label}</span>
        <span className="truncate text-xs text-muted-foreground">{row.value}</span>
      </span>
      {row.kind !== "copy" && row.badge ? (
        <span className="flex shrink-0 flex-row items-center gap-1 text-xs font-medium text-[#00696E]">
          <Image
            src="/icons/check_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt=""
            width={16}
            height={16}
          />
          {row.badge}
        </span>
      ) : null}
    </>
  );
}

/** The address a provider is linked as, or why there is not one. */
function providerValue(
  accountsByProvider: ReadonlyMap<string, string | null> | null,
  providerId: string,
) {
  if (accountsByProvider === null) return UNKNOWN_VALUE;
  if (!accountsByProvider.has(providerId)) return "Not linked";
  return accountsByProvider.get(providerId) ?? "Linked";
}

function formatMemberSinceDate(createdAt: Date | string) {
  return new Date(createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

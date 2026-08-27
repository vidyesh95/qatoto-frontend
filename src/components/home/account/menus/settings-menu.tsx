// TRANSPORT: client-query — the Better Auth session and `GET /users/me/linked-accounts`, which
// together decide which rows this list shows. Every write belongs to the editor it opens.
"use client";

import Image from "next/image";
import { useState } from "react";
import { useSession } from "@/lib/auth-client";
import {
  useInvalidateLinkedAccounts,
  useLinkedAccountsQuery,
} from "@/hooks/account/linked-accounts";
import { FullNamePanel } from "@/components/home/account/panels/full-name-panel";
import { ProfilePhotoPanel } from "@/components/home/account/panels/profile-photo-panel";
import { HandlePanel } from "@/components/home/account/panels/handle-panel";
import { ChannelProfilePanel } from "@/components/home/account/panels/channel-profile-panel";
import { SocialLinkPanel } from "@/components/home/account/panels/social-link-panel";
import { EmailCredentialPanel } from "@/components/home/account/panels/email-credential-panel";
import { ChangePasswordPanel } from "@/components/home/account/panels/change-password-panel";
import { PasskeysPanel } from "@/components/home/account/panels/passkeys-panel";
import { PhoneNumberPanel } from "@/components/home/account/panels/phone-number-panel";
import { SwitchAccountPanel } from "@/components/home/account/menus/switch-account-menu";
import { DataAndPrivacyPanel } from "@/components/home/account/panels/data-and-privacy-panel";
import { DeleteAccountPanel } from "@/components/home/account/panels/delete-account-panel";
import { WatchTimePanel } from "@/components/home/account/panels/watch-time-panel";
import { FeedPreferencesPanel } from "@/components/home/account/panels/feed-preferences-panel";
import {
  type AccountEditor,
  YourAccountPanel,
} from "@/components/home/account/menus/your-account-menu";

/** One actionable row in the settings list. */
type SettingsItem = {
  /** Visible label. */
  label: string;
  /** Optional muted second line under the label (e.g. the linked provider email). */
  subtitle?: string;
  /** Icon path under `public/icons` (or `public/...` for brand marks). */
  icon: string;
  /**
   * What the row does. REQUIRED, and it was optional until the last two rows without one were
   * dealt with — an optional handler is what let this list ship a full-width button that swallowed
   * the click, and the type is now the thing that stops the next one (CLAUDE.md Pattern 1).
   */
  onClick: () => void;
  /** Right-aligned status chip (e.g. "Connected") for already-linked actions. */
  badge?: string;
  /** When true, the row is shown but not actionable. */
  disabled?: boolean;
};

/**
 * What this panel is showing.
 *
 * THE `returnTo` IS THE WHOLE POINT of this being a union rather than the flat string it used to
 * be. An editor is now reachable from two lists — this one and the "Your account" detail panel —
 * and a back button that always went to `"list"` would drop somebody who opened Handle from the
 * detail panel onto a different list than the one they left (CLAUDE.md Pattern 1).
 */
type SettingsView =
  | { kind: "list" }
  | { kind: "your-account" }
  // A THIRD LIST, NOT AN EDITOR. Like "Your account", the data & privacy panel is a page of its own
  // that ALSO opens editors this component hosts — so it has to be somewhere `returnTo` can point,
  // and `AccountEditor` is reserved for the leaves. "Delete account" is a leaf and lives there.
  | { kind: "data-and-privacy" }
  // A LEAF THAT IS NOT AN EDITOR. It reads and never writes, so it opens nothing and needs no
  // `returnTo` — but it is not an `AccountEditor` either, because that union is what the editor
  // switch below is exhaustive over and every member of it is a form.
  | { kind: "watch-time" }
  // A FOURTH LIST-SHAPED LEAF, beside "watch-time" and for the same reason: it reads, it
  // writes only through per-row controls it owns, and it opens no editor — so it needs no
  // `returnTo` and does not belong in `AccountEditor`, every member of which is a form.
  | { kind: "feed-preferences" }
  | {
      kind: "editor";
      editor: AccountEditor;
      returnTo: "list" | "your-account" | "data-and-privacy";
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
 * Location / Language panels.
 *
 * Nothing here is a trust boundary — every action that mutates account state
 * must be re-validated and authorized by the Express backend.
 */
export function SettingsPanel({ onBack, onSignOut }: SettingsPanelProps) {
  const { data: session } = useSession();
  const avatarSrc = session?.user.image ?? "/dummy/profile_photo_girl.avif";

  const [view, setView] = useState<SettingsView>({ kind: "list" });

  // Which providers are linked, so the list can show "Connected" chips and hide
  // "Set email address" once a credential exists.
  //
  // WAS A HAND-ROLLED `useEffect` + an inline Zod schema, refetching on every return to the list.
  // It moved to React Query when the "Your account" detail panel started asking the same question:
  // one cache entry, one request between them, and no way for the two lists to disagree about
  // whether a password is set.
  const linkedAccountsQuery = useLinkedAccountsQuery();

  // Leaving an editor is also the moment the provider list has to be re-read: the visitor may have
  // just set a password or unlinked GitHub, and those writes go through the Better Auth SDK, so
  // nothing in the query cache knows they happened. The query observer lives on this component and
  // never unmounts while an editor is open, so without this the list still says "Set email address"
  // on an account that now has one.
  const invalidateLinkedAccounts = useInvalidateLinkedAccounts();

  /** Open an editor, remembering which list to come back to. */
  const openEditorFrom =
    (returnTo: "list" | "your-account" | "data-and-privacy") => (editor: AccountEditor) =>
      setView({ kind: "editor", editor, returnTo });

  const openEditorFromList = openEditorFrom("list");

  if (view.kind === "your-account") {
    return (
      <YourAccountPanel
        onBack={() => setView({ kind: "list" })}
        onOpenEditor={openEditorFrom("your-account")}
      />
    );
  }

  if (view.kind === "data-and-privacy") {
    return (
      <DataAndPrivacyPanel
        onBack={() => setView({ kind: "list" })}
        onOpenEditor={openEditorFrom("data-and-privacy")}
      />
    );
  }

  if (view.kind === "watch-time") {
    return <WatchTimePanel onBack={() => setView({ kind: "list" })} />;
  }

  if (view.kind === "feed-preferences") {
    return <FeedPreferencesPanel onBack={() => setView({ kind: "list" })} />;
  }

  if (view.kind === "editor") {
    const handleEditorBack = () => {
      void invalidateLinkedAccounts();
      setView({ kind: view.returnTo });
    };

    switch (view.editor) {
      case "full-name":
        return (
          <FullNamePanel initialFullName={session?.user.name ?? ""} onBack={handleEditorBack} />
        );

      case "profile-photo":
        return (
          <ProfilePhotoPanel
            currentPhotoUrl={avatarSrc}
            hasExistingPhoto={Boolean(session?.user.image)}
            onBack={handleEditorBack}
          />
        );

      case "handle":
        return <HandlePanel onBack={handleEditorBack} />;

      case "channel-profile":
        return <ChannelProfilePanel onBack={handleEditorBack} />;

      case "phone-number":
        return (
          <PhoneNumberPanel
            initialPhoneNumber={session?.user.phoneNumber ?? ""}
            onBack={handleEditorBack}
          />
        );

      case "passkeys":
        return <PasskeysPanel onBack={handleEditorBack} />;

      case "switch-account":
        return <SwitchAccountPanel onBack={handleEditorBack} onSignOutAll={onSignOut} />;

      case "delete-account":
        return <DeleteAccountPanel onBack={handleEditorBack} />;

      case "email-credential":
        return <EmailCredentialPanel onBack={handleEditorBack} />;

      case "change-password":
        return <ChangePasswordPanel onBack={handleEditorBack} />;

      case "link-google":
      case "link-github": {
        const provider = view.editor === "link-google" ? "google" : "github";
        const linkedAccountsResult = linkedAccountsQuery.data;
        const linkedEmail =
          linkedAccountsResult?.success === true
            ? (linkedAccountsResult.data.find((account) => account.providerId === provider)
                ?.email ?? null)
            : null;
        return (
          <SocialLinkPanel
            provider={provider}
            linkedEmail={linkedEmail}
            onBack={handleEditorBack}
          />
        );
      }

      default: {
        const exhaustiveCheck: never = view.editor;
        return exhaustiveCheck;
      }
    }
  }

  // Null while the read is in flight or has failed — "we do not know yet", never "not linked".
  const linkedAccountsResult = linkedAccountsQuery.data;
  const accountsByProvider =
    linkedAccountsResult?.success === true
      ? new Map(linkedAccountsResult.data.map((account) => [account.providerId, account.email]))
      : null;
  const googleEmail = accountsByProvider?.get("google") ?? null;
  const githubEmail = accountsByProvider?.get("github") ?? null;
  const credentialEmail = accountsByProvider?.get("credential") ?? null;

  const isGoogleLinked = accountsByProvider?.has("google") ?? false;
  const isGithubLinked = accountsByProvider?.has("github") ?? false;
  const hasCredential = accountsByProvider?.has("credential") ?? false;
  const isLinkedAccountsReady = accountsByProvider !== null;

  const items: SettingsItem[] = [
    {
      // WAS A `<Link href="/your-account">` — the one row in this list that left the dropdown, for
      // a page that rendered a near-copy of this same list. It is a sub-panel now, and it reads
      // rather than commands: label on the left, current value on the right.
      label: "Your account",
      icon: "/icons/account_circle_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      onClick: () => setView({ kind: "your-account" }),
    },
    {
      label: "Switch account",
      icon: "/icons/switch_account_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      onClick: () => openEditorFromList("switch-account"),
    },
    {
      label: "Sign out",
      icon: "/icons/logout_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      onClick: onSignOut,
    },
    {
      label: "Set or change password",
      icon: "/icons/lock_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      onClick: () => openEditorFromList(hasCredential ? "change-password" : "email-credential"),
      disabled: !isLinkedAccountsReady,
    },
    {
      label: "Passkeys",
      icon: "/icons/passkey_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      onClick: () => openEditorFromList("passkeys"),
    },
    {
      label: "Set handle",
      icon: "/icons/alternate_email_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      onClick: () => openEditorFromList("handle"),
    },
    {
      label: "Channel profile",
      icon: "/icons/link_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      onClick: () => openEditorFromList("channel-profile"),
    },
    {
      label: session?.user.phoneNumberVerified ? "Phone number verified" : "Set phone number",
      subtitle: session?.user.phoneNumber ?? undefined,
      icon: "/icons/add_call_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      onClick: () => openEditorFromList("phone-number"),
      badge: session?.user.phoneNumberVerified ? "Verified" : undefined,
    },
    {
      label: "Set full name",
      icon: "/icons/id_card_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      onClick: () => openEditorFromList("full-name"),
    },
    {
      label: "Set profile photo",
      icon: "/icons/add_photo_alternate_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      onClick: () => openEditorFromList("profile-photo"),
    },
    {
      label: "Link Google account",
      subtitle: googleEmail ?? undefined,
      icon: "/icons/google_logo_tint.svg",
      onClick: () => openEditorFromList("link-google"),
      badge: isGoogleLinked ? "Connected" : undefined,
    },
    {
      label: "Link Github account",
      subtitle: githubEmail ?? undefined,
      icon: "/icons/github_logo_light.svg",
      onClick: () => openEditorFromList("link-github"),
      badge: isGithubLinked ? "Connected" : undefined,
    },
    {
      label: hasCredential ? "Email & password enabled" : "Set email address",
      subtitle: credentialEmail ?? undefined,
      icon: "/icons/mail_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      onClick: () => openEditorFromList("email-credential"),
      badge: hasCredential ? "Connected" : undefined,
    },
    {
      // THE UNDO SURFACE FOR THE TWO FEED PREFERENCES. It sits directly above "Time watched"
      // so the three rows that show somebody their own data are together, and it is the only
      // place either preference can be lifted once the card carrying the in-menu Undo has
      // scrolled away.
      label: "Feed preferences",
      icon: "/icons/visibility_off_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
      onClick: () => setView({ kind: "feed-preferences" }),
    },
    {
      // BACK, AND WITH AN ENDPOINT THIS TIME. This row was deleted on 2026-08-18 with the same
      // defect as the one below — a full-width button with no `onClick` — because there was no
      // watch-time endpoint to point it at. `GET /users/me/watch-time` exists now. It only reads.
      label: "Time watched",
      icon: "/icons/history_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      onClick: () => setView({ kind: "watch-time" }),
    },
    {
      // WAS THE ONE INERT ROW IN THIS LIST, labelled "Your data in app account" with no `onClick`,
      // and therefore a full-width button that did nothing. It mattered more than the usual dead
      // stub: `disclaimers/privacy-policy.tsx` tells people that access, correction and deletion
      // happen by email, so a row named after their data that swallowed the click read as a control
      // the product does not have.
      //
      // "Time watched" sat beside it with the same defect and was removed rather than relabelled —
      // at the time there was no watch-time endpoint to point it at, and one dead row next to a
      // fixed one is worse than either alone. It is the row above now.
      label: "Your data & privacy",
      icon: "/icons/storage_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      onClick: () => setView({ kind: "data-and-privacy" }),
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
              <SettingsItemBody item={item} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The row's contents. */
function SettingsItemBody({ item }: { item: SettingsItem }) {
  return (
    <>
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
    </>
  );
}

// TRANSPORT: client-query — session for the profile card, `GET /users/me/linked-accounts` for the chips.
"use client";

// THE `/your-account` INDEX: a profile card and the list of things you can change about your
// identity, each one a real URL.
//
// It is the page shape of `menus/settings-menu.tsx`'s action list, with two differences that are
// the whole point of the route existing. Every row is a `<Link>` rather than a `setView` button, so
// it is linkable, back-navigable and openable in a new tab; and the "Your account" row that list
// carried — with no `onClick`, an inert stub since the day it was written — is gone, because this
// IS that destination.
//
// TWO ROWS FROM THE DROPDOWN ARE DELIBERATELY ABSENT: "Time watched" and "Your data in app
// account". Both are inert there too, and an inert row in a dropdown reads as a menu still filling
// in, while an inert row on a settings page reads as a broken feature. They come back when they go
// somewhere.

import Image from "next/image";
import Link from "next/link";

import { signOut, useSession } from "@/lib/auth-client";
import { useLinkedAccountsQuery } from "@/hooks/account/linked-accounts";

/**
 * One row. A union rather than an optional `href`, because a row with neither a destination nor an
 * action is exactly the inert stub this page exists to stop shipping.
 */
type AccountActionRow =
  | {
      readonly kind: "link";
      readonly label: string;
      readonly icon: string;
      readonly href: string;
      readonly subtitle?: string;
      readonly badge?: string;
    }
  | { readonly kind: "sign-out"; readonly label: string; readonly icon: string };

export default function YourAccountIndex() {
  const { data: session } = useSession();
  const linkedAccountsQuery = useLinkedAccountsQuery();

  const avatarSrc = session?.user.image ?? "/dummy/profile_photo_girl.avif";

  // The provider rows, or null while the read is in flight or has failed. Null is "we do not know
  // yet", and every row below treats it as such rather than as "not linked" — claiming a Google
  // account is unlinked because a request has not landed is how someone ends up linking it twice.
  const linkedAccountsResult = linkedAccountsQuery.data;
  const accountsByProvider =
    linkedAccountsResult?.success === true
      ? new Map(linkedAccountsResult.data.map((account) => [account.providerId, account.email]))
      : null;

  const googleEmail = accountsByProvider?.get("google") ?? null;
  const githubEmail = accountsByProvider?.get("github") ?? null;
  const credentialEmail = accountsByProvider?.get("credential") ?? null;
  const hasCredential = accountsByProvider?.has("credential") ?? false;

  const rows: AccountActionRow[] = [
    {
      kind: "link",
      label: "Set full name",
      icon: "/icons/id_card_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      href: "/your-account/full-name",
      subtitle: session?.user.name ?? undefined,
    },
    {
      kind: "link",
      label: "Set profile photo",
      icon: "/icons/add_photo_alternate_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      href: "/your-account/profile-photo",
    },
    {
      kind: "link",
      label: "Set handle",
      icon: "/icons/alternate_email_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      href: "/your-account/handle",
      subtitle: session?.user.handle ? `@${session.user.handle}` : undefined,
    },
    {
      kind: "link",
      label: session?.user.phoneNumberVerified ? "Phone number verified" : "Set phone number",
      icon: "/icons/add_call_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      href: "/your-account/phone-number",
      subtitle: session?.user.phoneNumber ?? undefined,
      badge: session?.user.phoneNumberVerified ? "Verified" : undefined,
    },
    {
      kind: "link",
      label: hasCredential ? "Change password" : "Set or change password",
      icon: "/icons/lock_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      href: "/your-account/password",
      subtitle: credentialEmail ?? undefined,
      badge: hasCredential ? "Connected" : undefined,
    },
    {
      kind: "link",
      label: "Passkeys",
      icon: "/icons/passkey_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      href: "/your-account/passkeys",
    },
    {
      kind: "link",
      label: "Link Google account",
      icon: "/icons/google_logo_tint.svg",
      href: "/your-account/google",
      subtitle: googleEmail ?? undefined,
      badge: accountsByProvider?.has("google") ? "Connected" : undefined,
    },
    {
      kind: "link",
      label: "Link Github account",
      icon: "/icons/github_logo_light.svg",
      href: "/your-account/github",
      subtitle: githubEmail ?? undefined,
      badge: accountsByProvider?.has("github") ? "Connected" : undefined,
    },
    {
      kind: "link",
      label: "Switch account",
      icon: "/icons/switch_account_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      href: "/your-account/switch-account",
    },
    {
      kind: "sign-out",
      label: "Sign out",
      icon: "/icons/logout_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    },
  ];

  return (
    <div>
      <header className="px-4 pt-4 lg:px-6">
        <h1 className="font-serif text-2xl font-semibold text-foreground md:text-3xl">
          Your account
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your name, handle, sign-in methods and linked providers.
        </p>
      </header>

      <section className="relative m-4 mt-8 flex flex-col gap-4 rounded-2xl bg-card p-4 pt-16 shadow-sm lg:mx-6">
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

      {linkedAccountsQuery.data?.success === false ? (
        <p className="px-4 pb-2 text-sm text-muted-foreground lg:px-6">
          Couldn&apos;t check which sign-in methods are linked. The rows below still work.
        </p>
      ) : null}

      <ul>
        {rows.map((row) => (
          <li key={row.label}>
            {row.kind === "link" ? (
              <Link
                href={row.href}
                className="flex w-full flex-row items-center gap-4 p-4 transition-colors hover:bg-muted lg:px-6"
              >
                <RowBody label={row.label} icon={row.icon} subtitle={row.subtitle} />
                {row.badge ? <RowBadge label={row.badge} /> : null}
              </Link>
            ) : (
              <button
                type="button"
                onClick={signOutAndGoHome}
                className="flex w-full cursor-pointer flex-row items-center gap-4 p-4 text-left transition-colors hover:bg-muted lg:px-6"
              >
                <RowBody label={row.label} icon={row.icon} />
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function RowBody({
  label,
  icon,
  subtitle,
}: {
  label: string;
  icon: string;
  subtitle?: string | undefined;
}) {
  return (
    <>
      <Image src={icon} alt="" width={24} height={24} className="size-6 shrink-0" />
      <span className="flex min-w-0 flex-1 flex-col text-left">
        <span className="text-sm font-medium text-secondary-foreground">{label}</span>
        {subtitle ? (
          <span className="truncate text-xs text-muted-foreground">{subtitle}</span>
        ) : null}
      </span>
    </>
  );
}

function RowBadge({ label }: { label: string }) {
  return (
    <span className="flex shrink-0 flex-row items-center gap-1 text-xs font-medium text-[#00696E]">
      <Image
        src="/icons/check_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
        alt=""
        width={16}
        height={16}
      />
      {label}
    </span>
  );
}

/**
 * End the session and leave.
 *
 * A full reload rather than a router push: it is the only way to be sure no in-memory copy of the
 * previous session survives in the query cache or a provider. Same three lines as
 * `menus/account-menu.tsx`.
 */
async function signOutAndGoHome() {
  await signOut();
  window.location.href = "/";
}

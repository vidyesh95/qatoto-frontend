"use client";

import Image from "next/image";
import { useState } from "react";

/** One signed-in account the user can switch to or sign out of. */
type SwitchableAccount = {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string;
  /** The account whose session is currently active — shown but not switchable. */
  isCurrent: boolean;
};

/**
 * Mock multi-session data for the UI phase. The backend phase will replace this
 * with the real signed-in account list — nothing here is a trust boundary.
 * Seeded with three accounts so the "stay in the panel after signing one out"
 * path is demoable.
 */
const MOCK_ACCOUNTS: SwitchableAccount[] = [
  {
    id: "account-current",
    name: "董雪博士",
    handle: "dongxue",
    avatarUrl: "/dummy/profile_photo_girl.avif",
    isCurrent: true,
  },
  {
    id: "account-second",
    name: "Aiko Tanaka",
    handle: "aiko",
    avatarUrl: "/dummy/profile_image_02.avif",
    isCurrent: false,
  },
  {
    id: "account-third",
    name: "Marco Rossi",
    handle: "marco",
    avatarUrl: "/dummy/profile_image_05.avif",
    isCurrent: false,
  },
];

type SwitchAccountPanelProps = {
  /** Invoked by the header back button. */
  onBack: () => void;
};

// Switching activates a different session — simulated here with a full reload to
// the home page, the same way the parent menu handles sign-out. Signing out of
// all accounts does the same.
const redirectHome = () => {
  window.location.href = "/";
};

const redirectToSignIn = () => {
  window.location.href = "/sign-in";
};

/**
 * Presentational "Switch account" panel: lists the signed-in accounts, lets the
 * user switch to another, sign out of one, sign out of all, or add a new
 * account. Swapped into the account menu like the Settings / Location panels.
 *
 * Switching or signing out of all accounts redirects home with a full reload
 * (matching the parent menu's sign-out). Signing out of a single account keeps
 * the user in the panel while two or more accounts remain, and only redirects
 * home once that drops the count to one or zero.
 */
export function SwitchAccountPanel({ onBack }: SwitchAccountPanelProps) {
  const [accounts, setAccounts] = useState<SwitchableAccount[]>(MOCK_ACCOUNTS);

  // Sign out one account. Keep the user in the switcher while two or more
  // accounts remain; once removal would leave only one (or zero), redirect home.
  const handleSignOutAccount = (accountId: string) => {
    const remainingCount = accounts.length - 1;
    if (remainingCount <= 1) {
      redirectHome();
      return;
    }
    setAccounts(accounts.filter((account) => account.id !== accountId));
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
        <h2 className="text-xl font-medium text-secondary-foreground">Switch account</h2>
      </header>

      <ul>
        {accounts.map((account) => (
          <li key={account.id} className="flex flex-row items-center">
            <button
              type="button"
              onClick={account.isCurrent ? undefined : redirectHome}
              disabled={account.isCurrent}
              className="flex min-w-0 flex-1 cursor-pointer flex-row items-center gap-4 p-4 transition-colors hover:bg-muted disabled:cursor-default disabled:hover:bg-transparent"
            >
              <Image
                src={account.avatarUrl}
                alt=""
                width={40}
                height={40}
                className="size-10 shrink-0 rounded-full object-cover ring-1 ring-primary"
              />
              <span className="flex min-w-0 flex-1 flex-col text-left">
                <span className="truncate text-sm font-medium text-secondary-foreground">
                  {account.name}
                </span>
                <span className="truncate text-xs text-muted-foreground">@{account.handle}</span>
              </span>
              {account.isCurrent ? (
                <span className="shrink-0 text-xs font-medium text-[#00696E]">Current</span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => handleSignOutAccount(account.id)}
              aria-label={`Sign out ${account.name}`}
              className="mr-2 shrink-0 cursor-pointer rounded-full p-2 transition-colors hover:bg-muted"
            >
              <Image
                src="/icons/logout_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt=""
                width={20}
                height={20}
                className="size-5"
              />
            </button>
          </li>
        ))}
      </ul>

      <hr className="mx-4" />

      <button
        type="button"
        onClick={redirectToSignIn}
        className="flex w-full cursor-pointer flex-row items-center gap-4 p-4 transition-colors hover:bg-muted"
      >
        <Image
          src="/icons/switch_account_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
          alt=""
          width={24}
          height={24}
          className="size-6 shrink-0"
        />
        <span className="text-sm font-medium text-secondary-foreground">Add account</span>
      </button>

      <button
        type="button"
        onClick={redirectHome}
        className="flex w-full cursor-pointer flex-row items-center gap-4 p-4 transition-colors hover:bg-muted"
      >
        <Image
          src="/icons/logout_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
          alt=""
          width={24}
          height={24}
          className="size-6 shrink-0"
        />
        <span className="text-sm font-medium text-secondary-foreground">
          Log out of all accounts
        </span>
      </button>
    </div>
  );
}

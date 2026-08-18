// TRANSPORT: client-query — the Better Auth session, plus `localStorage` through the browser
// preferences context. The only write it performs is the local erasure below.
"use client";

// WHAT REPLACED THE DEAD ROW.
//
// The settings list shipped a row labelled "Your data in app account" with no `onClick` — a fully
// clickable button that did nothing. That is bad on its own, and worse in context: the privacy
// policy tells people that access, correction and deletion happen by emailing the privacy mailbox,
// so somebody who read the policy, opened Settings and found a dead row named after their data got
// the impression the product had a control it does not have.
//
// EVERY ROW HERE IS EXACTLY ONE OF THREE THINGS, and nothing in between:
//   - real and local     — clears the preferences blob out of `localStorage`. Works today.
//   - real and existing  — opens a panel that already ships (the signed-in devices list).
//   - a REQUEST          — labelled "Request…", opens a prefilled mail draft, and says a person
//                          answers within a month.
// The third kind exists because the Express backend has no export and no deletion endpoint; see
// `lib/privacy-request.ts` for why a mailto is the honest control rather than a placeholder button.
//
// THE INVENTORY IS AUTHORED PROSE AND HAS TO BE MAINTAINED BY HAND. There is no endpoint that
// enumerates what is held, so this list is a promise made in code, and it mirrors what
// `disclaimers/privacy-policy.tsx` claims. If the two ever disagree, the policy is the document with
// legal weight and this panel is the one that is wrong.
//
// NOT A TRUST BOUNDARY. Clearing device data removes a display preference; it grants nothing and
// hides nothing from the backend, which never trusted those values in the first place.

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import type { AccountEditor } from "@/components/home/account/menus/your-account-menu";
import { useSession } from "@/lib/auth-client";
import {
  buildPrivacyRequestMailtoHref,
  PRIVACY_REQUEST_RESPONSE_WINDOW_LABEL,
} from "@/lib/privacy-request";
import { PRIVACY_CONTACT_EMAIL } from "@/lib/site";
import { useBrowserPreferences } from "@/state/browser-preferences-context";

/**
 * Whether the device-local blob has been cleared in this session.
 *
 * A UNION FOR TWO STATES because the third is coming: once there is a preferences endpoint this
 * gains `{ status: "clearing" }` and an error variant, and a `boolean` would have to be unpicked
 * rather than extended (CLAUDE.md Pattern 1).
 */
type ClearDeviceDataState = { readonly status: "idle" } | { readonly status: "cleared" };

type DataAndPrivacyPanelProps = {
  /** Header back button — returns to the settings action list. */
  onBack: () => void;
  /** Open one of the editors `menus/settings-menu.tsx` hosts. */
  onOpenEditor: (editor: AccountEditor) => void;
};

/** One group of the "what we hold" inventory. */
type HeldDataCategory = {
  readonly title: string;
  readonly icon: string;
  readonly items: readonly string[];
  /** Shown when the category behaves differently from the rest on deletion. */
  readonly note?: string;
};

const HELD_DATA_CATEGORIES: readonly HeldDataCategory[] = [
  {
    title: "Who you are",
    icon: "/icons/account_circle_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    items: [
      "Your name, email address, and profile photo",
      "Your handle and the location shown on your profile",
      "When you joined",
    ],
  },
  {
    title: "How you sign in",
    icon: "/icons/lock_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    items: [
      "Your password, stored only as a hash we cannot reverse",
      "Your passkeys and any linked Google or GitHub account",
      "Each signed-in device, with the IP address and browser it signed in from",
    ],
  },
  {
    title: "What you do here",
    icon: "/icons/history_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    items: [
      "Videos you watch, like, and save, and playlists you build",
      "Comments and forum replies you post",
      "Products you view, your cart, and your orders",
    ],
  },
  {
    // ADDED WITH THE WATCH-TIME PANEL, and it had to be. Three rollup tables started recording how
    // long and WHEN each signed-in account watches, and this list claims to mirror what is held —
    // shipping the surface without the disclosure would have made an existing promise false. The
    // windows are the retention constants the backend prunes on, not round numbers chosen here.
    title: "How much you watch, and when",
    icon: "/icons/analytics_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    items: [
      "Which hour of which day you watched something, kept for 90 days",
      "How many seconds you watched each day, kept for about 25 months",
      "An hour-by-hour total for the whole platform, which carries no account id at all",
    ],
    note: "Only recorded while you are signed in. Watching signed out is not counted, here or in Time watched.",
  },
  {
    title: "Work you have done",
    icon: "/icons/shield_person_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    items: [
      "Projects you founded, joined, or applied to",
      "Effort you logged and claims you submitted",
      "Equity, pay records, and payments",
    ],
    note: "This is the category that outlives a deleted account, without your name attached.",
  },
  {
    title: "Settings on this device",
    icon: "/icons/storage_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    items: [
      "Your language, browse country, and AI assist preference",
      "Stored in this browser only, and never sent to us",
    ],
  },
];

export function DataAndPrivacyPanel({ onBack, onOpenEditor }: DataAndPrivacyPanelProps) {
  const { data: session } = useSession();
  const { clearPreferences } = useBrowserPreferences();

  const [clearDeviceDataState, setClearDeviceDataState] = useState<ClearDeviceDataState>({
    status: "idle",
  });

  const accountHandle = session?.user.handle ?? "";
  const accountId = session?.user.id ?? "";
  // Both requests identify the account by id. Without one, the mail draft would ask an operator to
  // guess which row a message refers to, which is how the wrong account gets erased.
  const isSessionReady = accountHandle.length > 0 && accountId.length > 0;

  const dataExportMailtoHref = buildPrivacyRequestMailtoHref({
    kind: "data-export",
    accountId,
    accountHandle,
  });

  function handleClearDeviceDataClick() {
    clearPreferences();
    setClearDeviceDataState({ status: "cleared" });
  }

  function renderClearDeviceDataAction() {
    switch (clearDeviceDataState.status) {
      case "idle":
        return (
          <button
            type="button"
            onClick={handleClearDeviceDataClick}
            className="cursor-pointer self-start rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-muted"
          >
            Clear data on this device
          </button>
        );
      case "cleared":
        return (
          <span className="flex flex-row items-center gap-1 text-sm font-medium text-[#00696E]">
            <Image
              src="/icons/check_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              alt=""
              width={16}
              height={16}
            />
            Cleared. Your language and browse country are back to their defaults.
          </span>
        );
      default: {
        const exhaustiveCheck: never = clearDeviceDataState;
        return exhaustiveCheck;
      }
    }
  }

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
        <h2 className="text-xl font-medium text-secondary-foreground">Your data &amp; privacy</h2>
      </header>

      <div className="flex flex-col gap-8 p-4">
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-secondary-foreground">What we hold about you</h3>
          <ul className="flex flex-col gap-3">
            {HELD_DATA_CATEGORIES.map((heldDataCategory) => (
              <li
                key={heldDataCategory.title}
                className="flex flex-row gap-3 rounded-xl border border-black/10 bg-card p-3"
              >
                <Image
                  src={heldDataCategory.icon}
                  alt=""
                  width={24}
                  height={24}
                  className="size-6 shrink-0"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-sm font-medium text-secondary-foreground">
                    {heldDataCategory.title}
                  </span>
                  <ul className="flex flex-col">
                    {heldDataCategory.items.map((heldDataItem) => (
                      <li key={heldDataItem} className="text-xs text-muted-foreground">
                        {heldDataItem}
                      </li>
                    ))}
                  </ul>
                  {heldDataCategory.note ? (
                    <span className="text-xs font-medium text-secondary-foreground">
                      {heldDataCategory.note}
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-secondary-foreground">Data on this device</h3>
          <p className="text-sm text-muted-foreground">
            Your language, browse country, and AI assist preference live in this browser and are
            never sent to us. Clearing them affects this browser only — your account is untouched,
            and other devices keep their own settings.
          </p>
          {renderClearDeviceDataAction()}
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-secondary-foreground">
            Devices you are signed in on
          </h3>
          <p className="text-sm text-muted-foreground">
            See every account signed in on this browser, and sign out of the ones you do not
            recognize.
          </p>
          <button
            type="button"
            onClick={() => onOpenEditor("switch-account")}
            className="flex cursor-pointer flex-row items-center gap-2 self-start rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-muted"
          >
            <Image
              src="/icons/switch_account_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              alt=""
              width={16}
              height={16}
            />
            Manage signed-in accounts
          </button>
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-secondary-foreground">Get a copy of your data</h3>
          <p className="text-sm text-muted-foreground">
            You can ask for everything we hold about you, in a format you can read and take
            elsewhere. There is no download button yet, so the request goes to{" "}
            {PRIVACY_CONTACT_EMAIL} and we answer within {PRIVACY_REQUEST_RESPONSE_WINDOW_LABEL}.
          </p>
          {/* Disabled state is a real button rather than a dulled anchor — an anchor with
              `aria-disabled` is still followed by the keyboard, and this one opens a mail draft. */}
          {isSessionReady ? (
            <a
              href={dataExportMailtoHref}
              className="flex cursor-pointer flex-row items-center gap-2 self-start rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-muted"
            >
              <Image
                src="/icons/download_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt=""
                width={16}
                height={16}
              />
              Request a copy of your data
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="flex cursor-not-allowed flex-row items-center gap-2 self-start rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-secondary-foreground opacity-50"
            >
              <Image
                src="/icons/download_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt=""
                width={16}
                height={16}
              />
              Checking your account…
            </button>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-secondary-foreground">Delete your account</h3>
          <p className="text-sm text-muted-foreground">
            Deactivate your account and have your personal details erased. Some records are kept for
            legal reasons — the next screen lists exactly which, and why.
          </p>
          <button
            type="button"
            onClick={() => onOpenEditor("delete-account")}
            className="flex cursor-pointer flex-row items-center gap-2 self-start rounded-full border border-red-600 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-600/5"
          >
            <Image
              src="/icons/delete_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              alt=""
              width={16}
              height={16}
            />
            Delete your account
          </button>
        </section>

        <p className="text-xs text-muted-foreground">
          Read the full{" "}
          <Link href="/privacy-policy" className="underline">
            privacy policy
          </Link>{" "}
          for how we use what we hold. For anything this panel does not cover, email{" "}
          {PRIVACY_CONTACT_EMAIL}.
        </p>
      </div>
    </div>
  );
}

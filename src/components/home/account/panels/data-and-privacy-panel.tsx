// TRANSPORT: client-query — the Better Auth session, `localStorage` through the browser
// preferences context, and `POST/GET /users/me/export`. Two writes: the local erasure, and
// the export request, which produces no file synchronously.
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
//   - real and remote    — calls an endpoint and reports exactly what the server said, including
//                          that a 202 is a receipt and not a file.
// The third kind used to be a `mailto:`, because the Express backend had no export and no deletion
// endpoint. It has both now. `lib/privacy-request.ts` survives only as the residual-rights link in
// the footer and as the fallback when one of those endpoints fails.
//
// THE INVENTORY IS AUTHORED PROSE, BUT IT IS NO LONGER UNFALSIFIABLE. The export below is a machine
// answer to the same question, so a category named here that the download omits is a claim the
// download disproves — which is what `absentFromExport` exists to head off. It still mirrors
// `disclaimers/privacy-policy.tsx`; if those two disagree, the policy is the document with legal
// weight and this panel is the one that is wrong.
//
// NOT A TRUST BOUNDARY. Clearing device data removes a display preference; it grants nothing and
// hides nothing from the backend, which never trusted those values in the first place.

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import type { AccountEditor } from "@/components/home/account/menus/your-account-menu";
import { useDataExportQuery, useRequestDataExportMutation } from "@/hooks/account/data-export";
import { useSession } from "@/lib/auth-client";
import { ApiRequestError, type ApiError } from "@/lib/http";
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

/**
 * What the download control is currently able to offer.
 *
 * DERIVED FROM THE SERVER, NOT HELD IN STATE. There is no `useState` behind this: the
 * query owns the truth and this union is a reading of it, so a panel reopened after the
 * dropdown unmounted shows what is actually happening rather than what this component last
 * remembered.
 *
 * `link-expired` is separate from `ready` because the fix is different and non-obvious: the
 * ARCHIVE lives seven days while its LINK lives five minutes, so an expired link needs the
 * status refetched (which mints a new one for the same file), never a new export requested.
 */
type DataExportView =
  | { readonly status: "idle" }
  | { readonly status: "requesting" }
  | { readonly status: "building" }
  | { readonly status: "ready"; readonly downloadUrl: string }
  | { readonly status: "link-expired" }
  | { readonly status: "failed"; readonly error: ApiError };

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
  /**
   * Why the download will NOT contain this, when it will not.
   *
   * THE LIST ABOVE IS NOW CHECKABLE. Somebody can read a category here, open the export,
   * and find nothing matching it — and with no explanation the honest reading is that data
   * is being withheld. Every category the archive cannot carry says so here instead.
   */
  readonly absentFromExport?: string;
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
    absentFromExport:
      "The platform-wide hourly total is not in the download — it carries no account id, so there is no way to say which part of it is yours.",
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
    absentFromExport:
      "Not in the download: these never leave this browser, so we have no copy to include. Clear them above.",
  },
];

export function DataAndPrivacyPanel({ onBack, onOpenEditor }: DataAndPrivacyPanelProps) {
  const { data: session } = useSession();
  const { clearPreferences } = useBrowserPreferences();

  const [clearDeviceDataState, setClearDeviceDataState] = useState<ClearDeviceDataState>({
    status: "idle",
  });

  const dataExportQuery = useDataExportQuery();
  const dataExportMutation = useRequestDataExportMutation();

  const accountHandle = session?.user.handle ?? "";
  const accountId = session?.user.id ?? "";
  // Both requests identify the account by id. Without one, the mail draft would ask an operator to
  // guess which row a message refers to, which is how the wrong account gets erased.
  const isSessionReady = accountHandle.length > 0 && accountId.length > 0;

  /**
   * The export control's state, read off the server rather than tracked alongside it.
   *
   * THE MUTATION IS ONLY CONSULTED WHILE IT IS IN FLIGHT. Once it settles, the query is the
   * authority — guarding re-submission on `mutation.isPending` would go stale the moment
   * the server disagreed, and here that means queueing a second full-table walk.
   */
  function readDataExportView(): DataExportView {
    if (dataExportMutation.isPending) return { status: "requesting" };

    if (dataExportMutation.isError) {
      return {
        status: "failed",
        error:
          dataExportMutation.error instanceof ApiRequestError
            ? dataExportMutation.error.apiError
            : { code: "NETWORK", message: "We could not reach the server. Please try again." },
      };
    }

    const result = dataExportQuery.data;
    if (result === undefined || !result.success || result.data === null) return { status: "idle" };

    switch (result.data.state) {
      case "pending":
      case "running":
        return { status: "building" };
      case "ready":
        // `downloadUrl` is null when the server declined to mint one — an archive past its
        // retention, or storage refusing. Both read as "the link is gone", which is true.
        return result.data.downloadUrl === null
          ? { status: "link-expired" }
          : { status: "ready", downloadUrl: result.data.downloadUrl };
      case "expired":
        return { status: "link-expired" };
      case "failed":
        return {
          status: "failed",
          error: { code: "EXPORT_FAILED", message: "We could not build your file." },
        };
      default: {
        const exhaustiveCheck: never = result.data.state;
        return exhaustiveCheck;
      }
    }
  }

  function renderDataExportAction() {
    if (!isSessionReady) {
      return (
        <button
          type="button"
          disabled
          className="flex cursor-not-allowed flex-row items-center gap-2 self-start rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-secondary-foreground opacity-50"
        >
          <DownloadIcon />
          Checking your account…
        </button>
      );
    }

    const view = readDataExportView();

    switch (view.status) {
      case "idle":
        return (
          <button
            type="button"
            onClick={() => dataExportMutation.mutate()}
            className="flex cursor-pointer flex-row items-center gap-2 self-start rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-muted"
          >
            <DownloadIcon />
            Download your data
          </button>
        );

      case "requesting":
      case "building":
        // NAMES NO FILE, NO SIZE AND NO TIME. A 202 is a receipt; claiming to know how big
        // the archive is or when it lands would be inventing a verdict the server has not
        // reached.
        return (
          <output className="block self-start rounded-2xl border border-[#00696E]/30 bg-[#00696E]/5 p-3 text-sm text-[#00696E]">
            We are building your file. This can take a few minutes — you can close this panel and
            come back.
          </output>
        );

      case "ready":
        return (
          <a
            href={view.downloadUrl}
            download
            rel="noopener"
            className="flex cursor-pointer flex-row items-center gap-2 self-start rounded-full border border-[#00696E] px-4 py-2 text-sm font-medium text-[#00696E] transition-colors hover:bg-[#00696E]/5"
          >
            <DownloadIcon />
            Download your data
          </a>
        );

      case "link-expired":
        // REFETCHES THE STATUS, NEVER RE-POSTS. The archive is still there; only the
        // five-minute link died, and re-reading the status mints a fresh one for the same
        // file. A new POST would queue a second build of something that already exists.
        return (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              That download link expired. Links last five minutes; your file is kept for seven days.
            </p>
            <button
              type="button"
              onClick={() => void dataExportQuery.refetch()}
              className="flex cursor-pointer flex-row items-center gap-2 self-start rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-muted"
            >
              <DownloadIcon />
              Get a fresh link
            </button>
          </div>
        );

      case "failed":
        return (
          <div className="flex flex-col gap-2">
            <div
              role="alert"
              className="flex flex-col gap-1 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
            >
              <span>{view.error.message}</span>
              <span className="text-xs opacity-70">Code {view.error.code}</span>
            </div>
            {/* THE STATUTORY RIGHT DOES NOT DEPEND ON OUR JOB QUEUE. If the endpoint cannot
                serve it, the mailbox still must — and the note tells whoever reads it that
                something of ours is broken. */}
            <a
              href={buildPrivacyRequestMailtoHref({
                kind: "data-export",
                accountId,
                accountHandle,
                note: `The in-app download failed with code ${view.error.code}.`,
              })}
              className="self-start text-sm font-medium text-[#00696E] underline"
            >
              Ask {PRIVACY_CONTACT_EMAIL} for it instead — we answer within{" "}
              {PRIVACY_REQUEST_RESPONSE_WINDOW_LABEL}
            </a>
          </div>
        );

      default: {
        const exhaustiveCheck: never = view;
        return exhaustiveCheck;
      }
    }
  }

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
                  {heldDataCategory.absentFromExport ? (
                    <span className="text-xs text-muted-foreground italic">
                      {heldDataCategory.absentFromExport}
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
            Download everything we hold about you, in a format you can read and take elsewhere. We
            build the file in the background — it can take a few minutes, and you can close this
            panel while it runs.
          </p>
          {renderDataExportAction()}
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-secondary-foreground">Delete your account</h3>
          <p className="text-sm text-muted-foreground">
            Sign out everywhere and have your personal details erased after 30 days. Some records
            are kept for legal reasons — the next screen lists exactly which, and why.
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

/** The download glyph, shared by the five states of the export control. */
function DownloadIcon() {
  return (
    <Image
      src="/icons/download_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
      alt=""
      width={16}
      height={16}
    />
  );
}

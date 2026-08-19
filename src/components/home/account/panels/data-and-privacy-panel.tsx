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
// endpoint. It has both now. `lib/privacy-request.ts` survives as the "Your other rights" draft at
// the bottom of this panel — correction, restriction and objection have no endpoint — and as the
// fallback when one of the two that do have endpoints fails.
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
  /** The query has not answered yet. NOT `idle` — an armed button here can double-POST. */
  | { readonly status: "checking" }
  /** The query answered, and the answer was a failure. NOT `idle`, and NOT silent. */
  | { readonly status: "unreadable"; readonly error: ApiError }
  | { readonly status: "idle" }
  | { readonly status: "requesting" }
  | { readonly status: "building" }
  | { readonly status: "ready"; readonly downloadUrl: string }
  /** The five-minute URL died. The archive is still there; refetching mints a new link. */
  | { readonly status: "link-expired" }
  /** The seven-day archive died. Only a NEW export fixes this; refetching cannot. */
  | { readonly status: "archive-expired" }
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

  const accountHandle = session?.user.handle ?? "";
  const accountId = session?.user.id ?? "";
  // Both requests identify the account by id. Without one, the mail draft would ask an operator to
  // guess which row a message refers to, which is how the wrong account gets erased.
  const isSessionReady = accountHandle.length > 0 && accountId.length > 0;

  // Declared AFTER `isSessionReady`, because the query is gated on it — the render already
  // waited for the session and the request had no business not doing the same.
  const dataExportQuery = useDataExportQuery({ enabled: isSessionReady });
  const dataExportMutation = useRequestDataExportMutation();

  /**
   * The export control's state, read off the server rather than tracked alongside it.
   *
   * ## THREE THINGS THAT ARE NOT `idle`, AND USED TO BE
   *
   * An earlier version collapsed "the query has not answered yet", "the query FAILED" and
   * "there is genuinely no export" into one `idle` branch, which armed the button in all
   * three. Each was its own bug:
   *
   *   1. On first paint the query is still resolving, so somebody with an export already
   *      building saw "Download your data" and could press it — a second POST the server
   *      answers 409.
   *   2. `getJson` NEVER THROWS; it returns `{ success: false }`. So `query.isError` is
   *      permanently false, a failed GET looked identical to "no export", and a blip
   *      mid-build silently dropped the UI from "building" back to an armed button.
   *   3. After a successful POST the mutation settles before the un-awaited
   *      `invalidateQueries` resolves, so for one round trip the query still held the
   *      pre-POST value and the button re-armed.
   *
   * ## AND THE MUTATION IS CONSULTED ONLY WHILE IT IS IN FLIGHT — NOW ACTUALLY TRUE
   *
   * `isError` is sticky forever on a settled mutation, so reading it here meant a single
   * 409 painted a red box for the panel's whole lifetime, even once the poll came back
   * `ready` with a live link. The mutation's failure is cleared by `reset()` the moment the
   * query has a real answer, so the server always wins in the end.
   */
  function readDataExportView(): DataExportView {
    if (dataExportMutation.isPending) return { status: "requesting" };

    const result = dataExportQuery.data;

    // NOT `idle`: nothing is known yet, so the button must not be armed.
    if (result === undefined) return { status: "checking" };

    // NOT `idle` EITHER: the read failed, and saying "no export" would be a claim we cannot
    // support. `getJson` folds failures into the value, which is why this is not `isError`.
    if (!result.success) return { status: "unreadable", error: result.error };

    if (result.data === null) {
      // A genuine absence — and the one place a stale mutation error still deserves the
      // screen, because there is no server state to contradict it.
      if (dataExportMutation.isError) {
        return {
          status: "failed",
          error:
            dataExportMutation.error instanceof ApiRequestError
              ? dataExportMutation.error.apiError
              : { code: "NETWORK", message: "We could not reach the server. Please try again." },
        };
      }
      return { status: "idle" };
    }

    switch (result.data.state) {
      case "pending":
      case "running":
        return { status: "building" };
      case "ready":
        // `downloadUrl` null means the server declined to mint one — storage refusing, or
        // an archive already past its retention. Either way the LINK is what is missing.
        return result.data.downloadUrl === null
          ? { status: "link-expired" }
          : { status: "ready", downloadUrl: result.data.downloadUrl };
      case "expired":
        /**
         * THE ARCHIVE IS GONE, NOT JUST THE LINK — and collapsing this into `link-expired`
         * made it a dead end. That view's only control refetches the status, which for a
         * genuinely expired export returns `expired` again, forever. The fix is a new
         * export, so this state gets its own branch and its own control.
         */
        return { status: "archive-expired" };
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

  /**
   * Asks for an export, clearing any stale failure first.
   *
   * `reset()` IS WHAT STOPS A DEAD ERROR OUTLIVING ITS CAUSE. Without it a mutation that
   * once failed keeps `isError` true for as long as the component lives.
   */
  function handleRequestExport() {
    dataExportMutation.reset();
    dataExportMutation.mutate();
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
      case "checking":
        // The query has not answered. NOT an armed button: pressing one here is how a
        // second full-table walk gets queued behind an export that is already building.
        return (
          <button
            type="button"
            disabled
            className="flex cursor-not-allowed flex-row items-center gap-2 self-start rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-secondary-foreground opacity-50"
          >
            <DownloadIcon />
            Checking…
          </button>
        );

      case "unreadable":
        // THE READ FAILED, AND SAYING NOTHING WOULD BE WORSE. Silently showing "Download
        // your data" here is what made a blip mid-build look like no export existed.
        return (
          <div className="flex flex-col gap-2">
            <div
              role="alert"
              className="flex flex-col gap-1 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
            >
              <span>We could not check on your download. {view.error.message}</span>
              <span className="text-xs opacity-70">Code {view.error.code}</span>
            </div>
            <button
              type="button"
              onClick={() => void dataExportQuery.refetch()}
              className="flex cursor-pointer flex-row items-center gap-2 self-start rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-muted"
            >
              Try again
            </button>
          </div>
        );

      case "archive-expired":
        /**
         * A NEW EXPORT, NOT A REFETCH. The seven-day archive is gone, so re-reading the
         * status would return `expired` forever — which is what the old shared branch did.
         */
        return (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              Your last download has expired — we keep each file for seven days. You can ask for a
              fresh one.
            </p>
            <button
              type="button"
              onClick={handleRequestExport}
              className="flex cursor-pointer flex-row items-center gap-2 self-start rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-muted"
            >
              <DownloadIcon />
              Download your data
            </button>
          </div>
        );

      case "idle":
        return (
          <button
            type="button"
            onClick={handleRequestExport}
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
          <div className="flex flex-col gap-2">
            <a
              href={view.downloadUrl}
              download
              rel="noopener"
              className="flex cursor-pointer flex-row items-center gap-2 self-start rounded-full border border-[#00696E] px-4 py-2 text-sm font-medium text-[#00696E] transition-colors hover:bg-[#00696E]/5"
            >
              <DownloadIcon />
              Download your data
            </a>
            {/* WITHOUT THIS THERE WAS NO WAY BACK TO A FRESH EXPORT. Once any archive was
                `ready` the view never returned to `idle`, so somebody who changed their data
                and wanted an up-to-date copy had no control at all. */}
            <button
              type="button"
              onClick={handleRequestExport}
              className="cursor-pointer self-start text-sm font-medium text-secondary-foreground underline"
            >
              Build a fresh copy
            </button>
          </div>
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
            {/* A FAILED BUILD USED TO BE TERMINAL IN THE UI. The backend now frees the
                request once its retries are exhausted, so asking again is a real option
                rather than a button that would 409. */}
            <button
              type="button"
              onClick={handleRequestExport}
              className="cursor-pointer self-start text-sm font-medium text-secondary-foreground underline"
            >
              Try building it again
            </button>
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
          for how we use what we hold.
        </p>

        {/* THE RESIDUAL RIGHTS, WITH SOMETHING TO CLICK.
            Correction, restriction and objection have no endpoint and no plan for one, so
            the mailbox is genuinely the route. This used to be the address as plain text —
            which asked somebody exercising a statutory right to select and copy it — while
            `privacy-request.ts` had a header claiming it served exactly this case and a
            union that could not express it. */}
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-secondary-foreground">Your other rights</h3>
          <p className="text-sm text-muted-foreground">
            You can also ask us to correct something that is wrong, to pause what we do with your
            information while a question about it is resolved, or to object to a particular use.
            These are handled by a person, and we answer within{" "}
            {PRIVACY_REQUEST_RESPONSE_WINDOW_LABEL}.
          </p>
          {isSessionReady ? (
            <a
              href={buildPrivacyRequestMailtoHref({
                kind: "other-right",
                accountId,
                accountHandle,
              })}
              className="self-start text-sm font-medium text-[#00696E] underline"
            >
              Email {PRIVACY_CONTACT_EMAIL}
            </a>
          ) : (
            <span className="text-sm text-muted-foreground">{PRIVACY_CONTACT_EMAIL}</span>
          )}
        </section>
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

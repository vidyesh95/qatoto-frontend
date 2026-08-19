// TRANSPORT: client-query — the Better Auth session for the handle it makes you type, plus
// the write that is the whole point of the panel: `POST /users/me/deletion-request`.
"use client";

// WHAT "DELETE MY ACCOUNT" MEANS HERE, AND WHY IT IS STILL AN ANONYMIZATION.
//
// The backend decided the shape of this before any UI existed. Cascade rule R2 in
// `qatoto-backend/src/db/schema/rnd.ts` puts `restrict` foreign keys on 73 of the 151
// columns pointing at `user`, and 54 tables are protected by `BEFORE UPDATE OR DELETE`
// triggers (ledgers, equity, pay records, hash-chained audit trails). `DELETE FROM "user"`
// physically cannot succeed for anybody who has founded, joined or applied to a project,
// transacted, moderated or voted — and that is the point: it is what stops one person's
// deletion erasing another person's financial record. GDPR Art. 17(3)(b) and (e) are the
// exemptions that make keeping those rows lawful.
//
// THE BUTTON DEACTIVATES, IMMEDIATELY, AND SAYS SO.
//
// `POST /users/me/deletion-request` stamps `user.deactivated_at`, deletes every `session`
// row in the same transaction, and schedules the anonymization 30 days out. By the time
// this panel renders the response, the session that sent it no longer exists — which is
// why the success branch has no controls and exists for exactly one paint before a hard
// navigate to `/sign-in`.
//
// THIS IS THE ACTION, NOT A REQUEST FOR ONE. The previous version opened a `mailto:` and
// its terminal state said "your request is not sent yet", because there was no endpoint.
// There is now, so every sentence that described a person reading an inbox has gone.
//
// SIGNING IN IS THE CANCEL, AND THERE IS NO BUTTON FOR IT. The backend's
// `databaseHooks.session.create.before` clears `deactivated_at` and marks the request
// cancelled on any successful sign-in inside the window. That is why this file has no
// "scheduled" or "cancelling" state: a signed-in session implies an active account, so
// there is no session in which a cancel control could be rendered.
//
// WHY TYPE-TO-CONFIRM SURVIVES. It is friction for the human, never a check — the server
// neither receives nor trusts what you type here. It exists so somebody reads the "what is
// kept" list before pressing a button whose grant is irreversible.

import Image from "next/image";
import { useState } from "react";

import { useRequestAccountDeletionMutation } from "@/hooks/account/account-deletion";
import { useSession, signOut } from "@/lib/auth-client";
import { ApiRequestError, type ApiError } from "@/lib/http";
import {
  ACCOUNT_DELETION_GRACE_PERIOD_DAYS,
  buildPrivacyRequestMailtoHref,
} from "@/lib/privacy-request";
import { PRIVACY_CONTACT_EMAIL } from "@/lib/site";
import { useBrowserPreferences } from "@/state/browser-preferences-context";

/**
 * Where in the DELETION the visitor is — an action now, not a request.
 *
 * FIVE MEMBERS, AND `deactivated` IS TERMINAL IN THE STRONGEST SENSE: it is the tab that
 * just pressed the button, rendering with a session the server has already destroyed. It
 * exists for one paint before a hard navigate, which is why it carries no controls.
 *
 * There is deliberately no `checking`, no `scheduled` and no `cancelling`. A signed-in
 * account can never have a pending deletion — signing in cancels one — so those states
 * would be UI for something unreachable.
 *
 * `submit-failed` keeps `typedHandle` so a failure does not silently discard the
 * confirmation the person already typed.
 */
type DeleteAccountView =
  | { readonly status: "explaining" }
  | { readonly status: "confirming"; readonly typedHandle: string }
  | { readonly status: "submitting"; readonly typedHandle: string }
  | { readonly status: "submit-failed"; readonly typedHandle: string; readonly error: ApiError }
  | { readonly status: "deactivated"; readonly anonymizationScheduledAt: string };

type DeleteAccountPanelProps = {
  /** Return to the data & privacy panel. */
  onBack: () => void;
};

/** Erased at anonymization. Phrased as the things a person recognizes as "me". */
const ERASED_DATA_LABELS: readonly string[] = [
  "Your name, email address, and profile photo",
  "Your handle, and the location you set on your profile",
  "Your passkeys, password, and linked Google or GitHub accounts",
  "Your watch history, likes, saves, and playlists",
  "Your comments and forum replies",
];

/**
 * Kept, pseudonymously. EACH ONE NAMES SOMEBODY ELSE'S INTEREST, deliberately — "we keep it
 * because the law says so" invites an argument, "deleting it would delete your co-founder's
 * equity record" ends one.
 */
const RETAINED_DATA_ENTRIES: readonly { readonly label: string; readonly reason: string }[] = [
  {
    label: "Equity and contribution ledger entries",
    reason:
      "They are shared records — removing yours would change everyone else's slice of the pie.",
  },
  {
    label: "Payment and compensation records",
    reason: "Tax and accounting law requires them to be kept for a fixed number of years.",
  },
  {
    label: "Orders, invoices, and disputes",
    reason: "The other party to a transaction keeps their copy, and a dispute may still be open.",
  },
  {
    label: "Project audit trail entries",
    reason:
      "They are cryptographically chained — editing one would invalidate every entry after it.",
  },
];

/** Renders the server's own date. Never `now + 30 days`, which is the client guessing. */
function formatScheduledDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function DeleteAccountPanel({ onBack }: DeleteAccountPanelProps) {
  const { data: session } = useSession();
  const { clearPreferences } = useBrowserPreferences();
  const deletionMutation = useRequestAccountDeletionMutation();
  const [view, setView] = useState<DeleteAccountView>({ status: "explaining" });

  const accountHandle = session?.user.handle ?? "";
  const accountId = session?.user.id ?? "";

  // Nothing can be confirmed against a handle the session has not produced yet.
  const isSessionReady = accountHandle.length > 0 && accountId.length > 0;

  const typedHandle =
    view.status === "confirming" || view.status === "submitting" || view.status === "submit-failed"
      ? view.typedHandle
      : "";

  /** Exact match, trimmed only for the stray whitespace a paste brings. */
  const isTypedHandleMatching = typedHandle.trim() === accountHandle && isSessionReady;

  function handleDeleteConfirmed() {
    setView({ status: "submitting", typedHandle });

    deletionMutation.mutate(undefined, {
      onSuccess: async (request) => {
        // ONE PAINT, THEN GONE. The session backing this tab was destroyed inside the
        // request's own transaction, so every query in the app is about to start 401ing.
        setView({
          status: "deactivated",
          anonymizationScheduledAt: request.scheduledAnonymizationAt,
        });

        // Makes the "preferences in this browser are cleared" line in the list below TRUE.
        // The backend cannot reach `localStorage`; this is the only thing that can.
        clearPreferences();

        // A 401 against an already-revoked session is confirmation, not an error.
        await signOut().catch(() => undefined);

        // A HARD NAVIGATE, matching `account-menu.tsx`'s sign-out. It is also what
        // actually discards the React Query caches — there are three, one per route group,
        // and no single client to clear.
        window.location.href = "/sign-in?reason=account-deleted";
      },
      onError: (error) => {
        setView({
          status: "submit-failed",
          typedHandle,
          error:
            error instanceof ApiRequestError
              ? error.apiError
              : { code: "NETWORK", message: "We could not reach the server. Nothing changed." },
        });
      },
    });
  }

  function renderBody() {
    switch (view.status) {
      case "explaining":
      case "confirming":
      case "submitting":
      case "submit-failed":
        return (
          <div className="flex flex-col gap-6 p-4">
            <p className="text-sm text-muted-foreground">
              This signs you out on every device straight away and starts a{" "}
              {ACCOUNT_DELETION_GRACE_PERIOD_DAYS}-day countdown. Read what happens before you
              continue.
            </p>

            <section className="flex flex-col gap-3">
              <h3 className="text-sm font-medium text-secondary-foreground">
                What happens, and when
              </h3>
              <ol className="flex flex-col gap-3">
                <DeletionStage
                  stageNumber={1}
                  title="Your account is deactivated"
                  detail="You are signed out on every device the moment you confirm, including in this tab. Your profile page stops being reachable. Comments and posts you have already made keep your name until the final erasure."
                />
                <DeletionStage
                  stageNumber={2}
                  title={`You have ${ACCOUNT_DELETION_GRACE_PERIOD_DAYS} days to change your mind`}
                  detail="Just sign in again at any point in that window. Your account comes back exactly as it was — there is nothing else to do, and no link to find."
                />
                <DeletionStage
                  stageNumber={3}
                  title="Your identity is erased"
                  detail="After the window closes, everything below is removed and cannot be restored. There is no undo after this point."
                />
              </ol>
            </section>

            <section className="flex flex-col gap-3">
              <h3 className="text-sm font-medium text-secondary-foreground">What gets erased</h3>
              <ul className="flex flex-col gap-2">
                {ERASED_DATA_LABELS.map((erasedDataLabel) => (
                  <li key={erasedDataLabel} className="text-sm text-muted-foreground">
                    {erasedDataLabel}
                  </li>
                ))}
                {/* Separated because it is the one line this BROWSER makes true, not the
                    server — `clearPreferences()` runs the instant you confirm. */}
                <li className="text-sm text-muted-foreground">
                  Language, browse country, and other preferences in this browser — cleared as soon
                  as you confirm. Other browsers keep their own until you clear them there.
                </li>
              </ul>
            </section>

            <section className="flex flex-col gap-3">
              <h3 className="text-sm font-medium text-secondary-foreground">
                What we have to keep, and why
              </h3>
              <p className="text-sm text-muted-foreground">
                These records stay, with your name and contact details removed. They are linked to
                an internal reference that no longer points at a person.
              </p>
              <ul className="flex flex-col gap-3">
                {RETAINED_DATA_ENTRIES.map((retainedDataEntry) => (
                  <li
                    key={retainedDataEntry.label}
                    className="flex flex-col rounded-xl border border-black/10 bg-card p-3"
                  >
                    <span className="text-sm font-medium text-secondary-foreground">
                      {retainedDataEntry.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {retainedDataEntry.reason}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                Keeping these is allowed under the right to erasure, which does not apply to data we
                must hold for a legal obligation or to defend a legal claim (GDPR Article 17(3)).
              </p>
            </section>

            {view.status === "submit-failed" ? (
              <section className="flex flex-col gap-3">
                {/* THE ACCOUNT IS UNTOUCHED and the copy leads with that, because the one
                    thing somebody needs after a failed irreversible action is to know it
                    did not half-happen. */}
                <div
                  role="alert"
                  className="flex flex-col gap-1 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                >
                  <span>{view.error.message}</span>
                  <span className="text-xs opacity-70">Code {view.error.code}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Nothing has changed — your account is still active and you are still signed in.
                </p>
                <a
                  href={buildPrivacyRequestMailtoHref({
                    kind: "account-deletion",
                    accountId,
                    accountHandle,
                    note: `The in-app deletion failed with code ${view.error.code}.`,
                  })}
                  className="self-start text-sm font-medium text-[#00696E] underline"
                >
                  Email {PRIVACY_CONTACT_EMAIL} instead
                </a>
                <button
                  type="button"
                  onClick={() => setView({ status: "confirming", typedHandle })}
                  className="cursor-pointer self-start text-sm font-medium text-secondary-foreground"
                >
                  Back to the confirmation
                </button>
              </section>
            ) : view.status === "explaining" ? (
              <button
                type="button"
                onClick={() => setView({ status: "confirming", typedHandle: "" })}
                disabled={!isSessionReady}
                className="cursor-pointer rounded-full border border-red-600 px-4 py-3 text-sm font-medium text-red-600 transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSessionReady ? "Continue" : "Checking your account…"}
              </button>
            ) : (
              <section className="flex flex-col gap-3">
                <label
                  htmlFor="delete-account-handle-confirmation"
                  className="text-sm text-secondary-foreground"
                >
                  Type <span className="font-medium">@{accountHandle}</span> to confirm.
                </label>
                <input
                  id="delete-account-handle-confirmation"
                  type="text"
                  autoComplete="off"
                  value={typedHandle}
                  disabled={view.status === "submitting"}
                  onChange={(inputEvent) =>
                    setView({ status: "confirming", typedHandle: inputEvent.target.value })
                  }
                  placeholder={accountHandle}
                  className="rounded-lg border border-black/10 bg-background px-3 py-2 text-sm text-secondary-foreground outline-none focus:border-primary disabled:opacity-50"
                />
                <div className="flex flex-row items-center justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => setView({ status: "explaining" })}
                    disabled={view.status === "submitting"}
                    className="cursor-pointer text-sm font-medium text-secondary-foreground disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  {/* A REAL BUTTON NOW, not the anchor the mailto version needed. It
                      performs the write rather than handing off to a mail client. */}
                  <button
                    type="button"
                    onClick={handleDeleteConfirmed}
                    disabled={!isTypedHandleMatching || view.status === "submitting"}
                    className="cursor-pointer rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {view.status === "submitting" ? "Deleting…" : "Delete my account"}
                  </button>
                </div>
              </section>
            )}
          </div>
        );

      case "deactivated":
        return (
          <div className="flex flex-col gap-6 p-4">
            {/* NO CONTROLS. The session behind this tab is already gone, so anything
                clickable here would 401. It is a status line for the moment before the
                hard navigate that follows it. */}
            <output className="flex flex-col gap-2 rounded-xl border border-black/10 bg-card p-4">
              <h3 className="text-sm font-medium text-secondary-foreground">
                Your account is deactivated
              </h3>
              <p className="text-sm text-muted-foreground">
                We have emailed you the details. You have until{" "}
                <span className="font-medium">
                  {formatScheduledDate(view.anonymizationScheduledAt)}
                </span>{" "}
                to sign in again and keep it — after that it cannot be restored.
              </p>
              <p className="text-sm text-muted-foreground">Signing you out…</p>
            </output>
          </div>
        );

      default: {
        const exhaustiveCheck: never = view;
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
        <h2 className="text-xl font-medium text-secondary-foreground">Delete your account</h2>
      </header>

      {renderBody()}
    </div>
  );
}

/** One numbered stage of the deletion timeline. */
function DeletionStage({
  stageNumber,
  title,
  detail,
}: {
  stageNumber: number;
  title: string;
  detail: string;
}) {
  return (
    <li className="flex flex-row gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-secondary-foreground">
        {stageNumber}
      </span>
      <span className="flex flex-col">
        <span className="text-sm font-medium text-secondary-foreground">{title}</span>
        <span className="text-xs text-muted-foreground">{detail}</span>
      </span>
    </li>
  );
}

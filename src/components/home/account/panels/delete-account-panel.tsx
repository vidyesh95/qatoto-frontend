// TRANSPORT: client-query — the Better Auth session, for the handle this panel makes you type and
// the account id it puts in the request. It performs NO write of its own.
"use client";

// WHAT "DELETE MY ACCOUNT" CAN HONESTLY MEAN HERE, AND WHY THIS PANEL SENDS AN EMAIL.
//
// The backend already decided the shape of this before any UI existed. Cascade rule R2 in
// `qatoto-backend/src/db/schema/rnd.ts` makes 55 tables hold `restrict` foreign keys into `user`, so
// `DELETE FROM "user"` physically cannot succeed for anybody who has founded, joined or applied to a
// project, transacted, moderated or voted — and roughly 66 tables are additionally protected by
// `BEFORE UPDATE OR DELETE` Postgres triggers (ledgers, equity, pay records, hash-chained audit
// trails). Account deletion is therefore an ANONYMIZATION flow, which is the point: it is what stops
// one person's deletion erasing another person's financial record. GDPR Art. 17(3)(b) and (e) are
// the exemptions that make keeping those rows lawful.
//
// THE BUTTON DOES NOT DELETE ANYTHING, AND SAYS SO. There is no `DELETE /users/me`, no
// `deactivatedAt`/`anonymizedAt` column, and no scheduled anonymization job — Better Auth's
// `deleteUser` plugin is switched off on purpose. So the control is labelled "Request account
// deletion", opens a prefilled message to the privacy mailbox the policy already commits to, and
// the terminal state says the request is not confirmed until a human replies. A button that reported
// "your account has been deactivated" when nothing was written would be a lie with legal weight.
//
// WHY TYPE-TO-CONFIRM SURVIVES ANYWAY. This is a request, not an action, but it is a request whose
// grant is irreversible — and the friction is what makes somebody read the "what is kept" list
// before sending it. The same reason the backend has no unbake endpoint.

import Image from "next/image";
import { useState } from "react";

import { useSession } from "@/lib/auth-client";
import {
  ACCOUNT_DELETION_GRACE_PERIOD_DAYS,
  buildPrivacyRequestMailtoHref,
  PRIVACY_REQUEST_RESPONSE_WINDOW_LABEL,
} from "@/lib/privacy-request";
import { PRIVACY_CONTACT_EMAIL } from "@/lib/site";

/**
 * Where in the request the visitor is.
 *
 * A UNION RATHER THAN `isConfirming` + `hasRequested` + `typedHandle`, because those three booleans
 * admit a state that means nothing — requested AND still confirming — and the copy for each stage
 * contradicts the others (CLAUDE.md Pattern 1). `typedHandle` only exists while confirming, so it
 * lives inside that variant and cannot linger after the request is opened.
 */
type DeleteAccountView =
  | { readonly status: "explaining" }
  | { readonly status: "confirming"; readonly typedHandle: string }
  | { readonly status: "request-opened" };

type DeleteAccountPanelProps = {
  /** Return to the data & privacy panel. */
  onBack: () => void;
};

/** Erased at anonymization. Phrased as the things a person recognizes as "me", not as columns. */
const ERASED_DATA_LABELS: readonly string[] = [
  "Your name, email address, and profile photo",
  "Your handle, and the location you set on your profile",
  "Your passkeys, password, and linked Google or GitHub accounts",
  "Every device you are signed in on",
  "Your watch history, likes, saves, and playlists",
  "Your comments and forum replies",
  "Language, browse country, and other preferences stored in your browser",
];

/**
 * Kept, pseudonymously. EACH ONE NAMES SOMEBODY ELSE'S INTEREST, deliberately — "we keep it because
 * the law says so" invites an argument, "deleting it would delete your co-founder's equity record"
 * ends one.
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

export function DeleteAccountPanel({ onBack }: DeleteAccountPanelProps) {
  const { data: session } = useSession();
  const [view, setView] = useState<DeleteAccountView>({ status: "explaining" });

  const accountHandle = session?.user.handle ?? "";
  const accountId = session?.user.id ?? "";

  // Nothing can be confirmed against a handle the session has not produced yet — and an account
  // without one cannot be identified in the request either. Both gates are the same gate.
  const isSessionReady = accountHandle.length > 0 && accountId.length > 0;

  const deletionRequestMailtoHref = buildPrivacyRequestMailtoHref({
    kind: "account-deletion",
    accountId,
    accountHandle,
  });

  /** Exact match, trimmed only for the stray whitespace a paste brings. Case still has to be right. */
  const isTypedHandleMatching =
    view.status === "confirming" && view.typedHandle.trim() === accountHandle;

  function renderBody() {
    switch (view.status) {
      case "explaining":
      case "confirming":
        return (
          <div className="flex flex-col gap-6 p-4">
            <p className="text-sm text-muted-foreground">
              Deleting your account is permanent. Read what happens before you ask for it.
            </p>

            <section className="flex flex-col gap-3">
              <h3 className="text-sm font-medium text-secondary-foreground">
                What happens, and when
              </h3>
              <ol className="flex flex-col gap-3">
                <DeletionStage
                  stageNumber={1}
                  title="Your account is deactivated"
                  detail="You are signed out on every device and your profile stops being visible to anyone else. This happens as soon as we confirm the request."
                />
                <DeletionStage
                  stageNumber={2}
                  title={`You have ${ACCOUNT_DELETION_GRACE_PERIOD_DAYS} days to change your mind`}
                  detail="Reply to the confirmation email at any point in that window and your account comes back exactly as it was."
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

            {view.status === "explaining" ? (
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
                  value={view.typedHandle}
                  onChange={(inputEvent) =>
                    setView({ status: "confirming", typedHandle: inputEvent.target.value })
                  }
                  placeholder={accountHandle}
                  className="rounded-lg border border-black/10 bg-background px-3 py-2 text-sm text-secondary-foreground outline-none focus:border-primary"
                />
                <div className="flex flex-row items-center justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => setView({ status: "explaining" })}
                    className="cursor-pointer text-sm font-medium text-secondary-foreground"
                  >
                    Cancel
                  </button>
                  {/* AN ANCHOR, NOT A BUTTON WITH A HANDLER. The mail client is the thing that
                      opens; a disabled anchor is not a control the keyboard can reach, so the
                      unconfirmed state renders a real disabled button in its place. */}
                  {isTypedHandleMatching ? (
                    <a
                      href={deletionRequestMailtoHref}
                      onClick={() => setView({ status: "request-opened" })}
                      className="cursor-pointer rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white"
                    >
                      Request account deletion
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="cursor-not-allowed rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white opacity-50"
                    >
                      Request account deletion
                    </button>
                  )}
                </div>
              </section>
            )}
          </div>
        );

      case "request-opened":
        return (
          <div className="flex flex-col gap-6 p-4">
            {/* SAYS WHAT ACTUALLY HAPPENED — a draft opened — and nothing more. Your account is
                still fully active at this point, and the copy has to survive the case where the
                visitor closes the draft without sending it. */}
            <section className="flex flex-col gap-2 rounded-xl border border-black/10 bg-card p-4">
              <h3 className="text-sm font-medium text-secondary-foreground">
                Your request is not sent yet
              </h3>
              <p className="text-sm text-muted-foreground">
                We opened a message to {PRIVACY_CONTACT_EMAIL} in your mail app. Send it to start
                the request. Nothing has changed on your account until you do.
              </p>
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-secondary-foreground">What happens next</h3>
              <p className="text-sm text-muted-foreground">
                We reply within {PRIVACY_REQUEST_RESPONSE_WINDOW_LABEL} to confirm. Your account is
                deactivated from that confirmation, and you have{" "}
                {ACCOUNT_DELETION_GRACE_PERIOD_DAYS} days to cancel by replying to it.
              </p>
            </section>

            <p className="text-sm text-muted-foreground">
              If no message opened, email {PRIVACY_CONTACT_EMAIL} directly and include your account
              ID: <span className="font-medium break-all">{accountId}</span>
            </p>

            <button
              type="button"
              onClick={() => setView({ status: "explaining" })}
              className="cursor-pointer self-start text-sm font-medium text-[#00696E]"
            >
              Back to the details
            </button>
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

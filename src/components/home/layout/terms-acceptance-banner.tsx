// TRANSPORT: client-query — reads the session and writes `POST /users/me/terms-acceptance`.
"use client";

// Asks a signed-in account to accept the Terms and Conditions AGAIN after they change (todo §7).
//
// WHO SEES IT: ONLY an account whose recorded version is an EARLIER one. An account with no record
// at all is NOT asked, by decision (2026-10-03): that is every account created before acceptance
// was recorded, and the Terms' continued-use clause covers them — asking all of them at once read as
// a nag to people who had already signed up through a page carrying the Terms sentence. New
// accounts are recorded at sign-up instead: the email form echoes the version, and a Google or
// GitHub first sign-in is recorded by the backend's `user.create.after` hook, beside a sentence on
// every page with those buttons. Signed-out visitors and anonymous sessions never see this.
//
// IT BLOCKS NOTHING, by decision. The Terms already say continued use is acceptance; this records
// an explicit one, with its version, so the record does not rest on that clause alone.
//
// IT RENDERS NOTHING ON THE SERVER AND WHILE THE SESSION IS LOADING, so a visitor who has accepted
// never sees it flash. It sits in the `(home)` column between the navbar and the content row,
// beside `AlphaBanner`, which sizes by content — so its arrival moves no offset (see that file).
//
// NOT `role="alert"`, on the `AlphaBanner` precedent: it is a standing request, not an event, and an
// alert would interrupt every screen reader on every page until the account accepts.

import { useState } from "react";

import Link from "next/link";

import { acceptCurrentTerms } from "@/lib/account/terms-acceptance.api";
import { useSession } from "@/lib/auth-client";
import { TERMS_LAST_UPDATED_LABEL, TERMS_VERSION } from "@/lib/legal-documents";

type AcceptanceAttemptState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "refused"; message: string };

/** The session user carries `isAnonymous` from the backend's anonymous plugin; read it as unknown. */
function isAnonymousSessionUser(sessionUser: unknown): boolean {
  return (
    typeof sessionUser === "object" &&
    sessionUser !== null &&
    "isAnonymous" in sessionUser &&
    sessionUser.isAnonymous === true
  );
}

export default function TermsAcceptanceBanner() {
  const { data: session, isPending, refetch } = useSession();
  const [attemptState, setAttemptState] = useState<AcceptanceAttemptState>({ status: "idle" });

  if (isPending || session === null || session === undefined) return null;
  if (isAnonymousSessionUser(session.user)) return null;
  // No record → not asked (see the header). The current version → nothing to ask.
  const recordedTermsVersion = session.user.termsVersion;
  if (recordedTermsVersion === null || recordedTermsVersion === undefined) return null;
  if (recordedTermsVersion === TERMS_VERSION) return null;

  async function handleAcceptClick() {
    setAttemptState({ status: "submitting" });
    const result = await acceptCurrentTerms(TERMS_VERSION);
    if (!result.success) {
      setAttemptState({ status: "refused", message: result.error.message });
      return;
    }
    // The banner disappears when the refreshed session carries the version — not before, so it
    // never claims an acceptance the server has not confirmed.
    await refetch();
    setAttemptState({ status: "idle" });
  }

  return (
    <aside
      aria-label="Terms and Conditions"
      className="shrink-0 border-b border-border bg-secondary px-4 py-2 text-sm text-secondary-foreground lg:px-6"
    >
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
        <p>
          Our Terms and Conditions were updated on {TERMS_LAST_UPDATED_LABEL}.{" "}
          <Link href="/terms-and-conditions" className="font-medium underline underline-offset-2">
            Read them
          </Link>
        </p>
        <button
          type="button"
          onClick={handleAcceptClick}
          disabled={attemptState.status === "submitting"}
          className="cursor-pointer rounded-full bg-primary-imprint px-3 py-1 text-xs font-medium text-primary-imprint-foreground disabled:opacity-50"
        >
          {attemptState.status === "submitting" ? "Accepting…" : "Accept"}
        </button>
      </div>
      {attemptState.status === "refused" && (
        <p className="mt-1 text-center text-xs text-destructive">{attemptState.message}</p>
      )}
    </aside>
  );
}

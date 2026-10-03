// TRANSPORT: client-query — reads the session and writes `POST /users/me/terms-acceptance`.
"use client";

// Asks a signed-in account to accept the current Terms and Conditions (todo §7).
//
// WHO SEES IT: every signed-in account whose recorded version is not `TERMS_VERSION`. That is
// every account created before acceptance was recorded, every Google or GitHub first sign-in (that
// path shows no Terms text), an email sign-up from an older client, and everybody after the next
// Terms change. Anonymous sessions never see it: they are not an account that can agree to
// anything, and the backend refuses them with a 403.
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
  if (session.user.termsVersion === TERMS_VERSION) return null;

  const hasAcceptedAnEarlierVersion =
    session.user.termsVersion !== null && session.user.termsVersion !== undefined;

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
          {hasAcceptedAnEarlierVersion
            ? `Our Terms and Conditions were updated on ${TERMS_LAST_UPDATED_LABEL}.`
            : `Please accept our Terms and Conditions, last updated ${TERMS_LAST_UPDATED_LABEL}.`}{" "}
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

// TRANSPORT: props-only — renders copy it is handed, no network.
//
// The store's four panel states, each a thin wrapper over `StatusPanel` supplying the
// store palette. Kept as four named components rather than one with a `variant` prop, so
// that a page's exhaustive `switch` over its view state reads as four different answers —
// which they are. A `variant="empty" | "error"` string would let a page render the error
// panel for an empty result and typecheck.
//
// THE DISTINCTION THAT MATTERS MOST HERE is between the two empty states.
// `StoreEmptyPanel` is "nothing has been listed"; `StoreEmptyFilteredPanel` is "your
// filters excluded everything" and offers a way to widen. Rendering the first for the
// second is the bug that makes a working catalog look broken, and it is why §6 of
// STORE_STRUCTURE.md carries `appliedFilterCount` in its `empty` variant at all.

import Link from "next/link";

import StatusPanel from "@/components/home/shared/status-panel";

const STORE_PANEL_CLASS = "border border-[#CAC4D0]/60 px-6 py-16";

const ACTION_LINK_CLASS =
  "rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90";

/** Nothing exists here yet. No action, because there is nothing for a buyer to undo. */
export function StoreEmptyPanel({ message }: { message: string }) {
  return <StatusPanel message={message} className={STORE_PANEL_CLASS} />;
}

/**
 * The filters excluded everything.
 *
 * `appliedFilterCount` is stated rather than implied: "no results" reads as a dead end,
 * while "no results for 3 filters" tells the visitor the catalog is fine and the query is
 * not. `clearFiltersHref` is a LINK and not a callback — the filters live in the URL, so
 * clearing them is a navigation, and a button would need a client component to do worse.
 */
export function StoreEmptyFilteredPanel({
  appliedFilterCount,
  clearFiltersHref,
}: {
  appliedFilterCount: number;
  clearFiltersHref: string;
}) {
  const filterCountLabel = appliedFilterCount === 1 ? "1 filter" : `${appliedFilterCount} filters`;
  return (
    <StatusPanel
      message={`Nothing matches those ${filterCountLabel}. Try removing one.`}
      className={STORE_PANEL_CLASS}
      action={
        <Link href={clearFiltersHref} className={ACTION_LINK_CLASS}>
          Clear filters
        </Link>
      }
    />
  );
}

/**
 * The read failed.
 *
 * The backend's own message is shown, not a generic apology, because on a `PARSE` failure
 * it is the only signal a reviewer gets — and "Client-side contract validation failed" is
 * exactly the sentence that should make someone look at the terminal, where the failing
 * field path was logged.
 */
export function StoreErrorPanel({ message }: { message: string }) {
  return (
    <StatusPanel
      message={message}
      className={STORE_PANEL_CLASS}
      action={
        <Link href="/store" className={ACTION_LINK_CLASS}>
          Back to Store
        </Link>
      }
    />
  );
}

/**
 * The read needs a session.
 *
 * Only for a `401`. A `404` must NEVER render this: the backend answers 404 for "no such
 * thing" and "not visible to you" with one code, deliberately, so that a stranger cannot
 * learn which ids exist — and a sign-in prompt on a 404 tells them they found one.
 */
export function StoreSignInRequiredPanel({ message }: { message: string }) {
  return (
    <StatusPanel
      message={message}
      className={STORE_PANEL_CLASS}
      action={
        <Link href="/sign-in" className={ACTION_LINK_CLASS}>
          Sign in
        </Link>
      }
    />
  );
}

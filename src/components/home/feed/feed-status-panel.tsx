// TRANSPORT: props-only — presentational. Fetches nothing.
//
// The shared empty / error / sign-in shell for the home feed, mirroring `RndStatusPanel` so
// the two surfaces fail the same way.
//
// IT EXISTS SO A FAILED READ AND AN EMPTY RESULT NEVER RENDER IDENTICALLY. A homepage that
// says "No videos yet" when the backend is down reports a platform outage as a fact about the
// catalogue, and nobody investigates it.

import Link from "next/link";

export default function FeedStatusPanel({
  message,
  action,
}: {
  readonly message: string;
  readonly action?: React.ReactNode;
}) {
  return (
    <div className="mx-4 flex flex-col items-center gap-4 rounded-2xl border border-outline-variant/60 px-6 py-16 text-center lg:mx-6">
      <p className="text-sm text-outline-strong">{message}</p>
      {action}
    </div>
  );
}

/**
 * The 401 branch, which on this surface means exactly one thing: `?mode=watched`.
 *
 * Every other feed read is optional-auth and answers an anonymous viewer with a real
 * popularity-ranked page. Watch history is the exception because serving it off a daily
 * rotating fingerprint would hand one person's history to everyone behind the same NAT.
 */
export function FeedSignInRequiredPanel({ message }: { message: string }) {
  return (
    <FeedStatusPanel
      message={message}
      action={
        <Link
          href="/sign-in"
          className="rounded-full bg-primary-imprint px-4 py-2 text-xs font-medium text-primary-imprint-foreground"
        >
          Sign in
        </Link>
      }
    />
  );
}

/**
 * The failure branch.
 *
 * No retry button: this renders inside a server component, so retrying means reloading the
 * route and a button that cannot do more than the reload icon is noise.
 */
export function FeedErrorPanel({ message }: { message: string }) {
  return <FeedStatusPanel message={message} />;
}

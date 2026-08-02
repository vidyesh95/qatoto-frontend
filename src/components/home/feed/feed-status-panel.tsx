// TRANSPORT: props-only — presentational. Fetches nothing.
//
// The shared empty / error / sign-in shell for the home feed, mirroring `RndStatusPanel` so
// the two surfaces fail the same way.
//
// IT EXISTS SO A FAILED READ AND AN EMPTY RESULT NEVER RENDER IDENTICALLY. A homepage that
// says "No videos yet" when the backend is down reports a platform outage as a fact about the
// catalogue, and nobody investigates it.

import Link from "next/link";

import type { ApiError } from "@/lib/http";

export default function FeedStatusPanel({
  message,
  action,
}: {
  readonly message: string;
  readonly action?: React.ReactNode;
}) {
  return (
    <div className="mx-4 flex flex-col items-center gap-4 rounded-2xl border border-[#CAC4D0]/60 px-6 py-16 text-center lg:mx-6">
      <p className="text-sm text-[#6F7979]">{message}</p>
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
          className="rounded-full bg-[#00696E] px-4 py-2 text-xs font-medium text-white"
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

/**
 * Turns a transport failure into copy that says something USEFUL.
 *
 * EVERY ONE OF THESE USED TO READ "Couldn't load the feed. Please try again." — a backend that
 * was not running, a contract this page could not parse, a rate limit and a 500 all produced the
 * identical sentence, with nothing logged anywhere. Diagnosing an empty homepage meant reading
 * source, because the screen could not tell you which of four unrelated things had happened.
 *
 * The distinction matters most for `NETWORK`, which in development almost always means the one
 * thing the reader can fix in five seconds: the API is not up.
 */
export function describeFeedError(error: ApiError): string {
  if (error.code === "NETWORK") {
    return "Can't reach the server. Is the backend running?";
  }
  if (error.code === "PARSE") {
    // The Zod issue paths are already on the dev server's console via `toParseError`; naming the
    // shape of the problem here is what sends the reader there.
    return "The server sent something this page can't read. Check the dev server log for the field.";
  }
  if (error.code === "429") {
    return "Too many requests — wait a moment and reload.";
  }
  if (error.code.startsWith("5")) {
    return "The server had a problem. Please try again.";
  }
  // Anything else keeps the backend's own message: a 403 or a 422 here says something specific
  // and true, and replacing it with an apology throws that away.
  return error.message;
}

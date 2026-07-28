// TRANSPORT: props-only — presentational server component. Fetches nothing.
//
// The shared empty / error / sign-in-required shell for every wired R&D surface,
// mirroring `StatusPanel` in the studio's products page so the two surfaces fail the
// same way.
//
// It exists so a failed read and an empty result never render identically. A page that
// shows "No insights yet" when the backend is down reports a platform outage as a
// finding about the data.

import Link from "next/link";

export default function RndStatusPanel({
  message,
  action,
}: {
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-[#CAC4D0]/60 px-6 py-16 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      {action}
    </div>
  );
}

/**
 * The 401 branch. `/discovery/talent` and `/funding/deals` are `requireAuth`, so a
 * signed-out visitor gets no rows — and must be told why rather than shown an empty
 * list that reads as "nobody is here".
 */
export function RndSignInRequiredPanel({ message }: { message: string }) {
  return (
    <RndStatusPanel
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
 * The generic failure branch.
 *
 * No retry button: this renders inside a server component, where retrying means
 * reloading the route. Deliberately says nothing about WHY — a backend `404` means
 * "no access or no such thing" and a hint either way leaks which ids exist.
 */
export function RndErrorPanel({ message }: { message: string }) {
  return <RndStatusPanel message={message} />;
}

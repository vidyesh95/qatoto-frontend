// TRANSPORT: client-query — reads the Better Auth session to decide whether to render at all.
"use client";

// THE SIGNED-OUT DOOR for every route under `/your-account` and `/settings`.
//
// It is a UX gate and NOTHING ELSE. Every panel behind it re-checks the session on the server for
// its own read or write, and the Express backend re-authorizes every request regardless — the
// client is hostile (CLAUDE.md). Deleting this component in devtools reveals empty forms, not
// somebody else's account.
//
// `isViewerSignedIn` is threaded down from the page, which awaited `hasCallerSession()` during the
// server render. That is what makes the first client render match the HTML: without a seed,
// `useSession()` may already have resolved by the time these islands hydrate, and React would
// discard the subtree. `use-viewer-signed-in.ts` explains the bug in full.

import Link from "next/link";
import type { ReactNode } from "react";

import StatusPanel from "@/components/home/shared/status-panel";
import { useViewerSignedIn } from "@/hooks/use-viewer-signed-in";

export default function AccountRouteGuard({
  isViewerSignedIn,
  children,
}: {
  isViewerSignedIn: boolean;
  children: ReactNode;
}) {
  const isSignedIn = useViewerSignedIn(isViewerSignedIn);

  if (!isSignedIn) {
    return (
      <div className="px-4 pt-6 lg:px-6">
        <StatusPanel
          message="Sign in to manage your account."
          className="border border-border px-6 py-16"
          action={
            <Link
              href="/sign-in"
              className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Sign in
            </Link>
          }
        />
      </div>
    );
  }

  return children;
}

// TRANSPORT: props-only — chooses between signing up and the existing application controls, which
// own the one write.
"use client";

import Link from "next/link";

import RequestToJoinButton from "@/components/home/research-and-development/sections/request-to-join-button";
import ApplyRoleSheet from "@/components/home/research-and-development/sheets/apply-role-sheet";
import { useViewerSignedIn } from "@/hooks/use-viewer-signed-in";
import { buildAuthHref } from "@/lib/auth-return-path";
import type { OpenRole } from "@/lib/rnd/catalog.schemas";

/**
 * "Sign up" COMES FIRST, unlike every other sign-in prompt on the site, because somebody following
 * an invite link usually has no account. `returnPath` carries the role, which a pathname would lose.
 *
 * This is a prompt, not a gate: the backend authorizes the application.
 */
export default function JoinProjectActions({
  projectSlug,
  invitedRole,
  returnPath,
}: {
  readonly projectSlug: string;
  readonly invitedRole: OpenRole | null;
  readonly returnPath: string;
}) {
  const isSignedIn = useViewerSignedIn(false);

  if (!isSignedIn) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={buildAuthHref("/sign-up", returnPath)}
          className="rounded-full bg-primary-imprint px-4 py-2 text-sm font-medium text-primary-imprint-foreground"
        >
          Sign up to join
        </Link>
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href={buildAuthHref("/sign-in", returnPath)}
            className="font-medium text-primary-imprint"
          >
            Sign in
          </Link>
        </p>
      </div>
    );
  }

  return invitedRole === null ? (
    <RequestToJoinButton projectSlug={projectSlug} isInitiallyOpen />
  ) : (
    <ApplyRoleSheet role={invitedRole} />
  );
}

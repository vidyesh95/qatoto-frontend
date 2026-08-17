// TRANSPORT: client-query — owns the account menu state and the live session.
"use client";

// THE PER-VIEWER HALF OF THE ADMIN BAR, split out for the same reason as the other two: it branched on
// `!!session` alone, so a SIGNED-IN staff member hydrated a different tree than the server sent.
// `navbar-account-slot.tsx` carries the reasoning for containing the cookie read in a wrapper.

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

import AccountMenu from "@/components/home/account/menus/account-menu";
import NotificationBell from "@/components/home/layout/notification-bell";
import { useSession } from "@/lib/auth-client";
import { useViewerSignedIn } from "@/hooks/use-viewer-signed-in";

export default function AdminNavbarAccountCluster({
  isViewerSignedIn,
}: {
  /** What the SERVER saw. Also the Suspense fallback's value — see `admin-navbar-account-slot.tsx`. */
  readonly isViewerSignedIn: boolean;
}) {
  const { data: session } = useSession();
  const isAuthenticated = useViewerSignedIn(isViewerSignedIn);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  return (
    <>
      {isAuthenticated ? (
        <>
          {/* The same inbox as the other two surfaces: the read is caller-scoped with no project
          filter, so a staff member's notifications are the notifications they already have. */}
          <NotificationBell isViewerSignedIn={isViewerSignedIn} />
          <div className="relative">
            <button
              type="button"
              aria-label="Account"
              aria-haspopup="menu"
              onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)}
              className="flex size-10 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-primary"
            >
              <Image
                src={session?.user.image ?? "/dummy/profile_photo_girl.avif"}
                alt={"Account"}
                width={39}
                height={39}
                className="rounded-full"
              />
            </button>
            {isAccountMenuOpen && <AccountMenu onClose={() => setIsAccountMenuOpen(false)} />}
          </div>
        </>
      ) : (
        <Link
          href={"/sign-in"}
          className="flex gap-2 rounded-full border border-primary bg-white px-2 py-1.75 text-[#1DBDC5]"
        >
          <Image
            src={"/icons/account_circle_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"}
            alt={"Signin"}
            width={24}
            height={24}
          />
          Sign in
        </Link>
      )}
    </>
  );
}

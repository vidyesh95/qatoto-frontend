// TRANSPORT: client-query — owns the create/account menu state and the live session.
"use client";

// THE PER-VIEWER HALF OF THE STUDIO BAR, split out for the same reason as the home one: it branched
// on `!!session` alone, so a SIGNED-IN viewer hydrated a different tree than the server sent and React
// discarded the whole `<nav>`. See `navbar-account-slot.tsx` for why the cookie read is contained in a
// wrapper rather than awaited in the layout.

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

import AccountMenu from "@/components/home/account/menus/account-menu";
import SendFeedbackSheet from "@/components/home/shared/send-feedback-sheet";
import CreateMenu from "@/components/studio/create-menu";
import { useViewerAvatarUrl } from "@/hooks/use-viewer-avatar-url";
import { useViewerSignedIn } from "@/hooks/use-viewer-signed-in";

export default function StudioNavbarAccountCluster({
  isViewerSignedIn,
}: {
  /** What the SERVER saw. Also the Suspense fallback's value — see `studio-navbar-account-slot.tsx`. */
  readonly isViewerSignedIn: boolean;
}) {
  const viewerAvatarUrl = useViewerAvatarUrl();
  const isAuthenticated = useViewerSignedIn(isViewerSignedIn);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  // Owned here rather than in `AccountMenu`, which unmounts the moment it closes — see the
  // note on `onSendFeedback` in `account-menu.tsx`.
  const [isFeedbackSheetOpen, setIsFeedbackSheetOpen] = useState(false);

  return (
    <>
      {isAuthenticated && (
        <div className="relative">
          <button
            type="button"
            aria-haspopup="menu"
            onClick={() => setIsCreateMenuOpen((isOpen) => !isOpen)}
            className="flex cursor-pointer items-center gap-2 rounded-full border border-primary bg-white px-3 py-1.75"
          >
            <Image
              src="/icons/video_call_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              alt=""
              width={24}
              height={24}
            />
            <span className="hidden text-sm font-medium sm:inline">Create</span>
          </button>
          {isCreateMenuOpen && <CreateMenu onClose={() => setIsCreateMenuOpen(false)} />}
        </div>
      )}
      {isAuthenticated ? (
        <div className="relative">
          <button
            type="button"
            aria-label="Account"
            aria-haspopup="menu"
            onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)}
            className="flex size-10 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-primary"
          >
            <Image
              src={viewerAvatarUrl}
              alt="Account"
              width={39}
              height={39}
              className="rounded-full"
            />
          </button>
          {isAccountMenuOpen && (
            <AccountMenu
              onClose={() => setIsAccountMenuOpen(false)}
              onSendFeedback={() => {
                setIsAccountMenuOpen(false);
                setIsFeedbackSheetOpen(true);
              }}
            />
          )}
          {isFeedbackSheetOpen && (
            <SendFeedbackSheet onClose={() => setIsFeedbackSheetOpen(false)} />
          )}
        </div>
      ) : (
        <Link
          href="/sign-in"
          className="flex gap-2 rounded-full border border-primary bg-white px-2 py-1.75 text-[#1DBDC5]"
        >
          <Image
            src="/icons/account_circle_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt="Signin"
            width={24}
            height={24}
          />
          Sign in
        </Link>
      )}
    </>
  );
}

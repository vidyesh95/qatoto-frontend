// TRANSPORT: client-query — owns the account menu's open state and the live session.
"use client";

// THE PER-VIEWER HALF OF THE NAVBAR, SPLIT OUT SO IT CAN BE STREAMED.
//
// It used to sit inline in `navbar.tsx` and branch on `!!session` alone, which mismatched on every
// hydration for a SIGNED-IN viewer: the server rendered the sign-in link, the client rendered the
// avatar cluster, and React threw the whole `<nav>` subtree away. It went unnoticed because the
// symptom only appears when you are logged in.
//
// It is separate from `navbar.tsx` because the fix has to be CONTAINED. `(home)`, `(studio)` and
// `(admin)` routes genuinely prerender, and a layout that awaited `hasCallerSession()` would make
// every route in its group dynamic — the exact thing `(admin)/layout.tsx` refuses in its own header
// for `AdminStaffGate`. So only this component's wrapper reads the cookie, under its own `<Suspense>`,
// and the rest of the chrome keeps prerendering.

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

import AccountMenu from "@/components/home/account/menus/account-menu";
import AiAssistSheet from "@/components/home/account/menus/ai-assist-sheet";
import SendFeedbackSheet from "@/components/home/shared/send-feedback-sheet";
import CartNavButton from "@/components/home/layout/cart-nav-button";
import NotificationBell from "@/components/home/layout/notification-bell";
import { useViewerAvatarUrl } from "@/hooks/use-viewer-avatar-url";
import { useViewerSignedIn } from "@/hooks/use-viewer-signed-in";
import { MASCOT_STATIC_FALLBACK_URL } from "@/lib/assistant/mascot-atlas.schemas";

export default function NavbarAccountCluster({
  isViewerSignedIn,
}: {
  /**
   * What the SERVER saw, from `hasCallerSession()`.
   *
   * ALSO THE SUSPENSE FALLBACK'S VALUE, passed as `false`. That is deliberate rather than a
   * placeholder: on a prerendered route the fallback is what ships in the static HTML, and the
   * signed-out cluster is the correct final answer for an anonymous visitor — so they see no swap at
   * all, and a signed-in one gets their avatar streamed in.
   */
  readonly isViewerSignedIn: boolean;
}) {
  // Two separately hydration-aligned reads of the same session: the boolean decides WHICH cluster,
  // the URL fills the avatar in once the live session lands. Neither may touch `useSession` raw —
  // `use-viewer-avatar-url.ts` explains what a raw read did to the `<img src>` here.
  const viewerAvatarUrl = useViewerAvatarUrl();
  const isAuthenticated = useViewerSignedIn(isViewerSignedIn);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  // THE SHEET'S OPEN BIT LIVES HERE, NOT IN THE MENU. Opening it closes the menu, and the menu
  // is unmounted when it closes — a sheet owned by `AccountMenu` would be destroyed by the same
  // click that opened it.
  const [isFeedbackSheetOpen, setIsFeedbackSheetOpen] = useState(false);
  // Signed out, there is no account menu to hold the AI Assist switch, so the navbar offers it
  // directly. Signed in, the account menu is where it lives, as before.
  const [isAiAssistSheetOpen, setIsAiAssistSheetOpen] = useState(false);

  return (
    <>
      {isAuthenticated ? (
        <>
          {/* Owns its own count query and its own signed-out gate, for the same reason the cart
          button does. The server's answer is threaded down so the badge does not wait on the
          session atom. */}
          <NotificationBell isViewerSignedIn={isViewerSignedIn} />
          {/* Owns its own cart query so the request only exists for a signed-in visitor — see
          the header of `cart-nav-button.tsx`. */}
          <CartNavButton />
          <div className="relative">
            <button
              type="button"
              aria-label="Account"
              aria-haspopup="menu"
              onClick={() => setIsAccountMenuOpen((v) => !v)}
              className="flex size-10 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-primary"
            >
              <Image
                src={viewerAvatarUrl}
                alt={"Account"}
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
          </div>
          {isFeedbackSheetOpen && (
            <SendFeedbackSheet onClose={() => setIsFeedbackSheetOpen(false)} />
          )}
        </>
      ) : (
        <>
          {/* The mascot's own still is the icon: `public/icons` has no AI glyph, and this is the
              character the switch turns on. Text from `sm` up; on a phone the image and the
              accessible name carry it, so the navbar keeps its room for search. */}
          <button
            type="button"
            aria-haspopup="dialog"
            aria-label="AI Assist"
            onClick={() => setIsAiAssistSheetOpen(true)}
            className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-card px-2 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint"
          >
            <Image
              src={MASCOT_STATIC_FALLBACK_URL}
              alt=""
              width={24}
              height={29}
              className="h-7 w-auto"
            />
            <span className="hidden sm:inline">AI Assist</span>
          </button>
          {isAiAssistSheetOpen && (
            <AiAssistSheet idPrefix="navbar" onClose={() => setIsAiAssistSheetOpen(false)} />
          )}
          <Link
            href={"/sign-in"}
            className="flex gap-2 rounded-full border border-primary bg-card px-2 py-1.75 text-primary-imprint"
          >
            <Image
              src={"/icons/account_circle_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"}
              alt={"Signin"}
              width={24}
              height={24}
            />
            Sign in
          </Link>
        </>
      )}
    </>
  );
}

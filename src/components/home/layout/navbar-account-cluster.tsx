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
import CartNavButton from "@/components/home/layout/cart-nav-button";
import NotificationBell from "@/components/home/layout/notification-bell";
import { useSession } from "@/lib/auth-client";
import { useViewerSignedIn } from "@/hooks/use-viewer-signed-in";

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
  // The avatar needs the session object itself, not just the boolean, so this reads both. The
  // boolean decides WHICH cluster; the session fills it in once it lands.
  const { data: session } = useSession();
  const isAuthenticated = useViewerSignedIn(isViewerSignedIn);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

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

// TRANSPORT: props-only — one piece of client state; the quote link is a real route.
//
// The contact rail. Deliberately the only "use client" component on this page: the storefront is a
// read surface and everything else renders on the server.
//
// NO `contactAffordance` HERE, AND THAT IS NOT AN OVERSIGHT. The product read carries one because
// the server derives it per caller; `GET /store/organizations/:slug` does not, so this rail has no
// server verdict to follow. It uses the session only as a UX hint — the honest kind, since a
// signed-out visitor cannot open a thread under any circumstances — and never as authorization.
//
// "REQUEST A QUOTE" NOW GOES TO THE RFQ COMPOSER. It used to open the CHAT sheet, which is a
// different act entirely: an RFQ is a published requirement that providers and sellers quote
// against, with its own draft, invitations and quote thread. Sending a buyer to a chat window when
// they asked to source something is the wrong surface, and it was reachable from every storefront.
"use client";

import { useState } from "react";

import Image from "next/image";
import Link from "next/link";

import ManufacturerChatSheet from "@/components/home/store/sheets/manufacturer-chat-sheet";
import { useViewerSignedIn } from "@/hooks/use-viewer-signed-in";

export default function StorefrontContactActions({
  sellerDisplayName,
  isViewerSignedIn,
}: {
  readonly sellerDisplayName: string;
  /**
   * What the SERVER saw. Seeds the first render so it matches the HTML — see `useViewerSignedIn`.
   *
   * THIS ONE WAS THE WORST OF THE SEVEN. The branch below swaps a `<button>` for an `<a>`, and React
   * cannot patch an element-type mismatch — it throws the subtree away. It also defaulted to the
   * SIGNED-IN control while the session was pending, so an anonymous visitor was shown "Chat now"
   * and then had it replaced. Painting a control that can only 401 is worse than painting none.
   */
  readonly isViewerSignedIn: boolean;
}) {
  const [isChatSheetOpen, setIsChatSheetOpen] = useState(false);
  const isSignedIn = useViewerSignedIn(isViewerSignedIn);

  return (
    <>
      <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row lg:px-6">
        {isSignedIn ? (
          <button
            type="button"
            onClick={() => setIsChatSheetOpen(true)}
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-[#00696E] py-2.5 pr-6 pl-4 text-sm font-medium tracking-[0.1px] text-white"
          >
            <Image
              src="/icons/chat_24dp_FFFFFF_FILL1_wght400_GRAD0_opsz24.svg"
              width={18}
              height={18}
              alt=""
            />
            Chat now
          </button>
        ) : (
          <Link
            href="/sign-in"
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#00696E] py-2.5 pr-6 pl-4 text-sm font-medium tracking-[0.1px] text-white"
          >
            Sign in to contact this seller
          </Link>
        )}

        <Link
          href="/store/rfqs/new"
          className="flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 pr-6 pl-4 text-sm font-medium tracking-[0.1px] text-[#00696E] outline -outline-offset-1 outline-[#6F7979]"
        >
          <Image
            src="/icons/description_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            width={18}
            height={18}
            alt=""
          />
          Request a quote
        </Link>
      </div>

      {isChatSheetOpen && (
        <ManufacturerChatSheet
          sellerDisplayName={sellerDisplayName}
          onClose={() => setIsChatSheetOpen(false)}
        />
      )}
    </>
  );
}

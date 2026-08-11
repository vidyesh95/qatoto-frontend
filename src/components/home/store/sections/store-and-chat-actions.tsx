// TRANSPORT: props-only — the storefront link is real; the contact control follows the server.
"use client";

// "Store" / contact button pair on the product page.
//
// WHICH CONTACT CONTROL APPEARS IS THE SERVER'S DECISION, NOT AN INFERENCE HERE. `contactAffordance`
// arrives on the product read with three values, and each names a different fact about the CALLER:
//
//   `chat`         -> an active buyer organization exists, so a 1:1 thread with this seller can be
//                     opened. Thread participants are derived from organization memberships, which
//                     is why nothing less will do.
//   `ask_question` -> signed in, no buyer organization. The public Q&A channel admits them, and it
//                     is the honest middle rung rather than a chat button in front of a wall.
//   `sign_in`      -> anonymous.
//
// The alternative was a client inferring eligibility from an incomplete picture, which is how a
// button that always 401s ends up shipping. Stating it leaks nothing: it is a fact the caller
// already knows about themselves.
//
// "CHAT NOW" IS NOT WIRED AND SAYS SO. Opening a thread is `POST /commerce/products/:productId/
// inquiries`, which creates the inquiry AND the 1:1 thread, then `GET`/`POST
// /commerce/threads/:threadId/messages` carries the conversation. That is a messaging domain of its
// own — threads, message pagination, and document attachments that land `pending_scan` and answer
// 202 — and it is the next thing to build on this page. Until then the control opens the sheet,
// and the sheet is explicit that nothing is sent.

import { useState } from "react";

import Image from "next/image";
import Link from "next/link";

import ManufacturerChatSheet from "@/components/home/store/sheets/manufacturer-chat-sheet";
import type { ProductContactAffordance } from "@/lib/store/products.schemas";

export default function StoreAndChatActions({
  sellerSlug,
  sellerDisplayName,
  contactAffordance,
}: {
  readonly sellerSlug: string;
  readonly sellerDisplayName: string;
  readonly contactAffordance: ProductContactAffordance;
}) {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col items-center gap-4 px-4 pt-4 pb-2 lg:px-6">
        <Link
          href={`/store/organizations/${sellerSlug}`}
          className="flex w-full items-center justify-center gap-2 rounded-full py-2.5 pr-6 pl-4 text-sm font-medium tracking-[0.1px] text-[#00696E] outline -outline-offset-1 outline-[#6F7979]"
        >
          <Image
            src="/icons/storefront_24dp_00696E_FILL0_wght400_GRAD0_opsz24.svg"
            width={18}
            height={18}
            alt=""
          />
          Store
        </Link>

        {renderContactControl(contactAffordance, () => setIsChatOpen(true))}
      </div>

      {isChatOpen && (
        <ManufacturerChatSheet
          sellerDisplayName={sellerDisplayName}
          onClose={() => setIsChatOpen(false)}
        />
      )}
    </>
  );
}

function renderContactControl(
  contactAffordance: ProductContactAffordance,
  onChatClick: () => void,
) {
  const controlClass =
    "flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#00696E] py-2.5 pr-6 pl-4 text-sm font-medium tracking-[0.1px] text-white";

  switch (contactAffordance) {
    case "chat":
      return (
        <button type="button" onClick={onChatClick} className={controlClass}>
          <Image
            src="/icons/chat_24dp_FFFFFF_FILL1_wght400_GRAD0_opsz24.svg"
            width={18}
            height={18}
            alt=""
          />
          Chat now
        </button>
      );
    // Signed in, but no buyer organization. Q&A is the channel that admits them, and it is on this
    // same page — so this scrolls rather than navigating away.
    case "ask_question":
      return (
        <a href="#product-questions" className={controlClass}>
          <Image
            src="/icons/chat_24dp_FFFFFF_FILL1_wght400_GRAD0_opsz24.svg"
            width={18}
            height={18}
            alt=""
          />
          Ask a question
        </a>
      );
    case "sign_in":
      return (
        <Link href="/sign-in" className={controlClass}>
          Sign in to contact this seller
        </Link>
      );
    default: {
      const exhaustiveCheck: never = contactAffordance;
      return exhaustiveCheck;
    }
  }
}

// TRANSPORT: mock — opens the mock chat sheet. NOTHING here reaches a backend.
//
// The contact rail. Deliberately the only "use client" component on this page: the
// storefront is a read surface and everything else renders on the server.
//
// Sending an enquiry is a backend decision, not a client one — whether a visitor may
// open a thread depends on an active buyer organization, which the server derives. When
// this rail is wired it should render whatever affordance the backend hands it
// (`contactAffordance`: chat / ask_question / sign_in) rather than deciding for itself
// and putting a button in front of a wall.
"use client";

import { useState } from "react";

import Image from "next/image";

import ManufacturerChatSheet from "@/components/home/store/sheets/manufacturer-chat-sheet";

export default function StorefrontContactActions() {
  const [isChatSheetOpen, setIsChatSheetOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row lg:px-6">
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

        <button
          type="button"
          onClick={() => setIsChatSheetOpen(true)}
          className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full py-2.5 pr-6 pl-4 text-sm font-medium tracking-[0.1px] text-[#00696E] outline -outline-offset-1 outline-[#6F7979]"
        >
          <Image
            src="/icons/description_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            width={18}
            height={18}
            alt=""
          />
          Request a quote
        </button>
      </div>

      {isChatSheetOpen && <ManufacturerChatSheet onClose={() => setIsChatSheetOpen(false)} />}
    </>
  );
}

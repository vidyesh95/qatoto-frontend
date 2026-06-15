"use client";

import { useState } from "react";

import Image from "next/image";

import ManufacturerChatSheet from "./manufacturer-chat-sheet";
import StoreProductsSheet from "./store-products-sheet";

// "Store" / "Chat now" button pair on the product page. "Store" opens the
// manufacturer's storefront sheet (a grid of their other products); "Chat now"
// opens the manufacturer chat sheet — also used by Qatoto to verify disputes and
// to exchange image/video catalogs and PDFs between buyer and manufacturer.
// UI-only mock — the sheets hold static data; trust and ranking are backend work.
export default function StoreAndChatActions() {
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col items-center gap-4 px-4 pt-4 pb-2 lg:px-6">
        <button
          type="button"
          onClick={() => setIsStoreOpen(true)}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full py-2.5 pr-6 pl-4 text-sm font-medium tracking-[0.1px] text-[#00696E] outline -outline-offset-1 outline-[#6F7979]"
        >
          <Image
            src="/icons/storefront_24dp_00696E_FILL0_wght400_GRAD0_opsz24.svg"
            width={18}
            height={18}
            alt=""
          />
          Store
        </button>

        <button
          type="button"
          onClick={() => setIsChatOpen(true)}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#00696E] py-2.5 pr-6 pl-4 text-sm font-medium tracking-[0.1px] text-white"
        >
          <Image
            src="/icons/chat_24dp_FFFFFF_FILL1_wght400_GRAD0_opsz24.svg"
            width={18}
            height={18}
            alt=""
          />
          Chat now
        </button>
      </div>

      {isStoreOpen && <StoreProductsSheet onClose={() => setIsStoreOpen(false)} />}
      {isChatOpen && <ManufacturerChatSheet onClose={() => setIsChatOpen(false)} />}
    </>
  );
}

// TRANSPORT: mock

import Image from "next/image";
import Link from "next/link";
import type { StoreBusinessLink } from "@/mocks/store-mocks";

/**
 * One "For your Business" shortcut: icon over a label on a pale blue tile.
 *
 * These are NAVIGATION targets (RFQ, logistics, factories, forum…), not provider data — the
 * store home's provider shortcut rail is a separate, backend-fed thing. None of these routes
 * exists yet, exactly as at the mock stage.
 */
export default function B2BTile({ link }: { link: StoreBusinessLink }) {
  return (
    <Link href={link.href} className="group flex w-40 shrink-0 flex-col items-center gap-1">
      <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-blue-100 transition group-hover:bg-blue-200">
        <Image src={link.iconSrc} width={28} height={28} alt="" />
      </div>
      <span className="text-center text-xs font-medium">{link.label}</span>
    </Link>
  );
}

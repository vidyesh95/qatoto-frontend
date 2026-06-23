import Image from "next/image";
import Link from "next/link";
import type { B2BLink } from "@/types/store";

// One "For your Business" shortcut: icon over a label on a pale blue tile.
// Each links to a dedicated B2B essentials surface (RFQ, logistics, …).
export default function B2BTile({ link }: { link: B2BLink }) {
  return (
    <Link href={link.href} className="group flex w-40 shrink-0 flex-col items-center gap-1">
      <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-blue-100 transition group-hover:bg-blue-200">
        <Image src={link.iconSrc} width={28} height={28} alt="" />
      </div>
      <span className="text-center text-xs font-medium">{link.label}</span>
    </Link>
  );
}

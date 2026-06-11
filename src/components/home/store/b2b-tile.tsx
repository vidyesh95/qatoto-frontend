import Image from "next/image";
import Link from "next/link";
import type { B2BLink } from "@/lib/store";

// One "For your Business" shortcut: icon over a label on a pale blue tile.
// Each links to a dedicated B2B essentials surface (RFQ, logistics, …).
export default function B2BTile({ link }: { link: B2BLink }) {
  return (
    <Link
      href={link.href}
      className="flex w-36 shrink-0 flex-col items-center justify-center gap-3 rounded-xl bg-blue-100 p-5 transition hover:bg-blue-200 sm:w-44"
    >
      <Image src={link.iconSrc} width={28} height={28} alt="" />
      <span className="text-center text-xs font-medium">{link.label}</span>
    </Link>
  );
}

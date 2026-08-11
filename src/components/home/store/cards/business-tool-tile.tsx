// TRANSPORT: props-only — renders one link tile it is handed, no network.
//
// One "For your Business" shortcut: icon over a label on a pale blue tile. Renamed from `B2BTile`
// alongside its rail.
//
// THE LABEL IS THE ONLY COPY. `BusinessTool.description` exists in the manifest and is deliberately
// not rendered here — the tile is 160px wide, and a sentence in it wraps to four lines and pushes
// the row out of alignment. The description is the `/store/business` index card's field.

import Image from "next/image";
import Link from "next/link";

import type { BusinessTool } from "@/lib/store/business-tools";

export default function BusinessToolTile({ tool }: { tool: BusinessTool }) {
  return (
    <Link href={tool.href} className="group flex w-40 shrink-0 flex-col items-center gap-1">
      <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-blue-100 transition group-hover:bg-blue-200">
        <Image src={tool.iconSrc} width={28} height={28} alt="" />
      </div>
      <span className="text-center text-xs font-medium">{tool.label}</span>
    </Link>
  );
}

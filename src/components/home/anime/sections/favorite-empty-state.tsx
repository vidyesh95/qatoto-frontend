import Image from "next/image";
import type { FavoriteTab } from "@/types/anime";

export default function FavoriteEmptyState({ tab }: { tab: FavoriteTab }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-20 text-center">
      <Image src="/icons/fovorite_40dp.svg" width={40} height={40} alt="" />
      <p className="text-sm font-medium text-foreground">No {tab.toLowerCase()} animes yet</p>
      <p className="text-xs text-[#6F7979]">
        {tab === "Liked"
          ? "Animes you like will show up here."
          : "Animes you bookmark will show up here."}
      </p>
    </div>
  );
}

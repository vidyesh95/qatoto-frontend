// TRANSPORT: props-only — the author arrives from whichever detail page rendered it.

import Image from "next/image";

import type { BlueprintAuthor } from "@/lib/blueprints/schemas";

/** The byline all three detail layouts share. The "@" is added here, never stored on the handle. */
export default function BlueprintAuthorLine({ author }: { readonly author: BlueprintAuthor }) {
  return (
    <div className="mt-3 flex items-center gap-2">
      <Image
        src={author.avatarUrl}
        alt=""
        width={32}
        height={32}
        className="size-8 rounded-full object-cover"
      />
      <div>
        <p className="text-sm font-medium text-foreground">{author.displayName}</p>
        <p className="text-[11px] text-[#6F7979]">@{author.handle}</p>
      </div>
    </div>
  );
}

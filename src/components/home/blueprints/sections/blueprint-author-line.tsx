// TRANSPORT: props-only — the author arrives from whichever detail page rendered it.

import BlueprintAvatar from "@/components/home/blueprints/sections/blueprint-avatar";
import type { BlueprintAuthor } from "@/lib/blueprints/schemas";

/**
 * The byline all three detail layouts share. The "@" is added here, never stored on the handle.
 *
 * An account without a handle renders NO second line, rather than a bare "@" — a lone "@" reads as
 * a rendering fault, and there is nothing to link to.
 */
export default function BlueprintAuthorLine({ author }: { readonly author: BlueprintAuthor }) {
  return (
    <div className="mt-3 flex items-center gap-2">
      <BlueprintAvatar
        displayName={author.displayName}
        avatarUrl={author.avatarUrl}
        sizePx={32}
        className="size-8"
      />
      <div>
        <p className="text-sm font-medium text-foreground">{author.displayName}</p>
        {author.handle !== null && <p className="text-[11px] text-[#6F7979]">@{author.handle}</p>}
      </div>
    </div>
  );
}

// TRANSPORT: props-only — the count arrives from the showcase feed or its detail page.

import Image from "next/image";

import { formatCountLabel } from "@/lib/store/format";

/**
 * A launch's upvote count.
 *
 * A `<span>`, NEVER A BUTTON, AND THAT IS NOT AN OVERSIGHT. There is no vote endpoint on the
 * backend, and a control that incremented a number in the browser would be a business rule
 * enforced on a layer the user controls — the exact thing CLAUDE.md §1.1 forbids. When a real
 * vote route exists this becomes a button and this comment goes away; until then it displays.
 */
export default function UpvoteCount({ count }: { readonly count: number }) {
  return (
    <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
      <Image
        src="/icons/arrow_circle_up_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
        alt=""
        width={16}
        height={16}
        className="size-4"
      />
      {formatCountLabel(count)}
    </span>
  );
}

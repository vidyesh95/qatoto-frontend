// TRANSPORT: props-only — the showcase arrives from `showcase-feed-page`, which reads
// `@/lib/blueprints/api`. This component fetches nothing.

import Image from "next/image";
import Link from "next/link";

import UpvoteCount from "@/components/home/blueprints/sections/upvote-count";
import RelativeTime from "@/components/home/shared/relative-time";
import { buildBlueprintHref, type ShowcaseBlueprint } from "@/lib/blueprints/schemas";

/**
 * One launch in the feed.
 *
 * A ROW, NOT A CARD, and that is the design decision the whole surface turns on. A launch is an
 * announcement with a date, a pitch and a team — it reads down a column in chronological order.
 * A rail of thumbnails hides item five and answers no question a reader arrived with.
 *
 * Shaped after `ForumThreadRow` (`store/forum-index-page.tsx:166`), which is already a full-width
 * link with a badge line, a clamped excerpt and a composite meta line.
 *
 * THE UPVOTE PILL IS INERT — see `UpvoteCount` for why it is a `<span>`.
 */
export default function ShowcaseFeedRow({ showcase }: { showcase: ShowcaseBlueprint }) {
  return (
    <Link
      href={buildBlueprintHref(showcase)}
      className="flex gap-3 rounded-xl border border-[#CAC4D0]/60 p-3 transition-colors hover:border-[#00696E]"
    >
      <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-muted sm:size-24">
        <Image src={showcase.thumbnailUrl} alt="" fill sizes="96px" className="object-cover" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm leading-5 font-medium text-[#191C1C]">{showcase.title}</p>
            <p className="mt-0.5 text-xs leading-4 text-[#00696E]">{showcase.tagline}</p>
          </div>
          <UpvoteCount count={showcase.upvoteCount} />
        </div>

        <p className="mt-1.5 line-clamp-2 text-xs leading-4 text-[#6F7979]">{showcase.summary}</p>

        <p className="mt-2 text-[11px] leading-4 text-[#6F7979]">
          {showcase.author.displayName}
          {" · launched "}
          <RelativeTime isoInstant={showcase.launchedAt} />
          {/* `null` means it was built from something never published here — say nothing rather
              than implying a source that does not exist. */}
          {showcase.builtFromBlueprintSlug === null ? null : " · built from a teardown"}
        </p>
      </div>
    </Link>
  );
}

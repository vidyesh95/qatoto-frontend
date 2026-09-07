// TRANSPORT: props-only — the showcase arrives from `showcase-feed-page`, which reads
// `@/lib/blueprints/api`. This component fetches nothing.

import Image from "next/image";
import Link from "next/link";

import ShowcaseVoteBox from "@/components/home/blueprints/sections/showcase-vote-box";
import RelativeTime from "@/components/home/shared/relative-time";
import { buildBlueprintHref, type ShowcaseBlueprint } from "@/lib/blueprints/schemas";
import { formatIsoInstantLabel } from "@/lib/store/format";

/**
 * One launch in the feed.
 *
 * A ROW, NOT A CARD, and that is the design decision the whole surface turns on. A launch is an
 * announcement with a date, a pitch and a team — it reads down a column in chronological order.
 * A rail of thumbnails hides item five and answers no question a reader arrived with.
 *
 * Shaped after a Launch YC row (ycombinator.com/launches): no border, no background, no excerpt
 * and no hover fill — a fixed 40px vote gutter, a square-ish media slot, a title over a tagline,
 * and one meta line. The hairline border, the two-line summary and the inline upvote pill this row
 * used to carry are gone for that reason: the pill drifted with title length, the summary halved
 * the density, and the border made a card out of a row.
 *
 * ONE TEAL ELEMENT PER ROW — the author's name, where YC puts its orange company name. The tagline
 * is body ink, not accent.
 *
 * THE VOTE BOX IS A SIBLING OF THE LINK, NOT A CHILD. It is inert (see `ShowcaseVoteBox`), so it
 * stays out of the click target and out of the link's accessible name.
 *
 * `visited:` on the link greys the title — Peerlist's "seen it" affordance, for one utility.
 */
export default function ShowcaseFeedRow({ showcase }: { showcase: ShowcaseBlueprint }) {
  const visibleTags = showcase.tags.slice(0, 3);

  return (
    <article className="grid grid-cols-[40px_minmax(0,1fr)] items-center gap-x-3 sm:gap-x-4">
      <ShowcaseVoteBox count={showcase.upvoteCount} />

      <Link
        href={buildBlueprintHref(showcase)}
        className="group/launch flex min-w-0 items-center gap-x-4 text-[#191C1C] visited:text-[#6F7979] sm:gap-x-6"
      >
        <div className="relative size-14 shrink-0 overflow-hidden rounded-md bg-muted sm:size-16">
          <Image src={showcase.thumbnailUrl} alt="" fill sizes="64px" className="object-cover" />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-base leading-6 font-medium group-hover/launch:underline sm:text-lg sm:leading-7">
            {showcase.title}
          </h2>
          <p className="mt-0.5 line-clamp-2 text-sm leading-5 text-foreground/80 sm:text-base sm:leading-6">
            {showcase.tagline}
          </p>

          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-4 text-[#6F7979]">
            <Image
              src={showcase.author.avatarUrl}
              alt=""
              width={20}
              height={20}
              className="size-5 rounded-full object-cover"
            />
            <span className="font-medium text-[#00696E]">{showcase.author.displayName}</span>
            <span aria-hidden="true">·</span>
            <span title={formatIsoInstantLabel(showcase.launchedAt)}>
              <RelativeTime isoInstant={showcase.launchedAt} />
            </span>
            {/* `null` means it was built from something never published here — say nothing rather
                than implying a source that does not exist. */}
            {showcase.builtFromBlueprintSlug === null ? null : (
              <>
                <span aria-hidden="true">·</span>
                <span>built from a teardown</span>
              </>
            )}
            {/* Tags are plain text, as on YC, and only from `sm` up — on a phone the meta line has
                room for the person and the date, not a vocabulary. */}
            {visibleTags.length === 0 ? null : (
              <span aria-hidden="true" className="hidden sm:inline">
                ·
              </span>
            )}
            {visibleTags.map((tag) => (
              <span key={tag} className="hidden sm:inline">
                {tag}
              </span>
            ))}
          </p>
        </div>
      </Link>
    </article>
  );
}

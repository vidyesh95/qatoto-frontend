// TRANSPORT: props-only — the showcase arrives from `showcase-feed-page`, which reads
// `@/lib/blueprints/api`. This component fetches nothing.

import Image from "next/image";

import BlueprintAvatar from "@/components/home/blueprints/sections/blueprint-avatar";
import Link from "next/link";

import BlueprintMetaLine, {
  BlueprintMetaItem,
} from "@/components/home/blueprints/sections/blueprint-meta-line";
import ShowcaseVoteBox from "@/components/home/blueprints/sections/showcase-vote-box";
import RelativeTime from "@/components/home/shared/relative-time";
import { buildBlueprintHref, type ShowcaseBlueprint } from "@/lib/blueprints/schemas";
import { formatCountLabel, formatIsoInstantLabel } from "@/lib/store/format";

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
 * ⚠️ `ShowcaseLaunchRowPreview` COPIES THIS ROW'S MEDIA SLOT, TYPE SIZES AND META LINE for the launch
 * form's live preview, and cannot import them (it has no link, vote box or author). Change a class
 * here and change it there, or the preview stops showing what the feed will.
 *
 * ONE TEAL ELEMENT PER ROW — the author's name, where YC puts its orange company name. The tagline
 * is body ink, not accent.
 *
 * THE VOTE BOX IS A SIBLING OF THE LINK, NOT A CHILD. It is inert (see `ShowcaseVoteBox`), so it
 * stays out of the click target and out of the link's accessible name.
 *
 * ⚠️ BOTH ENGAGEMENT POSITIONS ON THIS ROW ARE RESERVED RATHER THAN BUILT, which is the whole of
 * what this row owes a future backend. The vote is a fixed 40x44 gutter holding a `<span>`; the
 * comment count is a fixed slot in the meta line. Neither is a control, no endpoint exists for
 * either, and wiring them later is a swap in place rather than a re-layout — measured, not assumed:
 * exchanging the vote `<span>` for a `<button>` carrying the same classes leaves the box at the
 * same rect, because Tailwind's preflight already strips a button's border, background and font.
 * Do not turn either into a `<button>` before the tables exist (todo.md §Blueprint engagement).
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

          {/* ⚠️ `BlueprintMetaLine`, NOT BARE FLEX SIBLINGS. At 400px this line wrapped on five of
              seven launches and left a `·` stranded at the end of the first line; the component
              records the measurement and why the fix is geometry. Every child is an item. */}
          <BlueprintMetaLine className="mt-1.5 text-[11px] leading-4 text-[#6F7979]">
            <BlueprintMetaItem hasSeparator={false}>
              <span className="flex items-center gap-x-2">
                <BlueprintAvatar
                  displayName={showcase.author.displayName}
                  avatarUrl={showcase.author.avatarUrl}
                  sizePx={20}
                  className="size-5"
                />
                <span className="font-medium text-[#00696E]">{showcase.author.displayName}</span>
              </span>
            </BlueprintMetaItem>
            <BlueprintMetaItem>
              <span title={formatIsoInstantLabel(showcase.launchedAt)}>
                <RelativeTime isoInstant={showcase.launchedAt} />
              </span>
            </BlueprintMetaItem>
            {/*
              THE COMMENT COUNT SITS HERE, IMMEDIATELY AFTER THE DATE, AND THE POSITION IS THE
              POINT. It is the last thing on this row that is FIXED — "built from a teardown" and
              the tags below it are both conditional, so anything placed after them lands in a
              different spot on every row and a reader scanning the column has to find it again
              each time. A slot that moves is not a reserved slot.

              ⚠️ INERT, AND IT IS NOT EVEN ITS OWN ELEMENT. It is text inside the row's one link,
              which already goes to the page holding the thread it counts — so it needs no
              affordance of its own and cannot become a second competing control. When a real
              per-launch anchor exists this becomes a link to it and nothing else moves.

              ZERO RENDERS NOTHING, not "0 comments". Seven of the ten fixture launches have no
              discussion and that is the ordinary state of a new launch, not a number worth
              printing. The slot is still reserved: it is in the markup, conditionally, the same
              way the two beside it are.

              EXACT, NOT COMPACT, unlike `ShowcaseVoteBox`. That one compacts because a real
              upvote count has to fit a 40px gutter; this line wraps freely, and a thread with
              12,400 comments is a number worth reading in full.
            */}
            {showcase.commentCount === 0 ? null : (
              <BlueprintMetaItem>
                <span>
                  {formatCountLabel(showcase.commentCount)}{" "}
                  {showcase.commentCount === 1 ? "comment" : "comments"}
                </span>
              </BlueprintMetaItem>
            )}
            {/* `null` means it was built from something never published here — say nothing rather
                than implying a source that does not exist. */}
            {showcase.builtFromBlueprintSlug === null ? null : (
              <BlueprintMetaItem>
                <span>built from a teardown</span>
              </BlueprintMetaItem>
            )}
            {/* Tags are plain text, as on YC, and only from `sm` up — on a phone the meta line has
                room for the person and the date, not a vocabulary. ONE dot before the run of tags,
                none between them, as before; the rest keep the blank gutter so a tag that wraps to
                the start of a line is clipped by exactly its gutter and not by its first letters. */}
            {visibleTags.map((tag, tagIndex) => (
              <BlueprintMetaItem key={tag} hasSeparator={tagIndex === 0} shouldHideBelowSm>
                <span>{tag}</span>
              </BlueprintMetaItem>
            ))}
          </BlueprintMetaLine>
        </div>
      </Link>
    </article>
  );
}

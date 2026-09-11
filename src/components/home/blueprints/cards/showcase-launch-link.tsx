// TRANSPORT: props-only — the showcase arrives from `blueprints-page`, which reads
// `@/lib/blueprints/api`. This component fetches nothing.

import Image from "next/image";
import Link from "next/link";

import BlueprintMetaLine, {
  BlueprintMetaItem,
} from "@/components/home/blueprints/sections/blueprint-meta-line";
import ShowcaseVoteBox from "@/components/home/blueprints/sections/showcase-vote-box";
import RelativeTime from "@/components/home/shared/relative-time";
import { buildBlueprintHref, type ShowcaseBlueprint } from "@/lib/blueprints/schemas";
import { formatCountLabel, formatIsoInstantLabel } from "@/lib/store/format";

/**
 * One launch in the hub's showcase lane.
 *
 * ⚠️ THE SIBLING OF `ShowcaseFeedRow`, ON THE `CaseStudyLessonLink` PRECEDENT. The feed row is sized
 * to BE the page: an `<h2>` at `text-lg` over a `text-base` tagline and a 64px media slot, which is
 * right on `/blueprints/showcase` and was wrong on the hub twice over. It put an `<h2>` under the
 * lane's own `<h2>`, and it set the loudest type on the hub in a teaser. From `xl` this lane also
 * shares a row with the case studies, where the feed row would have been twice the height of its
 * neighbour. One component with a `size` prop would have switched the heading element and every
 * type step inside it — two components wearing one name, which is the argument
 * `CaseStudyLessonLink` already records.
 *
 * THE RESERVED POSITIONS ARE KEPT, NOT RE-DECIDED. The 40x44 vote gutter is the same inert
 * `ShowcaseVoteBox`, a sibling of the link and never a child, and the comment count sits
 * immediately after the date for the reason `ShowcaseFeedRow` records: it is the last FIXED slot on
 * the line. Zero renders nothing. Neither becomes a control before the tables exist.
 *
 * NO TAGS, NO AVATAR, NO `visited:` GREY. Tags are a vocabulary for filtering and the feed is where a
 * reader filters. The visited tint is a "seen it" affordance for somebody working down a feed; on a
 * five-row teaser it made the newest launch read as disabled. The author's name stays the row's one
 * teal element.
 */
export default function ShowcaseLaunchLink({ showcase }: { showcase: ShowcaseBlueprint }) {
  return (
    <article className="grid grid-cols-[40px_minmax(0,1fr)] items-center gap-x-2">
      <ShowcaseVoteBox count={showcase.upvoteCount} />

      <Link
        href={buildBlueprintHref(showcase)}
        className="-mr-3 flex min-w-0 items-center gap-x-3 rounded-lg py-2 pr-3 pl-2 transition-colors hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E]"
      >
        <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
          <Image src={showcase.thumbnailUrl} alt="" fill sizes="48px" className="object-cover" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm leading-5 font-medium text-foreground">
            {showcase.title}
          </h3>
          <p className="line-clamp-1 text-sm leading-5 text-muted-foreground">{showcase.tagline}</p>

          {/* `BlueprintMetaLine` rather than bare flex siblings, so a wrap never leaves a `·` at
              the end of a line — the component records the measurement. */}
          <BlueprintMetaLine className="mt-0.5 text-xs leading-4 text-muted-foreground">
            <BlueprintMetaItem hasSeparator={false}>
              <span className="font-medium text-[#00696E]">{showcase.author.displayName}</span>
            </BlueprintMetaItem>
            <BlueprintMetaItem>
              <span title={formatIsoInstantLabel(showcase.launchedAt)}>
                <RelativeTime isoInstant={showcase.launchedAt} />
              </span>
            </BlueprintMetaItem>
            {showcase.commentCount === 0 ? null : (
              <BlueprintMetaItem>
                <span>
                  {formatCountLabel(showcase.commentCount)}{" "}
                  {showcase.commentCount === 1 ? "comment" : "comments"}
                </span>
              </BlueprintMetaItem>
            )}
            {/* The one link between arms on this row, so it stays; from `sm` up only, because on a
                phone the line has room for the person and the date. `null` says nothing rather than
                implying a source that was never published here. */}
            {showcase.builtFromBlueprintSlug === null ? null : (
              <BlueprintMetaItem shouldHideBelowSm>
                <span>built from a teardown</span>
              </BlueprintMetaItem>
            )}
          </BlueprintMetaLine>
        </div>
      </Link>
    </article>
  );
}

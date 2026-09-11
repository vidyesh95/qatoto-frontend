// TRANSPORT: mock — async server component. Reads `getBlueprintByCategory` from
// `@/lib/blueprints/api`, which serves fixtures from `@/mocks/blueprints-mocks`.
//
// Laid out after a Launch YC post: the upvote in a left gutter beside the head of the launch (the
// name, the pitch, and the byline with Share), then the square heading image, the summary, the
// Markdown write-up with its videos and images, the people, the links and the discussion.
//
// THE UPVOTE IS BACK IN THE GUTTER, AS `ShowcaseVoteBox`, THE SAME SHAPE THE FEED ROW USES. It spent
// a while as a pill in an engagement row under the pitch, beside a comment count and Share; that row
// is gone. The count now sits where a reader who clicked through from the feed just saw it, the
// comment count moved into the byline as a link to the thread, and Share sits at the end of the
// byline. It is still a `<span>`: there is no vote route, and a vote box that looked clickable and
// did nothing would be the ghost control this surface refuses.
//
// SHARE IS THE FULL SHEET, not the single X intent link this page used to build itself. The reason
// recorded for that link ruled out a share COUNTER, not the sheet — and `ShareSheet` takes
// `onShared` as optional precisely so a surface with no counter route can open it. Omitting the
// callback is what keeps the rule: nothing here increments.
//
// THE DISCUSSION IS READ-ONLY, AND `BlueprintCommentThread` says why at length. Short version: no
// blueprints content table exists for a comment row to reference, so there is nothing to post to.

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import BlueprintCommentThread from "@/components/home/blueprints/sections/blueprint-comment-thread";
import BlueprintShareButton from "@/components/home/blueprints/sections/blueprint-share-button";
import BlueprintTagList from "@/components/home/blueprints/sections/blueprint-tag-list";
import ShowcaseVoteBox from "@/components/home/blueprints/sections/showcase-vote-box";
import ShowcaseWriteUp from "@/components/home/blueprints/showcase/sections/showcase-write-up";
import RelativeTime from "@/components/home/shared/relative-time";
import { getBlueprintByCategory, listShowcaseComments } from "@/lib/blueprints/api";
import { buildBlueprintCategoryHref, buildBlueprintHref } from "@/lib/blueprints/schemas";
import { formatCountLabel, formatIsoInstantLabel } from "@/lib/store/format";

export default async function ShowcaseDetailPage({ slug }: { slug: string }) {
  // ALONGSIDE, NOT AFTER — the waterfall argument `watch-page.tsx:42-45` records. The thread is
  // keyed by the slug this component was already handed, so it does not need the launch to resolve
  // first. A thread read for a slug that turns out not to be a showcase costs one wasted fixture
  // pass and is discarded by the `notFound()` below; the serial version costs a round trip on every
  // page that does resolve.
  const [showcase, comments] = await Promise.all([
    getBlueprintByCategory("showcase", slug),
    listShowcaseComments(slug),
  ]);
  if (showcase === null) notFound();

  const hasActionLinks = showcase.callToAction !== null || showcase.builtFromBlueprintSlug !== null;

  return (
    <article className="px-4 pt-5 pb-12 lg:px-6">
      {/* THE HEAD OF THE LAUNCH, IN A 40px GUTTER GRID. The vote box holds the gutter; the column
          beside it holds the name, the pitch and the byline with Share. The body and footer below are
          indented by the same 52px (56px from `lg`, where the gap grows) so the whole launch reads
          down one left edge, the title's. */}
      <header className="grid grid-cols-[40px_minmax(0,1fr)] gap-x-3 lg:gap-x-4">
        <ShowcaseVoteBox count={showcase.upvoteCount} />

        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-[0.5px] text-[#00696E] uppercase">
            Showcase
          </p>
          <h1 className="mt-1 text-2xl font-medium tracking-tight text-foreground lg:text-3xl">
            {showcase.title}
          </h1>
          <p className="mt-2 max-w-2xl text-base leading-6 text-foreground/80">
            {showcase.tagline}
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-[#CAC4D0]/60 pb-3">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#6F7979]">
              <Image
                src={showcase.author.avatarUrl}
                alt=""
                width={24}
                height={24}
                className="size-6 rounded-full object-cover"
              />
              <span className="font-medium text-foreground">{showcase.author.displayName}</span>
              {/* EACH SEPARATOR TRAVELS WITH THE ITEM AFTER IT, in one non-wrapping span, so a
                  narrow screen wraps "· 7 comments" as a unit instead of stranding a dot at the end
                  of the line above. */}
              <span className="inline-flex items-center gap-2 whitespace-nowrap">
                <span aria-hidden="true">·</span>
                {/* Relative, with the absolute instant in the tooltip — the Launch YC pattern. */}
                <span>
                  Launched{" "}
                  <span title={formatIsoInstantLabel(showcase.launchedAt)}>
                    <RelativeTime isoInstant={showcase.launchedAt} />
                  </span>
                </span>
              </span>
              {/* THE COMMENT COUNT IS A LINK TO THE THREAD IT COUNTS, further down this page. Zero
                  renders nothing, not "0 comments": most new launches have no discussion yet. */}
              {showcase.commentCount === 0 ? null : (
                <span className="inline-flex items-center gap-2 whitespace-nowrap">
                  <span aria-hidden="true">·</span>
                  <a
                    href="#discussion"
                    className="rounded-sm hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E]"
                  >
                    {formatCountLabel(showcase.commentCount)}{" "}
                    {showcase.commentCount === 1 ? "comment" : "comments"}
                  </a>
                </span>
              )}
            </p>
            <BlueprintShareButton blueprint={showcase} variant="inline" />
          </div>
        </div>
      </header>

      {/*
        FROM 1440px THE LAUNCH SPLITS INTO A READING COLUMN AND A RAIL. As one column it left ~300px
        of empty ground to the right of the media, beside a header rule that ran the full width. The
        column is capped at 48rem, which is exactly the `max-w-3xl` every video and image in the
        write-up already has, so media keeps its size AND its shape; only the ground beside it is
        used. Links, team and tags move into the rail, which sticks while the column scrolls.

        ⚠️ THE BREAKPOINT AND THE RAIL WIDTH ARE ARITHMETIC, NOT TASTE. With the sidebar open at 1440
        the article has 1072px, the gutter indent takes 56 and leaves 1016, which is exactly the 768px
        column plus a 24px gap plus a 14rem (224px) rail. It was 1400px with a 16rem rail and a 32px
        gap before the body took the indent; kept, that would squeeze the media below 768px, and this
        surface does not resize or reshape its media to make room.
        BELOW `sm` THERE IS NO INDENT: at 400px the gutter would take 52px out of a 368px column.

        DOM ORDER IS THE PHONE ORDER: summary, write-up, links, team, tags, discussion. The grid only
        places those blocks side by side; it never reorders them, so a screen reader and a narrow
        screen read the page in the same order.
      */}
      <div className="min-[1440px]:grid min-[1440px]:grid-cols-[minmax(0,48rem)_minmax(14rem,1fr)] min-[1440px]:gap-x-6 sm:pl-[52px] lg:pl-[56px]">
        <div className="min-w-0 min-[1440px]:col-start-1 min-[1440px]:row-start-1">
          {/* THE SQUARE HEADING IMAGE OPENS THE READING COLUMN, under the byline rule, at the same
              size and shape the feed row shows. It sits inside the column rather than above the
              grid, so from 1440px the rail's top lines up with it. `alt=""` because it illustrates
              the launch named just above; `priority` because it is still the first image on the
              page. */}
          <div className="relative mt-5 size-12 overflow-hidden rounded-lg bg-muted lg:size-18">
            <Image
              src={showcase.thumbnailUrl}
              alt=""
              fill
              sizes="(min-width: 1024px) 72px, 48px"
              priority
              className="object-cover"
            />
          </div>

          {/* THE STANDFIRST. Three description-ish fields sit on this arm — `tagline` in the head,
              `summary` here, `writeUp` below — and the summary is a size up from the write-up so
              the two do not read as one paragraph that got long. */}
          <p className="mt-5 max-w-2xl text-base leading-7 text-foreground">{showcase.summary}</p>

          {/* NO WRITE-UP RENDERS NO WRITE-UP: no heading, no empty box, no invitation to write one.
              Most launches are posted the day they ship and never get one. */}
          {showcase.writeUp === null ? null : <ShowcaseWriteUp markdown={showcase.writeUp} />}
        </div>

        <aside
          aria-label="About this launch"
          className="min-w-0 min-[1440px]:sticky min-[1440px]:top-20 min-[1440px]:col-start-2 min-[1440px]:row-span-2 min-[1440px]:row-start-1 min-[1440px]:self-start"
        >
          {/* Both links are optional and both render nothing when absent — the row only exists so the
          two sit side by side when both are present. */}
          {hasActionLinks ? (
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
              {showcase.callToAction === null ? null : (
                <a
                  href={showcase.callToAction.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white"
                >
                  {showcase.callToAction.label}
                </a>
              )}
              {/* `null` means it was built from something never published here — say nothing rather
              than linking a slug that resolves to a 404. */}
              {showcase.builtFromBlueprintSlug === null ? null : (
                <Link
                  href={buildBlueprintHref({
                    category: "teardown",
                    slug: showcase.builtFromBlueprintSlug,
                  })}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-[#00696E] hover:underline"
                >
                  Built from this teardown
                  <Image
                    src="/icons/arrow_forward_ios_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                    alt=""
                    width={14}
                    height={14}
                    className="size-3.5"
                  />
                </Link>
              )}
            </div>
          ) : null}

          {/* A launch always has at least one person on it, but the empty guard costs one line and a
          team-less row would otherwise render a bare heading. */}
          {showcase.team.length === 0 ? null : (
            <section className="mt-8">
              <h2 className="text-sm font-medium text-foreground">Team</h2>
              {/* A row on a narrow screen, a column in the rail, where 14rem holds one person per line
              and a wrapped row would strand the second name under the first avatar. */}
              <ul className="mt-2 flex flex-wrap gap-4 min-[1440px]:flex-col min-[1440px]:gap-3">
                {showcase.team.map((member) => (
                  <li key={member.handle} className="flex items-center gap-2">
                    <Image
                      src={member.avatarUrl}
                      alt=""
                      width={32}
                      height={32}
                      className="size-8 rounded-full object-cover"
                    />
                    <div>
                      <p className="text-sm text-foreground">{member.displayName}</p>
                      <p className="text-[11px] text-[#6F7979]">{member.role}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <BlueprintTagList tags={showcase.tags} />
        </aside>

        <div className="min-w-0 min-[1440px]:col-start-1 min-[1440px]:row-start-2">
          <BlueprintCommentThread comments={comments} />
        </div>
      </div>

      <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-[#CAC4D0]/60 pt-4 sm:ml-[52px] lg:ml-[56px]">
        {/* VIEWS ONLY. `likeCount` is a field every blueprint shares, and teardowns and case studies
            still print it, but a launch's approval number is its upvote, in the gutter at the top.
            Printing likes here as well asked a reader to tell two approval numbers apart. */}
        <p className="text-[11px] text-[#6F7979]">{formatCountLabel(showcase.viewCount)} views</p>
        <Link
          href={buildBlueprintCategoryHref("showcase")}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#00696E] hover:underline"
        >
          See all launches
          <Image
            src="/icons/arrow_forward_ios_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt=""
            width={14}
            height={14}
            className="size-3.5"
          />
        </Link>
      </footer>
    </article>
  );
}

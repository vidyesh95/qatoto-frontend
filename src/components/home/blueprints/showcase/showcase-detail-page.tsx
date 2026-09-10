// TRANSPORT: mock — async server component. Reads `getBlueprintByCategory` from
// `@/lib/blueprints/api`, which serves fixtures from `@/mocks/blueprints-mocks`.
//
// Laid out after a Launch YC post: title block, byline row, the media, the pitch, the engagement
// row, then the people, the links and the discussion.
//
// THE VOTE NO LONGER SITS IN A GUTTER BESIDE THE TITLE. It did — a 40px column holding
// `ShowcaseVoteBox`, mirroring the feed row — until the upvote moved into `ShowcaseEngagementBar`
// beneath the pitch. Keeping both would print `upvoteCount` twice on one page. The feed row keeps
// the gutter box, which is where that shape earns its place.
//
// SHARE IS THE FULL SHEET, not the single X intent link this page used to build itself. The reason
// recorded for that link ruled out a share COUNTER, not the sheet — and `ShareSheet` takes
// `onShared` as optional precisely so a surface with no counter route can open it. Omitting the
// callback is what keeps the rule: nothing here increments.
//
// IT LIVES IN `ShowcaseEngagementBar` NOW, not in the byline. It sat inline beside the launch date
// while it was the page's only engagement control; once the comment and like counts needed
// somewhere to render, one row holding all three beat a share link in one place and two counts in
// the footer. The teardown page has the same bar in the same position, so a reader moving between
// two sibling detail pages finds the same shape twice.
//
// THE DISCUSSION IS READ-ONLY, AND `BlueprintCommentThread` says why at length. Short version: no
// blueprints content table exists for a comment row to reference, so there is nothing to post to.

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import BlueprintVideoBlock from "@/components/home/blueprints/media/blueprint-video-block";
import BlueprintCommentThread from "@/components/home/blueprints/sections/blueprint-comment-thread";
import BlueprintTagList from "@/components/home/blueprints/sections/blueprint-tag-list";
import ShowcaseEngagementBar from "@/components/home/blueprints/showcase/sections/showcase-engagement-bar";
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
      {/* NO VOTE GUTTER HERE ANY MORE. This was a `grid-cols-[40px_minmax(0,1fr)]` with
          `ShowcaseVoteBox` in the 40px column, mirroring the feed row so the vote sat where a
          reader had just seen it. The upvote moved into `ShowcaseEngagementBar` below, and keeping
          the gutter too would print `upvoteCount` twice on one page. The feed row still uses the
          box — that is the list shape and nothing there competes with it. */}
      <div className="min-w-0">
        <p className="text-[11px] font-medium tracking-[0.5px] text-[#00696E] uppercase">
          Showcase
        </p>
        <h1 className="mt-1 text-2xl font-medium tracking-tight text-foreground lg:text-3xl">
          {showcase.title}
        </h1>
        <p className="mt-2 max-w-2xl text-base leading-6 text-foreground/80">{showcase.tagline}</p>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-[#CAC4D0]/60 pb-3">
        <p className="flex items-center gap-2 text-xs text-[#6F7979]">
          <Image
            src={showcase.author.avatarUrl}
            alt=""
            width={24}
            height={24}
            className="size-6 rounded-full object-cover"
          />
          <span className="font-medium text-foreground">{showcase.author.displayName}</span>
          <span aria-hidden="true">·</span>
          {/* Relative, with the absolute instant in the tooltip — the Launch YC pattern. This
              replaced `formatIsoDateLabel(launchedAt)`, which splits a DATE on "-" and rendered a
              full instant as "Aug NaN, 2026". */}
          <span>
            Launched{" "}
            <span title={formatIsoInstantLabel(showcase.launchedAt)}>
              <RelativeTime isoInstant={showcase.launchedAt} />
            </span>
          </span>
        </p>
      </div>

      {showcase.demoVideo === null ? (
        <div className="relative mt-5 aspect-video max-w-3xl overflow-hidden rounded-xl bg-muted">
          <Image
            src={showcase.thumbnailUrl}
            alt={showcase.title}
            fill
            sizes="(min-width: 768px) 768px, 100vw"
            priority
            className="object-cover"
          />
        </div>
      ) : (
        <BlueprintVideoBlock video={showcase.demoVideo} title="Demo" />
      )}

      {/* THE STANDFIRST, AND IT MOVED UP A SIZE WHEN THE WRITE-UP LANDED UNDER IT. Three
          description-ish fields now sit on this arm — `tagline` above the media, `summary` here,
          `writeUp` below — and at one size the last two read as a single paragraph that got long.
          `text-base` is not a new size on this surface: the tagline and the feed row already use
          it, and the media between them means the two never appear adjacent. */}
      <p className="mt-5 max-w-2xl text-base leading-7 text-foreground">{showcase.summary}</p>

      {/* `null` renders NOTHING — no heading, no empty box, no invitation to write one. Most
          launches are posted the day they ship and never get a write-up, which is the ordinary
          state and not a gap to fill. */}
      {/* ⚠️ KEYED BY SLUG ON PURPOSE. Two showcase pages are the same component tree in the same
          position, so React reuses the instance across a client navigation and the write-up would
          arrive as a changed prop on a component still holding the previous launch's overflow
          measurement. The key makes it a new instance, which is what `showcase-write-up.tsx`
          relies on instead of an effect dependency. */}
      {showcase.writeUp === null ? null : (
        <ShowcaseWriteUp key={showcase.slug} writeUp={showcase.writeUp} />
      )}

      <ShowcaseEngagementBar showcase={showcase} />

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
          <ul className="mt-2 flex flex-wrap gap-4">
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

      <BlueprintCommentThread comments={comments} />

      <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-[#CAC4D0]/60 pt-4">
        {/* `likeCount` is BACK HERE, quietly, because the upvote took its slot in the engagement bar
            and a shared field with no renderer is unverified code. Two approval numbers in one row
            would also be one too many to ask a reader to tell apart — the upvote is the one that
            means something on a launch. */}
        <p className="text-[11px] text-[#6F7979]">
          {formatCountLabel(showcase.viewCount)} views · {formatCountLabel(showcase.likeCount)}{" "}
          likes
        </p>
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

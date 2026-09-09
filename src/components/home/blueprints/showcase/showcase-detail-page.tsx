// TRANSPORT: mock — async server component. Reads `getBlueprintByCategory` from
// `@/lib/blueprints/api`, which serves fixtures from `@/mocks/blueprints-mocks`.
//
// Laid out after a Launch YC post: the vote in a fixed gutter beside the title block, a byline row
// with a share control, the media, the pitch, then the people and the links.
//
// SHARE IS THE FULL SHEET NOW, not the single X intent link this page used to build itself. The
// reason recorded for that link ruled out a share COUNTER, not the sheet — and `ShareSheet` takes
// `onShared` as optional precisely so a surface with no counter route can open it. Omitting the
// callback is what keeps the rule: nothing here increments. The teardown page opens the same
// component, so two sibling detail pages no longer offer two different share affordances.

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import BlueprintVideoBlock from "@/components/home/blueprints/media/blueprint-video-block";
import BlueprintShareButton from "@/components/home/blueprints/sections/blueprint-share-button";
import BlueprintTagList from "@/components/home/blueprints/sections/blueprint-tag-list";
import ShowcaseVoteBox from "@/components/home/blueprints/sections/showcase-vote-box";
import RelativeTime from "@/components/home/shared/relative-time";
import { getBlueprintByCategory } from "@/lib/blueprints/api";
import { buildBlueprintCategoryHref, buildBlueprintHref } from "@/lib/blueprints/schemas";
import { formatCountLabel, formatIsoInstantLabel } from "@/lib/store/format";

export default async function ShowcaseDetailPage({ slug }: { slug: string }) {
  const showcase = await getBlueprintByCategory("showcase", slug);
  if (showcase === null) notFound();

  const hasActionLinks = showcase.callToAction !== null || showcase.builtFromBlueprintSlug !== null;

  return (
    <article className="px-4 pt-5 pb-12 lg:px-6">
      {/* The same 40px gutter the feed uses, so the vote sits where a reader just saw it. YC pulls
          its vote into the left page margin; the `(home)` main column has no margin to pull into,
          so it is in flow, and only the title block shares the gutter. */}
      <div className="grid grid-cols-[40px_minmax(0,1fr)] items-start gap-x-3 sm:gap-x-4">
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
        </div>
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
        <BlueprintShareButton blueprint={showcase} variant="inline" />
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

      <p className="mt-5 max-w-2xl text-sm leading-6 text-foreground">{showcase.summary}</p>

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

      <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-[#CAC4D0]/60 pt-4">
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

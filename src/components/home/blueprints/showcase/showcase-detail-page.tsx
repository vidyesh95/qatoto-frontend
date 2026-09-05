// TRANSPORT: mock — async server component. Reads `getBlueprintByCategory` from
// `@/lib/blueprints/api`, which serves fixtures from `@/mocks/blueprints-mocks`.

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import BlueprintVideoBlock from "@/components/home/blueprints/media/blueprint-video-block";
import BlueprintTagList from "@/components/home/blueprints/sections/blueprint-tag-list";
import UpvoteCount from "@/components/home/blueprints/sections/upvote-count";
import { getBlueprintByCategory } from "@/lib/blueprints/api";
import { buildBlueprintHref } from "@/lib/blueprints/schemas";
import { formatCountLabel, formatIsoDateLabel } from "@/lib/store/format";

export default async function ShowcaseDetailPage({ slug }: { slug: string }) {
  const showcase = await getBlueprintByCategory("showcase", slug);
  if (showcase === null) notFound();

  return (
    <article className="px-4 pt-5 pb-12 lg:px-6">
      <p className="text-[11px] font-medium tracking-[0.5px] text-[#00696E] uppercase">Showcase</p>
      <h1 className="mt-1 text-xl font-medium text-foreground lg:text-2xl">{showcase.title}</h1>
      <p className="mt-1.5 max-w-2xl text-sm leading-5 text-[#6F7979]">{showcase.tagline}</p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <UpvoteCount count={showcase.upvoteCount} />
        <p className="text-[11px] text-[#6F7979]">
          Launched {formatIsoDateLabel(showcase.launchedAt)}
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

      <p className="mt-5 max-w-2xl text-sm leading-6 text-foreground">{showcase.summary}</p>

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

      {/* `null` means it was built from something never published here — say nothing rather than
          linking a slug that resolves to a 404. */}
      {showcase.builtFromBlueprintSlug === null ? null : (
        <Link
          href={buildBlueprintHref({
            category: "teardown",
            slug: showcase.builtFromBlueprintSlug,
          })}
          className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-[#00696E] hover:underline"
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

      {showcase.callToAction === null ? null : (
        <p className="mt-6">
          <a
            href={showcase.callToAction.url}
            target="_blank"
            rel="noreferrer"
            className="inline-block rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white"
          >
            {showcase.callToAction.label}
          </a>
        </p>
      )}

      <BlueprintTagList tags={showcase.tags} />

      <p className="mt-6 text-[11px] text-[#6F7979]">
        {formatCountLabel(showcase.viewCount)} views · {formatCountLabel(showcase.likeCount)} likes
      </p>
    </article>
  );
}

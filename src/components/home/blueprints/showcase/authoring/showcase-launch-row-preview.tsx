// TRANSPORT: props-only — renders a launch that does not exist yet from the form's own values.

import Image from "next/image";

import BlueprintMetaLine, {
  BlueprintMetaItem,
} from "@/components/home/blueprints/sections/blueprint-meta-line";
import RelativeTime from "@/components/home/shared/relative-time";

/**
 * How the launch being written will look in the showcase feed.
 *
 * ⚠️ A SEPARATE COMPONENT FROM `ShowcaseFeedRow`, AND IT MUST BE KEPT IN STEP WITH IT BY HAND. The
 * feed row takes a whole `ShowcaseBlueprint`, is one link, carries the inert vote box and an author
 * byline, and renders its title as an `<h2>`. A preview of a draft has none of those: there is no page
 * to link to, no vote count, no author until the server stamps one, and it sits inside a form with its
 * own headings. Folding both into one component would have meant five props on a row CLAUDE.md
 * documents closely, which is the argument `showcase-launch-link.tsx` already records against a `size`
 * prop. The media slot, type sizes and meta line below copy the feed row's classes; change one and
 * change the other.
 *
 * ⚠️ PLACEHOLDER TEXT IS VISIBLY A PLACEHOLDER (muted, and phrased as "your …"), so an empty preview
 * cannot be read as a launch that exists.
 */
export default function ShowcaseLaunchRowPreview({
  title,
  tagline,
  headingImageUrl,
  launchedAtIsoInstant,
  isBuiltFromTeardown,
  tags,
}: {
  readonly title: string;
  readonly tagline: string;
  /** An object URL for the picked image, or `null` before one passes. */
  readonly headingImageUrl: string | null;
  /** `null` means "today": the form's empty date, which is only turned into an instant at post time. */
  readonly launchedAtIsoInstant: string | null;
  readonly isBuiltFromTeardown: boolean;
  readonly tags: readonly string[];
}) {
  const visibleTags = tags.slice(0, 3);

  return (
    <div className="flex min-w-0 items-center gap-x-4 sm:gap-x-6">
      <div className="relative size-14 shrink-0 overflow-hidden rounded-md bg-muted sm:size-16">
        {headingImageUrl === null ? null : (
          <Image
            src={headingImageUrl}
            alt=""
            fill
            sizes="64px"
            unoptimized
            className="object-cover"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-base leading-6 font-medium text-[#191C1C] sm:text-lg sm:leading-7">
          {title.trim() === "" ? (
            <span className="text-muted-foreground">Your launch name</span>
          ) : (
            title
          )}
        </p>
        <p className="mt-0.5 line-clamp-2 text-sm leading-5 text-foreground/80 sm:text-base sm:leading-6">
          {tagline.trim() === "" ? (
            <span className="text-muted-foreground">Your one-line pitch</span>
          ) : (
            tagline
          )}
        </p>

        <BlueprintMetaLine className="mt-1.5 text-[11px] leading-4 text-[#6F7979]">
          <BlueprintMetaItem hasSeparator={false}>
            <span>
              {launchedAtIsoInstant === null ? (
                "today"
              ) : (
                <RelativeTime isoInstant={launchedAtIsoInstant} />
              )}
            </span>
          </BlueprintMetaItem>
          {isBuiltFromTeardown ? (
            <BlueprintMetaItem>
              <span>built from a teardown</span>
            </BlueprintMetaItem>
          ) : null}
          {visibleTags.map((tag, tagIndex) => (
            <BlueprintMetaItem key={tag} hasSeparator={tagIndex === 0} shouldHideBelowSm>
              <span>{tag}</span>
            </BlueprintMetaItem>
          ))}
        </BlueprintMetaLine>
      </div>
    </div>
  );
}

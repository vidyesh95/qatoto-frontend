// TRANSPORT: props-only — the write-up and its image sizes arrive on the showcase from
// `getBlueprintByCategory`, or from the launch form's own text while a maker previews it.
//
// A LAUNCH WRITE-UP IS GITHUB-STYLE MARKDOWN, the Launch YC and README shape: headings, emphasis,
// lists, links, code, tables, images, and a YouTube link on a line of its own becomes the video.
//
// ⚠️ USER-WRITTEN MARKDOWN ON A THIN, UNTRUSTED LAYER, SO EVERY ESCAPE HATCH IS SHUT HERE:
// - `skipHtml`: raw HTML in the source is dropped, never rendered and never escaped into view.
//   There is no `rehype-raw` and no `dangerouslySetInnerHTML` on this path, and none may be added.
// - `allowedElements`: anything markdown can produce outside the list (task-list checkboxes,
//   footnote sections) is unwrapped to its text rather than rendered.
// - `urlTransform`: a link or image address is kept only when it is http(s), site-relative or an
//   in-page anchor, so `javascript:` and `data:` cannot reach an `href` or a `src`.
// - Images render only from where Qatoto stores uploads. An image hosted anywhere else would make
//   every reader's browser call that host, the reason GitHub proxies README images, and
//   `next/image` refuses unknown hosts anyway. Such an image shows a one-line note instead.
//
// ⚠️ MEDIA SITS IN ONE COLUMN AND RESERVES ITS SPACE. Videos and images share
// `BLUEPRINT_MEDIA_COLUMN_CLASS`, so an image may run as wide as a video rather than stopping at the
// prose measure. A video fills that column; an image is only CAPPED by it. It renders at its upload's
// own width, shrinks when that is wider than the column, and is never enlarged or cropped, the Launch
// YC and GitHub README behavior (both measured: `max-width: 100%` and no width). A small screenshot
// therefore stays small and sharp instead of being stretched blurry across 768px. Every image renders
// with the width and height its upload recorded (the launch's `writeUpImages`) and a matching
// `aspect-ratio`, so its box exists before the file arrives and the text below never jumps as a
// reader scrolls to it.
//
// ⚠️ AN IMAGE WITH NO RECORDED SIZE IS NOT SHOWN, exactly like an image from another host. Its only
// source is a maker typing a path by hand, which is not an upload, and rendering it anyway was the
// one path left that could still shift the page. Published launches never reach it: the backend
// refuses to store a write-up image it has no size for (`todo.md`, Part 2b).
//
// REJECTED WAYS TO STOP THE JUMP, so they are not re-proposed:
// - A fixed-shape box for every image needs no stored data, but it letterboxes or crops every image
//   that is not that shape, and this surface does not reshape a maker's media to fit a layout.
// - Putting the size in the image address or its Markdown title keeps the numbers in text the maker
//   edits, so they can be wrong, and a wrong size is a distorted or jumping image.
// - A blurred low-resolution placeholder ON ITS OWN does not fix the jump; it still needs the size
//   to hold its box. So the blur is layered ON TOP of the stored sizes instead: the box is reserved
//   by width, height and `aspect-ratio`, and the image's server-made `blurDataUrl` fills that box
//   until the real file arrives.
//
// ⚠️ NO "…more" CROP. With videos and images inline, a crop would hide the most convincing part of a
// launch behind a button, so the write-up renders whole, the way a README does.
//
// NO `"use client"` DIRECTIVE. There are no hooks here: the detail page renders it on the server and
// the launch form renders it in its preview tab, the same both-trees arrangement `LinkedPlainText`
// records. The video block is its own client island.

import Image from "next/image";
import Markdown, { defaultUrlTransform, type Components, type ExtraProps } from "react-markdown";
import remarkGfm from "remark-gfm";

import { buildYoutubeBlueprintVideo } from "@/components/home/blueprints/authoring/youtube-link-field";
import BlueprintVideoBlock from "@/components/home/blueprints/media/blueprint-video-block";
import { BLUEPRINT_MEDIA_COLUMN_CLASS } from "@/components/home/blueprints/media/media-column";
import type { BlueprintWriteUpImage } from "@/lib/blueprints/schemas";
import {
  deepestWriteUpNestingDepth,
  MAX_SHOWCASE_WRITE_UP_NESTING_DEPTH,
} from "@/lib/blueprints/showcase-write-up-nesting";

/** The elements a write-up may produce. Everything else is unwrapped to its text. */
const ALLOWED_WRITE_UP_ELEMENTS = [
  "p",
  "a",
  "strong",
  "em",
  "del",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "blockquote",
  "code",
  "pre",
  "hr",
  "br",
  "img",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
];

const SAFE_URL_PATTERN = /^(https?:\/\/|\/(?!\/)|#)/i;

/** Keeps http(s), site-relative and in-page addresses; anything else becomes an empty string. */
function keepOnlyWebAddresses(url: string): string {
  const transformedUrl = defaultUrlTransform(url);
  return SAFE_URL_PATTERN.test(transformedUrl) ? transformedUrl : "";
}

/**
 * Whether an image address points at storage Qatoto controls: a site-relative file, or an upload in
 * Cloudinary, the host `next.config.ts` already allows for everything the backend uploads.
 */
function isUploadedImageAddress(imageAddress: string): boolean {
  if (imageAddress.startsWith("/") && !imageAddress.startsWith("//")) return true;
  try {
    const parsedAddress = new URL(imageAddress);
    return parsedAddress.protocol === "https:" && parsedAddress.hostname === "res.cloudinary.com";
  } catch {
    return false;
  }
}

/**
 * The first image or embedded video in the write-up that will actually render, in source order.
 *
 * ⚠️ IT EXISTS FOR THE LARGEST CONTENTFUL PAINT. At desktop width the first media in a write-up
 * starts inside the first viewport and out-paints the text around it, so it loads eagerly; every
 * later one stays lazy. An image with no recorded size is skipped, because it renders as a note and
 * the eager load belongs to the next media that does render. Found by scanning the source rather
 * than by counting inside the renderers, because a counter mutated during render is the thing the
 * React Compiler refuses. A line-based scan can be fooled by a link inside a code block, and the
 * cost of that is one lazy poster, not a bug.
 */
type FirstWriteUpMedia =
  | { readonly kind: "none" }
  | { readonly kind: "video"; readonly youtubeVideoId: string }
  | { readonly kind: "image"; readonly imageAddress: string };

const MARKDOWN_IMAGE_PATTERN = /!\[[^\]]*\]\(\s*<?([^\s)>]+)/;

function findFirstWriteUpMedia(
  markdown: string,
  imageSizeByAddress: ReadonlyMap<string, BlueprintWriteUpImage>,
): FirstWriteUpMedia {
  for (const sourceLine of markdown.split("\n")) {
    const trimmedLine = sourceLine.trim();

    const imageAddress = MARKDOWN_IMAGE_PATTERN.exec(trimmedLine)?.[1];
    if (imageAddress !== undefined && imageSizeByAddress.has(imageAddress)) {
      return { kind: "image", imageAddress };
    }

    const bareLink = trimmedLine.replace(/^<|>$/g, "");
    if (bareLink !== "" && !/\s/.test(bareLink)) {
      const video = buildYoutubeBlueprintVideo(bareLink);
      if (video !== null) return { kind: "video", youtubeVideoId: video.youtubeVideoId };
    }
  }
  return { kind: "none" };
}

/** A paragraph's children, ignoring whitespace-only text between them. */
function readMeaningfulChildren(paragraphNode: NonNullable<ExtraProps["node"]>) {
  return paragraphNode.children.filter(
    (childNode) => !(childNode.type === "text" && childNode.value.trim() === ""),
  );
}

/**
 * The YouTube id when a paragraph is nothing but one pasted link, the README convention for "put the
 * video here". A sentence that merely links a word to YouTube stays a link: only a link whose visible
 * text is its own address counts as pasted.
 */
function readStandaloneYoutubeVideoId(paragraphNode: ExtraProps["node"]): string | null {
  if (paragraphNode === undefined) return null;

  const meaningfulChildren = readMeaningfulChildren(paragraphNode);
  const onlyChild = meaningfulChildren.length === 1 ? meaningfulChildren[0] : undefined;
  if (onlyChild === undefined || onlyChild.type !== "element" || onlyChild.tagName !== "a") {
    return null;
  }

  const linkAddress = onlyChild.properties.href;
  if (typeof linkAddress !== "string") return null;

  const visibleLinkText = onlyChild.children
    .map((childNode) => (childNode.type === "text" ? childNode.value : ""))
    .join("")
    .trim();
  const addressWithoutScheme = linkAddress.replace(/^https?:\/\//i, "");
  if (visibleLinkText !== linkAddress && visibleLinkText !== addressWithoutScheme) return null;

  return buildYoutubeBlueprintVideo(linkAddress)?.youtubeVideoId ?? null;
}

/**
 * Whether a paragraph is nothing but one image. Such a paragraph is a media block: it leaves the prose
 * measure and takes the media column, the same width a video gets.
 */
function isStandaloneImageParagraph(paragraphNode: ExtraProps["node"]): boolean {
  if (paragraphNode === undefined) return false;
  const meaningfulChildren = readMeaningfulChildren(paragraphNode);
  const onlyChild = meaningfulChildren.length === 1 ? meaningfulChildren[0] : undefined;
  return onlyChild !== undefined && onlyChild.type === "element" && onlyChild.tagName === "img";
}

/**
 * THE HEADING LEVELS SHIFT DOWN ONE. The page already has its `<h1>` (the launch name) and its own
 * `<h2>` sections, so a maker's `#` becomes an `<h2>` and everything deeper an `<h3>`. Two sizes, the
 * product's two, rather than a six-step scale inside one write-up.
 */
const MAJOR_HEADING_CLASS = "max-w-prose pt-2 text-base font-semibold text-foreground";
const MINOR_HEADING_CLASS = "max-w-prose pt-1 text-sm font-semibold text-foreground";

/** The renderers that never depend on the first media or on image sizes. */
const STATIC_WRITE_UP_COMPONENTS: Components = {
  a: ({ href, children }) =>
    // A LINK WHOSE ADDRESS THE URL TRANSFORM STRIPPED (a `javascript:` link, say) IS PLAIN TEXT. An
    // `<a href="">` would still look clickable and would reload the page when pressed.
    href === undefined || href === "" ? (
      <span>{children}</span>
    ) : (
      // `nofollow ugc` because a maker wrote this link, not Qatoto.
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer nofollow ugc"
        className="font-medium text-[#00696E] underline underline-offset-2 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E]"
      >
        {children}
      </a>
    ),
  h1: ({ children }) => <h2 className={MAJOR_HEADING_CLASS}>{children}</h2>,
  h2: ({ children }) => <h2 className={MAJOR_HEADING_CLASS}>{children}</h2>,
  h3: ({ children }) => <h3 className={MINOR_HEADING_CLASS}>{children}</h3>,
  h4: ({ children }) => <h3 className={MINOR_HEADING_CLASS}>{children}</h3>,
  h5: ({ children }) => <h3 className={MINOR_HEADING_CLASS}>{children}</h3>,
  h6: ({ children }) => <h3 className={MINOR_HEADING_CLASS}>{children}</h3>,
  ul: ({ children }) => <ul className="max-w-prose list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="max-w-prose list-decimal space-y-1 pl-5">{children}</ol>,
  // A 1px rule, not an accent stripe: the quote is set off by its tone and indent.
  blockquote: ({ children }) => (
    <blockquote className="max-w-prose space-y-2 border-l border-border pl-3 text-muted-foreground">
      {children}
    </blockquote>
  ),
  code: ({ children }) => <code className="font-mono text-[0.92em]">{children}</code>,
  pre: ({ children }) => (
    <pre
      className={`${BLUEPRINT_MEDIA_COLUMN_CLASS} overflow-x-auto rounded-xl border border-border bg-card p-3 text-xs leading-5`}
    >
      {children}
    </pre>
  ),
  hr: () => <hr className="max-w-prose border-border" />,
  table: ({ children }) => (
    <div className={`${BLUEPRINT_MEDIA_COLUMN_CLASS} overflow-x-auto`}>
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-border px-2 py-1 text-left font-medium">{children}</th>
  ),
  td: ({ children }) => <td className="border border-border px-2 py-1 align-top">{children}</td>,
};

// NO `w-full`: the `width` attribute is the upload's own width and `max-w-full` caps it at the media
// column its wrapper sets, so an image shrinks to fit and never grows past the file.
const WRITE_UP_IMAGE_CLASS = "block h-auto max-w-full rounded-xl bg-muted";
const MEDIA_COLUMN_WIDTH_PX = 768;

/** The full renderer set, told which media is first and how big each uploaded image is. */
function buildWriteUpComponents(
  firstMedia: FirstWriteUpMedia,
  imageSizeByAddress: ReadonlyMap<string, BlueprintWriteUpImage>,
): Components {
  return {
    ...STATIC_WRITE_UP_COMPONENTS,
    p: ({ node, children }) => {
      const standaloneYoutubeVideoId = readStandaloneYoutubeVideoId(node);
      const video =
        standaloneYoutubeVideoId === null
          ? null
          : buildYoutubeBlueprintVideo(standaloneYoutubeVideoId);
      if (video !== null) {
        return (
          <BlueprintVideoBlock
            video={video}
            title="Video"
            isTitleVisible={false}
            shouldLoadPosterEagerly={
              firstMedia.kind === "video" && firstMedia.youtubeVideoId === video.youtubeVideoId
            }
          />
        );
      }
      // An image on its own line is a media block, not a paragraph of prose.
      if (isStandaloneImageParagraph(node)) {
        return <div className={BLUEPRINT_MEDIA_COLUMN_CLASS}>{children}</div>;
      }
      return <p className="max-w-prose">{children}</p>;
    },
    img: ({ src, alt }) => {
      const imageSize =
        typeof src === "string" && isUploadedImageAddress(src)
          ? imageSizeByAddress.get(src)
          : undefined;

      // ONE NOTE FOR BOTH REFUSALS: an image from another host, and an image with no recorded size.
      // Neither is an upload, and only an upload can be shown without shifting the page.
      if (typeof src !== "string" || imageSize === undefined) {
        return (
          <span className="block text-xs text-muted-foreground">
            Image not shown. Images in a launch have to be uploaded to Qatoto.
          </span>
        );
      }

      const isFirstMedia = firstMedia.kind === "image" && firstMedia.imageAddress === src;
      return (
        <Image
          src={src}
          alt={alt ?? ""}
          width={imageSize.widthPx}
          height={imageSize.heightPx}
          // A small image never displays wider than itself, so it never needs a column-wide file.
          sizes={`(min-width: ${MEDIA_COLUMN_WIDTH_PX}px) ${Math.min(imageSize.widthPx, MEDIA_COLUMN_WIDTH_PX)}px, 100vw`}
          loading={isFirstMedia ? "eager" : "lazy"}
          fetchPriority={isFirstMedia ? "high" : "auto"}
          // The ratio is set explicitly as well as implied by width and height, so the box keeps its
          // shape under `max-w-full h-auto` in every browser before a single byte of the file arrives.
          style={{ aspectRatio: `${imageSize.widthPx} / ${imageSize.heightPx}` }}
          // The blur fills the reserved box until the file loads. An image uploaded without one
          // still holds its size, over the plain `bg-muted` ground instead.
          placeholder={imageSize.blurDataUrl === null ? "empty" : "blur"}
          blurDataURL={imageSize.blurDataUrl ?? undefined}
          className={WRITE_UP_IMAGE_CLASS}
        />
      );
    },
  };
}

export default function ShowcaseWriteUp({
  markdown,
  imageSizes,
}: {
  readonly markdown: string;
  /** The recorded size of every uploaded image the write-up uses, from `writeUpImages`. */
  readonly imageSizes: readonly BlueprintWriteUpImage[];
}) {
  // Whitespace only is `null` wearing a string, and absence renders nothing.
  if (markdown.trim() === "") return null;

  /*
   * THE GUARD THAT KEEPS A WRITE-UP FROM TAKING THE PAGE DOWN WITH IT.
   *
   * `remark-gfm` walks the parsed tree RECURSIVELY, and past a few thousand levels of nested quotes
   * or lists that walk throws `RangeError: Maximum call stack size exceeded`. This component is the
   * one place three different surfaces meet it: the public launch page, which renders on the SERVER
   * (so a throw is a 500, not one broken tab), the moderator's review card, and the composer's own
   * Preview tab — which renders what the maker has typed BEFORE any schema has looked at it, so a
   * pasted document would otherwise take the form down and everything typed into it.
   *
   * The authoring schema refuses this shape on both sides, which stops it being stored. This is the
   * half that covers text arriving any other way: a seed, an importer, a row written before the cap
   * existed, or a server running a version that disagrees. One linear scan of at most 10 KB.
   */
  if (deepestWriteUpNestingDepth(markdown) > MAX_SHOWCASE_WRITE_UP_NESTING_DEPTH) {
    return (
      <p className="mt-4 text-xs text-muted-foreground">
        Write-up not shown. Its lists and quotes are nested too deeply to render.
      </p>
    );
  }

  const imageSizeByAddress = new Map(imageSizes.map((imageSize) => [imageSize.url, imageSize]));
  const writeUpComponents = buildWriteUpComponents(
    findFirstWriteUpMedia(markdown, imageSizeByAddress),
    imageSizeByAddress,
  );

  return (
    <div className="mt-4 space-y-4 text-sm leading-6 text-foreground">
      <Markdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        allowedElements={ALLOWED_WRITE_UP_ELEMENTS}
        unwrapDisallowed
        urlTransform={keepOnlyWebAddresses}
        components={writeUpComponents}
      >
        {markdown}
      </Markdown>
    </div>
  );
}

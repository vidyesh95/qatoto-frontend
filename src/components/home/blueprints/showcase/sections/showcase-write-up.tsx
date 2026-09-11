// TRANSPORT: props-only — the write-up arrives on the showcase from `getBlueprintByCategory`, or
// from the launch form's own text while a maker previews it.
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
// ⚠️ NO "…more" CROP. The plain-text write-up used to collapse to six lines; with videos and images
// inline, a crop would hide the most convincing part of a launch behind a button, so the write-up
// renders whole, the way a README does.
//
// NO `"use client"` DIRECTIVE. There are no hooks here: the detail page renders it on the server and
// the launch form renders it in its preview tab, the same both-trees arrangement `LinkedPlainText`
// records. The video block is its own client island.

import Image from "next/image";
import Markdown, { defaultUrlTransform, type Components, type ExtraProps } from "react-markdown";
import remarkGfm from "remark-gfm";

import { buildYoutubeBlueprintVideo } from "@/components/home/blueprints/authoring/youtube-link-field";
import BlueprintVideoBlock from "@/components/home/blueprints/media/blueprint-video-block";

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
 * The first image or embedded video in the write-up, in source order.
 *
 * ⚠️ IT EXISTS FOR THE LARGEST CONTENTFUL PAINT. At desktop width the first media in a write-up
 * starts inside the first viewport and out-paints the text around it, so it loads eagerly; every
 * later one stays lazy. Found by scanning the source rather than by counting inside the renderers,
 * because a counter mutated during render is the thing the React Compiler refuses. A line-based scan
 * can be fooled by a link inside a code block, and the cost of that is one lazy poster, not a bug.
 */
type FirstWriteUpMedia =
  | { readonly kind: "none" }
  | { readonly kind: "video"; readonly youtubeVideoId: string }
  | { readonly kind: "image"; readonly imageAddress: string };

const MARKDOWN_IMAGE_PATTERN = /!\[[^\]]*\]\(\s*<?([^\s)>]+)/;

function findFirstWriteUpMedia(markdown: string): FirstWriteUpMedia {
  for (const sourceLine of markdown.split("\n")) {
    const trimmedLine = sourceLine.trim();

    const imageAddress = MARKDOWN_IMAGE_PATTERN.exec(trimmedLine)?.[1];
    if (imageAddress !== undefined) return { kind: "image", imageAddress };

    const bareLink = trimmedLine.replace(/^<|>$/g, "");
    if (bareLink !== "" && !/\s/.test(bareLink)) {
      const video = buildYoutubeBlueprintVideo(bareLink);
      if (video !== null) return { kind: "video", youtubeVideoId: video.youtubeVideoId };
    }
  }
  return { kind: "none" };
}

/**
 * The YouTube id when a paragraph is nothing but one pasted link, the README convention for "put the
 * video here". A sentence that merely links a word to YouTube stays a link: only a link whose visible
 * text is its own address counts as pasted.
 */
function readStandaloneYoutubeVideoId(paragraphNode: ExtraProps["node"]): string | null {
  if (paragraphNode === undefined) return null;

  const meaningfulChildren = paragraphNode.children.filter(
    (childNode) => !(childNode.type === "text" && childNode.value.trim() === ""),
  );
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
 * THE HEADING LEVELS SHIFT DOWN ONE. The page already has its `<h1>` (the launch name) and its own
 * `<h2>` sections, so a maker's `#` becomes an `<h2>` and everything deeper an `<h3>`. Two sizes, the
 * product's two, rather than a six-step scale inside one write-up.
 */
const MAJOR_HEADING_CLASS = "max-w-prose pt-2 text-base font-semibold text-foreground";
const MINOR_HEADING_CLASS = "max-w-prose pt-1 text-sm font-semibold text-foreground";

/** The renderers that never depend on where the first media sits. */
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
    <pre className="max-w-3xl overflow-x-auto rounded-xl border border-border bg-card p-3 text-xs leading-5">
      {children}
    </pre>
  ),
  hr: () => <hr className="max-w-prose border-border" />,
  table: ({ children }) => (
    <div className="max-w-3xl overflow-x-auto">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-border px-2 py-1 text-left font-medium">{children}</th>
  ),
  td: ({ children }) => <td className="border border-border px-2 py-1 align-top">{children}</td>,
};

/** The full renderer set, with the paragraph and image renderers told which media is first. */
function buildWriteUpComponents(firstMedia: FirstWriteUpMedia): Components {
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
      return <p className="max-w-prose">{children}</p>;
    },
    img: ({ src, alt }) => {
      if (typeof src !== "string" || src === "" || !isUploadedImageAddress(src)) {
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
          width={0}
          height={0}
          sizes="(min-width: 768px) 768px, 100vw"
          loading={isFirstMedia ? "eager" : "lazy"}
          fetchPriority={isFirstMedia ? "high" : "auto"}
          className="block h-auto w-full max-w-3xl rounded-xl bg-muted"
        />
      );
    },
  };
}

export default function ShowcaseWriteUp({ markdown }: { readonly markdown: string }) {
  // Whitespace only is `null` wearing a string, and absence renders nothing.
  if (markdown.trim() === "") return null;

  const writeUpComponents = buildWriteUpComponents(findFirstWriteUpMedia(markdown));

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

// TRANSPORT: props-only — the body arrives on the `BlogPost` / `PressItem` its page already fetched
// through `src/lib/cms.ts`.
//
// A CMS ARTICLE BODY IS GITHUB-STYLE MARKDOWN, AND THIS FILE IS THE SECURITY BOUNDARY.
//
// ⚠️ IT REPLACED A `dangerouslySetInnerHTML` SINK IN BOTH `blog-detail.tsx` AND `press-detail.tsx`,
// and the point was to DELETE the sink rather than filter it. Those two components injected raw
// remote HTML straight from `QATOTO_CMS_URL` with no sanitiser at all. A sanitiser (DOMPurify) was
// the other option and it loses: it needs `isomorphic-dompurify` to survive SSR, and it leaves a
// sink behind that has to stay configured correctly for the rest of the project's life. Markdown
// plus `skipHtml` removes the sink from the codebase.
//
// ⚠️ NO `rehype-raw` AND NO `dangerouslySetInnerHTML` ON THIS PATH, EVER — the same rule
// `showcase-write-up.tsx` states for launch write-ups, and for the same reason. The escape hatches:
// - `skipHtml`: raw HTML in the source is DROPPED, never rendered and never escaped into view.
// - `allowedElements` + `unwrapDisallowed`: anything Markdown can produce outside the list is
//   unwrapped to its text instead of rendered.
// - `urlTransform`: `keepOnlyWebAddresses` keeps http(s), site-relative and in-page addresses, so
//   `javascript:` and `data:` cannot reach an `href`. It is shared with the launch renderer
//   deliberately — see `src/lib/markdown-safe-url.ts`.
//
// ⚠️ NO IMAGES IN AN ARTICLE BODY, AND THAT IS A DECISION RATHER THAN AN OVERSIGHT. `img` is absent
// from the allowlist. An article's image is its `coverImage`, which is already a sized `next/image`
// carrying `priority`. A body image would arrive with NO dimensions — the exact case
// `showcase-write-up.tsx` refuses outright, because an unsized image shifts the page as it loads —
// and `next.config.ts` only permits `res.cloudinary.com` plus two OAuth avatar hosts, so an image on
// whatever host the CMS uses would fail `next/image` anyway. Add images the day the CMS supplies a
// size contract, the way `writeUpImages` does for launches. Do not add a sizeless fallback.
//
// ⚠️ STYLE WHAT YOU ALLOW. The map below deliberately covers ONLY the elements the calling wrapper
// does not already style. `blog-detail.tsx` and `press-detail.tsx` carry
// `[&_h2]:… [&_h3]:… [&_p]:mt-6 [&_ul]:list-disc [&_li]:mt-2` on the `<div>` around this component,
// so `h2`, `h3`, `p`, `ul` and `li` get NO override here — a second source of truth for those is how
// the two article surfaces would drift apart. Everything else Markdown can emit is styled here, at
// this page's serif prose scale, because an allowed-but-unstyled table renders as unreadable rows.
//
// NO `"use client"` DIRECTIVE. There are no hooks; both callers render on the server.

import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { keepOnlyWebAddresses } from "@/lib/markdown-safe-url";

/**
 * The elements an article may produce. Everything else is unwrapped to its text.
 *
 * `h1` is here ONLY so the override below can shift it down to `h2`. The page already owns the one
 * `<h1>` — its title — and a second one inside the body is a second document heading.
 */
const ALLOWED_ARTICLE_ELEMENTS = [
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
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
];

/** Anything below `h3` folds into `h3`: the article scale is a title and two levels, not six. */
const MINOR_HEADING_TAG_CLASS = "mt-10 font-sans text-xl font-semibold tracking-tight";

const ARTICLE_COMPONENTS: Components = {
  a: ({ href, children }) =>
    // A LINK WHOSE ADDRESS THE URL TRANSFORM STRIPPED IS PLAIN TEXT. An `<a href="">` would still
    // look clickable and would reload the page when pressed.
    href === undefined || href === "" ? (
      <span>{children}</span>
    ) : (
      // NO `nofollow ugc` here, unlike the launch renderer: this is first-party Qatoto editorial,
      // not something a maker wrote. An in-page anchor stays in the page.
      <a
        href={href}
        {...(href.startsWith("#") ? {} : { target: "_blank", rel: "noopener noreferrer" })}
        className="font-medium underline underline-offset-2 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {children}
      </a>
    ),
  // `h2` and `h3` are absent on purpose — the wrapper's `[&_h2]` / `[&_h3]` variants style them.
  // These four only remap a level so that styling applies to them too.
  h1: ({ children }) => <h2>{children}</h2>,
  h4: ({ children }) => <h3 className={MINOR_HEADING_TAG_CLASS}>{children}</h3>,
  h5: ({ children }) => <h3 className={MINOR_HEADING_TAG_CLASS}>{children}</h3>,
  h6: ({ children }) => <h3 className={MINOR_HEADING_TAG_CLASS}>{children}</h3>,
  // The wrapper styles `[&_ul]` and not `[&_ol]`, so the ordered list carries its own marker here.
  ol: ({ children }) => <ol className="mt-6 list-decimal pl-6">{children}</ol>,
  blockquote: ({ children }) => (
    <blockquote className="mt-6 border-l border-border pl-4 text-muted-foreground">
      {children}
    </blockquote>
  ),
  code: ({ children }) => <code className="font-mono text-[0.92em]">{children}</code>,
  pre: ({ children }) => (
    <pre className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card p-4 font-sans text-sm leading-6">
      {children}
    </pre>
  ),
  hr: () => <hr className="mt-10 border-border" />,
  table: ({ children }) => (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full border-collapse font-sans text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-border px-3 py-2 text-left font-semibold">{children}</th>
  ),
  td: ({ children }) => <td className="border border-border px-3 py-2 align-top">{children}</td>,
};

/**
 * Renders one article body.
 *
 * An empty body renders NOTHING rather than an empty styled block — a CMS article with no body is a
 * draft somebody published early, and a bordered empty rectangle is not a better way to say so.
 */
export default function ArticleMarkdown({ markdown }: { readonly markdown: string }) {
  if (markdown.trim() === "") return null;

  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      skipHtml
      allowedElements={ALLOWED_ARTICLE_ELEMENTS}
      unwrapDisallowed
      urlTransform={keepOnlyWebAddresses}
      components={ARTICLE_COMPONENTS}
    >
      {markdown}
    </Markdown>
  );
}

/**
 * THE URL FILTER EVERY MARKDOWN RENDERER ON THIS SITE PASSES ITS ADDRESSES THROUGH.
 *
 * ⚠️ THIS IS A SECURITY BOUNDARY, AND IT LIVES HERE SO THERE IS EXACTLY ONE OF IT. It is what stops
 * `javascript:` and `data:` reaching an `href` or a `src` in text somebody else wrote. It was local
 * to `showcase-write-up.tsx` while that was the only Markdown surface; `article-markdown.tsx` is the
 * second, and two copies of a filter like this is the shape where one gets a fix and the other
 * quietly does not. Labels are allowed to have deliberate twins. This is not a label.
 *
 * `defaultUrlTransform` is react-markdown's own sanitiser and runs FIRST — it already drops the
 * obvious dangerous protocols. The pattern below is the allowlist on top of it: keep http(s), a
 * site-relative path, or an in-page anchor, and nothing else. An address that fails becomes the
 * empty string, which every caller renders as plain text rather than a link.
 *
 * `\/(?!\/)` is site-relative AND NOT protocol-relative: `//evil.example` is a real URL to another
 * host that merely looks like a path, so the negative lookahead is load-bearing.
 */

import { defaultUrlTransform } from "react-markdown";

const SAFE_URL_PATTERN = /^(https?:\/\/|\/(?!\/)|#)/i;

/** Keeps http(s), site-relative and in-page addresses; anything else becomes an empty string. */
export function keepOnlyWebAddresses(url: string): string {
  const transformedUrl = defaultUrlTransform(url);
  return SAFE_URL_PATTERN.test(transformedUrl) ? transformedUrl : "";
}

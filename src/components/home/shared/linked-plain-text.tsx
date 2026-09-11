// TRANSPORT: props-only
//
// Renders a plain-text string, making live the two things inside it that are secretly structured:
// a bare URL becomes a link, an @handle becomes a marked span. Everything else is text.
//
// NO `"use client"` DIRECTIVE, AND THAT IS LOAD-BEARING. `BlueprintCommentThread` is a server
// component and renders this. A component with no hooks and no browser API belongs to whichever tree
// imports it; adding the directive would drag the comment thread's whole subtree into the client
// bundle to gain nothing.
//
// ⚠️ THIS IS A TOKENISER, NOT A MARKDOWN RENDERER, AND THE DIFFERENCE IS THE POINT. It splits a
// string on one regex and emits React elements. There is no parser, no HTML, and no
// `dangerouslySetInnerHTML` on this path. The launch write-up did become Markdown, and it carries its
// own renderer with every escape hatch shut (`showcase-write-up.tsx`); comments stay plain text here.
// Do not add a parser to this file later "just for links": links already work.
//
// ⚠️ AN @HANDLE IS A `<span>`, NOT A `<Link>`. There is no public profile route for a blueprints
// author to point at, and a mention that navigated to a 404 would be the ghost control this surface
// refuses everywhere else. It is teal and medium so it reads as a person, which is all it claims.
// When a profile route exists this becomes the one-line change it looks like.

import { Fragment } from "react";

/**
 * One run of the string. A discriminated union rather than a shape with optional fields, so the
 * renderer's `switch` is exhaustive and a fourth kind is a compile error rather than a silent gap.
 */
type PlainTextToken =
  | { readonly kind: "text"; readonly value: string }
  | { readonly kind: "url"; readonly value: string }
  | { readonly kind: "mention"; readonly value: string };

/**
 * ⚠️ THE SCHEME IS PART OF THE PATTERN, NOT AN AFTERTHOUGHT. Only `http` and `https` can match, so
 * the `href` below cannot be built out of `javascript:` or `data:` no matter what a commenter types.
 * That is the one security property this file has and it lives entirely in this regex — a later
 * "let's also linkify www." would remove it.
 *
 * The `(?<![\w@])` on the mention arm is what keeps an email address out of it: the `@` in
 * `someone@example.com` is preceded by a word character, so it does not open a handle, and the
 * domain half has no scheme so it does not open a URL either.
 *
 * ⚠️ THE URL ARM IS A NUMBERED GROUP AND NOT A NAMED ONE, which is a compiler constraint rather
 * than a preference: `tsconfig.json` targets ES2017 and named capture groups are ES2018, so
 * `(?<url>…)` is a TS1503 error here. Only the URL arm needs capturing at all, since the mention
 * branch reads the whole match.
 */
const URL_MATCH_GROUP_INDEX = 1;
const URL_OR_MENTION_PATTERN = /(https?:\/\/[^\s<>]+)|(?<![\w@])@[a-z0-9][a-z0-9-]{0,38}/gi;

/**
 * Sentence punctuation that follows a URL rather than belonging to it.
 *
 * "See https://example.com/log." ends in a full stop that is the sentence's, and a link that ate it
 * would 404 on a character the writer never meant to type. A closing bracket that is genuinely part
 * of a URL is the known cost of this, and it is much rarer than a URL ending a sentence.
 */
const TRAILING_SENTENCE_PUNCTUATION = /[.,;:!?'")\]]+$/;

function splitTrailingPunctuation(matchedUrl: string): {
  readonly url: string;
  readonly trailingPunctuation: string;
} {
  const punctuationMatch = TRAILING_SENTENCE_PUNCTUATION.exec(matchedUrl);
  if (punctuationMatch === null) return { url: matchedUrl, trailingPunctuation: "" };
  return {
    url: matchedUrl.slice(0, punctuationMatch.index),
    trailingPunctuation: punctuationMatch[0],
  };
}

function tokenisePlainText(text: string): readonly PlainTextToken[] {
  const tokens: PlainTextToken[] = [];
  let unconsumedFromIndex = 0;

  for (const match of text.matchAll(URL_OR_MENTION_PATTERN)) {
    const matchStartIndex = match.index;
    if (matchStartIndex > unconsumedFromIndex) {
      tokens.push({ kind: "text", value: text.slice(unconsumedFromIndex, matchStartIndex) });
    }
    unconsumedFromIndex = matchStartIndex + match[0].length;

    if (match[URL_MATCH_GROUP_INDEX] === undefined) {
      tokens.push({ kind: "mention", value: match[0] });
      continue;
    }

    const { url, trailingPunctuation } = splitTrailingPunctuation(match[0]);
    // A "URL" that is nothing but a scheme and a full stop is not one. Emit it as the text it is
    // rather than a link to `https:`.
    tokens.push(url.length === 0 ? { kind: "text", value: match[0] } : { kind: "url", value: url });
    if (trailingPunctuation.length > 0 && url.length > 0) {
      tokens.push({ kind: "text", value: trailingPunctuation });
    }
  }

  if (unconsumedFromIndex < text.length) {
    tokens.push({ kind: "text", value: text.slice(unconsumedFromIndex) });
  }
  return tokens;
}

export default function LinkedPlainText({ text }: { readonly text: string }) {
  return (
    <>
      {tokenisePlainText(text).map((token, tokenIndex) => {
        // The index is the key because these runs are derived from one immutable string: the list
        // is never reordered, filtered or appended to, and two identical runs are ordinary.
        switch (token.kind) {
          case "text":
            return <Fragment key={tokenIndex}>{token.value}</Fragment>;
          case "url":
            return (
              <a
                key={tokenIndex}
                href={token.value}
                target="_blank"
                rel="noreferrer noopener"
                className="rounded-sm break-words text-[#00696E] underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E]"
              >
                {token.value}
              </a>
            );
          case "mention":
            return (
              <span key={tokenIndex} className="font-medium text-[#00696E]">
                {token.value}
              </span>
            );
          default: {
            const exhaustiveCheck: never = token;
            return exhaustiveCheck;
          }
        }
      })}
    </>
  );
}

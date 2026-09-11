"use client";

// TRANSPORT: props-only — the write-up arrives already split, from `ShowcaseDetailPage`.
//
// THE ONE CLIENT ISLAND THIS PAGE GAINS, and it is here for a measurement rather than for an
// interaction. Whether the collapse control renders at all depends on whether the text actually
// overflows six lines, which is a layout fact no server knows: it turns on the container width, the
// font, and whether the font has loaded. Guessing it from a character count would print "…more"
// over text that is already fully visible, which is a control that does nothing — the exact thing
// this surface refuses everywhere else.
//
// ⚠️ PARAGRAPH ONE AND THE DEMO ARE NEVER CROPPED. The demo sits after the first paragraph, where the
// maker's own words introduce it, and a crop able to hide the video would put the most convincing
// thing on the page behind "…more". So the six-line crop, and the measurement that decides whether
// "…more" exists, cover paragraphs two onward only. The demo arrives as a slot rather than a
// `demoVideo` prop so the page keeps its title and its eager-loading decision, and this file imports
// no video code.
//
// `ShowcaseDetailPage` STAYS A SERVER COMPONENT. A client child does not make its parent client,
// the same way `BrowserPreferencesProvider` does not make `app/layout.tsx`'s children client, and a
// server-rendered element passed through a prop is fine.
//
// ⚠️ DO NOT COPY `watch/video-description.tsx`. It wraps an `<h1>` and the whole meta line inside
// one giant `<button>`, so a screen reader meets a heading nested in interactive content and a
// pointer user can toggle the description by clicking the title. That is a defect, not the house
// pattern. The control here is one button, after the text, naming what it does.
//
// NO HEIGHT TRANSITION. `docs/Design.md` bans animating layout properties, and there is no honest
// way to animate to `height: auto` regardless. The text is cropped or it is not.

import { type ReactNode, useEffect, useId, useRef, useState } from "react";

import LinkedPlainText from "@/components/home/shared/linked-plain-text";

/**
 * The collapsed crop: `max-h-36` is 9rem, which is exactly six lines of `leading-6`.
 *
 * ⚠️ THE PARAGRAPH GAP IS 1.5rem FOR THIS REASON AND NOT FOR RHYTHM. `space-y-6` is one whole
 * line-height, so every paragraph boundary lands on the same grid the lines do and the crop can
 * never slice a line in half. A 1rem gap would read fine and cut the last visible line through
 * the middle of its x-height.
 */
const COLLAPSED_CROP_CLASS = "max-h-36";

export default function ShowcaseWriteUp({
  firstParagraph,
  remainingParagraphs,
  contentAfterFirstParagraph,
}: {
  readonly firstParagraph: string;
  readonly remainingParagraphs: readonly string[];
  /** What sits between paragraph one and the rest: the demo, or `null`. Never cropped. */
  readonly contentAfterFirstParagraph: ReactNode;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowingCollapsedCrop, setIsOverflowingCollapsedCrop] = useState(false);
  const bodyElementRef = useRef<HTMLDivElement | null>(null);
  const bodyElementId = useId();

  useEffect(() => {
    const bodyElement = bodyElementRef.current;
    // MEASURING WHILE EXPANDED WOULD ANSWER THE WRONG QUESTION. With the crop lifted,
    // `scrollHeight === clientHeight` on any text at all, so the flag would fall back to false and
    // take "Show less" off the screen with it, leaving a reader expanded with no way back. With no
    // paragraphs after the first there is no crop to measure, and the ref is null.
    if (isExpanded || bodyElement === null) return undefined;

    const measureCollapsedOverflow = () => {
      setIsOverflowingCollapsedCrop(bodyElement.scrollHeight > bodyElement.clientHeight);
    };
    measureCollapsedOverflow();

    // Width changes, and so does the answer: a write-up that fits six lines on a desktop column
    // runs to twelve on a phone. Observing the element covers the sidebar collapsing and the web
    // font swapping in, neither of which fires a window resize.
    const cropResizeObserver = new ResizeObserver(measureCollapsedOverflow);
    cropResizeObserver.observe(bodyElement);
    return () => cropResizeObserver.disconnect();
    // THE PARAGRAPHS ARE DELIBERATELY NOT DEPENDENCIES, and the caller carries the other half of
    // that: it keys this component by slug, so a different launch is a different instance rather
    // than the same one holding a stale measurement. The observer cannot cover it — the crop's border
    // box stays at 9rem whatever the text does inside it, so new text fires no resize.
  }, [isExpanded]);

  return (
    <div className="mt-4">
      <p className="max-w-prose text-sm leading-6 text-foreground">
        <LinkedPlainText text={firstParagraph} />
      </p>

      {contentAfterFirstParagraph}

      {remainingParagraphs.length === 0 ? null : (
        <div className="mt-6">
          <div
            id={bodyElementId}
            ref={bodyElementRef}
            className={`max-w-prose space-y-6 overflow-hidden text-sm leading-6 text-foreground ${
              isExpanded ? "" : COLLAPSED_CROP_CLASS
            }`}
          >
            {remainingParagraphs.map((paragraph, paragraphIndex) => (
              // The index is the key because the text is the content: two identical paragraphs are a
              // thing a person can legitimately write, and this list is never reordered or filtered.
              <p key={paragraphIndex}>
                <LinkedPlainText text={paragraph} />
              </p>
            ))}
          </div>

          {/* THE CONTROL RENDERS ONLY WHEN IT HAS SOMETHING TO DO. Paragraphs under the crop show no
              button at all, so "…more" is never a promise of text that is already on screen. It is
              absent on the server render and appears after the measurement, which is the right way
              round: a control that flickers in is better than one that lies for a frame. */}
          {isOverflowingCollapsedCrop || isExpanded ? (
            <button
              type="button"
              aria-expanded={isExpanded}
              aria-controls={bodyElementId}
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-2 rounded-sm text-sm font-medium text-[#00696E] transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E]"
            >
              {isExpanded ? "Show less" : "…more"}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

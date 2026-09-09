// TRANSPORT: props-only
//
// The teardown's summary, clamped to two lines behind a "…more" toggle.
//
// NOT THE WATCH PATTERN. `watch/video-description.tsx` renders the description only when expanded,
// so collapsed shows ZERO description text — workable there, where a title and a view count sit
// above it. A teardown's summary is the only prose on the page above the fold, so hiding all of it
// would leave the header saying nothing. Two lines, then the rest.
//
// THE TOGGLE ONLY APPEARS WHEN THE TEXT ACTUALLY OVERFLOWS. Fixture summaries run one sentence; at
// desktop width several already fit two lines, and an unconditional "…more" that expands to reveal
// nothing is worse than no control at all. Hence the measurement — there is no clamp-toggle
// anywhere else in `src/` to reuse, so the ResizeObserver lifecycle follows `home/feed/filter.tsx`.
"use client";

import { useEffect, useId, useRef, useState } from "react";

export default function TeardownSummary({ summary }: { readonly summary: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSummaryOverflowing, setIsSummaryOverflowing] = useState(false);
  const summaryParagraphRef = useRef<HTMLParagraphElement>(null);
  const summaryParagraphId = useId();

  useEffect(() => {
    const summaryParagraph = summaryParagraphRef.current;
    if (summaryParagraph === null) return undefined;

    let isEffectActive = true;

    const measureOverflow = () => {
      // WHILE EXPANDED THERE IS NOTHING TO MEASURE, and measuring anyway is the bug this guard
      // exists for: the clamp is gone, so `scrollHeight === clientHeight`, the paragraph reports
      // "it fits", the toggle disappears and the reader is stuck expanded with no way back. The
      // last collapsed measurement stands until the reader collapses it again.
      if (!isEffectActive || isExpanded) return;
      setIsSummaryOverflowing(summaryParagraph.scrollHeight > summaryParagraph.clientHeight + 1);
    };

    measureOverflow();

    const resizeObserver = new ResizeObserver(measureOverflow);
    resizeObserver.observe(summaryParagraph);

    // The clamped paragraph is a fixed two lines tall, so the observer never fires when the webfont
    // swaps in — but the number of lines the text needs changes right then. One extra measurement.
    void document.fonts.ready.then(measureOverflow);

    return () => {
      isEffectActive = false;
      resizeObserver.disconnect();
    };
  }, [isExpanded]);

  return (
    <div className="mt-4 max-w-2xl">
      <p
        ref={summaryParagraphRef}
        id={summaryParagraphId}
        className={`text-sm leading-6 text-foreground ${isExpanded ? "" : "line-clamp-2"}`}
      >
        {summary}
      </p>
      {/* `|| isExpanded` is not redundant with the guard above — it makes the "trapped expanded"
          state impossible by construction, so a future edit to the measurement cannot reintroduce
          it. */}
      {(isSummaryOverflowing || isExpanded) && (
        <button
          type="button"
          aria-expanded={isExpanded}
          aria-controls={summaryParagraphId}
          onClick={() => setIsExpanded((wasExpanded) => !wasExpanded)}
          className="mt-1 cursor-pointer text-sm font-medium text-[#00696E]"
        >
          {isExpanded ? "Show less" : "…more"}
        </button>
      )}
    </div>
  );
}

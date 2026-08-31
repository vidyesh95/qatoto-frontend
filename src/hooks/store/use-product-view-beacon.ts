"use client";

// TRANSPORT: client-query — `POST /store/products/:productSlug/view-beacon`.
//
// WHAT THIS MEASURES AND WHY IT IS NOT THE WATCH BEACON. A video reports progress on a timer while
// it plays; a product page has no playhead, so the only honest signal is how long the page was in
// front of somebody. This therefore sends ONCE, when the reader leaves, rather than every fifteen
// seconds — an interval here would be recording the same fact repeatedly, and the server dedupes on
// (product, fingerprint, UTC day) anyway, so extra sends only rewrite one row.
//
// ⚠️ **THE FLUSH USES `fetch(..., { keepalive: true })`, NOT `navigator.sendBeacon`** — copied from
// `use-watch-progress-beacon.ts`, and the reason is not stylistic. The API is on a different origin
// and a `Blob` typed `application/json` is not a CORS-safelisted content type, so the request needs
// a preflight and `sendBeacon` cannot preflight: it returns `true` and the request never arrives.
//
// ⚠️ **THE CLIENT CLAMPS BEFORE SENDING.** The route's schema is `int 0..3600`, so a tab left open
// overnight would otherwise earn a 422 for a reader who did nothing wrong. The server clamps again
// by wall time — this clamp is about not sending a knowingly-invalid number, not about being
// believed.
//
// NOTHING RENDERS THE RESULT. The route answers the server's own clamped `{ dwellSeconds,
// isCountedView }`; if a surface ever shows dwell, it must show THAT and never the local timer.

import { useCallback, useEffect, useRef } from "react";

import { recordProductViewBeacon } from "@/lib/store/products.api";
import type { ProductViewSource } from "@/lib/store/products.schemas";

/** `commerce_product_view_dwell_ck` — the server refuses anything above this. */
const MAXIMUM_DWELL_SECONDS = 3600;

/**
 * Below this the page was passed through rather than read.
 *
 * ⚠️ NOT the server's counted-view threshold, which this client does not know and must not guess —
 * `isCountedView` on the response is the server's answer to that question. This is only about not
 * spending a request on a bounce.
 */
const MINIMUM_REPORTABLE_DWELL_SECONDS = 1;

export function useProductViewBeacon(productSlug: string, viewSource: ProductViewSource): void {
  /**
   * When the reader arrived, stamped in an EFFECT rather than as a ref initializer.
   *
   * ⚠️ `useRef(Date.now())` runs during render, and the React Compiler refuses an impure call there
   * — the same rule `use-attempt-idempotency-key.ts` documents for `crypto.randomUUID()`. Starting
   * the clock on mount is also the more honest measurement: it begins when the page is actually in
   * front of somebody, not when the server rendered it.
   */
  const arrivedAtRef = useRef<number | null>(null);
  // One report per mount. `pagehide` and `visibilitychange` can both fire for one departure, and
  // the unmount cleanup fires after them on an in-app navigation.
  const hasReportedRef = useRef(false);

  useEffect(() => {
    arrivedAtRef.current = Date.now();
  }, []);

  const sendBeacon = useCallback(() => {
    if (hasReportedRef.current) return;

    const arrivedAt = arrivedAtRef.current;
    // Never mounted long enough for the effect to run — there is no dwell to report.
    if (arrivedAt === null) return;

    const elapsedSeconds = Math.floor((Date.now() - arrivedAt) / 1000);
    if (elapsedSeconds < MINIMUM_REPORTABLE_DWELL_SECONDS) return;

    hasReportedRef.current = true;
    const dwellSeconds = Math.min(elapsedSeconds, MAXIMUM_DWELL_SECONDS);

    // `keepalive` because the document may be going away mid-request.
    void recordProductViewBeacon(productSlug, { dwellSeconds, viewSource }, { keepalive: true });
  }, [productSlug, viewSource]);

  // Leaving the tab, or the browser. Both can fire for one departure — `hasReportedRef` is what
  // makes that idempotent rather than two rows' worth of requests.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") sendBeacon();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", sendBeacon);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", sendBeacon);
    };
  }, [sendBeacon]);

  // Unmount — an in-app navigation to another listing, which fires no `pagehide` at all.
  useEffect(() => () => sendBeacon(), [sendBeacon]);
}

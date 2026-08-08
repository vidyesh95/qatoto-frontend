"use client";

// ONE IDEMPOTENCY KEY PER ATTEMPT, MINTED LAZILY — and the laziness is a build requirement, not a taste.
//
// The obvious spelling is `useState(() => newIdempotencyKey())`, which is what the pages that mint a key
// deeper in the tree do. It FAILS THE BUILD at the top level of a page: `newIdempotencyKey` calls
// `crypto.randomUUID()`, a `useState` initializer runs during the server prerender, and under
// `cacheComponents` a non-deterministic value produced while prerendering is refused outright. The two
// composers mint at the top of their own component, so they hit it; the quote and order controls mint inside a
// branch that only renders after a query resolves, so they never do.
//
// It would also be wrong to mint a fresh key inside the click handler each time. A retry after a network
// failure MUST carry the key of the attempt it is retrying — that is the entire mechanism — so a new key per
// press turns one duplicate-safe request into two real ones: two draft RFQs, two draft listings.
//
// So: minted on the FIRST call, held in a ref, returned unchanged for every later call. Nothing runs during
// render, and every retry of the same attempt sends the same header.

import { useRef } from "react";

import { newIdempotencyKey } from "@/lib/idempotency";

/**
 * Returns a getter that mints one key on first use and then always returns it.
 *
 * A REF RATHER THAN STATE, deliberately: the key is not rendered and must not trigger a re-render when it is
 * created. Minting it inside a `setState` during a click handler would re-render the form mid-submit for a
 * value nothing displays.
 */
export function useAttemptIdempotencyKey(): () => string {
  const keyRef = useRef<string | null>(null);

  return () => {
    if (keyRef.current === null) keyRef.current = newIdempotencyKey();
    return keyRef.current;
  };
}

// TRANSPORT: props-only — pure key generation, no network.
//
// Four R&D writes take an `idempotencyKey` in their body: claim submit, receipt upload,
// payment record and PIE BAKE. Every one of them creates a row that costs something real —
// slices, evidence, an attested payment, a frozen cap table — and every one is submitted
// from a phone on a connection that can drop after the request reaches the server but
// before the response reaches the client. Without a key that retry writes a second row and
// the member is credited, or paid, twice.
//
// DISPUTE RAISE IS NOT ONE OF THEM, despite looking like it should be. Its backend route
// carries the `idempotency()` middleware and its service takes no key, so that one sends a
// HEADER like the store writes below. It used to send a body field, which the route's
// `.strict()` schema rejected — every raise answered 422 until that was corrected. Check
// which envelope a route actually reads before adding a key to it.
//
// THE BAKE IS THE ONE THAT CANNOT BE UNDONE, and so it is the one where the key earns its
// keep hardest: on a retry the backend returns the ORIGINAL bake instead of
// `409 PIE_ALREADY_BAKED`, so a dropped connection reads as "done" rather than as damage.
// Its key is minted once and never rotated — see `pie-bake-panel.tsx`.
//
// COMMENT CREATE USES THE SAME KEY IN A DIFFERENT PLACE. `POST /videos/:videoId/comments`
// reads an `Idempotency-Key` HTTP HEADER (8..200 chars) rather than a body field — that
// route goes through `src/middleware/idempotency.ts` in the backend, which the R&D writes
// do not. A UUID is 36 characters and satisfies the bound. Same value, same discipline,
// different envelope; do not "harmonise" one into the other, they are read by different code.
//
// THE KEY IS GENERATED ONCE PER ATTEMPT, NOT PER REQUEST. Call this when the user starts
// filling the form, hold it in the component, and send the SAME value on every retry of
// that attempt — a key regenerated inside the retry defeats the entire mechanism. A new
// key is correct only when the user is deliberately submitting a second, different thing.

/**
 * A fresh idempotency key.
 *
 * `crypto.randomUUID` is available in every browser this app supports and in Node ≥ 19,
 * so it needs no polyfill on either side of the boundary. It is deliberately NOT derived
 * from the form contents: two genuinely separate claims for the same day with the same
 * narrative are two claims, and a content hash would silently collapse them into one.
 */
export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}

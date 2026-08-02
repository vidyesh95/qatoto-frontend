// TRANSPORT: props-only — pure key generation, no network.
//
// Four R&D writes take an `idempotencyKey` in their body: claim submit, receipt upload,
// dispute raise and payment record. Every one of them creates a row that costs something
// real — slices, evidence, a contested allocation, an attested payment — and every one is
// submitted from a phone on a connection that can drop after the request reaches the
// server but before the response reaches the client. Without a key that retry writes a
// second row and the member is credited, or paid, twice.
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

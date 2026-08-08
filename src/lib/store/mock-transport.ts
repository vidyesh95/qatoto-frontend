// TRANSPORT: props-only — resolves a local fixture, no network.
//
// THE ONE THING THAT MAKES A MOCK PHASE CHEAP TO END.
//
// Every store read is written in its FINAL signature today —
// `(filter, options?) => Promise<ActionResponse<T>>` — and stands in one line of body
// until the endpoint is wired. Wiring is then one edit per function:
//
//     return resolveMockRead(path, Schema, options, MOCK_FIXTURE);   // before
//     return getJson(path, Schema, options);                         // after
//
// Same argument order, same return type, same first three arguments. Nothing above the api
// layer changes, because nothing above it ever knew.
//
// `options` IS ACCEPTED AND IGNORED, and that is the point: it keeps the mock call site
// character-identical to the wired one up to the fixture. Dropping it would leave every
// api function with an unused parameter, which is the kind of small friction that ends
// with someone deleting the parameter and then having to thread cookie forwarding back
// through eight files on wiring day.
//
// TWO DESIGN DECISIONS, BOTH LOAD-BEARING:
//
// 1. THE FIXTURE IS PARSED THROUGH THE SAME SCHEMA THE WIRE WILL USE. That keeps
//    CLAUDE.md Pattern 2 true for mock data — the type comes out of `safeParse`, never a
//    cast — and it makes fixture drift surface as the page's ERROR branch instead of
//    compiling a lie. It also means the `PARSE` branch, the one nobody exercises until it
//    fires against a backend minor release, gets walked on every dev reload.
//
// 2. IT TAKES THE PATH IT WOULD HAVE CALLED. Not decoration: it forces the caller to
//    build the real URL from the real filter while still mocked, so `buildQueryString`,
//    the camelCase query keys and the snake_case enum values are all exercised before any
//    endpoint is involved. A filter that would have produced `?stage=team-building` — the
//    kebab-case mistake the wire-casing rule exists to prevent — is visible in the dev log
//    rather than as a 422 three weeks later.
//
// It deliberately does NOT simulate latency and does NOT randomly fail. A fake delay makes
// a loading state look tested when the real one is a Suspense boundary that never ran, and
// a random failure sends a reviewer chasing a bug that is not there. To reach the other
// branches, point the call at a `*_EMPTY` or `*_DEGRADED` fixture, or at a deliberately
// malformed one.

import type { z } from "zod";

import type { ActionResponse, RequestOptions } from "@/lib/http";

/**
 * A fixture as an `ActionResponse`, parsed exactly as a real payload would be.
 *
 * `fixture` is `unknown` ON PURPOSE, even though every call site passes a typed constant.
 * Typing it as `TValue` would let the compiler prove the parse can never fail — and it
 * would be right, at which point the parse is dead weight and someone deletes it.
 * `unknown` keeps the runtime check load-bearing, which is what catches what types cannot:
 * a `z.string().regex()`, a typo'd member inside a `readonly string[]`, an `undefined`
 * where the wire says `null`.
 */
export function resolveMockRead<TValue>(
  path: string,
  schema: z.ZodType<TValue>,
  options: RequestOptions | undefined,
  fixture: unknown,
): Promise<ActionResponse<TValue>> {
  void options;
  const parsed = schema.safeParse(fixture);

  if (!parsed.success) {
    const issuePaths = parsed.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`,
    );

    if (typeof window === "undefined") {
      // eslint-disable-next-line no-console -- the only way fixture drift is visible at all
      console.error(`[store/mock] fixture does not satisfy its schema for ${path}`, issuePaths);
    }

    return Promise.resolve({
      success: false,
      error: {
        code: "PARSE",
        message: "Client-side contract validation failed.",
        fieldErrors: { contract: issuePaths },
      },
    });
  }

  return Promise.resolve({ success: true, data: parsed.data });
}

/**
 * A fixture read that fails the way a missing record fails.
 *
 * For a detail read whose slug matched no fixture. It answers `404` rather than an empty
 * success, because the page's job on a 404 is `notFound()` — and a detail page that
 * renders an empty shell instead of a 404 is indistinguishable from a broken parse.
 *
 * The backend answers 404 for "no such thing" AND for "not visible to you", deliberately,
 * so a stranger cannot probe which ids exist. Never render a permission hint from one.
 */
export function resolveMockNotFound<TValue>(path: string): Promise<ActionResponse<TValue>> {
  void path;
  return Promise.resolve({
    success: false,
    error: { code: "404", message: "Not found." },
  });
}

/**
 * Picks the fixture whose slug matches, or a 404 when none does.
 *
 * The shape every mocked DETAIL read wants: a slug that is not in the fixture map must
 * behave like a slug the backend does not know, so `notFound()` runs and the reviewer sees
 * the real 404 page rather than a populated page for the wrong record. Without this the
 * usual shortcut — return the one fixture regardless of slug — makes every detail route
 * look like it resolves, and the 404 branch ships unseen.
 */
export function resolveMockDetail<TValue>(
  path: string,
  schema: z.ZodType<TValue>,
  options: RequestOptions | undefined,
  fixturesBySlug: Readonly<Record<string, unknown>>,
  requestedSlug: string,
): Promise<ActionResponse<TValue>> {
  const fixture = fixturesBySlug[requestedSlug];
  if (fixture === undefined) return resolveMockNotFound(path);
  return resolveMockRead(path, schema, options, fixture);
}

/**
 * A `beforeAll` guard for the specs that read the REAL Express backend.
 *
 * Every other spec in this suite is deliberately backend-free — `sign-up.spec.ts:24` even
 * route-stubs the signup endpoint rather than let a request reach Express. `store-backend.spec.ts` and
 * `rnd-backend.spec.ts` are the two exceptions: they assert that the wired surfaces actually
 * render what the backend returns, so they cannot stub it.
 *
 * WITHOUT THIS GUARD A STOPPED BACKEND IS ~26 CRYPTIC ASSERTION TIMEOUTS. Next still serves a
 * 200 for every one of these routes — the static shell flushes before the fetch fails, and the
 * page then streams in an error panel — so the failures read as "expected heading, got
 * nothing" thirty seconds apart, in three browsers, with nothing naming the cause. One
 * up-front request turns that into one sentence.
 *
 * This is a health check, not a fixture: it makes no assertion of its own and returns nothing.
 */

/**
 * Same default as the app: `next.config.ts:4`, `src/lib/api.ts:10` and
 * `src/lib/auth-client.ts:21` all fall back to this when `NEXT_PUBLIC_API_URL` is unset, which
 * it currently is — `.env` has the line commented out.
 */
const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** `/health` and not `/`: it is the endpoint that reports readiness rather than merely routing. */
const HEALTH_URL = `${BACKEND_BASE_URL}/health`;

const HEALTH_TIMEOUT_MS = 5_000;

function unreachable(reason: string): never {
  throw new Error(
    [
      `The Express backend at ${BACKEND_BASE_URL} is not answering (${reason}).`,
      "",
      "These specs read the live backend on purpose — they cover the surfaces CLAUDE.md",
      "calls fully wired, so there is nothing to assert while it is down.",
      "",
      "Start it in the backend repo, then re-run. Point elsewhere with NEXT_PUBLIC_API_URL.",
    ].join("\n"),
  );
}

/**
 * Fails the calling suite with one readable message when the backend is unreachable.
 *
 * ⚠️ ONLY THE BACKEND IS CHECKED, NOT THE DEV SERVER. A dead `pnpm dev` already fails loudly
 * and unmistakably — `page.goto` reports the connection refusal against `baseURL` — so there
 * is nothing for a second probe to add there.
 */
export async function requireBackend(): Promise<void> {
  let response: Response;
  try {
    response = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS) });
  } catch (error) {
    unreachable(error instanceof Error ? error.message : String(error));
  }

  if (!response.ok) unreachable(`HTTP ${response.status}`);
}

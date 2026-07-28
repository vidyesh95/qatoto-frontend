import { cookies } from "next/headers";
import type { z } from "zod";
import {
  getJson,
  getPaginated,
  type ActionResponse,
  type PaginationMeta,
  type RequestOptions,
} from "@/lib/http";

/**
 * Server-side reads against the Express backend.
 *
 * WHY THIS FILE EXISTS: `credentials: "include"` is a browser concept. In a server
 * component there is no cookie jar, so a plain `getJson` reaches the API as an
 * anonymous caller and every `requireAuth` route answers 401 — or worse, a
 * viewer-aware route quietly returns the signed-out projection. The session cookie has
 * to be forwarded by hand.
 *
 * Import these ONLY from server components — `next/headers` does not resolve in a
 * client bundle, so a `"use client"` file importing this module fails to build. That
 * build error is the guard; there is no runtime fallback.
 *
 * PREFER `callerRequestOptions()`: pass its result to any function in
 * `src/lib/rnd/*.api.ts` so paths and schemas stay defined in exactly one place.
 * The `…AsCaller` wrappers below are for a one-off read with no api-module home.
 */

// Better Auth's default cookie names. The backend sets no `advanced.cookiePrefix`, so
// the session lands on `better-auth.session_token`, gaining a `__Secure-` prefix when
// served over HTTPS. The multiSession plugin adds siblings under the same prefix, so
// match on the prefix rather than naming one cookie.
const AUTH_COOKIE_PREFIXES = ["better-auth.", "__Secure-better-auth."] as const;

function isAuthCookie(cookieName: string): boolean {
  return AUTH_COOKIE_PREFIXES.some((prefix) => cookieName.startsWith(prefix));
}

/**
 * The caller's session as `RequestOptions`, ready to hand to any `*.api.ts` function.
 *
 * Reads are `no-store` because these are per-visitor projections — a cached response
 * would serve one member's view to the next visitor. Signed out, the `Cookie` header is
 * omitted entirely so the request goes out cleanly anonymous.
 *
 * NOTE this makes the calling route dynamic: it reads `cookies()`, so under
 * `cacheComponents` the page needs a Suspense boundary (its `loading.tsx` provides one
 * at the route level).
 */
export async function callerRequestOptions(): Promise<RequestOptions> {
  const cookieStore = await cookies();
  const authCookies = cookieStore.getAll().filter((cookie) => isAuthCookie(cookie.name));

  if (authCookies.length === 0) return { cache: "no-store" };

  return {
    cache: "no-store",
    headers: {
      Cookie: authCookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; "),
    },
  };
}

async function withCallerSession(options: RequestOptions = {}): Promise<RequestOptions> {
  const callerOptions = await callerRequestOptions();
  return {
    ...callerOptions,
    ...options,
    headers: { ...callerOptions.headers, ...options.headers },
  };
}

/** `getJson`, authenticated as the current visitor. */
export async function getJsonAsCaller<T>(
  path: string,
  dataSchema: z.ZodType<T>,
  options?: RequestOptions,
): Promise<ActionResponse<T>> {
  return getJson(path, dataSchema, await withCallerSession(options));
}

/** `getPaginated`, authenticated as the current visitor. */
export async function getPaginatedAsCaller<T>(
  path: string,
  rowSchema: z.ZodType<T>,
  paginationSchema: z.ZodType<PaginationMeta>,
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: T[]; pagination: PaginationMeta }>> {
  return getPaginated(path, rowSchema, paginationSchema, await withCallerSession(options));
}

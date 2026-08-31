import type { z } from "zod";
import { API_BASE_URL } from "@/lib/api";

/**
 * Tagged result for every backend call (CLAUDE.md Pattern 3 — failures are data,
 * not thrown). Component/hook code branches on `success` and never guesses whether
 * an error was swallowed.
 */
export type ActionResponse<T> = { success: true; data: T } | { success: false; error: ApiError };

export interface ApiError {
  /** Machine-readable-ish code: HTTP status, "NETWORK", or "PARSE". */
  readonly code: string;
  /** Human message, taken from the backend envelope when present. */
  readonly message: string;
  /** 422 field errors, when the backend returned them. */
  readonly fieldErrors?: Readonly<Record<string, string[]>>;
  /**
   * The failure envelope's `data`, carried through UNPARSED.
   *
   * A few refusals are only actionable if you can read what came with them: `409 OVER_REFUND`
   * ships the remaining refundable balance, and `502`/`503` on the payment rails ship a provider
   * `reason`. Until now this branch copied `message` and `errors` and dropped `data` on the floor,
   * so those numbers were unreachable from every caller in the app.
   *
   * `unknown`, NOT A TYPED SHAPE, and that is the whole design. `ApiError` is shared by every
   * surface; giving it a `refundableInCents` would promote one route's payload into a global
   * contract and invite the next route to add its own field beside it. The caller that knows what
   * it asked for parses this with Zod at its own boundary — no `as`, no `any` (Pattern 2).
   *
   * Optional and read by nobody unless they opt in, so adding it changed no existing behaviour.
   */
  readonly details?: unknown;
}

/**
 * The Express backend's response envelope. The client treats this as untrusted
 * shape — we read fields defensively, never assert.
 */
interface ApiEnvelope {
  status?: string;
  statusCode?: number;
  message?: string;
  data?: unknown;
  errors?: Record<string, string[]>;
  pagination?: unknown;
  /**
   * Keyset tokens that ride as SIBLINGS of `data` rather than inside it. `unknown`
   * because the network is untrusted — narrowed by `readSiblingCursor` /
   * `readSiblingSequence` below, never asserted.
   */
  nextCursor?: unknown;
  nextSequence?: unknown;
}

function toEnvelope(payload: unknown): ApiEnvelope {
  return typeof payload === "object" && payload !== null ? (payload as ApiEnvelope) : {};
}

const NETWORK_ERROR: ApiError = {
  code: "NETWORK",
  message: "Network error. Please try again.",
};

/**
 * A contract break, WITH the evidence.
 *
 * THIS USED TO BE A FROZEN CONSTANT AND THAT COST REAL DEBUGGING TIME. `safeParse` hands back
 * `error.issues` naming the exact failing path — `data.0.title`, `pagination.total` — and the
 * previous version dropped it on the floor at seven call sites. When one field of one row in a
 * 24-row page mismatched, the whole page failed and the UI said "please try again", with nothing
 * in any console anywhere. There was no way to find out which field.
 *
 * THE FULL ISSUE LIST IS LOGGED SERVER-SIDE ONLY. On the server it lands in the terminal running
 * `pnpm dev`, which is where whoever can fix it is looking. Printing it in the browser would ship
 * our schema's shape to every visitor for no benefit — they cannot act on it.
 *
 * The paths also ride on `fieldErrors` so a caller that wants to surface them in development can,
 * without re-parsing.
 */
function toParseError(path: string, error: z.ZodError): ApiError {
  const issuePaths = error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);

  if (typeof window === "undefined") {
    // eslint-disable-next-line no-console -- the only way a contract break is visible at all
    console.error(`[http] contract mismatch on ${path}`, issuePaths);
  }

  return {
    code: "PARSE",
    message: "Client-side contract validation failed.",
    fieldErrors: { contract: issuePaths },
  };
}

/**
 * Extra per-call transport options. `headers` exists so a server component can
 * forward the session cookie explicitly — `credentials:"include"` is a browser
 * concept and does nothing server-side (see `src/lib/server-http.ts`).
 */
export interface RequestOptions {
  readonly headers?: Readonly<Record<string, string>>;
  /**
   * Caching hint for a server-component read. Leave unset in the browser — React
   * Query owns freshness there.
   */
  readonly cache?: RequestCache;
  /**
   * Let this request outlive the page that started it.
   *
   * TWO CALLERS, AND IT IS NOT OPTIONAL IN EITHER: the watch-progress beacon's final flush on
   * `visibilitychange` / `pagehide`, and the product view beacon, which reports only on leaving and
   * so is ENTIRELY a final flush. Without it the browser cancels the request as the document tears
   * down — and since backgrounding a tab is the COMMON way both a video session and a product page
   * end, most watch time and every product dwell would simply never be reported.
   *
   * `navigator.sendBeacon` is the usual answer and is silently broken for us: the API is
   * cross-origin, an `application/json` body is not CORS-safelisted, and `sendBeacon` cannot
   * issue the required preflight. It returns `true` and the request never arrives.
   *
   * Browsers cap keepalive bodies at 64 kB across all in-flight keepalive requests, which is
   * ample for a three-field beacon and a reason not to reach for this elsewhere.
   */
  readonly keepalive?: boolean;
}

/**
 * Reads the envelope off a Response. Returns the envelope on success, or the
 * `ApiError` describing why the call failed. Every verb below shares this so the
 * error contract can't drift between them.
 */
async function readEnvelope(response: Response): Promise<ActionResponse<ApiEnvelope>> {
  const rawPayload = await response.json().catch(() => null);
  const envelope = toEnvelope(rawPayload);

  if (!response.ok || envelope.status === "error") {
    return {
      success: false,
      error: {
        code: String(envelope.statusCode ?? response.status),
        message: envelope.message ?? "Something went wrong. Please try again.",
        fieldErrors: envelope.errors,
        // Passed through untouched — see `ApiError.details`. Every one of the seven readers below
        // early-returns this result unchanged on failure, so this is the single point where a
        // refusal's payload either survives or is lost for the whole app.
        details: envelope.data,
      },
    };
  }

  return { success: true, data: envelope };
}

/**
 * Init for the shared fetch. `headers` is narrowed to a plain record rather than
 * `HeadersInit` on purpose: `HeadersInit` also admits an array and a `Headers`, and
 * spreading either into an object yields numeric indices instead of header names.
 */
interface EnvelopeRequestInit extends Omit<RequestInit, "headers"> {
  headers: Record<string, string>;
}

/**
 * The single fetch. Sends cookies (`credentials:"include"` — CORS is
 * credentials:true against a single origin) and merges any caller-supplied
 * headers. `body` is either a JSON-serializable value or a `FormData`
 * (multipart) — we must NOT set Content-Type for FormData so the browser can add
 * the multipart boundary.
 */
async function fetchEnvelope(
  path: string,
  init: EnvelopeRequestInit,
  options: RequestOptions = {},
): Promise<ActionResponse<ApiEnvelope>> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: { ...init.headers, ...options.headers },
      ...(options.cache === undefined ? {} : { cache: options.cache }),
      ...(options.keepalive === undefined ? {} : { keepalive: options.keepalive }),
    });
  } catch {
    return { success: false, error: NETWORK_ERROR };
  }

  return readEnvelope(response);
}

/** GET with a Zod schema over `data`. */
export async function getJson<T>(
  path: string,
  dataSchema: z.ZodType<T>,
  options?: RequestOptions,
): Promise<ActionResponse<T>> {
  const envelopeResult = await fetchEnvelope(
    path,
    { method: "GET", headers: { Accept: "application/json" } },
    options,
  );
  if (!envelopeResult.success) return envelopeResult;

  const parsed = dataSchema.safeParse(envelopeResult.data.data);
  if (!parsed.success) return { success: false, error: toParseError(path, parsed.error) };

  return { success: true, data: parsed.data };
}

/**
 * GET for a response that is BYTES rather than an envelope.
 *
 * THE ONE NON-JSON READER IN THIS FILE, and it lives here rather than beside its caller so the
 * error contract cannot drift: a refusal is still the backend's JSON envelope, so `readEnvelope`
 * reads it and the server's own sentence survives — which is the whole point on a route whose
 * two 409s ("still being scanned", "quarantined") mean different things to whoever is reading.
 *
 * `credentials: "include"`, like every other call here. These bytes are decrypted server-side
 * from private storage and there is no shareable URL for them — no presigned link, no token in a
 * query string — so the session cookie is the only way to ask, deliberately.
 *
 * THE CALLER OWNS THE BLOB'S LIFETIME. Whatever turns this into an object URL must revoke it;
 * nothing here can know when a viewer closed.
 */
export async function getBinary(
  path: string,
  options?: RequestOptions,
): Promise<ActionResponse<{ blob: Blob; mediaType: string; fileName: string | null }>> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "*/*", ...options?.headers },
      ...(options?.cache === undefined ? {} : { cache: options.cache }),
    });
  } catch {
    return { success: false, error: NETWORK_ERROR };
  }

  if (!response.ok) {
    // A refusal is JSON even on a route that succeeds with bytes, so this reads exactly like
    // every other failure in this file. `readEnvelope` never returns success for a non-ok
    // response; the fallback exists so the type is honest rather than because it can happen.
    const refusal = await readEnvelope(response);
    return refusal.success
      ? { success: false, error: { code: String(response.status), message: "Request failed." } }
      : refusal;
  }

  let blob: Blob;
  try {
    blob = await response.blob();
  } catch {
    return { success: false, error: NETWORK_ERROR };
  }

  return {
    success: true,
    data: {
      blob,
      // The header, not the blob's own type: a `Content-Type` with parameters still names the
      // media type, and the caller branches on it to pick a renderer.
      mediaType: (response.headers.get("Content-Type") ?? blob.type).split(";")[0]?.trim() ?? "",
      fileName: readContentDispositionFileName(response.headers.get("Content-Disposition")),
    },
  };
}

/**
 * The `filename="…"` out of a `Content-Disposition`, or null.
 *
 * DISPLAY ONLY. The backend already sanitized it, and nothing may use it to build a path — a
 * file name is uploader-supplied text that happens to have travelled through a header.
 */
function readContentDispositionFileName(header: string | null): string | null {
  if (header === null) return null;
  const match = /filename="([^"]*)"/.exec(header);
  const fileName = match?.[1]?.trim();
  return fileName === undefined || fileName.length === 0 ? null : fileName;
}

/**
 * GET with a Zod schema over the WHOLE envelope, not over `data`.
 *
 * `getJson` above hands the schema `envelope.data` and discards every sibling key, which is
 * right for the routes that carry nothing else. `GET /feed/videos` carries THREE top-level
 * siblings — `data`, `pagination` and `rankSeed` — and `rankSeed` is what pins a viewer's
 * ranking across pages. Reading it through `getPaginated` would drop it silently and page 2
 * would reshuffle against a freshly minted seed, showing the same video twice.
 *
 * Pass a `.strip()` schema: `status`, `statusCode` and `message` are on every envelope and
 * no caller wants them.
 */
export async function getEnvelope<T>(
  path: string,
  envelopeSchema: z.ZodType<T>,
  options?: RequestOptions,
): Promise<ActionResponse<T>> {
  const envelopeResult = await fetchEnvelope(
    path,
    { method: "GET", headers: { Accept: "application/json" } },
    options,
  );
  if (!envelopeResult.success) return envelopeResult;

  const parsed = envelopeSchema.safeParse(envelopeResult.data);
  if (!parsed.success) return { success: false, error: toParseError(path, parsed.error) };

  return { success: true, data: parsed.data };
}

/**
 * JSON-body mutation. Pass `undefined` for a bodyless call.
 *
 * `PUT` is in the union for exactly one route — `PUT /milestones/:id/variance`, which is
 * idempotent by design: recording the same variance twice must leave one row, not two.
 * Do not reach for it elsewhere; every other mutation in this app is POST or PATCH.
 */
export async function sendJson<T>(
  path: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body: unknown,
  dataSchema: z.ZodType<T>,
  options?: RequestOptions,
): Promise<ActionResponse<T>> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const init: EnvelopeRequestInit = { method, headers };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  const envelopeResult = await fetchEnvelope(path, init, options);
  if (!envelopeResult.success) return envelopeResult;

  const parsed = dataSchema.safeParse(envelopeResult.data.data);
  if (!parsed.success) return { success: false, error: toParseError(path, parsed.error) };

  return { success: true, data: parsed.data };
}

/** Multipart mutation. Never sets Content-Type — the browser sets the boundary. */
export async function sendForm<T>(
  path: string,
  method: "POST" | "PATCH",
  formData: FormData,
  dataSchema: z.ZodType<T>,
  options?: RequestOptions,
): Promise<ActionResponse<T>> {
  const envelopeResult = await fetchEnvelope(
    path,
    { method, headers: { Accept: "application/json" }, body: formData },
    options,
  );
  if (!envelopeResult.success) return envelopeResult;

  const parsed = dataSchema.safeParse(envelopeResult.data.data);
  if (!parsed.success) return { success: false, error: toParseError(path, parsed.error) };

  return { success: true, data: parsed.data };
}

/**
 * GET an offset-paginated list. The backend puts the array in `data` and
 * pagination as a SIBLING of `data`, which is why this parses the envelope rather
 * than only its `data` field.
 */
export async function getPaginated<T>(
  path: string,
  rowSchema: z.ZodType<T>,
  paginationSchema: z.ZodType<PaginationMeta>,
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: T[]; pagination: PaginationMeta }>> {
  const envelopeResult = await fetchEnvelope(
    path,
    { method: "GET", headers: { Accept: "application/json" } },
    options,
  );
  if (!envelopeResult.success) return envelopeResult;

  const rowsParsed = rowSchema.array().safeParse(envelopeResult.data.data);
  const paginationParsed = paginationSchema.safeParse(envelopeResult.data.pagination);
  if (!rowsParsed.success) return { success: false, error: toParseError(path, rowsParsed.error) };
  if (!paginationParsed.success) {
    return { success: false, error: toParseError(`${path} (pagination)`, paginationParsed.error) };
  }

  return { success: true, data: { rows: rowsParsed.data, pagination: paginationParsed.data } };
}

/**
 * GET a keyset-paginated list whose cursor rides INSIDE `data` —
 * `data: { …rows, nextCursor }` — so the caller passes a schema for the whole `data`
 * object rather than for one row. `GET /daily-logs` (the array is named `logs`) is the
 * only caller: `GET …/workshop/chat` (`messages`) and `GET /notifications`
 * (`notifications`) have the same shape but no read in this repo yet — chat arrives as
 * part of the single composite `…/workshop` read.
 *
 * THIS IS ONE OF TWO KEYSET ENVELOPE SHAPES, so check which one a read uses before
 * reaching for a helper. The other puts the token as a SIBLING of a bare `data` array —
 * see `getCursorSiblingList` / `getSequenceSiblingList` below.
 *
 * Cursors are opaque plain strings, not base64: `logDate_submittedAtMs_id` for the
 * daily-log feed, `sentAtMs_id` for workshop chat. Never construct or compare one
 * client-side — echo back exactly what the server sent, or it is a
 * `422 CURSOR_MALFORMED`.
 */
export function getCursorPaginated<T>(
  path: string,
  pageSchema: z.ZodType<T>,
  options?: RequestOptions,
): Promise<ActionResponse<T>> {
  return getJson(path, pageSchema, options);
}

/**
 * Narrows an untrusted sibling cursor to `string | null`.
 *
 * Collapses THREE cases to `null` in one place: the key absent (offset-mode responses
 * omit it), an explicit `null` (end of the list), and any non-string a backend change
 * could put there. All three mean "there is no next page to ask for", which is the only
 * question a caller has.
 */
function readSiblingCursor(envelope: ApiEnvelope): string | null {
  return typeof envelope.nextCursor === "string" ? envelope.nextCursor : null;
}

/** The sequence counterpart. A non-integer is treated as absent, not coerced. */
function readSiblingSequence(envelope: ApiEnvelope): number | null {
  return typeof envelope.nextSequence === "number" && Number.isInteger(envelope.nextSequence)
    ? envelope.nextSequence
    : null;
}

/**
 * GET a keyset list whose token is a SIBLING of a bare `data` array —
 * `{ data: [...], nextCursor }`.
 *
 * The rows deliberately did NOT move under an envelope key when these reads gained a
 * cursor, because that would have broken every client already parsing `data` as an array.
 * So the shape is neither `getPaginated`'s nor `getCursorPaginated`'s, and it needs its
 * own parse: the array comes from `data`, the token from the envelope root.
 *
 * Used by `GET …/effort-claims` (`<YYYY-MM-DD>_<id>`) and
 * `GET …/allocation-proposals` (`<epochMs>_<id>`).
 *
 * NEVER SEND `page` AND `cursor` TOGETHER. The backend silently drops `page`, and on the
 * claims list `pagination` disappears with it — no error, just a missing block.
 */
export async function getCursorSiblingList<TRow>(
  path: string,
  rowSchema: z.ZodType<TRow>,
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: TRow[]; nextCursor: string | null }>> {
  const envelopeResult = await fetchEnvelope(
    path,
    { method: "GET", headers: { Accept: "application/json" } },
    options,
  );
  if (!envelopeResult.success) return envelopeResult;

  const rowsParsed = rowSchema.array().safeParse(envelopeResult.data.data);
  if (!rowsParsed.success) return { success: false, error: toParseError(path, rowsParsed.error) };

  return {
    success: true,
    data: { rows: rowsParsed.data, nextCursor: readSiblingCursor(envelopeResult.data) },
  };
}

/**
 * The same sibling shape, but the token is a SEQUENCE NUMBER —
 * `{ data: [...], nextSequence }` — echoed back as `?fromSequence=`.
 *
 * Used by `GET …/slice-ledger` and `GET …/audit-trail`. Both are append-only and ordered
 * by `sequenceNumber` ASC, which is gapless and monotonic by construction and therefore a
 * better cursor than any timestamp: two rows can share a millisecond, and on a slice
 * ledger a skipped row is somebody's equity.
 */
export async function getSequenceSiblingList<TRow>(
  path: string,
  rowSchema: z.ZodType<TRow>,
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: TRow[]; nextSequence: number | null }>> {
  const envelopeResult = await fetchEnvelope(
    path,
    { method: "GET", headers: { Accept: "application/json" } },
    options,
  );
  if (!envelopeResult.success) return envelopeResult;

  const rowsParsed = rowSchema.array().safeParse(envelopeResult.data.data);
  if (!rowsParsed.success) return { success: false, error: toParseError(path, rowsParsed.error) };

  return {
    success: true,
    data: { rows: rowsParsed.data, nextSequence: readSiblingSequence(envelopeResult.data) },
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** A value that can appear in a query string. `undefined` is dropped entirely. */
export type QueryParamValue = string | number | boolean | readonly string[] | undefined;

/**
 * Builds a query string from a param record, returning "" when nothing survives
 * (so callers can always append it).
 *
 * An array value REPEATS its key — `{ capability: ["cnc", "injection"] }` becomes
 * `?capability=cnc&capability=injection`, which `GET /suppliers` reads as AND. An
 * empty array is dropped, exactly like `undefined`: it means "no filter", not
 * "match nothing".
 *
 * Callers must only pass keys the endpoint's schema declares. Every backend query
 * schema is `.strict()`, so an unrecognized key is a 422, never a silently
 * ignored param.
 */
export function buildQueryString(params: Record<string, QueryParamValue>): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const entry of value) searchParams.append(key, entry);
      continue;
    }
    searchParams.append(key, String(value));
  }

  const queryString = searchParams.toString();
  return queryString.length > 0 ? `?${queryString}` : "";
}

/**
 * Error thrown at the hook boundary so React Query's `error` carries the backend
 * envelope (message, code, 422 fieldErrors). UI reads `.apiError`.
 *
 * The transport layer above never throws — this is the one place a tagged result
 * is converted into an exception, because React Query needs one to mark a query
 * failed.
 */
export class ApiRequestError extends Error {
  readonly apiError: ApiError;
  constructor(apiError: ApiError) {
    super(apiError.message);
    this.name = "ApiRequestError";
    this.apiError = apiError;
  }
}

/** Throw on failure so a mutation chain aborts; return data on success. */
export function unwrap<T>(result: ActionResponse<T>): T {
  if (!result.success) throw new ApiRequestError(result.error);
  return result.data;
}

/** True when the backend refused for want of a session. */
export function isUnauthorized(error: ApiError): boolean {
  return error.code === "401";
}

/**
 * True when the backend refused a caller that IS signed in.
 *
 * Distinct from `isUnauthorized` because the fix is different, and offering the wrong one is
 * a dead end for the user. `requireIdentifiedUser` answers 403 to an anonymous-session
 * account — better-auth's `anonymous()` mints real sessions, so these callers have a cookie
 * and a userId and would sail past a 401 check. Their affordance is "finish signing up",
 * not "sign in". Engagement writes and the R&D write surface both sit behind it.
 */
export function isForbidden(error: ApiError): boolean {
  return error.code === "403";
}

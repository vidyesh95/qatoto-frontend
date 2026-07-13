import type { z } from "zod";
import { API_BASE_URL } from "@/lib/api";

/**
 * Tagged result for every backend call (CLAUDE.md Pattern 3 — failures are data,
 * not thrown). Component/hook code branches on `success` and never guesses whether
 * an error was swallowed.
 */
export type ActionResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError };

export interface ApiError {
  /** Machine-readable-ish code: HTTP status, "NETWORK", or "PARSE". */
  readonly code: string;
  /** Human message, taken from the backend envelope when present. */
  readonly message: string;
  /** 422 field errors, when the backend returned them. */
  readonly fieldErrors?: Readonly<Record<string, string[]>>;
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
}

function toEnvelope(payload: unknown): ApiEnvelope {
  return typeof payload === "object" && payload !== null ? (payload as ApiEnvelope) : {};
}

/**
 * Core request runner. Sends cookies (`credentials:"include"` — CORS is
 * credentials:true with a single origin), parses the envelope, and validates the
 * `data` field with the caller's Zod schema. `body` is either a JSON-serializable
 * value or a `FormData` (multipart) — we must NOT set Content-Type for FormData so
 * the browser can add the multipart boundary.
 */
async function request<T>(
  path: string,
  init: RequestInit,
  dataSchema: z.ZodType<T>,
): Promise<ActionResponse<T>> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      credentials: "include",
    });
  } catch {
    return { success: false, error: { code: "NETWORK", message: "Network error. Please try again." } };
  }

  const rawPayload = await response.json().catch(() => null);
  const envelope = toEnvelope(rawPayload);

  if (!response.ok || envelope.status === "error") {
    return {
      success: false,
      error: {
        code: String(envelope.statusCode ?? response.status),
        message: envelope.message ?? "Something went wrong. Please try again.",
        fieldErrors: envelope.errors,
      },
    };
  }

  const parsed = dataSchema.safeParse(envelope.data);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "PARSE", message: "Client-side contract validation failed." },
    };
  }

  return { success: true, data: parsed.data };
}

/** GET with a Zod schema over `data`. */
export function getJson<T>(path: string, dataSchema: z.ZodType<T>): Promise<ActionResponse<T>> {
  return request(path, { method: "GET", headers: { Accept: "application/json" } }, dataSchema);
}

/** JSON-body mutation (POST/PATCH/DELETE). Pass `undefined` for a bodyless call. */
export function sendJson<T>(
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  body: unknown,
  dataSchema: z.ZodType<T>,
): Promise<ActionResponse<T>> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const init: RequestInit = { method, headers };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  return request(path, init, dataSchema);
}

/** Multipart mutation. Never sets Content-Type — the browser sets the boundary. */
export function sendForm<T>(
  path: string,
  method: "POST" | "PATCH",
  formData: FormData,
  dataSchema: z.ZodType<T>,
): Promise<ActionResponse<T>> {
  return request(path, { method, headers: { Accept: "application/json" }, body: formData }, dataSchema);
}

/**
 * GET a paginated list. The backend puts the array in `data` and pagination as a
 * SIBLING of `data`, so we parse the whole envelope here rather than via `request`.
 */
export async function getPaginated<T>(
  path: string,
  rowSchema: z.ZodType<T>,
  paginationSchema: z.ZodType<PaginationMeta>,
): Promise<ActionResponse<{ rows: T[]; pagination: PaginationMeta }>> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
  } catch {
    return { success: false, error: { code: "NETWORK", message: "Network error. Please try again." } };
  }

  const rawPayload = await response.json().catch(() => null);
  const envelope = toEnvelope(rawPayload);

  if (!response.ok || envelope.status === "error") {
    return {
      success: false,
      error: {
        code: String(envelope.statusCode ?? response.status),
        message: envelope.message ?? "Something went wrong. Please try again.",
        fieldErrors: envelope.errors,
      },
    };
  }

  const rowsParsed = rowSchema.array().safeParse(envelope.data);
  const paginationParsed = paginationSchema.safeParse(envelope.pagination);
  if (!rowsParsed.success || !paginationParsed.success) {
    return {
      success: false,
      error: { code: "PARSE", message: "Client-side contract validation failed." },
    };
  }

  return { success: true, data: { rows: rowsParsed.data, pagination: paginationParsed.data } };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

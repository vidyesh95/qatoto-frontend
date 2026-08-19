// TRANSPORT: props-only — a schema, no network of its own.
//
// The wire contract for a copy of everything held about you (GDPR Art. 15 and Art. 20).

import { z } from "zod";

/**
 * Where the archive is.
 *
 * `state` IS HOW THE CLIENT LEARNS "NOT YET", because the HTTP status cannot tell it. The
 * backend answers `POST` with a 202, but `readEnvelope` in `@/lib/http` treats every 2xx
 * as success and discards `statusCode` — so a caller that tried to distinguish accepted
 * from done by status would find both look identical. The verdict lives in this field and
 * the poll is what carries it.
 */
export const DataExportStatusSchema = z
  .object({
    requestId: z.string(),
    state: z.enum(["pending", "running", "ready", "failed", "expired"]),
    requestedAt: z.string(),
    completedAt: z.string().nullable(),
    /** When the ARCHIVE dies. Not when the link below does — those are different clocks. */
    expiresAt: z.string().nullable(),
    /**
     * Present only while `ready`, minted per read, and alive for five minutes.
     *
     * NEVER CACHE THIS. It is a bearer credential to a complete copy of one person's
     * personal data, and a stale one renders as a working button that 403s.
     */
    downloadUrl: z.string().nullable(),
    byteSize: z.number().int().nullable(),
  })
  .strip();

export type DataExportStatus = z.infer<typeof DataExportStatusSchema>;

/**
 * `GET` answers `null` when nobody has ever asked for an export.
 *
 * A REAL ANSWER, NOT A 404, and the schema says so out loud: the backend returns 200 with
 * `data: null` precisely so the client never has to translate an error into an absence —
 * which is how a network failure ends up rendering as "you have no export".
 */
export const DataExportStatusOrNoneSchema = DataExportStatusSchema.nullable();

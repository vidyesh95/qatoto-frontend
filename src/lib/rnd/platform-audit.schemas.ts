import { z } from "zod";

// The PLATFORM audit chain — `GET /admin/audit-trail`. Distinct from the project-scoped
// chain in `proof-of-effort.schemas.ts`: that one records equity events inside one project,
// this one records staff decisions across the whole platform.
//
// READ-ONLY BY CONSTRUCTION. The router carries no write route; entries are appended by the
// services that make the decisions, never by a client.

/**
 * One decision, as read back.
 *
 * `eventKind` IS A BARE STRING, NOT AN ENUM, on purpose. The backend's list is 21 values and
 * grows whenever a new staff action is audited; parsing it as a closed enum would make a
 * backend release that audits one more thing break this read entirely. A caller that cares
 * about a specific kind compares to a literal.
 *
 * `payload` IS NOT ON THE WIRE. The backend's list projection omits it, so two decisions of
 * the same kind are told apart only by `actionLabel` and `targetLabel` — which is why the
 * taxonomy services write "paper category <id>" versus "category <id>" into the latter.
 *
 * `entryHash` is the full digest. Any short form a UI shows is a rendering — never key a
 * list or an equality test on it.
 */
export const PlatformAuditEntrySchema = z
  .object({
    id: z.string(),
    sequenceNumber: z.number(),
    eventKind: z.string(),
    actorUserId: z.string(),
    /** Null when the actor's account is gone. Render the id, never "Unknown moderator". */
    actorName: z.string().nullable(),
    /** The role AT THE TIME. A later revocation must not rewrite what the log says. */
    actorRoleSnapshot: z.string(),
    actionLabel: z.string(),
    targetLabel: z.string(),
    detailNote: z.string(),
    occurredAt: z.string(),
    entryHash: z.string(),
    previousEntryHash: z.string().nullable(),
  })
  .strip();
export type PlatformAuditEntry = z.infer<typeof PlatformAuditEntrySchema>;

/**
 * A page of the chain.
 *
 * `data` is this OBJECT, not a bare array with a sibling token — unlike the slice ledger.
 * `nextSequence` is a keyset, never an offset: entries are ordered by `sequenceNumber`,
 * which is gapless and monotonic, so a page boundary cannot skip a decision the way an
 * offset can when a row lands mid-read.
 */
export const PlatformAuditPageSchema = z
  .object({
    rows: z.array(PlatformAuditEntrySchema),
    total: z.number(),
    nextSequence: z.number().nullable(),
  })
  .strip();
export type PlatformAuditPage = z.infer<typeof PlatformAuditPageSchema>;

/** The two kinds both taxonomies write. Shared deliberately — a paper-specific pair would
 *  have needed a migration to add an enum value. */
export const TAXONOMY_DECISION_EVENT_KINDS = [
  "taxonomy_category_approved",
  "taxonomy_category_rejected",
] as const;
export type TaxonomyDecisionEventKind = (typeof TAXONOMY_DECISION_EVENT_KINDS)[number];

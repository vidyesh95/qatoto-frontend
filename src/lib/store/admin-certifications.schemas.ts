// TRANSPORT: props-only — schemas and display copy for the staff certification queue.
//
// The moderator's projection is the SELLER's projection plus whose claim it is: a queue of standard
// names with no company attached is undecidable. It carries both names the organization has, and
// that is deliberate — the certificate names the LEGAL entity, which is what the moderator compares
// the PDF against, while `displayName` is who a buyer thinks they are dealing with. A mismatch
// between the two is itself a finding rather than a rendering problem.
//
// WHAT IS ABSENT AND MUST STAY ABSENT: any evidence document id, URL or token. See the header of
// `admin-certifications.api.ts`.

import { z } from "zod";

import { OwnedCertificationSchema } from "@/lib/store/organizations.schemas";
import { cursorPageOf } from "@/lib/store/shared.schemas";

export const ModerationCertificationSchema = OwnedCertificationSchema.extend({
  organization: z
    .object({
      id: z.string(),
      legalName: z.string(),
      displayName: z.string(),
      slug: z.string(),
    })
    .strip(),
}).strip();
export type ModerationCertification = z.infer<typeof ModerationCertificationSchema>;

export const ModerationCertificationPageSchema = cursorPageOf(ModerationCertificationSchema);
export type ModerationCertificationPage = z.infer<typeof ModerationCertificationPageSchema>;

/**
 * The queue's query. Every key is optional: omitting `state` asks the server for its own default,
 * which is `pending`.
 *
 * CAMELCASE KEYS, snake_case values — `state` is a Postgres `pgEnum` label sent verbatim, and
 * "correcting" one to kebab-case is a 422 from a `.strict()` query schema.
 */
export interface ModerationCertificationQuery {
  readonly state?: (typeof MODERATION_CERTIFICATION_STATES)[number];
  readonly cursor?: string;
  readonly limit?: number;
}

export const MODERATION_CERTIFICATION_STATES = [
  "pending",
  "approved",
  "rejected",
  "withdrawn",
] as const;

/**
 * The decision body — a discriminated union, mirroring the backend's.
 *
 * A REASON BELONGS TO A REJECTION AND ONLY TO A REJECTION. The backend's schema is `.strict()`, so
 * sending `decisionReason` beside `kind: "approve"` is a 422, not an ignored field. That shape is
 * the point: an approval needs no justification a seller could read, and a refusal needs one they
 * can act on.
 */
export type CertificationDecisionInput =
  | { readonly kind: "approve" }
  | { readonly kind: "reject"; readonly decisionReason: string };

/** Queue copy. Says what the state MEANS to the seller, not what the column is called. */
export const MODERATION_CERTIFICATION_STATE_LABELS: Record<
  (typeof MODERATION_CERTIFICATION_STATES)[number],
  string
> = {
  pending: "Awaiting a decision",
  approved: "Approved and published",
  rejected: "Refused, with a reason",
  withdrawn: "Retracted by the seller",
};

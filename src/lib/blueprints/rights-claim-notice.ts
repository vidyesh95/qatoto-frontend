// TRANSPORT: props-only — builds a notice and a `mailto:` string. No network, no DOM, no React.
//
// The `src/lib/privacy-request.ts` precedent, and it copies that file's two load-bearing caveats:
//
// ⚠️ NOTHING HERE IS A TRUST BOUNDARY. A `mailto:` is a hint to the visitor's own mail client.
// Anyone can edit the body before sending, the address it arrives from is whatever their client
// uses, and none of it has been checked by anything. Whoever reads the notice must satisfy
// themselves that the sender is who the text says before acting on it — the three sworn clauses are
// what the claimant asserts, not what Qatoto has verified.
//
// ⚠️ THE POINT OF PREFILLING IS ACTIONABILITY. A bare "take this down" naming no right, no target
// and nobody is a notice the operator must either refuse or answer by guessing. The body below is
// COMPLETE ON ITS OWN: a support inbox that has never seen this form can read one email and know
// what is claimed, over what, by whom, and on what standing.
//
// WHEN THE TABLE EXISTS this file does not go away. A prepared notice is still the fallback for the
// same reason privacy-request.ts survived two of its rights getting endpoints: a legal notice must
// not depend on a job queue being up.

import {
  RIGHTS_CLAIM_KIND_LABELS,
  RIGHTS_CLAIM_SWORN_CLAUSES,
  type RightsClaimDraft,
  type RightsClaimTarget,
} from "@/lib/blueprints/rights-claim.schemas";
import { SUPPORT_CONTACT_EMAIL } from "@/lib/site";
import { formatIsoInstantLabel } from "@/lib/store/format";

/**
 * What the claimed target is called in the notice.
 *
 * ⚠️ IT TAKES THE RESOLVED LABEL, not the id. The id identifies the row; the label is what a human
 * reading the email can match against the page. Sending `doc-004` alone would make the reader open
 * the teardown and count files. Both go in — the label so it can be read, the id so it is exact.
 */
export interface ResolvedClaimTargetLabel {
  readonly description: string;
  readonly identifier: string | null;
}

export function describeClaimTarget(
  target: RightsClaimTarget,
  resolveLabel: (target: RightsClaimTarget) => string | null,
): ResolvedClaimTargetLabel {
  const resolvedLabel = resolveLabel(target);

  switch (target.kind) {
    case "whole_teardown":
      return { description: "The whole teardown", identifier: null };
    case "document":
      return {
        description: `Document: ${resolvedLabel ?? "(unnamed)"}`,
        identifier: target.documentId,
      };
    case "manufacturing_file":
      return {
        description: `Fabrication file: ${resolvedLabel ?? "(unnamed)"}`,
        identifier: target.manufacturingFileId,
      };
    case "part":
      return { description: `Part: ${resolvedLabel ?? "(unnamed)"}`, identifier: target.partId };
    default: {
      const exhaustiveCheck: never = target;
      return exhaustiveCheck;
    }
  }
}

export interface RightsClaimNotice {
  readonly subject: string;
  /** The full notice as plain text — what the mailto carries and what the copy button copies. */
  readonly body: string;
  readonly mailtoHref: string;
  readonly recipientEmail: string;
}

/**
 * Build the notice.
 *
 * ⚠️ THE TEARDOWN URL IS ABSOLUTE AND IS NOT OPTIONAL. A relative path in an email is useless, and
 * the title alone is ambiguous the moment two surveys of similar units exist. It is the one line
 * that lets a reader go straight to the row.
 *
 * ⚠️ THE SWORN STATEMENTS ARE WRITTEN OUT IN FULL, above the claimant's name, and not summarised as
 * "the claimant has accepted the required statements". The email has to stand alone as the document
 * that was sworn; a reference to statements the reader cannot see is worth nothing, and the wording
 * is what makes the notice actionable.
 */
export function buildRightsClaimNotice(input: {
  readonly draft: RightsClaimDraft;
  readonly teardownTitle: string;
  readonly teardownUrl: string;
  readonly targetLabel: ResolvedClaimTargetLabel;
  /** ISO instant, passed in rather than read here so this stays pure and deterministic. */
  readonly preparedAtIsoInstant: string;
}): RightsClaimNotice {
  const { draft, teardownTitle, teardownUrl, targetLabel, preparedAtIsoInstant } = input;

  // " · " separators, the ones the site's own page titles use, not em dashes (PRODUCT.md copy rule).
  const subject = `Intellectual property notice · ${RIGHTS_CLAIM_KIND_LABELS[draft.claimKind]} · ${teardownTitle}`;

  const bodyLines = [
    "To whoever handles intellectual property notices at Qatoto,",
    "",
    "I am giving notice of an intellectual property concern about a teardown published on Qatoto.",
    "",
    "THE TEARDOWN",
    `Title: ${teardownTitle}`,
    `Address: ${teardownUrl}`,
    "",
    "WHAT I CLAIM",
    `Kind of right: ${RIGHTS_CLAIM_KIND_LABELS[draft.claimKind]}`,
    `What I object to: ${targetLabel.description}`,
    // The identifier only appears when the claim is against one item; on a whole-teardown claim
    // there is nothing to identify beyond the address above.
    ...(targetLabel.identifier === null ? [] : [`Reference: ${targetLabel.identifier}`]),
    "",
    draft.claimSubstance,
    "",
    "WHO I AM",
    `Name: ${draft.claimantFullName}`,
    ...(draft.claimantOrganizationName === null
      ? []
      : [`Organisation: ${draft.claimantOrganizationName}`]),
    `Email: ${draft.claimantEmail}`,
    `Standing: ${draft.relationshipToRightsHolder}`,
    "",
    "WHAT I SWEAR",
    ...RIGHTS_CLAIM_SWORN_CLAUSES.map((clause) => `- ${clause.label}. ${clause.detail}`),
    "",
    // ⚠️ FORMATTED, NOT THE RAW INSTANT. `2026-09-10T15:17:35.100Z` in a letter somebody reads is
    // machine output leaking into prose, and the milliseconds are noise. `formatIsoInstantLabel`
    // NAMES THE ZONE, which matters more here than anywhere else on the surface: this line is the
    // claimant's own record of when they gave notice, and two parties in two countries must read the
    // same moment from it.
    `Prepared ${formatIsoInstantLabel(preparedAtIsoInstant)} using the notice form at ${teardownUrl}/report.`,
    "",
    draft.claimantFullName,
  ];

  const body = bodyLines.join("\n");

  return {
    subject,
    body,
    recipientEmail: SUPPORT_CONTACT_EMAIL,
    mailtoHref: `mailto:${SUPPORT_CONTACT_EMAIL}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`,
  };
}

/**
 * Why the notice cannot be prepared yet, or `null`.
 *
 * ⚠️ IT NAMES THE MISSING STATEMENTS, for the reason `describeAttestationGap` gives on the publisher
 * side: a disabled control with no explanation is the commonest way a form wastes an afternoon.
 */
export function describeSwornClauseGap(acceptedClauseIds: readonly string[]): string | null {
  const outstandingClauses = RIGHTS_CLAIM_SWORN_CLAUSES.filter(
    (clause) => !acceptedClauseIds.includes(clause.id),
  );
  if (outstandingClauses.length === 0) return null;

  return `${outstandingClauses.length} of ${RIGHTS_CLAIM_SWORN_CLAUSES.length} statements still unsworn: ${outstandingClauses
    .map((clause) => clause.label)
    .join("; ")}.`;
}

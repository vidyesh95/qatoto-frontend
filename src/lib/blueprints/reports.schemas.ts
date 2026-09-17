// CONTRACT: reader reports on a published blueprint.
//
// ⚠️ **THIS IS NOT THE RIGHTS-CLAIM FLOW AND THE TWO MUST NOT BE MERGED.**
// `/blueprints/teardowns/[slug]/report` builds a legal notice and a `mailto:` — three sworn
// clauses, a named right, a claimant with standing, and a specific file chosen from
// `claim-targets`. This is a reader saying "this looks wrong". Merging them would mean a form that
// swears legal statements on behalf of somebody reporting spam.

import { z } from "zod";

/**
 * ⚠️ snake_case, SENT VERBATIM — these are the server's pgEnum labels. A kebab or camel spelling on
 * the wire is a DIFFERENT, ABSENT label, and the mismatch arrives as a 422 nobody can act on.
 */
export const BLUEPRINT_REPORT_REASONS = [
  "rights_claim",
  "fabricated_measurements",
  "dangerous_procedure",
  "not_the_stated_product",
  "spam",
  "other",
] as const;

export type BlueprintReportReason = (typeof BLUEPRINT_REPORT_REASONS)[number];

/**
 * What each reason says to a reader.
 *
 * ⚠️ EVERY ONE NAMES SOMETHING THE PLATFORM CAN ACTUALLY DO. `rights_claim` is the only reason that
 * can reach a quarantine, and it says so obliquely — a reader should not have to know the word.
 */
export const BLUEPRINT_REPORT_REASON_LABELS: Readonly<Record<BlueprintReportReason, string>> = {
  rights_claim: "It publishes someone's files or designs without permission",
  fabricated_measurements: "The measurements or test figures look made up",
  dangerous_procedure: "A step in it would injure someone",
  not_the_stated_product: "It is not about the product it names",
  spam: "Spam or advertising",
  other: "Something else",
};

export const CreatedBlueprintReportSchema = z.object({ reportId: z.string() });
export type CreatedBlueprintReport = z.infer<typeof CreatedBlueprintReportSchema>;

/** One row of the reporter's own list. Deliberately narrow — see the transport's docblock. */
export const MyBlueprintReportSchema = z.object({
  reportId: z.string(),
  targetKind: z.enum(["teardown", "case_study", "showcase"]),
  targetTitle: z.string(),
  reason: z.enum(BLUEPRINT_REPORT_REASONS),
  status: z.enum(["open", "actioned", "dismissed"]),
  createdAt: z.string(),
});
export type MyBlueprintReport = z.infer<typeof MyBlueprintReportSchema>;

export type BlueprintReportArm = "teardown" | "case_study" | "showcase";

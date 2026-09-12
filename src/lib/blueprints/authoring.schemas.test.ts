import { describe, expect, it } from "vitest";

import { TeardownSubmissionReceiptSchema, TeardownSubmissionSchema } from "./authoring.schemas";

/**
 * The two RESPONSE shapes on the teardown authoring arm.
 *
 * Nothing else exercises them: the wizard's own cases stop at the draft, and the fixtures that used
 * to parse through `TeardownSubmissionSchema` went with the mock. What is written down here is the
 * pair of decisions that are invisible until the day they matter — stripping rather than stricting,
 * and catching an unknown state rather than failing the list.
 */

const PUBLISHED_ROW = {
  submissionId: "tsub_1",
  title: "Inside a supermarket cordless drill",
  subjectProductName: "Rotel RD-18 cordless drill",
  moderationState: "published",
  submittedAt: "2026-03-05T09:00:00.000Z",
  publicSlug: "inside-a-supermarket-cordless-drill",
  moderatorNote: null,
};

describe("TeardownSubmissionReceiptSchema", () => {
  it("accepts the three fields a 202 answers with", () => {
    const parsed = TeardownSubmissionReceiptSchema.safeParse({
      submissionId: "tsub_1",
      moderationState: "pending_review",
      receivedAt: "2026-03-05T09:00:00.000Z",
    });

    expect(parsed.success).toBe(true);
  });

  /**
   * ⚠️ THIS IS THE `.strict()` → `.strip()` CORRECTION, WRITTEN DOWN SO IT CANNOT BE QUIETLY
   * REVERTED. A response shape that refused unknown keys would turn an ACCEPTED submission into a
   * parse failure — telling an author their work was lost — the first time anybody added a field to
   * the 202 body.
   */
  it("ignores a field a later backend release adds", () => {
    const parsed = TeardownSubmissionReceiptSchema.safeParse({
      submissionId: "tsub_1",
      moderationState: "pending_review",
      receivedAt: "2026-03-05T09:00:00.000Z",
      queuePosition: 3,
    });

    expect(parsed.success).toBe(true);
    expect(parsed.data).not.toHaveProperty("queuePosition");
  });
});

describe("TeardownSubmissionSchema", () => {
  it("reads a state this build does not know as unknown", () => {
    const parsed = TeardownSubmissionSchema.safeParse({
      ...PUBLISHED_ROW,
      moderationState: "under_appeal",
      publicSlug: null,
    });

    expect(parsed.success).toBe(true);
    expect(parsed.data?.moderationState).toBe("unknown");
  });

  /**
   * ⚠️ THE ACTUAL CLAIM, WHICH THE SINGLE-ROW CASE ABOVE CANNOT SHOW. `/mine` is ONE array parse, so
   * without the catch a single unrecognised row fails every row and the author is shown "Couldn't
   * load your teardowns" instead of the ones they can read.
   */
  it("keeps the rows it understands when one row is a state it does not", () => {
    const parsed = TeardownSubmissionSchema.array().safeParse([
      PUBLISHED_ROW,
      {
        ...PUBLISHED_ROW,
        submissionId: "tsub_2",
        moderationState: "under_appeal",
        publicSlug: null,
      },
    ]);

    expect(parsed.success).toBe(true);
    expect(parsed.data).toHaveLength(2);
  });

  /** A rejection with no reason is the most useless row this surface could show anybody. */
  it("refuses a rejection with no moderator note", () => {
    const parsed = TeardownSubmissionSchema.safeParse({
      ...PUBLISHED_ROW,
      moderationState: "rejected",
      publicSlug: null,
      moderatorNote: null,
    });

    expect(parsed.success).toBe(false);
  });

  it("refuses a published row with no public address", () => {
    const parsed = TeardownSubmissionSchema.safeParse({ ...PUBLISHED_ROW, publicSlug: null });

    expect(parsed.success).toBe(false);
  });
});

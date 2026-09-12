import { describe, expect, it } from "vitest";

import {
  isTeardownManufacturingFileKind,
  summarizeTeardownAttestation,
  TeardownModerationDecisionSchema,
  TeardownReviewItemSchema,
  TeardownReviewQueuePageSchema,
  TEARDOWN_REVIEW_FILE_KIND_LABELS,
  TEARDOWN_REVIEW_FILE_KINDS,
} from "./teardown-moderation.schemas";
import {
  BLUEPRINT_DOCUMENT_KINDS,
  TEARDOWN_MANUFACTURING_FILE_KINDS,
} from "@/lib/blueprints/schemas";

/**
 * The moderator contract for the teardown arm.
 *
 * What is written down here is the handful of decisions that are invisible until the day they
 * matter: that a document this build cannot read costs ONE card rather than the whole queue, that a
 * file carrying the other vocabulary still gets a label, and that the publish-only fields cannot
 * leak into a send-back body.
 */

const PRESENT_PAYLOAD = {
  subjectKind: "existing_physical_product",
  title: "Inside a supermarket cordless drill",
  summary: "Eleven fasteners, two of them hidden under the label.",
  provenance: {
    kind: "community_reverse_engineered",
    subjectProductName: "Rotel RD-18 cordless drill",
    unitAcquisition: "retail_purchase",
    surveyMethods: ["empirical_teardown"],
    surveyedAt: "2026-01-05T12:00:00.000Z",
    licence: null,
    authorizationNote: null,
    attestationAcceptedAt: "2026-01-06T09:00:00.000Z",
    notes: null,
  },
  materials: [],
  parts: [{ label: "Gearbox housing", material: "Glass-filled nylon" }],
  documents: [],
  manufacturingFiles: [],
  walkthroughVideo: null,
  tags: ["power-tools"],
  acceptedAttestationClauseIds: [
    "lawful_acquisition",
    "own_measurement",
    "no_confidential_material",
    "independent_discovery",
  ],
};

function buildReviewItem(document: unknown): Record<string, unknown> {
  return {
    submissionId: "tsub_1",
    submittedAt: "2026-03-05T09:00:00.000Z",
    author: { displayName: "Priya Raman", handle: "priya" },
    title: "Inside a supermarket cordless drill",
    subjectProductName: "Rotel RD-18 cordless drill",
    document,
  };
}

function buildPublishDecision(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    decision: "published",
    moderatorNote: null,
    thumbnailUrl: "https://images.example.com/drill.webp",
    difficulty: "intermediate",
    desiredSlug: null,
    ...overrides,
  };
}

describe("TeardownModerationDecisionSchema", () => {
  it("accepts a publish carrying the two fields the publisher never sent", () => {
    expect(TeardownModerationDecisionSchema.safeParse(buildPublishDecision()).success).toBe(true);
  });

  /** The `.strict()` regression: a stripped field on a write path is the incident this repo cites. */
  it("refuses a publish with an unknown key", () => {
    const parsed = TeardownModerationDecisionSchema.safeParse(
      buildPublishDecision({ moderationState: "published" }),
    );

    expect(parsed.success).toBe(false);
  });

  it.each([
    ["javascript:alert(1)", "a javascript: url"],
    ["//images.evil.test/drill.webp", "a protocol-relative url"],
    [`https://images.example.com/${"a".repeat(500)}.webp`, "a url over 512 characters"],
  ])("refuses %s as a thumbnail", (thumbnailUrl) => {
    const parsed = TeardownModerationDecisionSchema.safeParse(
      buildPublishDecision({ thumbnailUrl }),
    );

    expect(parsed.success).toBe(false);
  });

  it("accepts a site-relative thumbnail, which the server also accepts", () => {
    const parsed = TeardownModerationDecisionSchema.safeParse(
      buildPublishDecision({ thumbnailUrl: "/images/drill.webp" }),
    );

    expect(parsed.success).toBe(true);
  });

  /** The unchosen `<select>`. Its own refusal, rather than a server round trip. */
  it("refuses an unchosen difficulty", () => {
    const parsed = TeardownModerationDecisionSchema.safeParse(
      buildPublishDecision({ difficulty: "" }),
    );

    expect(parsed.success).toBe(false);
  });

  it.each([
    ["Not_A_Slug", "an underscore and capitals"],
    ["--a", "leading hyphens"],
  ])("refuses %s as an address", (desiredSlug) => {
    const parsed = TeardownModerationDecisionSchema.safeParse(
      buildPublishDecision({ desiredSlug }),
    );

    expect(parsed.success).toBe(false);
  });

  it("accepts a kebab-case address", () => {
    const parsed = TeardownModerationDecisionSchema.safeParse(
      buildPublishDecision({ desiredSlug: "inside-a-cordless-drill" }),
    );

    expect(parsed.success).toBe(true);
  });

  it("refuses a send-back with no note", () => {
    const parsed = TeardownModerationDecisionSchema.safeParse({
      decision: "rejected",
      moderatorNote: "",
    });

    expect(parsed.success).toBe(false);
  });

  /**
   * ⚠️ THE PAIR THAT KEEPS THE PUBLISH FIELDS OUT OF A SEND-BACK. The union discriminates and both
   * arms are strict, so a body that carries a thumbnail alongside a rejection is refused here rather
   * than sending the server a decision that means two things.
   */
  it("refuses a send-back carrying publish-only fields", () => {
    const parsed = TeardownModerationDecisionSchema.safeParse({
      decision: "rejected",
      moderatorNote: "Name the unit you surveyed in the summary.",
      thumbnailUrl: "https://images.example.com/drill.webp",
    });

    expect(parsed.success).toBe(false);
  });
});

describe("TeardownReviewItemSchema", () => {
  it("reads a present document", () => {
    const parsed = TeardownReviewItemSchema.safeParse(
      buildReviewItem({ status: "present", document: PRESENT_PAYLOAD }),
    );

    expect(parsed.success).toBe(true);
    expect(parsed.data?.document.status).toBe("present");
  });

  it("ignores a field a later backend release adds to the payload", () => {
    const parsed = TeardownReviewItemSchema.safeParse(
      buildReviewItem({
        status: "present",
        document: { ...PRESENT_PAYLOAD, reviewerHint: "looks fine" },
      }),
    );

    expect(parsed.success).toBe(true);
    expect(parsed.data?.document).not.toHaveProperty("document.reviewerHint");
  });

  /**
   * ⚠️ A SHAPE THIS CONSOLE STILL HAS TO READ. The wizard once labelled every document with a
   * fabrication kind; it was split and no such submission was ever stored, but the backend still
   * accepts the old shape from a caller on a cached bundle and files each link by its own label at
   * publish. So the card has to name it rather than rendering an empty chip.
   */
  it("reads a document carrying a fabrication label, and can name it", () => {
    const parsed = TeardownReviewItemSchema.safeParse(
      buildReviewItem({
        status: "present",
        document: {
          ...PRESENT_PAYLOAD,
          documents: [
            { kind: "step", title: "Housing", url: "https://files.example.com/housing.step" },
          ],
        },
      }),
    );

    expect(parsed.success).toBe(true);
    if (!parsed.success || parsed.data.document.status !== "present") return;
    // `item.document.document` — the union arm wraps the payload, mirroring the wire.
    const [firstDocument] = parsed.data.document.document.documents;
    expect(firstDocument?.kind).toBe("step");
    expect(TEARDOWN_REVIEW_FILE_KIND_LABELS[firstDocument?.kind ?? "schematic"]).toBeTruthy();
  });

  it("reads the server's unparseable arm with its issues intact", () => {
    const parsed = TeardownReviewItemSchema.safeParse(
      buildReviewItem({
        status: "unparseable",
        schemaVersion: 1,
        issues: ["parts.0.label: Required"],
      }),
    );

    expect(parsed.success).toBe(true);
    if (!parsed.success || parsed.data.document.status !== "unparseable") return;
    expect(parsed.data.document.issues).toEqual(["parts.0.label: Required"]);
  });

  it("accepts an author with no handle", () => {
    const parsed = TeardownReviewItemSchema.safeParse({
      ...buildReviewItem({ status: "present", document: PRESENT_PAYLOAD }),
      author: { displayName: "Priya Raman", handle: null },
    });

    expect(parsed.success).toBe(true);
  });
});

describe("the queue page", () => {
  /**
   * ⚠️ THE ASSERTION THAT MATTERS IS `items.length`, NOT THE ARM. `cursorPageOf` wraps rows in
   * `z.array`, which is all-or-nothing — so without the `.catch` on the document union, ONE
   * unreadable document empties the whole queue. This console is the only surface a pending
   * submission appears on, so that is a submission nobody can ever decide. Anyone tidying the
   * `.catch` away fails here.
   */
  it("keeps the rest of the page when one document is unreadable", () => {
    const parsed = TeardownReviewQueuePageSchema.safeParse({
      items: [
        buildReviewItem({ status: "present", document: PRESENT_PAYLOAD }),
        {
          ...buildReviewItem({ status: "present", document: { title: 7 } }),
          submissionId: "tsub_2",
        },
      ],
      page: { nextCursor: null, hasMore: false },
    });

    expect(parsed.success).toBe(true);
    expect(parsed.data?.items).toHaveLength(2);
    expect(parsed.data?.items[1]?.document.status).toBe("client_unreadable");
  });

  it("carries the reason a document could not be read here", () => {
    const parsed = TeardownReviewItemSchema.safeParse(
      buildReviewItem({ status: "present", document: { title: 7 } }),
    );

    expect(parsed.success).toBe(true);
    if (!parsed.success || parsed.data.document.status !== "client_unreadable") return;
    expect(parsed.data.document.issues.length).toBeGreaterThan(0);
  });
});

describe("the merged file vocabulary", () => {
  it("labels every kind, from either source enum", () => {
    // Collected rather than asserted one at a time, so a failure NAMES the unlabelled kind.
    const unlabelledFileKinds = TEARDOWN_REVIEW_FILE_KINDS.filter(
      (fileKind) => typeof TEARDOWN_REVIEW_FILE_KIND_LABELS[fileKind] !== "string",
    );

    expect(unlabelledFileKinds).toEqual([]);
  });

  it("sorts the two vocabularies apart", () => {
    expect(isTeardownManufacturingFileKind("step")).toBe(true);
    expect(isTeardownManufacturingFileKind("schematic")).toBe(false);
  });

  /**
   * ⚠️ AN OVERLAP WOULD BREAK THIS MAP SILENTLY, AND DIFFERENTLY FROM THE BACKEND.
   *
   * `TEARDOWN_REVIEW_FILE_KIND_LABELS` is built by spreading both label maps, so a value appearing
   * in both vocabularies does not raise anything — the SECOND spread simply wins, and a moderator
   * reads a fabrication noun over a reader's document or the reverse. The backend's copy of this
   * rule guards its routing; this one guards the label.
   */
  it("keeps the two file vocabularies disjoint", () => {
    const sharedKinds = BLUEPRINT_DOCUMENT_KINDS.filter((documentKind) =>
      TEARDOWN_MANUFACTURING_FILE_KINDS.some(
        (manufacturingKind) => String(manufacturingKind) === String(documentKind),
      ),
    );

    expect(sharedKinds).toEqual([]);
  });
});

describe("summarizeTeardownAttestation", () => {
  it("marks every clause accepted when all four are ticked", () => {
    const summary = summarizeTeardownAttestation(PRESENT_PAYLOAD.acceptedAttestationClauseIds);

    expect(summary.clauses).toHaveLength(4);
    expect(summary.clauses.every((clause) => clause.isAccepted)).toBe(true);
    expect(summary.unrecognizedClauseIds).toEqual([]);
  });

  /** The fact a moderator cannot infer from anything else on the card. */
  it("marks a missing clause rather than omitting it", () => {
    const summary = summarizeTeardownAttestation(["lawful_acquisition", "own_measurement"]);

    expect(summary.clauses).toHaveLength(4);
    expect(summary.clauses.filter((clause) => !clause.isAccepted)).toHaveLength(2);
  });

  it("surfaces an id this build does not recognise instead of throwing", () => {
    const summary = summarizeTeardownAttestation(["lawful_acquisition", "some_later_clause"]);

    expect(summary.unrecognizedClauseIds).toEqual(["some_later_clause"]);
  });
});

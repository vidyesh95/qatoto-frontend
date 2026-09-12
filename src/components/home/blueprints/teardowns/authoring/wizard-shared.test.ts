import { afterEach, describe, expect, it, vi } from "vitest";

import {
  collectTeardownSubmission,
  EMPTY_TEARDOWN_WIZARD_DRAFT,
  type TeardownWizardDraft,
} from "./wizard-shared";

/**
 * `collectTeardownSubmission` is the ONE place a wizard draft becomes a wire payload, and the one
 * place a silent mistake reaches the backend as a 422 the publisher cannot act on. Everything it
 * does is shape conversion — strings to nulls, a date to an instant, comma text to tags — and then
 * the contract decides.
 *
 * These cases are the conversions that have no other reader: the fields the wire does NOT carry,
 * the provenance arm selection, the midday-UTC widening, and the two vocabularies that used to be
 * one.
 */

/** The four clauses, accepted. Every case needs them or the attestation refinement fires first. */
const ACCEPTED_CLAUSE_IDS = [
  "lawful_acquisition",
  "own_measurement",
  "no_confidential_material",
  "independent_discovery",
] as const;

function buildFilledDraft(overrides: Partial<TeardownWizardDraft> = {}): TeardownWizardDraft {
  return {
    ...EMPTY_TEARDOWN_WIZARD_DRAFT,
    title: "Inside a supermarket cordless drill",
    summary:
      "Eleven fasteners, two of them hidden under the label, and a gearbox that comes out in one piece.",
    subjectProductName: "Rotel RD-18 cordless drill",
    surveyMethods: ["empirical_teardown"],
    surveyedOnDate: "2026-03-04",
    provenanceKind: "community_reverse_engineered",
    acceptedAttestationClauseIds: [...ACCEPTED_CLAUSE_IDS],
    ...overrides,
  };
}

function buildMaterialRow(): TeardownWizardDraft["materials"][number] {
  return {
    rowId: "row-1",
    appliesToLabel: "Gearbox housing",
    designation: "PA66-GF30",
    designationSource: "contributor_freetext",
    materialClass: "polymer",
    process: "injection_molded",
    finish: "",
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("collectTeardownSubmission", () => {
  it("accepts a filled draft", () => {
    const collected = collectTeardownSubmission(buildFilledDraft());

    expect(collected.ok).toBe(true);
  });

  /**
   * ⚠️ THE REGRESSION THIS FILE EXISTS FOR. The editor used to mint `mat-1`, and
   * `teardown_material.id` is a global primary key with no default — so the second author ever to
   * submit two materials would have collided with the first.
   */
  it("sends no id on a material", () => {
    const collected = collectTeardownSubmission(
      buildFilledDraft({ materials: [buildMaterialRow()] }),
    );

    expect(collected.ok).toBe(true);
    if (!collected.ok) return;
    expect(Object.keys(collected.submission.materials[0] ?? {})).not.toContain("id");
  });

  it("pins a material to no part, because a submission has no assembly", () => {
    const collected = collectTeardownSubmission(
      buildFilledDraft({ materials: [buildMaterialRow()] }),
    );

    expect(collected.ok).toBe(true);
    if (!collected.ok) return;
    expect(collected.submission.materials[0]?.partId).toBeNull();
    expect(collected.submission.materials[0]?.elements).toEqual([]);
  });

  /** Stale text in the arm the publisher did not choose is dropped rather than submitted. */
  it("drops licence text when the provenance arm is manufacturer authorisation", () => {
    const collected = collectTeardownSubmission(
      buildFilledDraft({
        provenanceKind: "authorized_by_manufacturer",
        licenceName: "CERN-OHL-S-2.0",
        licenceUrl: "https://licences.example.com/cern-ohl-s",
        authorizationNote: "Their applications engineer said we could publish the measurements.",
      }),
    );

    expect(collected.ok).toBe(true);
    if (!collected.ok) return;
    expect(collected.submission.provenance.licence).toBeNull();
    expect(collected.submission.provenance.authorizationNote).not.toBeNull();
  });

  /**
   * ⚠️ MIDDAY UTC, AND ONE CHARACTER FROM SHOWING THE WRONG DAY. A date input gives a calendar day;
   * widening it at midnight would render as the day before for any reader west of UTC.
   */
  it("widens a calendar day to midday UTC", () => {
    const collected = collectTeardownSubmission(buildFilledDraft({ surveyedOnDate: "2026-03-04" }));

    expect(collected.ok).toBe(true);
    if (!collected.ok) return;
    expect(collected.submission.provenance.surveyedAt).toBe("2026-03-04T12:00:00.000Z");
  });

  it("refuses a survey with no date", () => {
    const collected = collectTeardownSubmission(buildFilledDraft({ surveyedOnDate: "" }));

    expect(collected.ok).toBe(false);
    if (collected.ok) return;
    expect(collected.fieldErrors).toHaveProperty("provenance.surveyedAt");
  });

  it("refuses a survey dated in the future", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T00:00:00.000Z"));

    const collected = collectTeardownSubmission(buildFilledDraft({ surveyedOnDate: "2026-06-30" }));

    expect(collected.ok).toBe(false);
    if (collected.ok) return;
    expect(collected.fieldErrors).toHaveProperty("provenance.surveyedAt");
  });

  it("trims and drops empty tags", () => {
    const collected = collectTeardownSubmission(
      buildFilledDraft({ tagsText: "power-tools, ,gearbox , " }),
    );

    expect(collected.ok).toBe(true);
    if (!collected.ok) return;
    expect(collected.submission.tags).toEqual(["power-tools", "gearbox"]);
  });

  it("refuses more tags than the server accepts", () => {
    const collected = collectTeardownSubmission(
      buildFilledDraft({
        tagsText: Array.from({ length: 13 }, (_unused, index) => `tag-${String(index)}`).join(","),
      }),
    );

    expect(collected.ok).toBe(false);
    if (collected.ok) return;
    expect(collected.fieldErrors).toHaveProperty("tags");
  });

  /**
   * ⚠️ THE SPLIT, ASSERTED AT THE CONVERSION POINT. The two vocabularies share no label, and the
   * published detail page parses each array against its own enum — so a fab label in `documents[]`
   * is a row that page refuses to render, and the server cannot catch it.
   */
  it("refuses a fabrication label on a document", () => {
    const collected = collectTeardownSubmission(
      buildFilledDraft({
        documents: [
          {
            rowId: "row-1",
            // @ts-expect-error — the row type forbids this now, which is the fork doing its job.
            // The contract must refuse it too: the refusal is what a publisher reads, and a draft
            // can reach this function from somewhere the type system did not check.
            kind: "step",
            title: "Schematic",
            url: "https://files.example.com/a.pdf",
          },
        ],
      }),
    );

    expect(collected.ok).toBe(false);
    if (collected.ok) return;
    expect(collected.fieldErrors).toHaveProperty("documents.0.kind");
  });

  it("refuses a document label on a fabrication file", () => {
    const collected = collectTeardownSubmission(
      buildFilledDraft({
        manufacturingFiles: [
          {
            rowId: "row-1",
            // @ts-expect-error — as above, in the other direction.
            kind: "schematic",
            title: "Gerbers",
            url: "https://files.example.com/a.zip",
          },
        ],
      }),
    );

    expect(collected.ok).toBe(false);
    if (collected.ok) return;
    expect(collected.fieldErrors).toHaveProperty("manufacturingFiles.0.kind");
  });

  /** The site-relative branch is the server's to mint, never a publisher's to paste. */
  it("refuses a site-relative file link", () => {
    const collected = collectTeardownSubmission(
      buildFilledDraft({
        documents: [
          {
            rowId: "row-1",
            kind: "schematic",
            title: "Schematic",
            url: "/blueprints/teardowns/x/claim-targets",
          },
        ],
      }),
    );

    expect(collected.ok).toBe(false);
    if (collected.ok) return;
    expect(collected.fieldErrors).toHaveProperty("documents.0.url");
  });

  it("refuses a submission missing an attestation clause", () => {
    const collected = collectTeardownSubmission(
      buildFilledDraft({ acceptedAttestationClauseIds: ["lawful_acquisition", "own_measurement"] }),
    );

    expect(collected.ok).toBe(false);
    if (collected.ok) return;
    expect(collected.fieldErrors.acceptedAttestationClauseIds?.[0]).toContain(
      "I used nothing confidential",
    );
  });
});

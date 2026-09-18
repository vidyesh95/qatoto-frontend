import { describe, expect, it } from "vitest";

import { CreateProviderFreightRateCardInputSchema } from "@/lib/store/provider-freight.schemas";

import { buildCreateRateCardInput, type RateCardComposerDraft } from "./rate-card-draft";

/**
 * `buildCreateRateCardInput` is the one place a forwarder's draft becomes a wire payload, and the
 * one place a silent mistake reaches the backend as a 422 the publisher cannot act on.
 *
 * The cases below are the refusals that have no other reader: the three §19.11 traps, and — the one
 * worth writing out — the two keys the body must NEVER carry, because sending either is a 422 on
 * the whole submission rather than on a field.
 */

const NOW = new Date("2026-09-18T12:00:00.000Z");

function floorBand(overrides: Partial<Record<string, string>> = {}) {
  return {
    id: "band-1",
    minBillableWeightGrams: "0",
    minVolumeCubicCm: "0",
    unitPriceInCents: "450",
    minimumChargeInCents: "15000",
    transitDaysMin: "24",
    transitDaysMax: "34",
    ...overrides,
  };
}

function validDraft(overrides: Partial<RateCardComposerDraft> = {}): RateCardComposerDraft {
  return {
    originCountryCode: "in",
    destinationCountryCode: "de",
    mode: "sea",
    currency: "usd",
    validFromLocal: "2026-09-25T09:00",
    validUntilLocal: "",
    volumetricDivisorCm3PerKg: "1000",
    bandDrafts: [floorBand()],
    ...overrides,
  };
}

describe("buildCreateRateCardInput", () => {
  it("builds a body from a complete draft, normalising case", () => {
    const result = buildCreateRateCardInput(validDraft(), NOW);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.input.originCountryCode).toBe("IN");
    expect(result.input.destinationCountryCode).toBe("DE");
    expect(result.input.currency).toBe("USD");
    expect(result.input.breaks).toHaveLength(1);
  });

  it("NEVER sends providerOrganizationId or sourceForwarderName", () => {
    // Both are derived from the session and the server's schema is `.strict()`, so either one
    // present is a 422 on the WHOLE submission — every publish, not one field.
    const result = buildCreateRateCardInput(validDraft(), NOW);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.keys(result.input)).not.toContain("providerOrganizationId");
    expect(Object.keys(result.input)).not.toContain("sourceForwarderName");
  });

  it("refuses a validFrom that is not in the future", () => {
    // §19.11 step 1: a card in force the instant it exists can never have its bands edited.
    const result = buildCreateRateCardInput(
      validDraft({ validFromLocal: "2026-09-01T09:00" }),
      NOW,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("future");
  });

  it("refuses a ladder with no 0 kg floor band", () => {
    // §19.11 step 4: without it the lane publishes NO option and reads as an unserved lane.
    const result = buildCreateRateCardInput(
      validDraft({ bandDrafts: [floorBand({ minBillableWeightGrams: "30000" })] }),
      NOW,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("0 kg");
  });

  it("refuses a divisor outside 100–20000, and an absent one", () => {
    const tooSmall = buildCreateRateCardInput(validDraft({ volumetricDivisorCm3PerKg: "60" }), NOW);
    const absent = buildCreateRateCardInput(validDraft({ volumetricDivisorCm3PerKg: "" }), NOW);

    expect(tooSmall.ok).toBe(false);
    expect(absent.ok).toBe(false);
  });

  it("refuses a window that closes at or before it opens", () => {
    const result = buildCreateRateCardInput(
      validDraft({ validUntilLocal: "2026-09-25T09:00" }),
      NOW,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("after the start");
  });

  it("omits validUntil entirely when the field is blank", () => {
    // An open-ended card sends no key at all rather than a null the `.strict()` body would refuse.
    const result = buildCreateRateCardInput(validDraft(), NOW);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.keys(result.input)).not.toContain("validUntil");
  });

  it("REFUSES a body carrying a server-owned key, rather than dropping it", () => {
    // The strictness is the mechanism behind the assertion above: if the schema ever stopped
    // refusing unknown keys, a future edit could add `providerOrganizationId` back and every
    // publish would 422 with nothing here to catch it.
    const withForbiddenKey = CreateProviderFreightRateCardInputSchema.safeParse({
      originCountryCode: "IN",
      destinationCountryCode: "DE",
      mode: "sea",
      currency: "USD",
      validFrom: "2026-09-25T09:00:00.000Z",
      volumetricDivisorCm3PerKg: 1000,
      breaks: [
        {
          minBillableWeightGrams: 0,
          minVolumeCubicCm: 0,
          unitPriceInCents: 450,
          minimumChargeInCents: 15_000,
          transitDaysMin: 24,
          transitDaysMax: 34,
        },
      ],
      providerOrganizationId: "commerce_org_rival",
    });

    expect(withForbiddenKey.success).toBe(false);
  });

  it("passes a half-typed band through collectBands' own refusal", () => {
    const result = buildCreateRateCardInput(
      validDraft({ bandDrafts: [floorBand({ unitPriceInCents: "" })] }),
      NOW,
    );

    expect(result.ok).toBe(false);
  });
});

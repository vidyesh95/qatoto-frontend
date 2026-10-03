import { describe, expect, it } from "vitest";

import {
  countryLabelFromCode,
  formatByteSizeLabel,
  formatCentsLabel,
  formatCentsRangeLabel,
  formatCountLabel,
  formatCurrencyTotalsLabel,
  formatGramsLabel,
  formatIsoDateLabel,
  formatIsoInstantAsDateLabel,
  formatIsoInstantLabel,
  formatLeadTimeRangeLabel,
  formatOptionalIsoInstantLabel,
  formatPercentageLabel,
  formatSquareMetresLabel,
} from "./format";

describe("store/format", () => {
  describe("formatPercentageLabel", () => {
    it("formats rates to single decimal percentages", () => {
      expect(formatPercentageLabel(0.125)).toBe("12.5%");
      expect(formatPercentageLabel(0.5)).toBe("50.0%");
      expect(formatPercentageLabel(1)).toBe("100.0%");
    });
  });

  describe("formatCentsLabel", () => {
    it("renders round amounts without fractional digits", () => {
      expect(formatCentsLabel(5000, "USD")).toBe("$50");
      expect(formatCentsLabel(100000, "USD")).toBe("$1,000");
    });

    it("renders fractional amounts with exactly two decimal digits", () => {
      expect(formatCentsLabel(5050, "USD")).toBe("$50.50");
      expect(formatCentsLabel(14769480, "USD")).toBe("$147,694.80");
      expect(formatCentsLabel(99, "USD")).toBe("$0.99");
    });

    it("formats different currencies properly using ISO codes", () => {
      expect(formatCentsLabel(7490000, "EUR")).toBe("€74,900");
      expect(formatCentsLabel(2500, "GBP")).toBe("£25");
    });
  });

  describe("formatCentsRangeLabel", () => {
    it("returns null when both bounds are null", () => {
      expect(formatCentsRangeLabel(null, null, "USD")).toBeNull();
    });

    it("returns 'From $X' when upper bound is null", () => {
      expect(formatCentsRangeLabel(5000, null, "USD")).toBe("From $50");
    });

    it("returns 'Up to $X' when lower bound is null", () => {
      expect(formatCentsRangeLabel(null, 10000, "USD")).toBe("Up to $100");
    });

    it("returns a single amount when lower and upper bounds are identical", () => {
      expect(formatCentsRangeLabel(5000, 5000, "USD")).toBe("$50");
    });

    it("returns formatted range string when bounds differ", () => {
      expect(formatCentsRangeLabel(5000, 10000, "USD")).toBe("$50 – $100");
    });
  });

  describe("formatCurrencyTotalsLabel", () => {
    it("returns null for an empty totals array so callers render an empty state", () => {
      expect(formatCurrencyTotalsLabel([])).toBeNull();
    });

    it("formats each currency independently without summing them into an invented exchange rate", () => {
      const totals = [
        { amountInCents: 5000, currency: "USD" },
        { amountInCents: 4500, currency: "EUR" },
      ];
      expect(formatCurrencyTotalsLabel(totals)).toBe("$50 + €45");
    });
  });

  describe("formatLeadTimeRangeLabel", () => {
    it("returns null when neither bound is declared", () => {
      expect(formatLeadTimeRangeLabel(null, null)).toBeNull();
    });

    it("formats exact lead time when bounds match", () => {
      expect(formatLeadTimeRangeLabel(14, 14)).toBe("Ships in about 14 days");
    });

    it("formats lead time range when bounds differ", () => {
      expect(formatLeadTimeRangeLabel(7, 21)).toBe("Ships in 7–21 days");
    });

    it("formats single bound lead time when one is null", () => {
      expect(formatLeadTimeRangeLabel(10, null)).toBe("Ships in about 10 days");
      expect(formatLeadTimeRangeLabel(null, 30)).toBe("Ships in about 30 days");
    });
  });

  describe("date and instant formatting without timezone shift", () => {
    it("formats ISO date string without Date object to prevent UTC hydration mismatch", () => {
      expect(formatIsoDateLabel("2026-09-09")).toBe("Sep 9, 2026");
      expect(formatIsoDateLabel("2026-01-01")).toBe("Jan 1, 2026");
      expect(formatIsoDateLabel("2026-12-31")).toBe("Dec 31, 2026");
    });

    it("formats ISO instant with UTC time label", () => {
      expect(formatIsoInstantLabel("2026-08-01T14:30:00Z")).toBe("Aug 1, 2026, 14:30 UTC");
    });

    it("formats ISO instant as date without producing 'NaN' in day label", () => {
      expect(formatIsoInstantAsDateLabel("2026-09-09T16:40:00.000Z")).toBe("Sep 9, 2026");
    });

    it("formatOptionalIsoInstantLabel preserves null values", () => {
      expect(formatOptionalIsoInstantLabel(null)).toBeNull();
      expect(formatOptionalIsoInstantLabel("2026-08-01T14:30:00Z")).toBe("Aug 1, 2026, 14:30 UTC");
    });
  });

  describe("measurements and metrics", () => {
    it("formats square metres label", () => {
      expect(formatSquareMetresLabel(1500)).toBe("1,500 m²");
    });

    it("formats count label with thousand separators", () => {
      expect(formatCountLabel(2500000)).toBe("2,500,000");
    });

    it("formats grams to kilograms", () => {
      expect(formatGramsLabel(5000)).toBe("5 kg");
      expect(formatGramsLabel(1500)).toBe("1.5 kg");
    });

    it("formats country code to display name", () => {
      expect(countryLabelFromCode("US")).toBe("United States");
      expect(countryLabelFromCode("DE")).toBe("Germany");
    });

    it("formats byte size label", () => {
      expect(formatByteSizeLabel(512)).toBe("512 B");
      expect(formatByteSizeLabel(48 * 1024)).toBe("48 KB");
      expect(formatByteSizeLabel(2.5 * 1024 * 1024)).toBe("2.5 MB");
    });
  });
});

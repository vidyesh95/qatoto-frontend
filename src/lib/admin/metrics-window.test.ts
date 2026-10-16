import { describe, expect, test, vi } from "vitest";
import {
  buildMetricsWindow,
  formatCohortMonthLabel,
  todayUtcIsoDate,
} from "./metrics-window";

describe("todayUtcIsoDate", () => {
  test("returns the current UTC date as YYYY-MM-DD", () => {
    vi.useFakeTimers();
    // Set to a time where UTC date might differ from local date
    // (e.g. late evening in US, next day in UTC)
    vi.setSystemTime(new Date("2024-03-15T23:30:00.000-05:00"));

    expect(todayUtcIsoDate()).toBe("2024-03-16");

    vi.useRealTimers();
  });
});

describe("buildMetricsWindow", () => {
  test("returns the correct fromDate and toDate for 7 days", () => {
    const window = buildMetricsWindow("2024-03-15", 7);
    expect(window).toEqual({
      fromDate: "2024-03-09",
      toDate: "2024-03-15",
    });
  });

  test("returns the correct fromDate and toDate for 30 days across a month boundary", () => {
    const window = buildMetricsWindow("2024-03-15", 30);
    expect(window).toEqual({
      fromDate: "2024-02-15", // Leap year, so Feb 29 is included. 2024-03-15 - 29 days = 2024-02-15
      toDate: "2024-03-15",
    });
  });

  test("returns the same day if dayCount is 1", () => {
    const window = buildMetricsWindow("2024-03-15", 1);
    expect(window).toEqual({
      fromDate: "2024-03-15",
      toDate: "2024-03-15",
    });
  });
});

describe("formatCohortMonthLabel", () => {
  test("formats correctly formatted strings", () => {
    expect(formatCohortMonthLabel("2026-08")).toBe("Aug 2026");
    expect(formatCohortMonthLabel("2024-01")).toBe("Jan 2024");
    expect(formatCohortMonthLabel("2023-12")).toBe("Dec 2023");
  });

  test("returns the original string if the format is incorrect", () => {
    expect(formatCohortMonthLabel("2026-8")).toBe("2026-8");
    expect(formatCohortMonthLabel("26-08")).toBe("26-08");
    expect(formatCohortMonthLabel("invalid")).toBe("invalid");
  });
});

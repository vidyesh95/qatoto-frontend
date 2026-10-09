import { describe, it, expect } from "vitest";
import { toMetricsViewState } from "./metrics-view-state";
import { ApiRequestError } from "@/lib/http";
import type { UseQueryResult } from "@tanstack/react-query";

describe("toMetricsViewState", () => {
  it("should return 'loading' when query is pending", () => {
    const query = { isPending: true } as UseQueryResult<any>;
    const isEmpty = (data: any) => false;

    expect(toMetricsViewState(query, isEmpty)).toEqual({ status: "loading" });
  });

  it("should return 'error' with message when query has an ApiRequestError", () => {
    const apiError = new ApiRequestError({ code: "400", message: "Specific API error message" });
    const query = { isPending: false, error: apiError } as UseQueryResult<any>;
    const isEmpty = (data: any) => false;

    expect(toMetricsViewState(query, isEmpty)).toEqual({
      status: "error",
      message: "Specific API error message",
    });
  });

  it("should return 'error' with default message when query has a generic Error", () => {
    const genericError = new Error("Generic error");
    const query = { isPending: false, error: genericError } as UseQueryResult<any>;
    const isEmpty = (data: any) => false;

    expect(toMetricsViewState(query, isEmpty)).toEqual({
      status: "error",
      message: "We could not load this metric.",
    });
  });

  it("should return 'loading' when data is undefined (even if not pending/error)", () => {
    const query = { isPending: false, error: null, data: undefined } as unknown as UseQueryResult<any>;
    const isEmpty = (data: any) => false;

    expect(toMetricsViewState(query, isEmpty)).toEqual({ status: "loading" });
  });

  it("should return 'empty' when data exists and isEmpty returns true", () => {
    const query = { isPending: false, error: null, data: [] } as unknown as UseQueryResult<any>;
    const isEmpty = (data: any[]) => data.length === 0;

    expect(toMetricsViewState(query, isEmpty)).toEqual({ status: "empty" });
  });

  it("should return 'ready' with data when data exists and isEmpty returns false", () => {
    const query = { isPending: false, error: null, data: [1, 2, 3] } as unknown as UseQueryResult<any>;
    const isEmpty = (data: any[]) => data.length === 0;

    expect(toMetricsViewState(query, isEmpty)).toEqual({
      status: "ready",
      data: [1, 2, 3],
    });
  });
});

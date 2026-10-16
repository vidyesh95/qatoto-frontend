import { describe, it, expect } from "vitest";
import { QueryClient, QueryObserver, type UseQueryResult } from "@tanstack/react-query";
import { toMetricsViewState } from "./metrics-view-state";
import { ApiRequestError } from "@/lib/http";

// Real observer results instead of hand-built objects: a partial literal cast to
// `UseQueryResult` is a shape React Query can never produce.
const METRIC_QUERY_KEY = ["metric"];

function readPendingQueryResult(): UseQueryResult<number[]> {
  const queryClient = new QueryClient();
  return new QueryObserver<number[]>(queryClient, {
    queryKey: METRIC_QUERY_KEY,
    enabled: false,
  }).getCurrentResult();
}

async function readFailedQueryResult(queryError: Error): Promise<UseQueryResult<number[]>> {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: METRIC_QUERY_KEY,
    queryFn: () => Promise.reject(queryError),
    retry: false,
  });
  return new QueryObserver<number[]>(queryClient, {
    queryKey: METRIC_QUERY_KEY,
    enabled: false,
  }).getCurrentResult();
}

function readSucceededQueryResult(metricValues: number[]): UseQueryResult<number[]> {
  const queryClient = new QueryClient();
  queryClient.setQueryData(METRIC_QUERY_KEY, metricValues);
  return new QueryObserver<number[]>(queryClient, {
    queryKey: METRIC_QUERY_KEY,
    enabled: false,
  }).getCurrentResult();
}

const isMetricValuesEmpty = (metricValues: number[]) => metricValues.length === 0;

describe("toMetricsViewState", () => {
  it("should return 'loading' when query is pending", () => {
    expect(toMetricsViewState(readPendingQueryResult(), () => false)).toEqual({
      status: "loading",
    });
  });

  it("should return 'error' with message when query has an ApiRequestError", async () => {
    const apiError = new ApiRequestError({ code: "400", message: "Specific API error message" });
    const query = await readFailedQueryResult(apiError);

    expect(toMetricsViewState(query, () => false)).toEqual({
      status: "error",
      message: "Specific API error message",
    });
  });

  it("should return 'error' with default message when query has a generic Error", async () => {
    const query = await readFailedQueryResult(new Error("Generic error"));

    expect(toMetricsViewState(query, () => false)).toEqual({
      status: "error",
      message: "We could not load this metric.",
    });
  });

  it("should return 'loading' when data is undefined (even if not pending/error)", () => {
    // A `select` that yields undefined is the one real way to get a successful
    // query with no data.
    const queryClient = new QueryClient();
    queryClient.setQueryData(METRIC_QUERY_KEY, [1, 2, 3]);
    const query = new QueryObserver<number[], Error, number[] | undefined>(queryClient, {
      queryKey: METRIC_QUERY_KEY,
      enabled: false,
      select: () => undefined,
    }).getCurrentResult();

    expect(toMetricsViewState(query, () => false)).toEqual({ status: "loading" });
  });

  it("should return 'empty' when data exists and isEmpty returns true", () => {
    expect(toMetricsViewState(readSucceededQueryResult([]), isMetricValuesEmpty)).toEqual({
      status: "empty",
    });
  });

  it("should return 'ready' with data when data exists and isEmpty returns false", () => {
    expect(toMetricsViewState(readSucceededQueryResult([1, 2, 3]), isMetricValuesEmpty)).toEqual({
      status: "ready",
      data: [1, 2, 3],
    });
  });
});

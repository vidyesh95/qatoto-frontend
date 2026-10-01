import type { UseQueryResult } from "@tanstack/react-query";
import { ApiRequestError } from "@/lib/http";

export type MetricsViewState<TData> =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "empty" }
  | { readonly status: "ready"; readonly data: TData };

export function toMetricsViewState<TData>(
  query: UseQueryResult<TData>,
  isEmpty: (data: TData) => boolean,
): MetricsViewState<TData> {
  if (query.isPending) return { status: "loading" };

  if (query.error) {
    const requestError = query.error instanceof ApiRequestError ? query.error : null;
    return {
      status: "error",
      message: requestError?.apiError.message ?? "We could not load this metric.",
    };
  }

  if (query.data === undefined) return { status: "loading" };
  if (isEmpty(query.data)) return { status: "empty" };
  return { status: "ready", data: query.data };
}

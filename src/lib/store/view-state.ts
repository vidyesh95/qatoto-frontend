// TRANSPORT: props-only — pure mapping, no network.

import type { ActionResponse, ApiError } from "@/lib/http";
import { isUnauthorized } from "@/lib/http";
import type { StoreSearchResult } from "@/lib/store/catalog.schemas";

/**
 * Detail / page payload view state for public store reads.
 *
 * 404 → `not_found`, never a permission hint: the backend answers 404 for both "no such
 * thing" and "not visible to you" precisely so IDs cannot be probed, and re-splitting them
 * here would undo that (STORE_STRUCTURE §5.5).
 *
 * There is deliberately no `loading` variant — a server component awaits its data before it
 * renders, so loading is the route's `loading.tsx`, not a branch here.
 */
export type StoreDetailViewState<TData> =
  | { status: "error"; message: string; isSignInRequired: boolean }
  | { status: "not_found" }
  | { status: "ready"; data: TData };

/** Search results, with empty distinguished from failed. */
export type StoreSearchViewState =
  | { status: "error"; message: string; isSignInRequired: boolean }
  | { status: "empty"; appliedFilterCount: number }
  | { status: "ready"; result: StoreSearchResult };

function toErrorState(error: ApiError): Extract<StoreDetailViewState<never>, { status: "error" }> {
  return {
    status: "error",
    message: error.message,
    isSignInRequired: isUnauthorized(error),
  };
}

export function toStoreDetailViewState<TData>(
  result: ActionResponse<TData>,
): StoreDetailViewState<TData> {
  if (!result.success) {
    if (result.error.code === "404") return { status: "not_found" };
    return toErrorState(result.error);
  }
  return { status: "ready", data: result.data };
}

/**
 * Lift a search response into its view state.
 *
 * `appliedFilterCount` is passed in by the caller from the URL filter, because the backend
 * does not return one — see `countAppliedStoreFilters`. It only matters in the `empty`
 * branch, which uses it to say "no matches for these filters" rather than "the catalog is
 * empty".
 */
export function toStoreSearchViewState(
  result: ActionResponse<StoreSearchResult>,
  appliedFilterCount: number,
): StoreSearchViewState {
  if (!result.success) {
    return toErrorState(result.error);
  }
  if (result.data.items.length === 0) {
    return { status: "empty", appliedFilterCount };
  }
  return { status: "ready", result: result.data };
}

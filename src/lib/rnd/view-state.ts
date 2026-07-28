// TRANSPORT: props-only — pure mapping, no network.
//
// Lifts a transport `ActionResponse` into the discriminated union a component
// renders with an exhaustive `switch` (CLAUDE.md Pattern 1). Without this every page
// grows its own `if (!result.success)` ladder plus an ad-hoc emptiness check, and
// "empty" and "failed" start rendering the same way — which is the bug that makes a
// broken endpoint look like a project with no data.
//
// THERE IS NO `loading` VARIANT, deliberately. A server component awaits its data
// before it renders; the loading state is the route's `loading.tsx` / Suspense
// boundary, not a branch here. A client island using React Query reads
// `isPending` from the query instead.

import type { ActionResponse, ApiError, PaginationMeta } from "@/lib/http";
import { isUnauthorized } from "@/lib/http";

export type ListViewState<TRow> =
  | {
      status: "error";
      message: string;
      /**
       * True on 401. The distinction matters: a signed-out visitor on a
       * `requireAuth` read (`/discovery/talent`, `/funding/deals`) needs a sign-in
       * prompt, not "something went wrong".
       *
       * A `404` is NOT an error to surface as one — the backend answers 404 for "no
       * access or no such thing" so a stranger cannot probe which ids exist. Never
       * render a permission hint from it.
       */
      isSignInRequired: boolean;
    }
  | { status: "empty" }
  | { status: "ready"; rows: TRow[]; pagination: PaginationMeta | null };

function toErrorState(error: ApiError): Extract<ListViewState<never>, { status: "error" }> {
  return {
    status: "error",
    message: error.message,
    isSignInRequired: isUnauthorized(error),
  };
}

/** For an offset-paginated read — `{ rows, pagination }`. */
export function toListViewState<TRow>(
  result: ActionResponse<{ rows: TRow[]; pagination: PaginationMeta }>,
): ListViewState<TRow> {
  if (!result.success) return toErrorState(result.error);
  if (result.data.rows.length === 0) return { status: "empty" };
  return { status: "ready", rows: result.data.rows, pagination: result.data.pagination };
}

/** For an unpaginated read — a facet vocabulary, or `/funding/deals`. */
export function toArrayViewState<TRow>(result: ActionResponse<TRow[]>): ListViewState<TRow> {
  if (!result.success) return toErrorState(result.error);
  if (result.data.length === 0) return { status: "empty" };
  return { status: "ready", rows: result.data, pagination: null };
}

/**
 * Rows when the read succeeded, an empty array otherwise.
 *
 * ONLY for a secondary section that must not take the whole page down with it — a
 * facet vocabulary behind filter chips, say, where losing the chips is survivable but
 * losing the list is not. Never use it for a page's primary data: it collapses
 * "failed" into "empty", which is exactly the lie `ListViewState` exists to prevent.
 */
export function rowsOrEmpty<TRow>(result: ActionResponse<TRow[]>): TRow[] {
  return result.success ? result.data : [];
}

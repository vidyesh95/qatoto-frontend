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

/**
 * A list read that sits behind project membership, on a project the caller can
 * ALREADY see.
 *
 * `restricted` is legitimate here and NOWHERE ELSE. The rule everywhere else is that a
 * 404 must never become a permission hint, because it is the backend's answer to "no
 * access or no such thing" and rendering "you don't have permission" from it would
 * confirm which ids exist. On these reads the parent detail read already succeeded, so
 * the project's existence is public knowledge the visitor arrived with — a 404 on its
 * child route can only mean "not a member", and saying so leaks nothing.
 *
 * There is no `pagination`: every member-scoped read this covers
 * (`…/daily-logs`, `…/funding-rounds`, `…/milestones`, `…/roles`) returns a bare array.
 */
export type MemberScopedListViewState<TRow> =
  | { status: "error"; message: string }
  | { status: "restricted"; isSignInRequired: boolean }
  | { status: "empty" }
  | { status: "ready"; rows: TRow[] };

/**
 * A single member-scoped object rather than a list — `…/investor-confidence`, which
 * additionally 404s when the signal was never computed.
 *
 * `restricted` and `absent` are deliberately the same variant: the endpoint answers 404
 * for both "not a member" and "never computed", and the frontend cannot tell them
 * apart. Both render as an absence, which is the honest output either way. Never
 * substitute a default — a fabricated confidence score is a published finding.
 */
export type MemberScopedItemViewState<TItem> =
  | { status: "error"; message: string }
  | { status: "restricted"; isSignInRequired: boolean }
  | { status: "ready"; item: TItem };

/**
 * A keyset page on a read that is NOT project-scoped — `GET /daily-logs`, which is
 * root-mounted behind `requireAuth` and answers `401`, never a membership `404`.
 *
 * `nextCursor` is an opaque server string — echo it back verbatim or the backend
 * answers `422 CURSOR_MALFORMED`. Never construct or compare one client-side.
 */
export type CursorListViewState<TRow> =
  | { status: "error"; message: string; isSignInRequired: boolean }
  | { status: "empty" }
  | { status: "ready"; rows: TRow[]; nextCursor: string | null };

/**
 * The keyset counterpart of `MemberScopedListViewState` — `…/effort-claims` and
 * `…/allocation-proposals`.
 *
 * The `restricted` variant is why this cannot just be `CursorListViewState`: these are
 * child reads of a project whose detail read already succeeded, so their `404` can only
 * mean "not a member" and saying so leaks nothing. See `MemberScopedListViewState` for the
 * full argument, which applies here unchanged.
 */
export type MemberScopedCursorListViewState<TRow> =
  | { status: "error"; message: string }
  | { status: "restricted"; isSignInRequired: boolean }
  | { status: "empty" }
  | { status: "ready"; rows: TRow[]; nextCursor: string | null };

/**
 * The same, but the token is a SEQUENCE NUMBER rather than an opaque cursor —
 * `…/slice-ledger` and `…/audit-trail`, both append-only and both ordered
 * `sequenceNumber` ASC.
 *
 * Kept separate from the cursor variant rather than generalized over the token type,
 * because the two tokens are not interchangeable: this one is echoed back as
 * `?fromSequence=` and is a number the rows themselves carry, while a cursor is an opaque
 * string the client must never construct. Collapsing them would invite passing one where
 * the other belongs.
 */
export type MemberScopedSequenceListViewState<TRow> =
  | { status: "error"; message: string }
  | { status: "restricted"; isSignInRequired: boolean }
  | { status: "empty" }
  | { status: "ready"; rows: TRow[]; nextSequence: number | null };

/**
 * A write the server ACCEPTED but has not decided yet.
 *
 * `POST …/effort-claims`, `POST …/effort-claims/:claimId/reverify`,
 * `POST …/physical-receipts`, `POST /discovery/problem-reports` and a `re_verified`
 * dispute resolution all answer **`202`**, not a verdict. The row exists; the pipeline
 * that grades it runs afterwards, and its result arrives through the detail read.
 *
 * THE `accepted` VARIANT MUST NEVER RENDER AS A RESULT. "Submitted — 240 minutes
 * credited" after a 202 is a fabricated verdict, and on a Slicing Pie surface a
 * fabricated verdict is a fabricated equity number. The only honest render is "we have
 * it, we are checking", followed by whatever the poll returns — including `failed`.
 *
 * `settled` is deliberately generic over the eventual payload: the caller polls its own
 * detail read and decides what "settled" means for its domain, because only it knows
 * which verification status counts as terminal.
 */
export type AsyncJobViewState<TSettled> =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "error"; message: string; fieldErrors?: Readonly<Record<string, string[]>> }
  /** 202 received, nothing decided. Poll from here. */
  | { status: "accepted"; jobReference: string }
  | { status: "settled"; result: TSettled };

function toErrorState(error: ApiError): Extract<ListViewState<never>, { status: "error" }> {
  return {
    status: "error",
    message: error.message,
    isSignInRequired: isUnauthorized(error),
  };
}

/** 404 means "not a member" only once the parent resource is known to exist. */
function isMembershipRefusal(error: ApiError): boolean {
  return error.code === "404" || isUnauthorized(error);
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

/**
 * For a bare-array read behind project membership, on a project already resolved by a
 * successful public detail read. See `MemberScopedListViewState` for why 404 is allowed
 * to become a visible "members only" here and nowhere else.
 */
export function toMemberScopedListViewState<TRow>(
  result: ActionResponse<TRow[]>,
): MemberScopedListViewState<TRow> {
  if (!result.success) {
    if (isMembershipRefusal(result.error)) {
      return { status: "restricted", isSignInRequired: isUnauthorized(result.error) };
    }
    return { status: "error", message: result.error.message };
  }
  if (result.data.length === 0) return { status: "empty" };
  return { status: "ready", rows: result.data };
}

/** The single-object counterpart, for `…/investor-confidence`. */
export function toMemberScopedItemViewState<TItem>(
  result: ActionResponse<TItem>,
): MemberScopedItemViewState<TItem> {
  if (!result.success) {
    if (isMembershipRefusal(result.error)) {
      return { status: "restricted", isSignInRequired: isUnauthorized(result.error) };
    }
    return { status: "error", message: result.error.message };
  }
  return { status: "ready", item: result.data };
}

/**
 * For a keyset page.
 *
 * The caller supplies `selectRows` because each backend keyset envelope NAMES ITS ARRAY
 * FOR ITS DOMAIN — `logs` on the daily-log feed, `messages` on workshop chat. There is
 * no shared `items` key to read and no generic envelope schema to write, so the one
 * place that knows the key hands it over here.
 */
export function toCursorListViewState<TPage, TRow>(
  result: ActionResponse<TPage>,
  selectRows: (page: TPage) => { rows: TRow[]; nextCursor: string | null },
): CursorListViewState<TRow> {
  if (!result.success) return toErrorState(result.error);
  const { rows, nextCursor } = selectRows(result.data);
  if (rows.length === 0) return { status: "empty" };
  return { status: "ready", rows, nextCursor };
}

/**
 * The member-scoped keyset lifter — `…/effort-claims`, `…/allocation-proposals`.
 *
 * No `selectRows` here, unlike `toCursorListViewState`: these reads put a BARE ARRAY in
 * `data` with the token as a sibling, so `getCursorSiblingList` has already normalized
 * them to `{ rows, nextCursor }` and there is no domain-specific array key left to name.
 */
export function toMemberScopedCursorListViewState<TRow>(
  result: ActionResponse<{ rows: TRow[]; nextCursor: string | null }>,
): MemberScopedCursorListViewState<TRow> {
  if (!result.success) {
    if (isMembershipRefusal(result.error)) {
      return { status: "restricted", isSignInRequired: isUnauthorized(result.error) };
    }
    return { status: "error", message: result.error.message };
  }
  if (result.data.rows.length === 0) return { status: "empty" };
  return { status: "ready", rows: result.data.rows, nextCursor: result.data.nextCursor };
}

/** The sequence-token counterpart, for `…/slice-ledger` and `…/audit-trail`. */
export function toMemberScopedSequenceListViewState<TRow>(
  result: ActionResponse<{ rows: TRow[]; nextSequence: number | null }>,
): MemberScopedSequenceListViewState<TRow> {
  if (!result.success) {
    if (isMembershipRefusal(result.error)) {
      return { status: "restricted", isSignInRequired: isUnauthorized(result.error) };
    }
    return { status: "error", message: result.error.message };
  }
  if (result.data.rows.length === 0) return { status: "empty" };
  return { status: "ready", rows: result.data.rows, nextSequence: result.data.nextSequence };
}

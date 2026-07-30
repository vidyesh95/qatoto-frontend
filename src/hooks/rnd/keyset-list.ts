"use client";

// TRANSPORT: client-query — one React Query `useInfiniteQuery` shared by every keyset
// list on the R&D surface.
//
// SEEDED FROM THE SERVER, NEVER RE-FETCHED. The page bodies these islands sit inside are
// server components that already read page one with the caller's cookie. Passing that page
// as `initialData` is what stops the browser repeating the request on mount — without it
// every list would fetch twice on first paint, and the second fetch would be the one the
// user waits for.
//
// THE TOKEN IS OPAQUE TO THIS HOOK. The surface has three kinds: an opaque `nextCursor` string
// (`…/effort-claims`, `…/allocation-proposals`, `/daily-logs`), a `nextSequence` number echoed
// back as `?fromSequence=` (`…/slice-ledger`, `…/audit-trail`), and — on
// `…/compensation-periods` alone — a `?beforeSequenceNumber=` the CLIENT derives from the last
// row, because that read returns no token at all.
//
// Nothing is ever constructed or compared here. A fabricated cursor is a `422
// CURSOR_MALFORMED`, and a fabricated sequence silently skips rows. The one derivation that IS
// safe is the compensation one, and it is safe only because a sequence number is a plain unique
// integer the row already carries — see `compensation-periods-island.tsx`.

import { useInfiniteQuery, type InfiniteData, type QueryKey } from "@tanstack/react-query";

import { ApiRequestError, unwrap, type ActionResponse } from "@/lib/http";

/**
 * Every page token on this surface, as one CONCRETE union.
 *
 * NOT A GENERIC, and that is load-bearing rather than a simplification. React Query types
 * its `queryFn` context as
 * `[TPageParam] extends [never] ? { pageParam?: unknown } : { pageParam: TPageParam }`.
 * A generic token leaves that conditional unresolved, TypeScript keeps BOTH arms, and
 * `pageParam` degrades to `unknown` — so the token type has to be something the compiler
 * can decide is not `never`. Callers narrow with a `typeof` guard, which costs one
 * expression and states which token kind a read actually uses.
 */
export type KeysetToken = string | number;

/** One page as every keyset read on this surface returns it, once normalized. */
export interface KeysetPage<TRow> {
  readonly rows: TRow[];
  readonly nextToken: KeysetToken | null;
}

/**
 * Adapts a `{ rows, nextCursor }` read to the token-agnostic page this hook accumulates.
 *
 * The api functions keep their DOMAIN NAMES — `nextCursor`, `nextSequence` — because those
 * are the wire's own words and renaming them at the transport layer would hide which
 * envelope a read actually answers with. The rename happens here, once, at the point where
 * the token stops mattering.
 */
export function toCursorKeysetPage<TRow>(
  result: ActionResponse<{ rows: TRow[]; nextCursor: string | null }>,
): ActionResponse<KeysetPage<TRow>> {
  return result.success
    ? { success: true, data: { rows: result.data.rows, nextToken: result.data.nextCursor } }
    : result;
}

/** The sequence counterpart — `…/slice-ledger`, `…/audit-trail`. */
export function toSequenceKeysetPage<TRow>(
  result: ActionResponse<{ rows: TRow[]; nextSequence: number | null }>,
): ActionResponse<KeysetPage<TRow>> {
  return result.success
    ? { success: true, data: { rows: result.data.rows, nextToken: result.data.nextSequence } }
    : result;
}

export interface KeysetListResult<TRow> {
  /** Every row fetched so far, in server order, first page first. */
  readonly rows: TRow[];
  readonly hasNextPage: boolean;
  readonly isFetchingNextPage: boolean;
  /**
   * The message from a FAILED load-more, or null. Deliberately separate from the rows: a
   * failed second page must not blank the first one, and it must not silently do nothing
   * either — a `422` on a cursor the server issued is a real finding.
   */
  readonly loadMoreErrorMessage: string | null;
  readonly loadNextPage: () => void;
}

/**
 * Accumulates keyset pages on top of a server-rendered first page.
 *
 * `fetchPage` receives `null` for the first page and a server-issued token thereafter, so
 * a caller never has to branch on which page it is building a request for — only on which
 * KIND of token its own read uses.
 */
export function useKeysetList<TRow>({
  queryKey,
  initialPage,
  fetchPage,
}: {
  readonly queryKey: QueryKey;
  readonly initialPage: KeysetPage<TRow>;
  readonly fetchPage: (token: KeysetToken | null) => Promise<ActionResponse<KeysetPage<TRow>>>;
}): KeysetListResult<TRow> {
  // Typed explicitly rather than passed as a literal: an object literal here makes
  // TypeScript fall through to `useInfiniteQuery`'s last overload.
  const seededData: InfiniteData<KeysetPage<TRow>, KeysetToken | null> = {
    pages: [initialPage],
    pageParams: [null],
  };

  const query = useInfiniteQuery<
    KeysetPage<TRow>,
    ApiRequestError,
    InfiniteData<KeysetPage<TRow>, KeysetToken | null>,
    QueryKey,
    KeysetToken | null
  >({
    queryKey,
    queryFn: ({ pageParam }) => fetchPage(pageParam).then(unwrap),
    initialPageParam: null,
    // `undefined` — not null — is how React Query is told there is no next page. Returning
    // null here would make `hasNextPage` true forever and the button never disappear.
    getNextPageParam: (lastPage) => lastPage.nextToken ?? undefined,
    initialData: seededData,
    // The server already rendered this page with the caller's session. Refetching it on
    // mount or on every window focus would discard the accumulated pages below it.
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  return {
    rows: query.data.pages.flatMap((page) => page.rows),
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    // Only a load-more failure can surface here: the first page came from the server, so
    // `query.error` is never the initial read.
    loadMoreErrorMessage: query.error === null ? null : query.error.message,
    loadNextPage: () => {
      void query.fetchNextPage();
    },
  };
}

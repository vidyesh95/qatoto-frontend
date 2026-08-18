// TRANSPORT: props-only — layout and state lifting for the metrics sections.
"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { ApiRequestError } from "@/lib/http";

// The four aggregate sections all render the same four states, so the union and the shell live
// here once (CLAUDE.md Pattern 1). `src/lib/view-state.ts` does this job for a server component
// holding an `ActionResponse`; these are client islands holding a React Query result, which is the
// case that file's header explicitly hands back to the caller.
//
// `empty` IS NOT `error`. A window with no rows is a real answer about a quiet week; a 403 is an
// answer about the caller. Collapsing them is how a broken endpoint comes to look like a platform
// nobody uses.

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

export function MetricsSection({
  title,
  description,
  footnote,
  headerControl,
  children,
}: {
  readonly title: string;
  readonly description: string;
  readonly footnote?: string;
  readonly headerControl?: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-2xl border border-[#CAC4D0]/60 bg-card p-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-medium">{title}</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
        </div>
        {headerControl}
      </header>

      {children}

      {footnote && <p className="text-xs text-muted-foreground">{footnote}</p>}
    </section>
  );
}

/** The loading, error and empty renders every section shares. */
export function MetricsStateNotice({ message }: { readonly message: string }) {
  return (
    <output className="block rounded-xl border border-[#CAC4D0]/60 bg-muted/40 p-3 text-sm text-muted-foreground">
      {message}
    </output>
  );
}

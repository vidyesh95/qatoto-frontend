"use client";

// TRANSPORT: client-query — the terms arrive as props from the watch payload; a moderator's Hide
// writes POST /feed/admin/search-terms/suppressions. Needs QueryProvider, which (home) mounts.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { MutationErrorNotice } from "@/components/home/research-and-development/sections/mutation-feedback";
import { INPUT_CLASS } from "@/components/ui/field-classes";
import { useSuppressSearchTermMutation } from "@/hooks/feed/mutations";
import { useOwnStaffContextQuery } from "@/hooks/rnd/platform-roles";
import { ApiRequestError } from "@/lib/http";

/**
 * "Everyone is searching for:" — terms at least five distinct searchers looked for in the last
 * seven days (the backend's floor), each opening a search for itself.
 *
 * ⚠️ **HIDE IS A MODERATOR CONTROL, SHOWN ONLY TO `moderate_content` HOLDERS, AND THE BACKEND IS
 * THE GATE.** A reader who forged the button would get a 403. Hiding asks for a reason (the audit
 * record) and a confirm, then refreshes: the list is server-rendered and the suppression applies on
 * the very next read. Lifting a suppression has no button here — a hidden term never renders — so
 * it happens on the staff list at `/admin/search-terms`.
 *
 * ONE HIDE AT A TIME, AS A UNION: nothing selected, a reason being written, or confirming.
 */
type HideStep =
  | { readonly step: "idle" }
  | { readonly step: "composing"; readonly term: string; readonly reason: string }
  | { readonly step: "confirming"; readonly term: string; readonly reason: string };

export default function TrendingSearches({
  trendingSearches,
}: {
  readonly trendingSearches: readonly string[];
}) {
  const router = useRouter();
  const staffContextQuery = useOwnStaffContextQuery();
  const suppressMutation = useSuppressSearchTermMutation();
  const [hideStep, setHideStep] = useState<HideStep>({ step: "idle" });

  if (trendingSearches.length === 0) return null;

  const canModerateContent =
    staffContextQuery.data?.capabilities.includes("moderate_content") ?? false;
  const mutationError =
    suppressMutation.error instanceof ApiRequestError ? suppressMutation.error : null;

  function handleHideSuccess() {
    setHideStep({ step: "idle" });
    router.refresh();
  }

  function renderHideForm() {
    switch (hideStep.step) {
      case "idle":
        return null;
      case "composing":
      case "confirming":
        return (
          <div className="mt-2 space-y-2">
            <label className="flex flex-col gap-1 text-xs">
              <span>Why hide &ldquo;{hideStep.term}&rdquo;? (kept in the audit log)</span>
              <textarea
                value={hideStep.reason}
                onChange={(changeEvent) =>
                  setHideStep({
                    step: "composing",
                    term: hideStep.term,
                    reason: changeEvent.target.value,
                  })
                }
                rows={2}
                maxLength={2000}
                disabled={suppressMutation.isPending}
                className={INPUT_CLASS}
              />
            </label>
            <div className="flex gap-2">
              {hideStep.step === "composing" ? (
                <button
                  type="button"
                  disabled={hideStep.reason.trim() === ""}
                  onClick={() =>
                    setHideStep({
                      step: "confirming",
                      term: hideStep.term,
                      reason: hideStep.reason,
                    })
                  }
                  className="rounded-full bg-primary-imprint px-3 py-1 text-xs font-medium text-primary-imprint-foreground disabled:opacity-40"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="button"
                  disabled={suppressMutation.isPending}
                  onClick={() =>
                    suppressMutation.mutate(
                      { term: hideStep.term, reason: hideStep.reason.trim() },
                      { onSuccess: handleHideSuccess },
                    )
                  }
                  className="rounded-full bg-primary-imprint px-3 py-1 text-xs font-medium text-primary-imprint-foreground disabled:opacity-40"
                >
                  {suppressMutation.isPending
                    ? "Hiding…"
                    : `Confirm: hide it from every watch page`}
                </button>
              )}
              <button
                type="button"
                disabled={suppressMutation.isPending}
                onClick={() => setHideStep({ step: "idle" })}
                className="rounded-full px-3 py-1 text-xs font-medium text-muted-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        );
      default: {
        const unhandledStep: never = hideStep;
        return unhandledStep;
      }
    }
  }

  return (
    <div className="px-4 py-3">
      <p className="text-sm font-medium">Everyone is searching for:</p>
      <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
        {trendingSearches.map((trendingSearch) => (
          <li key={trendingSearch} className="flex items-center gap-1">
            <Link
              href={`/search?query=${encodeURIComponent(trendingSearch)}`}
              className="text-sm text-primary-imprint hover:underline"
            >
              {trendingSearch}
            </Link>
            {canModerateContent && (
              <button
                type="button"
                onClick={() => {
                  suppressMutation.reset();
                  setHideStep({ step: "composing", term: trendingSearch, reason: "" });
                }}
                aria-label={`Hide "${trendingSearch}" from trending searches`}
                className="text-xs text-muted-foreground hover:underline"
              >
                Hide
              </button>
            )}
          </li>
        ))}
      </ul>
      {canModerateContent && renderHideForm()}
      {mutationError !== null && <MutationErrorNotice error={mutationError.apiError} />}
    </div>
  );
}

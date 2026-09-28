// TRANSPORT: client-query — "use client" island. Reads the caller's staff context and writes
// POST /discovery/admin/problem-clusters/:clusterId/resolve | /reopen. Needs QueryProvider, which
// (home)/layout.tsx mounts.
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { MutationErrorNotice } from "@/components/home/research-and-development/sections/mutation-feedback";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field-classes";
import {
  useReopenProblemClusterMutation,
  useResolveProblemClusterMutation,
} from "@/hooks/rnd/discovery";
import { useOwnStaffContextQuery } from "@/hooks/rnd/platform-roles";
import { ApiRequestError } from "@/lib/http";

/**
 * The moderator's Mark resolved / Reopen control on a cluster's own page.
 *
 * ⚠️ **HIDING IT IS UX, NOT SECURITY.** It renders nothing unless the caller's staff context lists
 * `moderate_clusters`, but the backend decides that capability on every request (403 before any id
 * is read). A reader who forged the button into the page would get the same 403.
 *
 * ⚠️ **NOT OPTIMISTIC.** Resolving starts a 90-day clock after which every photo on the cluster is
 * purged, and the note is published on this page. The page is a server component, so success
 * refreshes the route and the banner comes from the server, never from local state.
 *
 * ONE STEP AT A TIME, AS A UNION: idle → composing (the note) → confirming. A single `isOpen` plus
 * an `isConfirming` flag would allow "confirming with no note", which is exactly the resolve the
 * backend refuses.
 */
type ResolutionControlStep =
  | { readonly step: "idle" }
  | { readonly step: "composing"; readonly note: string }
  | { readonly step: "confirming"; readonly note: string };

type ClusterResolutionControlProps = {
  readonly clusterId: string;
  /** Only these two states have a verb; merged and hidden clusters get no control. */
  readonly status: "active" | "resolved";
};

export default function ClusterResolutionControl({
  clusterId,
  status,
}: ClusterResolutionControlProps) {
  const router = useRouter();
  const staffContextQuery = useOwnStaffContextQuery();
  const resolveMutation = useResolveProblemClusterMutation();
  const reopenMutation = useReopenProblemClusterMutation();
  const [controlStep, setControlStep] = useState<ResolutionControlStep>({ step: "idle" });

  const canModerateClusters =
    staffContextQuery.data?.capabilities.includes("moderate_clusters") ?? false;
  if (!canModerateClusters) return null;

  const isResolving = status === "active";
  const activeMutation = isResolving ? resolveMutation : reopenMutation;
  const mutationError =
    activeMutation.error instanceof ApiRequestError ? activeMutation.error : null;

  function handleMutationSuccess() {
    setControlStep({ step: "idle" });
    router.refresh();
  }

  function handleConfirmClick(note: string) {
    const trimmedNote = note.trim();
    if (isResolving) {
      resolveMutation.mutate(
        { clusterId, note: trimmedNote },
        { onSuccess: handleMutationSuccess },
      );
    } else {
      reopenMutation.mutate(
        { clusterId, note: trimmedNote === "" ? undefined : trimmedNote },
        { onSuccess: handleMutationSuccess },
      );
    }
  }

  function renderStep() {
    switch (controlStep.step) {
      case "idle":
        return (
          <button
            type="button"
            onClick={() => {
              activeMutation.reset();
              setControlStep({ step: "composing", note: "" });
            }}
            className="rounded-full border border-outline-variant px-4 py-2 text-sm font-medium"
          >
            {isResolving ? "Mark resolved" : "Reopen"}
          </button>
        );
      case "composing":
      case "confirming": {
        const isNoteMissing = isResolving && controlStep.note.trim() === "";
        return (
          <div className="space-y-2">
            <label className="flex flex-col gap-1">
              <span className={LABEL_CLASS}>
                {isResolving
                  ? "How was it fixed? (published on this page)"
                  : "Why reopen? (optional, kept in the audit log)"}
              </span>
              <textarea
                value={controlStep.note}
                onChange={(changeEvent) =>
                  setControlStep({ step: "composing", note: changeEvent.target.value })
                }
                rows={3}
                maxLength={2000}
                disabled={activeMutation.isPending}
                className={INPUT_CLASS}
              />
            </label>
            {controlStep.step === "confirming" && (
              <p className="text-xs text-muted-foreground">
                {isResolving
                  ? "This takes the cluster off the map, publishes your note, and removes its photos in 90 days."
                  : "This puts the cluster back on the map. Photos already removed do not come back."}
              </p>
            )}
            <div className="flex gap-2">
              {controlStep.step === "composing" ? (
                <button
                  type="button"
                  disabled={isNoteMissing}
                  onClick={() => setControlStep({ step: "confirming", note: controlStep.note })}
                  className="rounded-full bg-primary-imprint px-4 py-2 text-sm font-medium text-primary-imprint-foreground disabled:opacity-40"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isNoteMissing || activeMutation.isPending}
                  onClick={() => handleConfirmClick(controlStep.note)}
                  className="rounded-full bg-primary-imprint px-4 py-2 text-sm font-medium text-primary-imprint-foreground disabled:opacity-40"
                >
                  {activeMutation.isPending
                    ? "Saving…"
                    : isResolving
                      ? "Confirm: mark resolved"
                      : "Confirm: reopen"}
                </button>
              )}
              <button
                type="button"
                disabled={activeMutation.isPending}
                onClick={() => setControlStep({ step: "idle" })}
                className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        );
      }
      default: {
        const unhandledStep: never = controlStep;
        return unhandledStep;
      }
    }
  }

  return (
    <section
      aria-label="Moderator: cluster resolution"
      className="space-y-2 rounded-2xl border border-outline-variant p-4"
    >
      <p className="text-xs font-medium text-muted-foreground">Moderator</p>
      {renderStep()}
      {mutationError !== null && <MutationErrorNotice error={mutationError.apiError} />}
    </section>
  );
}

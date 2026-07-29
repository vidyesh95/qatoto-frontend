"use client";

// TRANSPORT: client-query — React Query hooks over `@/lib/rnd/discovery.api` for the two
// caller-scoped discovery surfaces: the member's own talent profile, and their own Civic
// Pulse submissions.
//
// BOTH ARE `/me`-SHAPED AND NEITHER TAKES A USER ID. The filter is the session on the
// server; a `?userId=` on either would be a client-supplied authorization input.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { rndKeys } from "@/hooks/rnd/keys";
import { unwrap } from "@/lib/http";
import {
  createProblemReport,
  getMyTalentProfile,
  listDiscoverySkills,
  listMyProblemReports,
  publishMyTalentProfile,
  putMyTalentProfile,
  unpublishMyTalentProfile,
} from "@/lib/rnd/discovery.api";
import type { ProblemSubmissionStatus, TalentProfileInput } from "@/lib/rnd/discovery.schemas";

/**
 * How often the reporter's own list re-reads after a `202`.
 *
 * Geocoding and clustering are scheduled jobs rather than an inline step, so this is
 * slower than the claim poll on purpose — a five-second loop against a job that may take
 * a minute is four wasted requests for every useful one.
 */
const CLUSTERING_POLL_INTERVAL_MS = 15_000;

/** The statuses that mean the clustering job has not finished with this submission. */
const IN_FLIGHT_CLUSTERING_STATUSES: readonly ProblemSubmissionStatus[] = ["queued"];

// --- The caller's own talent profile ------------------------------------------

export function useMyTalentProfileQuery(isEnabled: boolean = true) {
  return useQuery({
    queryKey: rndKeys.myTalentProfile(),
    queryFn: async () => unwrap(await getMyTalentProfile()),
    enabled: isEnabled,
    // A profile that has never been created answers 404, which is an ordinary first-run
    // state rather than a fault. Retrying it just delays the empty form.
    retry: false,
  });
}

/** The canonical skill vocabulary. Slugs from here are the only ones a PUT may send. */
export function useDiscoverySkillsQuery() {
  return useQuery({
    queryKey: ["rnd", "discovery", "skills"] as const,
    queryFn: async () => unwrap(await listDiscoverySkills()),
  });
}

export type SaveTalentProfileProgress =
  | { phase: "idle" }
  | { phase: "saving" }
  | { phase: "publishing" }
  | { phase: "done" };

/**
 * Save, then optionally publish.
 *
 * TWO CALLS, IN ORDER, AND THE CHAIN ABORTS ON THE FIRST FAILURE. Publishing a profile
 * whose save failed would publish the previous version, which is worse than not
 * publishing: the member would be advertising something they thought they had changed.
 *
 * The publish refusal is the SERVER'S. `completeness.isPublishable` on the read is a hint
 * for disabling the button early; this mutation does not re-check it, because a client
 * that decided publishability would be deciding whether a profile enters a public
 * directory.
 */
export function useSaveTalentProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: {
      input: TalentProfileInput;
      shouldPublish: boolean;
      onProgress?: (progress: SaveTalentProfileProgress) => void;
    }) => {
      variables.onProgress?.({ phase: "saving" });
      const saved = unwrap(await putMyTalentProfile(variables.input));

      if (!variables.shouldPublish) {
        variables.onProgress?.({ phase: "done" });
        return saved;
      }

      variables.onProgress?.({ phase: "publishing" });
      const published = unwrap(await publishMyTalentProfile());
      variables.onProgress?.({ phase: "done" });
      return published;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rndKeys.myTalentProfile() });
    },
  });
}

/** Take the profile out of the directory. The row survives; the listing does not. */
export function useUnpublishTalentProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => unwrap(await unpublishMyTalentProfile()),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rndKeys.myTalentProfile() });
    },
  });
}

// --- Civic Pulse submissions ---------------------------------------------------

/**
 * The caller's own reports, polled while any of them is still queued.
 *
 * THIS IS THE OTHER HALF OF THE `202`. The submit receipt carries `clusterId: null` by
 * construction, so the only way a reporter learns their report was clustered — or that
 * geocoding failed and it never will be — is this list.
 */
export function useMyProblemReportsQuery(isEnabled: boolean = true) {
  return useQuery({
    queryKey: rndKeys.myProblemReports(undefined),
    queryFn: async () => unwrap(await listMyProblemReports()),
    enabled: isEnabled,
    refetchInterval: (query) => {
      const rows = query.state.data?.rows;
      if (rows === undefined) return false;
      const hasQueuedReport = rows.some((report) =>
        IN_FLIGHT_CLUSTERING_STATUSES.includes(report.clusteringStatus),
      );
      return hasQueuedReport ? CLUSTERING_POLL_INTERVAL_MS : false;
    },
  });
}

/**
 * Submit a report. **`202`** — received, not placed on the map.
 *
 * Invalidates the reporter's own list so the new `queued` row appears; deliberately does
 * NOT invalidate the cluster list, because nothing about the map changed and refetching it
 * would imply otherwise.
 */
export function useCreateProblemReportMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      categoryId: string;
      description: string;
      locationText: string;
    }) => unwrap(await createProblemReport(input)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rndKeys.myProblemReports(undefined) });
    },
  });
}

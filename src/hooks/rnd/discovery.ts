"use client";

// TRANSPORT: client-query — React Query hooks over `@/lib/rnd/discovery.api` for the two
// caller-scoped discovery surfaces: the member's own talent profile, and their own Civic
// Pulse submissions.
//
// BOTH ARE `/me`-SHAPED AND NEITHER TAKES A USER ID. The filter is the session on the
// server; a `?userId=` on either would be a client-supplied authorization input.

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { rndKeys } from "@/hooks/rnd/keys";
import { unwrap } from "@/lib/http";
import type { PaginationMeta } from "@/lib/http";
import type { CreateProblemReportInput } from "@/lib/rnd/discovery.api";
import {
  createProblemReport,
  getMyTalentProfile,
  listDiscoverySkills,
  listMyProblemReports,
  listProblemClusters,
  publishMyTalentProfile,
  putMyTalentProfile,
  unpublishMyTalentProfile,
} from "@/lib/rnd/discovery.api";
import type {
  ProblemCluster,
  ProblemClusterSort,
  ProblemSubmissionStatus,
  TalentProfileInput,
} from "@/lib/rnd/discovery.schemas";
import {
  roundViewportBoundsForCacheKey,
  type ViewportBoundsMicrodegrees,
} from "@/lib/rnd/map-viewport";

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
 * How long a fetched page of clusters counts as fresh.
 *
 * ⚠️ **IT EXISTS TO STOP A DOUBLE FETCH ON FIRST PAINT.** The server component has already read
 * page one and hands it over as `initialData`; with the default `staleTime` of zero React Query
 * would refetch the identical list the moment the island mounts. Clusters are recomputed by a
 * nightly job, so thirty seconds is nowhere near the rate at which this data can actually change.
 */
const CLUSTER_LIST_STALE_TIME_MS = 30_000;

/**
 * The public problem-cluster list, scoped to what the map is showing.
 *
 * ⚠️ **THIS IS WHAT MAKES THE PANEL COUNT TRUE** (`todo.md` §19.4). Before it, the list was the
 * top of a global ranking while the map showed a viewport, so "12 clusters" was a coincidence
 * rather than an answer. The four bounding-box fields have been declared on
 * `ListProblemClustersFilter` since the endpoint shipped and no caller passed them.
 *
 * ⚠️ **`bounds` IS ROUNDED HERE, ONCE, AND USED FOR BOTH THE KEY AND THE REQUEST.** Rounding for
 * the key while requesting the raw box would make the cache entry disagree with its own contents:
 * two different boxes would collide onto one key and the second reader would be served the first
 * one's pins.
 *
 * ⚠️ **`initialData` SEEDS THE NO-VIEWPORT KEY ONLY.** It is the server's unbounded page one, and
 * handing it to a viewport-scoped key would paint a planet-wide ranking as though it were what is
 * on screen — the exact defect this hook exists to remove.
 *
 * `keepPreviousData` is why a pan does not blank the map: the previous page's pins stay on the
 * canvas while the next one is in flight, rather than every marker unmounting and remounting.
 */
export function useProblemClustersQuery(parameters: {
  readonly category: string | undefined;
  readonly region: string | undefined;
  readonly sort: ProblemClusterSort;
  readonly limit: number;
  readonly viewportBounds: ViewportBoundsMicrodegrees | null;
  readonly initialRows: ProblemCluster[];
  readonly initialPagination: PaginationMeta | null;
}) {
  const roundedViewportBounds =
    parameters.viewportBounds === null
      ? null
      : roundViewportBoundsForCacheKey(parameters.viewportBounds);

  // Built as one value rather than as a `canSeed` boolean plus a non-null assertion on the
  // pagination: CLAUDE.md Pattern 2 rules out assertions, and this way the narrowing is the
  // compiler's rather than a claim.
  const serverSeededPage =
    roundedViewportBounds === null && parameters.initialPagination !== null
      ? { rows: parameters.initialRows, pagination: parameters.initialPagination }
      : undefined;

  return useQuery({
    queryKey: rndKeys.problemClusters({
      category: parameters.category,
      region: parameters.region,
      sort: parameters.sort,
      roundedViewportBounds,
    }),
    queryFn: async () =>
      unwrap(
        await listProblemClusters({
          sort: parameters.sort,
          limit: parameters.limit,
          category: parameters.category,
          region: parameters.region,
          // Spreading `null` adds nothing, which is exactly the no-viewport read. The four
          // fields therefore arrive together or not at all, and the partial box the controller
          // answers `422 VIEWPORT_INCOMPLETE` for is unconstructible here.
          ...roundedViewportBounds,
        }),
      ),
    staleTime: CLUSTER_LIST_STALE_TIME_MS,
    placeholderData: keepPreviousData,
    initialData: serverSeededPage,
    // The server fetched it moments ago, so it is as fresh as `staleTime` thinks it is. Without
    // this the seed is treated as infinitely old and refetched on mount, which is the duplicate
    // request `staleTime` was added to avoid.
    initialDataUpdatedAt: serverSeededPage === undefined ? undefined : () => Date.now(),
  });
}

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
    // The shape is imported rather than restated: this used to carry its own inline copy of the
    // four fields, and a body the server refuses extra keys from is the worst possible place for
    // two hand-maintained literals to drift apart.
    mutationFn: async (input: CreateProblemReportInput) => unwrap(await createProblemReport(input)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rndKeys.myProblemReports(undefined) });
    },
  });
}

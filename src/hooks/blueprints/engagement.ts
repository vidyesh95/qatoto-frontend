"use client";

// TRANSPORT: client-query — the viewer-side writes on `/blueprints`, over
// `@/lib/blueprints/engagement.api`.
//
// ⚠️ THE TOGGLES ARE OPTIMISTIC AND THEN SETTLE ON THE SERVER'S COUNT. The caller holds the count
// in its own state, flips before the call so the control responds to a tap, and takes the server's
// number in `onSuccess` — `video-engagement-bar.tsx` is the shape this copies.
//
// ⚠️ AND THEY DO NOT PATCH THE FEED OR INDEX QUERY CACHE. Those lists are server-rendered, and
// surgically patching one row of one page of a keyset list is how a cache and a screen quietly
// disagree. The next server read carries the number for everyone.

import {
  useMutation,
  useQuery,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import { blueprintKeys } from "@/hooks/blueprints/keys";
import { describeEngagementError, type EngagementRefusal } from "@/hooks/feed/mutations";
import {
  getBlueprintViewerState,
  recordBlueprintView,
  setBlueprintToggle,
} from "@/lib/blueprints/engagement.api";
import type {
  BlueprintArm,
  BlueprintToggleResult,
  BlueprintToggleVerb,
  BlueprintViewerState,
} from "@/lib/blueprints/engagement.schemas";
import { unwrap } from "@/lib/http";

export type { EngagementRefusal };
export { describeEngagementError };

export interface BlueprintToggleVariables {
  readonly slug: string;
  readonly isSet: boolean;
}

/**
 * One toggle, bound to an arm and a verb at hook-call time.
 *
 * ⚠️ `unwrap` RATHER THAN RETURNING THE `ActionResponse`. A toggle's caller has to roll its
 * optimistic flip back on failure, which means it needs `onError` — and `onError` only fires for a
 * thrown error. The moderation hooks return the response instead, because their callers branch on
 * a 409 rather than undoing anything.
 */
export function useBlueprintToggleMutation(
  arm: BlueprintArm,
  verb: BlueprintToggleVerb,
): UseMutationResult<BlueprintToggleResult, Error, BlueprintToggleVariables> {
  return useMutation({
    mutationFn: async (variables: BlueprintToggleVariables) =>
      unwrap(await setBlueprintToggle({ arm, verb, slug: variables.slug, isSet: variables.isSet })),
  });
}

/**
 * What this viewer has already done to a named set of blueprints.
 *
 * ⚠️ `enabled` IS THE SIGNED-IN GATE. The route answers 401 without a session, and a signed-out
 * reader has no viewer state by definition — firing it anyway would put a guaranteed 401 in every
 * anonymous page load's network panel.
 */
export function useBlueprintViewerStateQuery(input: {
  readonly showcases?: readonly string[];
  readonly teardowns?: readonly string[];
  readonly caseStudies?: readonly string[];
  readonly isSignedIn: boolean;
}): UseQueryResult<BlueprintViewerState> {
  const allSlugs = [
    ...(input.showcases ?? []),
    ...(input.teardowns ?? []),
    ...(input.caseStudies ?? []),
  ];
  return useQuery({
    queryKey: blueprintKeys.viewerState(allSlugs),
    enabled: input.isSignedIn && allSlugs.length > 0,
    queryFn: async () =>
      unwrap(
        await getBlueprintViewerState({
          showcases: input.showcases,
          teardowns: input.teardowns,
          caseStudies: input.caseStudies,
        }),
      ),
  });
}

/**
 * Fires the view beacon once, for one blueprint.
 *
 * ⚠️ NOT A MUTATION AND NOT A QUERY. It has no result to render, no error a reader can act on, and
 * nothing to invalidate — the server counts one row per viewer per UTC day and answers 202 with an
 * empty body. The caller fires it from an effect on mount.
 */
export function recordBlueprintViewOnce(arm: BlueprintArm, slug: string): void {
  void recordBlueprintView(arm, slug);
}

"use client";

// TRANSPORT: client-query — React Query hooks over `@/lib/rnd/pitches.api`.
//
// `unwrap` inside every `mutationFn`, `invalidateQueries` in `onSuccess`, and the keys come
// from the single factory in `@/hooks/rnd/keys` so an invalidation cannot drift from the
// query that registered it.
//
// TWO READ HOOKS THAT ONCE LIVED HERE ARE GONE — `usePublicPitchesQuery` and
// `useProjectPitchesQuery`. The deal-flow rail awaits its list in a server component, and
// the project-scoped list was superseded by `/pitches/mine` (which is cross-project and
// already carries each project's name) — so its backend route was deleted with it. An
// uncalled hook is UNVERIFIED CODE: the audit in CLAUDE.md catches exactly this, and
// deleting them was the honest answer rather than inventing controls to justify them.
//
// ⚠️ NOTHING HERE IS OPTIMISTIC, and on this surface that is not a style choice. A pitch's
// status is the difference between "a stranger can see this" and "a moderator has not looked
// yet", and an outcome is an attestation about money. Showing either as done before the
// server said so would be showing somebody a state that may never exist.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { rndKeys } from "@/hooks/rnd/keys";
import { unwrap } from "@/lib/http";
import {
  closePitch,
  getPitch,
  confirmPitchOutcome,
  createPitch,
  deletePitch,
  listMyPitches,
  listPitchReviewQueue,
  moderatePitch,
  recordPitchOutcome,
  submitPitch,
  updatePitch,
  type CreatePitchInput,
  type ModeratePitchInput,
  type RecordPitchOutcomeInput,
  type UpdatePitchInput,
} from "@/lib/rnd/pitches.api";
import type { PitchStatus } from "@/lib/rnd/pitches.schemas";

// --- Reads -----------------------------------------------------------------

/** `/studio/pitches`. Founder-scoped server-side; there is no user id to pass. */
export function useMyPitchesQuery(page: number, status: PitchStatus | undefined) {
  return useQuery({
    queryKey: rndKeys.myPitches(page, status),
    queryFn: async () => unwrap(await listMyPitches({ page, status })),
  });
}

/**
 * One pitch and its funding records, by slug.
 *
 * A CLIENT READ EVEN THOUGH THE PUBLIC PAGE IS `server-fetch`, and the reason is the studio:
 * the founder's own card shows the outcome ledger and its confirm control, which are
 * interactive and live inside a `"use client"` island. The public detail page still awaits
 * `getPitch` directly in a server component; this is the second caller, not a replacement.
 *
 * Enabled only for a pitch that HAS a public page — the route serves `published` and
 * `closed` and 404s otherwise, so asking for a draft would be a guaranteed miss.
 */
export function usePitchQuery(pitchSlug: string, isEnabled: boolean) {
  return useQuery({
    queryKey: rndKeys.pitch(pitchSlug),
    queryFn: async () => unwrap(await getPitch(pitchSlug)),
    enabled: isEnabled,
  });
}

/** Moderators only. A caller without `moderate_content` gets a 403, not an empty list. */
export function usePitchReviewQueueQuery(page: number) {
  return useQuery({
    queryKey: rndKeys.pitchReviewQueue(page),
    queryFn: async () => unwrap(await listPitchReviewQueue({ page })),
  });
}

// --- Founder writes --------------------------------------------------------

/**
 * Creates a DRAFT. Invalidates the whole pitch subtree rather than one list, because a new
 * draft belongs in the founder's list AND in its project's list, and guessing which of the
 * two the caller is looking at is how a stale page happens.
 */
export function useCreatePitchMutation(projectSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePitchInput) => unwrap(await createPitch(projectSlug, input)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rndKeys.pitchesRoot() });
    },
  });
}

export function useUpdatePitchMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: { pitchId: string; input: UpdatePitchInput }) =>
      unwrap(await updatePitch(variables.pitchId, variables.input)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rndKeys.pitchesRoot() });
    },
  });
}

/** Draft or rejected → in review. The verdict does not exist yet; do not render one. */
export function useSubmitPitchMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (pitchId: string) => unwrap(await submitPitch(pitchId)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rndKeys.pitchesRoot() });
    },
  });
}

export function useClosePitchMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (pitchId: string) => unwrap(await closePitch(pitchId)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rndKeys.pitchesRoot() });
    },
  });
}

/** Drafts only. Anything a moderator has seen is a record — `useClosePitchMutation` is its exit. */
export function useDeletePitchMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (pitchId: string) => unwrap(await deletePitch(pitchId)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rndKeys.pitchesRoot() });
    },
  });
}

// --- Funding outcomes ------------------------------------------------------

/**
 * Records one party's account of funding that happened off-platform.
 *
 * The caller supplies `idempotencyKey` from component state and rotates it after a success —
 * reusing it for a second, genuinely different outcome would return the first as a replay.
 */
export function useRecordPitchOutcomeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: { pitchId: string; input: RecordPitchOutcomeInput }) =>
      unwrap(await recordPitchOutcome(variables.pitchId, variables.input)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rndKeys.pitchesRoot() });
    },
  });
}

export function useConfirmPitchOutcomeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (outcomeId: string) => unwrap(await confirmPitchOutcome(outcomeId)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rndKeys.pitchesRoot() });
    },
  });
}

// --- Moderation ------------------------------------------------------------

export function useModeratePitchMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: { pitchId: string; input: ModeratePitchInput }) =>
      unwrap(await moderatePitch(variables.pitchId, variables.input)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rndKeys.pitchesRoot() });
    },
  });
}

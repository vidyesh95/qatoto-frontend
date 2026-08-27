"use client";

// TRANSPORT: client-query — React Query over `@/lib/videos/collaborations.api`.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { unwrap } from "@/lib/http";
import {
  listMyCollaborations,
  listMyCollaborators,
  respondToCollaboration,
} from "@/lib/videos/collaborations.api";
import type { RespondToCollaborationInput } from "@/lib/videos/collaborations.schemas";

export const collaborationKeys = {
  all: ["collaborations"] as const,
  /** Invitations addressed to me. */
  mine: () => ["collaborations", "mine"] as const,
  /** People I have invited, across my own videos. */
  roster: () => ["collaborations", "roster"] as const,
};

/** `retry: false` — a 401 is an answer, not a flake. */
export function useMyCollaborationsQuery() {
  return useQuery({
    queryKey: collaborationKeys.mine(),
    queryFn: async () => unwrap(await listMyCollaborations()),
    retry: false,
  });
}

export function useMyCollaboratorsQuery() {
  return useQuery({
    queryKey: collaborationKeys.roster(),
    queryFn: async () => unwrap(await listMyCollaborators()),
    retry: false,
  });
}

/**
 * Accept or decline an invitation addressed to you.
 *
 * NOT OPTIMISTIC. The status is a record of what somebody said about work they did; showing
 * "Confirmed" before the server agrees would put a claim on screen that may not have landed.
 *
 * INVALIDATES ONLY THE INVITE LIST. The roster is somebody ELSE's view of these rows — this caller
 * does not own the video — so there is nothing of theirs to refetch.
 */
export function useRespondToCollaborationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: {
      readonly videoId: string;
      readonly input: RespondToCollaborationInput;
    }) => unwrap(await respondToCollaboration(variables.videoId, variables.input)),
    retry: false,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: collaborationKeys.mine() });
    },
  });
}

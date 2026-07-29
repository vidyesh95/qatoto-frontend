"use client";

// TRANSPORT: client-query — React Query hooks over `@/lib/rnd/projects.api` and
// `@/lib/rnd/catalog.api`.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { rndKeys } from "@/hooks/rnd/keys";
import { unwrap } from "@/lib/http";
import { createResearchCategory, listResearchCategories } from "@/lib/rnd/catalog.api";
import {
  createProjectApplication,
  createProjectInvite,
  createResearchProject,
  decideProjectApplication,
  listMyApplications,
  listMyInvites,
  publishResearchProject,
  respondToProjectInvite,
  unwatchProject,
  uploadProjectCover,
  watchProject,
  type CreateApplicationInput,
  type CreateResearchProjectInput,
} from "@/lib/rnd/projects.api";

// --- Queries ------------------------------------------------------------------

/**
 * The approved research taxonomy, for a form that has to send a category ID.
 *
 * `?status=approved` because a form should offer the vocabulary, not everything anyone
 * has ever proposed — a pending category is one person's suggestion, not a choice.
 */
export function useResearchCategoriesQuery() {
  return useQuery({
    queryKey: ["rnd", "research-categories", "approved"] as const,
    queryFn: async () => unwrap(await listResearchCategories({ status: "approved" })),
  });
}

export function useMyApplicationsQuery(status?: string) {
  return useQuery({
    queryKey: rndKeys.myApplications(status),
    queryFn: async () => unwrap(await listMyApplications({ status })),
  });
}

export function useMyInvitesQuery(status?: string) {
  return useQuery({
    queryKey: rndKeys.myInvites(status),
    queryFn: async () => unwrap(await listMyInvites({ status })),
  });
}

// --- Creating a project --------------------------------------------------------

/**
 * How far along a multi-step create is.
 *
 * The wizard needs this because creating a project is THREE calls — create the draft,
 * upload the cover, publish — and a single spinner across all three tells the user
 * nothing about which one failed. Modelled on `SaveProgress` in `src/hooks/products.ts`.
 */
export type CreateProjectProgress =
  | { phase: "idle" }
  | { phase: "creating-category" }
  | { phase: "creating-project" }
  | { phase: "uploading-cover" }
  | { phase: "publishing" }
  | { phase: "done"; projectSlug: string };

interface CreateProjectVariables {
  readonly input: CreateResearchProjectInput;
  /** Set when the founder typed a category that does not exist yet. */
  readonly newCategoryLabel?: string;
  readonly coverFile?: File;
  readonly shouldPublish: boolean;
  readonly onProgress?: (progress: CreateProjectProgress) => void;
}

/**
 * Create → (cover) → (publish).
 *
 * THE PROJECT IS CREATED AS A DRAFT AND STAYS ONE unless `shouldPublish`. That is not a
 * convenience: a draft is `404` to everyone but its founder, so an unfinished idea is
 * private by construction rather than by a visibility flag someone has to remember.
 *
 * EACH STEP IS AWAITED IN ORDER AND THE CHAIN ABORTS ON THE FIRST FAILURE, because
 * `unwrap` throws. A cover upload that fails must not be followed by a publish — the
 * project exists either way, and the founder can retry from its own page.
 */
export function useCreateResearchProjectMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: CreateProjectVariables) => {
      let categoryId = variables.input.categoryId;

      if (variables.newCategoryLabel !== undefined && variables.newCategoryLabel.length > 0) {
        variables.onProgress?.({ phase: "creating-category" });
        // Arrives `pending`, not `approved` — the taxonomy is moderated, and the project
        // links to the id regardless of whether the moderator later merges it.
        const category = unwrap(
          await createResearchCategory({ displayLabel: variables.newCategoryLabel }),
        );
        categoryId = category.id;
      }

      variables.onProgress?.({ phase: "creating-project" });
      const project = unwrap(await createResearchProject({ ...variables.input, categoryId }));

      if (variables.coverFile) {
        variables.onProgress?.({ phase: "uploading-cover" });
        unwrap(await uploadProjectCover(project.slug, variables.coverFile));
      }

      if (variables.shouldPublish) {
        variables.onProgress?.({ phase: "publishing" });
        unwrap(await publishResearchProject(project.slug));
      }

      variables.onProgress?.({ phase: "done", projectSlug: project.slug });
      return project;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rndKeys.all });
    },
  });
}

// --- Watching ------------------------------------------------------------------

/** Idempotent by verb, so a double-tap is harmless rather than a toggle race. */
export function useWatchProjectMutation(projectSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (shouldWatch: boolean) =>
      shouldWatch
        ? unwrap(await watchProject(projectSlug))
        : unwrap(await unwatchProject(projectSlug)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rndKeys.project(projectSlug) });
    },
  });
}

// --- Applications and invites ---------------------------------------------------

export function useApplyToProjectMutation(projectSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateApplicationInput) =>
      unwrap(await createProjectApplication(projectSlug, input)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rndKeys.myApplications(undefined) });
    },
  });
}

/**
 * Accept, decline or withdraw.
 *
 * WHICH ONE THE CALLER MAY USE DEPENDS ON WHO THEY ARE — a maintainer accepts or
 * declines, the applicant withdraws — and the backend decides that. This hook offers all
 * three and lets the refusal come from the server, rather than encoding a role check in
 * the client where it would be advisory at best.
 */
export function useDecideApplicationMutation(projectSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: {
      applicationId: string;
      decision: "accept" | "decline" | "withdraw";
      reviewNote?: string;
    }) =>
      unwrap(
        await decideProjectApplication(projectSlug, variables.applicationId, variables.decision, {
          reviewNote: variables.reviewNote,
        }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rndKeys.myApplications(undefined) });
      void queryClient.invalidateQueries({ queryKey: rndKeys.projectTeam(projectSlug) });
    },
  });
}

export function useInviteToProjectMutation(projectSlug: string) {
  return useMutation({
    mutationFn: async (variables: {
      inviteeUserId: string;
      openRoleId?: string;
      roleTitle?: string;
      message?: string;
    }) => unwrap(await createProjectInvite(projectSlug, variables)),
  });
}

/** THE INVITEE only. The project slug comes off the invite row, not from a page. */
export function useRespondToInviteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: {
      projectSlug: string;
      inviteId: string;
      decision: "accept" | "decline";
    }) =>
      unwrap(
        await respondToProjectInvite(variables.projectSlug, variables.inviteId, variables.decision),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rndKeys.myInvites(undefined) });
    },
  });
}

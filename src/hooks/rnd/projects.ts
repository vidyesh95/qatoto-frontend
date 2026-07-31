"use client";

// TRANSPORT: client-query — React Query hooks over `@/lib/rnd/projects.api` and
// `@/lib/rnd/catalog.api`.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { rndKeys } from "@/hooks/rnd/keys";
import { unwrap } from "@/lib/http";
import { createResearchCategory, listResearchCategories } from "@/lib/rnd/catalog.api";
import {
  createOpenRole,
  createProjectApplication,
  createProjectInvite,
  createResearchProject,
  decideProjectApplication,
  deleteOpenRole,
  leaveProject,
  listMyApplications,
  listMyInvites,
  listProjectApplications,
  listProjectInvites,
  publishResearchProject,
  removeProjectMember,
  respondToProjectInvite,
  setOpenRoleOpenState,
  setProjectStage,
  unpublishResearchProject,
  unwatchProject,
  updateOpenRole,
  updateProjectMember,
  updateResearchProject,
  uploadProjectCover,
  watchProject,
  type CreateApplicationInput,
  type CreateResearchProjectInput,
  type OpenRoleInput,
} from "@/lib/rnd/projects.api";
import type { ProjectStage } from "@/lib/rnd/shared.schemas";

// --- Queries ------------------------------------------------------------------

/**
 * The approved research taxonomy, for a form that has to send a category ID.
 *
 * `?status=approved` because a form should offer the vocabulary, not everything anyone
 * has ever proposed — a pending category is one person's suggestion, not a choice.
 */
export function useResearchCategoriesQuery() {
  return useQuery({
    queryKey: rndKeys.researchCategories("approved"),
    queryFn: async () => unwrap(await listResearchCategories({ status: "approved" })),
  });
}

/**
 * Proposes a research category. It lands `pending`.
 *
 * WHAT THE CALLER MUST NOT ASSUME: `pending` is not usable everywhere. `createResearchProject`
 * links to a pending id happily, but the problem report, the market-insight and the skill
 * writes all demand `approved` and answer `422 CATEGORY_NOT_APPROVED`. Which rule applies is
 * the calling form's business, so this hook returns the row — including its `status` — and
 * decides nothing.
 *
 * NO INVALIDATION, deliberately. Every read of this taxonomy asks for `?status=approved`, and
 * a row that just landed `pending` cannot have changed any of them. Refetching would imply it
 * had.
 */
export function useCreateResearchCategoryMutation() {
  return useMutation({
    mutationFn: async (input: { displayLabel: string }) =>
      unwrap(await createResearchCategory({ displayLabel: input.displayLabel })),
  });
}

/**
 * The FOUNDER's application inbox — a different read from `useMyApplicationsQuery`, with
 * different rows and a different actor. Maintainer-gated; a non-maintainer gets `404`.
 */
export function useProjectApplicationsQuery(projectSlug: string, status?: string) {
  return useQuery({
    queryKey: rndKeys.projectApplications(projectSlug, status),
    queryFn: async () => unwrap(await listProjectApplications(projectSlug, { status })),
  });
}

/** Invites this project has SENT. The inverse of `useMyInvitesQuery`. */
export function useProjectInvitesQuery(projectSlug: string) {
  return useQuery({
    queryKey: rndKeys.projectInvites(projectSlug),
    queryFn: async () => unwrap(await listProjectInvites(projectSlug)),
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

// --- Editing the project itself --------------------------------------------------

/**
 * Edit, cover, publish, unpublish, stage.
 *
 * STAGE IS A SEPARATE ACTION AND NOT A FIELD ON THE EDIT, because every stage change
 * writes an append-only audit row. A stage buried in a PATCH body would let the pipeline
 * move without anyone being recorded as having moved it.
 *
 * Publishing is likewise its own act: before it, the project answers `404` to everyone but
 * its founder, so a draft's URL is safe to hold and unsafe to share.
 */
export function useProjectSettingsMutation(projectSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: {
      action: "update" | "cover" | "publish" | "unpublish" | "stage";
      input?: Partial<CreateResearchProjectInput>;
      coverFile?: File;
      stage?: ProjectStage;
      stageNote?: string;
    }) => {
      if (variables.action === "update") {
        return unwrap(await updateResearchProject(projectSlug, variables.input ?? {}));
      }
      if (variables.action === "cover") {
        if (!variables.coverFile) throw new Error("Missing cover file");
        return unwrap(await uploadProjectCover(projectSlug, variables.coverFile));
      }
      if (variables.action === "publish") {
        return unwrap(await publishResearchProject(projectSlug));
      }
      if (variables.action === "unpublish") {
        return unwrap(await unpublishResearchProject(projectSlug));
      }
      if (!variables.stage) throw new Error("Missing stage");
      return unwrap(
        await setProjectStage(projectSlug, { stage: variables.stage, note: variables.stageNote }),
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rndKeys.project(projectSlug) });
    },
  });
}

// --- Open roles --------------------------------------------------------------------

/**
 * Create, edit, close, reopen, delete.
 *
 * CLOSE IS NOT DELETE, and the UI should prefer it: `DELETE` is refused once the role has
 * applications (`409 ROLE_HAS_REFERENCES`), because the people who applied to it are a
 * record. Closing keeps them and stops new ones.
 */
export function useOpenRoleMutation(projectSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: {
      action: "create" | "update" | "close" | "reopen" | "delete";
      roleId?: string;
      input?: OpenRoleInput;
      patch?: Partial<OpenRoleInput>;
    }) => {
      if (variables.action === "create") {
        if (!variables.input) throw new Error("Missing role input");
        return unwrap(await createOpenRole(projectSlug, variables.input));
      }
      if (!variables.roleId) throw new Error("Missing role id");
      if (variables.action === "update") {
        return unwrap(await updateOpenRole(projectSlug, variables.roleId, variables.patch ?? {}));
      }
      if (variables.action === "delete") {
        return unwrap(await deleteOpenRole(projectSlug, variables.roleId));
      }
      return unwrap(await setOpenRoleOpenState(projectSlug, variables.roleId, variables.action));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rndKeys.projectRoles(projectSlug) });
      void queryClient.invalidateQueries({ queryKey: rndKeys.project(projectSlug) });
    },
  });
}

// --- Membership ---------------------------------------------------------------------

/**
 * Change a role, remove someone, or leave.
 *
 * LEAVING IS ITS OWN ENDPOINT (`/members/me`) rather than removing yourself by id, because
 * the two are different acts with different authorization: anyone may leave; removing
 * someone else needs maintainer.
 */
export function useProjectMemberMutation(projectSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: {
      action: "update" | "remove" | "leave";
      memberId?: string;
      projectRole?: "maintainer" | "contributor";
      roleTitle?: string | null;
    }) => {
      if (variables.action === "leave") {
        return unwrap(await leaveProject(projectSlug));
      }
      if (!variables.memberId) throw new Error("Missing member id");
      if (variables.action === "remove") {
        return unwrap(await removeProjectMember(projectSlug, variables.memberId));
      }
      return unwrap(
        await updateProjectMember(projectSlug, variables.memberId, {
          projectRole: variables.projectRole,
          roleTitle: variables.roleTitle,
        }),
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rndKeys.project(projectSlug) });
      void queryClient.invalidateQueries({ queryKey: rndKeys.projectTeam(projectSlug) });
    },
  });
}

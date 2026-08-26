// TRANSPORT: server-fetch + client-query — callable from both sides via the optional
// `RequestOptions`. `GET /research-projects` is viewer-aware (`attachOptionalUser`),
// so a server component should forward the session cookie through
// `@/lib/server-http` rather than calling these directly.

import { z } from "zod";

import {
  buildQueryString,
  getJson,
  sendForm,
  sendJson,
  getPaginated,
  type ActionResponse,
  type PaginationMeta,
  type RequestOptions,
} from "@/lib/http";
import { OpenRoleSchema, type OpenRole } from "@/lib/rnd/catalog.schemas";
import {
  MyApplicationSchema,
  MyInviteSchema,
  ProjectApplicationSchema,
  ProjectCoverUploadResultSchema,
  ProjectInviteSchema,
  ProjectTeamMemberSchema,
  ProjectVideoSchema,
  ResearchProjectDetailSchema,
  ResearchProjectListRowSchema,
  ResearchProjectSlugsSchema,
  type ListResearchProjectsFilter,
  type MyApplication,
  type MyInvite,
  type ProjectApplication,
  type ProjectCoverUploadResult,
  type ProjectInvite,
  type ProjectTeamMember,
  type ProjectVideo,
  type ResearchProjectDetail,
  type ResearchProjectListRow,
} from "@/lib/rnd/projects.schemas";
import {
  PaginationMetaSchema,
  type ProjectStage,
  type RoleCommitment,
} from "@/lib/rnd/shared.schemas";

/**
 * The public feed of `active` projects — the landing rail, and the stage-filtered
 * rails on `/team-building` and `/go-to-market`.
 *
 * Drafts never appear here; they are visible to their founder through
 * `GET /research-projects/mine`. Do not pass `sort` — the query schema is `.strict()`
 * and has no such key (see `ListResearchProjectsFilter`).
 */
export function listResearchProjects(
  filter: ListResearchProjectsFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: ResearchProjectListRow[]; pagination: PaginationMeta }>> {
  return getPaginated(
    `/research-projects${buildQueryString({ ...filter })}`,
    ResearchProjectListRowSchema,
    PaginationMetaSchema,
    options,
  );
}

/**
 * The ventures this viewer may attach a video to — the studio's venture picker.
 *
 * NOT `listResearchProjects`, which is the public feed of every active project, and NOT
 * `/mine`, which is founder-owned and includes drafts. This one mirrors the studio's write
 * gate exactly: active membership of an `active` project. Offering anything wider would put
 * options in the picker that `POST /videos` answers 422 to; offering anything narrower would
 * hide ventures a contributor is entitled to link.
 */
export function listAttachableResearchProjects(
  filter: { readonly page?: number; readonly limit?: number } = {},
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: ResearchProjectListRow[]; pagination: PaginationMeta }>> {
  return getPaginated(
    `/research-projects/attachable${buildQueryString({ ...filter })}`,
    ResearchProjectListRowSchema,
    PaginationMetaSchema,
    options,
  );
}

/**
 * Every project slug, for `generateStaticParams`.
 *
 * The one R&D read with no auth middleware at all, because it serves build-time
 * prerendering rather than a visitor. Call it from `generateStaticParams` only — a
 * request-time caller wants `listResearchProjects`.
 */
export function listResearchProjectSlugs(
  options?: RequestOptions,
): Promise<ActionResponse<string[]>> {
  return getJson("/research-projects/slugs", ResearchProjectSlugsSchema, options);
}

/**
 * One project's full detail — the header, the prose, the roster and the stats sidecar
 * in a single read. `attachOptionalUser`, so it renders signed out.
 *
 * A `404` means "no such project, or a draft you do not own", and the two are
 * indistinguishable on purpose so a stranger cannot probe which slugs exist. Call
 * `notFound()` on it; never render a permission hint.
 *
 * A successful read is what makes a "members only" message legitimate on this
 * project's CHILD routes — see `toMemberScopedListViewState`.
 */
export function getResearchProjectDetail(
  projectSlug: string,
  options?: RequestOptions,
): Promise<ActionResponse<ResearchProjectDetail>> {
  return getJson(`/research-projects/${projectSlug}`, ResearchProjectDetailSchema, options);
}

/**
 * One project's open roles, same row shape as the cross-project `GET /open-roles`.
 *
 * This endpoint exists because `/open-roles` CANNOT substitute: its query schema is
 * `.strict()` and has no `projectSlug` facet, so there is no way to narrow it to one
 * project. Public (`attachOptionalUser`), and a bare array — no pagination.
 */
export function listProjectOpenRoles(
  projectSlug: string,
  options?: RequestOptions,
): Promise<ActionResponse<OpenRole[]>> {
  return getJson(`/research-projects/${projectSlug}/roles`, OpenRoleSchema.array(), options);
}

/**
 * A venture's own film reel — every PUBLIC video that named this project.
 *
 * Public for a published project and member-only for a draft, through the same gate the
 * roles routes use, so asking for a draft's videos cannot confirm the slug exists.
 *
 * Assembled by the videos themselves rather than curated: a creator links the video once in
 * the studio and it appears here. Nothing on this page writes the list.
 */
export function listProjectVideos(
  projectSlug: string,
  filter: { readonly page?: number; readonly limit?: number } = {},
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: ProjectVideo[]; pagination: PaginationMeta }>> {
  return getPaginated(
    `/research-projects/${projectSlug}/videos${buildQueryString({ ...filter })}`,
    ProjectVideoSchema,
    PaginationMetaSchema,
    options,
  );
}

// --- Writes: creating and publishing a project ---------------------------------

export interface CreateResearchProjectInput {
  readonly name: string;
  readonly tagline: string;
  /** The CATEGORY ID, not its display name. Resolve it from `GET /research-categories`. */
  readonly categoryId: string;
  readonly description?: string;
  readonly problemStatement?: string;
  readonly solutionSummary?: string;
  readonly targetRegion?: string;
  readonly demandEvidenceNotes?: string;
  readonly seedRolesNeeded?: readonly string[];
  /** Basis points, integers only. No float ever touches equity. */
  readonly offeredEquityBasisPointsMin?: number;
  readonly offeredEquityBasisPointsMax?: number;
  readonly expectedCommitment?: RoleCommitment;
}

/**
 * Create a project.
 *
 * IT IS CREATED AS A **DRAFT**, and that is the model rather than a workflow nicety: an
 * idea IS a project here. There is no separate "idea" table, so posting an idea and
 * starting a project are the same act, and publishing is a later, separate decision.
 *
 * The founder `project_member` row and the `project_stats` sidecar are written in the
 * SAME transaction, so a created project is never a project with no members.
 *
 * `422` on an inverted equity band — the minimum cannot exceed the maximum, checked
 * inside one payload here and across patches in the service.
 */
export function createResearchProject(
  input: CreateResearchProjectInput,
  options?: RequestOptions,
): Promise<ActionResponse<ResearchProjectDetail>> {
  return sendJson("/research-projects", "POST", input, ResearchProjectDetailSchema, options);
}

/** Edit a project. Founder/maintainer; the same field set as create, all optional. */
export function updateResearchProject(
  projectSlug: string,
  input: Partial<CreateResearchProjectInput>,
  options?: RequestOptions,
): Promise<ActionResponse<ResearchProjectDetail>> {
  return sendJson(
    `/research-projects/${projectSlug}`,
    "PATCH",
    input,
    ResearchProjectDetailSchema,
    options,
  );
}

/** The cover image. Multipart — the file is measured and stored server-side. */
export function uploadProjectCover(
  projectSlug: string,
  coverFile: File,
  options?: RequestOptions,
): Promise<ActionResponse<ProjectCoverUploadResult>> {
  const formData = new FormData();
  formData.append("cover", coverFile);
  return sendForm(
    `/research-projects/${projectSlug}/cover`,
    "POST",
    formData,
    ProjectCoverUploadResultSchema,
    options,
  );
}

/**
 * Publish a draft.
 *
 * THE MOMENT THE PROJECT BECOMES PUBLIC. Before this the detail read answers `404` to
 * everyone but the founder, which is why a draft's URL is safe to hold and unsafe to
 * share.
 */
export function publishResearchProject(
  projectSlug: string,
  options?: RequestOptions,
): Promise<ActionResponse<ResearchProjectDetail>> {
  return sendJson(
    `/research-projects/${projectSlug}/publish`,
    "POST",
    undefined,
    ResearchProjectDetailSchema,
    options,
  );
}

export function unpublishResearchProject(
  projectSlug: string,
  options?: RequestOptions,
): Promise<ActionResponse<ResearchProjectDetail>> {
  return sendJson(
    `/research-projects/${projectSlug}/unpublish`,
    "POST",
    undefined,
    ResearchProjectDetailSchema,
    options,
  );
}

/**
 * Move the project along the pipeline.
 *
 * ITS OWN ROUTE, not a field on the edit, BECAUSE EVERY CHANGE WRITES AN APPEND-ONLY
 * AUDIT ROW. A stage buried in a PATCH body would let the pipeline move without anyone
 * being recorded as having moved it.
 */
export function setProjectStage(
  projectSlug: string,
  input: { readonly stage: ProjectStage; readonly note?: string },
  options?: RequestOptions,
): Promise<ActionResponse<ResearchProjectDetail>> {
  return sendJson(
    `/research-projects/${projectSlug}/stage`,
    "POST",
    input,
    ResearchProjectDetailSchema,
    options,
  );
}

/** Follow a project. Idempotent by verb — a double-tap is harmless. */
export function watchProject(
  projectSlug: string,
  options?: RequestOptions,
): Promise<ActionResponse<{ isWatchedByViewer: boolean }>> {
  return sendJson(
    `/research-projects/${projectSlug}/watch`,
    "POST",
    undefined,
    z.object({ isWatchedByViewer: z.boolean() }).strip(),
    options,
  );
}

export function unwatchProject(
  projectSlug: string,
  options?: RequestOptions,
): Promise<ActionResponse<{ isWatchedByViewer: boolean }>> {
  return sendJson(
    `/research-projects/${projectSlug}/watch`,
    "DELETE",
    undefined,
    z.object({ isWatchedByViewer: z.boolean() }).strip(),
    options,
  );
}

// --- Applications --------------------------------------------------------------

export interface CreateApplicationInput {
  /** Omit for an open application — someone offering to help with no role in mind. */
  readonly openRoleId?: string;
  readonly shortPitch: string;
  readonly selectedSkills?: readonly string[];
  readonly statedCommitment: RoleCommitment;
  readonly expectedCompensationNote?: string;
}

/** Apply to a project, with or without a specific role. */
export function createProjectApplication(
  projectSlug: string,
  input: CreateApplicationInput,
  options?: RequestOptions,
): Promise<ActionResponse<ProjectApplication>> {
  return sendJson(
    `/research-projects/${projectSlug}/applications`,
    "POST",
    input,
    ProjectApplicationSchema,
    options,
  );
}

/** The FOUNDER'S inbox. Maintainer-gated — `404` to everyone else. */
export function listProjectApplications(
  projectSlug: string,
  filter: { readonly status?: string; readonly page?: number } = {},
  options?: RequestOptions,
): Promise<ActionResponse<ProjectApplication[]>> {
  return getJson(
    `/research-projects/${projectSlug}/applications${buildQueryString({ ...filter })}`,
    ProjectApplicationSchema.array(),
    options,
  );
}

/**
 * Accept, decline or withdraw an application.
 *
 * THE THREE VERBS HAVE DIFFERENT ACTORS: a maintainer accepts or declines, the APPLICANT
 * withdraws. The backend enforces that; this wrapper does not pretend to.
 */
export function decideProjectApplication(
  projectSlug: string,
  applicationId: string,
  decision: "accept" | "decline" | "withdraw",
  input: { readonly reviewNote?: string } = {},
  options?: RequestOptions,
): Promise<ActionResponse<ProjectApplication>> {
  return sendJson(
    `/research-projects/${projectSlug}/applications/${applicationId}/${decision}`,
    "POST",
    input,
    ProjectApplicationSchema,
    options,
  );
}

/**
 * The caller's own applications.
 *
 * NO `?userId=` PARAM EXISTS AND NONE MAY BE ADDED — the filter is the session id. A
 * client-supplied user id on a personal list is a client-supplied authorization input.
 */
export function listMyApplications(
  filter: { readonly status?: string; readonly page?: number } = {},
  options?: RequestOptions,
): Promise<ActionResponse<MyApplication[]>> {
  return getJson(
    `/applications/mine${buildQueryString({ ...filter })}`,
    MyApplicationSchema.array(),
    options,
  );
}

// --- Invites -------------------------------------------------------------------

/** Invite someone. `422 SELF_INVITE_FORBIDDEN`, `409 ALREADY_INVITED`. */
export function createProjectInvite(
  projectSlug: string,
  input: {
    readonly inviteeUserId: string;
    readonly openRoleId?: string;
    readonly roleTitle?: string;
    readonly message?: string;
  },
  options?: RequestOptions,
): Promise<ActionResponse<ProjectInvite>> {
  return sendJson(
    `/research-projects/${projectSlug}/invites`,
    "POST",
    input,
    ProjectInviteSchema,
    options,
  );
}

/** Invites the caller has SENT on this project. */
export function listProjectInvites(
  projectSlug: string,
  options?: RequestOptions,
): Promise<ActionResponse<ProjectInvite[]>> {
  return getJson(`/research-projects/${projectSlug}/invites`, ProjectInviteSchema.array(), options);
}

/**
 * Invites addressed to the caller.
 *
 * THE READ THAT MAKES THE INVITE FLOW TERMINATE SOMEWHERE. `/accept` and `/decline` both
 * need an `inviteId` an invitee has no other way to obtain, because they hold no slug.
 */
export function listMyInvites(
  filter: { readonly status?: string; readonly page?: number } = {},
  options?: RequestOptions,
): Promise<ActionResponse<MyInvite[]>> {
  return getJson(
    `/invites/mine${buildQueryString({ ...filter })}`,
    MyInviteSchema.array(),
    options,
  );
}

/** THE INVITEE only — `403 NOT_THE_INVITEE` for anyone else, including the inviter. */
export function respondToProjectInvite(
  projectSlug: string,
  inviteId: string,
  decision: "accept" | "decline",
  options?: RequestOptions,
): Promise<ActionResponse<ProjectInvite>> {
  return sendJson(
    `/research-projects/${projectSlug}/invites/${inviteId}/${decision}`,
    "POST",
    undefined,
    ProjectInviteSchema,
    options,
  );
}

// --- Open roles ----------------------------------------------------------------

/**
 * One advertised compensation strand as SENT.
 *
 * A DISCRIMINATED UNION, not a bag of optionals, and the pairing rules are the reason:
 * cash is paid by the company and reported under §7A, equity vests through Slicing Pie,
 * and `equity` therefore admits ONLY `slicing_pie_vesting`. Pairing them the other way
 * would let a founder advertise a mechanism that does not exist. A DB CHECK enforces the
 * same rule; the union makes the illegal combination unrepresentable before it is sent.
 */
export type OpenRoleCompensationStrandInput =
  | {
      readonly kind: "salary";
      readonly salaryMinInCentsPerMonth: number;
      readonly salaryMaxInCentsPerMonth?: number;
      readonly earnedAsPolicy: "off_platform_payroll" | "direct_transfer";
      readonly earnedAsNote?: string;
    }
  | {
      readonly kind: "one_time";
      readonly oneTimeMinInCents: number;
      readonly oneTimeMaxInCents?: number;
      readonly earnedAsPolicy: "off_platform_payroll" | "direct_transfer";
      readonly earnedAsNote?: string;
    }
  | {
      readonly kind: "equity";
      readonly equityBasisPointsMin: number;
      readonly equityBasisPointsMax?: number;
      readonly earnedAsPolicy: "slicing_pie_vesting";
      readonly earnedAsNote?: string;
    };

export interface OpenRoleInput {
  readonly roleTitle: string;
  readonly skills?: readonly string[];
  readonly commitment: RoleCommitment;
  readonly slotsTotal?: number;
  readonly description?: string;
  /** At most three strands. */
  readonly compensation?: readonly OpenRoleCompensationStrandInput[];
}

/**
 * Advertise a role. Maintainer and above.
 *
 * `slotsFilledCount` IS ABSENT FROM THE BODY AND MUST STAY ABSENT — it is a server-owned
 * counter moved only by the accept transaction, and `.strict()` rejects a client that
 * tries to set it. A form field for it would be a form field for "how many people have
 * joined", answered by the person advertising.
 */
export function createOpenRole(
  projectSlug: string,
  input: OpenRoleInput,
  options?: RequestOptions,
): Promise<ActionResponse<OpenRole>> {
  return sendJson(
    `/research-projects/${projectSlug}/roles`,
    "POST",
    input,
    OpenRoleSchema,
    options,
  );
}

export function updateOpenRole(
  projectSlug: string,
  roleId: string,
  input: Partial<OpenRoleInput>,
  options?: RequestOptions,
): Promise<ActionResponse<OpenRole>> {
  return sendJson(
    `/research-projects/${projectSlug}/roles/${roleId}`,
    "PATCH",
    input,
    OpenRoleSchema,
    options,
  );
}

/**
 * Close or reopen. SEPARATE VERBS rather than a `status` field on the edit, for the same
 * reason the project's stage is its own route: it is an event, not an attribute.
 */
export function setOpenRoleOpenState(
  projectSlug: string,
  roleId: string,
  nextState: "close" | "reopen",
  options?: RequestOptions,
): Promise<ActionResponse<OpenRole>> {
  return sendJson(
    `/research-projects/${projectSlug}/roles/${roleId}/${nextState}`,
    "POST",
    undefined,
    OpenRoleSchema,
    options,
  );
}

/** Refused once the role has applications — `409 ROLE_HAS_REFERENCES`. Close it instead. */
export function deleteOpenRole(
  projectSlug: string,
  roleId: string,
  options?: RequestOptions,
): Promise<ActionResponse<OpenRole>> {
  return sendJson(
    `/research-projects/${projectSlug}/roles/${roleId}`,
    "DELETE",
    undefined,
    OpenRoleSchema,
    options,
  );
}

// --- Membership -----------------------------------------------------------------

/**
 * Change a member's role or role title.
 *
 * **THE ENUM IS `maintainer | contributor` AND NOTHING ELSE.** `founder` is absent because
 * it is written exactly once, by the create transaction — a project cannot gain a second
 * founder or transfer the first. `admin` is absent because its purpose is co-signing, and
 * pre-seeding admins before that flow exists is risk bought for nothing. A dropdown here
 * must offer two options, not four.
 */
export function updateProjectMember(
  projectSlug: string,
  memberId: string,
  input: {
    readonly projectRole?: "maintainer" | "contributor";
    readonly roleTitle?: string | null;
  },
  options?: RequestOptions,
): Promise<ActionResponse<ProjectTeamMember>> {
  return sendJson(
    `/research-projects/${projectSlug}/members/${memberId}`,
    "PATCH",
    input,
    ProjectTeamMemberSchema,
    options,
  );
}

/** Remove someone. Maintainer and above; the founder cannot be removed. */
export function removeProjectMember(
  projectSlug: string,
  memberId: string,
  options?: RequestOptions,
): Promise<ActionResponse<ProjectTeamMember>> {
  return sendJson(
    `/research-projects/${projectSlug}/members/${memberId}`,
    "DELETE",
    undefined,
    ProjectTeamMemberSchema,
    options,
  );
}

/**
 * Leave a project.
 *
 * ITS OWN ROUTE (`/members/me`) rather than `removeProjectMember` with your own id,
 * because the two are different acts with different authorization: anyone may leave,
 * while removing someone else needs maintainer. Declared above `/:memberId` server-side so
 * `me` is never read as an id.
 */
export function leaveProject(
  projectSlug: string,
  options?: RequestOptions,
): Promise<ActionResponse<ProjectTeamMember>> {
  return sendJson(
    `/research-projects/${projectSlug}/members/me`,
    "DELETE",
    undefined,
    ProjectTeamMemberSchema,
    options,
  );
}

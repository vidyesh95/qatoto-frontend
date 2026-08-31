"use client";

// TRANSPORT: client-query — the three seller-side factory profile writes.
//
// NO QUERY IN THIS FILE, and that is the backend's shape rather than an omission: §6.6 lists three
// PUTs and no reads, because a factory's lines, sites and terms are already projected by
// `GET /store/factories/:factorySlug`. The editor prefills from that public read and posts back
// through these three.
//
// ALL THREE INVALIDATE THE PUBLIC DETAIL READ AS WELL AS EACH OTHER, because that read is where
// the seller sees their own change. A form that saved and left the page showing the old figures is
// one the seller submits twice.

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import type { ActionResponse } from "@/lib/http";
import {
  addOrganizationMedia,
  deleteOrganizationMedia,
  listOrganizationCertifications,
  reorderOrganizationMedia,
  replaceFactoryProductionLines,
  replaceFactorySites,
  replaceOrganizationCapabilities,
  replaceOrganizationSiteAccess,
  replaceOrganizationStakeholders,
  submitOrganizationCertification,
  withdrawOrganizationCertification,
  updateFactoryTerms,
  uploadStakeholderPhoto,
  upsertSellerProfile,
} from "@/lib/store/factory-profile.api";
import type {
  FactoryProductionLine,
  FactorySite,
  ReplaceFactorySitesInput,
  ReplaceProductionLinesInput,
  UpdateFactoryTermsInput,
} from "@/lib/store/factories.schemas";
import type {
  CapabilityRowInput,
  OrganizationCapability,
  OrganizationMedia,
  OrganizationSiteAccess,
  OrganizationStakeholder,
  OwnedCertification,
  SellerDeclaredProfile,
  SiteAccessRowInput,
  StakeholderRowInput,
  SubmitCertificationInput,
  UpsertSellerProfileInput,
} from "@/lib/store/organizations.schemas";

export const factoryProfileKeys = {
  all: ["factory-profile"] as const,
  detail: (organizationId: string) => ["factory-profile", organizationId] as const,
  /**
   * The seller's own certification list — the module's ONE authenticated read, and the only thing
   * here that is a query rather than a mutation. Kept under the same root so a submit invalidates
   * both it and the storefront prefill in one sweep.
   */
  certifications: (organizationId: string) =>
    ["factory-profile", organizationId, "certifications"] as const,
};

// --- Seller profile writes (A13) --------------------------------------------
//
// ⚠️ **EVERY MUTATION BELOW NEEDS AN `Idempotency-Key`, AND ITS ABSENCE IS A 400.** The key is minted
// by the component — one per attempt, held across retries, rotated only on a confirmed success — so
// each hook takes it rather than generating one, which would mint a fresh key per retry and defeat
// the mechanism entirely.
//
// ⚠️ **ALL NINE ANSWER THE WHOLE `SellerDeclaredProfile` EXCEPT THE CERTIFICATION SUBMIT**, which
// answers the one certification. So a save writes the server's own profile back rather than the
// caller guessing what changed — which matters most for the two lists that mint fresh row ids on
// every write.
//
// ⚠️ **A 404 HERE MEANS "NOT YOURS, OR NOT YOUR ROLE".** These routes carry no org guard and refuse
// a non-member and an under-privileged member identically, so the status must not be rendered as
// "no such organization".

/**
 * Replaces the WHOLE production-line list.
 *
 * THE BODY IS THE NEW LIST. An omitted row is a deletion and array order is the stored order —
 * there is no per-row route and there should not be one, because a per-row move has to write
 * intermediate positions that violate the server's unique `(organizationId, position)` index
 * mid-transaction.
 */
export function useReplaceFactoryProductionLinesMutation(): UseMutationResult<
  ActionResponse<{ productionLines: FactoryProductionLine[] }>,
  Error,
  { readonly organizationId: string; readonly input: ReplaceProductionLinesInput }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ organizationId, input }) => replaceFactoryProductionLines(organizationId, input),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: factoryProfileKeys.all });
    },
  });
}

/**
 * Replaces the WHOLE site list.
 *
 * These per-site areas may disagree with the organization's own `factoryAreaSquareMetres`, and
 * neither this write nor the read reconciles them. Both are seller-declared; a platform that
 * summed one into the other would assert something neither party said (§16.3).
 */
export function useReplaceFactorySitesMutation(): UseMutationResult<
  ActionResponse<{ sites: FactorySite[] }>,
  Error,
  { readonly organizationId: string; readonly input: ReplaceFactorySitesInput }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ organizationId, input }) => replaceFactorySites(organizationId, input),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: factoryProfileKeys.all });
    },
  });
}

/**
 * Sample policy, order bounds and the inbox switch, in ONE object.
 *
 * A WHOLE-OBJECT PUT because both invariants are cross-field: a sample fee is only meaningful when
 * samples are offered, and an MOQ is only readable beside its unit. The form therefore submits
 * every field it renders, including the ones the seller did not touch.
 */
export function useUpdateFactoryTermsMutation(): UseMutationResult<
  ActionResponse<SellerDeclaredProfile>,
  Error,
  { readonly organizationId: string; readonly input: UpdateFactoryTermsInput }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ organizationId, input }) => updateFactoryTerms(organizationId, input),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: factoryProfileKeys.all });
    },
  });
}

/**
 * One invalidation, MANY result shapes.
 *
 * ⚠️ **THE NINE WRITES DO NOT ANSWER THE SAME THING, AND ASSUMING THEY DID WAS A REAL BUG** — caught
 * against the running backend rather than by reading. Only the scalar PATCH answers the whole
 * profile; the list replacements answer `{ rows }`, reorder answers `{ media }`, the two single-row
 * writes answer ONE row, and the delete answers `{ deleted: true }`. Parsing the wrong one is not a
 * soft failure: the schema is `.strip()` over required keys, so a mismatch surfaces as a refused
 * write that never happened.
 */
type ProfileMutation<TData, TVariables> = UseMutationResult<
  ActionResponse<TData>,
  Error,
  TVariables
>;

function useProfileInvalidator() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: factoryProfileKeys.all });
  };
}

/** `PATCH …/seller-profile`. Sparse: an omitted key is untouched, an explicit null clears. */
export function useUpsertSellerProfileMutation(): ProfileMutation<
  SellerDeclaredProfile,
  {
    readonly organizationId: string;
    readonly input: UpsertSellerProfileInput;
    readonly idempotencyKey: string;
  }
> {
  const invalidateProfile = useProfileInvalidator();
  return useMutation({
    mutationFn: ({ organizationId, input, idempotencyKey }) =>
      upsertSellerProfile(organizationId, input, {
        headers: { "Idempotency-Key": idempotencyKey },
      }),
    onSuccess: (result) => {
      if (!result.success) return;
      invalidateProfile();
    },
  });
}

/**
 * `PUT …/site-access`. ⚠️ An omitted row is DESTROYED and the survivors get NEW ids, so the caller
 * must send every row it is keeping and must re-read afterwards rather than trusting its own copy.
 */
export function useReplaceOrganizationSiteAccessMutation(): ProfileMutation<
  { rows: OrganizationSiteAccess[] },
  {
    readonly organizationId: string;
    readonly rows: readonly SiteAccessRowInput[];
    readonly idempotencyKey: string;
  }
> {
  const invalidateProfile = useProfileInvalidator();
  return useMutation({
    mutationFn: ({ organizationId, rows, idempotencyKey }) =>
      replaceOrganizationSiteAccess(organizationId, rows, {
        headers: { "Idempotency-Key": idempotencyKey },
      }),
    onSuccess: (result) => {
      if (!result.success) return;
      invalidateProfile();
    },
  });
}

/**
 * `PUT …/stakeholders`. ⚠️ Identity-preserving: echo each kept row's `id` or its portrait is
 * orphaned, and DEDUPE — a repeated id collapses two rows into one, silently.
 */
export function useReplaceOrganizationStakeholdersMutation(): ProfileMutation<
  { rows: OrganizationStakeholder[] },
  {
    readonly organizationId: string;
    readonly rows: readonly StakeholderRowInput[];
    readonly idempotencyKey: string;
  }
> {
  const invalidateProfile = useProfileInvalidator();
  return useMutation({
    mutationFn: ({ organizationId, rows, idempotencyKey }) =>
      replaceOrganizationStakeholders(organizationId, rows, {
        headers: { "Idempotency-Key": idempotencyKey },
      }),
    onSuccess: (result) => {
      if (!result.success) return;
      invalidateProfile();
    },
  });
}

/** `POST …/stakeholders/:id/photo`. The row must exist first — save the list before uploading. */
export function useUploadStakeholderPhotoMutation(): ProfileMutation<
  OrganizationStakeholder,
  {
    readonly organizationId: string;
    readonly stakeholderId: string;
    readonly photoFile: File;
    readonly idempotencyKey: string;
  }
> {
  const invalidateProfile = useProfileInvalidator();
  return useMutation({
    mutationFn: ({ organizationId, stakeholderId, photoFile, idempotencyKey }) =>
      uploadStakeholderPhoto(organizationId, stakeholderId, photoFile, {
        headers: { "Idempotency-Key": idempotencyKey },
      }),
    onSuccess: (result) => {
      if (!result.success) return;
      invalidateProfile();
    },
  });
}

/** `PUT …/capabilities`. ⚠️ A kind may appear once; a repeat is a 409 rather than a dedupe. */
export function useReplaceOrganizationCapabilitiesMutation(): ProfileMutation<
  { rows: OrganizationCapability[] },
  {
    readonly organizationId: string;
    readonly rows: readonly CapabilityRowInput[];
    readonly idempotencyKey: string;
  }
> {
  const invalidateProfile = useProfileInvalidator();
  return useMutation({
    mutationFn: ({ organizationId, rows, idempotencyKey }) =>
      replaceOrganizationCapabilities(organizationId, rows, {
        headers: { "Idempotency-Key": idempotencyKey },
      }),
    onSuccess: (result) => {
      if (!result.success) return;
      invalidateProfile();
    },
  });
}

/** `POST …/media`. 201, not 202 — there is no scan here and no copy may imply one. */
export function useAddOrganizationMediaMutation(): ProfileMutation<
  OrganizationMedia,
  {
    readonly organizationId: string;
    readonly imageFile: File;
    readonly mediaKind: string;
    readonly altText: string | undefined;
    readonly idempotencyKey: string;
  }
> {
  const invalidateProfile = useProfileInvalidator();
  return useMutation({
    mutationFn: ({ organizationId, imageFile, mediaKind, altText, idempotencyKey }) =>
      addOrganizationMedia(organizationId, imageFile, mediaKind, altText, {
        headers: { "Idempotency-Key": idempotencyKey },
      }),
    onSuccess: (result) => {
      if (!result.success) return;
      invalidateProfile();
    },
  });
}

/** `PATCH …/media/reorder`. ⚠️ Must cover every current image exactly once, or 409. */
export function useReorderOrganizationMediaMutation(): ProfileMutation<
  { media: OrganizationMedia[] },
  {
    readonly organizationId: string;
    readonly mediaIdsInOrder: readonly string[];
    readonly idempotencyKey: string;
  }
> {
  const invalidateProfile = useProfileInvalidator();
  return useMutation({
    mutationFn: ({ organizationId, mediaIdsInOrder, idempotencyKey }) =>
      reorderOrganizationMedia(
        organizationId,
        { mediaIdsInOrder },
        { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    onSuccess: (result) => {
      if (!result.success) return;
      invalidateProfile();
    },
  });
}

/** `DELETE …/media/:mediaId`. */
export function useDeleteOrganizationMediaMutation(): ProfileMutation<
  { deleted: true },
  {
    readonly organizationId: string;
    readonly mediaId: string;
    readonly idempotencyKey: string;
  }
> {
  const invalidateProfile = useProfileInvalidator();
  return useMutation({
    mutationFn: ({ organizationId, mediaId, idempotencyKey }) =>
      deleteOrganizationMedia(organizationId, mediaId, {
        headers: { "Idempotency-Key": idempotencyKey },
      }),
    onSuccess: (result) => {
      if (!result.success) return;
      invalidateProfile();
    },
  });
}

/**
 * `GET …/certifications` — the seller's own list, every state.
 *
 * THE ONE QUERY IN THIS FILE. It exists because the public read carries only approved, unexpired
 * rows: a seller who has just submitted needs to see `pending`, and a seller who was refused needs
 * `decisionReason`. Neither reaches the storefront projection.
 */
export function useOrganizationCertificationsQuery(organizationId: string) {
  return useQuery<ActionResponse<OwnedCertification[]>>({
    queryKey: factoryProfileKeys.certifications(organizationId),
    queryFn: () => listOrganizationCertifications(organizationId),
    enabled: organizationId.length > 0,
    // A 401, 403 or 404 is an answer, not a flake. Retrying one only delays the explanation.
    retry: false,
  });
}

/**
 * `POST …/certifications` — the claim and its evidence in one multipart request.
 *
 * ⚠️ **201, AND TWO INDEPENDENT LIFECYCLES START.** The certification lands `pending` for a moderator
 * while its evidence lands `pending_scan` for a scanner, and **promotion is not approval**. No copy
 * on this surface may suggest a review happened because a file finished scanning.
 */
export function useSubmitOrganizationCertificationMutation(): UseMutationResult<
  ActionResponse<OwnedCertification>,
  Error,
  {
    readonly organizationId: string;
    readonly evidenceFile: File;
    readonly input: SubmitCertificationInput;
    readonly idempotencyKey: string;
  }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ organizationId, evidenceFile, input, idempotencyKey }) =>
      submitOrganizationCertification(organizationId, evidenceFile, input, {
        headers: { "Idempotency-Key": idempotencyKey },
      }),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: factoryProfileKeys.all });
    },
  });
}

/**
 * `POST …/certifications/:certificationId/withdraw` — the seller retracts its own claim.
 *
 * NOT OPTIMISTIC AND NOT A DELETE. The row stays in the list with `state: "withdrawn"` once the
 * response says so; nothing is removed locally first, because a withdrawal that failed while the
 * UI showed it gone is a seller who believes a claim was retracted when it is still published.
 *
 * A **409** here is a finding, not a retry — the row is already withdrawn, or was rejected and has
 * nothing to retract. Surface the backend's own sentence.
 */
export function useWithdrawOrganizationCertificationMutation(): UseMutationResult<
  ActionResponse<OwnedCertification>,
  Error,
  {
    readonly organizationId: string;
    readonly certificationId: string;
    readonly idempotencyKey: string;
  }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ organizationId, certificationId, idempotencyKey }) =>
      withdrawOrganizationCertification(organizationId, certificationId, {
        headers: { "Idempotency-Key": idempotencyKey },
      }),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: factoryProfileKeys.all });
    },
  });
}

"use client";

// TRANSPORT: client-query — React Query over `GET /commerce/organizations/mine` and
// `PATCH /commerce/organizations/:organizationId`.
//
// ONE CACHE ENTRY, TWO SHAPES. `useViewerOrganizationsQuery` in `./orders` wants ids and the
// checkout wants the whole projection, and both come from the same route. They therefore share
// `storeKeys.viewerOrganizations()` and differ only by `select`, which React Query applies to the
// cached value without refetching. Giving each its own key would issue two identical requests on
// every order page and let one go stale while the other did not — and the two disagreeing about
// which organizations the caller belongs to is exactly the bug the shared key removes.
//
// THE `select` FUNCTIONS ARE MODULE-LEVEL CONSTANTS, not inline arrows. An inline `select` is a new
// function identity on every render, which makes React Query recompute the projection each time; at
// module scope it is stable and the memoised result survives.

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import { storeKeys } from "@/hooks/store/keys";
import type { ActionResponse } from "@/lib/http";
import {
  listMyCommerceOrganizations,
  updateCommerceOrganization,
} from "@/lib/store/organizations.api";
import {
  deriveBuyerWorkspaceReadiness,
  type BuyerWorkspaceReadiness,
  type MyCommerceOrganization,
  type MyCommerceOrganizationMembership,
  type UpdateCommerceOrganizationInput,
} from "@/lib/store/organizations.schemas";

/**
 * How long a membership list stays fresh.
 *
 * Five minutes because membership changes are rare and a staff decision — refetching on every
 * navigation would be a request per page for data that does not move. It is deliberately the same
 * figure `useViewerOrganizationsQuery` already used, since both now read one entry: a shorter
 * `staleTime` on either would refetch the other's data out from under it.
 */
const MEMBERSHIP_STALE_TIME_MS = 5 * 60 * 1000;

function selectReadiness(
  result: ActionResponse<MyCommerceOrganizationMembership[]>,
): BuyerWorkspaceReadiness {
  // A FAILED READ IS `unknown`, NEVER `none`. They render differently and only one of them is
  // honest here: `none` says "you belong to no organization", which a 401 or a dropped connection
  // is no evidence for at all. Telling a buyer with a live workspace that they have none — and
  // offering them a form to create what already exists — is the failure this branch exists to
  // prevent.
  if (!result.success) return { status: "unknown" };
  return deriveBuyerWorkspaceReadiness(result.data);
}

// THERE IS NO `useMyCommerceOrganizationsQuery` HERE, and its absence is deliberate. A hook
// returning the raw membership list had no caller — both consumers want a projection of it, one to
// ids and one to readiness — and an uncalled hook is unverified code, which is what this repo's
// audit loop exists to catch. Add it when something needs the whole rows, and give it the same
// `queryFn` and `staleTime` as the two below or they will fight over the shared entry.

/**
 * Whether the caller's buyer workspace can confirm a checkout, and what to say if it cannot.
 *
 * `retry: false` because the answers this needs to distinguish are all answers. A `401` means
 * signed out and a retry cannot change that; anything else this read returns is data.
 */
export function useBuyerWorkspaceReadinessQuery() {
  return useQuery({
    queryKey: storeKeys.viewerOrganizations(),
    queryFn: () => listMyCommerceOrganizations(),
    select: selectReadiness,
    staleTime: MEMBERSHIP_STALE_TIME_MS,
    retry: false,
  });
}

/**
 * Edits the caller's own organization.
 *
 * THE ONE CALLER TODAY SENDS `countryCode`, and that is not an ordinary profile edit: it is what
 * moves an auto-provisioned shell from "the server made this for you" to "somebody is asking for
 * this to be reviewed", and without it `checkout/confirm` answers 403 forever. It does not activate
 * anything — the `pending → active` transition is `moderate_commerce`-gated staff work.
 *
 * NOTHING OPTIMISTIC, and the server's row is written straight into the cache rather than
 * refetched. `PATCH` returns the updated organization, so `setQueryData` over the membership list
 * is exact; an `invalidateQueries` would throw that answer away and ask again. The membership half
 * of each row is untouched by this write and is carried through unchanged.
 *
 * If the organization is somehow absent from the cached list the write still succeeded, so the
 * fallback is to invalidate and let the read settle it — never to append a row this client
 * assembled.
 */
export function useUpdateCommerceOrganization(): UseMutationResult<
  ActionResponse<MyCommerceOrganization>,
  Error,
  {
    readonly organizationId: string;
    readonly input: UpdateCommerceOrganizationInput;
    readonly idempotencyKey: string;
  }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ organizationId, input, idempotencyKey }) =>
      // `idempotency({ required: true })` sits in front of this route, so a call without the header
      // is refused with a **400** before the service is reached — a different branch from every
      // body refusal here, which are 422s. The key is minted once per attempt in the component.
      updateCommerceOrganization(organizationId, input, {
        headers: { "Idempotency-Key": idempotencyKey },
      }),
    onSuccess: (result, { organizationId }) => {
      if (!result.success) return;
      const updated = result.data;

      const cached = queryClient.getQueryData<ActionResponse<MyCommerceOrganizationMembership[]>>(
        storeKeys.viewerOrganizations(),
      );

      if (
        cached === undefined ||
        !cached.success ||
        !cached.data.some((row) => row.organization.id === organizationId)
      ) {
        void queryClient.invalidateQueries({ queryKey: storeKeys.viewerOrganizations() });
        return;
      }

      const next: ActionResponse<MyCommerceOrganizationMembership[]> = {
        success: true,
        data: cached.data.map((row) =>
          row.organization.id === organizationId ? { ...row, organization: updated } : row,
        ),
      };
      queryClient.setQueryData(storeKeys.viewerOrganizations(), next);
    },
  });
}

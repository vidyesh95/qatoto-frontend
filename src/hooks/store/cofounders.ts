"use client";

// TRANSPORT: client-query — the one mutation on the cofounder surface.
//
// The directory and the profile detail are public server fetches and are deliberately not here —
// same call as `hooks/store/providers.ts`, `factories.ts` and `forum.ts`.

import { useMutation, type UseMutationResult } from "@tanstack/react-query";

import type { ActionResponse } from "@/lib/http";
import { createCofounderProfile } from "@/lib/store/cofounders.api";
import type {
  CreateCofounderProfileInput,
  CreatedCofounderProfile,
} from "@/lib/store/cofounders.schemas";

/**
 * Creates YOUR OWN profile, as a draft.
 *
 * IT INVALIDATES NOTHING. A draft profile appears in no read this frontend has — the public
 * directory returns `published` only, and there is no `/commerce/cofounder-profiles/mine` yet — so
 * there is no cached list to fall out of date. When that read lands, this is the function that gains
 * an `onSuccess`, and its key belongs in `storeKeys` beside the others.
 *
 * The idempotency key is minted by the composer, once per attempt. A fresh key on a retry is a
 * duplicate profile of the same person, which a moderator then has to merge or reject.
 */
export function useCreateCofounderProfile(): UseMutationResult<
  ActionResponse<CreatedCofounderProfile>,
  Error,
  { readonly input: CreateCofounderProfileInput; readonly idempotencyKey: string }
> {
  return useMutation({
    mutationFn: ({ input, idempotencyKey }) =>
      createCofounderProfile(input, { headers: { "Idempotency-Key": idempotencyKey } }),
  });
}

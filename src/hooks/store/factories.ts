"use client";

// TRANSPORT: client-query — the one mutation on the factory surface.
//
// THE TWO PUBLIC FACTORY READS ARE DELIBERATELY ABSENT, the same call `hooks/store/providers.ts`
// makes. The directory and the detail page are awaited in server components; putting a cacheable
// public read behind React Query would move it into the client bundle for no gain and lose the
// URL-as-state filtering that makes a filtered view shareable.

import { useMutation, type UseMutationResult } from "@tanstack/react-query";

import type { ActionResponse } from "@/lib/http";
import { createFactoryInquiry } from "@/lib/store/factories.api";
import type {
  CreatedFactoryInquiry,
  CreateFactoryInquiryInput,
} from "@/lib/store/factories.schemas";

/**
 * Creates a DRAFT inquiry to one factory.
 *
 * IT INVALIDATES NOTHING, and that is a statement about the surface rather than an omission. A
 * draft inquiry appears in no read this frontend has — there is no `/commerce/factories/inquiries/mine`
 * yet, so there is no cached list for it to fall out of date. When that read lands, this is the
 * function that gains an `onSuccess`, and the key belongs in `storeKeys` beside the others.
 *
 * The idempotency key is minted by the composer, once per attempt. A fresh key on a retry is a
 * second inquiry the factory then has to work out is a duplicate.
 */
export function useCreateFactoryInquiry(): UseMutationResult<
  ActionResponse<CreatedFactoryInquiry>,
  Error,
  {
    readonly factorySlug: string;
    readonly input: CreateFactoryInquiryInput;
    readonly idempotencyKey: string;
  }
> {
  return useMutation({
    mutationFn: ({ factorySlug, input, idempotencyKey }) =>
      createFactoryInquiry(factorySlug, input, {
        headers: { "Idempotency-Key": idempotencyKey },
      }),
  });
}

// TRANSPORT: client-query — React Query over `@/lib/rnd/platform-audit.api`.
"use client";

import { useQuery } from "@tanstack/react-query";

import { rndKeys } from "@/hooks/rnd/keys";
import { unwrap } from "@/lib/http";
import { listPlatformAuditTrail } from "@/lib/rnd/platform-audit.api";

/**
 * One slice of the platform decision log.
 *
 * IT IS NO LONGER A STAFF PROBE. It was, before `GET /admin/whoami` existed — a page would
 * infer "this viewer is staff" from this read answering 200, which tested `moderate_content`
 * whether or not that was the capability the page needed. Ask `useOwnStaffContextQuery` for
 * permissions; this read is only about the log.
 *
 * A `403` here therefore means exactly one thing: the viewer cannot read the moderation log,
 * which `auditor` cannot. It implies nothing about what else they may do.
 *
 * `retry: false` because a `403` is an answer, not a flake.
 */
export function usePlatformAuditTrailQuery(filter: {
  readonly eventKind?: string;
  readonly limit?: number;
}) {
  return useQuery({
    queryKey: rndKeys.platformAuditTrail(filter.eventKind),
    queryFn: async () =>
      unwrap(
        await listPlatformAuditTrail({
          ...(filter.eventKind === undefined ? {} : { eventKind: filter.eventKind }),
          ...(filter.limit === undefined ? {} : { limit: filter.limit }),
        }),
      ),
    retry: false,
  });
}

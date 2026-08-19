"use client";

// TRANSPORT: client-query — seeded with the first page proof-of-effort-page already read on
// the server, then advances GET …/audit-trail by `?fromSequence=` through `useKeysetList`.

import { useState } from "react";

import AuditHashInputInspector from "@/components/home/research-and-development/sections/audit-hash-input-inspector";
import LoadMoreControl from "@/components/home/shared/load-more-control";
import { rndKeys } from "@/hooks/rnd/keys";
import { toSequenceKeysetPage, useKeysetList } from "@/hooks/keyset-list";
import { formatIsoInstant, shortenHashForDisplay } from "@/lib/rnd/format";
import { listAuditTrail } from "@/lib/rnd/proof-of-effort.api";
import type { AuditEntry } from "@/lib/rnd/proof-of-effort.schemas";

/** Matches `AUDIT_PAGE_LIMIT` on the server page, so pages stay a uniform size. */
const AUDIT_PAGE_LIMIT = 50;

/**
 * The chain, ordered by `sequenceNumber` ASC, with the rest of it reachable.
 *
 * IT MUST PAGE: the chain grows without bound and a single unbounded read of it is a
 * timeout waiting to happen. `?fromSequence=` is a `>=` range filter on a sequence that is
 * gapless and monotonic by construction, which makes it a better cursor than any timestamp —
 * two entries can share a millisecond, and an entry skipped here is a decision nobody can
 * see was taken.
 *
 * THE SHORT HASH IS A RENDERING, exactly as in the tab that used to own this markup.
 * Nothing keys off it: a 24-bit prefix collides around 4,800 entries, and the full 64
 * characters are what the hash-input endpoint checks.
 *
 * AND IT IS NOW CHECKABLE. Each entry expands into `AuditHashInputInspector`, which fetches
 * the exact bytes that were hashed and recomputes the digest IN THE BROWSER. The point is
 * not to show the reader a longer hash — it is that they never have to take the server's
 * word for the chain, which is the whole reason the hash-input endpoint exists.
 */
export default function AuditTrailEntriesIsland({
  projectSlug,
  initialEntries,
  initialNextSequence,
}: {
  projectSlug: string;
  initialEntries: AuditEntry[];
  initialNextSequence: number | null;
}) {
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);

  const entryList = useKeysetList<AuditEntry>({
    queryKey: rndKeys.auditTrail(projectSlug),
    initialPage: { rows: initialEntries, nextToken: initialNextSequence },
    // The `typeof` guard states which token kind this read uses rather than asserting it:
    // `toSequenceKeysetPage` only ever produces a number, so a string cannot arrive here.
    fetchPage: (token) =>
      listAuditTrail(projectSlug, {
        limit: AUDIT_PAGE_LIMIT,
        ...(typeof token === "number" ? { fromSequence: token } : {}),
      }).then(toSequenceKeysetPage),
  });

  return (
    <div className="space-y-2">
      <ol className="space-y-2">
        {entryList.rows.map((entry) => (
          <li key={entry.id} className="rounded-2xl border border-[#CAC4D0]/60 p-3 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-medium">
                #{entry.sequenceNumber} · {entry.actionLabel}
              </p>
              <p className="text-xs text-muted-foreground">{formatIsoInstant(entry.occurredAt)}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              {entry.actorDisplayName ?? entry.actorNameSnapshot} ({entry.actorRoleSnapshot}) →{" "}
              {entry.targetLabel}
            </p>
            {entry.detailNote.length > 0 && <p className="mt-1 text-xs">{entry.detailNote}</p>}
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">
              {shortenHashForDisplay(entry.entryHash)}
              {entry.previousEntryHash !== null &&
                ` ← ${shortenHashForDisplay(entry.previousEntryHash)}`}
            </p>
            <button
              type="button"
              onClick={() => setExpandedEntryId(expandedEntryId === entry.id ? null : entry.id)}
              className="mt-1 cursor-pointer text-xs font-medium text-[#00696E] underline"
            >
              {expandedEntryId === entry.id ? "Hide the proof" : "Check this hash yourself"}
            </button>
            <AuditHashInputInspector
              projectSlug={projectSlug}
              entryId={entry.id}
              isExpanded={expandedEntryId === entry.id}
            />
          </li>
        ))}
      </ol>
      <LoadMoreControl
        hasNextPage={entryList.hasNextPage}
        isFetchingNextPage={entryList.isFetchingNextPage}
        errorMessage={entryList.loadMoreErrorMessage}
        onLoadNextPage={entryList.loadNextPage}
        label="Load later entries"
      />
    </div>
  );
}

"use client";

// TRANSPORT: client-query — reads `GET /commerce/pathways/mine`.
//
// THE AUTHOR'S OWN SETS, and the only read that returns a draft at all — the public reads serve
// `active` sets only, so without this page a draft is invisible to the person who wrote it.
//
// STATE IS THE CONTENT OF THIS PAGE. Four of the five states mean the set is NOT findable by a
// shopper, and only `active` means it is. A row showing a name without saying which of those
// applied would let an author believe they had published something that is sitting in a queue.

import Link from "next/link";

import StatusPanel from "@/components/home/shared/status-panel";
import { usePathwaysMineQuery } from "@/hooks/store/pathway-authoring";
import { PATHWAY_STATE_LABELS } from "@/lib/store/pathway-authoring.schemas";

export default function MyPathwayList() {
  const pathwaysQuery = usePathwaysMineQuery();

  if (pathwaysQuery.isPending) {
    return <p className="text-sm text-muted-foreground">Loading your sets…</p>;
  }
  if (pathwaysQuery.data === undefined || pathwaysQuery.isError) {
    return <StatusPanel message="Couldn't load your sets. Please try again." />;
  }
  // The server's own sentence: a 403 for a caller with no organization reads differently from an
  // empty list, and collapsing the two would hide the reason.
  if (!pathwaysQuery.data.success) {
    return <StatusPanel message={pathwaysQuery.data.error.message} />;
  }

  const pathways = pathwaysQuery.data.data.items;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Sets</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            A set is a shopping list somebody else can follow — a piece for each thing they need,
            and the products that can fill it.
          </p>
        </div>
        <Link
          href="/studio/pathways/create"
          className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Start a set
        </Link>
      </header>

      {pathways.length === 0 ? (
        <p className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          You have not made a set yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {pathways.map((pathway) => (
            <li
              key={pathway.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border p-4"
            >
              <div>
                <p className="text-sm font-medium">{pathway.title}</p>
                <p className="text-xs text-muted-foreground">
                  {PATHWAY_STATE_LABELS[pathway.state]} · {pathway.slots.length} piece
                  {pathway.slots.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/*
                  A PUBLIC LINK ONLY WHEN `active`. A draft's public URL is a 404 by design, so
                  offering it would look like a broken page rather than an unpublished one.
                */}
                {pathway.state === "active" && (
                  <Link
                    href={`/store/pathways/${pathway.slug}`}
                    className="text-xs font-medium text-[#2A76FD]"
                  >
                    View it live
                  </Link>
                )}
                <Link
                  href={`/studio/pathways/create?pathwayId=${encodeURIComponent(pathway.id)}`}
                  className="cursor-pointer rounded-full bg-background px-3 py-1.5 text-xs font-medium outline -outline-offset-1 outline-border"
                >
                  {pathway.state === "active" ? "Open" : "Edit"}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

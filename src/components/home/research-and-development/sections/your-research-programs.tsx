// TRANSPORT: client-query — reads GET /research-programs/mine.
"use client";

import Link from "next/link";

import { useOwnResearchProgramsQuery } from "@/hooks/rnd/research-programs";
import { formatIsoInstant } from "@/lib/rnd/format";

const STATUS_COPY: Record<string, string> = {
  pending: "Awaiting review — not listed publicly yet",
  published: "Published",
  rejected: "Not published",
  archived: "Archived",
};

/**
 * A signed-in visitor's own programme submissions, at ANY status.
 *
 * THIS IS THE ONLY PLACE A `pending` PROGRAMME IS VISIBLE, and that is the point: it is absent
 * from the public index by design, so without this list somebody who proposed one would have no
 * way to see what happened to it. The status line says what is actually true rather than
 * softening it — "awaiting review, not listed publicly yet" is the honest description of a row
 * that exists and cannot be found.
 */
export default function YourResearchPrograms() {
  const programsQuery = useOwnResearchProgramsQuery();

  if (programsQuery.isPending) {
    return <p className="px-4 text-sm text-muted-foreground lg:px-6">Loading your submissions…</p>;
  }

  if (programsQuery.isError || !programsQuery.data) {
    return (
      <p className="px-4 text-sm text-muted-foreground lg:px-6">
        Couldn&apos;t load your submissions.
      </p>
    );
  }

  if (programsQuery.data.length === 0) {
    return (
      <p className="px-4 text-sm text-muted-foreground lg:px-6">
        You have not proposed a programme yet.
      </p>
    );
  }

  return (
    <ul className="space-y-3 px-4 lg:px-6">
      {programsQuery.data.map((program) => (
        <li
          key={program.programId}
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#CAC4D0]/60 bg-card p-4"
        >
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium">{program.title}</p>
            <p className="text-xs text-muted-foreground">
              {STATUS_COPY[program.status] ?? program.status} · created{" "}
              {formatIsoInstant(program.createdAt)}
            </p>
          </div>
          {/*
            Linked even while pending: its creator CAN read it (the backend's visibility rule), and
            the detail page is where the reviewer's note appears once there is one.
          */}
          <Link
            href={`/research-and-development/programs/${program.slug}`}
            className="shrink-0 rounded-full border border-[#00696E] px-3 py-1.5 text-xs font-medium text-[#00696E] transition-colors hover:bg-[#00696E]/10"
          >
            Open
          </Link>
        </li>
      ))}
    </ul>
  );
}

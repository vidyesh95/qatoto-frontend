// TRANSPORT: client-query — `GET /funding-rounds/mine`.
"use client";

import Link from "next/link";
import { useState } from "react";

import StatusPanel from "@/components/home/shared/status-panel";
import { useMyFoundedFundingRoundsQuery } from "@/hooks/rnd/funding";
import { formatMoneyFromCents } from "@/lib/rnd/format";
import type { MyFoundedFundingRound } from "@/lib/rnd/funding.schemas";

/**
 * Every round you are raising, across every venture you founded.
 *
 * WHY THIS PAGE EXISTS, and it is the gap its own placeholder named for months: funding rounds
 * belong to a PROJECT. `GET /research-projects/:slug/funding-rounds` is per project and
 * `/pledges/mine` is backer-side, so a founder with three ventures raising at once had to open
 * three project pages to answer "how are my raises going". `GET /funding-rounds/mine` is the read
 * that did not exist; this is the only thing that calls it.
 *
 * ⚠️ IT READS AND DOES NOT WRITE, DELIBERATELY. Open, close, edit and milestones all live on the
 * project's own funding tab, gated by that project's membership, and every one of them is already
 * wired. Duplicating them here would be a second set of controls over one set of columns — two
 * places to fix a bug, and two chances for the money copy to drift. Each row links through instead.
 *
 * ⚠️ NO COPY ON THIS PAGE MAY SAY COLLECTED, PAID, HELD OR ESCROWED. `raisedAmountInCents` is the
 * sum of COMMITTED pledges. Qatoto holds no funds and charges nobody in this domain — escrow left
 * this codebase — so "raised" here means "promised", and the sentence under the heading is what
 * keeps that honest rather than a tooltip somebody can miss.
 */
export default function StudioFundingPage() {
  const [page, setPage] = useState(1);
  const roundsQuery = useMyFoundedFundingRoundsQuery(page);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-foreground">Funding</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Every round across every venture you founded. Amounts are <strong>committed pledges</strong>
        , not money received — Qatoto holds no funds and charges nothing here.
      </p>

      {renderRounds()}
    </div>
  );

  function renderRounds() {
    if (roundsQuery.isPending) {
      return <p className="mt-6 text-sm text-muted-foreground">Loading…</p>;
    }

    if (roundsQuery.error !== null) {
      return (
        <div className="mt-6">
          <StatusPanel message="Couldn't load your funding rounds. Please try again." />
        </div>
      );
    }

    // AN EMPTY LIST IS NOT AN ERROR, and the copy distinguishes the two reasons a founder can be
    // here with nothing: they founded no venture, or they founded one and have not opened a round.
    // Both are answered by the same next step, which is why they share a sentence rather than
    // guessing which one applies.
    if (roundsQuery.data.length === 0) {
      return (
        <div className="mt-6 rounded-2xl border border-border p-6">
          <p className="text-sm text-foreground">You have no funding rounds yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            A round belongs to a venture. Open one from that project&apos;s funding tab and it
            appears here.
          </p>
          <Link
            href="/research-and-development"
            className="mt-3 inline-block text-sm text-foreground underline"
          >
            Research and Development
          </Link>
        </div>
      );
    }

    return (
      <>
        <ul className="mt-6 space-y-3">
          {roundsQuery.data.map((round) => (
            <li key={round.id}>
              <FundingRoundCard round={round} />
            </li>
          ))}
        </ul>

        {/*
          NO TOTAL PAGE COUNT, unlike `/studio/analytics` beside it, and that is the read's shape
          rather than an omission: this route pages by offset and returns rows, not a count. Next
          is offered while a full page came back, which can show one empty page at an exact
          multiple — a cheaper wrong than a COUNT over every round a founder has ever opened.
        */}
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => {
              setPage((current) => current - 1);
            }}
            className="cursor-pointer rounded-full border border-border px-3 py-1.5 text-xs disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs text-muted-foreground">Page {page}</span>
          <button
            type="button"
            disabled={roundsQuery.data.length < ROUNDS_PER_PAGE}
            onClick={() => {
              setPage((current) => current + 1);
            }}
            className="cursor-pointer rounded-full border border-border px-3 py-1.5 text-xs disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </>
    );
  }
}

/** The backend's own default page size. A smaller number here would hide a page of rounds. */
const ROUNDS_PER_PAGE = 25;

const ROUND_STATUS_LABELS: Record<MyFoundedFundingRound["status"], string> = {
  draft: "Draft",
  open: "Open",
  closed: "Closed",
  cancelled: "Cancelled",
};

const ROUND_TYPE_LABELS: Record<MyFoundedFundingRound["type"], string> = {
  crowdfunding: "Crowdfunding",
  equity: "Equity",
  venture: "Venture",
};

function FundingRoundCard({ round }: { readonly round: MyFoundedFundingRound }) {
  // BIGINT, NOT NUMBER. These arrive as decimal strings because a goal past 2^53 loses precision
  // the moment JSON touches it — parsing them back through `Number` here would undo the reason
  // they are strings on the wire at all.
  const raisedInCents = BigInt(round.raisedAmountInCents);
  const goalInCents = BigInt(round.goalAmountInCents);

  // CLAMPED FOR THE BAR ONLY. The percentage below is printed unclamped because an over-funded
  // round is a real state and 140% is the interesting fact; a bar wider than its track is not.
  const filledPercent = Math.min(round.percentageFundedBasisPoints / 100, 100);

  return (
    <div className="rounded-2xl border border-border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{round.title}</p>
          {/*
            THE VENTURE'S NAME, NOT ITS SLUG. On a cross-project list a row is meaningless without
            saying which venture it belongs to, and a slug is a URL rather than a label.
          */}
          <p className="text-xs text-muted-foreground">{round.projectName}</p>
        </div>
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
          {ROUND_STATUS_LABELS[round.status]} · {ROUND_TYPE_LABELS[round.type]}
        </span>
      </div>

      <div className="mt-3">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-foreground"
            style={{ width: `${filledPercent}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          <strong className="text-foreground">
            {formatMoneyFromCents(raisedInCents, round.currency)}
          </strong>{" "}
          committed of {formatMoneyFromCents(goalInCents, round.currency)} ·{" "}
          {(round.percentageFundedBasisPoints / 100).toFixed(0)}% ·{" "}
          {round.backersCount.toLocaleString("en-US")}{" "}
          {round.backersCount === 1 ? "backer" : "backers"}
        </p>
      </div>

      {/*
        `projectSlug` IS NULLABLE ON THE WIRE, so the link is conditional rather than assumed. It
        is non-null for every row this route can return — the read inner-joins the project — but
        the schema admits null and fabricating a href from a null would produce `/project/null`.
      */}
      {round.projectSlug !== null && (
        <Link
          href={`/research-and-development/project/${round.projectSlug}?tab=funding`}
          className="mt-3 inline-block text-xs text-foreground underline"
        >
          Manage this round
        </Link>
      )}
    </div>
  );
}

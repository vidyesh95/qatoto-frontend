// TRANSPORT: props-only — presentational server component. Fetches nothing; deals arrive
// as props from funding-page, which read GET /funding/deals.
import Image from "next/image";
import Link from "next/link";

import BackProjectSheet from "@/components/home/research-and-development/sheets/back-project-sheet";
import { formatIsoInstant, formatMoneyFromCents } from "@/lib/rnd/format";
import type { FundingDeal, FundingRoundType } from "@/lib/rnd/funding.schemas";
import { PROJECT_STAGE_LABELS } from "@/lib/rnd/labels";

const FUNDING_ROUND_TYPE_LABELS: Record<FundingRoundType, string> = {
  equity: "Equity",
  crowdfunding: "Crowdfunding",
  venture: "Venture",
};

const FALLBACK_COVER_IMAGE_SRC = "/dummy/rnd_project_cover_01.avif";

const BASIS_POINTS_TOTAL = 10_000;

/**
 * Deal tile for the investor `/funding` view: cover linking to the project, round badge,
 * raise progress, and the closing date.
 *
 * MONEY ARRIVES AS A DECIMAL STRING and is parsed with `BigInt`, never `Number` — these
 * are `bigint` columns and a goal past 2^53 loses precision the moment `JSON.parse` makes
 * it a float.
 *
 * "COMMITTED", NOT "RAISED". `raisedAmountInCents` is the sum of committed pledges: no card
 * is charged and no funds are held, so no copy here may imply a payment rail, a hold, a
 * charge or a fee. A pledge is a commitment.
 *
 * The progress BAR is clamped to 100% because a div cannot be 140% wide, but the LABEL is
 * not — `percentageFundedBasisPoints` is computed on read and may legitimately exceed
 * 10000, and hiding an over-funded round would misreport it.
 *
 * NO CONFIDENCE METER. `GET /funding/deals` does not carry one, and
 * `…/investor-confidence` is a per-project read that 404s when never computed. The old
 * card defaulted a missing signal to `50`, which published a fabricated finding about the
 * project; a per-card request would also be an N+1 across the grid.
 */
export default function FundingDealCard({ deal }: { deal: FundingDeal }) {
  const percentageFunded = (deal.percentageFundedBasisPoints / BASIS_POINTS_TOTAL) * 100;
  const projectHref =
    deal.projectSlug === null
      ? "/research-and-development"
      : `/research-and-development/project/${deal.projectSlug}`;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#CAC4D0]/60 p-4">
      <Link href={projectHref} className="group -m-1 space-y-2 rounded-xl p-1">
        <div className="relative aspect-video w-full overflow-hidden rounded-xl">
          <Image
            src={FALLBACK_COVER_IMAGE_SRC}
            fill
            sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 90vw"
            alt={deal.projectName}
            className="object-cover transition duration-300 group-hover:scale-105"
          />
          <span className="absolute top-2 left-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-[#191C1C]">
            {PROJECT_STAGE_LABELS[deal.projectStage]}
          </span>
        </div>
        <div>
          <p className="truncate text-sm font-semibold">{deal.projectName}</p>
          <p className="line-clamp-1 text-xs text-muted-foreground">{deal.projectTagline}</p>
        </div>
      </Link>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#D6E3FF] px-2 py-0.5 text-xs font-medium text-[#191C1C]">
            {FUNDING_ROUND_TYPE_LABELS[deal.type]}
          </span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{deal.title}</span>
        </div>
        <p className="text-base font-semibold">
          {formatMoneyFromCents(BigInt(deal.raisedAmountInCents), deal.currency)}{" "}
          <span className="text-xs font-normal text-muted-foreground">
            committed of {formatMoneyFromCents(BigInt(deal.goalAmountInCents), deal.currency)} goal
          </span>
        </p>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-[#00696E]"
            style={{ width: `${Math.min(percentageFunded, 100)}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {percentageFunded.toFixed(0)}% · {deal.backersCount} backer
          {deal.backersCount === 1 ? "" : "s"}
          {deal.closesAt !== null && ` · Closes ${formatIsoInstant(deal.closesAt)}`}
        </p>
      </div>
      <div className="mt-auto">
        <BackProjectSheet projectName={deal.projectName} />
      </div>
    </div>
  );
}

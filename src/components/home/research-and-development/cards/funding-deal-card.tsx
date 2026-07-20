import Image from "next/image";
import Link from "next/link";

import BackProjectSheet from "@/components/home/research-and-development/sheets/back-project-sheet";
import { PROJECT_STAGE_LABELS } from "@/mocks/research-and-development-mocks";
import type {
  FundingRound,
  FundingRoundType,
  ProjectStage,
} from "@/types/research-and-development";

// Trimmed, serializable view of a raising project — the deal grid is a client
// island, so full ResearchProjects (daily logs, ledger, …) must not cross the
// server/client boundary as props.
export type FundingDeal = {
  projectId: string;
  projectName: string;
  tagline: string;
  category: string;
  stage: ProjectStage;
  coverImageSrc: string;
  openRound: FundingRound;
  investorConfidencePercent: number;
};

const FUNDING_ROUND_TYPE_LABELS: Record<FundingRoundType, string> = {
  equity: "Equity",
  crowdfunding: "Crowdfunding",
  venture: "Venture",
};

// Deal tile for the investor /funding view: cover linking to the project,
// round badge, raise progress, and the confidence meter. Every figure is a
// display-only mock — funding and confidence math is backend-owned later.
export default function FundingDealCard({ deal }: { deal: FundingDeal }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#CAC4D0]/60 p-4">
      <Link
        href={`/research-and-development/project/${deal.projectId}`}
        className="group -m-1 space-y-2 rounded-xl p-1"
      >
        <div className="relative aspect-video w-full overflow-hidden rounded-xl">
          <Image
            src={deal.coverImageSrc}
            fill
            sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 90vw"
            alt={deal.projectName}
            className="object-cover transition duration-300 group-hover:scale-105"
          />
          <span className="absolute top-2 left-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-[#191C1C]">
            {PROJECT_STAGE_LABELS[deal.stage]}
          </span>
        </div>
        <div>
          <p className="truncate text-sm font-semibold">{deal.projectName}</p>
          <p className="line-clamp-1 text-xs text-muted-foreground">{deal.tagline}</p>
        </div>
      </Link>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#D6E3FF] px-2 py-0.5 text-xs font-medium text-[#191C1C]">
            {FUNDING_ROUND_TYPE_LABELS[deal.openRound.type]}
          </span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{deal.category}</span>
        </div>
        <p className="text-base font-semibold">
          {deal.openRound.raisedAmount}{" "}
          <span className="text-xs font-normal text-muted-foreground">
            raised of {deal.openRound.goalAmount} goal
          </span>
        </p>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-[#00696E]"
            style={{ width: `${deal.openRound.percentageFunded}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {deal.openRound.backersCount} backers · Closes {deal.openRound.closesOnDate}
        </p>
      </div>
      <div className="space-y-1">
        <div className="flex items-baseline justify-between text-xs">
          <span className="font-medium text-muted-foreground">Investor confidence</span>
          <span className="font-semibold text-[#00696E]">
            {deal.investorConfidencePercent} / 100
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-[#00696E]"
            style={{ width: `${deal.investorConfidencePercent}%` }}
          />
        </div>
      </div>
      <div className="mt-auto">
        <BackProjectSheet projectName={deal.projectName} />
      </div>
    </div>
  );
}

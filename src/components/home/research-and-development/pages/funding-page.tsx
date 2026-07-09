import type { FundingDeal } from "@/components/home/research-and-development/cards/funding-deal-card";
import FundingDealFilterGrid from "@/components/home/research-and-development/sections/funding-deal-filter-grid";
import {
  MOCK_INVESTOR_CONFIDENCE_BY_PROJECT_ID,
  MOCK_RESEARCH_PROJECTS,
} from "@/lib/research-and-development-mocks";

// Investor deal-flow composition (§11): every project with an open round,
// trimmed to a serializable deal view before crossing into the client filter
// island. Server component over static mocks.
export default function FundingPage() {
  const openFundingDeals: FundingDeal[] = MOCK_RESEARCH_PROJECTS.flatMap((project) =>
    project.fundingRounds
      .filter((fundingRound) => fundingRound.status === "open")
      .map((openRound) => ({
        projectId: project.id,
        projectName: project.name,
        tagline: project.tagline,
        category: project.category,
        stage: project.stage,
        coverImageSrc: project.coverImageSrc,
        openRound,
        investorConfidencePercent: MOCK_INVESTOR_CONFIDENCE_BY_PROJECT_ID[project.id] ?? 50,
      })),
  );

  return (
    <div className="space-y-8 pb-8">
      <header className="space-y-1 px-4 lg:px-6">
        <h1 className="font-serif text-2xl font-semibold md:text-3xl">Deal Flow</h1>
        <p className="text-sm text-muted-foreground">
          Projects raising right now — every pledge held in milestone-gated escrow.
        </p>
      </header>
      <FundingDealFilterGrid deals={openFundingDeals} />
    </div>
  );
}

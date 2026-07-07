import Image from "next/image";

import BackProjectSheet from "@/components/home/research-and-development/sheets/back-project-sheet";
import type { FundingRoundType, ResearchProject } from "@/types/research-and-development";

const FUNDING_ROUND_TYPE_LABELS: Record<FundingRoundType, string> = {
  equity: "Equity",
  crowdfunding: "Crowdfunding",
  venture: "Venture",
};

const BACKER_AVATAR_IMAGE_SOURCES = [
  "/dummy/profile_image_07.avif",
  "/dummy/profile_image_08.avif",
  "/dummy/profile_image_09.avif",
  "/dummy/profile_image_10.avif",
];

const INVESTOR_CONFIDENCE_PERCENT = 78;

// Funding tab: the open round with its progress and backers, past rounds, and
// the investor confidence meter. Every figure is a display-only mock — funding
// and confidence math is backend-owned later.
export default function FundingTab({ project }: { project: ResearchProject }) {
  const openRound = project.fundingRounds.find((fundingRound) => fundingRound.status === "open");
  const closedRounds = project.fundingRounds.filter(
    (fundingRound) => fundingRound.status === "closed",
  );

  return (
    <div className="space-y-6 px-4 lg:px-6">
      <section className="space-y-3">
        <h3 className="text-sm font-medium tracking-wide xl:text-lg">Current round</h3>
        {openRound ? (
          <div className="space-y-3 rounded-2xl border border-[#CAC4D0]/60 p-4">
            <span className="inline-block rounded-full bg-[#D6E3FF] px-2 py-0.5 text-xs font-medium text-[#191C1C]">
              {FUNDING_ROUND_TYPE_LABELS[openRound.type]}
            </span>
            <p className="text-lg font-semibold">
              {openRound.raisedAmount}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                raised of {openRound.goalAmount} goal
              </span>
            </p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-[#00696E]"
                style={{ width: `${openRound.percentageFunded}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {openRound.backersCount} backers · Closes {openRound.closesOnDate}
            </p>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {BACKER_AVATAR_IMAGE_SOURCES.map((backerAvatarImageSrc) => (
                  <Image
                    key={backerAvatarImageSrc}
                    src={backerAvatarImageSrc}
                    width={28}
                    height={28}
                    alt=""
                    className="size-7 rounded-full object-cover ring-2 ring-background"
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">
                +{Math.max(0, openRound.backersCount - BACKER_AVATAR_IMAGE_SOURCES.length)} backers
              </span>
            </div>
            <BackProjectSheet projectName={project.name} />
          </div>
        ) : (
          <p className="rounded-2xl border border-[#CAC4D0]/60 p-4 text-sm text-muted-foreground">
            No open round right now.
          </p>
        )}
      </section>
      {closedRounds.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-medium tracking-wide xl:text-lg">Past rounds</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Type</th>
                  <th className="py-2 pr-4 font-medium">Goal</th>
                  <th className="py-2 pr-4 font-medium">Raised</th>
                  <th className="py-2 font-medium">Closed</th>
                </tr>
              </thead>
              <tbody>
                {closedRounds.map((closedRound) => (
                  <tr key={closedRound.id} className="border-b border-border/50">
                    <td className="py-2 pr-4">{FUNDING_ROUND_TYPE_LABELS[closedRound.type]}</td>
                    <td className="py-2 pr-4">{closedRound.goalAmount}</td>
                    <td className="py-2 pr-4">{closedRound.raisedAmount}</td>
                    <td className="py-2">{closedRound.closesOnDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <section className="max-w-xl space-y-2">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-medium tracking-wide xl:text-lg">Investor confidence</h3>
          <span className="text-xs font-semibold text-[#00696E]">
            {INVESTOR_CONFIDENCE_PERCENT} / 100
          </span>
        </div>
        <div className="relative h-2 w-full rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-[#00696E]"
            style={{ width: `${INVESTOR_CONFIDENCE_PERCENT}%` }}
          />
          <span
            className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-[#00696E]"
            style={{ left: `${INVESTOR_CONFIDENCE_PERCENT}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Derived from log streak + verified milestones. Computed by Qatoto — display-only mock.
        </p>
      </section>
    </div>
  );
}

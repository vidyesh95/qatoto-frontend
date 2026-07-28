// TRANSPORT: props-only — presentational server component. Fetches nothing; data
// arrives as props. Safe on either side of the boundary.
import Image from "next/image";

import ClaimVerificationCard from "@/components/home/research-and-development/cards/claim-verification-card";
import PhysicalWorkReceiptCard from "@/components/home/research-and-development/cards/physical-work-receipt-card";
import VerificationOverridePanel from "@/components/home/research-and-development/sections/verification-override-panel";
import type {
  ClaimVerificationRun,
  DailyLog,
  PhysicalWorkReceipt,
  TeamMember,
  VerificationOverrideRequest,
} from "@/types/research-and-development";

// Verification Pipeline tab: claim audits over the daily-log feed, physical
// work receipts, and the human-review queue where a member can contest an
// automated verdict and a maintainer decides (§14.1). Verdicts arrive
// precomputed on the mock data — the audit pipeline is backend-owned later.
export default function VerificationPipelineTab({
  claimVerificationRuns,
  physicalWorkReceipts,
  overrideRequests,
  teamMembers,
  dailyLogs,
}: {
  claimVerificationRuns: ClaimVerificationRun[];
  physicalWorkReceipts: PhysicalWorkReceipt[];
  overrideRequests: VerificationOverrideRequest[];
  teamMembers: TeamMember[];
  dailyLogs: DailyLog[];
}) {
  const findTeamMember = (memberId: string) =>
    teamMembers.find((teamMember) => teamMember.id === memberId);

  return (
    <div className="space-y-6 px-4 lg:px-6">
      <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
        <Image
          src="/icons/fact_check_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
          width={16}
          height={16}
          alt=""
          className="mt-0.5 shrink-0"
        />
        The video is a claim — Qatoto audits it against digital receipts before any slice is minted.
        No receipts → 0 slices.
      </p>
      <section className="space-y-3">
        <h3 className="text-sm font-medium tracking-wide xl:text-lg">Claim audits</h3>
        <div className="max-w-2xl space-y-4">
          {claimVerificationRuns.map((claimVerificationRun) => {
            const author = findTeamMember(claimVerificationRun.memberId);
            if (!author) {
              return null;
            }
            const linkedLogDateLabel = claimVerificationRun.dailyLogId
              ? dailyLogs.find((dailyLog) => dailyLog.id === claimVerificationRun.dailyLogId)?.date
              : undefined;
            return (
              <ClaimVerificationCard
                key={claimVerificationRun.id}
                run={claimVerificationRun}
                author={author}
                linkedLogDateLabel={linkedLogDateLabel}
              />
            );
          })}
        </div>
      </section>
      <section className="space-y-3">
        <h3 className="text-sm font-medium tracking-wide xl:text-lg">Physical work receipts</h3>
        <p className="text-xs text-muted-foreground">
          Git is deterministic; sanding a chassis isn&apos;t — non-digital work needs an uploaded
          receipt, audited by image forensics.
        </p>
        <div className="max-w-2xl space-y-3">
          {physicalWorkReceipts.map((physicalWorkReceipt) => {
            const uploader = findTeamMember(physicalWorkReceipt.memberId);
            if (!uploader) {
              return null;
            }
            return (
              <PhysicalWorkReceiptCard
                key={physicalWorkReceipt.id}
                receipt={physicalWorkReceipt}
                uploader={uploader}
              />
            );
          })}
        </div>
      </section>
      <section className="space-y-3">
        <h3 className="text-sm font-medium tracking-wide xl:text-lg">Human review</h3>
        <p className="text-xs text-muted-foreground">
          Any member can ask for a person to re-examine a verdict a machine reached about their
          work, and a maintainer answers in writing. Whichever way it goes, no cash line moves —
          verification gates equity only.
        </p>
        <VerificationOverridePanel
          overrideRequests={overrideRequests}
          claimVerificationRuns={claimVerificationRuns}
          teamMembers={teamMembers}
        />
      </section>
      <p className="text-xs text-muted-foreground">
        Verification runs are display-only mocks — the audit pipeline is backend-owned later.
      </p>
    </div>
  );
}

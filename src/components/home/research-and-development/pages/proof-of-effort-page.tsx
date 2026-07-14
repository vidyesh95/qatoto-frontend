import Link from "next/link";
import { notFound } from "next/navigation";

import DisputeWindowTab from "@/components/home/research-and-development/sections/dispute-window-tab";
import ProofOfEffortTabs from "@/components/home/research-and-development/sections/proof-of-effort-tabs";
import SliceLedgerTab from "@/components/home/research-and-development/sections/slice-ledger-tab";
import VerificationPipelineTab from "@/components/home/research-and-development/sections/verification-pipeline-tab";
import { MOCK_RESEARCH_PROJECTS } from "@/lib/research-and-development-mocks";
import { MOCK_PROJECT_PROOF_OF_EFFORT_LEDGERS } from "@/lib/research-and-development-proof-of-effort-mocks";

// Proof of Effort composition: slice ledger, verification pipeline, and the
// 24-hour dispute window — three server-rendered panels behind a small tabs
// island (same handoff as workshop-page → workshop-tabs). All ledger data is
// a static mock this phase.
export default function ProofOfEffortPage({ projectId }: { projectId: string }) {
  const project = MOCK_RESEARCH_PROJECTS.find(
    (candidateProject) => candidateProject.id === projectId,
  );
  const ledger = MOCK_PROJECT_PROOF_OF_EFFORT_LEDGERS.find(
    (candidateLedger) => candidateLedger.projectId === projectId,
  );
  if (!project || !ledger) notFound();

  return (
    <div className="space-y-6 pb-8">
      <header className="space-y-1 px-4 pt-2 lg:px-6">
        <Link
          href={`/research-and-development/project/${project.id}`}
          className="text-xs font-medium text-[#00696E]"
        >
          ← {project.name}
        </Link>
        <h1 className="font-serif text-2xl font-semibold md:text-3xl">Proof of Effort</h1>
        <p className="text-sm text-muted-foreground">
          Slices, verification, and the 24-hour dispute ledger — Qatoto as the neutral auditor for
          the {project.name} team.
        </p>
      </header>
      <ProofOfEffortTabs
        sliceLedgerPanel={<SliceLedgerTab ledger={ledger} teamMembers={project.teamMembers} />}
        verificationPanel={
          <VerificationPipelineTab
            claimVerificationRuns={ledger.claimVerificationRuns}
            physicalWorkReceipts={ledger.physicalWorkReceipts}
            teamMembers={project.teamMembers}
            dailyLogs={project.dailyLogs}
          />
        }
        disputesPanel={
          <DisputeWindowTab
            disputeWindowEntries={ledger.disputeWindowEntries}
            teamMembers={project.teamMembers}
          />
        }
      />
    </div>
  );
}

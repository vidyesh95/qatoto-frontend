// TRANSPORT: mock — NOT WIRED (phase 4). Reads a static dataset from
// src/mocks/research-and-development*. Every figure here is fabricated; see
// docs/R_AND_D_STRUCTURE.md §18 for what wires it and §19 for the transport map.
import Link from "next/link";
import { notFound } from "next/navigation";

import DisputeWindowTab from "@/components/home/research-and-development/sections/dispute-window-tab";
import IntegrationConsentTab from "@/components/home/research-and-development/sections/integration-consent-tab";
import OptimizationTab from "@/components/home/research-and-development/sections/optimization-tab";
import ProjectAuditTrailTab from "@/components/home/research-and-development/sections/project-audit-trail-tab";
import ProofOfEffortTabs from "@/components/home/research-and-development/sections/proof-of-effort-tabs";
import SliceLedgerTab from "@/components/home/research-and-development/sections/slice-ledger-tab";
import VerificationPipelineTab from "@/components/home/research-and-development/sections/verification-pipeline-tab";
import { MOCK_RESEARCH_PROJECTS } from "@/mocks/research-and-development-mocks";
import { MOCK_PROJECT_OVERSIGHT } from "@/mocks/research-and-development-oversight-mocks";
import { MOCK_PROJECT_PROOF_OF_EFFORT_LEDGERS } from "@/mocks/research-and-development-proof-of-effort-mocks";

// Proof of Effort composition: the slice ledger (with rate locks and the bake
// checklist), the verification pipeline and its human-override queue, the
// dispute window with votes, the integration consent screen, optimization, and
// the audit trail with chain verification — six server-rendered panels behind a
// small tabs island. All ledger and oversight data is a static mock this phase.
export default function ProofOfEffortPage({ projectId }: { projectId: string }) {
  const project = MOCK_RESEARCH_PROJECTS.find(
    (candidateProject) => candidateProject.id === projectId,
  );
  const ledger = MOCK_PROJECT_PROOF_OF_EFFORT_LEDGERS.find(
    (candidateLedger) => candidateLedger.projectId === projectId,
  );
  const oversight = MOCK_PROJECT_OVERSIGHT.find(
    (candidateOversight) => candidateOversight.projectId === projectId,
  );
  if (!project || !ledger || !oversight) notFound();

  return (
    <div className="space-y-6 pt-4 pb-4 lg:pt-6 lg:pb-6">
      <header className="space-y-1 px-4 lg:px-6">
        <Link
          href={`/research-and-development/project/${project.id}`}
          className="text-xs font-medium text-[#00696E]"
        >
          ← {project.name}
        </Link>
        <h1 className="font-serif text-2xl font-semibold md:text-3xl">Proof of Effort</h1>
        <p className="text-sm text-muted-foreground">
          Slices, verification, disputes and consent — Qatoto as the neutral auditor for the{" "}
          {project.name} team.
        </p>
      </header>
      <ProofOfEffortTabs
        sliceLedgerPanel={
          <SliceLedgerTab
            ledger={ledger}
            teamMembers={project.teamMembers}
            rateLockProposals={oversight.rateLockProposals}
            pieBakeReadiness={oversight.pieBakeReadiness}
          />
        }
        verificationPanel={
          <VerificationPipelineTab
            claimVerificationRuns={ledger.claimVerificationRuns}
            physicalWorkReceipts={ledger.physicalWorkReceipts}
            overrideRequests={oversight.verificationOverrideRequests}
            teamMembers={project.teamMembers}
            dailyLogs={project.dailyLogs}
          />
        }
        disputesPanel={
          <DisputeWindowTab
            disputeWindowEntries={ledger.disputeWindowEntries}
            disputeCases={oversight.disputeCases}
            teamMembers={project.teamMembers}
          />
        }
        integrationsPanel={
          <IntegrationConsentTab
            connections={oversight.integrationConnections}
            teamMembers={project.teamMembers}
          />
        }
        optimizationPanel={<OptimizationTab suggestions={ledger.optimizationSuggestions} />}
        auditTrailPanel={
          <ProjectAuditTrailTab
            entries={ledger.auditTrailEntries}
            chainVerification={oversight.chainVerification}
          />
        }
      />
    </div>
  );
}

// TRANSPORT: server-fetch — server component. Resolves GET /research-projects/:slug alone
// first, then reads nine member-scoped §9 endpoints concurrently, forwarding the session
// cookie through callerRequestOptions(). The write controls inside the panels are
// client-query islands. See docs/R_AND_D_STRUCTURE.md §19.
import Link from "next/link";
import { notFound } from "next/navigation";

import DisputeWindowTab from "@/components/home/research-and-development/sections/dispute-window-tab";
import IntegrationConsentTab from "@/components/home/research-and-development/sections/integration-consent-tab";
import OptimizationTab from "@/components/home/research-and-development/sections/optimization-tab";
import ProjectAuditTrailTab from "@/components/home/research-and-development/sections/project-audit-trail-tab";
import ProofOfEffortTabs from "@/components/home/research-and-development/sections/proof-of-effort-tabs";
import { RndErrorPanel } from "@/components/home/research-and-development/sections/rnd-status-panel";
import SliceLedgerTab from "@/components/home/research-and-development/sections/slice-ledger-tab";
import VerificationPipelineTab from "@/components/home/research-and-development/sections/verification-pipeline-tab";
import { readEnumParam, type RawSearchParams } from "@/lib/filter-href";
import {
  getPieBake,
  getProofOfEffortSummary,
  listAllocationProposals,
  listAuditTrail,
  listDisputes,
  listEffortClaims,
  listIntegrationGrants,
  listOptimizationSuggestions,
  listPhysicalReceipts,
  listOpenRoleProjection,
  listSliceLedger,
  verifyAuditChain,
} from "@/lib/rnd/proof-of-effort.api";
import { EFFORT_VERIFICATION_STATUSES } from "@/lib/rnd/proof-of-effort.schemas";
import { getResearchProjectDetail } from "@/lib/rnd/projects.api";
import {
  toMemberScopedCursorListViewState,
  toMemberScopedItemViewState,
  toMemberScopedListViewState,
  toMemberScopedSequenceListViewState,
} from "@/lib/view-state";
import { callerRequestOptions } from "@/lib/server-http";

const LEDGER_PAGE_LIMIT = 50;
const CLAIMS_PAGE_LIMIT = 25;
const AUDIT_PAGE_LIMIT = 50;

/**
 * Proof of Effort — the product's headline output, and until now the largest mock on the
 * surface: 38 shipped routes with zero requests behind them.
 *
 * THE READ ORDER IS LOAD-BEARING, exactly as on the project detail page. The public detail
 * read runs ALONE AND FIRST: its `404` means "no such project, or a draft you do not own"
 * and becomes `notFound()`, which leaks nothing. Only once it succeeds is the project's
 * existence public knowledge the visitor arrived with — which is what makes a "members
 * only" message legitimate on the nine child reads, and only there.
 *
 * EACH CHILD READ GETS ITS OWN VIEW STATE. A dead `…/audit-trail` dims one tab; it does not
 * turn the cap table into an empty state, which would report an outage as a finding about
 * the project's equity.
 *
 * `…/pie-bake` 404s BEFORE THE BAKE, and that 404 is an absence rather than a failure — a
 * project with a dynamic pie has no frozen one. It shares the `restricted` variant with a
 * membership refusal because the frontend genuinely cannot tell them apart, and both render
 * as "there is nothing here", which is honest either way.
 */
export default async function ProofOfEffortPage({
  projectSlug,
  searchParams,
}: {
  projectSlug: string;
  searchParams: RawSearchParams;
}) {
  const requestOptions = await callerRequestOptions();
  const detailResult = await getResearchProjectDetail(projectSlug, requestOptions);

  if (!detailResult.success) {
    if (detailResult.error.code === "404") notFound();
    return (
      <div className="px-4 pt-6 lg:px-6">
        <RndErrorPanel message="Couldn't load this project." />
      </div>
    );
  }

  const project = detailResult.data;

  // Dropped rather than forwarded when it is not one of the six: every backend query
  // schema is `.strict()`, so a hand-edited `?claimStatus=banana` would be a 422 page
  // instead of an ignored parameter.
  const selectedClaimStatus = readEnumParam(
    searchParams,
    "claimStatus",
    EFFORT_VERIFICATION_STATUSES,
  );

  const [
    summaryResult,
    ledgerResult,
    projectionResult,
    pieBakeResult,
    claimsResult,
    receiptsResult,
    proposalsResult,
    disputesResult,
    grantsResult,
    suggestionsResult,
    auditEntriesResult,
    chainVerificationResult,
  ] = await Promise.all([
    getProofOfEffortSummary(projectSlug, requestOptions),
    listSliceLedger(projectSlug, { limit: LEDGER_PAGE_LIMIT }, requestOptions),
    listOpenRoleProjection(projectSlug, requestOptions),
    getPieBake(projectSlug, requestOptions),
    listEffortClaims(
      projectSlug,
      { limit: CLAIMS_PAGE_LIMIT, status: selectedClaimStatus },
      requestOptions,
    ),
    listPhysicalReceipts(projectSlug, requestOptions),
    listAllocationProposals(projectSlug, {}, requestOptions),
    listDisputes(projectSlug, {}, requestOptions),
    listIntegrationGrants(projectSlug, requestOptions),
    listOptimizationSuggestions(projectSlug, requestOptions),
    listAuditTrail(projectSlug, { limit: AUDIT_PAGE_LIMIT }, requestOptions),
    verifyAuditChain(projectSlug, requestOptions),
  ]);

  const summaryState = toMemberScopedItemViewState(summaryResult);
  const pieBakeState = toMemberScopedItemViewState(pieBakeResult);

  return (
    <div className="space-y-6 pt-4 pb-4 lg:pt-6 lg:pb-6">
      <header className="space-y-1 px-4 lg:px-6">
        <Link
          href={`/research-and-development/project/${project.slug}`}
          className="text-xs font-medium text-[#00696E]"
        >
          ← {project.name}
        </Link>
        <h1 className="font-serif text-2xl font-semibold md:text-3xl">Proof of Effort</h1>
        <p className="text-sm text-muted-foreground">
          Every slice on this page came from work the pipeline could independently check. Nobody —
          including the founder — types in a number.
        </p>
      </header>
      <ProofOfEffortTabs
        sliceLedgerPanel={
          <SliceLedgerTab
            summaryState={summaryState}
            ledgerState={toMemberScopedSequenceListViewState(ledgerResult)}
            projectionState={toMemberScopedListViewState(projectionResult)}
            pieBakeState={pieBakeState}
            projectCurrency={project.currency}
            projectSlug={projectSlug}
            team={project.team}
            viewerProjectRole={project.viewerProjectRole}
          />
        }
        verificationPanel={
          <VerificationPipelineTab
            claimsState={toMemberScopedCursorListViewState(claimsResult)}
            receiptsState={toMemberScopedListViewState(receiptsResult)}
            projectSlug={projectSlug}
            projectCurrency={project.currency}
            viewerProjectRole={project.viewerProjectRole}
            searchParams={searchParams}
            selectedClaimStatus={selectedClaimStatus}
          />
        }
        disputesPanel={
          <DisputeWindowTab
            proposalsState={toMemberScopedCursorListViewState(proposalsResult)}
            disputesState={toMemberScopedListViewState(disputesResult)}
            projectSlug={projectSlug}
            viewerProjectRole={project.viewerProjectRole}
          />
        }
        integrationsPanel={
          <IntegrationConsentTab
            grantsState={toMemberScopedListViewState(grantsResult)}
            projectSlug={projectSlug}
          />
        }
        optimizationPanel={
          <OptimizationTab
            suggestionsState={toMemberScopedListViewState(suggestionsResult)}
            projectSlug={projectSlug}
          />
        }
        auditTrailPanel={
          <ProjectAuditTrailTab
            entriesState={toMemberScopedSequenceListViewState(auditEntriesResult)}
            chainVerificationState={toMemberScopedItemViewState(chainVerificationResult)}
            projectSlug={projectSlug}
          />
        }
      />
    </div>
  );
}

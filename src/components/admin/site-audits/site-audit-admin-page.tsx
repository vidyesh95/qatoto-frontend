// TRANSPORT: client-query — the audit list, record and withdraw all call hooks in
// `@/hooks/store/admin-site-audits`. The capability check reads `@/hooks/rnd/platform-roles`.
"use client";

// `/admin/site-audits`. The record behind `site_audited`.
//
// WHY THIS PAGE HAD TO EXIST BEFORE THE STATE COULD. The manufacturer directory publishes a
// three-value verification state whose top value asserts THAT SOMEBODY STOOD IN THE BUILDING —
// and until Phase 17 there was nothing behind it anywhere in the schema.
// `commerce_organization_verification` covers business registration, tax registration, identity,
// address and bank account: paperwork, all of it. §16.2's third conflict offered two ways out,
// drop the state or build the record, and the record was built.
//
// So this console is not an administrative convenience. It is the only place the platform's
// strongest claim about a factory can come from.
//
// FOUR RULES, AND EVERY ONE OF THEM IS ABOUT SOMEBODY ELSE'S REPUTATION:
//
//  1. AN AUDIT IS NEVER DERIVED FROM A DOCUMENT REVIEW. There is no control here that promotes a
//     `documents_reviewed` organization, and there must never be one — letting a paper review
//     carry the weight of a visit is the precise collapse the three-state enum exists to prevent.
//  2. EVERY ROW NAMES AN ACCOUNTABLE HUMAN — `auditorName`, which is on the projection. This used
//     to render `auditEntryId` and claim it was "NOT NULL on the backend"; the projection never
//     emitted it, so the field existed only in the fixture. The accountable human
//     exists that nobody can be asked about.
//  3. A WITHDRAWAL NEEDS A REASON. Retracting an audit removes a claim a buyer may have chosen
//     this factory on, and a retraction nobody has to justify is one nobody can review.
//  4. NONE OF THIS REACHES A BUYER. The public detail read projects `lastAuditedAt` and nothing
//     else. The auditor's name and the scope they walked are a disclosure about a third party who
//     never agreed to it, which is why they live on this page and stop here.
//
// Gated by `moderate_commerce` — the STORE capability, not `moderate_content`. An audit is a
// commerce fact about a seller; a forum thread is not (§17.4).

import { useState } from "react";

import { useOwnStaffContextQuery } from "@/hooks/rnd/platform-roles";
import {
  useOrganizationSiteAuditsQuery,
  useRecordSiteAuditMutation,
  useWithdrawSiteAuditMutation,
} from "@/hooks/store/admin-site-audits";
import { useResettableAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";
import {
  FACTORY_SITE_AUDIT_STATE_LABELS,
  type FactorySiteAudit,
  type RecordSiteAuditInput,
} from "@/lib/store/factories.schemas";
import { formatIsoDateLabel, formatIsoInstantLabel } from "@/lib/store/format";

const CARD_CLASS = "rounded-2xl border border-[#CAC4D0]/60 p-4";

const PRIMARY_BUTTON_CLASS =
  "cursor-pointer rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-40";

const QUIET_BUTTON_CLASS =
  "cursor-pointer rounded-full bg-background px-3 py-1.5 text-xs font-medium text-foreground outline -outline-offset-1 outline-border disabled:opacity-40";

const FIELD_CLASS =
  "mt-1 w-full rounded-lg border border-[#CAC4D0]/60 px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary";

type AuditListViewState =
  | { status: "restricted" }
  | { status: "noOrganizationChosen" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty" }
  | { status: "ready"; audits: FactorySiteAudit[] };

export default function SiteAuditAdminPage() {
  const staffContextQuery = useOwnStaffContextQuery();
  const canRecordAudits =
    staffContextQuery.data?.capabilities.includes("moderate_commerce") ?? false;

  // The organization is typed rather than picked from a list, because no route on this surface
  // enumerates organizations for staff — §6.6 gives audits per organization and nothing else. A
  // picker would need a read that does not exist, and inventing one is how a console grows a
  // second source of truth for who the sellers are.
  const [organizationIdInput, setOrganizationIdInput] = useState("");
  const [activeOrganizationId, setActiveOrganizationId] = useState("");

  const auditsQuery = useOrganizationSiteAuditsQuery(
    activeOrganizationId,
    canRecordAudits && activeOrganizationId.length > 0,
  );

  const viewState: AuditListViewState = (() => {
    // `restricted` FIRST, and before `loading`: a disabled query sits in `pending` forever, so
    // reading `isPending` first would spin at somebody who may not look.
    if (!canRecordAudits) return { status: "restricted" };
    if (activeOrganizationId.length === 0) return { status: "noOrganizationChosen" };
    if (auditsQuery.isPending) return { status: "loading" };
    if (auditsQuery.isError) return { status: "error", message: "That list could not be loaded." };
    const result = auditsQuery.data;
    if (result === undefined) return { status: "loading" };
    if (!result.success) return { status: "error", message: result.error.message };
    if (result.data.siteAudits.length === 0) return { status: "empty" };
    return { status: "ready", audits: result.data.siteAudits };
  })();

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Site audits</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          The record behind &ldquo;Site audited by Qatoto&rdquo;. It means somebody stood in the
          building — it is not a document review, and it says nothing about whether the factory can
          make any particular thing.
        </p>
      </header>

      {staffContextQuery.isError && (
        <output className="block rounded-2xl border border-[#CAC4D0]/60 bg-muted/40 p-3 text-sm text-muted-foreground">
          Couldn&apos;t check your permissions, so nothing here is loaded.
        </output>
      )}
      {staffContextQuery.isSuccess && !canRecordAudits && (
        <output className="block rounded-2xl border border-[#CAC4D0]/60 bg-muted/40 p-3 text-sm text-muted-foreground">
          Recording site audits needs the `moderate_commerce` capability. Your role is{" "}
          {staffContextQuery.data.platformRole ?? "none"}, so this page is not loaded.
        </output>
      )}

      {canRecordAudits && (
        <form
          className={CARD_CLASS}
          onSubmit={(event) => {
            event.preventDefault();
            setActiveOrganizationId(organizationIdInput.trim());
          }}
        >
          <label className="block text-xs text-muted-foreground">
            Organization id
            <input
              className={FIELD_CLASS}
              value={organizationIdInput}
              onChange={(event) => setOrganizationIdInput(event.target.value)}
              placeholder="org_factory_hangzhou_precision"
            />
          </label>
          <button
            type="submit"
            className={`mt-2 ${QUIET_BUTTON_CLASS}`}
            disabled={organizationIdInput.trim().length === 0}
          >
            Load its audits
          </button>
        </form>
      )}

      {renderAuditList(viewState)}

      {canRecordAudits && activeOrganizationId.length > 0 && (
        <RecordAuditForm organizationId={activeOrganizationId} />
      )}
    </div>
  );
}

function renderAuditList(viewState: AuditListViewState) {
  switch (viewState.status) {
    case "restricted":
      return null;
    case "noOrganizationChosen":
      return (
        <p className="rounded-2xl border border-[#CAC4D0]/60 bg-muted/40 p-3 text-sm text-muted-foreground">
          Load an organization to see its audits.
        </p>
      );
    case "loading":
      return <div className={`${CARD_CLASS} h-28 animate-pulse bg-muted/40`} aria-hidden />;
    case "error":
      return (
        <output className="block rounded-2xl border border-destructive/40 p-3 text-sm text-muted-foreground">
          {viewState.message}
        </output>
      );
    case "empty":
      return (
        <p className="rounded-2xl border border-[#CAC4D0]/60 bg-muted/40 p-3 text-sm text-muted-foreground">
          {/* An organization with no audit is `documents_reviewed` at best, and that is a normal
              state rather than a gap. Most factories have never been visited. */}
          Nobody has visited this organization. Its verification state cannot be &ldquo;site
          audited&rdquo; until somebody has.
        </p>
      );
    case "ready":
      return (
        <ul className="space-y-3">
          {viewState.audits.map((audit) => (
            <li key={audit.id}>
              <AuditCard audit={audit} />
            </li>
          ))}
        </ul>
      );
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}

function AuditCard({ audit }: { audit: FactorySiteAudit }) {
  const [reason, setReason] = useState("");
  const withdrawAudit = useWithdrawSiteAuditMutation();
  const isWithdrawn = audit.state === "withdrawn";

  return (
    <article className={CARD_CLASS}>
      <p className="text-xs text-muted-foreground">
        {FACTORY_SITE_AUDIT_STATE_LABELS[audit.state]}
        {" · visited "}
        {formatIsoDateLabel(audit.auditedAt)}
        {" · recorded "}
        {formatIsoInstantLabel(audit.createdAt)}
      </p>

      <h3 className="mt-1 text-sm font-medium text-foreground">{audit.auditorName}</h3>
      <p className="mt-1 text-sm leading-5 text-foreground">{audit.scopeSummary}</p>

      <p className="mt-2 text-xs text-muted-foreground">
        {/* Empty means the audit covered the organization, not a named site. Not a missing join. */}
        {audit.siteIds.length === 0
          ? "Recorded against the organization rather than named sites."
          : `Sites covered: ${audit.siteIds.join(", ")}`}
        {" · entry "}
        {audit.auditorName}
      </p>

      {isWithdrawn ? (
        <div className="mt-2 rounded-lg bg-muted/40 px-3 py-2">
          <p className="text-xs font-medium text-foreground">
            Withdrawn {audit.withdrawnAt === null ? "" : formatIsoInstantLabel(audit.withdrawnAt)}
          </p>
          {/* The reason is required by the route, so it is present whenever `withdrawnAt` is. */}
          <p className="mt-1 text-xs leading-4 text-muted-foreground">{audit.withdrawalReason}</p>
        </div>
      ) : (
        <div className="mt-3">
          <label className="block text-xs text-muted-foreground">
            Why you are withdrawing it — required
            <textarea
              className={FIELD_CLASS}
              rows={2}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <button
            type="button"
            className={`mt-2 ${QUIET_BUTTON_CLASS}`}
            disabled={reason.trim().length === 0 || withdrawAudit.isPending}
            onClick={() =>
              withdrawAudit.mutate({ auditId: audit.id, input: { reason: reason.trim() } })
            }
          >
            Withdraw this audit
          </button>
          <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
            Buyers may have chosen this factory on the strength of it. The row is kept and marked
            withdrawn rather than deleted.
          </p>
          {withdrawAudit.data !== undefined && !withdrawAudit.data.success && (
            <p className="mt-1 text-xs leading-4 text-destructive">
              {withdrawAudit.data.error.message}
            </p>
          )}
        </div>
      )}
    </article>
  );
}

function RecordAuditForm({ organizationId }: { organizationId: string }) {
  const [auditedAt, setAuditedAt] = useState("");
  const [auditorName, setAuditorName] = useState("");
  const [scopeSummary, setScopeSummary] = useState("");
  const [siteIdsInput, setCoveredSiteIdsInput] = useState("");
  const recordAudit = useRecordSiteAuditMutation();
  const { getIdempotencyKey, resetIdempotencyKey } = useResettableAttemptIdempotencyKey();

  const isSubmittable =
    auditedAt.trim().length > 0 &&
    auditorName.trim().length > 0 &&
    scopeSummary.trim().length > 0 &&
    !recordAudit.isPending;

  return (
    <form
      className={CARD_CLASS}
      onSubmit={(event) => {
        event.preventDefault();
        if (!isSubmittable) return;
        const siteIds = siteIdsInput
          .split(",")
          .map((siteId) => siteId.trim())
          .filter((siteId) => siteId.length > 0);
        const input: RecordSiteAuditInput = {
          auditedAt: auditedAt.trim(),
          auditorName: auditorName.trim(),
          scopeSummary: scopeSummary.trim(),
          // Omitted when nobody named a site — an empty array and an absent field both mean
          // "against the organization", and omitting is the one this codebase sends.
          ...(siteIds.length === 0 ? {} : { siteIds }),
        };
        recordAudit.mutate(
          { organizationId, input, idempotencyKey: getIdempotencyKey() },
          {
            onSuccess: (result) => {
              // Rotated only on a confirmed success. A retry after a network failure must carry
              // the original key, or one visit is recorded twice and `lastAuditedAt` starts
              // describing a cadence nobody kept.
              if (!result.success) return;
              resetIdempotencyKey();
              setAuditedAt("");
              setAuditorName("");
              setScopeSummary("");
              setCoveredSiteIdsInput("");
            },
          },
        );
      }}
    >
      <h2 className="text-lg font-medium">Record an audit</h2>
      <p className="max-w-2xl text-sm text-muted-foreground">
        Only for a visit that happened. This is not where a document review is signed off.
      </p>

      <label className="mt-3 block text-xs text-muted-foreground">
        Date of the visit (YYYY-MM-DD)
        <input
          className={FIELD_CLASS}
          value={auditedAt}
          onChange={(event) => setAuditedAt(event.target.value)}
          placeholder="2026-02-17"
        />
      </label>

      <label className="mt-2 block text-xs text-muted-foreground">
        Who audited it
        <input
          className={FIELD_CLASS}
          value={auditorName}
          onChange={(event) => setAuditorName(event.target.value)}
          placeholder="Bureau Veritas — Shanghai office"
        />
      </label>

      <label className="mt-2 block text-xs text-muted-foreground">
        What they covered
        <textarea
          className={FIELD_CLASS}
          rows={3}
          value={scopeSummary}
          onChange={(event) => setScopeSummary(event.target.value)}
          placeholder="Full-day visit. Press floor, tool room, incoming goods."
        />
      </label>

      <label className="mt-2 block text-xs text-muted-foreground">
        Site ids covered, comma separated — leave blank for the whole organization
        <input
          className={FIELD_CLASS}
          value={siteIdsInput}
          onChange={(event) => setCoveredSiteIdsInput(event.target.value)}
        />
      </label>

      <button type="submit" className={`mt-3 ${PRIMARY_BUTTON_CLASS}`} disabled={!isSubmittable}>
        Record it
      </button>

      <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
        Buyers see only the date. Your name and what was covered stay on this page.
      </p>

      {recordAudit.data !== undefined && !recordAudit.data.success && (
        <p className="mt-1 text-xs leading-4 text-destructive">{recordAudit.data.error.message}</p>
      )}
      {recordAudit.isError && (
        <p className="mt-1 text-xs leading-4 text-destructive">
          Couldn&apos;t reach the server. Pressing record again is safe — the request carries an
          idempotency key, so a retry cannot record the same visit twice.
        </p>
      )}
    </form>
  );
}

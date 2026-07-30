// TRANSPORT: client-query — calls `useUpdateResearchProgramMutation` and
// `useProgramOpportunityMutation`. Creator-or-staff only; the server page decides that.
"use client";

import { useState, type FormEvent } from "react";

import {
  useProgramOpportunityMutation,
  useUpdateResearchProgramMutation,
} from "@/hooks/rnd/research-programs";
import { ApiRequestError } from "@/lib/http";
import type {
  ResearchBranch,
  ResearchOpportunity,
  ResearchProgramDetail,
} from "@/lib/rnd/research-programs.schemas";

import { MutationAcceptedNotice, MutationErrorNotice } from "./mutation-feedback";

type ProgramOwnerToolsProps = {
  programSlug: string;
  program: ResearchProgramDetail;
  branches: ResearchBranch[];
  opportunities: ResearchOpportunity[];
};

/**
 * What the programme's creator can change, and nobody else.
 *
 * TWO THINGS ARE ABSENT FROM THE EDIT FORM ON PURPOSE:
 *
 *   `slug`   — server-derived and unwritable after creation. It is a public URL that has been
 *              linked and cited by the time anybody wants to change it (§ wire casing).
 *   `status` — publishing is a moderator's decision. The field is absent from the backend schema
 *              too, so sending it is a 422 rather than a way past review.
 *
 * PRODUCT OPPORTUNITIES ARE CREATOR-OR-STAFF, unlike branches, papers and posts. A market
 * projection attributed to a programme is a claim the programme makes about itself, and every
 * contributor being able to publish one would turn the rail into an advertising surface.
 */
export default function ProgramOwnerTools({
  programSlug,
  program,
  branches,
  opportunities,
}: ProgramOwnerToolsProps) {
  const updateMutation = useUpdateResearchProgramMutation(programSlug);
  const opportunityMutation = useProgramOpportunityMutation(programSlug);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [title, setTitle] = useState(program.title);
  const [tagline, setTagline] = useState(program.tagline);
  const [missionStatement, setMissionStatement] = useState(program.missionStatement);

  const [isOpportunityOpen, setIsOpportunityOpen] = useState(false);
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [derivedFromBranchId, setDerivedFromBranchId] = useState("");
  const [marketSizeInMajorUnits, setMarketSizeInMajorUnits] = useState("");
  const [readinessMinMonths, setReadinessMinMonths] = useState("12");
  const [readinessMaxMonths, setReadinessMaxMonths] = useState("24");

  const firstError = [updateMutation.error, opportunityMutation.error].find(
    (error): error is ApiRequestError => error instanceof ApiRequestError,
  );

  function handleEditSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    updateMutation.mutate(
      {
        title: title.trim(),
        tagline: tagline.trim(),
        missionStatement: missionStatement.trim(),
      },
      { onSuccess: () => setIsEditOpen(false) },
    );
  }

  function handleOpportunitySubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!derivedFromBranchId) return;

    opportunityMutation.mutate(
      {
        action: "create",
        productName: productName.trim(),
        productDescription: productDescription.trim(),
        derivedFromBranchId,
        // Major units → a decimal string of CENTS. The column is a bigint, which is why this is a
        // string on the wire rather than a JS number.
        estimatedMarketSizeInCents: String(Math.round(Number(marketSizeInMajorUnits) * 100)),
        readinessMinMonths: Number(readinessMinMonths),
        readinessMaxMonths: Number(readinessMaxMonths),
      },
      {
        onSuccess: () => {
          setProductName("");
          setProductDescription("");
          setMarketSizeInMajorUnits("");
          setIsOpportunityOpen(false);
        },
      },
    );
  }

  return (
    <div className="space-y-4 px-4 lg:px-6">
      <p className="max-w-2xl text-sm text-muted-foreground">
        You created this programme. Its web address is fixed, and publishing is a moderator&apos;s
        decision — everything else here is yours to change.
      </p>

      {firstError && <MutationErrorNotice error={firstError.apiError} />}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setIsEditOpen((isOpen) => !isOpen)}
          className="cursor-pointer rounded-full border border-[#00696E] px-4 py-2 text-sm font-medium text-[#00696E] transition-colors hover:bg-[#00696E]/10"
        >
          {isEditOpen ? "Cancel edit" : "Edit programme details"}
        </button>
        {branches.length > 0 && (
          <button
            type="button"
            onClick={() => setIsOpportunityOpen((isOpen) => !isOpen)}
            className="cursor-pointer rounded-full border border-[#CAC4D0] px-4 py-2 text-sm transition-colors hover:bg-muted"
          >
            {isOpportunityOpen ? "Cancel" : "Add a product opportunity"}
          </button>
        )}
      </div>

      {isEditOpen && (
        <form
          onSubmit={handleEditSubmit}
          className="max-w-2xl space-y-3 rounded-2xl border border-[#CAC4D0]/60 bg-card p-4"
        >
          <label className="block space-y-1 text-xs">
            <span className="font-medium">Name</span>
            <input
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              minLength={3}
              maxLength={120}
              className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
            />
            <span className="text-[10px] text-muted-foreground">
              The web address stays <code>{program.slug}</code> — it has been linked and cannot
              move.
            </span>
          </label>

          <label className="block space-y-1 text-xs">
            <span className="font-medium">One-line summary</span>
            <input
              required
              value={tagline}
              onChange={(event) => setTagline(event.target.value)}
              minLength={3}
              maxLength={200}
              className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
            />
          </label>

          <label className="block space-y-1 text-xs">
            <span className="font-medium">Mission</span>
            <textarea
              required
              value={missionStatement}
              onChange={(event) => setMissionStatement(event.target.value)}
              minLength={20}
              maxLength={4000}
              rows={5}
              className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
            />
          </label>

          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="cursor-pointer rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#00393C] disabled:opacity-60"
          >
            {updateMutation.isPending ? "Saving…" : "Save changes"}
          </button>
        </form>
      )}

      {updateMutation.isSuccess && !isEditOpen && (
        <MutationAcceptedNotice message="Programme details updated." />
      )}

      {isOpportunityOpen && (
        <form
          onSubmit={handleOpportunitySubmit}
          className="max-w-2xl space-y-3 rounded-2xl border border-[#CAC4D0]/60 bg-card p-4"
        >
          <label className="block space-y-1 text-xs">
            <span className="font-medium">Product</span>
            <input
              required
              value={productName}
              onChange={(event) => setProductName(event.target.value)}
              minLength={3}
              maxLength={200}
              placeholder="Senolytic supplement line"
              className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
            />
          </label>

          <label className="block space-y-1 text-xs">
            <span className="font-medium">What is it?</span>
            <textarea
              required
              value={productDescription}
              onChange={(event) => setProductDescription(event.target.value)}
              minLength={10}
              maxLength={2000}
              rows={2}
              className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
            />
          </label>

          <label className="block space-y-1 text-xs">
            <span className="font-medium">Which research does it come from?</span>
            <select
              required
              value={derivedFromBranchId}
              onChange={(event) => setDerivedFromBranchId(event.target.value)}
              className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
            >
              <option value="">Choose a branch…</option>
              {branches.map((branch) => (
                <option key={branch.branchId} value={branch.branchId}>
                  {branch.title}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-muted-foreground">
              Required — an opportunity with no research behind it is an unsourced projection.
            </span>
          </label>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-1 text-xs">
              <span className="font-medium">Est. market (USD)</span>
              <input
                required
                type="number"
                min={0}
                step={1}
                value={marketSizeInMajorUnits}
                onChange={(event) => setMarketSizeInMajorUnits(event.target.value)}
                placeholder="12000000000"
                className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
              />
            </label>
            <label className="space-y-1 text-xs">
              <span className="font-medium">Earliest (months)</span>
              <input
                required
                type="number"
                min={0}
                max={600}
                value={readinessMinMonths}
                onChange={(event) => setReadinessMinMonths(event.target.value)}
                className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
              />
            </label>
            <label className="space-y-1 text-xs">
              <span className="font-medium">Latest (months)</span>
              <input
                required
                type="number"
                min={0}
                max={600}
                value={readinessMaxMonths}
                onChange={(event) => setReadinessMaxMonths(event.target.value)}
                className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={opportunityMutation.isPending || !derivedFromBranchId}
            className="cursor-pointer rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#00393C] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {opportunityMutation.isPending ? "Adding…" : "Add opportunity"}
          </button>
        </form>
      )}

      {opportunities.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {opportunities.map((opportunity) => (
            <li key={opportunity.opportunityId}>
              <button
                type="button"
                disabled={opportunityMutation.isPending}
                onClick={() =>
                  opportunityMutation.mutate({
                    action: "delete",
                    opportunityId: opportunity.opportunityId,
                  })
                }
                className="cursor-pointer rounded-full border border-[#CAC4D0] px-3 py-1 text-xs transition-colors hover:bg-muted disabled:opacity-60"
              >
                Remove &ldquo;{opportunity.productName}&rdquo;
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

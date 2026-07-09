import type { NewIdeaDraft } from "@/components/home/research-and-development/wizard/wizard-shared";

const EMPTY_VALUE_PLACEHOLDER = "—";

// Step 4: read-only recap of the draft before posting.
export default function ReviewAndSubmitStep({ draft }: { draft: NewIdeaDraft }) {
  const reviewRows: { label: string; value: string }[] = [
    { label: "Idea name", value: draft.ideaName },
    { label: "One-line pitch", value: draft.oneLinePitch },
    { label: "Category", value: draft.category },
    { label: "Problem it solves", value: draft.problemItSolves },
    { label: "Target region", value: draft.targetRegion },
    { label: "Demand evidence", value: draft.demandEvidenceNotes },
    { label: "Roles needed", value: draft.rolesNeeded.join(", ") },
    { label: "Equity to offer", value: draft.equityToOffer },
    { label: "Expected commitment", value: draft.expectedCommitment },
  ];

  return (
    <dl className="divide-y divide-border/50 rounded-2xl border border-[#CAC4D0]/60">
      {reviewRows.map((reviewRow) => (
        <div key={reviewRow.label} className="flex flex-col gap-0.5 p-3">
          <dt className="text-xs font-medium text-[#6F7979]">{reviewRow.label}</dt>
          <dd className="text-sm">
            {reviewRow.value.trim() !== "" ? reviewRow.value : EMPTY_VALUE_PLACEHOLDER}
          </dd>
        </div>
      ))}
    </dl>
  );
}

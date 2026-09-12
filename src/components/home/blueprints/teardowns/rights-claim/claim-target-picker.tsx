// TRANSPORT: props-only — the options arrive from the route, which reads them from
// `GET /blueprints/teardowns/:teardownSlug/claim-targets`.
//
// ⚠️ THE OPTIONS COME FROM THEIR OWN READ, NOT FROM THE TEARDOWN PAYLOAD, and that is the whole
// point of that route existing. A quarantined teardown arrives with `documents`,
// `manufacturingFiles` and `assembly` withheld by the server — which are exactly the three arrays
// this picker used to flatten. Building from the payload would silently reduce a second rights
// holder to "the whole teardown", using one quarantine to blunt the control that produced it.
//
// The claim-target read carries ids and titles and no URLs, so the disputed bytes stay withheld
// while the claimant can still name the file they mean.

import type { RightsClaimTarget } from "@/lib/blueprints/rights-claim.schemas";
import type { TeardownClaimTargets } from "@/lib/blueprints/schemas";

/**
 * One selectable target, flattened out of the teardown so the radio list can render in one pass.
 *
 * `optionKey` is a STRING KEY FOR REACT AND THE RADIO GROUP, not part of the contract. The `target`
 * it carries is the union value that actually gets submitted.
 */
interface ClaimTargetOption {
  readonly optionKey: string;
  readonly label: string;
  readonly groupLabel: string;
  readonly target: RightsClaimTarget;
}

/**
 * Everything on this teardown a claim could be made against.
 *
 * ⚠️ IT LISTS WHAT THE TEARDOWN ACTUALLY HAS, and that is the whole reason this is a picker rather
 * than a text field. A claimant who types "your STEP files" against a survey that published six
 * documents leaves Qatoto unable to act without writing back, which costs the claimant the days
 * they are most anxious about. Every option here resolves to a real id.
 *
 * ⚠️ A TEARDOWN WITH NO PAYLOAD STILL OFFERS THE WHOLE-TEARDOWN ARM. `thermal-camera-module-teardown`
 * has no documents, no files and no model — and a trade-secret claim against it is exactly as valid
 * as one against a survey that published everything, because the objection is to the survey
 * existing. An empty picker would refuse the claimant with no explanation.
 */
export function buildClaimTargetOptions(claimTargets: TeardownClaimTargets): ClaimTargetOption[] {
  return [
    {
      optionKey: "whole_teardown",
      label: "The whole teardown",
      groupLabel: "Everything",
      target: { kind: "whole_teardown" },
    },
    ...claimTargets.documents.map((document) => ({
      optionKey: `document:${document.id}`,
      label: document.title,
      groupLabel: "Documents",
      target: { kind: "document" as const, documentId: document.id },
    })),
    ...claimTargets.manufacturingFiles.map((manufacturingFile) => ({
      optionKey: `manufacturing_file:${manufacturingFile.id}`,
      label: manufacturingFile.title,
      groupLabel: "Fabrication files",
      target: {
        kind: "manufacturing_file" as const,
        manufacturingFileId: manufacturingFile.id,
      },
    })),
    // Parts only exist when a model was published; an empty list is the common case.
    ...claimTargets.parts.map((part) => ({
      optionKey: `part:${part.id}`,
      label: part.label,
      groupLabel: "Parts",
      target: { kind: "part" as const, partId: part.id },
    })),
  ];
}

/** The label for a chosen target, for the notice body. Resolved here because this owns the options. */
export function resolveClaimTargetLabel(
  claimTargets: TeardownClaimTargets,
  target: RightsClaimTarget,
): string | null {
  switch (target.kind) {
    case "whole_teardown":
      return null;
    case "document":
      return (
        claimTargets.documents.find((document) => document.id === target.documentId)?.title ?? null
      );
    case "manufacturing_file":
      return (
        claimTargets.manufacturingFiles.find(
          (manufacturingFile) => manufacturingFile.id === target.manufacturingFileId,
        )?.title ?? null
      );
    case "part":
      return claimTargets.parts.find((part) => part.id === target.partId)?.label ?? null;
    default: {
      const exhaustiveCheck: never = target;
      return exhaustiveCheck;
    }
  }
}

export default function ClaimTargetPicker({
  claimTargets,
  selectedOptionKey,
  onTargetSelect,
}: {
  readonly claimTargets: TeardownClaimTargets;
  /** `null` until the claimant chooses. There is deliberately no default — see below. */
  readonly selectedOptionKey: string | null;
  readonly onTargetSelect: (optionKey: string, target: RightsClaimTarget) => void;
}) {
  const options = buildClaimTargetOptions(claimTargets);

  // Grouped for reading, in the order the page presents them: everything, then documents, then
  // files, then parts. `Map` rather than an object so insertion order is guaranteed.
  const optionsByGroup = new Map<string, ClaimTargetOption[]>();
  for (const option of options) {
    optionsByGroup.set(option.groupLabel, [
      ...(optionsByGroup.get(option.groupLabel) ?? []),
      option,
    ]);
  }

  return (
    <fieldset>
      {/* Section-heading type, matching the claim-kind question and "What you are swearing". */}
      <legend className="text-sm font-medium text-foreground">What are you objecting to?</legend>
      {/*
        ⚠️ NO OPTION IS PRE-SELECTED, and that is deliberate rather than an oversight. Defaulting to
        "the whole teardown" would let a claimant who scrolled past this send the broadest possible
        claim without choosing it — and the breadth of a claim is the thing Qatoto would act on.
        An unchosen target is why the prepare control stays disabled.
      */}
      <p className="mt-1 max-w-prose text-xs text-muted-foreground">
        Pick the narrowest thing that covers your concern. A claim against one file is quicker to
        act on than a claim against everything.
      </p>

      <div className="mt-3 space-y-4">
        {[...optionsByGroup].map(([groupLabel, groupOptions]) => (
          <div key={groupLabel}>
            <p className="text-[11px] tracking-[0.5px] text-muted-foreground uppercase">
              {groupLabel}
            </p>
            <div className="mt-1 space-y-1">
              {groupOptions.map((option) => (
                <label key={option.optionKey} className="flex cursor-pointer items-start gap-3">
                  <input
                    type="radio"
                    name="rights-claim-target"
                    value={option.optionKey}
                    checked={selectedOptionKey === option.optionKey}
                    onChange={() => onTargetSelect(option.optionKey, option.target)}
                    className="mt-0.5 size-4 shrink-0 accent-[#00696E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E]"
                  />
                  <span className="text-sm text-foreground">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

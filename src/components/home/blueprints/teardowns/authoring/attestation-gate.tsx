// TRANSPORT: props-only — a dumb view over the wizard draft.

import { CheckboxRow } from "@/components/home/blueprints/teardowns/authoring/wizard-fields";
import { TEARDOWN_ATTESTATION_CLAUSES } from "@/lib/blueprints/authoring.schemas";
import type { TeardownAttestationClauseId } from "@/lib/blueprints/authoring.schemas";

/**
 * THE FOUR STATEMENTS A PUBLISHER MAKES, and the thing that lets this surface call itself
 * clean-room.
 *
 * ⚠️ FOUR SEPARATE BOXES, NOT ONE "I AGREE TO THE TERMS". One box is a box people tick without
 * reading; four specific statements are four things somebody has to actually consider. They are
 * also four things that could be pointed at afterwards, individually, which a blanket agreement
 * never is.
 *
 * ⚠️ NEVER REMEMBERED ACROSS SUBMISSIONS. The next submission is about a different unit, obtained a
 * different way, and consent carried over from the last one is consent to a statement nobody made
 * about this one. The draft starts with an empty accepted list every time and there is no
 * "remember my answers" affordance anywhere near this.
 *
 * ⚠️ THE COPY IS FOR A NON-LAWYER, deliberately. `docs/PRODUCT.md` names the founder as a persona
 * explicitly not expected to know this vocabulary, and an attestation somebody cannot read is an
 * attestation they cannot honestly give. The clauses live in the contract so the words a publisher
 * agreed to and the rule that enforces them cannot drift apart.
 */
export default function AttestationGate({
  acceptedClauseIds,
  onAcceptedClauseIdsChange,
}: {
  readonly acceptedClauseIds: readonly TeardownAttestationClauseId[];
  readonly onAcceptedClauseIdsChange: (
    nextAcceptedClauseIds: readonly TeardownAttestationClauseId[],
  ) => void;
}) {
  function toggleClause(clauseId: TeardownAttestationClauseId, nextIsChecked: boolean): void {
    onAcceptedClauseIdsChange(
      nextIsChecked
        ? [...acceptedClauseIds, clauseId]
        : acceptedClauseIds.filter((acceptedClauseId) => acceptedClauseId !== clauseId),
    );
  }

  return (
    <section className="mt-8">
      <h2 className="text-sm font-medium text-foreground">Before you submit</h2>
      <p className="mt-1 max-w-prose text-xs text-muted-foreground">
        All four have to be true. If one of them is not, this is not something Qatoto can carry, and
        that is worth knowing now rather than after somebody has built from it.
      </p>

      <div className="mt-3 max-w-2xl">
        {TEARDOWN_ATTESTATION_CLAUSES.map((clause) => (
          <CheckboxRow
            key={clause.id}
            label={clause.label}
            detail={clause.detail}
            isChecked={acceptedClauseIds.includes(clause.id)}
            onCheckedChange={(nextIsChecked) => toggleClause(clause.id, nextIsChecked)}
          />
        ))}
      </div>
    </section>
  );
}

/**
 * Why submit is unavailable, in words, or `null` when it is available.
 *
 * ⚠️ A DISABLED BUTTON MUST SAY WHY. A grey control with no explanation is the most common way a
 * form wastes somebody's afternoon: they check every field they can see and never find the one that
 * is wrong. This names the count and the remaining statements, so the reason is on screen next to
 * the thing that is refusing.
 */
export function describeAttestationGap(
  acceptedClauseIds: readonly TeardownAttestationClauseId[],
): string | null {
  const outstandingClauses = TEARDOWN_ATTESTATION_CLAUSES.filter(
    (clause) => !acceptedClauseIds.includes(clause.id),
  );
  if (outstandingClauses.length === 0) return null;

  // ⚠️ THE LABELS ARE JOINED VERBATIM, NOT LOWERCASED. Every clause begins "I …", and lowercasing to
  // make the list read as one sentence produced "i obtained this unit lawfully" — a sentence that
  // looks like a typo in the one place on this surface that has to read as careful.
  return `${outstandingClauses.length} of ${TEARDOWN_ATTESTATION_CLAUSES.length} statements still unchecked: ${outstandingClauses
    .map((clause) => clause.label)
    .join("; ")}.`;
}

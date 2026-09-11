// TRANSPORT: props-only — a dumb view over the form's accepted statement ids.

import { CheckboxRow } from "@/components/home/blueprints/teardowns/authoring/wizard-fields";
import {
  SHOWCASE_LAUNCH_STATEMENT_IDS,
  SHOWCASE_LAUNCH_STATEMENTS,
  type ShowcaseLaunchStatementId,
} from "@/lib/blueprints/showcase-authoring.schemas";

/**
 * The two statements a maker ticks before posting.
 *
 * TWO SEPARATE BOXES, NOT ONE "I AGREE". A single box is ticked without reading; two specific
 * statements are two things somebody has to consider, the reasoning `attestation-gate.tsx` records.
 * NEVER REMEMBERED: the next launch is a different build, and the draft starts with none ticked.
 */
export default function LaunchStatements({
  acceptedStatementIds,
  onAcceptedStatementIdsChange,
}: {
  readonly acceptedStatementIds: readonly ShowcaseLaunchStatementId[];
  readonly onAcceptedStatementIdsChange: (
    nextAcceptedStatementIds: readonly ShowcaseLaunchStatementId[],
  ) => void;
}) {
  function toggleStatement(statementId: ShowcaseLaunchStatementId, nextIsChecked: boolean): void {
    onAcceptedStatementIdsChange(
      nextIsChecked
        ? [...acceptedStatementIds, statementId]
        : acceptedStatementIds.filter((acceptedStatementId) => acceptedStatementId !== statementId),
    );
  }

  return (
    <div>
      {SHOWCASE_LAUNCH_STATEMENT_IDS.map((statementId) => (
        <CheckboxRow
          key={statementId}
          label={SHOWCASE_LAUNCH_STATEMENTS[statementId].label}
          detail={SHOWCASE_LAUNCH_STATEMENTS[statementId].detail}
          isChecked={acceptedStatementIds.includes(statementId)}
          onCheckedChange={(nextIsChecked) => toggleStatement(statementId, nextIsChecked)}
        />
      ))}
    </div>
  );
}

/**
 * Why Post is unavailable because of the statements, in words, or `null` once both are ticked. A
 * disabled button must say why, beside itself.
 */
export function describeLaunchStatementGap(
  acceptedStatementIds: readonly ShowcaseLaunchStatementId[],
): string | null {
  const untickedStatementIds = SHOWCASE_LAUNCH_STATEMENT_IDS.filter(
    (statementId) => !acceptedStatementIds.includes(statementId),
  );
  if (untickedStatementIds.length === 0) return null;

  return `Tick ${untickedStatementIds.length === 1 ? "the last statement" : "both statements"} below: ${untickedStatementIds
    .map((statementId) => SHOWCASE_LAUNCH_STATEMENTS[statementId].label)
    .join("; ")}.`;
}

// TRANSPORT: props-only — a dumb view over the form's answer and accepted statement ids.

import { CheckboxRow } from "@/components/home/blueprints/authoring/form-fields";
import {
  CASE_STUDY_STATEMENT_IDS_BY_RELATIONSHIP,
  CASE_STUDY_STATEMENTS,
  type CaseStudyStatementId,
} from "@/lib/blueprints/case-study-authoring.schemas";
import type { CaseStudyAuthorRelationship } from "@/lib/blueprints/schemas";

/**
 * The two statements a writer ticks, THE PAIR THAT GOES WITH HOW THEY SAID THEY KNOW IT.
 *
 * Two separate boxes rather than one "I agree", for the launch statements' reason. Before the question
 * is answered there is nothing to tick, and the list says where to answer it rather than showing four
 * boxes, two of which would be a claim the writer is not making.
 */
export default function CaseStudyStatements({
  authorRelationship,
  acceptedStatementIds,
  onAcceptedStatementIdsChange,
}: {
  readonly authorRelationship: CaseStudyAuthorRelationship | "";
  readonly acceptedStatementIds: readonly CaseStudyStatementId[];
  readonly onAcceptedStatementIdsChange: (
    nextAcceptedStatementIds: readonly CaseStudyStatementId[],
  ) => void;
}) {
  if (authorRelationship === "") {
    return (
      <p className="text-sm text-muted-foreground">
        Answer How you know this, above, and the two statements that go with your answer appear
        here.
      </p>
    );
  }

  function toggleStatement(statementId: CaseStudyStatementId, nextIsChecked: boolean): void {
    onAcceptedStatementIdsChange(
      nextIsChecked
        ? [...acceptedStatementIds, statementId]
        : acceptedStatementIds.filter((acceptedStatementId) => acceptedStatementId !== statementId),
    );
  }

  return (
    <div>
      {CASE_STUDY_STATEMENT_IDS_BY_RELATIONSHIP[authorRelationship].map((statementId) => (
        <CheckboxRow
          key={statementId}
          label={CASE_STUDY_STATEMENTS[statementId].label}
          detail={CASE_STUDY_STATEMENTS[statementId].detail}
          isChecked={acceptedStatementIds.includes(statementId)}
          onCheckedChange={(nextIsChecked) => toggleStatement(statementId, nextIsChecked)}
        />
      ))}
    </div>
  );
}

/** Why Send is unavailable because of the answer or the statements, in words, or `null`. */
export function describeCaseStudyStatementGap(
  authorRelationship: CaseStudyAuthorRelationship | "",
  acceptedStatementIds: readonly CaseStudyStatementId[],
): string | null {
  if (authorRelationship === "") return "Answer How you know this before you send.";

  const untickedStatementIds = CASE_STUDY_STATEMENT_IDS_BY_RELATIONSHIP[authorRelationship].filter(
    (statementId) => !acceptedStatementIds.includes(statementId),
  );
  if (untickedStatementIds.length === 0) return null;

  return `Tick ${untickedStatementIds.length === 1 ? "the last statement" : "both statements"} below: ${untickedStatementIds
    .map((statementId) => CASE_STUDY_STATEMENTS[statementId].label)
    .join("; ")}.`;
}

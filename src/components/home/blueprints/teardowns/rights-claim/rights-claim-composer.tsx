// TRANSPORT: client-query — the teardown and its claim targets arrive from the route, which reads
// them from the backend; the claim itself is sent through `useSubmitRightsClaimMutation`.
//
// ⚠️ THE CLAIM TARGETS ARE A SEPARATE PROP BECAUSE THEY ARE A SEPARATE READ. A quarantined teardown
// reaches this page with its files withheld by the server, and the picker's options are exactly
// what a quarantine empties — see `claim-target-picker.tsx`.
"use client";

import Link from "next/link";
import ClaimTargetPicker from "@/components/home/blueprints/teardowns/rights-claim/claim-target-picker";
import PreparedNoticePanel from "@/components/home/blueprints/teardowns/rights-claim/prepared-notice-panel";
import RightsClaimReceipt from "@/components/home/blueprints/teardowns/rights-claim/rights-claim-receipt";
import { LabeledTextArea } from "@/components/home/blueprints/authoring/form-fields";
import {
  RightsClaimContactFields,
  RightsClaimErrorSummary,
  RightsClaimKindRadioGroup,
  RightsClaimRefusalNotice,
  RightsClaimSwornClauses,
} from "@/components/home/blueprints/teardowns/rights-claim/rights-claim-form-sections";
import {
  EDITING_WITHOUT_ERRORS,
  useRightsClaimComposerState,
} from "@/hooks/blueprints/use-rights-claim-composer-state";
import { readEmailedNoticeFallbackReason } from "@/lib/blueprints/rights-claim-refusal";
import type { TeardownBlueprint, TeardownClaimTargets } from "@/lib/blueprints/schemas";

export default function RightsClaimComposer({
  teardown,
  claimTargets,
}: {
  readonly teardown: TeardownBlueprint;
  readonly claimTargets: TeardownClaimTargets;
}) {
  const {
    formState,
    viewState,
    setViewState,
    teardownHref,
    isSubmitting,
    submitBlockedReason,
    fieldErrors,
    fieldErrorEntries,
    applyFormPatch,
    sendRightsClaim,
    handleSendClick,
    toggleSwornClause,
  } = useRightsClaimComposerState({ teardown, claimTargets });

  switch (viewState.status) {
    case "received":
      return (
        <RightsClaimReceipt
          receipt={viewState.receipt}
          notice={viewState.notice}
          teardownHref={teardownHref}
        />
      );
    case "refused": {
      const fallbackReason = readEmailedNoticeFallbackReason(viewState.refusal);
      if (fallbackReason !== null) {
        const { draft, notice } = viewState;
        return (
          <PreparedNoticePanel
            notice={notice}
            fallbackReason={fallbackReason}
            onRetrySubmit={() => sendRightsClaim(draft, notice)}
            onReviseNotice={() => setViewState(EDITING_WITHOUT_ERRORS)}
          />
        );
      }
      break;
    }
    case "editing":
    case "submitting":
      break;
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }

  return (
    <div className="max-w-2xl">
      <p className="text-xs font-medium tracking-wider text-primary-imprint uppercase">
        Report an IP concern
      </p>
      <h1 className="mt-1 text-xl font-medium text-foreground lg:text-2xl">
        Object to this teardown
      </h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        About{" "}
        <Link
          href={teardownHref}
          className="font-medium text-primary-imprint transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint"
        >
          {teardown.title}
        </Link>
        .
      </p>

      <div className="mt-4 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-medium text-foreground">This goes to a Qatoto moderator</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          You need to be signed in to send it. Your name and email are seen by Qatoto staff only,
          never by the person who published the teardown. If the site cannot take your claim, this
          page gives you the same notice to email instead.
        </p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Qatoto has not designated an agent for statutory copyright notices, so this reaches a
          person rather than being a formal filing.
        </p>
      </div>

      <fieldset disabled={isSubmitting} className="min-w-0">
        <section className="mt-6">
          <RightsClaimKindRadioGroup
            selectedKind={formState.claimKind}
            onSelectKind={(claimKind) => applyFormPatch({ claimKind })}
          />
        </section>

        <section className="mt-6">
          <ClaimTargetPicker
            claimTargets={claimTargets}
            selectedOptionKey={formState.targetOptionKey}
            onTargetSelect={(targetOptionKey, target) =>
              applyFormPatch({ targetOptionKey, target })
            }
          />
        </section>

        <section className="mt-6">
          <LabeledTextArea
            label="What do you own, and what here copies it?"
            value={formState.claimSubstance}
            onValueChange={(claimSubstance) => applyFormPatch({ claimSubstance })}
            rowCount={6}
            hint="This is the part somebody reads to decide anything. Name the patent, the registration, the drawing or the product, and say what in this teardown you say came from it."
            errorMessage={fieldErrors["claimSubstance"]?.join(" ") ?? null}
          />
        </section>

        <RightsClaimContactFields
          claimantFullName={formState.claimantFullName}
          claimantOrganizationName={formState.claimantOrganizationName}
          claimantEmail={formState.claimantEmail}
          relationshipToRightsHolder={formState.relationshipToRightsHolder}
          fieldErrors={fieldErrors}
          onUpdateField={(patch) => applyFormPatch(patch)}
        />

        <RightsClaimSwornClauses
          acceptedClauseIds={formState.acceptedSwornClauseIds}
          onToggleClause={toggleSwornClause}
        />
      </fieldset>

      {viewState.status === "refused" ? (
        <RightsClaimRefusalNotice
          refusal={viewState.refusal}
          onRetrySubmit={() => sendRightsClaim(viewState.draft, viewState.notice)}
        />
      ) : null}

      <RightsClaimErrorSummary fieldErrorEntries={fieldErrorEntries} />

      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border pt-5">
        <button
          type="button"
          onClick={handleSendClick}
          disabled={submitBlockedReason !== null || isSubmitting}
          className="rounded-full bg-primary-imprint px-5 py-2.5 text-sm font-medium text-primary-imprint-foreground transition-colors hover:bg-primary-imprint-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSubmitting ? "Sending…" : "Send to a moderator"}
        </button>
        {submitBlockedReason === null ? null : (
          <p className="max-w-md text-xs text-muted-foreground">{submitBlockedReason}</p>
        )}
      </div>
    </div>
  );
}

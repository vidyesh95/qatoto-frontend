"use client";

import { useState } from "react";
import { useSubmitRightsClaimMutation } from "@/hooks/blueprints/rights-claims";
import { useResettableAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";
import {
  buildRightsClaimNotice,
  describeClaimTarget,
  describeSwornClauseGap,
  resolveClaimTargetLabel,
  type RightsClaimNotice,
} from "@/lib/blueprints/rights-claim-notice";
import {
  classifyRightsClaimRefusal,
  type RightsClaimRefusal,
} from "@/lib/blueprints/rights-claim-refusal";
import {
  RightsClaimDraftSchema,
  type RightsClaimDraft,
  type RightsClaimKind,
  type RightsClaimReceipt as RightsClaimReceiptData,
  type RightsClaimSwornClauseId,
  type RightsClaimTarget,
} from "@/lib/blueprints/rights-claim.schemas";
import {
  buildBlueprintHref,
  type TeardownBlueprint,
  type TeardownClaimTargets,
} from "@/lib/blueprints/schemas";
import { SITE_URL } from "@/lib/site";

export interface RightsClaimFormState {
  readonly claimKind: RightsClaimKind;
  readonly targetOptionKey: string | null;
  readonly target: RightsClaimTarget | null;
  readonly claimantFullName: string;
  readonly claimantOrganizationName: string;
  readonly claimantEmail: string;
  readonly relationshipToRightsHolder: string;
  readonly claimSubstance: string;
  readonly acceptedSwornClauseIds: readonly RightsClaimSwornClauseId[];
}

export const EMPTY_FORM_STATE: RightsClaimFormState = {
  claimKind: "copyright_cad",
  targetOptionKey: null,
  target: null,
  claimantFullName: "",
  claimantOrganizationName: "",
  claimantEmail: "",
  relationshipToRightsHolder: "",
  claimSubstance: "",
  acceptedSwornClauseIds: [],
};

export type RightsClaimComposerViewState =
  | { readonly status: "editing"; readonly fieldErrors: Readonly<Record<string, string[]>> }
  | {
      readonly status: "submitting";
      readonly draft: RightsClaimDraft;
      readonly notice: RightsClaimNotice;
    }
  | {
      readonly status: "received";
      readonly receipt: RightsClaimReceiptData;
      readonly notice: RightsClaimNotice;
    }
  | {
      readonly status: "refused";
      readonly refusal: RightsClaimRefusal;
      readonly draft: RightsClaimDraft;
      readonly notice: RightsClaimNotice;
    };

export const EDITING_WITHOUT_ERRORS: RightsClaimComposerViewState = {
  status: "editing",
  fieldErrors: {},
};

export function readVisibleFieldErrors(
  viewState: RightsClaimComposerViewState,
): Readonly<Record<string, string[]>> {
  switch (viewState.status) {
    case "editing":
      return viewState.fieldErrors;
    case "refused":
      return viewState.refusal.kind === "fieldsRefused" ? viewState.refusal.fieldErrors : {};
    case "submitting":
    case "received":
      return {};
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}

export const RIGHTS_CLAIM_FIELD_LABELS_IN_PAGE_ORDER: readonly (readonly [string, string])[] = [
  ["claimKind", "What kind of right are you claiming?"],
  ["target", "What are you objecting to?"],
  ["claimSubstance", "What do you own, and what here copies it?"],
  ["claimantFullName", "Your name"],
  ["claimantOrganizationName", "Organisation"],
  ["claimantEmail", "Email we can reply to"],
  ["relationshipToRightsHolder", "Your standing"],
  ["acceptedSwornClauseIds", "What you are swearing"],
];

export function findRightsClaimFieldPosition(fieldPath: string): number {
  const [topLevelKey] = fieldPath.split(".");
  const position = RIGHTS_CLAIM_FIELD_LABELS_IN_PAGE_ORDER.findIndex(
    ([fieldKey]) => fieldKey === topLevelKey,
  );
  return position === -1 ? RIGHTS_CLAIM_FIELD_LABELS_IN_PAGE_ORDER.length : position;
}

export function describeRightsClaimFieldPath(fieldPath: string): string {
  const labelEntry =
    RIGHTS_CLAIM_FIELD_LABELS_IN_PAGE_ORDER[findRightsClaimFieldPosition(fieldPath)];
  if (labelEntry !== undefined) return labelEntry[1];
  return fieldPath === "form" ? "The notice" : fieldPath;
}

export function useRightsClaimComposerState({
  teardown,
  claimTargets,
}: {
  readonly teardown: TeardownBlueprint;
  readonly claimTargets: TeardownClaimTargets;
}) {
  const [formState, setFormState] = useState<RightsClaimFormState>(EMPTY_FORM_STATE);
  const [viewState, setViewState] = useState<RightsClaimComposerViewState>(EDITING_WITHOUT_ERRORS);
  const submitRightsClaimMutation = useSubmitRightsClaimMutation();
  const { getIdempotencyKey, resetIdempotencyKey } = useResettableAttemptIdempotencyKey();

  const teardownHref = buildBlueprintHref(teardown);
  const isSubmitting = viewState.status === "submitting" || submitRightsClaimMutation.isPending;

  function applyFormPatch(formPatch: Partial<RightsClaimFormState>): void {
    if (isSubmitting) return;
    setFormState((previousState) => ({ ...previousState, ...formPatch }));
    resetIdempotencyKey();
    setViewState(EDITING_WITHOUT_ERRORS);
  }

  function sendRightsClaim(draft: RightsClaimDraft, notice: RightsClaimNotice): void {
    if (submitRightsClaimMutation.isPending) return;
    setViewState({ status: "submitting", draft, notice });
    submitRightsClaimMutation.mutate(
      { teardownSlug: teardown.slug, draft, idempotencyKey: getIdempotencyKey() },
      {
        onSuccess: (result) => {
          if (result.success) {
            resetIdempotencyKey();
            setViewState({ status: "received", receipt: result.data, notice });
            return;
          }
          setViewState({
            status: "refused",
            refusal: classifyRightsClaimRefusal(result.error),
            draft,
            notice,
          });
        },
        onError: () => {
          setViewState({ status: "refused", refusal: { kind: "unreachable" }, draft, notice });
        },
      },
    );
  }

  const swornClauseGap = describeSwornClauseGap(formState.acceptedSwornClauseIds);
  const submitBlockedReason =
    formState.target === null ? "Pick what you are objecting to above." : swornClauseGap;

  const fieldErrors = readVisibleFieldErrors(viewState);
  const fieldErrorEntries = Object.entries(fieldErrors).toSorted(
    ([firstFieldPath], [secondFieldPath]) =>
      findRightsClaimFieldPosition(firstFieldPath) - findRightsClaimFieldPosition(secondFieldPath),
  );

  function handleSendClick(): void {
    const parsed = RightsClaimDraftSchema.safeParse({
      claimKind: formState.claimKind,
      target: formState.target,
      claimantFullName: formState.claimantFullName.trim(),
      claimantOrganizationName: formState.claimantOrganizationName.trim() || null,
      claimantEmail: formState.claimantEmail.trim(),
      relationshipToRightsHolder: formState.relationshipToRightsHolder.trim(),
      claimSubstance: formState.claimSubstance.trim(),
      acceptedSwornClauseIds: formState.acceptedSwornClauseIds,
    });

    if (!parsed.success) {
      const nextFieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const fieldPath = issue.path.join(".") || "form";
        nextFieldErrors[fieldPath] = [...(nextFieldErrors[fieldPath] ?? []), issue.message];
      }
      setViewState({ status: "editing", fieldErrors: nextFieldErrors });
      return;
    }

    sendRightsClaim(
      parsed.data,
      buildRightsClaimNotice({
        draft: parsed.data,
        teardownTitle: teardown.title,
        teardownUrl: `${SITE_URL}${teardownHref}`,
        targetLabel: describeClaimTarget(parsed.data.target, (target) =>
          resolveClaimTargetLabel(claimTargets, target),
        ),
        preparedAtIsoInstant: new Date().toISOString(),
      }),
    );
  }

  function toggleSwornClause(clauseId: RightsClaimSwornClauseId, nextIsChecked: boolean): void {
    applyFormPatch({
      acceptedSwornClauseIds: nextIsChecked
        ? [...formState.acceptedSwornClauseIds, clauseId]
        : formState.acceptedSwornClauseIds.filter(
            (acceptedClauseId) => acceptedClauseId !== clauseId,
          ),
    });
  }

  return {
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
  };
}

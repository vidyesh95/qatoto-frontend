"use client";

import { CheckboxRow, LabeledTextInput } from "@/components/home/blueprints/authoring/form-fields";
import type { RightsClaimRefusal } from "@/lib/blueprints/rights-claim-refusal";
import {
  RIGHTS_CLAIM_KIND_LABELS,
  RIGHTS_CLAIM_KIND_NOTES,
  RIGHTS_CLAIM_KINDS,
  RIGHTS_CLAIM_SWORN_CLAUSES,
  type RightsClaimKind,
  type RightsClaimSwornClauseId,
} from "@/lib/blueprints/rights-claim.schemas";
import { describeRightsClaimFieldPath } from "@/hooks/blueprints/use-rights-claim-composer-state";

const REFUSAL_NOTICE_CLASS =
  "mt-6 rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive";

export function RightsClaimRefusalNotice({
  refusal,
  onRetrySubmit,
}: {
  readonly refusal: RightsClaimRefusal;
  readonly onRetrySubmit: () => void;
}) {
  switch (refusal.kind) {
    case "notPermitted":
    case "claimAlreadyOpen":
      return (
        <div role="alert" className={REFUSAL_NOTICE_CLASS}>
          {refusal.message}
        </div>
      );
    case "teardownGone":
      return (
        <div role="alert" className={REFUSAL_NOTICE_CLASS}>
          This teardown is no longer available, so a claim cannot be sent against it here.
        </div>
      );
    case "replyUnreadable":
      return (
        <div role="alert" className={REFUSAL_NOTICE_CLASS}>
          Qatoto answered, but this page could not read the reply, so your claim may already be
          stored.{" "}
          <button
            type="button"
            onClick={onRetrySubmit}
            className="font-medium underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint"
          >
            Send it again
          </button>
          : if it arrived the first time, you will get the same receipt rather than a second claim.
        </div>
      );
    case "fieldsRefused":
    case "unreachable":
    case "rateLimited":
    case "signInRequired":
      return null;
    default: {
      const exhaustiveCheck: never = refusal;
      return exhaustiveCheck;
    }
  }
}

export function RightsClaimKindRadioGroup({
  selectedKind,
  onSelectKind,
}: {
  readonly selectedKind: RightsClaimKind;
  readonly onSelectKind: (kind: RightsClaimKind) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-foreground">
        What kind of right are you claiming?
      </legend>
      <div className="mt-2 space-y-2">
        {RIGHTS_CLAIM_KINDS.map((claimKind) => (
          <div key={claimKind}>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="radio"
                name="rights-claim-kind"
                value={claimKind}
                checked={selectedKind === claimKind}
                onChange={() => onSelectKind(claimKind)}
                className="mt-0.5 size-4 shrink-0 accent-primary-imprint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint"
              />
              <span className="text-sm font-medium text-foreground">
                {RIGHTS_CLAIM_KIND_LABELS[claimKind]}
              </span>
            </label>
            <p className="mt-0.5 ml-7 max-w-prose text-xs leading-5 text-muted-foreground">
              {RIGHTS_CLAIM_KIND_NOTES[claimKind]}
            </p>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

export function RightsClaimContactFields({
  claimantFullName,
  claimantOrganizationName,
  claimantEmail,
  relationshipToRightsHolder,
  fieldErrors,
  onUpdateField,
}: {
  readonly claimantFullName: string;
  readonly claimantOrganizationName: string;
  readonly claimantEmail: string;
  readonly relationshipToRightsHolder: string;
  readonly fieldErrors: Readonly<Record<string, string[]>>;
  readonly onUpdateField: (field: {
    readonly claimantFullName?: string;
    readonly claimantOrganizationName?: string;
    readonly claimantEmail?: string;
    readonly relationshipToRightsHolder?: string;
  }) => void;
}) {
  return (
    <section className="mt-6 grid gap-4 sm:grid-cols-2">
      <LabeledTextInput
        label="Your name"
        value={claimantFullName}
        onValueChange={(name) => onUpdateField({ claimantFullName: name })}
        errorMessage={fieldErrors["claimantFullName"]?.join(" ") ?? null}
      />
      <LabeledTextInput
        label="Organisation"
        value={claimantOrganizationName}
        onValueChange={(org) => onUpdateField({ claimantOrganizationName: org })}
        hint="Leave empty if you are claiming as an individual."
      />
      <LabeledTextInput
        label="Email we can reply to"
        inputType="text"
        value={claimantEmail}
        onValueChange={(email) => onUpdateField({ claimantEmail: email })}
        errorMessage={fieldErrors["claimantEmail"]?.join(" ") ?? null}
      />
      <LabeledTextInput
        label="Your standing"
        value={relationshipToRightsHolder}
        onValueChange={(standing) => onUpdateField({ relationshipToRightsHolder: standing })}
        placeholder="I own the patent / I am counsel for the owner"
        hint="Whether you own the right, or act for whoever does."
        errorMessage={fieldErrors["relationshipToRightsHolder"]?.join(" ") ?? null}
      />
    </section>
  );
}

export function RightsClaimSwornClauses({
  acceptedClauseIds,
  onToggleClause,
}: {
  readonly acceptedClauseIds: readonly RightsClaimSwornClauseId[];
  readonly onToggleClause: (clauseId: RightsClaimSwornClauseId, isChecked: boolean) => void;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-sm font-medium text-foreground">What you are swearing</h2>
      <p className="mt-1 max-w-prose text-xs text-muted-foreground">
        These three statements are sent with your claim, above your name. Qatoto has not checked any
        of them. They are what you are telling us, and they are what would let anyone act on this.
      </p>
      <div className="mt-3">
        {RIGHTS_CLAIM_SWORN_CLAUSES.map((clause) => (
          <CheckboxRow
            key={clause.id}
            label={clause.label}
            detail={clause.detail}
            isChecked={acceptedClauseIds.includes(clause.id)}
            onCheckedChange={(nextIsChecked) => onToggleClause(clause.id, nextIsChecked)}
          />
        ))}
      </div>
    </section>
  );
}

export function RightsClaimErrorSummary({
  fieldErrorEntries,
}: {
  readonly fieldErrorEntries: readonly (readonly [string, readonly string[]])[];
}) {
  if (fieldErrorEntries.length === 0) return null;

  return (
    <div
      role="alert"
      className="mt-6 space-y-1 rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
    >
      <p>This claim is not ready yet:</p>
      <ul className="list-inside list-disc text-xs">
        {fieldErrorEntries.map(([fieldPath, messages]) => {
          const fieldLabel = describeRightsClaimFieldPath(fieldPath);
          return (
            <li key={fieldPath}>
              <span className="font-medium">{fieldLabel}</span>
              {fieldLabel.endsWith("?") ? " " : ": "}
              {messages.join(" ")}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// TRANSPORT: props-only — the teardown arrives from the route, which reads
// `@/lib/blueprints/api`. THIS COMPONENT SENDS NOTHING AND FETCHES NOTHING: it composes a document
// the claimant sends themselves.
"use client";

import Link from "next/link";
import { useState } from "react";

import ClaimTargetPicker, {
  resolveClaimTargetLabel,
} from "@/components/home/blueprints/teardowns/rights-claim/claim-target-picker";
import PreparedNoticePanel from "@/components/home/blueprints/teardowns/rights-claim/prepared-notice-panel";
import {
  CheckboxRow,
  LabeledTextArea,
  LabeledTextInput,
} from "@/components/home/blueprints/teardowns/authoring/wizard-fields";
import {
  buildRightsClaimNotice,
  describeClaimTarget,
  describeSwornClauseGap,
  type RightsClaimNotice,
} from "@/lib/blueprints/rights-claim-notice";
import {
  RIGHTS_CLAIM_KIND_LABELS,
  RIGHTS_CLAIM_KIND_NOTES,
  RIGHTS_CLAIM_KINDS,
  RIGHTS_CLAIM_SWORN_CLAUSES,
  RightsClaimDraftSchema,
  type RightsClaimKind,
  type RightsClaimSwornClauseId,
  type RightsClaimTarget,
} from "@/lib/blueprints/rights-claim.schemas";
import { buildBlueprintHref, type TeardownBlueprint } from "@/lib/blueprints/schemas";
import { SITE_URL } from "@/lib/site";

/**
 * Held as text, parsed once when the notice is prepared — the `weight-band-editor.tsx` rule that
 * `collectTeardownSubmission` also follows. `target` is the exception: a union cannot be half-typed,
 * so it is either chosen or `null`.
 */
interface RightsClaimFormState {
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

const EMPTY_FORM_STATE: RightsClaimFormState = {
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

/**
 * Report an intellectual property concern about a teardown.
 *
 * ⚠️ ONE PAGE, NOT STEPPED, which departs from the three-step `factory-inquiry-composer.tsx` on the
 * same route shape. A legal notice is a document somebody signs, and stepping it would put the sworn
 * statements behind a Next button — letting a claimant arrive at "swear to this" with the claim they
 * are swearing to scrolled off-screen. An inquiry has no such property; this does.
 *
 * ⚠️ IT NEVER CALLS A MUTATION. There is no `blueprint_rights_claim` table and this part does not
 * add one, so instead of a mock write with a disclosure — which is what the publishing wizard does —
 * the flow ends on a prepared notice the claimant sends from their own mail client. Nothing they
 * type reaches a Qatoto server, and no screen here claims otherwise.
 */
export default function RightsClaimComposer({
  teardown,
}: {
  readonly teardown: TeardownBlueprint;
}) {
  const [formState, setFormState] = useState<RightsClaimFormState>(EMPTY_FORM_STATE);
  const [preparedNotice, setPreparedNotice] = useState<RightsClaimNotice | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Readonly<Record<string, string[]>>>({});

  const teardownHref = buildBlueprintHref(teardown);

  function applyFormPatch(formPatch: Partial<RightsClaimFormState>): void {
    setFormState((previousState) => ({ ...previousState, ...formPatch }));
    // A verdict from a draft that no longer exists reads as the fix not having worked — the same
    // rule the publishing wizard learned.
    setFieldErrors({});
  }

  if (preparedNotice !== null) {
    return (
      <PreparedNoticePanel notice={preparedNotice} onReviseNotice={() => setPreparedNotice(null)} />
    );
  }

  const swornClauseGap = describeSwornClauseGap(formState.acceptedSwornClauseIds);
  const prepareBlockedReason =
    formState.target === null ? "Pick what you are objecting to above." : swornClauseGap;

  const fieldErrorEntries = Object.entries(fieldErrors);

  function handlePrepareClick(): void {
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
      setFieldErrors(nextFieldErrors);
      return;
    }

    setFieldErrors({});
    setPreparedNotice(
      buildRightsClaimNotice({
        draft: parsed.data,
        teardownTitle: teardown.title,
        // ABSOLUTE, because a relative path in an email is useless to whoever opens it.
        teardownUrl: `${SITE_URL}${teardownHref}`,
        targetLabel: describeClaimTarget(parsed.data.target, (target) =>
          resolveClaimTargetLabel(teardown, target),
        ),
        // Read here rather than inside the builder, which stays pure and deterministic.
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

  return (
    <div className="max-w-2xl">
      <p className="text-[11px] font-medium tracking-[0.5px] text-[#00696E] uppercase">
        Report an IP concern
      </p>
      <h1 className="mt-1 text-xl font-medium text-foreground lg:text-2xl">
        Object to this teardown
      </h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        About{" "}
        <Link
          href={teardownHref}
          className="font-medium text-[#00696E] transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E]"
        >
          {teardown.title}
        </Link>
        .
      </p>

      {/*
        ⚠️ SAID BEFORE THE FORM, NOT AFTER IT. A claimant who fills eight fields and then learns
        Qatoto is not receiving this has been wasting a different kind of time from one who knows at
        the top. It is repeated on the prepared notice because that is the screen where it decides
        what they do next.
      */}
      <div className="mt-4 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-medium text-foreground">
          This form writes your notice; you send it
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Qatoto cannot yet receive claims through the site. This page turns your answers into a
          complete notice, and then you send it from your own email — so nothing depends on us
          having stored it, and you keep the record of when you gave notice.
        </p>
      </div>

      <section className="mt-6">
        <fieldset>
          <legend className="text-xs font-medium text-[#6F7979]">
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
                    checked={formState.claimKind === claimKind}
                    onChange={() => applyFormPatch({ claimKind })}
                    className="mt-0.5 size-4 shrink-0 accent-[#00696E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E]"
                  />
                  <span className="text-sm font-medium text-foreground">
                    {RIGHTS_CLAIM_KIND_LABELS[claimKind]}
                  </span>
                </label>
                {/*
                  The plain-language note under every option, always visible rather than on the
                  selected one only: choosing between four requires reading all four.
                */}
                <p className="mt-0.5 ml-7 max-w-prose text-xs leading-5 text-muted-foreground">
                  {RIGHTS_CLAIM_KIND_NOTES[claimKind]}
                </p>
              </div>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="mt-6">
        <ClaimTargetPicker
          teardown={teardown}
          selectedOptionKey={formState.targetOptionKey}
          onTargetSelect={(targetOptionKey, target) => applyFormPatch({ targetOptionKey, target })}
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

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <LabeledTextInput
          label="Your name"
          value={formState.claimantFullName}
          onValueChange={(claimantFullName) => applyFormPatch({ claimantFullName })}
          errorMessage={fieldErrors["claimantFullName"]?.join(" ") ?? null}
        />
        <LabeledTextInput
          label="Organisation"
          value={formState.claimantOrganizationName}
          onValueChange={(claimantOrganizationName) => applyFormPatch({ claimantOrganizationName })}
          hint="Leave empty if you are claiming as an individual."
        />
        <LabeledTextInput
          label="Email we can reply to"
          inputType="text"
          value={formState.claimantEmail}
          onValueChange={(claimantEmail) => applyFormPatch({ claimantEmail })}
          errorMessage={fieldErrors["claimantEmail"]?.join(" ") ?? null}
        />
        <LabeledTextInput
          label="Your standing"
          value={formState.relationshipToRightsHolder}
          onValueChange={(relationshipToRightsHolder) =>
            applyFormPatch({ relationshipToRightsHolder })
          }
          placeholder="I own the patent / I am counsel for the owner"
          hint="Whether you own the right, or act for whoever does."
          errorMessage={fieldErrors["relationshipToRightsHolder"]?.join(" ") ?? null}
        />
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-foreground">What you are swearing</h2>
        <p className="mt-1 max-w-prose text-xs text-muted-foreground">
          These three statements go into the notice above your name. Qatoto has not checked any of
          them — they are what you are telling us, and they are what would let anyone act on this.
        </p>
        <div className="mt-3">
          {RIGHTS_CLAIM_SWORN_CLAUSES.map((clause) => (
            <CheckboxRow
              key={clause.id}
              label={clause.label}
              detail={clause.detail}
              isChecked={formState.acceptedSwornClauseIds.includes(clause.id)}
              onCheckedChange={(nextIsChecked) => toggleSwornClause(clause.id, nextIsChecked)}
            />
          ))}
        </div>
      </section>

      {fieldErrorEntries.length > 0 ? (
        <div
          role="alert"
          className="mt-6 space-y-1 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          <p>This notice is not ready yet:</p>
          <ul className="list-inside list-disc text-xs">
            {fieldErrorEntries.map(([fieldPath, messages]) => (
              <li key={fieldPath}>
                <span className="font-medium">{fieldPath}</span>: {messages.join(" ")}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border pt-5">
        <button
          type="button"
          onClick={handlePrepareClick}
          disabled={prepareBlockedReason !== null}
          className="rounded-full bg-[#00696E] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#00393C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Write my notice
        </button>
        {prepareBlockedReason === null ? null : (
          <p className="max-w-md text-xs text-muted-foreground">{prepareBlockedReason}</p>
        )}
      </div>
    </div>
  );
}

// TRANSPORT: client-query — the teardown and its claim targets arrive from the route, which reads
// them from the backend; the claim itself is sent through `useSubmitRightsClaimMutation`.
//
// ⚠️ THE CLAIM TARGETS ARE A SEPARATE PROP BECAUSE THEY ARE A SEPARATE READ. A quarantined teardown
// reaches this page with its files withheld by the server, and the picker's options are exactly
// what a quarantine empties — see `claim-target-picker.tsx`.
"use client";

import Link from "next/link";
import { useState } from "react";

import ClaimTargetPicker, {
  resolveClaimTargetLabel,
} from "@/components/home/blueprints/teardowns/rights-claim/claim-target-picker";
import PreparedNoticePanel from "@/components/home/blueprints/teardowns/rights-claim/prepared-notice-panel";
import RightsClaimReceipt from "@/components/home/blueprints/teardowns/rights-claim/rights-claim-receipt";
import {
  CheckboxRow,
  LabeledTextArea,
  LabeledTextInput,
} from "@/components/home/blueprints/authoring/form-fields";
import { useSubmitRightsClaimMutation } from "@/hooks/blueprints/rights-claims";
import { useResettableAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";
import {
  buildRightsClaimNotice,
  describeClaimTarget,
  describeSwornClauseGap,
  type RightsClaimNotice,
} from "@/lib/blueprints/rights-claim-notice";
import {
  classifyRightsClaimRefusal,
  readEmailedNoticeFallbackReason,
  type RightsClaimRefusal,
} from "@/lib/blueprints/rights-claim-refusal";
import {
  RIGHTS_CLAIM_KIND_LABELS,
  RIGHTS_CLAIM_KIND_NOTES,
  RIGHTS_CLAIM_KINDS,
  RIGHTS_CLAIM_SWORN_CLAUSES,
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

/**
 * Held as text, parsed once when the notice is prepared — the `commerce/freight/weight-band-editor.tsx` rule that
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
 * WHERE THE CLAIM IS, as one union rendered by an exhaustive switch (CLAUDE.md Pattern 1).
 *
 * `submitting` and `refused` carry the parsed DRAFT and its NOTICE because both are needed after
 * the form's text may have moved on: a retry resends exactly what was refused, under the same
 * idempotency key, and the emailed fallback is built from the same draft rather than re-parsed.
 */
type RightsClaimComposerViewState =
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

const EDITING_WITHOUT_ERRORS: RightsClaimComposerViewState = { status: "editing", fieldErrors: {} };

/** The field-level messages the summary box lists, from a local parse or a server 422. */
function readVisibleFieldErrors(
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

const REFUSAL_NOTICE_CLASS =
  "mt-6 rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive";

/**
 * The refusals that keep the claimant on the form. The three with an emailed fallback replace the
 * form instead (`PreparedNoticePanel`), and a 422 is listed in the summary box beside its fields.
 */
function RightsClaimRefusalNotice({
  refusal,
  onRetrySubmit,
}: {
  readonly refusal: RightsClaimRefusal;
  readonly onRetrySubmit: () => void;
}) {
  switch (refusal.kind) {
    case "notPermitted":
    case "claimAlreadyOpen":
      // The server's own sentence: it names the reason ("you published this teardown", "you
      // already have an open claim") better than a paraphrase here could.
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

/**
 * The on-screen label for every path `RightsClaimDraftSchema` can name, IN THE ORDER THE PAGE ASKS.
 *
 * ⚠️ IT EXISTS BECAUSE THE ERROR BOX PRINTED THE SCHEMA'S NAMES. "claimantFullName: A notice has to
 * say who is making it." puts a variable name in front of a sentence written for a rights holder, and
 * the list came in schema order, so the claim text the page asks for first was reported last. The
 * teardown wizard's `describeTeardownFieldPath` fixes the same thing there.
 */
const RIGHTS_CLAIM_FIELD_LABELS_IN_PAGE_ORDER: readonly (readonly [string, string])[] = [
  ["claimKind", "What kind of right are you claiming?"],
  ["target", "What are you objecting to?"],
  ["claimSubstance", "What do you own, and what here copies it?"],
  ["claimantFullName", "Your name"],
  ["claimantOrganizationName", "Organisation"],
  ["claimantEmail", "Email we can reply to"],
  ["relationshipToRightsHolder", "Your standing"],
  ["acceptedSwornClauseIds", "What you are swearing"],
];

/** Where a path's field sits on the page; a nested path (`target.documentId`) sits with its parent. */
function findRightsClaimFieldPosition(fieldPath: string): number {
  const [topLevelKey] = fieldPath.split(".");
  const position = RIGHTS_CLAIM_FIELD_LABELS_IN_PAGE_ORDER.findIndex(
    ([fieldKey]) => fieldKey === topLevelKey,
  );
  return position === -1 ? RIGHTS_CLAIM_FIELD_LABELS_IN_PAGE_ORDER.length : position;
}

/** A path as the label the claimant sees; an unmapped path falls back to itself rather than nothing. */
function describeRightsClaimFieldPath(fieldPath: string): string {
  const labelEntry =
    RIGHTS_CLAIM_FIELD_LABELS_IN_PAGE_ORDER[findRightsClaimFieldPosition(fieldPath)];
  if (labelEntry !== undefined) return labelEntry[1];
  return fieldPath === "form" ? "The notice" : fieldPath;
}

/**
 * Report an intellectual property concern about a teardown.
 *
 * ⚠️ ONE PAGE, NOT STEPPED, which departs from the three-step `factory-inquiry-composer.tsx` on the
 * same route shape. A legal notice is a document somebody signs, and stepping it would put the sworn
 * statements behind a Next button — letting a claimant arrive at "swear to this" with the claim they
 * are swearing to scrolled off-screen. An inquiry has no such property; this does.
 *
 * ⚠️ IT SENDS THE CLAIM, AND IT STILL HANDS OVER THE NOTICE WHEN IT CANNOT. A 201 ends on a
 * receipt; a refusal the claimant cannot fix from this page (no connection, a server error, a rate
 * limit, no session) ends on the emailed notice, so a legal notice never depends on the API being
 * up. Nothing is optimistic: the receipt renders only from the server's answer.
 *
 * ⚠️ ONE IDEMPOTENCY KEY PER ATTEMPT. It rotates on any edit, because the server fingerprints the
 * body and a corrected claim under the old key is a 409; and after a success. It does NOT rotate on
 * a refusal, so "Send it again" after a dropped connection is the same attempt, and the form is
 * disabled while a send is in flight so a keystroke cannot turn one attempt into two.
 */
export default function RightsClaimComposer({
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
    // The fieldset is disabled mid-send too; this is the guard that does not depend on markup.
    if (isSubmitting) return;
    setFormState((previousState) => ({ ...previousState, ...formPatch }));
    // A new body is a new attempt: under the old key the server would answer 409 for a replay.
    resetIdempotencyKey();
    // A verdict from a draft that no longer exists reads as the fix not having worked — the same
    // rule the publishing wizard learned.
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
        // `sendJson` returns failures as values; a throw here is something below it breaking.
        onError: () => {
          setViewState({ status: "refused", refusal: { kind: "unreachable" }, draft, notice });
        },
      },
    );
  }

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

  const swornClauseGap = describeSwornClauseGap(formState.acceptedSwornClauseIds);
  const submitBlockedReason =
    formState.target === null ? "Pick what you are objecting to above." : swornClauseGap;

  const fieldErrors = readVisibleFieldErrors(viewState);
  // In page order, so the list reads top to bottom the way the form does.
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
      // Built now, from the parsed draft: it is the receipt's copy-for-your-records text and the
      // emailed fallback, and both must say exactly what was sent.
      buildRightsClaimNotice({
        draft: parsed.data,
        teardownTitle: teardown.title,
        // ABSOLUTE, because a relative path in an email is useless to whoever opens it.
        teardownUrl: `${SITE_URL}${teardownHref}`,
        targetLabel: describeClaimTarget(parsed.data.target, (target) =>
          resolveClaimTargetLabel(claimTargets, target),
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

      {/*
        ⚠️ SAID BEFORE THE FORM, NOT AFTER IT. Who sees the claimant's name, that it needs an
        account, and that it is not a statutory filing are all things a claimant should know before
        typing eight fields, not after.
      */}
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

      {/*
        DISABLED WHILE A SEND IS IN FLIGHT. `applyFormPatch` refuses edits then too; this is what
        makes that visible rather than a form that silently ignores typing.
      */}
      <fieldset disabled={isSubmitting} className="min-w-0">
        <section className="mt-6">
          <fieldset>
            {/* A section heading, like "What you are swearing" below, not a 12px grey field label:
              this and the target picker are the two main questions the notice turns on. */}
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
                      checked={formState.claimKind === claimKind}
                      onChange={() => applyFormPatch({ claimKind })}
                      className="mt-0.5 size-4 shrink-0 accent-primary-imprint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint"
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
            onValueChange={(claimantOrganizationName) =>
              applyFormPatch({ claimantOrganizationName })
            }
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
            These three statements are sent with your claim, above your name. Qatoto has not checked
            any of them. They are what you are telling us, and they are what would let anyone act on
            this.
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
      </fieldset>

      {viewState.status === "refused" ? (
        <RightsClaimRefusalNotice
          refusal={viewState.refusal}
          onRetrySubmit={() => sendRightsClaim(viewState.draft, viewState.notice)}
        />
      ) : null}

      {fieldErrorEntries.length > 0 ? (
        <div
          role="alert"
          className="mt-6 space-y-1 rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <p>This claim is not ready yet:</p>
          <ul className="list-inside list-disc text-xs">
            {fieldErrorEntries.map(([fieldPath, messages]) => (
              <li key={fieldPath}>
                {/* A label that is already a question takes no colon: "copies it?: Say what" read as
                    a typo. Every other label keeps one. */}
                <span className="font-medium">{describeRightsClaimFieldPath(fieldPath)}</span>
                {describeRightsClaimFieldPath(fieldPath).endsWith("?") ? " " : ": "}
                {messages.join(" ")}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

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

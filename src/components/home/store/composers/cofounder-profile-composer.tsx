// TRANSPORT: client-query — writes POST /commerce/cofounder-profiles.
"use client";

// LISTING YOURSELF. Three steps, then a draft.
//
// YOU DESCRIBE YOURSELF AND NOBODY ELSE. There is no route by which one person lists another, and
// there must not be — a directory of people who did not consent to being in it is a different product
// with a different legal shape.
//
// IT CREATES A DRAFT AND MAKES NOBODY DISCOVERABLE. The row comes back `state: "draft"`, publishing
// is a separate act behind review, and the success screen says so. "You are now listed" would be the
// wrong sentence in the way that matters most: somebody would stop looking.
//
// THREE CONTRACT RULES SHAPE THE FORM:
//
//  1. THE CAPITAL RANGE IS BOTH-OR-NEITHER, AND IT NEEDS A CURRENCY. Half a range is not "a floor
//     with no ceiling", it is unanswerable, and a figure without a currency cannot be read. All three
//     travel together or none of them does.
//  2. A BLANK NUMBER IS OMITTED, NEVER ZERO. `0` capital publishes an offer of nothing; `0` basis
//     points publishes an expectation of no stake. Neither is what a blank field means.
//  3. AT LEAST ONE CONTRIBUTION IS REQUIRED. A profile that claims nothing is unfilterable, which
//     means nobody finds it — so it is refused at the form rather than published into silence.
//
// IDEMPOTENCY KEY MINTED ONCE, held in a ref. A fresh key per retry is a duplicate profile of the
// same person.

import { useState } from "react";

import Link from "next/link";

import {
  ChipMultiSelectField,
  ComposerStepRail,
  IntegerField,
  SelectField,
  TextAreaField,
  TextField,
  TokenListField,
} from "@/components/commerce/composer/composer-fields";
import {
  toOptionalCents,
  toOptionalCountryCode,
  toOptionalCurrencyCode,
  toOptionalNonNegativeInteger,
  toOptionalPairedRange,
  toOptionalText,
} from "@/components/commerce/composer/composer-input";
import { useCreateCofounderProfile } from "@/hooks/store/cofounders";
import { useAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";
import {
  COFOUNDER_COMMITMENT_LABELS,
  COFOUNDER_COMMITMENT_LEVELS,
  COFOUNDER_CONTRIBUTION_KINDS,
  COFOUNDER_CONTRIBUTION_LABELS,
  type CofounderCommitmentLevel,
  type CofounderContributionKind,
  type CreateCofounderProfileInput,
} from "@/lib/store/cofounders.schemas";

const COMPOSER_STEPS = [
  { id: "you", label: "You" },
  { id: "terms", label: "What you bring" },
  { id: "review", label: "Review" },
] as const;

interface CofounderProfileDraft {
  headline: string;
  bio: string;
  countryCode: string;
  contributionKinds: readonly CofounderContributionKind[];
  commitmentLevel: CofounderCommitmentLevel;
  capitalMinimumMajorUnits: string;
  capitalMaximumMajorUnits: string;
  currency: string;
  equityExpectationPercent: string;
  lookingFor: string;
  sectors: readonly string[];
}

const EMPTY_DRAFT: CofounderProfileDraft = {
  headline: "",
  bio: "",
  countryCode: "",
  contributionKinds: [],
  commitmentLevel: "part_time",
  capitalMinimumMajorUnits: "",
  capitalMaximumMajorUnits: "",
  currency: "USD",
  equityExpectationPercent: "",
  lookingFor: "",
  sectors: [],
};

const CONTRIBUTION_OPTIONS = COFOUNDER_CONTRIBUTION_KINDS.map((contributionKind) => ({
  value: contributionKind,
  label: COFOUNDER_CONTRIBUTION_LABELS[contributionKind],
}));

const COMMITMENT_OPTIONS = COFOUNDER_COMMITMENT_LEVELS.map((commitmentLevel) => ({
  value: commitmentLevel,
  label: COFOUNDER_COMMITMENT_LABELS[commitmentLevel],
}));

export default function CofounderProfileComposer() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [draft, setDraft] = useState<CofounderProfileDraft>(EMPTY_DRAFT);
  const getIdempotencyKey = useAttemptIdempotencyKey();
  const createCofounderProfile = useCreateCofounderProfile();

  const applyDraftPatch = (draftPatch: Partial<CofounderProfileDraft>) => {
    setDraft((previousDraft) => ({ ...previousDraft, ...draftPatch }));
  };

  const createResult = createCofounderProfile.data;

  if (createResult !== undefined && createResult.success) {
    return <CreatedProfilePanel />;
  }

  const input = buildCreateCofounderProfileInput(draft);
  const missingRequirements = collectMissingRequirements(draft);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-serif text-xl font-semibold text-foreground md:text-2xl">
          List yourself as a cofounder
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          This saves a draft. Nobody can see it and nobody can find you until it is published.
        </p>
      </header>

      <ComposerStepRail
        steps={COMPOSER_STEPS}
        currentStepIndex={currentStepIndex}
        onStepSelect={setCurrentStepIndex}
      />

      <section aria-label={COMPOSER_STEPS[currentStepIndex]?.label ?? "Step"}>
        {renderStep()}
      </section>

      <footer className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        {currentStepIndex > 0 && (
          <button
            type="button"
            onClick={() => setCurrentStepIndex(currentStepIndex - 1)}
            className="cursor-pointer rounded-full bg-background px-4 py-2 text-sm font-medium text-foreground outline -outline-offset-1 outline-border"
          >
            Back
          </button>
        )}
        {currentStepIndex < COMPOSER_STEPS.length - 1 && (
          <button
            type="button"
            onClick={() => setCurrentStepIndex(currentStepIndex + 1)}
            className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Next
          </button>
        )}
        {currentStepIndex === COMPOSER_STEPS.length - 1 && (
          <button
            type="button"
            disabled={input === null || createCofounderProfile.isPending}
            onClick={() => {
              if (input === null) return;
              createCofounderProfile.mutate({ input, idempotencyKey: getIdempotencyKey() });
            }}
            className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
          >
            {createCofounderProfile.isPending ? "Saving…" : "Save as draft"}
          </button>
        )}
      </footer>

      {createResult !== undefined && !createResult.success && (
        <p className="text-xs leading-4 text-destructive">{createResult.error.message}</p>
      )}
      {createCofounderProfile.isError && (
        <p className="text-xs leading-4 text-destructive">
          Couldn&apos;t reach the server. Pressing save again is safe — the request carries an
          idempotency key, so a retry cannot create a second profile.
        </p>
      )}
    </div>
  );

  function renderStep() {
    const step = COMPOSER_STEPS[currentStepIndex];
    if (step === undefined) return null;

    const stepId = step.id;

    switch (stepId) {
      case "you":
        return (
          <div className="space-y-3">
            <TextField
              label="One line about you"
              hint="What a founder gets by working with you. Specific beats impressive."
              value={draft.headline}
              onValueChange={(headline) => applyDraftPatch({ headline })}
              placeholder="Fifteen years of cold-chain operations, and a cheque."
              maxLength={200}
            />
            <TextAreaField
              label="The longer version"
              hint="Plain text. What you have actually done, not what you are interested in."
              value={draft.bio}
              onValueChange={(bio) => applyDraftPatch({ bio })}
              rows={8}
              maxLength={6000}
            />
            <TextField
              label="Country"
              hint="Two letters, e.g. NG, SG, PL. Where you are based, not where you will work."
              value={draft.countryCode}
              onValueChange={(countryCode) => applyDraftPatch({ countryCode })}
              maxLength={2}
            />
            <TextAreaField
              label="What you want from the other side"
              hint="Optional, and the most-read field on the page when it is filled in."
              value={draft.lookingFor}
              onValueChange={(lookingFor) => applyDraftPatch({ lookingFor })}
              rows={4}
              maxLength={2000}
            />
          </div>
        );
      case "terms":
        return (
          <div className="space-y-3">
            <ChipMultiSelectField
              label="What you bring"
              hint="Pick every one that is true. This is the filter people search with — a profile claiming nothing is a profile nobody finds."
              selectedValues={draft.contributionKinds}
              options={CONTRIBUTION_OPTIONS}
              onSelectedValuesChange={(contributionKinds) => applyDraftPatch({ contributionKinds })}
            />
            <SelectField
              label="How much of your time"
              value={draft.commitmentLevel}
              options={COMMITMENT_OPTIONS}
              onValueChange={(commitmentLevel) => applyDraftPatch({ commitmentLevel })}
            />

            <fieldset className="space-y-3 rounded-xl border border-border px-4 py-3">
              <legend className="px-1 text-xs font-medium text-muted-foreground">
                Capital, if you are putting any in
              </legend>
              {/* SAYS PLAINLY WHAT PUBLISHING A FIGURE DOES AND DOES NOT DO. Somebody typing a
                  number here should know it is unchecked and is not a commitment before they type
                  it, not after somebody holds them to it. */}
              <p className="text-[11px] leading-4 text-muted-foreground">
                Both ends or neither, plus a currency. Nobody verifies this and stating it commits
                you to nothing — it is there so people do not waste your time at the wrong size.
              </p>
              <TextField
                label="From"
                value={draft.capitalMinimumMajorUnits}
                onValueChange={(capitalMinimumMajorUnits) =>
                  applyDraftPatch({ capitalMinimumMajorUnits })
                }
                placeholder="50000"
                maxLength={20}
              />
              <TextField
                label="To"
                value={draft.capitalMaximumMajorUnits}
                onValueChange={(capitalMaximumMajorUnits) =>
                  applyDraftPatch({ capitalMaximumMajorUnits })
                }
                placeholder="250000"
                maxLength={20}
              />
              <TextField
                label="Currency"
                hint="Three letters."
                value={draft.currency}
                onValueChange={(currency) => applyDraftPatch({ currency })}
                maxLength={3}
              />
            </fieldset>

            <IntegerField
              label="Stake you are hoping for, as a whole percentage"
              hint="An opening expectation to negotiate from — not a holding, and not agreed by anybody. Leave blank if you have not decided."
              value={draft.equityExpectationPercent}
              onValueChange={(equityExpectationPercent) =>
                applyDraftPatch({ equityExpectationPercent })
              }
              placeholder="12"
            />

            <TokenListField
              label="Sectors"
              hint="One at a time. These are how people scan the list."
              values={draft.sectors}
              onValuesChange={(sectors) => applyDraftPatch({ sectors })}
              placeholder="Cold chain"
              maxEntries={8}
            />
          </div>
        );
      case "review":
        return (
          <div className="space-y-3">
            {missingRequirements.length > 0 ? (
              <div className="rounded-xl border border-destructive/40 px-4 py-3">
                <p className="text-sm font-medium text-foreground">Still needed</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs leading-4 text-muted-foreground">
                  {missingRequirements.map((requirement) => (
                    <li key={requirement}>{requirement}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="rounded-xl border border-border px-4 py-3">
                <p className="text-sm font-medium text-foreground">Ready to save as a draft</p>
                <p className="mt-1 text-xs leading-4 text-muted-foreground">
                  Saving puts this in your own drafts. It is not on the directory, nobody can search
                  for you, and publishing is a separate step behind review.
                </p>
              </div>
            )}
            <p className="text-[11px] leading-4 text-muted-foreground">
              Blank fields are left out entirely — a blank capital range is not an offer of zero,
              and a blank stake is not an expectation of none.
            </p>
          </div>
        );
      default: {
        const exhaustiveCheck: never = stepId;
        return exhaustiveCheck;
      }
    }
  }
}

/**
 * The draft as a request body, or `null` when a required field is missing.
 *
 * Conditional spreads rather than a strip-undefined helper — see the foot of `composer-input.ts` for
 * why that helper cannot exist without a cast.
 */
function buildCreateCofounderProfileInput(
  draft: CofounderProfileDraft,
): CreateCofounderProfileInput | null {
  const headline = toOptionalText(draft.headline);
  const bio = toOptionalText(draft.bio);
  const countryCode = toOptionalCountryCode(draft.countryCode);

  if (headline === undefined || bio === undefined || countryCode === undefined) return null;
  if (draft.contributionKinds.length === 0) return null;

  // BOTH ENDS AND A CURRENCY, or none of the three. `toOptionalPairedRange` also DROPS an inverted
  // pair rather than swapping it — a maximum below a minimum is a typo, and reordering it silently
  // would publish a range nobody chose.
  const capitalRange = toOptionalPairedRange(
    toOptionalCents(draft.capitalMinimumMajorUnits),
    toOptionalCents(draft.capitalMaximumMajorUnits),
  );
  const currency = toOptionalCurrencyCode(draft.currency);
  const hasCapitalRange = capitalRange !== undefined && currency !== undefined;

  // Typed as whole percent, sent as basis points. Multiplying at the boundary keeps the wire integer
  // and keeps the form readable — nobody types "1200" meaning twelve percent.
  const equityExpectationPercent = toOptionalNonNegativeInteger(draft.equityExpectationPercent);

  return {
    headline,
    bio,
    countryCode,
    contributionKinds: draft.contributionKinds,
    commitmentLevel: draft.commitmentLevel,
    ...(hasCapitalRange
      ? {
          capitalRangeMinInCents: capitalRange.minimum,
          capitalRangeMaxInCents: capitalRange.maximum,
          currency,
        }
      : {}),
    // `=== 0` is excluded alongside `undefined`: somebody who types 0 means "none", and the wire
    // field's absence says that better than an integer that renders as "hoping for 0%".
    ...(equityExpectationPercent === undefined || equityExpectationPercent === 0
      ? {}
      : { equityExpectationBasisPoints: equityExpectationPercent * 100 }),
    ...(toOptionalText(draft.lookingFor) === undefined
      ? {}
      : { lookingFor: toOptionalText(draft.lookingFor) }),
    ...(draft.sectors.length === 0 ? {} : { sectors: draft.sectors }),
  };
}

function collectMissingRequirements(draft: CofounderProfileDraft): string[] {
  const missing: string[] = [];
  if (toOptionalText(draft.headline) === undefined) missing.push("A one-line description of you.");
  if (toOptionalText(draft.bio) === undefined) missing.push("The longer version.");
  if (toOptionalCountryCode(draft.countryCode) === undefined) {
    missing.push("A two-letter country code.");
  }
  if (draft.contributionKinds.length === 0) {
    missing.push("At least one thing you bring — otherwise nobody can find you.");
  }

  const capitalMinimum = toOptionalCents(draft.capitalMinimumMajorUnits);
  const capitalMaximum = toOptionalCents(draft.capitalMaximumMajorUnits);
  const hasEitherEnd = capitalMinimum !== undefined || capitalMaximum !== undefined;

  // Named rather than silently dropped: half a range is a common mistake, and
  // `buildCreateCofounderProfileInput` would otherwise omit the whole thing without saying so.
  if (hasEitherEnd && (capitalMinimum === undefined || capitalMaximum === undefined)) {
    missing.push("Both ends of the capital range, or neither.");
  }
  if (
    capitalMinimum !== undefined &&
    capitalMaximum !== undefined &&
    capitalMaximum < capitalMinimum
  ) {
    missing.push("A capital maximum that is not below the minimum.");
  }
  if (hasEitherEnd && toOptionalCurrencyCode(draft.currency) === undefined) {
    missing.push("A three-letter currency for the capital range.");
  }

  return missing;
}

function CreatedProfilePanel() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-2xl text-primary">
        ✓
      </span>
      <p className="text-base font-medium text-foreground">Saved as a draft</p>
      {/* SAYS WHAT HAPPENED. Not listed, not searchable, nobody notified — the three things somebody
          would otherwise assume from a tick. */}
      <p className="text-sm text-muted-foreground">
        Only you can see this. You are not on the directory, nobody can search for you, and
        publishing is a separate step once it has been reviewed.
      </p>
      <Link
        href="/store/find-cofounder"
        className="mt-2 cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Back to the directory
      </Link>
    </div>
  );
}

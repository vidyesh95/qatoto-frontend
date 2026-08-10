// TRANSPORT: client-query — writes POST /community/cofounder-profiles.
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
// ─────────────────────────────────────────────────────────────────────────────
// THIS FORM USED TO ASK FOR A CAPITAL RANGE AND AN EQUITY EXPECTATION. IT NO LONGER DOES, AND
// PUTTING THEM BACK BREAKS PROFILE CREATION OUTRIGHT.
//
// Phase 19 shipped this surface WITHOUT those columns. §14's legal question — whether publishing
// what a person will invest, beside a contact affordance, is close to facilitating a securities
// solicitation — is open per market, so `community_cofounder_profile` has no `capital_range_*`, no
// `currency` and no `equity_expectation_basis_points`. The create schema is `.strict()` and
// answers **422** for any of them rather than accepting and discarding: silently dropping a number
// somebody typed about themselves would let them believe it had been recorded.
//
// So the fields are gone from the form, from `CreateCofounderProfileInput`, and from the
// requirements checker. Both wire fields still exist on the READ schemas, nullable, and serve
// `null` — a renderer shows an absence. If §14 lands, the columns arrive in one additive migration
// and this fieldset comes back with them.
// ─────────────────────────────────────────────────────────────────────────────
//
// TWO CONTRACT RULES STILL SHAPE THE FORM:
//
//  1. A BLANK FIELD IS OMITTED, NEVER SENT AS `null`, `""` OR `0`.
//  2. AT LEAST ONE CONTRIBUTION IS REQUIRED. A profile that claims nothing is unfilterable, which
//     means nobody finds it — so it is refused at the form rather than published into silence.
//
// IDEMPOTENCY KEY MINTED ONCE, held in a ref. A fresh key per retry is a duplicate profile of the
// same person — and `userId` is unique server-side, so the retry FAILS rather than duplicating.

import { useState } from "react";

import Link from "next/link";

import {
  ChipMultiSelectField,
  ComposerStepRail,
  SelectField,
  TextAreaField,
  TextField,
  TokenListField,
} from "@/components/commerce/composer/composer-fields";
import {
  toOptionalCountryCode,
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
  lookingFor: string;
  sectors: readonly string[];
}

const EMPTY_DRAFT: CofounderProfileDraft = {
  headline: "",
  bio: "",
  countryCode: "",
  contributionKinds: [],
  commitmentLevel: "part_time",
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

            {/* NO CAPITAL OR EQUITY FIELDS HERE — see the file header. There is no column behind
                either, and the backend answers 422 rather than discarding a figure, so adding one
                back would stop this form working at all. This note says so rather than leaving the
                absence to look like something nobody got round to. */}
            <p className="text-[11px] leading-4 text-muted-foreground">
              Qatoto does not collect what you are willing to invest or what stake you want. Those
              are things to discuss with a person, not to publish beside your name.
            </p>

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

  // NOTHING ABOUT CAPITAL OR EQUITY IS ASSEMBLED HERE, and the omission is load-bearing rather than
  // incidental. A conditional spread of `capitalRangeMinInCents` would typecheck — an object
  // literal spread skips excess-property checking, which is exactly how these four fields survived
  // being removed from `CreateCofounderProfileInput` without a compiler error — and then 422 at
  // runtime against the backend's `.strict()` schema, taking the whole write with it.
  return {
    headline,
    bio,
    countryCode,
    contributionKinds: draft.contributionKinds,
    commitmentLevel: draft.commitmentLevel,
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

  // The three capital checks that used to live here went with the fields. Both-or-neither, the
  // inverted-range check and the currency requirement were all about a triple this form no longer
  // collects.
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

// TRANSPORT: client-query — writes POST /commerce/providers/offerings.
"use client";

// THE PROVIDER'S LISTING COMPOSER. Three steps, then a draft.
//
// CREATING IS NOT PUBLISHING, AND THAT IS THE WHOLE SHAPE OF THIS PAGE. The row comes back
// `state: "draft"` — invisible in the directory, in search and in every category. Making it public takes two
// further acts that are not here: `POST /service-offerings/:id/submit` moves it to `pending_review`, and a
// moderator approves it. So nothing on the success screen says "live", "listed" or "published".
//
// TWO CONTRACT RULES SHAPE THE FORM, both from `CreateOfferingSchema`:
//
//  1. `providerKind` AND `detail.kind` ARE REFINED TO MATCH. One control sets both.
//  2. THE MONEY AND LEAD-TIME RANGES ARE PAIRED. `validatePairedRange` in the service and a Postgres CHECK
//     both refuse half a range, so an indicative minimum with no maximum is not "from X" — it is invalid.
//     Both are submitted as a pair or dropped as a pair.
//
// AND ONE THAT IS NOT A CONTRACT RULE BUT MATTERS MORE: A BLANK PRICE IS NOT ZERO. `quote_only` is the honest
// default for trade services, and a blank indicative range under any pricing model is omitted from the body
// rather than sent as `0`. Sending zero publishes a free service.

import { useState } from "react";

import Link from "next/link";

import {
  ComposerStepRail,
  IntegerField,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/commerce/composer/composer-fields";
import {
  toOptionalCents,
  toOptionalCurrencyCode,
  toOptionalNonNegativeInteger,
  toOptionalPairedRange,
  toOptionalText,
} from "@/components/commerce/composer/composer-input";
import ServiceOfferingDetailFields, {
  buildOfferingDetailInput,
  EMPTY_SERVICE_OFFERING_DETAIL_DRAFT,
  type ServiceOfferingDetailDraft,
} from "@/components/studio/commerce/services/service-offering-detail-fields";
import { useCreateServiceOffering } from "@/hooks/store/providers";
import { useAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";
import { PROVIDER_KIND_LABELS } from "@/lib/store/labels";
import {
  OFFERING_PRICING_MODEL_LABELS,
  SERVICE_PRICING_MODELS,
  type CreateServiceOfferingInput,
  type ServicePricingModel,
} from "@/lib/store/providers.schemas";
import { PROVIDER_KINDS, type ProviderKind } from "@/lib/store/shared.schemas";

const COMPOSER_STEPS = [
  { id: "basics", label: "What you offer" },
  { id: "capability", label: "Capability" },
  { id: "review", label: "Review" },
] as const;

interface OfferingComposerDraft {
  providerKind: ProviderKind;
  title: string;
  summary: string;
  pricingModel: ServicePricingModel;
  indicativePriceMinMajorUnits: string;
  indicativePriceMaxMajorUnits: string;
  currency: string;
  minimumLeadTimeDays: string;
  maximumLeadTimeDays: string;
  detail: ServiceOfferingDetailDraft;
}

const EMPTY_COMPOSER_DRAFT: OfferingComposerDraft = {
  providerKind: "freight_forwarder",
  title: "",
  summary: "",
  // `quote_only` is the honest default: most connector work is priced per job, and a provider who does have
  // a fixed fee will say so deliberately.
  pricingModel: "quote_only",
  indicativePriceMinMajorUnits: "",
  indicativePriceMaxMajorUnits: "",
  currency: "USD",
  minimumLeadTimeDays: "",
  maximumLeadTimeDays: "",
  detail: { ...EMPTY_SERVICE_OFFERING_DETAIL_DRAFT },
};

const PROVIDER_KIND_OPTIONS = PROVIDER_KINDS.map((providerKind) => ({
  value: providerKind,
  label: PROVIDER_KIND_LABELS[providerKind],
}));

const PRICING_MODEL_OPTIONS = SERVICE_PRICING_MODELS.map((pricingModel) => ({
  value: pricingModel,
  label: OFFERING_PRICING_MODEL_LABELS[pricingModel],
}));

export default function ServiceOfferingComposer() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [draft, setDraft] = useState<OfferingComposerDraft>(EMPTY_COMPOSER_DRAFT);
  // Lazily minted on first submit and reused across retries — see the hook for why it cannot be a
  // `useState` initializer here.
  const getIdempotencyKey = useAttemptIdempotencyKey();
  const createServiceOffering = useCreateServiceOffering();

  const applyDraftPatch = (draftPatch: Partial<OfferingComposerDraft>) => {
    setDraft((previousDraft) => ({ ...previousDraft, ...draftPatch }));
  };

  const createResult = createServiceOffering.data;
  if (createResult !== undefined && createResult.success) {
    return (
      <CreatedOfferingPanel
        offeringSlug={createResult.data.slug}
        offeringTitle={createResult.data.title}
        offeringState={createResult.data.state}
      />
    );
  }

  const input = buildCreateOfferingInput(draft);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-serif text-xl font-semibold text-foreground md:text-2xl">
          New service listing
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          This saves a draft. It is not listed until you submit it for review and a moderator
          approves it.
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
            disabled={input === null || createServiceOffering.isPending}
            onClick={() => {
              if (input === null) return;
              createServiceOffering.mutate({ input, idempotencyKey: getIdempotencyKey() });
            }}
            className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
          >
            {createServiceOffering.isPending ? "Saving…" : "Save as draft"}
          </button>
        )}
      </footer>

      {createResult !== undefined && !createResult.success && (
        <p className="text-xs leading-4 text-destructive">{createResult.error.message}</p>
      )}
      {createServiceOffering.isError && (
        <p className="text-xs leading-4 text-destructive">
          Couldn&apos;t reach the server. Pressing save again is safe — the request carries an
          idempotency key, so a retry cannot create a second listing.
        </p>
      )}
    </div>
  );

  function renderStep() {
    const step = COMPOSER_STEPS[currentStepIndex];
    if (step === undefined) return null;
    const stepId = step.id;

    switch (stepId) {
      case "basics":
        return (
          <div className="space-y-3">
            {/* ONE CONTROL FOR `providerKind`, which also sets `detail.kind`. The backend refines that they
                match, and the capability step's fields change with it. */}
            <SelectField
              label="Kind of service"
              hint="This decides which capability questions you are asked next."
              value={draft.providerKind}
              options={PROVIDER_KIND_OPTIONS}
              onValueChange={(providerKind) => applyDraftPatch({ providerKind })}
            />
            <TextField
              label="Listing title"
              value={draft.title}
              onValueChange={(title) => applyDraftPatch({ title })}
              maxLength={200}
            />
            <TextAreaField
              label="Summary"
              hint="What a buyer gets. If you price per unit, name the unit here."
              value={draft.summary}
              onValueChange={(summary) => applyDraftPatch({ summary })}
              rows={4}
              maxLength={4000}
            />
            <SelectField
              label="How this is priced"
              value={draft.pricingModel}
              options={PRICING_MODEL_OPTIONS}
              onValueChange={(pricingModel) => applyDraftPatch({ pricingModel })}
            />

            <p className="rounded-lg bg-muted px-3 py-2 text-xs leading-4 text-muted-foreground">
              An indicative range is optional and is not a quote. Give both ends or neither — one
              end alone is refused. Leaving both blank shows &ldquo;quoted per job&rdquo;, which is
              not the same as free.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <TextField
                label="Indicative from"
                value={draft.indicativePriceMinMajorUnits}
                onValueChange={(indicativePriceMinMajorUnits) =>
                  applyDraftPatch({ indicativePriceMinMajorUnits })
                }
              />
              <TextField
                label="Indicative to"
                value={draft.indicativePriceMaxMajorUnits}
                onValueChange={(indicativePriceMaxMajorUnits) =>
                  applyDraftPatch({ indicativePriceMaxMajorUnits })
                }
              />
              <TextField
                label="Currency"
                hint="Three letters."
                value={draft.currency}
                onValueChange={(currency) => applyDraftPatch({ currency })}
                maxLength={3}
              />
            </div>

            <p className="text-[11px] leading-4 text-muted-foreground">
              Lead time is a pair too. Blank means you have not said — it does not mean same day.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <IntegerField
                label="Fastest, in days"
                value={draft.minimumLeadTimeDays}
                onValueChange={(minimumLeadTimeDays) => applyDraftPatch({ minimumLeadTimeDays })}
              />
              <IntegerField
                label="Slowest, in days"
                value={draft.maximumLeadTimeDays}
                onValueChange={(maximumLeadTimeDays) => applyDraftPatch({ maximumLeadTimeDays })}
              />
            </div>
          </div>
        );

      case "capability":
        return (
          <div className="space-y-3">
            <p className="text-xs leading-4 text-muted-foreground">
              These answers are what buyers filter and search on, so every one of them is published.
            </p>
            <ServiceOfferingDetailFields
              providerKind={draft.providerKind}
              draft={draft.detail}
              onDraftChange={(detailPatch) =>
                applyDraftPatch({ detail: { ...draft.detail, ...detailPatch } })
              }
            />
          </div>
        );

      case "review":
        return <ReviewStep draft={draft} input={input} />;

      default: {
        const exhaustiveCheck: never = stepId;
        return exhaustiveCheck;
      }
    }
  }
}

/**
 * The draft as a request body, or `null` when it cannot legally be one.
 *
 * The paired ranges are the interesting part: a half-filled or inverted range is DROPPED, not sent and not
 * repaired. `toOptionalPairedRange` is where that happens, and the form warns before the submit rather than
 * after the refusal.
 */
function buildCreateOfferingInput(draft: OfferingComposerDraft): CreateServiceOfferingInput | null {
  const title = toOptionalText(draft.title);
  const detail = buildOfferingDetailInput(draft.providerKind, draft.detail);
  if (title === undefined || detail === null) return null;

  const summary = toOptionalText(draft.summary);
  const currency = toOptionalCurrencyCode(draft.currency);
  const priceRange = toOptionalPairedRange(
    toOptionalCents(draft.indicativePriceMinMajorUnits),
    toOptionalCents(draft.indicativePriceMaxMajorUnits),
  );
  const leadTimeRange = toOptionalPairedRange(
    toOptionalNonNegativeInteger(draft.minimumLeadTimeDays),
    toOptionalNonNegativeInteger(draft.maximumLeadTimeDays),
  );

  return {
    providerKind: draft.providerKind,
    title,
    pricingModel: draft.pricingModel,
    detail,
    ...(summary === undefined ? {} : { summary }),
    ...(currency === undefined ? {} : { currency }),
    ...(priceRange === undefined
      ? {}
      : {
          indicativePriceMinInCents: priceRange.minimum,
          indicativePriceMaxInCents: priceRange.maximum,
        }),
    ...(leadTimeRange === undefined
      ? {}
      : {
          minimumLeadTimeDays: leadTimeRange.minimum,
          maximumLeadTimeDays: leadTimeRange.maximum,
        }),
  };
}

function ReviewStep({
  draft,
  input,
}: {
  draft: OfferingComposerDraft;
  input: CreateServiceOfferingInput | null;
}) {
  const hasHalfFilledPriceRange = isHalfFilled(
    draft.indicativePriceMinMajorUnits,
    draft.indicativePriceMaxMajorUnits,
  );
  const hasHalfFilledLeadTime = isHalfFilled(draft.minimumLeadTimeDays, draft.maximumLeadTimeDays);

  return (
    <div className="space-y-3">
      {input === null ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-900">Not ready to save yet</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs leading-4 text-amber-900">
            {toOptionalText(draft.title) === undefined && <li>A listing title.</li>}
            {buildOfferingDetailInput(draft.providerKind, draft.detail) === null && (
              <li>
                The capability step is missing a required field for{" "}
                {PROVIDER_KIND_LABELS[draft.providerKind]}.
              </li>
            )}
          </ul>
        </div>
      ) : (
        <div className="rounded-xl border border-border px-4 py-3">
          <p className="text-sm font-medium text-foreground">{input.title}</p>
          <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
            {PROVIDER_KIND_LABELS[input.providerKind]} ·{" "}
            {OFFERING_PRICING_MODEL_LABELS[input.pricingModel]}
          </p>
          {/* SAYS WHEN THERE IS NO PRICE, rather than leaving a blank the reader fills in as "free". */}
          {input.indicativePriceMinInCents === undefined && (
            <p className="mt-1 text-xs leading-4 text-muted-foreground">
              No indicative price on this listing. Buyers will see that it is quoted per job.
            </p>
          )}
          {input.minimumLeadTimeDays === undefined && (
            <p className="text-xs leading-4 text-muted-foreground">No lead time given.</p>
          )}
        </div>
      )}

      {/* THE DROPPED-RANGE WARNINGS. Both fire on a body that will be accepted — which is exactly when a
          silent omission is dangerous, because the provider typed a figure and it is not being sent. */}
      {hasHalfFilledPriceRange && (
        <p className="text-xs leading-4 text-amber-900">
          Only one end of the indicative price is filled, so no price will be published at all. Fill
          both or clear both.
        </p>
      )}
      {hasHalfFilledLeadTime && (
        <p className="text-xs leading-4 text-amber-900">
          Only one end of the lead time is filled, so no lead time will be published at all.
        </p>
      )}
      {isInverted(draft.indicativePriceMinMajorUnits, draft.indicativePriceMaxMajorUnits) && (
        <p className="text-xs leading-4 text-amber-900">
          The highest indicative price is below the lowest, so the range will be left off rather
          than reordered for you.
        </p>
      )}

      <p className="text-[11px] leading-4 text-muted-foreground">
        Saving creates a draft only your organization can see. Submitting it for review is the next,
        separate step, and a moderator decides whether it is listed.
      </p>
    </div>
  );
}

function isHalfFilled(rawMinimum: string, rawMaximum: string): boolean {
  return (rawMinimum.trim() === "") !== (rawMaximum.trim() === "");
}

function isInverted(rawMinimum: string, rawMaximum: string): boolean {
  const minimum = Number(rawMinimum.trim());
  const maximum = Number(rawMaximum.trim());
  if (rawMinimum.trim() === "" || rawMaximum.trim() === "") return false;
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum)) return false;
  return maximum < minimum;
}

function CreatedOfferingPanel({
  offeringSlug,
  offeringTitle,
  offeringState,
}: {
  offeringSlug: string;
  offeringTitle: string;
  offeringState: string;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-2xl text-primary">
        ✓
      </span>
      <p className="text-base font-medium text-foreground">Saved as a draft</p>
      {/* READS THE SERVER'S OWN `state` rather than asserting one. If a future release starts returning
          something other than `draft`, this screen says so instead of contradicting it. */}
      <p className="text-sm text-muted-foreground">
        &ldquo;{offeringTitle}&rdquo; is saved with the state <strong>{offeringState}</strong>. It
        is not in the directory and no buyer can find it. Submitting it for review is a separate
        step, and a moderator decides whether it is listed.
      </p>
      {/* The public URL for a listing that is not public yet — so it is NOT offered as a link. A draft's
          `/store/services/:slug` is a 404 by design, and a button leading there would look like a bug. */}
      <p className="text-[11px] leading-4 text-muted-foreground">
        Once it is approved it will live at /store/services/{offeringSlug}.
      </p>
      <Link
        href="/studio/services"
        className="mt-2 cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Back to your services
      </Link>
    </div>
  );
}

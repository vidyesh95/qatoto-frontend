// TRANSPORT: client-query — writes POST /commerce/factories/:factorySlug/inquiries.
"use client";

// THE BUYER'S FIRST MESSAGE TO A FACTORY. Three steps, then a draft.
//
// IT CREATES A DRAFT AND NOTHING ELSE. The row comes back `state: "draft"`, the factory is not
// notified, and sending is a separate act with its own validation. So every word on the success
// screen says draft, and none say sent — the same rule `rfq-composer.tsx` states for RFQs, and for
// the same reason: a buyer who believes a message went out stops waiting for themselves to send it.
//
// TWO CONTRACT RULES SHAPE THE FORM:
//
//  1. `capabilityKind` IS REQUIRED. It is the one field that decides whether the inquiry is
//     answerable at all — someone who needs tooling writing to an assembly-only shop should learn
//     that from the form, not from three weeks of silence. It is pre-filled from the factory's own
//     capabilities rather than from the full enum, so the control cannot produce a combination this
//     factory has never claimed.
//  2. EVERY OTHER FIELD IS OPTIONAL AND A BLANK ONE IS OMITTED, never `null`, `""` or `0`. A `0`
//     target unit price asks the factory to work free; a `0` quantity asks for nothing.
//     `composer-input.ts` does that conversion, once, at submit.
//
// IDEMPOTENCY KEY MINTED ONCE, on first submit, held in a ref. A fresh key per retry is a second
// inquiry in the factory's queue for somebody to close by hand.

import { useState } from "react";

import Link from "next/link";

import {
  ChipMultiSelectField,
  ComposerStepRail,
  IntegerField,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/commerce/composer/composer-fields";
import {
  toOptionalCents,
  toOptionalCurrencyCode,
  toOptionalIsoInstant,
  toOptionalNonNegativeInteger,
  toOptionalText,
} from "@/components/commerce/composer/composer-input";
import { useCreateFactoryInquiry } from "@/hooks/store/factories";
import { useAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";
import {
  FACTORY_CAPABILITY_LABELS,
  FACTORY_CERTIFICATION_LABELS,
  FACTORY_CERTIFICATIONS,
  type CreateFactoryInquiryInput,
  type FactoryCapabilityKind,
  type FactoryCertification,
} from "@/lib/store/factories.schemas";

const COMPOSER_STEPS = [
  { id: "what", label: "What you need" },
  { id: "volume", label: "Volume & price" },
  { id: "review", label: "Review" },
] as const;

interface FactoryInquiryDraft {
  capabilityKind: FactoryCapabilityKind;
  productDescription: string;
  estimatedAnnualQuantity: string;
  unitLabel: string;
  targetUnitPriceMajorUnits: string;
  currency: string;
  requiredCertifications: readonly FactoryCertification[];
  desiredFirstDeliveryLocal: string;
  notes: string;
}

function buildEmptyDraft(defaultCapabilityKind: FactoryCapabilityKind): FactoryInquiryDraft {
  return {
    capabilityKind: defaultCapabilityKind,
    productDescription: "",
    estimatedAnnualQuantity: "",
    unitLabel: "",
    targetUnitPriceMajorUnits: "",
    // Pre-filled because a target price without a currency is unreadable, and `USD` is the platform
    // default everywhere else. It is still omitted from the body when no price was typed.
    currency: "USD",
    requiredCertifications: [],
    desiredFirstDeliveryLocal: "",
    notes: "",
  };
}

const CERTIFICATION_OPTIONS = FACTORY_CERTIFICATIONS.map((certification) => ({
  value: certification,
  label: FACTORY_CERTIFICATION_LABELS[certification],
}));

export default function FactoryInquiryComposer({
  factorySlug,
  factoryDisplayName,
  offeredCapabilityKinds,
}: {
  factorySlug: string;
  factoryDisplayName: string;
  /** This factory's OWN capabilities. The control offers these and not the full enum — see rule 1. */
  offeredCapabilityKinds: readonly FactoryCapabilityKind[];
}) {
  // A factory with no declared capability still needs a usable form, so `oem` is the fallback: it is
  // the least presumptuous reading of "we make things to a design".
  const defaultCapabilityKind: FactoryCapabilityKind = offeredCapabilityKinds[0] ?? "oem";

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [draft, setDraft] = useState<FactoryInquiryDraft>(() =>
    buildEmptyDraft(defaultCapabilityKind),
  );
  const getIdempotencyKey = useAttemptIdempotencyKey();
  const createFactoryInquiry = useCreateFactoryInquiry();

  const applyDraftPatch = (draftPatch: Partial<FactoryInquiryDraft>) => {
    setDraft((previousDraft) => ({ ...previousDraft, ...draftPatch }));
  };

  const createResult = createFactoryInquiry.data;

  // The success screen reads the SERVER'S row, not the submitted draft, so the reference it prints
  // names something that exists.
  if (createResult !== undefined && createResult.success) {
    return (
      <CreatedInquiryPanel
        reference={createResult.data.reference}
        factoryDisplayName={factoryDisplayName}
        factorySlug={factorySlug}
      />
    );
  }

  const capabilityOptions =
    offeredCapabilityKinds.length > 0
      ? offeredCapabilityKinds.map((capabilityKind) => ({
          value: capabilityKind,
          label: FACTORY_CAPABILITY_LABELS[capabilityKind],
        }))
      : [
          {
            value: defaultCapabilityKind,
            label: FACTORY_CAPABILITY_LABELS[defaultCapabilityKind],
          },
        ];

  const input = buildCreateFactoryInquiryInput(draft);
  const missingRequirements = collectMissingRequirements(draft);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-serif text-xl font-semibold text-foreground md:text-2xl">
          Write to {factoryDisplayName}
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          This saves a draft. Nothing reaches the factory until you send it.
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
            disabled={input === null || createFactoryInquiry.isPending}
            onClick={() => {
              if (input === null) return;
              createFactoryInquiry.mutate({
                factorySlug,
                input,
                idempotencyKey: getIdempotencyKey(),
              });
            }}
            className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
          >
            {createFactoryInquiry.isPending ? "Saving…" : "Save as draft"}
          </button>
        )}
      </footer>

      {createResult !== undefined &&
        !createResult.success && (
          // THE SERVER'S OWN MESSAGE. A 422 from a `.strict()` body names the field, and replacing it
          // with "something went wrong" throws away the only useful part of the refusal.
          <p className="text-xs leading-4 text-destructive">{createResult.error.message}</p>
        )}
      {createFactoryInquiry.isError && (
        <p className="text-xs leading-4 text-destructive">
          Couldn&apos;t reach the server. Pressing save again is safe — the request carries an
          idempotency key, so a retry cannot create a second inquiry.
        </p>
      )}
    </div>
  );

  function renderStep() {
    const step = COMPOSER_STEPS[currentStepIndex];
    if (step === undefined) return null;

    // Bound to a local before switching: switching on `step.id` narrows `step` itself to `never` in
    // the default branch, so the exhaustive check cannot reach `.id` to assign it.
    const stepId = step.id;

    switch (stepId) {
      case "what":
        return (
          <div className="space-y-3">
            <SelectField
              label="What you want them to do"
              hint="Only the capabilities this factory has declared."
              value={draft.capabilityKind}
              options={capabilityOptions}
              onValueChange={(capabilityKind) => applyDraftPatch({ capabilityKind })}
            />
            <TextAreaField
              label="What you are making"
              hint="Material, size, finish, whether you already have drawings."
              value={draft.productDescription}
              onValueChange={(productDescription) => applyDraftPatch({ productDescription })}
              rows={5}
              maxLength={4000}
            />
            <ChipMultiSelectField
              label="Certifications you need them to hold"
              hint="Leave empty if none is required. Selecting one is a requirement, not a preference."
              selectedValues={draft.requiredCertifications}
              options={CERTIFICATION_OPTIONS}
              onSelectedValuesChange={(requiredCertifications) =>
                applyDraftPatch({ requiredCertifications })
              }
            />
          </div>
        );
      case "volume":
        return (
          <div className="space-y-3">
            <IntegerField
              label="Estimated quantity per year"
              hint="A rough figure is more useful than none. Leave blank if you genuinely do not know — it is omitted rather than sent as zero."
              value={draft.estimatedAnnualQuantity}
              onValueChange={(estimatedAnnualQuantity) =>
                applyDraftPatch({ estimatedAnnualQuantity })
              }
              placeholder="10000"
            />
            <TextField
              label="Unit"
              hint="What the quantity counts — pieces, sets, kg, metres."
              value={draft.unitLabel}
              onValueChange={(unitLabel) => applyDraftPatch({ unitLabel })}
              placeholder="pieces"
              maxLength={40}
            />
            <TextField
              label="Target price per unit"
              hint="What you hope to pay, in major units. Blank is omitted — it is not an offer of zero."
              value={draft.targetUnitPriceMajorUnits}
              onValueChange={(targetUnitPriceMajorUnits) =>
                applyDraftPatch({ targetUnitPriceMajorUnits })
              }
              placeholder="4.20"
              maxLength={20}
            />
            <TextField
              label="Currency"
              hint="Three letters. Only sent alongside a target price."
              value={draft.currency}
              onValueChange={(currency) => applyDraftPatch({ currency })}
              maxLength={3}
            />
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">
                First delivery wanted by
              </span>
              <span className="block text-[11px] leading-4 text-muted-foreground">
                A date you are working towards, not a commitment either side has made.
              </span>
              <span className="mt-1 block">
                <input
                  type="datetime-local"
                  value={draft.desiredFirstDeliveryLocal}
                  onChange={(changeEvent) =>
                    applyDraftPatch({ desiredFirstDeliveryLocal: changeEvent.target.value })
                  }
                  className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                />
              </span>
            </label>
            <TextAreaField
              label="Anything else"
              value={draft.notes}
              onValueChange={(notes) => applyDraftPatch({ notes })}
              rows={3}
              maxLength={2000}
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
                  {factoryDisplayName} will not see this and will not be notified. Saving it gives
                  you something to send when you are ready.
                </p>
              </div>
            )}
            {/* Names the omissions rather than hiding them, because "we left your target price out"
                is a decision the buyer should get to disagree with before saving. */}
            <p className="text-[11px] leading-4 text-muted-foreground">
              Blank fields are left out of the request entirely — never sent as zero.
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
 * CONDITIONAL SPREADS rather than a strip-undefined helper, for the reason `composer-input.ts` sets
 * out at its foot: that helper cannot be written without a type assertion on its return value, and
 * the file whose whole job is building request bodies is the wrong place for one.
 */
function buildCreateFactoryInquiryInput(
  draft: FactoryInquiryDraft,
): CreateFactoryInquiryInput | null {
  const productDescription = toOptionalText(draft.productDescription);
  if (productDescription === undefined) return null;

  const targetUnitPriceInCents = toOptionalCents(draft.targetUnitPriceMajorUnits);
  const currency = toOptionalCurrencyCode(draft.currency);

  return {
    capabilityKind: draft.capabilityKind,
    productDescription,
    ...(toOptionalNonNegativeInteger(draft.estimatedAnnualQuantity) === undefined
      ? {}
      : { estimatedAnnualQuantity: toOptionalNonNegativeInteger(draft.estimatedAnnualQuantity) }),
    ...(toOptionalText(draft.unitLabel) === undefined
      ? {}
      : { unitLabel: toOptionalText(draft.unitLabel) }),
    // BOTH OR NEITHER. A price with no currency is a number nobody can read, and a currency with no
    // price is noise — so the pair travels together or not at all.
    ...(targetUnitPriceInCents === undefined || currency === undefined
      ? {}
      : { targetUnitPriceInCents, currency }),
    ...(draft.requiredCertifications.length === 0
      ? {}
      : { requiredCertifications: draft.requiredCertifications }),
    ...(toOptionalIsoInstant(draft.desiredFirstDeliveryLocal) === undefined
      ? {}
      : { desiredFirstDeliveryAt: toOptionalIsoInstant(draft.desiredFirstDeliveryLocal) }),
    ...(toOptionalText(draft.notes) === undefined ? {} : { notes: toOptionalText(draft.notes) }),
  };
}

function collectMissingRequirements(draft: FactoryInquiryDraft): string[] {
  const missing: string[] = [];
  if (toOptionalText(draft.productDescription) === undefined) {
    missing.push("A description of what you are making.");
  }
  // Not a hard requirement, but a quantity with no unit cannot be read — so it is flagged rather
  // than silently dropped, which is what `buildCreateFactoryInquiryInput` would otherwise do.
  if (
    toOptionalNonNegativeInteger(draft.estimatedAnnualQuantity) !== undefined &&
    toOptionalText(draft.unitLabel) === undefined
  ) {
    missing.push("A unit for the quantity you gave — pieces, sets, kg.");
  }
  if (
    toOptionalCents(draft.targetUnitPriceMajorUnits) !== undefined &&
    toOptionalCurrencyCode(draft.currency) === undefined
  ) {
    missing.push("A three-letter currency for the target price you gave.");
  }
  return missing;
}

function CreatedInquiryPanel({
  reference,
  factoryDisplayName,
  factorySlug,
}: {
  reference: string;
  factoryDisplayName: string;
  factorySlug: string;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-2xl text-primary">
        ✓
      </span>
      <p className="text-base font-medium text-foreground">Saved as a draft</p>
      {/* SAYS WHAT HAPPENED. The factory has not been contacted and knows nothing about this. */}
      <p className="text-sm text-muted-foreground">
        Draft {reference} is visible only to your organization. {factoryDisplayName} has not been
        notified and nothing has been sent.
      </p>
      <Link
        href={`/store/factories/${factorySlug}`}
        className="mt-2 cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Back to {factoryDisplayName}
      </Link>
    </div>
  );
}

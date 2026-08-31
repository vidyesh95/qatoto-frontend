// TRANSPORT: client-query — reads GET /commerce/providers/offerings/mine.
"use client";

// THE PROVIDER'S OWN LISTINGS, and the only place a draft is visible at all.
//
// STATE IS THE CONTENT OF THIS PAGE, not decoration on it. Four of the five states mean the listing is NOT
// findable by a buyer — `draft`, `pending_review`, `suspended` and `retired` — and only `active` means it is.
// A row that showed a title and a price without saying which of those applied would let a provider believe
// they are listed when they are waiting on a moderator.
//
// NO LINK TO `/store/services/:slug` EXCEPT WHEN ACTIVE. A draft's public URL is a 404 by design, so offering
// it would look like a broken page rather than an unpublished one.
//
// ⚠️ **SEND FOR REVIEW IS OFFERED ON `draft` AND NOWHERE ELSE.** Before it existed, a provider could
// create a listing and had no way to publish it: the composer's output was permanently invisible.
// `pending_review` is already submitted, and `suspended` / `retired` are moderator states this
// route refuses — a control whose only outcome is an error is worse than its absence.
//
// ⚠️ **THERE IS NO COVERAGE EDITOR HERE, AND THAT IS A BACKEND GAP RATHER THAN AN OMISSION.**
// `PUT /commerce/service-offerings/:id/coverage` replaces the WHOLE lane list — an omitted lane is
// a deletion — and no read returns an offering's current lanes to a provider:
// `GET /providers/offerings/mine` answers the raw offering row and the public detail read exists
// only for `active` listings. A form that cannot show what it is about to replace would delete a
// provider's lanes the first time they added one. No wrapper was written either: an uncalled one is
// unverified code, and the audit in CLAUDE.md exists to catch exactly that. See
// `providers.schemas.ts` for what the backend would need first.

import { useState } from "react";

import Link from "next/link";

import StatusPanel from "@/components/home/shared/status-panel";
import {
  useMyServiceOfferingsQuery,
  useSubmitServiceOfferingMutation,
  useUpdateServiceOfferingMutation,
} from "@/hooks/store/providers";
import { useResettableAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";
import { formatCentsRangeLabel, formatCountLabel } from "@/lib/store/format";
import { PROVIDER_KIND_LABELS } from "@/lib/store/labels";
import {
  OFFERING_PRICING_MODEL_LABELS,
  SERVICE_OFFERING_STATE_LABELS,
  SERVICE_PRICING_MODELS,
  type CreatedServiceOffering,
  type ServicePricingModel,
  type UpdateServiceOfferingInput,
} from "@/lib/store/providers.schemas";

export default function MyServiceOfferingList() {
  const offeringsQuery = useMyServiceOfferingsQuery();
  const result = offeringsQuery.data;

  if (offeringsQuery.isPending) {
    return <p className="text-sm text-muted-foreground">Loading your services…</p>;
  }
  if (result === undefined || offeringsQuery.isError) {
    return (
      <StatusPanel
        message="Couldn't load your services."
        className="border border-border px-6 py-16"
      />
    );
  }
  if (!result.success) {
    // A 403 here means the caller's member role cannot manage offerings, which is a different thing from an
    // empty list — the server's own message says which.
    return (
      <StatusPanel message={result.error.message} className="border border-border px-6 py-16" />
    );
  }

  if (result.data.length === 0) {
    return (
      <div className="rounded-xl border border-border px-6 py-16 text-center">
        <p className="text-sm text-foreground">You have no service listings yet.</p>
        <Link
          href="/studio/services/create"
          className="mt-3 inline-block cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Create your first one
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {result.data.map((offering) => (
        <li key={offering.id}>
          <OfferingRow offering={offering} />
        </li>
      ))}
    </ul>
  );
}

const FIELD_CLASS =
  "mt-1 w-full rounded-lg border border-border px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary";

const QUIET_BUTTON_CLASS =
  "cursor-pointer rounded-full bg-background px-3 py-1.5 text-xs font-medium text-foreground outline -outline-offset-1 outline-border disabled:opacity-40";

const PRIMARY_BUTTON_CLASS =
  "cursor-pointer rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-40";

/** A blank number input is an ABSENCE, never `0` — `Number("")` is `0`, which is the trap. */
function toOptionalInteger(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function toInputText(value: number | null): string {
  return value === null ? "" : String(value);
}

/** Narrows a `<select>`'s value against the tuple it was rendered from. NOT an `as`. */
function narrowToPricingModel(value: string): ServicePricingModel | undefined {
  return SERVICE_PRICING_MODELS.find((pricingModel) => pricingModel === value);
}

function OfferingRow({ offering }: { offering: CreatedServiceOffering }) {
  const isFindableByBuyers = offering.state === "active";
  const [isEditing, setIsEditing] = useState(false);
  const submitOffering = useSubmitServiceOfferingMutation();
  const { getIdempotencyKey, resetIdempotencyKey } = useResettableAttemptIdempotencyKey();

  return (
    <div className="rounded-xl border border-border px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="min-w-0 flex-1 text-sm leading-5 font-medium text-foreground">
          {offering.title}
        </p>
        <span className="text-xs leading-4 text-muted-foreground">
          {SERVICE_OFFERING_STATE_LABELS[offering.state]}
        </span>
      </div>

      <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
        {PROVIDER_KIND_LABELS[offering.providerKind]} ·{" "}
        {OFFERING_PRICING_MODEL_LABELS[offering.pricingModel]}
      </p>

      {/* A NULL RANGE IS "QUOTED PER JOB", NEVER FREE AND NEVER BLANK. The currency column is non-null even
          when both price ends are, so a blank here would read as a zero that has a currency. */}
      <p className="mt-1 text-xs leading-4 text-foreground">
        {offering.indicativePriceMinInCents === null || offering.indicativePriceMaxInCents === null
          ? "Quoted per job"
          : formatCentsRangeLabel(
              offering.indicativePriceMinInCents,
              offering.indicativePriceMaxInCents,
              offering.currency,
            )}
      </p>

      {offering.minimumLeadTimeDays !== null && offering.maximumLeadTimeDays !== null && (
        <p className="text-xs leading-4 text-muted-foreground">
          Lead time {formatCountLabel(offering.minimumLeadTimeDays)}–
          {formatCountLabel(offering.maximumLeadTimeDays)} days
        </p>
      )}

      {isFindableByBuyers ? (
        <Link
          href={`/store/services/${offering.slug}`}
          className="mt-1 inline-block text-xs font-medium text-primary underline"
        >
          View the public listing
        </Link>
      ) : (
        // NO LINK. Every non-active state 404s on its public URL, and a dead link reads as a bug rather than
        // as an unpublished listing.
        <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
          {offering.state === "pending_review"
            ? "Waiting for a moderator. Buyers cannot find it yet."
            : "Buyers cannot find this listing."}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {/* `draft` ONLY. `pending_review` is already in the queue, and the route refuses the two
            moderator states outright. */}
        {offering.state === "draft" && (
          <button
            type="button"
            disabled={submitOffering.isPending}
            onClick={() => {
              if (submitOffering.isPending) return;
              submitOffering.mutate(
                { offeringId: offering.id, idempotencyKey: getIdempotencyKey() },
                {
                  onSuccess: (result) => {
                    if (!result.success) return;
                    resetIdempotencyKey();
                  },
                },
              );
            }}
            className={PRIMARY_BUTTON_CLASS}
          >
            {submitOffering.isPending ? "Sending…" : "Send for review"}
          </button>
        )}
        <button
          type="button"
          onClick={() => setIsEditing((wasEditing) => !wasEditing)}
          className={QUIET_BUTTON_CLASS}
        >
          {isEditing ? "Stop editing" : "Edit the details"}
        </button>
      </div>

      {/* THE STATE IN THE RESPONSE, NEVER AN ASSUMED ONE. A submitted listing reads
          `pending_review`: a moderator has not looked at it, so nothing here may say published. */}
      {submitOffering.data?.success === false && (
        <p className="mt-2 text-xs leading-4 text-destructive">
          {submitOffering.data.error.message}
        </p>
      )}
      {submitOffering.isError && (
        <p className="mt-2 text-xs leading-4 text-destructive">
          That listing was not sent for review. Try again.
        </p>
      )}
      {submitOffering.data?.success === true && (
        <p className="mt-2 text-xs leading-4 text-muted-foreground">
          Sent for review. A moderator decides from here — it is not listed yet.
        </p>
      )}

      {isEditing && <OfferingEditForm offering={offering} onSaved={() => setIsEditing(false)} />}
    </div>
  );
}

/**
 * Edits one listing.
 *
 * SPARSE ON THE WIRE, WHOLE ON THE SCREEN. The form renders every field it can change and sends
 * only the ones that actually differ from the row it opened on — the body is `.strict()` and an
 * omitted key is untouched, so echoing all eight back would overwrite a field somebody else edited
 * in another tab.
 *
 * ⚠️ **THE TWO RANGES ARE BOTH-OR-NEITHER**, refused server-side. Both halves live on this form for
 * that reason, and a half-filled range is caught here so the provider is not told about it after a
 * round-trip.
 */
function OfferingEditForm({
  offering,
  onSaved,
}: {
  offering: CreatedServiceOffering;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(offering.title);
  const [summary, setSummary] = useState(offering.summary ?? "");
  const [pricingModel, setPricingModel] = useState<ServicePricingModel>(offering.pricingModel);
  const [priceMin, setPriceMin] = useState(toInputText(offering.indicativePriceMinInCents));
  const [priceMax, setPriceMax] = useState(toInputText(offering.indicativePriceMaxInCents));
  const [minimumLeadTimeDays, setMinimumLeadTimeDays] = useState(
    toInputText(offering.minimumLeadTimeDays),
  );
  const [maximumLeadTimeDays, setMaximumLeadTimeDays] = useState(
    toInputText(offering.maximumLeadTimeDays),
  );
  const [localError, setLocalError] = useState<string | null>(null);

  const updateOffering = useUpdateServiceOfferingMutation();
  const { getIdempotencyKey, resetIdempotencyKey } = useResettableAttemptIdempotencyKey();

  const nextPriceMin = toOptionalInteger(priceMin);
  const nextPriceMax = toOptionalInteger(priceMax);
  const nextMinimumLeadTime = toOptionalInteger(minimumLeadTimeDays);
  const nextMaximumLeadTime = toOptionalInteger(maximumLeadTimeDays);

  return (
    <form
      className="mt-3 space-y-2 rounded-xl border border-border px-3 py-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (updateOffering.isPending) return;
        // Checked here because the backend refines it too — a half-filled range is a 422 the
        // provider can be told about before the round-trip.
        if ((nextPriceMin === null) !== (nextPriceMax === null)) {
          setLocalError("Give both ends of the price range, or neither.");
          return;
        }
        if ((nextMinimumLeadTime === null) !== (nextMaximumLeadTime === null)) {
          setLocalError("Give both ends of the lead time, or neither.");
          return;
        }
        setLocalError(null);

        const nextSummary = summary.trim().length === 0 ? null : summary.trim();
        // ONLY WHAT CHANGED. An unchanged key is omitted rather than echoed.
        const patch: UpdateServiceOfferingInput = {
          ...(title.trim() === offering.title ? {} : { title: title.trim() }),
          ...(nextSummary === offering.summary ? {} : { summary: nextSummary }),
          ...(pricingModel === offering.pricingModel ? {} : { pricingModel }),
          ...(nextPriceMin === offering.indicativePriceMinInCents
            ? {}
            : { indicativePriceMinInCents: nextPriceMin }),
          ...(nextPriceMax === offering.indicativePriceMaxInCents
            ? {}
            : { indicativePriceMaxInCents: nextPriceMax }),
          ...(nextMinimumLeadTime === offering.minimumLeadTimeDays
            ? {}
            : { minimumLeadTimeDays: nextMinimumLeadTime }),
          ...(nextMaximumLeadTime === offering.maximumLeadTimeDays
            ? {}
            : { maximumLeadTimeDays: nextMaximumLeadTime }),
        };
        if (Object.keys(patch).length === 0) {
          setLocalError("Nothing has changed yet.");
          return;
        }

        updateOffering.mutate(
          { offeringId: offering.id, input: patch, idempotencyKey: getIdempotencyKey() },
          {
            onSuccess: (result) => {
              if (!result.success) return;
              resetIdempotencyKey();
              onSaved();
            },
          },
        );
      }}
    >
      <label className="block text-xs font-medium text-muted-foreground">
        Title
        <input
          type="text"
          value={title}
          maxLength={200}
          onChange={(event) => setTitle(event.target.value)}
          className={FIELD_CLASS}
        />
      </label>
      <label className="block text-xs font-medium text-muted-foreground">
        Summary
        <textarea
          value={summary}
          maxLength={4000}
          rows={3}
          onChange={(event) => setSummary(event.target.value)}
          className={FIELD_CLASS}
        />
      </label>
      <label className="block text-xs font-medium text-muted-foreground">
        How it is priced
        <select
          value={pricingModel}
          onChange={(event) =>
            setPricingModel(narrowToPricingModel(event.target.value) ?? offering.pricingModel)
          }
          className={FIELD_CLASS}
        >
          {SERVICE_PRICING_MODELS.map((model) => (
            <option key={model} value={model}>
              {OFFERING_PRICING_MODEL_LABELS[model]}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block text-xs font-medium text-muted-foreground">
          Indicative price from ({offering.currency}, in cents)
          <input
            type="number"
            min={0}
            value={priceMin}
            onChange={(event) => setPriceMin(event.target.value)}
            className={FIELD_CLASS}
          />
        </label>
        <label className="block text-xs font-medium text-muted-foreground">
          to
          <input
            type="number"
            min={0}
            value={priceMax}
            onChange={(event) => setPriceMax(event.target.value)}
            className={FIELD_CLASS}
          />
        </label>
        <label className="block text-xs font-medium text-muted-foreground">
          Lead time from (days)
          <input
            type="number"
            min={0}
            value={minimumLeadTimeDays}
            onChange={(event) => setMinimumLeadTimeDays(event.target.value)}
            className={FIELD_CLASS}
          />
        </label>
        <label className="block text-xs font-medium text-muted-foreground">
          to
          <input
            type="number"
            min={0}
            value={maximumLeadTimeDays}
            onChange={(event) => setMaximumLeadTimeDays(event.target.value)}
            className={FIELD_CLASS}
          />
        </label>
      </div>

      {/* Leaving both price ends empty is "quoted per job", which is a real answer — not a blank. */}
      <p className="text-[11px] leading-4 text-muted-foreground">
        Leave both price fields empty to keep this quoted per job.
        {offering.state === "active" && " Buyers see edits to a published listing immediately."}
      </p>

      <button type="submit" disabled={updateOffering.isPending} className={PRIMARY_BUTTON_CLASS}>
        {updateOffering.isPending ? "Saving…" : "Save the details"}
      </button>
      {localError !== null && <p className="text-xs leading-4 text-destructive">{localError}</p>}
      {updateOffering.data?.success === false && (
        <p className="text-xs leading-4 text-destructive">{updateOffering.data.error.message}</p>
      )}
      {updateOffering.isError && (
        <p className="text-xs leading-4 text-destructive">That edit did not save. Try again.</p>
      )}
    </form>
  );
}

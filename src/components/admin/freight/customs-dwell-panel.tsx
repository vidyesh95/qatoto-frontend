// TRANSPORT: client-query — "use client" island. Reads GET /commerce/admin/customs-dwell-estimates
// and writes POST /commerce/admin/customs-dwell-estimates plus the retire PATCH.
"use client";

import { useState } from "react";

import { renderFieldErrors } from "@/components/admin/freight/rate-card-composer";
import {
  useCreateCustomsDwellEstimateMutation,
  useCustomsDwellEstimatesList,
  useRetireCustomsDwellEstimateMutation,
} from "@/hooks/store/admin-freight";
import { useResettableAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";
import {
  ANY_SCOPE_FILTER,
  type AdminCustomsDwellEstimate,
  type ListCustomsDwellEstimatesFilter,
} from "@/lib/store/admin-freight.schemas";
import { countryLabelFromCode, formatIsoInstantLabel } from "@/lib/store/format";

const CARD_CLASS = "rounded-2xl border border-border p-4";
const FIELD_CLASS = "w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm";
const QUIET_BUTTON_CLASS =
  "cursor-pointer rounded-full border border-border px-3 py-1.5 text-xs font-medium disabled:opacity-50";
const PRIMARY_BUTTON_CLASS =
  "cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50";

/** The scope controls are genuinely tri-state; a blank text box cannot express "any". */
const SCOPE_CHOICES = ["any", "specific"] as const;
type ScopeChoice = (typeof SCOPE_CHOICES)[number];

/** Narrow a `<select>` value by membership; the default keeps the broad scope, never a guess. */
function toScopeChoice(value: string): ScopeChoice {
  return SCOPE_CHOICES.find((choice) => choice === value) ?? "any";
}

/**
 * Customs clearance estimates.
 *
 * WITHOUT ONE OF THESE, A LANE PRICES BUT NEVER ARRIVES: the arrival window comes back null with
 * customs named as the missing component. That is why this sits beside the rate cards rather than
 * on a page of its own.
 *
 * **THERE IS NO STATE COLUMN — THE WINDOW IS THE LIFECYCLE.** "Retire" means setting `validUntil`,
 * there is no delete, and a closed row can never be reopened. Creating on a scope that already has
 * an open-ended row CLOSES that row automatically, reported once as `closedDwellEstimateId`.
 *
 * TWO SPELLINGS OF ONE IDEA, both required by the backend and neither normalized here: the LIST
 * filter says `"any"` (a literal string) to select rows stored as NULL, while the CREATE body says
 * `null`. Sending the wrong one is a 422 or a silently different query.
 */
export default function CustomsDwellPanel({ canManage }: { canManage: boolean }) {
  const [destinationFilter, setDestinationFilter] = useState("");
  const [openOnly, setOpenOnly] = useState(true);
  const [broadOriginOnly, setBroadOriginOnly] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  const filter: ListCustomsDwellEstimatesFilter = {
    ...(destinationFilter.trim().length === 2
      ? { destinationCountryCode: destinationFilter.trim().toUpperCase() }
      : {}),
    // Only ever narrows — `false` is identical to omitting it, so there is no way to list retired
    // estimates alone and the control says "open only" rather than offering a false opposite.
    ...(openOnly ? { openOnly: true } : {}),
    // THE LITERAL STRING `"any"`, which is how the LIST filter spells the rows stored as NULL.
    // The create body spells that same scope as an explicit `null`. Two spellings, one idea, and
    // neither is normalized — sending the wrong one silently queries something else.
    ...(broadOriginOnly ? { originCountryCode: ANY_SCOPE_FILTER } : {}),
  };

  const estimatesList = useCustomsDwellEstimatesList(filter);

  return (
    <section className={`${CARD_CLASS} space-y-3`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold">Customs dwell estimates</h3>
          <p className="text-xs text-muted-foreground">
            A priced lane still has no arrival window until customs is estimated for it.
          </p>
        </div>
        {canManage && !isComposerOpen && (
          <button
            type="button"
            onClick={() => setIsComposerOpen(true)}
            className={QUIET_BUTTON_CLASS}
          >
            Record an estimate
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Destination (2 letters)</span>
          <input
            value={destinationFilter}
            maxLength={2}
            onChange={(event) => setDestinationFilter(event.target.value.toUpperCase())}
            className={`${FIELD_CLASS} w-24`}
            placeholder="KE"
          />
        </label>
        <label className="flex items-center gap-2 pb-1.5 text-xs">
          <input
            type="checkbox"
            checked={openOnly}
            onChange={(event) => setOpenOnly(event.target.checked)}
          />
          <span>Open estimates only</span>
        </label>
        <label className="flex items-center gap-2 pb-1.5 text-xs">
          <input
            type="checkbox"
            checked={broadOriginOnly}
            onChange={(event) => setBroadOriginOnly(event.target.checked)}
          />
          <span>Any-origin rows only</span>
        </label>
      </div>

      {isComposerOpen && <DwellComposer onClose={() => setIsComposerOpen(false)} />}

      {estimatesList.isLoadingFirstPage && (
        <p className="text-sm text-muted-foreground">Loading estimates…</p>
      )}

      {estimatesList.firstPageErrorMessage !== null && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
          {estimatesList.firstPageErrorMessage}
        </p>
      )}

      {!estimatesList.isLoadingFirstPage &&
        estimatesList.firstPageErrorMessage === null &&
        estimatesList.rows.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No customs dwell estimate matches this filter. Lanes without one price normally and then
            report no arrival window.
          </p>
        )}

      <ul className="space-y-2">
        {estimatesList.rows.map((estimate) => (
          <DwellRow key={estimate.id} estimate={estimate} canManage={canManage} />
        ))}
      </ul>

      {estimatesList.hasNextPage && (
        <button
          type="button"
          onClick={estimatesList.loadNextPage}
          disabled={estimatesList.isFetchingNextPage}
          className={QUIET_BUTTON_CLASS}
        >
          {estimatesList.isFetchingNextPage ? "Loading…" : "Load more"}
        </button>
      )}

      {estimatesList.loadMoreErrorMessage !== null && (
        <p className="text-xs text-red-800">{estimatesList.loadMoreErrorMessage}</p>
      )}
    </section>
  );
}

function DwellRow({
  estimate,
  canManage,
}: {
  estimate: AdminCustomsDwellEstimate;
  canManage: boolean;
}) {
  const [retireUntilLocal, setRetireUntilLocal] = useState("");
  const retireKey = useResettableAttemptIdempotencyKey();
  const retireMutation = useRetireCustomsDwellEstimateMutation();

  const isRetired = estimate.validUntil !== null;
  const retireError =
    retireMutation.data !== undefined && !retireMutation.data.success
      ? retireMutation.data.error
      : null;

  return (
    <li className="rounded-xl border border-border p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm">
          {/* `null` here means ANY, which is a real scope value rather than missing data — so it
              renders as a word, never as a blank or a dash. */}
          {estimate.originCountryCode === null
            ? "Any origin"
            : countryLabelFromCode(estimate.originCountryCode)}{" "}
          → {countryLabelFromCode(estimate.destinationCountryCode)}
          <span className="text-muted-foreground">
            {" "}
            ·{" "}
            {estimate.commodityScopeCategoryId === null
              ? "any commodity"
              : `category ${estimate.commodityScopeCategoryId}`}
          </span>
        </p>
        <span className="text-xs text-muted-foreground">
          {estimate.clearanceDaysMin}–{estimate.clearanceDaysMax} days · {estimate.source}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        From {formatIsoInstantLabel(estimate.validFrom)}
        {isRetired
          ? ` · retired ${formatIsoInstantLabel(estimate.validUntil ?? "")}`
          : " · still open"}
      </p>

      {canManage && !isRetired && (
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Retire from</span>
            <input
              type="datetime-local"
              value={retireUntilLocal}
              onChange={(event) => setRetireUntilLocal(event.target.value)}
              className={FIELD_CLASS}
            />
          </label>
          <button
            type="button"
            disabled={retireMutation.isPending || retireUntilLocal.length === 0}
            onClick={() =>
              retireMutation.mutate(
                {
                  dwellEstimateId: estimate.id,
                  validUntil: new Date(retireUntilLocal).toISOString(),
                  idempotencyKey: retireKey.getIdempotencyKey(),
                },
                {
                  onSuccess: (result) => {
                    if (!result.success) return;
                    retireKey.resetIdempotencyKey();
                  },
                },
              )
            }
            className={QUIET_BUTTON_CLASS}
          >
            {retireMutation.isPending ? "Retiring…" : "Retire"}
          </button>
          <p className="w-full text-xs text-muted-foreground">
            Retiring is one-way. A closed estimate can never be reopened.
          </p>
        </div>
      )}

      {retireError !== null && (
        <div className="mt-2 space-y-1 rounded-lg bg-red-50 p-2 text-xs text-red-800">
          <p className="font-medium">{retireError.message}</p>
          {renderFieldErrors(retireError.fieldErrors)}
        </div>
      )}
    </li>
  );
}

function DwellComposer({ onClose }: { onClose: () => void }) {
  const [destinationCountryCode, setDestinationCountryCode] = useState("");
  const [originChoice, setOriginChoice] = useState<ScopeChoice>("any");
  const [originCountryCode, setOriginCountryCode] = useState("");
  const [commodityChoice, setCommodityChoice] = useState<ScopeChoice>("any");
  const [commodityScopeCategoryId, setCommodityScopeCategoryId] = useState("");
  const [clearanceDaysMin, setClearanceDaysMin] = useState("");
  const [clearanceDaysMax, setClearanceDaysMax] = useState("");
  const [source, setSource] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const { getIdempotencyKey, resetIdempotencyKey } = useResettableAttemptIdempotencyKey();
  const createMutation = useCreateCustomsDwellEstimateMutation();

  const createResult = createMutation.data;

  function handleSubmit() {
    setLocalError(null);

    const destination = destinationCountryCode.trim().toUpperCase();
    const origin = originChoice === "any" ? null : originCountryCode.trim().toUpperCase();

    if (destination.length !== 2) {
      setLocalError("A destination country code is two letters.");
      return;
    }
    if (originChoice === "specific" && origin?.length !== 2) {
      setLocalError("An origin country code is two letters, or choose any origin.");
      return;
    }
    // Refused by the backend at two layers, and worth explaining rather than round-tripping: a
    // domestic lane has no customs leg at all. That is an ABSENT component, not a zero-day one.
    if (origin !== null && origin === destination) {
      setLocalError(
        "Origin and destination are the same country. A domestic lane has no customs leg — that is an absent step, not a zero-day one.",
      );
      return;
    }

    const daysMin = Number(clearanceDaysMin.trim());
    const daysMax = Number(clearanceDaysMax.trim());
    if (!Number.isSafeInteger(daysMin) || !Number.isSafeInteger(daysMax)) {
      setLocalError("Clearance days are whole numbers.");
      return;
    }
    if (daysMax < daysMin) {
      setLocalError("The maximum clearance is shorter than the minimum.");
      return;
    }
    if (source.trim().length === 0) {
      setLocalError("Say where this estimate came from.");
      return;
    }

    createMutation.mutate(
      {
        input: {
          destinationCountryCode: destination,
          // EXPLICIT `null`, never an omitted key: the backend refuses to guess whether a missing
          // scope meant "any" or was forgotten, and answers 422 either way.
          originCountryCode: origin,
          commodityScopeCategoryId:
            commodityChoice === "any" ? null : commodityScopeCategoryId.trim(),
          clearanceDaysMin: daysMin,
          clearanceDaysMax: daysMax,
          source: source.trim(),
        },
        idempotencyKey: getIdempotencyKey(),
      },
      {
        onSuccess: (result) => {
          if (!result.success) return;
          resetIdempotencyKey();
        },
      },
    );
  }

  if (createResult !== undefined && createResult.success) {
    return (
      <div className="space-y-2 rounded-xl border border-[#00696E]/30 bg-[#00696E]/5 p-3">
        <p className="text-sm font-medium text-[#00696E]">Estimate recorded.</p>
        {/* Reported exactly once, here — the same shape of silent side effect as a superseded
            rate card. No later read mentions it. */}
        {createResult.data.closedDwellEstimateId !== null && (
          <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900">
            This closed the open estimate on the same scope, id{" "}
            <code>{createResult.data.closedDwellEstimateId}</code>. That is the only time you will
            be told.
          </p>
        )}
        <button type="button" onClick={onClose} className={QUIET_BUTTON_CLASS}>
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-border p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Destination country (2 letters)</span>
          <input
            value={destinationCountryCode}
            maxLength={2}
            onChange={(event) => setDestinationCountryCode(event.target.value.toUpperCase())}
            className={FIELD_CLASS}
          />
        </label>

        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Origin scope</span>
          <select
            value={originChoice}
            onChange={(event) => setOriginChoice(toScopeChoice(event.target.value))}
            className={FIELD_CLASS}
          >
            <option value="any">Any origin</option>
            <option value="specific">One origin country</option>
          </select>
          {originChoice === "specific" && (
            <input
              value={originCountryCode}
              maxLength={2}
              onChange={(event) => setOriginCountryCode(event.target.value.toUpperCase())}
              className={FIELD_CLASS}
              placeholder="CN"
            />
          )}
        </div>

        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Commodity scope</span>
          <select
            value={commodityChoice}
            onChange={(event) => setCommodityChoice(toScopeChoice(event.target.value))}
            className={FIELD_CLASS}
          >
            <option value="any">Any commodity</option>
            <option value="specific">One category</option>
          </select>
          {commodityChoice === "specific" && (
            <input
              value={commodityScopeCategoryId}
              onChange={(event) => setCommodityScopeCategoryId(event.target.value)}
              className={FIELD_CLASS}
              placeholder="store category id"
            />
          )}
        </div>

        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Source</span>
          <input
            value={source}
            onChange={(event) => setSource(event.target.value)}
            className={FIELD_CLASS}
            placeholder="Where this estimate came from"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Clearance min (days)</span>
          <input
            inputMode="numeric"
            value={clearanceDaysMin}
            onChange={(event) => setClearanceDaysMin(event.target.value)}
            className={FIELD_CLASS}
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Clearance max (days)</span>
          <input
            inputMode="numeric"
            value={clearanceDaysMax}
            onChange={(event) => setClearanceDaysMax(event.target.value)}
            className={FIELD_CLASS}
          />
        </label>
      </div>

      <p className="text-xs text-muted-foreground">
        Recording this closes any open estimate already covering the same scope — automatically, and
        reported only on this response. The broad scope (any origin, any commodity) is the one a
        lane falls back to.
      </p>

      {localError !== null && (
        <p className="rounded-lg bg-red-50 p-2 text-xs text-red-800">{localError}</p>
      )}

      {createResult !== undefined && !createResult.success && (
        <div className="space-y-1 rounded-lg bg-red-50 p-2 text-xs text-red-800">
          <p className="font-medium">{createResult.error.message}</p>
          {renderFieldErrors(createResult.error.fieldErrors)}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={createMutation.isPending}
          className={PRIMARY_BUTTON_CLASS}
        >
          {createMutation.isPending ? "Recording…" : "Record the estimate"}
        </button>
        <button type="button" onClick={onClose} className={QUIET_BUTTON_CLASS}>
          Cancel
        </button>
      </div>
    </div>
  );
}

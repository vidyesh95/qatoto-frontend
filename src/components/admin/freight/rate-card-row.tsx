// TRANSPORT: client-query — "use client" island. Writes PATCH /commerce/admin/freight-rate-cards
// /:rateCardId and PATCH …/:rateCardId/breaks.
"use client";

import { useState } from "react";

import { renderFieldErrors } from "@/components/commerce/freight/field-errors";
import WeightBandEditor from "@/components/commerce/freight/weight-band-editor";
import { collectBands, type WeightBandDraft } from "@/lib/store/freight-band-draft";
import {
  useFreightRateBreaksMutation,
  useUpdateFreightRateCardMutation,
} from "@/hooks/store/admin-freight";
import { useResettableAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";
import {
  FREIGHT_RATE_CARD_STATE_LABELS,
  hasZeroWeightFloorBand,
  smallestWeightFloorGrams,
  type AdminFreightRateCard,
} from "@/lib/store/admin-freight.schemas";
import {
  countryLabelFromCode,
  formatCentsLabel,
  formatGramsLabel,
  formatIsoInstantLabel,
} from "@/lib/store/format";
import { FREIGHT_TRANSPORT_MODE_LABELS } from "@/lib/store/labels";

const QUIET_BUTTON_CLASS =
  "cursor-pointer rounded-full border border-border px-3 py-1.5 text-xs font-medium disabled:opacity-50";
const FIELD_CLASS = "w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm";

const STATE_BADGE_CLASSES: Record<AdminFreightRateCard["state"], string> = {
  active: "bg-primary-imprint/10 text-primary-imprint",
  superseded: "bg-muted text-muted-foreground",
  withdrawn: "bg-destructive/10 text-destructive",
};

function toBandDrafts(card: AdminFreightRateCard): WeightBandDraft[] {
  return card.breaks.map((rateBreak) => ({
    id: rateBreak.id,
    minBillableWeightGrams: String(rateBreak.minBillableWeightGrams),
    minVolumeCubicCm: String(rateBreak.minVolumeCubicCm),
    unitPriceInCents: String(rateBreak.unitPriceInCents),
    minimumChargeInCents: String(rateBreak.minimumChargeInCents),
    transitDaysMin: String(rateBreak.transitDaysMin),
    transitDaysMax: String(rateBreak.transitDaysMax),
  }));
}

function RateCardRowSummary({
  card,
  isExpanded,
  onToggleExpand,
}: {
  card: AdminFreightRateCard;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium">
          {countryLabelFromCode(card.originCountryCode)} →{" "}
          {countryLabelFromCode(card.destinationCountryCode)}{" "}
          <span className="text-muted-foreground">
            · {FREIGHT_TRANSPORT_MODE_LABELS[card.mode]} · {card.currency}
          </span>
        </p>
        <p className="text-xs text-muted-foreground">
          {card.sourceForwarderName} · in force {formatIsoInstantLabel(card.validFrom)}
          {card.validUntil !== null && ` until ${formatIsoInstantLabel(card.validUntil)}`} ·{" "}
          {card.breaks.length} band{card.breaks.length === 1 ? "" : "s"}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATE_BADGE_CLASSES[card.state]}`}
        >
          {FREIGHT_RATE_CARD_STATE_LABELS[card.state]}
        </span>
        {card.bandsEditable ? (
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-foreground">
            Staged · bands editable
          </span>
        ) : (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            Bands frozen
          </span>
        )}
        <button type="button" onClick={onToggleExpand} className={QUIET_BUTTON_CLASS}>
          {isExpanded ? "Hide" : "Open"}
        </button>
      </div>
    </div>
  );
}

function RateCardBreaksList({ card }: { card: AdminFreightRateCard }) {
  return (
    <ul className="space-y-1">
      {card.breaks.map((rateBreak) => (
        <li
          key={rateBreak.id}
          className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs"
        >
          <span>
            From {formatGramsLabel(rateBreak.minBillableWeightGrams)}
            {rateBreak.minVolumeCubicCm > 0 &&
              ` / ${rateBreak.minVolumeCubicCm.toLocaleString("en-US")} cm³`}
          </span>
          <span className="text-muted-foreground">
            {formatCentsLabel(rateBreak.unitPriceInCents, card.currency)} per unit · min{" "}
            {formatCentsLabel(rateBreak.minimumChargeInCents, card.currency)} ·{" "}
            {rateBreak.transitDaysMin}–{rateBreak.transitDaysMax} days
          </span>
        </li>
      ))}
      {card.breaks.length === 0 && (
        <li className="text-xs text-muted-foreground">
          This card has no bands and prices nothing.
        </li>
      )}
    </ul>
  );
}

type FreightErrorPayload = {
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

function RateCardLadderEditor({
  bandDrafts,
  setBandDrafts,
  currency,
  isPending,
  onSave,
}: {
  bandDrafts: WeightBandDraft[];
  setBandDrafts: (drafts: WeightBandDraft[]) => void;
  currency: string;
  isPending: boolean;
  onSave: () => void;
}) {
  return (
    <div className="space-y-2">
      <WeightBandEditor
        bandDrafts={bandDrafts}
        onChange={setBandDrafts}
        currency={currency}
        isDisabled={isPending}
      />
      <button type="button" onClick={onSave} disabled={isPending} className={QUIET_BUTTON_CLASS}>
        {isPending ? "Saving…" : "Replace the ladder"}
      </button>
    </div>
  );
}

function RateCardLifecycleControls({
  isPending,
  shortenUntilLocal,
  onShortenChange,
  withdrawReason,
  onWithdrawReasonChange,
  onShorten,
  onWithdraw,
}: {
  isPending: boolean;
  shortenUntilLocal: string;
  onShortenChange: (val: string) => void;
  withdrawReason: string;
  onWithdrawReasonChange: (val: string) => void;
  onShorten: () => void;
  onWithdraw: () => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1">
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">
            Shorten the window (a window may only ever be shortened)
          </span>
          <input
            type="datetime-local"
            value={shortenUntilLocal}
            onChange={(event) => onShortenChange(event.target.value)}
            className={FIELD_CLASS}
          />
        </label>
        <button
          type="button"
          disabled={isPending || shortenUntilLocal.length === 0}
          onClick={onShorten}
          className={QUIET_BUTTON_CLASS}
        >
          Shorten
        </button>
      </div>

      <div className="space-y-1">
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">
            Withdraw this card (a reason is required)
          </span>
          <input
            value={withdrawReason}
            onChange={(event) => onWithdrawReasonChange(event.target.value)}
            placeholder="Why is this card coming down?"
            className={FIELD_CLASS}
          />
        </label>
        <button
          type="button"
          disabled={isPending || withdrawReason.trim().length === 0}
          onClick={onWithdraw}
          className={QUIET_BUTTON_CLASS}
        >
          Withdraw
        </button>
      </div>
    </div>
  );
}

function RateCardErrorNotices({
  localError,
  breaksError,
  updateError,
}: {
  localError: string | null;
  breaksError: FreightErrorPayload | null;
  updateError: FreightErrorPayload | null;
}) {
  return (
    <>
      {localError !== null && (
        <p className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive">{localError}</p>
      )}

      {breaksError !== null && (
        <div className="space-y-1 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
          <p className="font-medium">{breaksError.message}</p>
          {renderFieldErrors(breaksError.fieldErrors)}
          {breaksError.code === "409" && (
            <p>
              This is not a retry-able failure. The card has come into force or left the active
              state; author a replacement instead.
            </p>
          )}
        </div>
      )}

      {updateError !== null && (
        <div className="space-y-1 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
          <p className="font-medium">{updateError.message}</p>
          {renderFieldErrors(updateError.fieldErrors)}
        </div>
      )}
    </>
  );
}

/**
 * One lane card, expandable.
 *
 * NO DEEP LINK, because there is no `GET /:rateCardId` — a card is only ever reachable through the
 * list it came in, so this row expands in place rather than routing anywhere.
 *
 * **BAND EDITING IS GATED ON `card.bandsEditable`, WHICH IS READ, NOT DERIVED.** The server
 * computes it with the same predicate its 409 uses, against one `now` per request. Recomputing
 * `state === "active" && validFrom > now` here would be a second implementation of the rule that
 * decides whether an operator's work is about to be rejected.
 */
function RateCardRowExpandedPanel({
  card,
  canManage,
}: {
  card: AdminFreightRateCard;
  canManage: boolean;
}) {
  const [bandDrafts, setBandDrafts] = useState<WeightBandDraft[]>(() => toBandDrafts(card));
  const [withdrawReason, setWithdrawReason] = useState("");
  const [shortenUntilLocal, setShortenUntilLocal] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const bandsKey = useResettableAttemptIdempotencyKey();
  const updateKey = useResettableAttemptIdempotencyKey();
  const breaksMutation = useFreightRateBreaksMutation();
  const updateMutation = useUpdateFreightRateCardMutation();

  function handleSaveBands() {
    setLocalError(null);
    const collected = collectBands(bandDrafts);
    if (!collected.ok) {
      setLocalError(collected.error);
      return;
    }
    breaksMutation.mutate(
      {
        action: "replace",
        rateCardId: card.id,
        breaks: collected.bands,
        idempotencyKey: bandsKey.getIdempotencyKey(),
      },
      {
        onSuccess: (result) => {
          if (!result.success) return;
          bandsKey.resetIdempotencyKey();
        },
      },
    );
  }

  const breaksError =
    breaksMutation.data !== undefined && !breaksMutation.data.success
      ? breaksMutation.data.error
      : null;
  const updateError =
    updateMutation.data !== undefined && !updateMutation.data.success
      ? updateMutation.data.error
      : null;

  return (
    <div className="mt-3 space-y-4 border-t border-border pt-3">
      <RateCardBreaksList card={card} />

      {canManage && card.bandsEditable && (
        <RateCardLadderEditor
          bandDrafts={bandDrafts}
          setBandDrafts={setBandDrafts}
          currency={card.currency}
          isPending={breaksMutation.isPending}
          onSave={handleSaveBands}
        />
      )}

      {canManage && !card.bandsEditable && card.state === "active" && (
        <p className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
          This card is in force, so its bands are frozen permanently. There is no way to reopen them
          — if the ladder is wrong, withdraw this card and author a replacement.
        </p>
      )}

      <RateCardErrorNotices
        localError={localError}
        breaksError={breaksError}
        updateError={updateError}
      />

      {canManage && card.state === "active" && (
        <RateCardLifecycleControls
          isPending={updateMutation.isPending}
          shortenUntilLocal={shortenUntilLocal}
          onShortenChange={setShortenUntilLocal}
          withdrawReason={withdrawReason}
          onWithdrawReasonChange={setWithdrawReason}
          onShorten={() =>
            updateMutation.mutate(
              {
                rateCardId: card.id,
                input: {
                  intent: "shorten_window",
                  validUntil: new Date(shortenUntilLocal).toISOString(),
                },
                idempotencyKey: updateKey.getIdempotencyKey(),
              },
              {
                onSuccess: (result) => {
                  if (!result.success) return;
                  updateKey.resetIdempotencyKey();
                },
              },
            )
          }
          onWithdraw={() =>
            updateMutation.mutate(
              {
                rateCardId: card.id,
                input: { intent: "withdraw", reasonNote: withdrawReason.trim() },
                idempotencyKey: updateKey.getIdempotencyKey(),
              },
              {
                onSuccess: (result) => {
                  if (!result.success) return;
                  updateKey.resetIdempotencyKey();
                },
              },
            )
          }
        />
      )}
    </div>
  );
}

/**
 * One lane card, expandable.
 *
 * NO DEEP LINK, because there is no `GET /:rateCardId` — a card is only ever reachable through the
 * list it came in, so this row expands in place rather than routing anywhere.
 *
 * **BAND EDITING IS GATED ON `card.bandsEditable`, WHICH IS READ, NOT DERIVED.** The server
 * computes it with the same predicate its 409 uses, against one `now` per request. Recomputing
 * `state === "active" && validFrom > now` here would be a second implementation of the rule that
 * decides whether an operator's work is about to be rejected.
 */
export default function RateCardRow({
  card,
  canManage,
}: {
  card: AdminFreightRateCard;
  canManage: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isZeroFloorCovered = hasZeroWeightFloorBand(card.breaks);
  const smallestFloorGrams = smallestWeightFloorGrams(card.breaks);

  return (
    <li className="rounded-2xl border border-border p-4">
      <RateCardRowSummary
        card={card}
        isExpanded={isExpanded}
        onToggleExpand={() => setIsExpanded(!isExpanded)}
      />

      {/*
        DERIVED IN THE BROWSER AND SAID SO. There is no server-side coverage read, but `breaks[]` is
        nested in the card, so this is arithmetic over data already on screen rather than a second
        source of truth.
      */}
      {!isZeroFloorCovered && smallestFloorGrams !== null && (
        <p className="mt-2 rounded-xl bg-warning-container p-2 text-xs text-warning-container-foreground">
          No band starts at 0 g — the lightest this card prices is{" "}
          {formatGramsLabel(smallestFloorGrams)}. Anything under that reaches the buyer as an empty
          delivery list, which looks exactly like a lane with no card at all. (Worked out from the
          bands below, not reported by the server.)
        </p>
      )}

      {card.supersededByRateCardId !== null && (
        <p className="mt-2 text-xs text-muted-foreground">
          Replaced by card <code>{card.supersededByRateCardId}</code>.
        </p>
      )}

      {isExpanded && <RateCardRowExpandedPanel card={card} canManage={canManage} />}
    </li>
  );
}

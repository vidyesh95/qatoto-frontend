// TRANSPORT: client-query — "use client" island. Writes PATCH /commerce/admin/freight-rate-cards
// /:rateCardId and PATCH …/:rateCardId/breaks.
"use client";

import { useState } from "react";

import { renderFieldErrors } from "@/components/admin/freight/rate-card-composer";
import WeightBandEditor, {
  collectBands,
  type WeightBandDraft,
} from "@/components/admin/freight/weight-band-editor";
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
  active: "bg-[#00696E]/10 text-[#00696E]",
  superseded: "bg-muted text-muted-foreground",
  withdrawn: "bg-red-50 text-red-800",
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
  const [bandDrafts, setBandDrafts] = useState<WeightBandDraft[]>(() => toBandDrafts(card));
  const [withdrawReason, setWithdrawReason] = useState("");
  const [shortenUntilLocal, setShortenUntilLocal] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const bandsKey = useResettableAttemptIdempotencyKey();
  const updateKey = useResettableAttemptIdempotencyKey();
  const breaksMutation = useFreightRateBreaksMutation();
  const updateMutation = useUpdateFreightRateCardMutation();

  const isZeroFloorCovered = hasZeroWeightFloorBand(card.breaks);
  const smallestFloorGrams = smallestWeightFloorGrams(card.breaks);

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
    <li className="rounded-2xl border border-border p-4">
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
            <span className="rounded-full bg-[#D6E3FF] px-2 py-0.5 text-xs font-medium text-[#191C1C]">
              Staged · bands editable
            </span>
          ) : (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              Bands frozen
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={QUIET_BUTTON_CLASS}
          >
            {isExpanded ? "Hide" : "Open"}
          </button>
        </div>
      </div>

      {/*
        DERIVED IN THE BROWSER AND SAID SO. There is no server-side coverage read, but `breaks[]` is
        nested in the card, so this is arithmetic over data already on screen rather than a second
        source of truth.
      */}
      {!isZeroFloorCovered && smallestFloorGrams !== null && (
        <p className="mt-2 rounded-xl bg-amber-50 p-2 text-xs text-amber-900">
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

      {isExpanded && (
        <div className="mt-3 space-y-4 border-t border-border pt-3">
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

          {canManage && card.bandsEditable && (
            <div className="space-y-2">
              <WeightBandEditor
                bandDrafts={bandDrafts}
                onChange={setBandDrafts}
                currency={card.currency}
                isDisabled={breaksMutation.isPending}
              />
              {/* Replace, never per-band edit: there is no delete route, so removing a band means
                  sending every band being kept. The set can never reach zero. */}
              <button
                type="button"
                onClick={handleSaveBands}
                disabled={breaksMutation.isPending}
                className={QUIET_BUTTON_CLASS}
              >
                {breaksMutation.isPending ? "Saving…" : "Replace the ladder"}
              </button>
            </div>
          )}

          {canManage && !card.bandsEditable && card.state === "active" && (
            <p className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
              This card is in force, so its bands are frozen permanently. There is no way to reopen
              them — if the ladder is wrong, withdraw this card and author a replacement.
            </p>
          )}

          {localError !== null && (
            <p className="rounded-xl bg-red-50 p-3 text-xs text-red-800">{localError}</p>
          )}

          {breaksError !== null && (
            <div className="space-y-1 rounded-xl bg-red-50 p-3 text-xs text-red-800">
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

          {canManage && card.state === "active" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="block space-y-1">
                  <span className="text-xs text-muted-foreground">
                    Shorten the window (a window may only ever be shortened)
                  </span>
                  <input
                    type="datetime-local"
                    value={shortenUntilLocal}
                    onChange={(event) => setShortenUntilLocal(event.target.value)}
                    className={FIELD_CLASS}
                  />
                </label>
                <button
                  type="button"
                  disabled={updateMutation.isPending || shortenUntilLocal.length === 0}
                  onClick={() =>
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
                    onChange={(event) => setWithdrawReason(event.target.value)}
                    placeholder="Why is this card coming down?"
                    className={FIELD_CLASS}
                  />
                </label>
                <button
                  type="button"
                  disabled={updateMutation.isPending || withdrawReason.trim().length === 0}
                  onClick={() =>
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
                  className={QUIET_BUTTON_CLASS}
                >
                  Withdraw
                </button>
              </div>
            </div>
          )}

          {updateError !== null && (
            <div className="space-y-1 rounded-xl bg-red-50 p-3 text-xs text-red-800">
              <p className="font-medium">{updateError.message}</p>
              {renderFieldErrors(updateError.fieldErrors)}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

// TRANSPORT: client-query — "use client" island over GET /commerce/provider/freight-rate-cards.
"use client";

import { useState } from "react";

import { renderFieldErrors } from "@/components/commerce/freight/field-errors";
import WeightBandEditor, {
  collectBands,
  type WeightBandDraft,
} from "@/components/commerce/freight/weight-band-editor";
import ProviderRateCardComposer from "@/components/studio/commerce/logistics/rate-card-composer";
import {
  useProviderFreightRateBreaksMutation,
  useProviderFreightRateCardsList,
  useUpdateProviderFreightRateCardMutation,
} from "@/hooks/store/provider-freight";
import { useResettableAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";
import {
  FREIGHT_RATE_CARD_STATE_LABELS,
  hasZeroWeightFloorBand,
  type AdminFreightRateCard,
} from "@/lib/store/admin-freight.schemas";
import { formatIsoInstantLabel } from "@/lib/store/format";
import { FREIGHT_TRANSPORT_MODE_LABELS } from "@/lib/store/labels";

/**
 * THE LANES THIS FORWARDER PRICES (§19.12).
 *
 * Scoped by the SESSION, never by a filter: there is no `providerOrganizationId` on this route in
 * either direction, so there is no spelling for anybody else's cards and none is offered.
 *
 * ⚠️ A 403 HERE IS AN ANSWER, NOT A FAILED LOAD. Publishing rates needs a `verified` provider kind
 * link of `freight_forwarder` or `logistics_operator`; until the organization has one, every call
 * is a correct refusal. The server's own sentence says which, so it is rendered verbatim and
 * without an action button — a 401 earns a sign-in link, a 403 does not.
 *
 * ⚠️ AND A 404 ALSO MEANS "NOT YOURS", so nothing here may word one as deletion.
 */

const CARD_CLASS = "rounded-2xl border border-border p-4";
const FIELD_CLASS = "w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm";
const QUIET_BUTTON_CLASS =
  "cursor-pointer rounded-full border border-border px-4 py-2 text-sm font-medium disabled:opacity-50";

export default function MyRateCardList() {
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const cardsList = useProviderFreightRateCardsList({});

  const uncoveredCount = cardsList.rows.filter(
    (card) => card.state === "active" && !hasZeroWeightFloorBand(card.breaks),
  ).length;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-foreground">Your lanes</h2>
        {!isComposerOpen && (
          <button
            type="button"
            onClick={() => setIsComposerOpen(true)}
            className={QUIET_BUTTON_CLASS}
          >
            Publish a lane
          </button>
        )}
      </div>

      {isComposerOpen && <ProviderRateCardComposer onClose={() => setIsComposerOpen(false)} />}

      {cardsList.isLoadingFirstPage && (
        <p className="text-sm text-muted-foreground">Loading your lanes…</p>
      )}

      {/*
       * The server's own sentence, verbatim. For a provider who is not yet verified this reads
       * "Publishing freight rates requires a verified freight forwarder or logistics operator
       * profile." — which is the whole explanation, and is not something this component should
       * paraphrase or dress up as an empty state.
       */}
      {cardsList.firstPageErrorMessage !== null && (
        <p className="rounded-xl border border-border px-6 py-16 text-center text-sm text-muted-foreground">
          {cardsList.firstPageErrorMessage}
        </p>
      )}

      {!cardsList.isLoadingFirstPage &&
        cardsList.firstPageErrorMessage === null &&
        cardsList.rows.length === 0 && (
          <div className="space-y-1 rounded-xl bg-muted/40 p-3 text-sm">
            <p className="font-medium text-foreground">You have not published a lane yet.</p>
            <p className="text-xs text-muted-foreground">
              Until you do, buyers asking about your routes see no shipping price and no delivery
              estimate — the lane reads as uncovered.
            </p>
          </div>
        )}

      {uncoveredCount > 0 && (
        <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
          {uncoveredCount} live card{uncoveredCount === 1 ? " has" : "s have"} no band starting at 0
          kg. Consignments below their smallest band reach the buyer as an empty delivery sheet,
          which looks the same as a lane you do not serve. (Counted from the rows loaded here.)
        </p>
      )}

      <ul className="space-y-2">
        {cardsList.rows.map((card) => (
          <MyRateCardRow key={card.id} card={card} />
        ))}
      </ul>

      {cardsList.hasNextPage && (
        <div className="space-y-1">
          <button
            type="button"
            onClick={cardsList.loadNextPage}
            disabled={cardsList.isFetchingNextPage}
            className={QUIET_BUTTON_CLASS}
          >
            {cardsList.isFetchingNextPage ? "Loading…" : "Load more lanes"}
          </button>
          {/* No total and no previous cursor come back, so there is no honest count to render. */}
          <p className="text-xs text-muted-foreground">
            {cardsList.rows.length} loaded. The server reports no total.
          </p>
        </div>
      )}

      {cardsList.loadMoreErrorMessage !== null && (
        <p className="text-xs text-destructive">{cardsList.loadMoreErrorMessage}</p>
      )}
    </section>
  );
}

function toBandDrafts(card: AdminFreightRateCard): WeightBandDraft[] {
  // The server's own break id doubles as the React key — it is stable and already unique.
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

function MyRateCardRow({ card }: { card: AdminFreightRateCard }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [bandDrafts, setBandDrafts] = useState<WeightBandDraft[]>(() => toBandDrafts(card));
  const [withdrawReason, setWithdrawReason] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const breaksMutation = useProviderFreightRateBreaksMutation();
  const updateMutation = useUpdateProviderFreightRateCardMutation();
  const bandsKey = useResettableAttemptIdempotencyKey();
  const updateKey = useResettableAttemptIdempotencyKey();

  function handleReplaceBands(): void {
    setLocalError(null);

    const collected = collectBands(bandDrafts);
    if (!collected.ok) {
      setLocalError(collected.error);
      return;
    }
    /*
     * ⚠️ REPLACE IS THE ONLY WRITE THAT CAN DELETE THE FLOOR BAND off a card that had one, which
     * blanks the lane as thoroughly as never authoring it. The server refuses such a set; refusing
     * it here too means the author is told before the round trip.
     */
    if (!collected.bands.some((band) => band.minBillableWeightGrams === 0)) {
      setLocalError(
        "Keep a band starting at 0 kg. Without one this lane stops publishing any option at all.",
      );
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

  function handleWithdraw(): void {
    setLocalError(null);
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
    );
  }

  const breaksError = breaksMutation.data?.success === false ? breaksMutation.data.error : null;
  const updateError = updateMutation.data?.success === false ? updateMutation.data.error : null;

  return (
    <li className={CARD_CLASS}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">
            {card.originCountryCode} → {card.destinationCountryCode} ·{" "}
            {FREIGHT_TRANSPORT_MODE_LABELS[card.mode]} · {card.currency}
          </p>
          <p className="text-xs text-muted-foreground">
            starts {formatIsoInstantLabel(card.validFrom)}
            {card.validUntil !== null &&
              ` · until ${formatIsoInstantLabel(card.validUntil)}`} ·{" "}
            {card.breaks.length} band(s)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {FREIGHT_RATE_CARD_STATE_LABELS[card.state]}
          </span>
          {/*
           * READ, NEVER DERIVED. `bandsEditable` is the same predicate the 409 comes from, computed
           * server-side against one instant; deriving `state === "active" && validFrom > now` here
           * would put the deciding rule in two codebases and disagree across ordinary clock skew —
           * enabling a control the very next request refuses.
           */}
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {card.bandsEditable ? "Staged · bands editable" : "Bands frozen"}
          </span>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="cursor-pointer text-xs underline"
          >
            {isExpanded ? "Hide" : "Open"}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3 space-y-3">
          {card.bandsEditable ? (
            <div>
              <WeightBandEditor
                bandDrafts={bandDrafts}
                onChange={setBandDrafts}
                currency={card.currency}
                isDisabled={breaksMutation.isPending}
              />
              <button
                type="button"
                onClick={handleReplaceBands}
                disabled={breaksMutation.isPending}
                className={`${QUIET_BUTTON_CLASS} mt-2`}
              >
                {breaksMutation.isPending ? "Saving…" : "Replace the ladder"}
              </button>
            </div>
          ) : (
            <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              This card has started pricing, so its bands are frozen. Publish a new card for the
              lane to change them — it will close this one when it starts.
            </p>
          )}

          {localError !== null && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {localError}
            </p>
          )}

          {breaksError !== null && (
            <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <p className="font-medium">{breaksError.message}</p>
              {renderFieldErrors(breaksError.fieldErrors)}
              {breaksError.code === "409" && (
                <p className="mt-1">
                  This card is in force now. Retrying will not help — publish a new card instead.
                </p>
              )}
            </div>
          )}

          {card.state === "active" && (
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs font-medium text-foreground">Withdraw this lane</p>
              <p className="mt-1 text-xs text-muted-foreground">
                It stops pricing immediately. Buyers see the lane as uncovered again.
              </p>
              <input
                value={withdrawReason}
                onChange={(event) => setWithdrawReason(event.target.value)}
                placeholder="Why it is being withdrawn"
                aria-label="Reason for withdrawing this lane"
                className={`${FIELD_CLASS} mt-2`}
              />
              <button
                type="button"
                onClick={handleWithdraw}
                disabled={updateMutation.isPending || withdrawReason.trim().length === 0}
                className={`${QUIET_BUTTON_CLASS} mt-2`}
              >
                {updateMutation.isPending ? "Withdrawing…" : "Withdraw"}
              </button>
            </div>
          )}

          {updateError !== null && (
            <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <p className="font-medium">{updateError.message}</p>
              {renderFieldErrors(updateError.fieldErrors)}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

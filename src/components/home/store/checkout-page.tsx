// TRANSPORT: client-query — prepares and confirms through React Query mutations.
"use client";

// `/checkout`. Prepare → review → confirm.
//
// FIVE RULES, and each one is here because getting it wrong costs money rather than polish.
//
//  1. PREPARE IS NOT A PREVIEW. It RESERVES STOCK with row locks and a bounded expiry, and a worker
//     releases it. So it fires on an explicit buyer action and NEVER on mount, on a timer, or in a
//     retry loop — a prepare left open holds stock against other buyers for as long as the tab is.
//     That is why this page opens on a review step with a button, not on a spinner.
//  2. THE IDEMPOTENCY KEY IS MINTED ONCE PER ATTEMPT, IN THIS COMPONENT'S STATE. Not in the hook, not
//     in the api module: both would produce a fresh key per call, and a fresh key on retry is not
//     idempotency — it is a second set of orders. It is minted when the buyer opens the confirm step
//     and reused for every retry of that attempt.
//  3. CONFIRM PRODUCES ONE ORDER PER COUNTERPARTY. Not one order. The screen after confirm therefore
//     lists orders, plural, because that is what the buyer now has.
//  4. NOBODY HOLDS THE MONEY, and this page says so before the buyer confirms rather than after.
//     §14 decided Qatoto is not a custodian; a checkout that stays silent about that is implying
//     the opposite. The rail a direct checkout actually lands on is `direct_processor` — the
//     processor settles buyer straight to seller and the funds never rest anywhere Qatoto can see.
//     (This rule USED TO SAY `direct_offline`, which was wrong: `confirmCheckout` passes
//     `hasProcessorPayment: true` unconditionally, so a direct checkout is only ever
//     `direct_processor`, or `external_escrow` when the buyer names an accepted agreement.
//     `direct_offline` belongs to quote-originated orders settled by wire, which never come through
//     this page. The rendered rail below has always come off the server's own response, so only the
//     comment was wrong — but it would have sent the next reader looking for a wire-transfer UI.)
//  5. `pending_payment` IS NOT PAID. The confirmation says the orders exist and nothing has been
//     paid, because the state literally says so. Paying happens on the order page, which is where
//     the payment intent and its polling live.
//
// One thing deliberately absent: an address picker. Addresses belong to an ORGANIZATION and the
// backend caps them per kind, but `commerce_organization.tradeState` starts `pending`, so a new
// buyer's first address sits behind staff verification. Sending no `deliveryAddressId` is the
// honest state until then, and the copy says what is missing rather than showing an empty select.
//
// `BuyerWorkspaceNotice` IS THE OTHER HALF OF THAT SAME FACT. A37's auto-provisioning ships now, so
// a new buyer HAS a workspace — a `pending` one, which this page's prepare accepts and its confirm
// refuses. The notice says which of those the buyer is looking at and offers the one step they can
// take about it.

import { useState } from "react";

import Link from "next/link";

import {
  ComponentRow,
  CustomsLine,
  FreightLine,
  ManufacturingLine,
} from "@/components/commerce/sections/arrival-window-component-lines";
import BuyerWorkspaceNotice from "@/components/home/store/sections/buyer-workspace-notice";
import StatusPanel from "@/components/home/shared/status-panel";
import { useCartQuery, useConfirmCheckout, usePrepareCheckout } from "@/hooks/store/cart";
import { newIdempotencyKey } from "@/lib/idempotency";
import { ARRIVAL_WINDOW_COMPONENT_LABELS } from "@/lib/store/arrival-window.schemas";
import type { CheckoutPrepare, ConfirmCheckout } from "@/lib/store/cart.schemas";
import { SETTLEMENT_RAIL_LABELS } from "@/lib/store/cart.schemas";
import { formatCentsLabel, formatCountLabel } from "@/lib/store/format";

/**
 * Where the buyer is in the flow.
 *
 * A union rather than three booleans, so "reserved and confirming" cannot coexist with "not yet
 * reserved" — and so the `confirmed` state carries the orders it produced instead of leaving them in a
 * separate nullable field nobody clears.
 */
type CheckoutStep =
  | { status: "review" }
  | { status: "reserved"; prepare: CheckoutPrepare; idempotencyKey: string }
  | { status: "confirmed"; confirmation: ConfirmCheckout };

export default function CheckoutPage() {
  const cartQuery = useCartQuery();
  const prepareCheckout = usePrepareCheckout();
  const confirmCheckout = useConfirmCheckout();

  const [step, setStep] = useState<CheckoutStep>({ status: "review" });

  /**
   * PREPARE HAS ITS OWN KEY, and it is a different key from the confirm's.
   *
   * The route requires one — a prepare reserves stock, so a retry without a key holds it twice —
   * and the two attempts are two different acts: reserving is not ordering, and one key covering
   * both would make a retried confirm dedupe against the reservation that preceded it.
   *
   * `useState(newIdempotencyKey)` passes the function UNCALLED so it runs once per mount rather
   * than once per render. Calling it at page top level would also break the build under
   * `cacheComponents`, where `crypto.randomUUID()` runs during prerender.
   *
   * It ROTATES ONLY AFTER A CONFIRMED SUCCESS. A buyer who edits the cart and reserves again is
   * making a genuinely new reservation and needs a new key; a buyer retrying a timed-out prepare
   * needs the same one, which is what a rotation on failure would destroy.
   */
  const [prepareIdempotencyKey, setPrepareIdempotencyKey] = useState(newIdempotencyKey);

  const handlePrepareClick = () => {
    prepareCheckout.mutate(
      { idempotencyKey: prepareIdempotencyKey },
      {
        onSuccess: (result) => {
          if (!result.success) return;
          setPrepareIdempotencyKey(newIdempotencyKey());
          // THE KEY IS MINTED HERE, ONCE, as the attempt begins — and it lives in state so every
          // retry of this confirm carries the same one. Minting it inside the confirm handler would
          // give each press a new key, which is exactly the duplicate-order bug idempotency exists
          // to prevent.
          setStep({
            status: "reserved",
            prepare: result.data,
            idempotencyKey: newIdempotencyKey(),
          });
        },
      },
    );
  };

  const handleConfirmClick = () => {
    if (step.status !== "reserved") return;
    confirmCheckout.mutate(
      { prepare: step.prepare, idempotencyKey: step.idempotencyKey },
      {
        onSuccess: (result) => {
          if (!result.success) return;
          setStep({ status: "confirmed", confirmation: result.data });
        },
      },
    );
  };

  return (
    <div className="mx-auto w-full max-w-3xl pb-10">
      <header className="px-4 pt-4 lg:px-6">
        <h1 className="font-serif text-2xl font-semibold text-[#191C1C] md:text-3xl">Checkout</h1>
      </header>

      {renderStep({
        step,
        cartQuery,
        prepareCheckout,
        confirmCheckout,
        onPrepareClick: handlePrepareClick,
        onConfirmClick: handleConfirmClick,
      })}
    </div>
  );
}

function renderStep({
  step,
  cartQuery,
  prepareCheckout,
  confirmCheckout,
  onPrepareClick,
  onConfirmClick,
}: {
  step: CheckoutStep;
  cartQuery: ReturnType<typeof useCartQuery>;
  prepareCheckout: ReturnType<typeof usePrepareCheckout>;
  confirmCheckout: ReturnType<typeof useConfirmCheckout>;
  onPrepareClick: () => void;
  onConfirmClick: () => void;
}) {
  switch (step.status) {
    case "review":
      return (
        <ReviewStep
          cartQuery={cartQuery}
          prepareCheckout={prepareCheckout}
          onPrepareClick={onPrepareClick}
        />
      );
    case "reserved":
      return (
        <ReservedStep
          prepare={step.prepare}
          confirmCheckout={confirmCheckout}
          onConfirmClick={onConfirmClick}
        />
      );
    case "confirmed":
      return <ConfirmedStep confirmation={step.confirmation} />;
    default: {
      const exhaustiveCheck: never = step;
      return exhaustiveCheck;
    }
  }
}

function ReviewStep({
  cartQuery,
  prepareCheckout,
  onPrepareClick,
}: {
  cartQuery: ReturnType<typeof useCartQuery>;
  prepareCheckout: ReturnType<typeof usePrepareCheckout>;
  onPrepareClick: () => void;
}) {
  if (cartQuery.isPending) {
    return <p className="px-4 pt-6 text-sm text-muted-foreground lg:px-6">Loading your cart…</p>;
  }

  const cartResult = cartQuery.data;
  if (cartResult === undefined || !cartResult.success) {
    return (
      <div className="px-4 pt-6 lg:px-6">
        <StatusPanel
          message={cartResult?.error.message ?? "Couldn't load your cart."}
          className="border border-[#CAC4D0]/60 px-6 py-16"
        />
      </div>
    );
  }

  if (cartResult.data.items.length === 0) {
    return (
      <div className="px-4 pt-6 lg:px-6">
        <StatusPanel
          message="Your cart is empty, so there is nothing to check out."
          className="border border-[#CAC4D0]/60 px-6 py-16"
          action={
            <Link
              href="/store"
              className="rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white"
            >
              Browse the store
            </Link>
          }
        />
      </div>
    );
  }

  const prepareResult = prepareCheckout.data;

  return (
    <div className="space-y-3 px-4 pt-4 lg:px-6">
      {/* ABOVE the reserve button, not beside the confirm one. Prepare succeeds on a pending
          workspace and confirm does not, so a buyer told only at the confirm step would have
          already taken stock off the shelf to learn it. */}
      <BuyerWorkspaceNotice />

      <div className="rounded-xl border border-[#CAC4D0]/60 px-4 py-3">
        <p className="text-sm leading-5 text-[#191C1C]">
          {formatCountLabel(cartResult.data.items.length)}{" "}
          {cartResult.data.items.length === 1 ? "line" : "lines"} ready to reserve.
        </p>

        {/* The address gap, stated rather than mocked with an empty select. */}
        <p className="mt-2 rounded-lg bg-[#F2F4F4] px-3 py-2 text-xs leading-4 text-[#6F7979]">
          No delivery address is attached yet. Addresses belong to a buyer organization, and
          organization setup is not wired on this surface — the reservation below works without one,
          and a seller cannot ship without it.
        </p>

        <button
          type="button"
          onClick={onPrepareClick}
          disabled={prepareCheckout.isPending}
          className="mt-3 w-full cursor-pointer rounded-full bg-[#00696E] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {prepareCheckout.isPending ? "Reserving…" : "Reserve stock and see totals"}
        </button>

        {/* Said BEFORE the press, because the press is the thing that takes stock off the shelf. */}
        <p className="mt-1.5 text-[11px] leading-4 text-[#6F7979]">
          This reserves the stock for a short window. Nothing is ordered and nothing is paid.
        </p>

        {prepareResult !== undefined && !prepareResult.success && (
          <p className="mt-2 text-xs leading-4 text-destructive">{prepareResult.error.message}</p>
        )}
        {prepareCheckout.isError && (
          <p className="mt-2 text-xs leading-4 text-destructive">
            Couldn&apos;t reach the server. Nothing was reserved.
          </p>
        )}
      </div>
    </div>
  );
}

function ReservedStep({
  prepare,
  confirmCheckout,
  onConfirmClick,
}: {
  prepare: CheckoutPrepare;
  confirmCheckout: ReturnType<typeof useConfirmCheckout>;
  onConfirmClick: () => void;
}) {
  const sellerOrganizationIds = [
    ...new Set(prepare.items.map((item) => item.sellerOrganizationId)),
  ];
  const confirmResult = confirmCheckout.data;

  return (
    <div className="space-y-4 px-4 pt-4 lg:px-6">
      <section
        aria-label="Reserved lines"
        className="rounded-xl border border-[#CAC4D0]/60 px-4 py-3"
      >
        <p className="text-[11px] leading-4 font-medium tracking-[0.5px] text-[#6F7979] uppercase">
          Reserved
        </p>
        <ul className="mt-2 space-y-2">
          {prepare.items.map((line) => (
            // KEYED ON THE VARIANT TOO. Two variants of one listing are two prepare lines with
            // the same product and seller, so the old key collided the moment variants became
            // authorable — React would reuse one row's DOM for the other.
            <li
              key={`${line.productId}-${line.sellerOrganizationId}-${line.variantNameSnapshot ?? ""}`}
              className="flex gap-3"
            >
              <span className="min-w-0 flex-1 text-sm leading-5 text-[#191C1C]">
                {line.title}
                {line.variantNameSnapshot !== null && (
                  <span className="block text-xs leading-4 text-[#6F7979]">
                    {line.variantNameSnapshot}
                  </span>
                )}
              </span>
              <span className="text-xs leading-4 text-[#6F7979]">
                × {formatCountLabel(line.quantity)}
              </span>
              <span className="text-sm leading-5 font-medium text-[#191C1C]">
                {formatCentsLabel(line.lineTotalInCents, line.currency)}
              </span>
            </li>
          ))}
        </ul>

        {/* The reservation expires. Shown as the server's own instant rather than a countdown: a
            countdown implies the client is tracking something it is not, and the release is a worker's
            job. */}
        <p className="mt-2 text-[11px] leading-4 text-[#6F7979]">
          Reserved until {prepare.expiresAt}. After that the stock goes back to other buyers.
        </p>
      </section>

      <section aria-label="Totals" className="rounded-xl border border-[#CAC4D0]/60 px-4 py-3">
        <dl className="space-y-2">
          {prepare.currencyTotals.map((total) => (
            <div key={total.currency} className="space-y-0.5">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-xs leading-4 text-[#6F7979]">Subtotal, {total.currency}</dt>
                <dd className="text-sm leading-5 text-[#191C1C]">
                  {formatCentsLabel(total.subtotalInCents, total.currency)}
                </dd>
              </div>
              {/* Freight is shown as its own line reading "not charged" rather than as `$0.00`, which
                  would read as free shipping. Nothing is charged for freight, and that is a decision:
                  billing from an indicative estimate with no booking behind it would put an invented
                  number into an immutable order. */}
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-xs leading-4 text-[#6F7979]">Freight</dt>
                <dd className="text-xs leading-4 text-[#6F7979]">
                  Not charged — arranged separately
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-xs leading-4 text-[#6F7979]">Taxes and duties</dt>
                <dd className="text-xs leading-4 text-[#6F7979]">Not included</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t border-[#CAC4D0]/60 pt-1">
                <dt className="text-sm leading-5 font-medium text-[#191C1C]">
                  Total, {total.currency}
                </dt>
                <dd className="text-sm leading-5 font-medium text-[#191C1C]">
                  {formatCentsLabel(total.totalInCents, total.currency)}
                </dd>
              </div>
            </div>
          ))}
        </dl>

        {prepare.currencyTotals.length > 1 && (
          <p className="mt-2 text-[11px] leading-4 text-[#6F7979]">
            Separate totals per currency, never summed.
          </p>
        )}
      </section>

      <DeliveryEstimateSection prepare={prepare} />

      <PrepareArrivalWindowSection prepare={prepare} />

      <section
        aria-label="How this settles"
        className="rounded-xl border border-[#CAC4D0]/60 px-4 py-3"
      >
        <p className="text-[11px] leading-4 font-medium tracking-[0.5px] text-[#6F7979] uppercase">
          How this settles
        </p>
        {/* SAID BEFORE CONFIRMING. The default rail is `direct_offline` and nobody holds the money;
            a checkout silent about that implies the opposite. There is no escrow agreement to name
            here — that is something the two parties negotiate in their own thread first. */}
        <p className="mt-1 text-sm leading-5 text-[#191C1C]">
          {SETTLEMENT_RAIL_LABELS.direct_offline}
        </p>
        <p className="mt-1 text-[11px] leading-4 text-[#6F7979]">
          You and the seller can agree on a licensed escrow provider separately. Without one, you
          carry the counterparty risk.
        </p>
      </section>

      <div className="rounded-xl border border-[#CAC4D0]/60 px-4 py-3">
        <button
          type="button"
          onClick={onConfirmClick}
          disabled={confirmCheckout.isPending}
          className="w-full cursor-pointer rounded-full bg-[#00696E] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {confirmCheckout.isPending
            ? "Placing orders…"
            : `Place ${formatCountLabel(sellerOrganizationIds.length)} ${sellerOrganizationIds.length === 1 ? "order" : "orders"}`}
        </button>
        <p className="mt-1.5 text-[11px] leading-4 text-[#6F7979]">
          One order per seller. Nothing is paid at this step.
        </p>

        {confirmResult !== undefined && !confirmResult.success && (
          <p className="mt-2 text-xs leading-4 text-destructive">{confirmResult.error.message}</p>
        )}
        {/* A NETWORK FAILURE IS THE CASE IDEMPOTENCY EXISTS FOR, and the copy has to be careful: the
            orders may well have been created. Retrying is safe BECAUSE the key is reused, and telling
            the buyer that is better than either "it failed" or "try again" alone. */}
        {confirmCheckout.isError && (
          <p className="mt-2 text-xs leading-4 text-destructive">
            Couldn&apos;t reach the server. Your orders may already have been placed — pressing
            again is safe and will not create duplicates.
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * What the journey is MADE OF, before there is a journey.
 *
 * THE ONE RULE ON THIS PANEL: it never prints a date. `arrivalWindow` is null at prepare time by
 * construction — there is no order, so no clock has started — and the backend says so rather than
 * approximating. What IS real here is the three components and, where one is unknown, its name.
 *
 * SO AN UNKNOWN COMPONENT IS RENDERED, NOT HIDDEN. "We cannot tell you when this arrives" is a
 * different statement from silence, and the second reads as an omission. `missingComponents`
 * exists precisely so the absence can be attributed — the manufacturing arm is in that list
 * because a seller who declared no lead time would otherwise produce a null window with an empty
 * reason, which is an unnamed absence.
 *
 * NO MODE PICKER, unlike the order panel. Choosing a freight mode re-prices an order, and there is
 * no order yet; `mode_not_selected` is reported here as the reason it is.
 */
function PrepareArrivalWindowSection({ prepare }: { prepare: CheckoutPrepare }) {
  if (prepare.arrivalWindows.length === 0) return null;

  return (
    <section
      aria-label="What this journey is made of"
      className="rounded-xl border border-[#CAC4D0]/60 px-4 py-3"
    >
      <p className="text-[11px] leading-4 font-medium tracking-[0.5px] text-[#6F7979] uppercase">
        Journey breakdown
      </p>

      <ul className="mt-2 space-y-3">
        {prepare.arrivalWindows.map((sellerWindow) => (
          <li key={sellerWindow.sellerOrganizationId}>
            <dl className="flex flex-col gap-2">
              <ComponentRow name="manufacturing">
                <ManufacturingLine
                  component={sellerWindow.arrivalWindow.components.manufacturing}
                />
              </ComponentRow>
              <ComponentRow name="freight">
                {/* No `onSelectMode` — see the note above. */}
                <FreightLine component={sellerWindow.arrivalWindow.components.freight} />
              </ComponentRow>
              <ComponentRow name="customs">
                <CustomsLine component={sellerWindow.arrivalWindow.components.customs} />
              </ComponentRow>
            </dl>

            {sellerWindow.arrivalWindow.missingComponents.length > 0 && (
              <p className="mt-1.5 text-xs leading-4 text-[#6F7979]">
                No arrival window can be given for this seller yet —{" "}
                {sellerWindow.arrivalWindow.missingComponents
                  .map((componentName) =>
                    ARRIVAL_WINDOW_COMPONENT_LABELS[componentName].toLowerCase(),
                  )
                  .join(", ")}{" "}
                {sellerWindow.arrivalWindow.missingComponents.length === 1 ? "is" : "are"} still
                unknown.
              </p>
            )}
          </li>
        ))}
      </ul>

      {/* The same closing rule as the freight panel above, for the same reason: the absence of a
          date here is deliberate, and saying so stops it reading as a bug. */}
      <p className="mt-2 text-[11px] leading-4 text-[#6F7979]">
        Durations only. Nothing above is a delivery date — the clock starts when the order is
        confirmed, not when it is prepared.
      </p>
    </section>
  );
}

function DeliveryEstimateSection({ prepare }: { prepare: CheckoutPrepare }) {
  if (prepare.deliveryEstimates.length === 0) return null;

  return (
    <section
      aria-label="Indicative delivery"
      className="rounded-xl border border-[#CAC4D0]/60 px-4 py-3"
    >
      <p className="text-[11px] leading-4 font-medium tracking-[0.5px] text-[#6F7979] uppercase">
        Indicative freight
      </p>

      <ul className="mt-2 space-y-2">
        {prepare.deliveryEstimates.map((sellerEstimate) => (
          <li key={sellerEstimate.sellerOrganizationId}>
            {sellerEstimate.estimates.length === 0 ? (
              // AN EMPTY LIST MEANS "WE DO NOT KNOW", NOT "FREE". The mock this replaces rendered
              // "Free Delivery" for exactly this case, which is the specific lie the empty array
              // exists to prevent.
              <p className="text-xs leading-4 text-[#6F7979]">
                No covering freight provider was found for this seller&apos;s lane. That is not the
                same as free — you will need to arrange it.
              </p>
            ) : (
              sellerEstimate.estimates.map((estimate) => (
                <p key={estimate.currency} className="text-xs leading-4 text-[#191C1C]">
                  {formatCentsLabel(estimate.estimatedMinInCents, estimate.currency)} –{" "}
                  {formatCentsLabel(estimate.estimatedMaxInCents, estimate.currency)}
                  {estimate.leadTimeMinDays !== null && estimate.leadTimeMaxDays !== null && (
                    <span className="text-[#6F7979]">
                      {" "}
                      · {estimate.leadTimeMinDays}–{estimate.leadTimeMaxDays} days in transit
                    </span>
                  )}
                  {estimate.basis.hasIncompletePackageData && (
                    <span className="text-[#6F7979]">
                      {" "}
                      · the seller has not declared full package dimensions, so this is weaker than
                      usual
                    </span>
                  )}
                </p>
              ))
            )}
          </li>
        ))}
      </ul>

      {/* No delivery DATE anywhere above, and this says why rather than leaving it looking like an
          omission. */}
      <p className="mt-2 text-[11px] leading-4 text-[#6F7979]">
        Indicative only, from providers&apos; published coverage. Not a booking, not a quote, and no
        delivery date — nothing here has been arranged with a carrier yet.
      </p>
    </section>
  );
}

function ConfirmedStep({ confirmation }: { confirmation: ConfirmCheckout }) {
  return (
    <div className="px-4 pt-4 lg:px-6">
      <div className="rounded-xl border border-[#CAC4D0]/60 px-4 py-4">
        <h2 className="text-base font-medium text-[#191C1C]">
          {confirmation.orders.length === 1
            ? "Your order is placed"
            : `Your ${formatCountLabel(confirmation.orders.length)} orders are placed`}
        </h2>

        {/* `pending_payment` IS NOT PAID, and the state says so literally. A confirmation screen that
            implies otherwise is the single most misleading thing this flow could do. */}
        <p className="mt-1 text-sm leading-5 text-[#6F7979]">
          Nothing has been paid yet. Each seller will confirm their own order, and you settle with
          them directly.
        </p>

        <ul className="mt-3 space-y-2">
          {confirmation.orders.map((order) => (
            <li key={order.id} className="rounded-lg bg-[#F2F4F4] px-3 py-2">
              <p className="text-sm leading-5 font-medium text-[#191C1C]">
                {order.counterpartyLegalNameSnapshot}
              </p>
              <p className="text-xs leading-4 text-[#6F7979]">
                {formatCentsLabel(order.totalInCents, order.currency)} ·{" "}
                {SETTLEMENT_RAIL_LABELS[order.settlementRail]}
              </p>
              {/* Absence made legible. `hasEscrowProtection` is on the wire precisely so a client can
                  state plainly that nobody is holding the funds, rather than leaving it to be inferred
                  from a rail name. */}
              {!order.hasEscrowProtection && (
                <p className="text-[11px] leading-4 text-[#6F7979]">
                  No escrow on this order — you carry the counterparty risk.
                </p>
              )}
            </li>
          ))}
        </ul>

        <Link
          href="/orders-and-returns"
          className="mt-3 inline-block rounded-full bg-[#00696E] px-5 py-2 text-sm font-medium text-white"
        >
          See your orders
        </Link>
      </div>
    </div>
  );
}

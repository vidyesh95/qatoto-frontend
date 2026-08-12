// TRANSPORT: client-query — reads GET /commerce/provider/earnings.
"use client";

// WHAT THIS ORGANIZATION HAS BEEN PAID.
//
// THERE IS NO GRAND TOTAL ON THIS PANEL, AND ADDING ONE WOULD BE A REGRESSION. The three figures
// below are three different KINDS of fact, and the backend's schema goes out of its way to keep
// them unaddable: `commerce_journal_account_memorandum_ck` exists, in its author's words, "so no
// future balance report can sum memo value and real money into one number".
//
//   OBSERVED       a processor or a licensed escrow provider reported the movement.
//   SELF-REPORTED  the seller said so. On the offline rail that is all there will ever be.
//
// A hero number spanning both would tell a seller that a wire they typed in themselves carries the
// same weight as a settled card payment. It does not.
//
// NO MARGIN, AND THE ABSENCE IS NAMED RATHER THAN ESTIMATED. Nothing in this platform records what
// a seller PAID for anything — there is no cost-of-goods column, no purchase record, no expense
// table. Revenue minus nothing is not profit, and a "profit" figure that silently equals revenue is
// worse than no figure at all on a page a seller makes decisions from.
//
// AN EMPTY CURRENCY ARRAY RENDERS A SENTENCE, NEVER `$0.00`. The server drops empty totals
// deliberately: "no money of this kind exists" and "this kind of money came to zero" are different
// answers, and only the first is true when nothing has settled.

import Link from "next/link";

// `StatusPanel` DIRECTLY, not the store wrappers in `store/shared/store-status-panel`. Those
// supply the store's hardcoded Material palette, and `/sales` is a seller-side surface built on
// semantic tokens — mixing the two puts a light-mode-only panel inside a page that follows the
// theme.
import StatusPanel from "@/components/home/shared/status-panel";
import { useProviderEarningsQuery } from "@/hooks/store/earnings";
import type { CurrencyAmount, SellerEarnings } from "@/lib/store/earnings.schemas";
import { formatCentsLabel } from "@/lib/store/format";

export default function SellerEarningsPanel() {
  const earningsQuery = useProviderEarningsQuery();

  if (earningsQuery.isPending) {
    return <p className="text-sm text-muted-foreground">Loading what you have been paid…</p>;
  }

  const result = earningsQuery.data;
  if (earningsQuery.isError || result === undefined) {
    return (
      <StatusPanel
        message="Couldn't load your earnings."
        className="border border-border px-6 py-10"
      />
    );
  }
  if (!result.success) {
    // The backend's own sentence — a 403 here says the workspace is not ready, not that this failed.
    return (
      <StatusPanel
        message={result.error.message}
        className="border border-border px-6 py-10"
        action={
          result.error.code === "401" ? (
            <Link
              href="/sign-in"
              className="rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white"
            >
              Sign in
            </Link>
          ) : undefined
        }
      />
    );
  }

  return <EarningsFigures earnings={result.data} />;
}

function EarningsFigures({ earnings }: { earnings: SellerEarnings }) {
  const { observed, selfReported, commissionOwed, uncounted } = earnings;

  const hasAnyMoney =
    observed.processorSettled.length > 0 ||
    observed.escrowReleased.length > 0 ||
    selfReported.attestedReceived.length > 0;

  return (
    <div className="space-y-4">
      {!hasAnyMoney ? (
        <StatusPanel
          message="Nothing has been paid to you yet. Settled orders appear here the moment the money moves."
          className="border border-border px-6 py-10"
        />
      ) : null}

      <section aria-label="Observed payments" className="space-y-2">
        <div>
          <h3 className="text-[11px] leading-4 font-medium tracking-[0.5px] text-muted-foreground uppercase">
            Observed
          </h3>
          <p className="text-xs text-muted-foreground">
            A payment processor or an escrow provider told us this money moved.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MoneyTile
            label="Settled to you"
            amounts={observed.processorSettled}
            caveat="Paid through a processor, straight to your own account."
          />
          <MoneyTile
            label="Refunded"
            amounts={observed.processorRefunded}
            caveat="Returned to buyers. Not subtracted above — both halves are shown."
          />
          <MoneyTile
            label="Released from escrow"
            amounts={observed.escrowReleased}
            caveat="Held and released by a licensed third party, never by Qatoto."
          />
          <MoneyTile
            label="Returned from escrow"
            amounts={observed.escrowRefunded}
            caveat="Milestones the provider returned to the buyer."
          />
        </div>
      </section>

      <section aria-label="Self-reported payments" className="space-y-2">
        <div>
          <h3 className="text-[11px] leading-4 font-medium tracking-[0.5px] text-muted-foreground uppercase">
            Self-reported
          </h3>
          <p className="text-xs text-muted-foreground">
            What you told us arrived. Qatoto was not a party to these transfers and cannot confirm
            them, so they are kept apart from the figures above rather than added to them.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MoneyTile
            label="You marked received"
            amounts={selfReported.attestedReceived}
            caveat="Wires and letters of credit you recorded yourself."
          />
          {commissionOwed.length > 0 ? (
            <MoneyTile
              label="Commission owed to Qatoto"
              amounts={commissionOwed}
              caveat="Owed by you, not deducted from the figures above."
            />
          ) : null}
        </div>
      </section>

      {/* THE BLIND SPOTS, NAMED. Neither of these is a zero — they are orders nobody has told us
          about. Rendering them as revenue of 0 would be a claim the platform cannot support. */}
      {uncounted.offlineOrdersWithNoAttestation > 0 || uncounted.ordersAwaitingPayment > 0 ? (
        <div className="rounded-xl border border-border bg-muted px-4 py-3">
          <p className="text-sm font-medium text-foreground">Not counted above</p>
          <ul className="mt-1 space-y-1 text-xs leading-4 text-muted-foreground">
            {uncounted.offlineOrdersWithNoAttestation > 0 ? (
              <li>
                {formatOrderCount(uncounted.offlineOrdersWithNoAttestation)} settle directly between
                you and the buyer, and nobody has recorded a payment yet. They may well have been
                paid — we have no way to know.{" "}
                <Link href="/sales" className="underline">
                  Mark one received
                </Link>{" "}
                from the order.
              </li>
            ) : null}
            {uncounted.ordersAwaitingPayment > 0 ? (
              <li>
                {formatOrderCount(uncounted.ordersAwaitingPayment)} are waiting on payment. Nothing
                has moved on them yet.
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}

      {/* See the header. Margin is absent because the input does not exist, not because the sum
          was hard. */}
      <div className="rounded-xl border border-border px-4 py-3">
        <p className="text-sm font-medium text-foreground">Profit and margin are not shown</p>
        <p className="mt-1 text-xs leading-4 text-muted-foreground">
          Qatoto never records what you paid for your goods, so there is nothing to subtract from
          the figures above. Anything we called profit here would just be revenue with a different
          label.
        </p>
      </div>
    </div>
  );
}

function formatOrderCount(orderCount: number): string {
  return `${String(orderCount)} ${orderCount === 1 ? "order" : "orders"}`;
}

/**
 * One tile, one figure per currency.
 *
 * TOTALS ARE NEVER SUMMED ACROSS CURRENCIES — each gets its own line. There is no exchange rate on
 * this platform and inventing one to produce a single number would be a made-up figure at whatever
 * rate happened to apply today.
 */
function MoneyTile({
  label,
  amounts,
  caveat,
}: {
  label: string;
  amounts: readonly CurrencyAmount[];
  caveat: string;
}) {
  return (
    <div className="rounded-2xl border border-border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      {amounts.length === 0 ? (
        <p className="text-xl font-semibold text-muted-foreground">None</p>
      ) : (
        amounts.map((amount) => (
          <p key={amount.currency} className="text-xl font-semibold text-foreground">
            {formatCentsLabel(amount.amountInCents, amount.currency)}
          </p>
        ))
      )}
      <p className="mt-1 text-xs leading-4 text-muted-foreground">{caveat}</p>
    </div>
  );
}

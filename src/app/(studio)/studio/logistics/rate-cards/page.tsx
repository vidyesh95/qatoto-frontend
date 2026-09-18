import type { Metadata } from "next";

import MyRateCardList from "@/components/studio/commerce/logistics/my-rate-card-list";

// Permanently dynamic: session-scoped and behind a provider organization membership.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Your freight lanes",
  description: "Freight rate cards your organization publishes on Qatoto",
};

/**
 * WHERE A FORWARDER PRICES ITS OWN LANES (§19.12).
 *
 * A SIBLING ROUTE RATHER THAN A PANEL ON `/studio/logistics`, which is the shipment-leg queue.
 * Three reasons: the two surfaces have unrelated lifecycles — a leg is a state machine per order,
 * a rate card is reference data with a validity window; `LogisticsOverview` renders its own `h1`,
 * so a second panel beside it would put two in one column; and this repo already splits
 * list-from-composer this way at `/studio/services` + `/studio/services/create`.
 *
 * ⚠️ THE ROUTE DOES NOT GATE ITSELF, DELIBERATELY. Provider-ness is never derived on the client —
 * the active organization is server-derived from the session — so the component calls the endpoint
 * and renders whatever refusal comes back. An organization without a `verified` freight-forwarder
 * or logistics-operator kind link gets a 403 whose message says exactly that, which is a correct
 * answer rather than a bug to route around.
 */
export default function StudioFreightRateCardsRoute() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-6">
      <header>
        <h1 className="font-serif text-xl font-semibold text-foreground md:text-2xl">
          Your freight lanes
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Publish the lanes you already sell. Buyers see your price and transit range on the
          delivery sheet, under your name — Qatoto charges no freight and books nothing.
        </p>
      </header>
      <MyRateCardList />
    </div>
  );
}

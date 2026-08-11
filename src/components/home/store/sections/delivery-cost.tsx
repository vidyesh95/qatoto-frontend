// TRANSPORT: client-query — asks for an estimate once the buyer names a destination.
//
// THE TWO LINES THIS ROW USED TO RENDER WERE BOTH UNKNOWABLE, and replacing them is the point of
// this file:
//
//   "Free Delivery to your location"  -> the backend returns an EMPTY array for a route no provider
//      covers. "We do not know" and "it is free" are different answers, and the mock rendered the
//      second for both. Freight is never zero here — `shippingInCents` is a literal 0 at checkout
//      because nothing is charged for freight until something is booked, which is not the same
//      claim as free delivery.
//   "Sept 23 to Sept 27"              -> NO DELIVERY DATE IS EVER RETURNED. Amazon prints one
//      because it owns the network; Qatoto owns none, so a date it cannot keep is a promise it has
//      no business making. What the wire carries is a range of DAYS. See §19 for what a post-order
//      arrival window would take, and note it needs customs data nobody has bought yet.
//
// THE DESTINATION IS ASKED FOR, NOT ASSUMED. `destinationCountryCode` is a required parameter, and
// the browse-country selector is a display preference the backend must not trust — so this fetches
// nothing until the buyer picks one. An estimate keyed off a guessed country is a commercial figure
// with no basis.
"use client";

import { useState } from "react";

import Image from "next/image";

import DeliverySheet from "@/components/home/store/sheets/delivery-sheet";
import { useProductSelection } from "@/components/home/store/sections/product-selection-context";
import { useProductDeliveryEstimateQuery } from "@/hooks/store/products";
import { COUNTRY_OPTIONS } from "@/components/home/account/menus/location-menu";
import { formatCentsRangeLabel, formatLeadTimeRangeLabel } from "@/lib/store/format";
import type { ProductDeliveryEstimate } from "@/lib/store/products.schemas";
import type { FreightLanePlan } from "@/lib/store/freight.schemas";

/**
 * What the row can be showing. A missing destination is a prompt, not an error.
 *
 * `uncovered` AND `ready` BOTH CARRY THE LANE PLAN, and that is the change §19.7 asked for. The two
 * halves of this payload answer different questions from different data — `estimates` comes from
 * declared provider COVERAGE, `lanePlan` from purchased RATE CARDS — so "no coverage-based estimate"
 * says nothing about whether a rate card exists, and vice versa. Attaching the plan only to the
 * priced branch would hide the sheet exactly when it has the most to say.
 */
type DeliveryEstimateViewState =
  | { status: "no_destination" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "uncovered"; lanePlan: FreightLanePlan | null }
  | {
      status: "ready";
      estimates: readonly ProductDeliveryEstimate[];
      lanePlan: FreightLanePlan | null;
    };

export default function DeliveryCost({ productSlug }: { readonly productSlug: string }) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [destinationCountryCode, setDestinationCountryCode] = useState<string | null>(null);

  const { quantity } = useProductSelection();
  const estimateQuery = useProductDeliveryEstimateQuery(
    productSlug,
    destinationCountryCode,
    quantity,
  );

  const result = estimateQuery.data;
  const viewState: DeliveryEstimateViewState =
    destinationCountryCode === null
      ? { status: "no_destination" }
      : estimateQuery.isPending
        ? { status: "loading" }
        : result === undefined
          ? { status: "loading" }
          : !result.success
            ? { status: "error", message: result.error.message }
            : result.data.estimates.length === 0
              ? { status: "uncovered", lanePlan: result.data.lanePlan }
              : {
                  status: "ready",
                  estimates: result.data.estimates,
                  lanePlan: result.data.lanePlan,
                };

  // THE SHEET OPENS FROM EVERY RESOLVED STATE, NOT JUST THE PRICED ONE. It used to be reachable only
  // from `ready`, which is backwards now: with no rate cards loaded — today's state on every lane —
  // `uncovered` is where the buyer most needs to see WHICH leg is uncovered, why, and which
  // forwarders sell the route anyway.
  const isSheetReachable = viewState.status === "ready" || viewState.status === "uncovered";
  const lanePlanForSheet = isSheetReachable ? viewState.lanePlan : null;

  return (
    <>
      <div className="border-y border-[#CAC4D0]/60 px-4 py-2 lg:px-6">
        <label className="flex items-center gap-2 text-xs">
          <span className="text-[#191C1C]">Deliver to</span>
          <select
            value={destinationCountryCode ?? ""}
            onChange={(changeEvent) =>
              setDestinationCountryCode(
                changeEvent.target.value === "" ? null : changeEvent.target.value,
              )
            }
            className="flex-1 rounded border border-[#CAC4D0] px-2 py-1 text-xs text-[#191C1C]"
          >
            <option value="">Choose a country…</option>
            {COUNTRY_OPTIONS.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-1.5">{renderEstimate(viewState)}</div>

        {isSheetReachable && (
          <button
            type="button"
            onClick={() => setIsSheetOpen(true)}
            className="mt-1 flex w-full cursor-pointer items-center gap-2 text-left text-xs text-[#00696E]"
          >
            <span className="flex-1">
              {viewState.status === "ready" ? "See how this was worked out" : "See the route"}
            </span>
            <Image
              src="/icons/chevron_forward_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
              width={20}
              height={20}
              alt=""
            />
          </button>
        )}
      </div>

      {isSheetOpen && (
        <DeliverySheet lanePlan={lanePlanForSheet} onClose={() => setIsSheetOpen(false)} />
      )}
    </>
  );
}

function renderEstimate(viewState: DeliveryEstimateViewState) {
  switch (viewState.status) {
    case "no_destination":
      return (
        <p className="text-xs leading-4 text-[#6F7979]">
          Pick a destination to see an indicative shipping cost.
        </p>
      );
    case "loading":
      return <p className="text-xs leading-4 text-[#6F7979]">Checking coverage…</p>;
    case "error":
      return <p className="text-xs leading-4 text-[#8C1D18]">{viewState.message}</p>;
    // NOT "free", and not an error either. No provider on the directory covers this lane.
    case "uncovered":
      return (
        <p className="text-xs leading-4 text-[#6F7979]">
          No forwarder on Qatoto covers this route yet, so shipping has to be arranged with the
          seller. Manufacturing lead time is shown under Packaging and delivery.
        </p>
      );
    case "ready":
      return (
        <ul className="space-y-1">
          {viewState.estimates.map((estimate) => {
            const leadTimeLabel = formatLeadTimeRangeLabel(
              estimate.leadTimeMinDays,
              estimate.leadTimeMaxDays,
            );
            return (
              <li key={estimate.currency} className="text-xs leading-4 text-[#191C1C]">
                <span className="font-medium">
                  {formatCentsRangeLabel(
                    estimate.estimatedMinInCents,
                    estimate.estimatedMaxInCents,
                    estimate.currency,
                  )}
                </span>
                {leadTimeLabel !== null && (
                  <span className="text-[#6F7979]"> · {leadTimeLabel} in transit</span>
                )}
                {/* The honest half. A seller who never declared package geometry produces an
                    estimate with no weight behind it, and a buyer should be able to tell. */}
                {estimate.basis.hasIncompletePackageData && (
                  <span className="block text-[11px] leading-4 text-[#6F7979]">
                    Rough — this seller has not published full package dimensions.
                  </span>
                )}
              </li>
            );
          })}
          <li className="text-[11px] leading-4 text-[#6F7979]">
            An estimate, not a quote or a booking. No delivery date is implied.
          </li>
        </ul>
      );
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}

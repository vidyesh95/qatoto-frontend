// TRANSPORT: mock — every price and duration below is local, and the client sums them.
//
// A per-leg mode picker: international + inland, cheapest by default, with express modes
// selectable per leg, or hand the whole route to an external agent.
//
// THIS SHEET IS FURTHER FROM ITS BACKEND THAN ANY OTHER IN THE STORE, and the gap is a decision
// rather than an oversight. What exists is `GET /store/products/:productSlug/delivery-estimate`
// plus `deliveryEstimates` on `checkout/prepare`, assembled from declared provider coverage
// against the product's package geometry. It returns per-currency RANGES with the offerings each
// was derived from, and it deliberately returns:
//
//   NO DELIVERY DATE. An estimate is not a booking, and a date the platform cannot keep is a
//   promise it has no business making. Amazon can print one because it owns the network.
//   AN EMPTY ARRAY FOR AN UNCOVERED LANE — never a zero. "We do not know" and "it is free" are
//   different answers, and `sections/delivery-cost.tsx` currently renders the second one.
//   `shippingInCents: 0` STAYS ZERO on every total. Nothing is charged for freight, so nothing
//   appears in a total; billing from an advertised range with no booking behind it would put an
//   invented number into an immutable order.
//
// So the leg-by-leg prices below have no source: rating a lane needs a RATE-CARD TABLE
// (origin/destination, mode, weight and volume breaks, validity, source forwarder) that the
// backend does not have. That table is now funded — see §14 — and until it lands the honest
// freight path is RFQ → service offering → quote, not this picker.
//
// Two things to fix on the way in, both visible here: the client SUMS `priceUsd` floats across
// legs, and money must be integer cents beside its own currency with the total computed server
// side; and `priceUsd` bakes a currency into a field name, so a EUR lane cannot be expressed.
"use client";

import { useState } from "react";

import Image from "next/image";

import StoreSheet from "@/components/home/store/shared/store-sheet";

type TransportMode = {
  id: string;
  name: string;
  iconFileName: string;
  priceUsd: number;
  durationDays: number;
  tier: "economy" | "express";
};

type DeliveryLeg = {
  id: string;
  title: string;
  route: string;
  modes: TransportMode[];
  defaultModeId: string;
};

type ExternalAgent = {
  id: string;
  name: string;
  iconFileName: string;
  priceUsd: number;
  durationDays: number;
  note: string;
};

const DELIVERY_LEGS: DeliveryLeg[] = [
  {
    id: "international",
    title: "International leg",
    route: "Shanghai port → Mumbai port",
    defaultModeId: "ocean",
    modes: [
      {
        id: "ocean",
        name: "Ocean freight",
        iconFileName: "directions_boat_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
        priceUsd: 120,
        durationDays: 22,
        tier: "economy",
      },
      {
        id: "air",
        name: "Air freight",
        iconFileName: "flight_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
        priceUsd: 480,
        durationDays: 4,
        tier: "express",
      },
    ],
  },
  {
    id: "inland",
    title: "Inland leg",
    route: "Mumbai port → your address",
    defaultModeId: "rail",
    modes: [
      {
        id: "rail",
        name: "Railroad",
        iconFileName: "train_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
        priceUsd: 30,
        durationDays: 5,
        tier: "economy",
      },
      {
        id: "truck",
        name: "Truck",
        iconFileName: "local_shipping_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
        priceUsd: 70,
        durationDays: 2,
        tier: "express",
      },
    ],
  },
];

const EXTERNAL_AGENTS: ExternalAgent[] = [
  {
    id: "sinotrans",
    name: "Sinotrans Logistics",
    iconFileName: "support_agent_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    priceUsd: 135,
    durationDays: 20,
    note: "Door-to-door, customs handled",
  },
  {
    id: "dhl",
    name: "DHL Global Forwarding",
    iconFileName: "support_agent_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    priceUsd: 520,
    durationDays: 5,
    note: "Express, tracked end to end",
  },
];

// Selection is either a per-leg self-built route or a single external agent.
type DeliverySelection =
  | { kind: "route"; modeIdByLegId: Record<string, string> }
  | { kind: "agent"; agentId: string };

function findMode(leg: DeliveryLeg, modeId: string): TransportMode {
  return leg.modes.find((mode) => mode.id === modeId) ?? leg.modes[0];
}

function ModeOption({
  mode,
  isSelected,
  onSelect,
}: {
  mode: TransportMode;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={`flex flex-1 items-center gap-2 rounded-lg border px-3 py-2.5 text-left ${
        isSelected ? "border-[#00696E] bg-[#00696E]/5" : "border-[#CAC4D0]/60"
      }`}
    >
      <Image src={`/icons/${mode.iconFileName}`} width={20} height={20} alt="" />
      <span className="flex-1">
        <span className="block text-xs font-medium text-[#191C1C]">{mode.name}</span>
        <span className="block text-[11px] text-[#6F7979]">{mode.durationDays} days</span>
      </span>
      <span className="text-xs font-medium text-[#191C1C]">${mode.priceUsd}</span>
    </button>
  );
}

export default function DeliverySheet({ onClose }: { onClose: () => void }) {
  const [selection, setSelection] = useState<DeliverySelection>({
    kind: "route",
    modeIdByLegId: Object.fromEntries(DELIVERY_LEGS.map((leg) => [leg.id, leg.defaultModeId])),
  });

  const selectLegMode = (legId: string, modeId: string) => {
    setSelection((previous) => {
      const modeIdByLegId =
        previous.kind === "route"
          ? previous.modeIdByLegId
          : Object.fromEntries(DELIVERY_LEGS.map((leg) => [leg.id, leg.defaultModeId]));
      return { kind: "route", modeIdByLegId: { ...modeIdByLegId, [legId]: modeId } };
    });
  };

  const selectedAgent =
    selection.kind === "agent"
      ? EXTERNAL_AGENTS.find((agent) => agent.id === selection.agentId)
      : undefined;

  const estimatedPriceUsd =
    selection.kind === "agent"
      ? (selectedAgent?.priceUsd ?? 0)
      : DELIVERY_LEGS.reduce(
          (sum, leg) => sum + findMode(leg, selection.modeIdByLegId[leg.id]).priceUsd,
          0,
        );

  const estimatedDays =
    selection.kind === "agent"
      ? (selectedAgent?.durationDays ?? 0)
      : DELIVERY_LEGS.reduce(
          (sum, leg) => sum + findMode(leg, selection.modeIdByLegId[leg.id]).durationDays,
          0,
        );

  return (
    <StoreSheet
      title="Delivery options"
      onClose={onClose}
      footer={
        <div className="flex items-center gap-3">
          <div className="flex-1 text-xs">
            <p className="font-medium text-[#191C1C]">Estimated ${estimatedPriceUsd}</p>
            <p className="text-[#6F7979]">about {estimatedDays} days</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[#00696E] px-6 py-2 text-sm font-medium text-white"
          >
            Confirm
          </button>
        </div>
      }
    >
      <div className="px-4 pb-2">
        {/* Map placeholder — real route map renders here in the backend phase. */}
        <div className="relative grid h-40 place-items-center overflow-hidden rounded-xl bg-[#D9D9D9]">
          <Image
            src="/icons/location_on_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            width={32}
            height={32}
            alt=""
            className="opacity-60"
          />
          <span className="absolute bottom-2 left-3 text-[11px] text-[#6F7979]">
            Route map preview
          </span>
        </div>

        {/* Per-leg mode pickers. */}
        <div className="mt-4 flex flex-col gap-4">
          {DELIVERY_LEGS.map((leg) => {
            const selectedModeId =
              selection.kind === "route" ? selection.modeIdByLegId[leg.id] : leg.defaultModeId;
            return (
              <div key={leg.id}>
                <p className="text-xs font-medium text-[#191C1C]">{leg.title}</p>
                <p className="mb-2 text-[11px] text-[#6F7979]">{leg.route}</p>
                <div className="flex gap-2">
                  {leg.modes.map((mode) => (
                    <ModeOption
                      key={mode.id}
                      mode={mode}
                      isSelected={selection.kind === "route" && selectedModeId === mode.id}
                      onSelect={() => selectLegMode(leg.id, mode.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* External delivery agents — marketplace alternative to the self-built route. */}
        <div className="mt-5">
          <p className="mb-2 text-xs font-medium text-[#191C1C]">Or use a delivery agent</p>
          <div className="flex flex-col gap-2">
            {EXTERNAL_AGENTS.map((agent) => {
              const isSelected = selection.kind === "agent" && selection.agentId === agent.id;
              return (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => setSelection({ kind: "agent", agentId: agent.id })}
                  aria-pressed={isSelected}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left ${
                    isSelected ? "border-[#00696E] bg-[#00696E]/5" : "border-[#CAC4D0]/60"
                  }`}
                >
                  <Image src={`/icons/${agent.iconFileName}`} width={22} height={22} alt="" />
                  <span className="flex-1">
                    <span className="block text-xs font-medium text-[#191C1C]">{agent.name}</span>
                    <span className="block text-[11px] text-[#6F7979]">
                      {agent.note} · {agent.durationDays} days
                    </span>
                  </span>
                  <span className="text-xs font-medium text-[#191C1C]">${agent.priceUsd}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </StoreSheet>
  );
}

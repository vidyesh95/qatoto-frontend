// TRANSPORT: client-query — reads GET /commerce/disputes.
"use client";

// THE LIST THAT MAKES `/disputes/[disputeId]` REACHABLE.
//
// Without it the detail page existed and nothing linked to it: a buyer who raised a dispute had the
// URL only in the response to the request that created it, which is the exact shape A38 spent nine
// routes fixing everywhere else. The read has been there since A28.
//
// BOTH SIDES, ONE LIST. The scope is the ORDER's two organizations, so a seller sees disputes raised
// against their orders and a buyer sees the ones they raised. There is no per-side endpoint and
// there should not be — a dispute is one record with two readers.

import { useState } from "react";

import Link from "next/link";

import StatusPanel from "@/components/home/shared/status-panel";
import { useDisputeListQuery } from "@/hooks/store/disputes";
import { formatIsoInstantLabel } from "@/lib/store/format";
import {
  DISPUTE_STATES,
  DISPUTE_STATE_LABELS,
  type Dispute,
  type DisputeState,
} from "@/lib/store/disputes.schemas";

export default function DisputeList() {
  // Session-scoped queue, so the filter is local rather than URL state — but `state` is a real
  // query key and the SERVER applies it. Nothing here filters a fetched page.
  const [selectedState, setSelectedState] = useState<DisputeState | undefined>(undefined);
  const disputesQuery = useDisputeListQuery(
    selectedState === undefined ? {} : { state: selectedState },
  );

  return (
    <div className="mx-auto w-full max-w-3xl pb-10">
      <header className="px-4 pt-4 lg:px-6">
        <h1 className="font-serif text-2xl font-semibold text-foreground md:text-3xl">Disputes</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Disputes on orders your organization is part of, whichever side you are.
        </p>
      </header>

      <fieldset className="mt-3 flex flex-wrap gap-2 px-4 lg:px-6">
        <legend className="sr-only">Filter disputes by state</legend>
        <StateChip
          label="All"
          isSelected={selectedState === undefined}
          onSelect={() => setSelectedState(undefined)}
        />
        {DISPUTE_STATES.map((state) => (
          <StateChip
            key={state}
            label={DISPUTE_STATE_LABELS[state]}
            isSelected={selectedState === state}
            onSelect={() => setSelectedState(state)}
          />
        ))}
      </fieldset>

      <div className="mt-3 px-4 lg:px-6">{renderList(disputesQuery, selectedState)}</div>
    </div>
  );
}

function StateChip({
  label,
  isSelected,
  onSelect,
}: {
  label: string;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium ${
        isSelected
          ? "border-transparent bg-[#00696E] text-white"
          : "border-border text-muted-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function renderList(
  disputesQuery: ReturnType<typeof useDisputeListQuery>,
  selectedState: DisputeState | undefined,
) {
  if (disputesQuery.isPending) {
    return <p className="text-sm text-muted-foreground">Loading disputes…</p>;
  }

  const result = disputesQuery.data;
  if (disputesQuery.isError || result === undefined) {
    return (
      <StatusPanel
        message="Couldn't load your disputes."
        className="border border-border px-6 py-16"
      />
    );
  }
  if (!result.success) {
    return (
      <StatusPanel message={result.error.message} className="border border-border px-6 py-16" />
    );
  }

  if (result.data.items.length === 0) {
    return (
      <StatusPanel
        message={
          selectedState === undefined
            ? "No disputes. Nothing on your orders is contested."
            : `No ${DISPUTE_STATE_LABELS[selectedState].toLowerCase()} disputes.`
        }
        className="border border-border px-6 py-16"
      />
    );
  }

  return (
    <ul className="space-y-2">
      {result.data.items.map((dispute) => (
        <DisputeRow key={dispute.id} dispute={dispute} />
      ))}
    </ul>
  );
}

function DisputeRow({ dispute }: { dispute: Dispute }) {
  return (
    <li className="rounded-xl border border-border px-4 py-3">
      <Link href={`/disputes/${dispute.id}`} className="block hover:underline">
        <p className="text-xs text-muted-foreground">
          {DISPUTE_STATE_LABELS[dispute.state]} · opened {formatIsoInstantLabel(dispute.createdAt)}
        </p>
        <p className="mt-0.5 text-sm font-medium text-foreground">
          {/* The reason code is free text the opener chose, `^[a-z][a-z0-9_]{0,79}$` — not a closed
              enum, so there is no label map to look it up in. Underscores read as spaces. */}
          {dispute.reasonCode.replaceAll("_", " ")}
        </p>
        <p className="mt-0.5 line-clamp-2 text-sm leading-5 text-muted-foreground">
          {dispute.summary}
        </p>
      </Link>
    </li>
  );
}

// TRANSPORT: client-query — the capability check reads `@/hooks/rnd/platform-roles`; the lane list,
// the composer, the band writes and the customs panel all call hooks in
// `@/hooks/store/admin-freight`.
"use client";

import { useState } from "react";

import CustomsDwellPanel from "@/components/admin/freight/customs-dwell-panel";
import RateCardComposer from "@/components/admin/freight/rate-card-composer";
import RateCardRow from "@/components/admin/freight/rate-card-row";
import { useFreightRateCardsList } from "@/hooks/store/admin-freight";
import { useOwnStaffContextQuery } from "@/hooks/rnd/platform-roles";
import {
  FREIGHT_RATE_CARD_STATES,
  hasZeroWeightFloorBand,
  type FreightRateCardState,
  type ListFreightRateCardsFilter,
} from "@/lib/store/admin-freight.schemas";
import { FREIGHT_MODES, type FreightMode } from "@/lib/store/freight.schemas";
import { FREIGHT_TRANSPORT_MODE_LABELS } from "@/lib/store/labels";

const CARD_CLASS = "rounded-2xl border border-border p-4";
const FIELD_CLASS = "w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm";
const QUIET_BUTTON_CLASS =
  "cursor-pointer rounded-full border border-border px-3 py-1.5 text-xs font-medium disabled:opacity-50";

const REQUIRED_CAPABILITY = "moderate_commerce";

/**
 * Narrow a `<select>` value by MEMBERSHIP rather than asserting it. `""` is the "any" option this
 * console adds on top of the wire tuples, so it is a legitimate value here and not a filter.
 */
function toModeFilter(value: string): FreightMode | "" {
  if (value === "") return "";
  return FREIGHT_MODES.find((freightMode) => freightMode === value) ?? "";
}

function toStateFilter(value: string): FreightRateCardState | "" {
  if (value === "") return "";
  return FREIGHT_RATE_CARD_STATES.find((cardState) => cardState === value) ?? "";
}

/**
 * The freight operations console: lane rate cards and the customs estimates beside them.
 *
 * **THE RATE TABLES SHIP EMPTY BY DESIGN.** Until a forwarder's lane list is bought, every lane
 * answers `no_active_rate_card` and `shippingInCents` is permanently 0 on the buyer side. So an
 * empty console here is the CORRECT state, and the empty copy says that rather than implying a
 * failed load — a console that looked broken when it was merely unloaded would send someone
 * debugging a working system.
 *
 * `moderate_commerce` GATES THE READS TOO, not only the writes. That is why an ungated viewer gets
 * the banner INSTEAD OF the panels rather than a disabled version of them: there is nothing to
 * disable, because there is nothing they can load. Where a capability only gates writes — the
 * category and site-audit consoles — the house convention is to degrade to read-only, and that
 * convention does not apply here.
 */
export default function FreightRateAdminPage() {
  const [originFilter, setOriginFilter] = useState("");
  const [destinationFilter, setDestinationFilter] = useState("");
  const [modeFilter, setModeFilter] = useState<FreightMode | "">("");
  const [stateFilter, setStateFilter] = useState<FreightRateCardState | "">("active");
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [showStagedOnly, setShowStagedOnly] = useState(false);

  const staffContextQuery = useOwnStaffContextQuery();
  const canManageCommerce =
    staffContextQuery.data?.capabilities.includes(REQUIRED_CAPABILITY) ?? false;

  if (staffContextQuery.isPending) {
    return (
      <div className="px-4 py-6 lg:px-6">
        <p className="text-sm text-muted-foreground">Checking your access…</p>
      </div>
    );
  }

  if (!canManageCommerce) {
    return (
      <div className="space-y-3 px-4 py-6 lg:px-6">
        <h1 className="text-xl font-semibold">Freight lanes</h1>
        <output className={`${CARD_CLASS} block text-sm`}>
          <p className="font-medium">This console needs the {REQUIRED_CAPABILITY} capability.</p>
          <p className="mt-1 text-muted-foreground">
            Your platform role is {staffContextQuery.data?.platformRole ?? "none"}. That capability
            gates the reads here as well as the writes, so there is nothing to show rather than
            something to view read-only.
          </p>
        </output>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 py-6 lg:px-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Freight lanes</h1>
        <p className="text-sm text-muted-foreground">
          Rate cards price a lane; customs estimates give it an arrival window. A lane needs both.
        </p>
      </header>

      <RateCardsPanel
        filter={{
          ...(originFilter.trim().length === 2
            ? { originCountryCode: originFilter.trim().toUpperCase() }
            : {}),
          ...(destinationFilter.trim().length === 2
            ? { destinationCountryCode: destinationFilter.trim().toUpperCase() }
            : {}),
          ...(modeFilter !== "" ? { mode: modeFilter } : {}),
          ...(stateFilter !== "" ? { state: stateFilter } : {}),
        }}
        showStagedOnly={showStagedOnly}
        isComposerOpen={isComposerOpen}
        onComposerOpenChange={setIsComposerOpen}
        filterControls={
          <div className="flex flex-wrap items-end gap-3">
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">Origin</span>
              <input
                value={originFilter}
                maxLength={2}
                onChange={(event) => setOriginFilter(event.target.value.toUpperCase())}
                className={`${FIELD_CLASS} w-20`}
                placeholder="CN"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">Destination</span>
              <input
                value={destinationFilter}
                maxLength={2}
                onChange={(event) => setDestinationFilter(event.target.value.toUpperCase())}
                className={`${FIELD_CLASS} w-20`}
                placeholder="KE"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">Mode</span>
              <select
                value={modeFilter}
                onChange={(event) => setModeFilter(toModeFilter(event.target.value))}
                className={FIELD_CLASS}
              >
                <option value="">Any mode</option>
                {FREIGHT_MODES.map((freightMode) => (
                  <option key={freightMode} value={freightMode}>
                    {FREIGHT_TRANSPORT_MODE_LABELS[freightMode]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">State</span>
              <select
                value={stateFilter}
                onChange={(event) => setStateFilter(toStateFilter(event.target.value))}
                className={FIELD_CLASS}
              >
                <option value="">Any state</option>
                {FREIGHT_RATE_CARD_STATES.map((cardState) => (
                  <option key={cardState} value={cardState}>
                    {cardState}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 pb-1.5 text-xs">
              <input
                type="checkbox"
                checked={showStagedOnly}
                onChange={(event) => setShowStagedOnly(event.target.checked)}
              />
              <span>Editable (staged) only</span>
            </label>
          </div>
        }
      />

      <CustomsDwellPanel canManage={canManageCommerce} />
    </div>
  );
}

/**
 * Split out so the list hook mounts only for a viewer who can actually read it — `useKeysetList`
 * has no `enabled` flag, so NOT RENDERING is how the request is not made.
 */
function RateCardsPanel({
  filter,
  showStagedOnly,
  isComposerOpen,
  onComposerOpenChange,
  filterControls,
}: {
  filter: ListFreightRateCardsFilter;
  showStagedOnly: boolean;
  isComposerOpen: boolean;
  onComposerOpenChange: (isOpen: boolean) => void;
  filterControls: React.ReactNode;
}) {
  const cardsList = useFreightRateCardsList(filter);

  // FILTERED WITHIN THE LOADED ROWS, and labelled as such below. There is no server-side
  // `bandsEditable` filter, so this cannot see a staged card sitting on a page nobody has loaded —
  // saying so is the difference between a narrowed view and a false claim of completeness.
  const visibleCards = showStagedOnly
    ? cardsList.rows.filter((card) => card.bandsEditable)
    : cardsList.rows;

  const uncoveredCount = cardsList.rows.filter(
    (card) => card.state === "active" && !hasZeroWeightFloorBand(card.breaks),
  ).length;

  return (
    <section className={`${CARD_CLASS} space-y-3`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Lane rate cards</h2>
        {!isComposerOpen && (
          <button
            type="button"
            onClick={() => onComposerOpenChange(true)}
            className={QUIET_BUTTON_CLASS}
          >
            New card
          </button>
        )}
      </div>

      {filterControls}

      {isComposerOpen && <RateCardComposer onClose={() => onComposerOpenChange(false)} />}

      {cardsList.isLoadingFirstPage && (
        <p className="text-sm text-muted-foreground">Loading lanes…</p>
      )}

      {cardsList.firstPageErrorMessage !== null && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
          {cardsList.firstPageErrorMessage}
        </p>
      )}

      {/* An empty console is the EXPECTED state until lane data is bought — say that, rather than
          leaving a blank panel that reads as a failed load. */}
      {!cardsList.isLoadingFirstPage &&
        cardsList.firstPageErrorMessage === null &&
        cardsList.rows.length === 0 && (
          <div className="space-y-1 rounded-xl bg-muted/40 p-3 text-sm">
            <p className="font-medium">No rate cards match this filter.</p>
            <p className="text-xs text-muted-foreground">
              The rate tables ship empty on purpose. Until a forwarder&apos;s lane list is loaded,
              every lane answers &ldquo;no active rate card&rdquo; and buyers see no shipping price.
              This is not a failed load.
            </p>
          </div>
        )}

      {uncoveredCount > 0 && (
        <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
          {uncoveredCount} active card{uncoveredCount === 1 ? " has" : "s have"} no band starting at
          0 g. Consignments below their smallest band reach the buyer as an empty delivery list,
          which looks the same as an unserved lane. (Counted from the loaded rows.)
        </p>
      )}

      {showStagedOnly && (
        <p className="text-xs text-muted-foreground">
          Showing editable cards from the rows loaded so far. The server has no &ldquo;staged
          only&rdquo; filter, so a staged card on a page you have not loaded is not counted here.
        </p>
      )}

      <ul className="space-y-2">
        {visibleCards.map((card) => (
          <RateCardRow key={card.id} card={card} canManage />
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
          {/* No total and no previous cursor come back from this route, so there is no honest
              "showing 21-40 of 137" to render and no Back button to offer. */}
          <p className="text-xs text-muted-foreground">
            {cardsList.rows.length} loaded. The server reports no total.
          </p>
        </div>
      )}

      {cardsList.loadMoreErrorMessage !== null && (
        <p className="text-xs text-red-800">{cardsList.loadMoreErrorMessage}</p>
      )}
    </section>
  );
}

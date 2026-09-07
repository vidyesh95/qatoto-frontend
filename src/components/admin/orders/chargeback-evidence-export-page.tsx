// TRANSPORT: client-query — the capability check reads `@/hooks/rnd/platform-roles`; the bundle
// itself is a mutation in `@/hooks/store/chargeback-evidence`, wrapping a route that is currently
// TRANSPORT: mock (see `@/lib/store/chargeback-evidence.api`).
"use client";

import { useState } from "react";

import { useOwnStaffContextQuery } from "@/hooks/rnd/platform-roles";
import { useExportChargebackEvidence } from "@/hooks/store/chargeback-evidence";
import type { ChargebackEvidenceBundle } from "@/lib/store/chargeback-evidence.schemas";
import { formatCentsLabel, formatIsoInstantLabel } from "@/lib/store/format";

const REQUIRED_CAPABILITY = "export_chargeback_evidence";

const CARD_CLASS = "rounded-2xl border border-border p-4";
const QUIET_BUTTON_CLASS =
  "cursor-pointer rounded-full border border-border px-3 py-1.5 text-xs font-medium disabled:opacity-50 print:hidden";

/**
 * ⚠️ **`restricted` WINS OVER `loading`**, matching `commerce-moderation-page.tsx`. A disabled
 * capability check sits `isPending` forever, so checking `isError`/`isSuccess` first is what
 * keeps an unheld viewer from staring at a permanent spinner.
 */
type CapabilityState =
  | { readonly status: "checking" }
  | { readonly status: "capabilityUnknown" }
  | { readonly status: "restricted"; readonly platformRole: string | null }
  | { readonly status: "permitted" };

export default function ChargebackEvidenceExportPage({ orderId }: { readonly orderId: string }) {
  const staffContextQuery = useOwnStaffContextQuery();

  const capabilityState: CapabilityState = staffContextQuery.isError
    ? { status: "capabilityUnknown" }
    : !staffContextQuery.isSuccess
      ? { status: "checking" }
      : staffContextQuery.data.capabilities.includes(REQUIRED_CAPABILITY)
        ? { status: "permitted" }
        : { status: "restricted", platformRole: staffContextQuery.data.platformRole };

  return (
    <div className="space-y-6 px-4 py-6 lg:px-6">
      <header className="space-y-1 print:hidden">
        <h1 className="text-xl font-semibold">Chargeback evidence — order {orderId}</h1>
        <p className="text-sm text-muted-foreground">
          Order, chat and shipment data packaged for a card issuer&apos;s chargeback response. This
          does not submit anything anywhere — download or print, then attach it yourself wherever
          the processor asks for evidence.
        </p>
      </header>

      {renderByCapability(capabilityState, orderId)}
    </div>
  );
}

function renderByCapability(state: CapabilityState, orderId: string) {
  switch (state.status) {
    case "checking":
      return (
        <div className="h-28 animate-pulse rounded-2xl bg-muted/40 print:hidden" aria-hidden />
      );
    case "capabilityUnknown":
      return (
        <output className={`${CARD_CLASS} block text-sm text-muted-foreground print:hidden`}>
          Couldn&apos;t check your permissions, so nothing here is loaded.
        </output>
      );
    case "restricted":
      return (
        <output className={`${CARD_CLASS} block text-sm print:hidden`}>
          <p className="font-medium">This page needs the {REQUIRED_CAPABILITY} capability.</p>
          <p className="mt-1 text-muted-foreground">
            Your platform role is {state.platformRole ?? "none"}. This is a narrower grant than
            general commerce moderation on purpose — the bundle below carries full buyer-seller chat
            and order PII in one export.
          </p>
        </output>
      );
    case "permitted":
      return <PermittedConsole orderId={orderId} />;
    default: {
      const exhaustiveCheck: never = state;
      return exhaustiveCheck;
    }
  }
}

type LoadState =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "ready"; readonly bundle: ChargebackEvidenceBundle };

function PermittedConsole({ orderId }: { readonly orderId: string }) {
  const [loadState, setLoadState] = useState<LoadState>({ status: "idle" });
  const exportMutation = useExportChargebackEvidence();

  const handleLoadClick = () => {
    setLoadState({ status: "loading" });
    exportMutation.mutate(
      { orderId },
      {
        onSuccess: (result) => {
          setLoadState(
            result.success
              ? { status: "ready", bundle: result.data }
              : { status: "error", message: result.error.message },
          );
        },
        onError: (error) => {
          setLoadState({ status: "error", message: error.message });
        },
      },
    );
  };

  return renderLoadState(loadState, handleLoadClick, exportMutation.isPending);
}

function renderLoadState(state: LoadState, onLoadClick: () => void, isPending: boolean) {
  switch (state.status) {
    case "idle":
      return (
        <div className={`${CARD_CLASS} space-y-2 print:hidden`}>
          <p className="text-sm text-muted-foreground">
            Nothing is loaded yet. Loading this bundle is an audited PII access — do it only for an
            order with an actual chargeback notification, not to browse.
          </p>
          <button type="button" onClick={onLoadClick} className={QUIET_BUTTON_CLASS}>
            Load evidence
          </button>
        </div>
      );
    case "loading":
      return (
        <div className="h-28 animate-pulse rounded-2xl bg-muted/40 print:hidden" aria-hidden />
      );
    case "error":
      return (
        <div className={`${CARD_CLASS} space-y-2 print:hidden`}>
          <p className="text-sm text-red-800">{state.message}</p>
          <button
            type="button"
            onClick={onLoadClick}
            className={QUIET_BUTTON_CLASS}
            disabled={isPending}
          >
            Try again
          </button>
        </div>
      );
    case "ready":
      return <EvidenceBundleView bundle={state.bundle} onReload={onLoadClick} />;
    default: {
      const exhaustiveCheck: never = state;
      return exhaustiveCheck;
    }
  }
}

function EvidenceBundleView({
  bundle,
  onReload,
}: {
  readonly bundle: ChargebackEvidenceBundle;
  readonly onReload: () => void;
}) {
  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `chargeback-evidence-${bundle.order.id}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <button type="button" onClick={handleDownloadJson} className={QUIET_BUTTON_CLASS}>
          Download JSON
        </button>
        <button type="button" onClick={() => window.print()} className={QUIET_BUTTON_CLASS}>
          Print / Save as PDF
        </button>
        <button type="button" onClick={onReload} className={QUIET_BUTTON_CLASS}>
          Reload
        </button>
      </div>

      <p className="text-xs text-muted-foreground print:text-black">
        Logged: exported by {bundle.exportedByStaffEmail} at{" "}
        {formatIsoInstantLabel(bundle.generatedAt)} (audit {bundle.exportAuditId})
      </p>

      <section className={CARD_CLASS}>
        <h2 className="text-base font-semibold">Order {bundle.order.id}</h2>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
          <dt className="text-muted-foreground">Buyer</dt>
          <dd className="col-span-1 sm:col-span-2">{bundle.order.buyerLegalNameSnapshot}</dd>
          <dt className="text-muted-foreground">Seller</dt>
          <dd className="col-span-1 sm:col-span-2">{bundle.order.counterpartyLegalNameSnapshot}</dd>
          <dt className="text-muted-foreground">State</dt>
          <dd className="col-span-1 sm:col-span-2">{bundle.order.state}</dd>
          <dt className="text-muted-foreground">Total</dt>
          <dd className="col-span-1 sm:col-span-2">
            {formatCentsLabel(bundle.order.totalInCents, bundle.order.currency)}
          </dd>
          <dt className="text-muted-foreground">Payment intent</dt>
          <dd className="col-span-1 sm:col-span-2">{bundle.order.paymentIntentId ?? "—"}</dd>
        </dl>

        <ul className="mt-3 space-y-1 text-sm">
          {bundle.order.productLines.map((line) => (
            <li key={line.id}>
              {line.quantityOrdered}× {line.titleSnapshot}
              {line.variantNameSnapshot !== null ? ` (${line.variantNameSnapshot})` : ""} —{" "}
              {formatCentsLabel(line.lineTotalInCents, bundle.order.currency)}
            </li>
          ))}
        </ul>
      </section>

      <section className={CARD_CLASS}>
        <h2 className="text-base font-semibold">Chat ({bundle.messages.length} messages)</h2>
        {bundle.messages.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No messages on this order.</p>
        ) : (
          <ol className="mt-2 space-y-2 text-sm">
            {bundle.messages.map((message) => (
              <li
                key={message.id}
                className="border-t border-border pt-2 first:border-t-0 first:pt-0"
              >
                <p className="text-xs text-muted-foreground">
                  {message.authorOrganizationId === bundle.order.buyerOrganizationId
                    ? "Buyer"
                    : "Seller"}{" "}
                  · {formatIsoInstantLabel(message.createdAt)}
                </p>
                <p>{message.bodyText}</p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className={CARD_CLASS}>
        <h2 className="text-base font-semibold">Shipments ({bundle.shipments.length})</h2>
        {bundle.shipments.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No shipment recorded on this order.</p>
        ) : (
          bundle.shipments.map((shipment) => (
            <div
              key={shipment.id}
              className="mt-3 space-y-2 border-t border-border pt-2 first:border-t-0 first:pt-0"
            >
              <p className="text-sm">
                {shipment.originLocality ?? "—"}, {shipment.originCountryCode ?? "—"} →{" "}
                {shipment.destinationLocality ?? "—"}, {shipment.destinationCountryCode ?? "—"} —{" "}
                {shipment.state}
              </p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {shipment.legs.map((leg) => (
                  <li key={leg.id}>
                    Leg {leg.sequence + 1} ({leg.mode}): {leg.carrierReference ?? "no carrier ref"}{" "}
                    / {leg.trackingReference ?? "no tracking ref"} — {leg.state}
                  </li>
                ))}
                {shipment.events.map((event) => (
                  <li key={event.id}>
                    {formatIsoInstantLabel(event.occurredAt)}: {event.eventKind}
                    {event.description !== null ? ` — ${event.description}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

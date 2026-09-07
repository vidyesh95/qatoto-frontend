// TRANSPORT: client-query — the capability check reads `@/hooks/rnd/platform-roles`. This page
// makes no other read; it only routes to the order's own evidence page.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useOwnStaffContextQuery } from "@/hooks/rnd/platform-roles";

const REQUIRED_CAPABILITY = "export_chargeback_evidence";
const CARD_CLASS = "rounded-2xl border border-border p-4";
const FIELD_CLASS = "w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm";

/**
 * The landing spot for the nav entry. THERE IS NO ORDERS LIST CONSOLE YET — admin oversight of
 * orders is still "use Drizzle Studio" per `docs/ADMIN_STRUCTURE.md` — so this page's only job is
 * to take the order id off the chargeback notification (email, processor dashboard) and hand the
 * admin to that order's own evidence page. It reads nothing itself.
 */
export default function ChargebackEvidenceLookupPage() {
  const router = useRouter();
  const [orderId, setOrderId] = useState("");
  const staffContextQuery = useOwnStaffContextQuery();

  if (staffContextQuery.isPending) {
    return (
      <div className="px-4 py-6 lg:px-6">
        <p className="text-sm text-muted-foreground">Checking your access…</p>
      </div>
    );
  }

  const canExport = staffContextQuery.data?.capabilities.includes(REQUIRED_CAPABILITY) ?? false;

  if (!canExport) {
    return (
      <div className="space-y-3 px-4 py-6 lg:px-6">
        <h1 className="text-xl font-semibold">Chargeback evidence</h1>
        <output className={`${CARD_CLASS} block text-sm`}>
          <p className="font-medium">This page needs the {REQUIRED_CAPABILITY} capability.</p>
          <p className="mt-1 text-muted-foreground">
            Your platform role is {staffContextQuery.data?.platformRole ?? "none"}.
          </p>
        </output>
      </div>
    );
  }

  const trimmedOrderId = orderId.trim();

  return (
    <div className="space-y-4 px-4 py-6 lg:px-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Chargeback evidence</h1>
        <p className="text-sm text-muted-foreground">
          Enter the order id from the chargeback notification. There is no order search here yet —
          get the id from the notification itself or from Drizzle Studio.
        </p>
      </header>

      <form
        className={`${CARD_CLASS} flex flex-wrap items-end gap-3`}
        onSubmit={(event) => {
          event.preventDefault();
          if (trimmedOrderId.length === 0) return;
          router.push(
            `/admin/store/orders/${encodeURIComponent(trimmedOrderId)}/chargeback-evidence`,
          );
        }}
      >
        <label className="block flex-1 space-y-1">
          <span className="text-xs text-muted-foreground">Order id</span>
          <input
            value={orderId}
            onChange={(event) => setOrderId(event.target.value)}
            className={FIELD_CLASS}
            placeholder="order_..."
          />
        </label>
        <button
          type="submit"
          disabled={trimmedOrderId.length === 0}
          className="cursor-pointer rounded-full border border-border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
        >
          Open
        </button>
      </form>
    </div>
  );
}

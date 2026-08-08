import type { Metadata } from "next";

import OrderList from "@/components/commerce/order-list";

// Permanently dynamic: the provider queue is a session-scoped client-query island.
export const instant = false;

export const metadata: Metadata = {
  title: "Orders",
  description: "Orders page for Qatoto Creator Studio",
};

export default function StudioOrders() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-foreground">Orders</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Orders placed with you. Each one is a separate counterparty relationship.
      </p>
      {/* `which="provider"` selects `GET /commerce/provider/orders` — a different endpoint from the
          buyer queue, with a different authorization. */}
      <div className="-mx-6">
        <OrderList which="provider" />
      </div>
    </div>
  );
}

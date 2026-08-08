import type { Metadata } from "next";

import OrderList from "@/components/commerce/order-list";

// Permanently dynamic: the order queue is a session-scoped client-query island, so there is no Cache
// Components refactor to do and the removable-TODO header would be false here.
export const instant = false;

export const metadata: Metadata = {
  title: "Orders and returns",
  description: "Orders you have placed on Qatoto",
};

export default function OrdersAndReturns() {
  return (
    <div className="mx-auto w-full max-w-3xl pb-10">
      <header className="px-4 pt-4 lg:px-6">
        <h1 className="font-serif text-2xl font-semibold text-foreground md:text-3xl">
          Orders and returns
        </h1>
      </header>
      {/* `which="buyer"` selects `GET /commerce/orders`. The studio queue passes `"provider"` and hits a
          different endpoint — see `order-list.tsx` for why that is two reads and not one filter. */}
      <OrderList which="buyer" />
    </div>
  );
}

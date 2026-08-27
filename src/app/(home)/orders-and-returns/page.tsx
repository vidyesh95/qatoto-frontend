import type { Metadata } from "next";
import Link from "next/link";

import OrderList from "@/components/commerce/order-list";

// Permanently dynamic: the order queue is a session-scoped client-query island, so there is no Cache
// Components refactor to do and the removable-TODO header would be false here.
export const instant = false;

export const metadata: Metadata = {
  title: "Orders and returns",
  description: "Orders you have placed on Qatoto",
  // NOINDEX: signed-in only. A crawler gets the sign-in wall, which indexes as a soft 404.
  robots: { index: false, follow: false },
};

export default function OrdersAndReturns() {
  return (
    <div className="mx-auto w-full max-w-3xl pb-10">
      <header className="px-4 pt-4 lg:px-6">
        <h1 className="font-serif text-2xl font-semibold text-foreground md:text-3xl">
          Orders and returns
        </h1>
        {/* REVIEWING IS KEYED ON A COMPLETION, NOT ON AN ORDER, which is why it is a sibling page
            rather than a control on each row here. `GET /commerce/completions` is its own read and
            covers service engagements too — those have no row in this order queue at all. */}
        <Link
          href="/orders-and-returns/reviews"
          className="mt-1 inline-block text-sm font-medium text-primary underline"
        >
          Reviews you can leave
        </Link>
      </header>
      {/* `which="buyer"` selects `GET /commerce/orders`. The studio queue passes `"provider"` and hits a
          different endpoint — see `order-list.tsx` for why that is two reads and not one filter. */}
      <OrderList which="buyer" />
    </div>
  );
}

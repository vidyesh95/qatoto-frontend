import type { Metadata } from "next";

import OrderDetail from "@/components/commerce/order-detail";
import { withSentinelValues } from "@/lib/static-params";

// Permanently dynamic: the order read is session-scoped and behind an organization membership.
export const instant = false;

/**
 * No fixture slugs prerender here, only the sentinel.
 *
 * An order id is not public and is not enumerable — prerendering real ones would put a session-scoped
 * record into the build output. `withSentinelValues([])` is what `cacheComponents` needs to not fail the
 * build on an empty list, and the sentinel takes the same not-found path a typo does.
 */
export function generateStaticParams() {
  return withSentinelValues([]).map((orderId) => ({ orderId }));
}

export const metadata: Metadata = {
  // `noindex`: an order is one buyer's commercial record. Nothing here belongs in a search index.
  robots: { index: false, follow: false },
  title: "Order",
  description: "An order you placed on Qatoto",
};

export default async function BuyerOrderRoute({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  // The BUYER route. It supplies chrome only — `OrderDetail` derives the viewer's relation from the
  // payload, so a counterparty who follows a shared link here still gets the counterparty's controls
  // rather than the buyer's.
  return (
    <div className="mx-auto w-full max-w-3xl">
      <OrderDetail orderId={orderId} />
    </div>
  );
}

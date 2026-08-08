import type { Metadata } from "next";

import OrderDetail from "@/components/commerce/order-detail";
import { withSentinelValues } from "@/lib/static-params";

// Permanently dynamic: session-scoped and behind an organization membership.
export const instant = false;

/** Only the sentinel: an order id is session-scoped and must not reach the build output. */
export function generateStaticParams() {
  return withSentinelValues([]).map((orderId) => ({ orderId }));
}

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Order",
  description: "An order placed with you on Qatoto",
};

export default async function StudioOrderRoute({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  // The SELLER route. Same component as the buyer's — it derives the relation from the payload, so this
  // route supplies studio chrome and nothing else. Passing a `viewerRole` here is what would break it.
  return (
    <div className="p-6">
      <OrderDetail orderId={orderId} />
    </div>
  );
}

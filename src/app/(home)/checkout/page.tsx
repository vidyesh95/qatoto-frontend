import type { Metadata } from "next";

import CheckoutPage from "@/components/home/store/checkout-page";

// Permanently dynamic: everything on this page is a session-scoped client-query island, so there is
// no Cache Components refactor to do and the usual removable-TODO header would be false here.
export const instant = false;

export const metadata: Metadata = {
  // `noindex` because a checkout is per-session and per-organization. There is nothing here a crawler
  // should hold, and a cached checkout URL is a cached price.
  robots: { index: false, follow: false },
  title: "Checkout",
  description: "Reserve stock and place your Qatoto orders",
};

export default function Checkout() {
  return <CheckoutPage />;
}

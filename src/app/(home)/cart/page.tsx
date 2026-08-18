import type { Metadata } from "next";

import CartPage from "@/components/home/store/cart-page";

// Permanently dynamic, and NOT for the usual reason. The cart is a client-query island behind a
// session — its data never reaches the server render at all, so there is no Cache Components
// refactor to do here and the standard "TODO: remove this opt-out" header would be stating something
// false. The shell is static; the cart inside it is not cacheable by anyone.
export const instant = false;

export const metadata: Metadata = {
  title: "Cart",
  description: "Your Qatoto cart",
  // NOINDEX: signed-in only. A crawler gets the sign-in wall, which indexes as a soft 404.
  robots: { index: false, follow: false },
};

export default function Cart() {
  return <CartPage />;
}

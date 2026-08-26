import type { Metadata } from "next";

import CustomerService from "@/components/home/customer-service";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Customer Service",
  description: "Where to go for help with an order, a dispute, a report or your account.",
};

export default function CustomerServicePage() {
  return <CustomerService />;
}

import type { Metadata } from "next";

import CustomerServicePage from "@/components/home/customer-service/customer-service-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
//
// The session read this page gained is already contained in a `<Suspense>` boundary inside the
// component, so the triage copy stays prerenderable — this opt-out is the same one the route
// carried before the rebuild, not a new cost of it.
export const instant = false;

// PUBLIC AND INDEXABLE, deliberately. The triage half is authored copy that answers a question
// people type into a search engine, the sitemap already lists this path, and the only
// session-scoped part is a client island that shows a sign-in prompt to a crawler.
export const metadata: Metadata = {
  title: "Customer Service",
  description:
    "Where to go for help with a payment, an order, a dispute or your account — and how to open a support case a person answers.",
};

export default function CustomerServiceRoute() {
  return <CustomerServicePage />;
}

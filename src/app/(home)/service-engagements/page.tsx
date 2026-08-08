import type { Metadata } from "next";

import ServiceEngagementList from "@/components/commerce/service-engagement-list";

// Permanently dynamic: session-scoped and behind an organization membership.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Service engagements",
  description: "Trade services being delivered on your Qatoto orders",
};

/**
 * THE INDEX THAT WAS MISSING. `/service-engagements/[engagementId]` shipped without a parent, which left
 * `GET /commerce/service-engagements` — and the hook over it — with no caller at all.
 *
 * ONE ENDPOINT, BOTH SIDES. Unlike orders and RFQs, engagements have a single list route and the rows state
 * both organization ids, so the reader's side is derived per row rather than per page.
 */
export default function ServiceEngagementsRoute() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 pt-4 pb-10 lg:px-6">
      <header>
        <h1 className="font-serif text-xl font-semibold text-foreground md:text-2xl">
          Service engagements
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Freight, customs, inspection and the rest — both what you engaged and what you are
          delivering.
        </p>
      </header>

      <ServiceEngagementList />
    </div>
  );
}

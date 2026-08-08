import type { Metadata } from "next";

import RfqList from "@/components/commerce/rfq-list";

// Permanently dynamic: the provider queue is a session-scoped client-query island.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Requests for quotation",
  description: "Requests for quotation page for Qatoto Creator Studio",
};

export default function StudioRfqsRoute() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-foreground">Requests for quotation</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Requirements you have been invited to quote on, plus ones your services matched.
      </p>
      {/* `which="provider"` selects `/commerce/provider/rfqs`, which never contains a buyer's draft. */}
      <div className="-mx-6">
        <RfqList which="provider" />
      </div>
    </div>
  );
}

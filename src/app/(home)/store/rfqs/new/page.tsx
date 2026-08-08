import type { Metadata } from "next";

import RfqComposer from "@/components/home/store/composers/rfq-composer";

// Permanently dynamic: session-scoped and behind a BUYER organization membership.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "New request for quotation",
  description: "Ask providers to quote on Qatoto",
};

/**
 * NO `generateStaticParams` HERE — this route has no dynamic segment.
 *
 * It sits under `/store/rfqs/`, where a sibling `[rfqId]` exists. Routing precedence within one directory puts
 * static above `[param]`, so `new` reaches this file and is never captured as an RFQ id.
 */
export default function NewRfqRoute() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-4 pb-10 lg:px-6">
      <RfqComposer />
    </div>
  );
}

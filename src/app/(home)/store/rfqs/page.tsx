import type { Metadata } from "next";

import RfqList from "@/components/commerce/rfq-list";

// Permanently dynamic: the RFQ queue is a session-scoped client-query island, so there is no Cache
// Components refactor to do and the removable-TODO header would be false here.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Requests for quotation · Store",
  description: "Requests for quotation you have created on Qatoto",
};

export default function StoreRfqsRoute() {
  return (
    <div className="mx-auto w-full max-w-3xl pb-10">
      <header className="px-4 pt-4 lg:px-6">
        <h1 className="font-serif text-2xl font-semibold text-foreground md:text-3xl">
          Requests for quotation
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ask several suppliers and connector providers for priced terms on one requirement.
        </p>
      </header>
      {/* `which="buyer"` selects `/commerce/rfqs/mine`, which includes drafts. */}
      <RfqList which="buyer" />
    </div>
  );
}

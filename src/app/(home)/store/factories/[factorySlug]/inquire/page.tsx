import type { Metadata } from "next";
import { notFound } from "next/navigation";

import FactoryInquiryComposer from "@/components/home/store/composers/factory-inquiry-composer";
import { StoreErrorPanel } from "@/components/home/store/shared/store-status-panel";
import { withSentinelValues } from "@/lib/static-params";
import { getStoreFactory } from "@/lib/store/factories.api";

// Permanently dynamic: session-scoped and behind a buyer organization membership.
export const instant = false;

/**
 * ONLY THE SENTINEL, even though factory slugs are public and the directory route prerenders them.
 *
 * This page is a write surface, not a document. Prerendering one shell per factory would spend build
 * time producing pages whose only content is a form, and `robots: noindex` below says the same thing
 * to crawlers. The precedent is `rfqs/[rfqId]/compare`.
 */
export function generateStaticParams() {
  return withSentinelValues([]).map((factorySlug) => ({ factorySlug }));
}

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Write to a factory",
  description: "Start a conversation with a manufacturer on Qatoto",
};

export default async function StoreFactoryInquireRoute({
  params,
}: {
  params: Promise<{ factorySlug: string }>;
}) {
  const { factorySlug } = await params;
  const result = await getStoreFactory(factorySlug);

  // A form for a factory that does not exist has nothing to submit against, and the backend gives
  // ONE code for "no such thing" and "not visible to you" so a stranger cannot probe which slugs
  // exist — never render a permission hint from a 404.
  //
  // ⚠️ ONLY A 404, THOUGH. This used to be `if (!result.success) notFound()`, and its comment
  // claimed parity with "the detail page" — which does not do that: factory-detail-page.tsx:56
  // tests the code first and renders StoreErrorPanel otherwise. So the comment cited a precedent
  // that refuted it, and a backend outage told the buyer this manufacturer did not exist.
  if (!result.success && result.error.code === "404") notFound();

  if (!result.success) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 pt-4 pb-10 lg:px-6">
        <StoreErrorPanel message={result.error.message} />
      </div>
    );
  }

  const { factory } = result.data;

  // NOT A DISABLED FORM. A factory that has closed its inbox will not receive this, so offering the
  // fields and refusing at submit would waste the buyer's writing. The refusal is the whole page.
  if (!factory.acceptingInquiries) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 pt-4 pb-10 lg:px-6">
        <h1 className="font-serif text-xl font-semibold text-foreground md:text-2xl">
          {factory.displayName} is not taking inquiries
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          They have closed their inbox on Qatoto. Their profile stays up, so it is worth checking
          back.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-4 pb-10 lg:px-6">
      <FactoryInquiryComposer
        factorySlug={factory.slug}
        factoryDisplayName={factory.displayName}
        offeredCapabilityKinds={factory.capabilityKinds}
      />
    </div>
  );
}

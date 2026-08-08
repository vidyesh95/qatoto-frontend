import type { Metadata } from "next";

import ServiceOfferingComposer from "@/components/studio/commerce/services/service-offering-composer";

// Permanently dynamic: session-scoped and behind a provider organization membership.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "New service listing",
  description: "Publish a trade service on Qatoto",
};

export default function CreateServiceOfferingRoute() {
  return (
    <div className="mx-auto w-full max-w-3xl p-6">
      <ServiceOfferingComposer />
    </div>
  );
}

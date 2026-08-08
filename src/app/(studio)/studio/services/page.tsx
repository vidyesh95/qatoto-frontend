import type { Metadata } from "next";

import Link from "next/link";

import MyServiceOfferingList from "@/components/studio/commerce/services/my-service-offering-list";

// Permanently dynamic: session-scoped and behind a provider organization membership.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Your services",
  description: "Trade services your organization offers on Qatoto",
};

/**
 * THE PARENT THE COMPOSER NEEDED.
 *
 * `GET /commerce/providers/offerings/mine` is the only read that returns a DRAFT, so without this page a
 * provider could create one and have nowhere to see it — and the composer's success screen would link to a
 * route that does not exist.
 */
export default function StudioServicesRoute() {
  return (
    <div className="space-y-4 p-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="font-serif text-xl font-semibold text-foreground md:text-2xl">
            Your services
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Everything your organization offers, including drafts nobody else can see.
          </p>
        </div>
        <Link
          href="/studio/services/create"
          className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          New listing
        </Link>
      </header>

      <MyServiceOfferingList />
    </div>
  );
}

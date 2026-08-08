import type { Metadata } from "next";

import BusinessToolsIndexPage from "@/components/home/store/business-tools-index-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Business tools · Store",
  description:
    "Quotations, logistics, factories, the business forum and cofounder matching on Qatoto",
};

/**
 * `business` is a LITERAL segment under `/store/`, so router precedence (static > `[param]` >
 * `[...param]`) puts it above the legacy `[...slug]` catch-all — the same way `categories`,
 * `search` and `providers` already sit above it.
 */
export default function StoreBusinessToolsRoute() {
  return <BusinessToolsIndexPage />;
}

import type { Metadata } from "next";

import PoliciesAndSafety from "@/components/home/policies-and-safety";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Policies And Safety",
  description: "The rules, how reporting works, and what happens after you report.",
};

export default function PoliciesAndSafetyPage() {
  return <PoliciesAndSafety />;
}

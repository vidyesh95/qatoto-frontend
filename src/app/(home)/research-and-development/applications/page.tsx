import type { Metadata } from "next";

import ApplicationInboxPage from "@/components/home/research-and-development/application-inbox-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Your applications & invites · R&D",
  description: "What you applied to on Qatoto, and who invited you",
  // NOINDEX: signed-in only. A crawler gets the sign-in wall, which indexes as a soft 404.
  robots: { index: false, follow: false },
};

// A static route: the page body is a client island that reads both `/mine` endpoints
// through React Query, because both are caller-scoped and neither is cacheable across
// visitors.
export default function Applications() {
  return <ApplicationInboxPage />;
}

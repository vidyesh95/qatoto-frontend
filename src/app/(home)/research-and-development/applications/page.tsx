import type { Metadata } from "next";

import ApplicationInboxPage from "@/components/home/research-and-development/application-inbox-page";

export const metadata: Metadata = {
  title: "Your applications & invites · R&D",
  description: "What you applied to on Qatoto, and who invited you",
};

// A static route: the page body is a client island that reads both `/mine` endpoints
// through React Query, because both are caller-scoped and neither is cacheable across
// visitors.
export default function Applications() {
  return <ApplicationInboxPage />;
}

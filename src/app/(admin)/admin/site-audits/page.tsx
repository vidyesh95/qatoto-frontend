import type { Metadata } from "next";

import SiteAuditAdminPage from "@/components/admin/site-audits/site-audit-admin-page";

// Permanently dynamic: capability-gated and organization-scoped, a client-query island throughout.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Site audits · Admin",
  description: "The record behind a factory's site-audited verification state",
};

export default function AdminSiteAuditsRoute() {
  return <SiteAuditAdminPage />;
}

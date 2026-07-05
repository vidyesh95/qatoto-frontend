"use client";

import { createContext, use, useState, ReactNode } from "react";
import { StaffRole } from "@/lib/admin-staff";

// Mock audit trail for the (admin) surface (UI phase). Seeded rows stand in
// for backend data; approve/reject decisions on /admin/review prepend entries
// so /admin/audit stays coherent within a session. The real audit trail is
// written server-side.

export type AuditLogEntry = {
  id: string;
  actorName: string;
  actorRole: StaffRole;
  actionLabel: string;
  targetLabel: string;
  detailNote: string;
  occurredAtLabel: string;
};

const SEEDED_AUDIT_LOG_ENTRIES: AuditLogEntry[] = [
  {
    id: "audit-seed-1",
    actorName: "Pratik Bhadane",
    actorRole: "admin",
    actionLabel: "Approved episode",
    targetLabel: "Stellar Drift · Season 1 · Ep 2",
    detailNote: "",
    occurredAtLabel: "Jul 3, 2026 · 14:12",
  },
  {
    id: "audit-seed-2",
    actorName: "Mira Okafor",
    actorRole: "moderator",
    actionLabel: "Rejected episode",
    targetLabel: "Stellar Drift · Season 1 · Ep 3",
    detailNote: "Missing licensing documentation for episode content",
    occurredAtLabel: "Jul 2, 2026 · 18:40",
  },
  {
    id: "audit-seed-3",
    actorName: "Pratik Bhadane",
    actorRole: "admin",
    actionLabel: "Granted role",
    targetLabel: "mira.okafor@qatoto.com → moderator",
    detailNote: "",
    occurredAtLabel: "Jun 30, 2026 · 09:05",
  },
  {
    id: "audit-seed-4",
    actorName: "Mira Okafor",
    actorRole: "moderator",
    actionLabel: "Took down video",
    targetLabel: "Untitled upload · report #482",
    detailNote: "Copyright claim upheld",
    occurredAtLabel: "Jun 28, 2026 · 21:17",
  },
  {
    id: "audit-seed-5",
    actorName: "Pratik Bhadane",
    actorRole: "admin",
    actionLabel: "Approved episode",
    targetLabel: "Stellar Drift · Season 1 · Ep 1",
    detailNote: "",
    occurredAtLabel: "Jun 27, 2026 · 11:32",
  },
];

type AdminAuditLogContextType = {
  auditLogEntries: AuditLogEntry[];
  appendAuditLogEntry: (entry: AuditLogEntry) => void;
};

const AdminAuditLogContext = createContext<AdminAuditLogContextType | undefined>(undefined);

export function AdminAuditLogProvider({ children }: { children: ReactNode }) {
  const [auditLogEntries, setAuditLogEntries] = useState<AuditLogEntry[]>(SEEDED_AUDIT_LOG_ENTRIES);

  // Newest first — new decisions land on top of the log.
  const appendAuditLogEntry = (entry: AuditLogEntry) =>
    setAuditLogEntries((previousEntries) => [entry, ...previousEntries]);

  return (
    <AdminAuditLogContext.Provider value={{ auditLogEntries, appendAuditLogEntry }}>
      {children}
    </AdminAuditLogContext.Provider>
  );
}

export function useAdminAuditLog() {
  const context = use(AdminAuditLogContext);
  if (context === undefined) {
    throw new Error("useAdminAuditLog must be used within an AdminAuditLogProvider");
  }
  return context;
}

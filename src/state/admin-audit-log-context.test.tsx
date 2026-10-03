import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import {
  AdminAuditLogProvider,
  useAdminAuditLog,
  type AuditLogEntry,
} from "./admin-audit-log-context";

function AdminAuditLogTestWrapper({ children }: { readonly children: ReactNode }) {
  return <AdminAuditLogProvider>{children}</AdminAuditLogProvider>;
}

describe("admin-audit-log-context", () => {
  it("throws an error when useAdminAuditLog is called outside of an AdminAuditLogProvider", () => {
    expect(() => renderHook(() => useAdminAuditLog())).toThrow(
      "useAdminAuditLog must be used within an AdminAuditLogProvider",
    );
  });

  it("initializes with seeded audit log entries", () => {
    const { result } = renderHook(() => useAdminAuditLog(), {
      wrapper: AdminAuditLogTestWrapper,
    });

    expect(result.current.auditLogEntries.length).toBeGreaterThan(0);
    expect(result.current.auditLogEntries[0]?.id).toBe("audit-seed-1");
  });

  it("prepends new audit entries so decisions land on top of the log (newest first)", () => {
    const { result } = renderHook(() => useAdminAuditLog(), {
      wrapper: AdminAuditLogTestWrapper,
    });

    const initialCount = result.current.auditLogEntries.length;

    const newEntry: AuditLogEntry = {
      id: "audit-test-999",
      actorName: "Test Reviewer",
      actorRole: "moderator",
      actionLabel: "Approved listing",
      targetLabel: "Precision stepper motor",
      detailNote: "Specification verified",
      occurredAtLabel: "Oct 3, 2026 · 09:00",
    };

    act(() => {
      result.current.appendAuditLogEntry(newEntry);
    });

    expect(result.current.auditLogEntries.length).toBe(initialCount + 1);
    expect(result.current.auditLogEntries[0]).toEqual(newEntry);
  });
});

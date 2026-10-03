import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { SidebarProvider, useSidebar } from "./sidebar-context";

function SidebarTestWrapper({ children }: { readonly children: ReactNode }) {
  return <SidebarProvider>{children}</SidebarProvider>;
}

describe("sidebar-context", () => {
  it("throws an error when useSidebar is called outside of a SidebarProvider", () => {
    expect(() => renderHook(() => useSidebar())).toThrow(
      "useSidebar must be used within a SidebarProvider",
    );
  });

  it("initializes with sidebar expanded (isCollapsed: false)", () => {
    const { result } = renderHook(() => useSidebar(), { wrapper: SidebarTestWrapper });

    expect(result.current.isCollapsed).toBe(false);
  });

  it("toggles sidebar collapsed state when toggleSidebar is called", () => {
    const { result } = renderHook(() => useSidebar(), { wrapper: SidebarTestWrapper });

    act(() => {
      result.current.toggleSidebar();
    });
    expect(result.current.isCollapsed).toBe(true);

    act(() => {
      result.current.toggleSidebar();
    });
    expect(result.current.isCollapsed).toBe(false);
  });
});

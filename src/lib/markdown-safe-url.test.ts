import { describe, expect, it } from "vitest";

import { keepOnlyWebAddresses } from "./markdown-safe-url";

describe("markdown-safe-url", () => {
  describe("security boundary against malicious schemes", () => {
    it("neutralizes javascript: URLs to prevent XSS execution", () => {
      expect(keepOnlyWebAddresses("javascript:alert(1)")).toBe("");
      expect(keepOnlyWebAddresses("JAVASCRIPT:alert('xss')")).toBe("");
      expect(keepOnlyWebAddresses("javascript:void(0)")).toBe("");
    });

    it("neutralizes data: URIs", () => {
      expect(keepOnlyWebAddresses("data:text/html,<script>alert(1)</script>")).toBe("");
      expect(keepOnlyWebAddresses("data:image/svg+xml;utf8,<svg onload=alert(1)>")).toBe("");
    });

    it("neutralizes vbscript: URIs", () => {
      expect(keepOnlyWebAddresses("vbscript:msgbox(1)")).toBe("");
    });

    it("neutralizes protocol-relative URLs that attempt external host redirect", () => {
      // //evil.example looks like a path but resolves to another host
      expect(keepOnlyWebAddresses("//evil.example/payload")).toBe("");
      expect(keepOnlyWebAddresses("///evil.example")).toBe("");
    });
  });

  describe("allows safe web addresses", () => {
    it("preserves standard http and https URLs", () => {
      expect(keepOnlyWebAddresses("https://example.com")).toBe("https://example.com");
      expect(keepOnlyWebAddresses("https://example.com/articles/solar-power")).toBe(
        "https://example.com/articles/solar-power",
      );
      expect(keepOnlyWebAddresses("http://localhost:3000/blueprints")).toBe(
        "http://localhost:3000/blueprints",
      );
    });

    it("preserves site-relative paths", () => {
      expect(keepOnlyWebAddresses("/blueprints/teardowns")).toBe("/blueprints/teardowns");
      expect(keepOnlyWebAddresses("/store/products/sensor-module")).toBe(
        "/store/products/sensor-module",
      );
    });

    it("preserves in-page anchor navigation links", () => {
      expect(keepOnlyWebAddresses("#conclusion")).toBe("#conclusion");
      expect(keepOnlyWebAddresses("#step-2-calibration")).toBe("#step-2-calibration");
    });
  });
});

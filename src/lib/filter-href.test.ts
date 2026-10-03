import { describe, expect, it } from "vitest";

import {
  buildFilterHref,
  readEnumParam,
  readMultiParam,
  readPatternParam,
  readSingleParam,
  toggleMultiParamPatch,
} from "./filter-href";

describe("filter-href", () => {
  describe("readSingleParam", () => {
    it("returns string value when param is a non-empty string", () => {
      expect(readSingleParam({ sort: "newest" }, "sort")).toBe("newest");
    });

    it("returns undefined when param is missing or empty string", () => {
      expect(readSingleParam({}, "sort")).toBeUndefined();
      expect(readSingleParam({ sort: "" }, "sort")).toBeUndefined();
    });

    it("returns undefined when param is an array (repeated param) to prevent ambiguous queries", () => {
      expect(readSingleParam({ sort: ["newest", "oldest"] }, "sort")).toBeUndefined();
    });
  });

  describe("readMultiParam", () => {
    it("returns array of non-empty strings when given an array", () => {
      expect(readMultiParam({ tag: ["solar", "battery", ""] }, "tag")).toEqual([
        "solar",
        "battery",
      ]);
    });

    it("wraps single string in an array", () => {
      expect(readMultiParam({ tag: "solar" }, "tag")).toEqual(["solar"]);
    });

    it("returns empty array when param is missing or empty string", () => {
      expect(readMultiParam({}, "tag")).toEqual([]);
      expect(readMultiParam({ tag: "" }, "tag")).toEqual([]);
    });
  });

  describe("readEnumParam", () => {
    const allowedSortOptions = ["newest", "top", "trending"] as const;

    it("returns value when present in allowed enum list", () => {
      expect(readEnumParam({ sort: "top" }, "sort", allowedSortOptions)).toBe("top");
    });

    it("drops unknown values to prevent sending invalid parameters that cause backend 422 errors", () => {
      expect(
        readEnumParam({ sort: "malicious_or_unknown" }, "sort", allowedSortOptions),
      ).toBeUndefined();
    });
  });

  describe("readPatternParam", () => {
    const isoCountryPattern = /^[A-Z]{2}$/;

    it("returns value when matching regular expression pattern", () => {
      expect(readPatternParam({ country: "US" }, "country", isoCountryPattern)).toBe("US");
      expect(readPatternParam({ country: "DE" }, "country", isoCountryPattern)).toBe("DE");
    });

    it("drops values that do not match pattern to prevent backend 422 errors", () => {
      expect(readPatternParam({ country: "usa" }, "country", isoCountryPattern)).toBeUndefined();
      expect(readPatternParam({ country: "123" }, "country", isoCountryPattern)).toBeUndefined();
      expect(readPatternParam({}, "country", isoCountryPattern)).toBeUndefined();
    });
  });

  describe("buildFilterHref", () => {
    it("merges existing params with patch and builds a query string", () => {
      const searchParams = { category: "electronics" };
      const patch = { sort: "newest" };
      expect(buildFilterHref(searchParams, patch)).toBe("?category=electronics&sort=newest");
    });

    it("removes keys where patch provides undefined", () => {
      const searchParams = { category: "electronics", sort: "newest" };
      const patch = { sort: undefined };
      expect(buildFilterHref(searchParams, patch)).toBe("?category=electronics");
    });

    it("always drops 'page' on any filter patch to prevent landing on empty pages", () => {
      const searchParams = { page: "4", category: "machinery" };
      const patch = { sort: "top" };
      expect(buildFilterHref(searchParams, patch)).toBe("?category=machinery&sort=top");
    });

    it("drops 'cursor' unless the patch explicitly supplies a cursor", () => {
      const searchParams = { category: "machinery", cursor: "eyJpZCI6MTIzfQ" };
      const filterPatch = { sort: "top" };
      // Filter patch drops cursor
      expect(buildFilterHref(searchParams, filterPatch)).toBe("?category=machinery&sort=top");

      // Pagination patch that supplies cursor keeps the new cursor
      const paginationPatch = { cursor: "next-cursor-token" };
      expect(buildFilterHref(searchParams, paginationPatch)).toBe(
        "?category=machinery&cursor=next-cursor-token",
      );
    });

    it("returns '?' when all parameters are removed", () => {
      const searchParams = { filter: "active" };
      const patch = { filter: undefined };
      expect(buildFilterHref(searchParams, patch)).toBe("?");
    });
  });

  describe("toggleMultiParamPatch", () => {
    it("adds value if absent from multi-param list", () => {
      const searchParams = { skills: ["soldering"] };
      const patch = toggleMultiParamPatch(searchParams, "skills", "cad");
      expect(patch).toEqual({ skills: ["soldering", "cad"] });
    });

    it("removes value if already present in multi-param list", () => {
      const searchParams = { skills: ["soldering", "cad"] };
      const patch = toggleMultiParamPatch(searchParams, "skills", "soldering");
      expect(patch).toEqual({ skills: ["cad"] });
    });

    it("sets key to undefined when last value is removed so it is cleared from URL", () => {
      const searchParams = { skills: ["soldering"] };
      const patch = toggleMultiParamPatch(searchParams, "skills", "soldering");
      expect(patch).toEqual({ skills: undefined });
    });
  });
});

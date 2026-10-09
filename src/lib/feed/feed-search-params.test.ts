import { describe, expect, it } from "vitest";
import {
  readFeedMode,
  readCategorySlug,
  readFeedSelection,
  isDefaultFeedSelection,
} from "./feed-search-params";

describe("readFeedMode", () => {
  it("defaults to 'all' when mode is missing", () => {
    expect(readFeedMode({})).toBe("all");
  });

  it("returns the exact mode when valid", () => {
    expect(readFeedMode({ mode: "trending" })).toBe("trending");
    expect(readFeedMode({ mode: "new_to_you" })).toBe("new_to_you");
    expect(readFeedMode({ mode: "recently_uploaded" })).toBe("recently_uploaded");
    expect(readFeedMode({ mode: "watched" })).toBe("watched");
    expect(readFeedMode({ mode: "all" })).toBe("all");
  });

  it("defaults to 'all' when mode is invalid", () => {
    expect(readFeedMode({ mode: "banana" })).toBe("all");
    expect(readFeedMode({ mode: "" })).toBe("all");
  });

  it("defaults to 'all' when mode is an array", () => {
    expect(readFeedMode({ mode: ["trending", "all"] })).toBe("all");
  });
});

describe("readCategorySlug", () => {
  it("returns the category slug when valid", () => {
    expect(readCategorySlug({ category: "music" })).toBe("music");
    expect(readCategorySlug({ category: "hip-hop" })).toBe("hip-hop");
    expect(readCategorySlug({ category: "123-abc" })).toBe("123-abc");
  });

  it("returns undefined when category is missing", () => {
    expect(readCategorySlug({})).toBeUndefined();
  });

  it("returns undefined when category has invalid characters", () => {
    expect(readCategorySlug({ category: "Hip-Hop" })).toBeUndefined(); // uppercase
    expect(readCategorySlug({ category: "hip_hop" })).toBeUndefined(); // underscore
    expect(readCategorySlug({ category: "hip hop" })).toBeUndefined(); // space
    expect(readCategorySlug({ category: "-hip-hop" })).toBeUndefined(); // leading hyphen
    expect(readCategorySlug({ category: "hip-hop-" })).toBeUndefined(); // trailing hyphen
    expect(readCategorySlug({ category: "hip--hop" })).toBeUndefined(); // double hyphen
  });

  it("returns undefined when category is too long (over 64 chars)", () => {
    const longSlug = "a".repeat(65);
    expect(readCategorySlug({ category: longSlug })).toBeUndefined();
  });

  it("returns the category slug when exactly 64 chars", () => {
    const maxSlug = "a".repeat(64);
    expect(readCategorySlug({ category: maxSlug })).toBe(maxSlug);
  });

  it("returns undefined when category is an array", () => {
    expect(readCategorySlug({ category: ["music", "gaming"] })).toBeUndefined();
  });
});

describe("readFeedSelection", () => {
  it("combines mode and categorySlug", () => {
    expect(readFeedSelection({ mode: "trending", category: "music" })).toEqual({
      mode: "trending",
      categorySlug: "music",
    });
  });

  it("handles missing params by using defaults", () => {
    expect(readFeedSelection({})).toEqual({
      mode: "all",
      categorySlug: undefined,
    });
  });

  it("drops invalid params while keeping valid ones", () => {
    expect(readFeedSelection({ mode: "banana", category: "music" })).toEqual({
      mode: "all",
      categorySlug: "music",
    });
    expect(readFeedSelection({ mode: "trending", category: "Hip-Hop" })).toEqual({
      mode: "trending",
      categorySlug: undefined,
    });
  });
});

describe("isDefaultFeedSelection", () => {
  it("returns true for all and undefined category", () => {
    expect(isDefaultFeedSelection({ mode: "all", categorySlug: undefined })).toBe(true);
  });

  it("returns false for non-all mode", () => {
    expect(isDefaultFeedSelection({ mode: "trending", categorySlug: undefined })).toBe(false);
  });

  it("returns false for present category", () => {
    expect(isDefaultFeedSelection({ mode: "all", categorySlug: "music" })).toBe(false);
  });

  it("returns false for non-all mode and present category", () => {
    expect(isDefaultFeedSelection({ mode: "trending", categorySlug: "music" })).toBe(false);
  });
});

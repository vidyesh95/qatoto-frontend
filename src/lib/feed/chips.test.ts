import { describe, expect, it } from "vitest";

import { buildFeedChips, isChipSelected, MODE_CHIPS, toChipHrefPatch } from "./chips";
import type { ContentCategory } from "./schemas";
import type { FeedChip } from "./chips";

describe("buildFeedChips", () => {
  it("yields only mode chips when given an empty category list", () => {
    const chips = buildFeedChips([]);
    expect(chips).toEqual(MODE_CHIPS);
  });

  it("yields mode chips followed by mapped topic chips", () => {
    const mockCategories: ContentCategory[] = [
      {
        id: "cat-1",
        slug: "robotics",
        label: "Robotics",
        imageUrl: null,
        isTile: false,
        sortOrder: 1,
      },
      {
        id: "cat-2",
        slug: "gaming",
        label: "Gaming",
        imageUrl: null,
        isTile: false,
        sortOrder: 2,
      },
    ];

    const chips = buildFeedChips(mockCategories);

    expect(chips).toHaveLength(MODE_CHIPS.length + 2);

    // First items should be the exact mode chips
    expect(chips.slice(0, MODE_CHIPS.length)).toEqual(MODE_CHIPS);

    // Following items should be the topic chips
    expect(chips[MODE_CHIPS.length]).toEqual({
      kind: "topic",
      categorySlug: "robotics",
      label: "Robotics",
    });
    expect(chips[MODE_CHIPS.length + 1]).toEqual({
      kind: "topic",
      categorySlug: "gaming",
      label: "Gaming",
    });
  });
});

describe("isChipSelected", () => {
  const allModeChip: FeedChip = { kind: "mode", mode: "all", label: "All" };
  const trendingModeChip: FeedChip = { kind: "mode", mode: "trending", label: "Trending" };
  const roboticsTopicChip: FeedChip = {
    kind: "topic",
    categorySlug: "robotics",
    label: "Robotics",
  };

  it("selects topic chip when categorySlug matches", () => {
    // A category filter WINS OVER the mode.
    expect(isChipSelected(roboticsTopicChip, { mode: "all", categorySlug: "robotics" })).toBe(true);
    expect(isChipSelected(allModeChip, { mode: "all", categorySlug: "robotics" })).toBe(false);
  });

  it("does not select topic chip when categorySlug does not match", () => {
    expect(isChipSelected(roboticsTopicChip, { mode: "all", categorySlug: "gaming" })).toBe(false);
  });

  it("selects mode chip when categorySlug is undefined and mode matches", () => {
    expect(isChipSelected(trendingModeChip, { mode: "trending", categorySlug: undefined })).toBe(
      true,
    );
    expect(isChipSelected(allModeChip, { mode: "trending", categorySlug: undefined })).toBe(false);
    expect(isChipSelected(roboticsTopicChip, { mode: "trending", categorySlug: undefined })).toBe(
      false,
    );
  });
});

describe("toChipHrefPatch", () => {
  it("clears mode and sets category for a topic chip", () => {
    const topicChip: FeedChip = { kind: "topic", categorySlug: "robotics", label: "Robotics" };
    expect(toChipHrefPatch(topicChip)).toEqual({ category: "robotics", mode: undefined });
  });

  it("clears both mode and category for the 'all' mode chip", () => {
    const allChip: FeedChip = { kind: "mode", mode: "all", label: "All" };
    expect(toChipHrefPatch(allChip)).toEqual({ mode: undefined, category: undefined });
  });

  it("sets mode and clears category for other mode chips", () => {
    const trendingChip: FeedChip = { kind: "mode", mode: "trending", label: "Trending" };
    expect(toChipHrefPatch(trendingChip)).toEqual({ mode: "trending", category: undefined });
  });
});

import { describe, expect, it } from "vitest";

import { ASSISTANT_SEARCH_SCOPE_LABELS } from "./assistant-search";
import {
  buildRouterSearchHref,
  describeRouterMatchForHistory,
  routeAssistantRequest,
  tokenizeRequest,
  type AssistantRouterMatch,
} from "./assistant-router";

describe("tokenizeRequest", () => {
  it("lowercases, drops apostrophes and treats punctuation as spaces", () => {
    expect(tokenizeRequest("  What's in MY cart?!  ")).toEqual(["whats", "in", "my", "cart"]);
  });
});

describe("routeAssistantRequest: places", () => {
  const destinationCases: ReadonlyArray<readonly [string, string]> = [
    ["go to my orders", "your_orders"],
    ["Where is my cart?", "open_cart"],
    ["cart", "open_cart"],
    ["take me to the store", "browse_store"],
    ["search the store", "search_store"],
    ["show me my orders", "your_orders"],
    ["please open the factory directory", "find_factories"],
    ["find factories", "find_factories"],
    ["find a cofounder", "find_cofounder"],
    ["how do I request a quote", "request_quote"],
    ["how do i sell something", "sell_a_product"],
    ["I want to post an idea", "post_an_idea"],
    ["teardowns", "teardowns"],
    ["knowledge hub", "market_research"],
    ["help", "customer_service"],
    ["open studio", "creator_studio"],
    ["watch history", "watch_history"],
  ];

  it.each(destinationCases)("%s → %s", (requestText, destinationKey) => {
    expect(routeAssistantRequest(requestText)).toEqual({ kind: "destination", destinationKey });
  });
});

describe("routeAssistantRequest: searches", () => {
  const searchCases: ReadonlyArray<readonly [string, AssistantRouterMatch]> = [
    ["find solar pumps", { kind: "search", scope: "store", query: "solar pumps" }],
    ["search for injection molds", { kind: "search", scope: "store", query: "injection molds" }],
    ["show me solar panels", { kind: "search", scope: "store", query: "solar panels" }],
    [
      "where can I find cold storage units",
      { kind: "search", scope: "store", query: "cold storage units" },
    ],
    ["videos about drones", { kind: "search", scope: "videos", query: "drones" }],
    ["find drone videos", { kind: "search", scope: "videos", query: "drone" }],
    [
      "look for battery recycling in programmes",
      { kind: "search", scope: "research_programs", query: "battery recycling" },
    ],
    [
      "i need a factory in vietnam",
      { kind: "search", scope: "store", query: "factory in vietnam" },
    ],
  ];

  it.each(searchCases)("%s", (requestText, expectedMatch) => {
    expect(routeAssistantRequest(requestText)).toEqual(expectedMatch);
  });

  it("cuts a long query to the search limit", () => {
    const routerMatch = routeAssistantRequest(`find ${"x".repeat(200)}`);
    expect(routerMatch.kind).toBe("search");
    if (routerMatch.kind !== "search") return;
    expect(routerMatch.query).toHaveLength(80);
  });
});

describe("routeAssistantRequest: ties become choices", () => {
  it("offers the three places called projects", () => {
    expect(routeAssistantRequest("projects")).toEqual({
      kind: "choices",
      destinationKeys: ["team_building", "funding", "build_log"],
    });
  });

  it("offers both searches for a bare search", () => {
    expect(routeAssistantRequest("search")).toEqual({
      kind: "choices",
      destinationKeys: ["search_everything", "search_store"],
    });
  });
});

describe("routeAssistantRequest: leaves the rest to the model", () => {
  it.each([
    "what is a teardown",
    "why did my payment fail",
    "explain equity splits",
    "how does funding work on Qatoto",
    "what's the difference between funding and governance for equity",
    "is there a cart",
    "write me a short pitch for a solar powered cold storage unit for farmers in Kenya",
  ])("%s → none", (requestText) => {
    expect(routeAssistantRequest(requestText).kind).toBe("none");
  });

  it("names nearby places when it does not route", () => {
    expect(routeAssistantRequest("what is a teardown")).toEqual({
      kind: "none",
      nearbyDestinationKeys: ["teardowns"],
    });
  });

  it("routes nothing for empty or punctuation-only input", () => {
    expect(routeAssistantRequest("")).toEqual({ kind: "none", nearbyDestinationKeys: [] });
    expect(routeAssistantRequest("?!...")).toEqual({ kind: "none", nearbyDestinationKeys: [] });
  });
});

describe("buildRouterSearchHref", () => {
  it("links each scope to its real results page, encoded", () => {
    expect(buildRouterSearchHref("store", "solar & wind")).toBe(
      "/store/search?query=solar+%26+wind",
    );
    expect(buildRouterSearchHref("videos", "drones")).toBe("/search?query=drones");
    expect(buildRouterSearchHref("research_programs", "battery recycling")).toBe(
      "/research-and-development/programs?q=battery+recycling",
    );
  });
});

describe("describeRouterMatchForHistory", () => {
  it("says what was offered, for the model's history", () => {
    expect(
      describeRouterMatchForHistory(
        { kind: "destination", destinationKey: "your_orders" },
        ASSISTANT_SEARCH_SCOPE_LABELS,
      ),
    ).toBe("Offered a link to Orders and returns.");
    expect(
      describeRouterMatchForHistory(
        { kind: "search", scope: "store", query: "solar pumps" },
        ASSISTANT_SEARCH_SCOPE_LABELS,
      ),
    ).toBe("Offered a search of the store for “solar pumps”.");
  });
});

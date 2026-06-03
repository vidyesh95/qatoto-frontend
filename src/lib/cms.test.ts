import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as CmsModule from "./cms";

type Cms = typeof CmsModule;

const CMS_URL = "https://cms.example.test";

/**
 * `cms.ts` reads `process.env.QATOTO_CMS_URL` exactly once, at module load
 * (`const CMS_URL = process.env.QATOTO_CMS_URL`). To exercise both the
 * "no CMS configured" and "CMS configured" branches we must set the env var
 * and reset the module registry before each fresh import.
 *
 * Pass `undefined` (the default) for the unconfigured case — an empty string is
 * falsy in the `if (!CMS_URL)` guard, identical to the var being unset.
 */
async function loadCms(envUrl?: string): Promise<Cms> {
  vi.resetModules();
  vi.stubEnv("QATOTO_CMS_URL", envUrl ?? "");
  return import("./cms");
}

/** Minimal `Response`-shaped stub good enough for the two fields `cmsFetch` touches. */
function jsonResponse(body: unknown, ok = true): Response {
  return { ok, json: async () => body } as unknown as Response;
}

function installFetch(impl: (...args: Parameters<typeof fetch>) => Promise<Response>) {
  const fetchMock = vi.fn<(...args: Parameters<typeof fetch>) => Promise<Response>>(impl);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("formatDate", () => {
  it("formats an ISO date as 'Mon D, YYYY' (en-US)", async () => {
    const { formatDate } = await loadCms();
    expect(formatDate("2026-04-22")).toBe("Apr 22, 2026");
    expect(formatDate("2026-05-05")).toBe("May 5, 2026");
    expect(formatDate("2026-01-01")).toBe("Jan 1, 2026");
  });

  it("formats a full ISO timestamp, ignoring the time component", async () => {
    const { formatDate } = await loadCms();
    expect(formatDate("2026-12-31T23:59:59Z")).toBe("Dec 31, 2026");
  });

  it("returns 'Invalid Date' for unparseable input", async () => {
    const { formatDate } = await loadCms();
    expect(formatDate("not-a-date")).toBe("Invalid Date");
  });
});

describe("when QATOTO_CMS_URL is not configured", () => {
  let cms: Cms;
  let fetchMock: ReturnType<typeof installFetch>;

  beforeEach(async () => {
    fetchMock = installFetch(async () => jsonResponse(null));
    cms = await loadCms(); // unconfigured
  });

  it("getBlogs returns the mock blogs without touching the network", async () => {
    const blogs = await cms.getBlogs();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(blogs.length).toBe(4);
    expect(blogs.map((b) => b.slug)).toContain("how-to-pitch-on-qatoto");
  });

  it("getPressList returns the mock press without touching the network", async () => {
    const press = await cms.getPressList();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(press.length).toBe(4);
    expect(press.map((p) => p.slug)).toContain("qatoto-launches-build-console-v2");
  });

  it("getBlog resolves a known slug from the mocks", async () => {
    const blog = await cms.getBlog("five-tips-for-eod-updates");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(blog?.title).toBe("Five tips for an EOD update that investors actually read");
  });

  it("getBlog returns null for an unknown slug", async () => {
    expect(await cms.getBlog("does-not-exist")).toBeNull();
  });

  it("getPressItem resolves a known slug from the mocks", async () => {
    const item = await cms.getPressItem("civic-problem-map-india-pilot");
    expect(item?.kind).toBe("milestone");
  });

  it("getPressItem returns null for an unknown slug", async () => {
    expect(await cms.getPressItem("does-not-exist")).toBeNull();
  });
});

describe("when QATOTO_CMS_URL is configured and the upstream responds", () => {
  it("getBlogs returns the remote payload and calls the right URL + headers", async () => {
    const remote = [
      {
        slug: "remote-post",
        title: "Remote",
        excerpt: "x",
        body: "<p>x</p>",
        category: "tips",
        author: { name: "R" },
        publishedAt: "2026-05-01",
        readingMinutes: 3,
        tags: [],
      },
    ];
    const fetchMock = installFetch(async () => jsonResponse(remote));
    const cms = await loadCms(CMS_URL);

    const blogs = await cms.getBlogs();
    expect(blogs).toEqual(remote);
    expect(fetchMock).toHaveBeenCalledWith(`${CMS_URL}/blogs`, {
      headers: { Accept: "application/json" },
    });
  });

  it("getPressList returns the remote payload from /press", async () => {
    const remote = [
      {
        slug: "remote-press",
        title: "Remote press",
        summary: "x",
        body: "<p>x</p>",
        kind: "release",
        publishedAt: "2026-05-01",
        tags: [],
      },
    ];
    const fetchMock = installFetch(async () => jsonResponse(remote));
    const cms = await loadCms(CMS_URL);

    expect(await cms.getPressList()).toEqual(remote);
    expect(fetchMock).toHaveBeenCalledWith(`${CMS_URL}/press`, {
      headers: { Accept: "application/json" },
    });
  });

  it("getBlog returns the remote item and URL-encodes the slug", async () => {
    const remote = {
      slug: "post/with space",
      title: "Encoded",
      excerpt: "x",
      body: "<p>x</p>",
      category: "guide",
      author: { name: "R" },
      publishedAt: "2026-05-01",
      readingMinutes: 2,
      tags: [],
    };
    const fetchMock = installFetch(async () => jsonResponse(remote));
    const cms = await loadCms(CMS_URL);

    const blog = await cms.getBlog("post/with space");
    expect(blog).toEqual(remote);
    expect(fetchMock).toHaveBeenCalledWith(`${CMS_URL}/blogs/post%2Fwith%20space`, {
      headers: { Accept: "application/json" },
    });
  });

  it("getPressItem returns the remote item and URL-encodes the slug", async () => {
    const remote = {
      slug: "a&b",
      title: "Encoded press",
      summary: "x",
      body: "<p>x</p>",
      kind: "media",
      publishedAt: "2026-05-01",
      tags: [],
    };
    const fetchMock = installFetch(async () => jsonResponse(remote));
    const cms = await loadCms(CMS_URL);

    expect(await cms.getPressItem("a&b")).toEqual(remote);
    expect(fetchMock).toHaveBeenCalledWith(`${CMS_URL}/press/a%26b`, {
      headers: { Accept: "application/json" },
    });
  });
});

describe("when QATOTO_CMS_URL is configured but the upstream fails", () => {
  it("falls back to mocks when the response is not ok", async () => {
    installFetch(async () => jsonResponse([{ slug: "ignored" }], false));
    const cms = await loadCms(CMS_URL);
    const blogs = await cms.getBlogs();
    expect(blogs.length).toBe(4);
    expect(blogs.map((b) => b.slug)).not.toContain("ignored");
  });

  it("falls back to mocks when the response body is null", async () => {
    installFetch(async () => jsonResponse(null));
    const cms = await loadCms(CMS_URL);
    const press = await cms.getPressList();
    expect(press.length).toBe(4);
    expect(press.map((p) => p.slug)).toContain("qatoto-launches-build-console-v2");
  });

  it("falls back to mocks when fetch rejects (network error)", async () => {
    installFetch(async () => {
      throw new Error("network down");
    });
    const cms = await loadCms(CMS_URL);
    const blogs = await cms.getBlogs();
    const press = await cms.getPressList();
    expect(blogs.map((b) => b.slug)).toContain("how-to-pitch-on-qatoto");
    expect(press.map((p) => p.slug)).toContain("civic-problem-map-india-pilot");
  });

  it("getBlog falls back to mock lookup on a failed fetch (known slug)", async () => {
    installFetch(async () => {
      throw new Error("network down");
    });
    const cms = await loadCms(CMS_URL);
    const blog = await cms.getBlog("how-to-pitch-on-qatoto");
    expect(blog?.slug).toBe("how-to-pitch-on-qatoto");
  });

  it("getBlog returns null on a failed fetch when the slug is unknown", async () => {
    installFetch(async () => jsonResponse(null, false));
    const cms = await loadCms(CMS_URL);
    expect(await cms.getBlog("nope")).toBeNull();
  });

  it("getPressItem falls back to mock lookup on a failed fetch (known slug)", async () => {
    installFetch(async () => jsonResponse(null, false));
    const cms = await loadCms(CMS_URL);
    expect((await cms.getPressItem("qatoto-store-clears-100-shipped-products"))?.kind).toBe(
      "milestone",
    );
  });
});

describe("mock data invariants (the fallback contract)", () => {
  const blogCategories = new Set(["tips", "how-to", "guide", "deep-dive", "story"]);
  const pressKinds = new Set(["announcement", "release", "milestone", "media"]);

  it("blog mocks have unique slugs, valid categories, and positive reading times", async () => {
    const cms = await loadCms();
    const blogs = await cms.getBlogs();
    const slugs = blogs.map((b) => b.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const b of blogs) {
      expect(blogCategories.has(b.category)).toBe(true);
      expect(b.readingMinutes).toBeGreaterThan(0);
      expect(b.title).not.toBe("");
      expect(b.author.name).not.toBe("");
    }
  });

  it("press mocks have unique slugs and valid kinds", async () => {
    const cms = await loadCms();
    const press = await cms.getPressList();
    const slugs = press.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const p of press) {
      expect(pressKinds.has(p.kind)).toBe(true);
      expect(p.title).not.toBe("");
      expect(p.summary).not.toBe("");
    }
  });
});

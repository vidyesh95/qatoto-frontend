import { describe, expect, it } from "vitest";
import { extractYoutubeVideoId, isYoutubeVideoUrl } from "./youtube";

describe("youtube", () => {
  describe("extractYoutubeVideoId", () => {
    it("extracts ID from full watch URLs", () => {
      expect(extractYoutubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
        "dQw4w9WgXcQ",
      );
      expect(extractYoutubeVideoId("http://youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
      expect(extractYoutubeVideoId("https://m.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
        "dQw4w9WgXcQ",
      );
      expect(extractYoutubeVideoId("https://music.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
        "dQw4w9WgXcQ",
      );
    });

    it("extracts ID from short youtu.be URLs", () => {
      expect(extractYoutubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
      expect(extractYoutubeVideoId("http://www.youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    });

    it("extracts ID from shorts URLs", () => {
      expect(extractYoutubeVideoId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe(
        "dQw4w9WgXcQ",
      );
    });

    it("extracts ID from embed URLs", () => {
      expect(extractYoutubeVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe(
        "dQw4w9WgXcQ",
      );
      expect(extractYoutubeVideoId("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ")).toBe(
        "dQw4w9WgXcQ",
      );
    });

    it("extracts ID from live URLs", () => {
      expect(extractYoutubeVideoId("https://www.youtube.com/live/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    });

    it("extracts ID from /v/ URLs", () => {
      expect(extractYoutubeVideoId("https://www.youtube.com/v/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    });

    it("extracts ID from bare 11-character IDs", () => {
      expect(extractYoutubeVideoId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    });

    it("extracts ID from schemeless URLs", () => {
      expect(extractYoutubeVideoId("www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
      expect(extractYoutubeVideoId("youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    });

    it("ignores extra query parameters or path segments", () => {
      expect(extractYoutubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s")).toBe(
        "dQw4w9WgXcQ",
      );
      expect(extractYoutubeVideoId("https://youtu.be/dQw4w9WgXcQ?t=42")).toBe("dQw4w9WgXcQ");
      expect(extractYoutubeVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ/")).toBe(
        "dQw4w9WgXcQ",
      );
    });

    it("handles surrounding whitespace", () => {
      expect(extractYoutubeVideoId("  https://youtu.be/dQw4w9WgXcQ  ")).toBe("dQw4w9WgXcQ");
    });

    it("returns null for non-YouTube domains", () => {
      expect(extractYoutubeVideoId("https://vimeo.com/123456789")).toBeNull();
      expect(extractYoutubeVideoId("https://example.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    });

    it("returns null for invalid YouTube IDs", () => {
      expect(extractYoutubeVideoId("https://youtu.be/too-short")).toBeNull(); // < 11 chars
      expect(extractYoutubeVideoId("https://youtu.be/this-is-too-long")).toBeNull(); // > 11 chars
      expect(extractYoutubeVideoId("https://www.youtube.com/watch?v=invalid@id!")).toBeNull(); // invalid chars
      expect(extractYoutubeVideoId("invalid_id!")).toBeNull();
    });

    it("returns null for empty strings or strings that don't match pattern", () => {
      expect(extractYoutubeVideoId("")).toBeNull();
      expect(extractYoutubeVideoId("   ")).toBeNull();
      expect(extractYoutubeVideoId("not-a-url")).toBeNull();
    });

    it("returns null for unparseable URLs that are not bare IDs", () => {
      expect(extractYoutubeVideoId("http://%")).toBeNull(); // Invalid URL, but does not match bare ID
    });
  });

  describe("isYoutubeVideoUrl", () => {
    it("returns true for valid YouTube URLs", () => {
      expect(isYoutubeVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
      expect(isYoutubeVideoUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(true);
      expect(isYoutubeVideoUrl("dQw4w9WgXcQ")).toBe(true);
    });

    it("returns false for invalid YouTube URLs", () => {
      expect(isYoutubeVideoUrl("https://vimeo.com/123456789")).toBe(false);
      expect(isYoutubeVideoUrl("not-a-youtube-url")).toBe(false);
      expect(isYoutubeVideoUrl("")).toBe(false);
    });
  });
});

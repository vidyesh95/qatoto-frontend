import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { QueueProvider, useQueue, type QueueEntry } from "./queue-context";

function QueueTestWrapper({ children }: { readonly children: ReactNode }) {
  return <QueueProvider>{children}</QueueProvider>;
}

function createMockQueueEntry(videoId: string, title = `Video ${videoId}`): QueueEntry {
  return {
    videoId,
    title,
    thumbnailSrc: `https://img.example.test/${videoId}.jpg`,
    channelName: "Test Channel",
    href: `/watch?v=${videoId}`,
  };
}

describe("queue-context", () => {
  it("throws an error when useQueue is called outside of a QueueProvider", () => {
    expect(() => renderHook(() => useQueue())).toThrow(
      "useQueue must be used within a QueueProvider",
    );
  });

  it("initializes with an empty queue", () => {
    const { result } = renderHook(() => useQueue(), { wrapper: QueueTestWrapper });

    expect(result.current.entries).toEqual([]);
    expect(result.current.isQueued("video-1")).toBe(false);
  });

  it("adds entries to the queue and dedupes by videoId", () => {
    const { result } = renderHook(() => useQueue(), { wrapper: QueueTestWrapper });

    const firstEntry = createMockQueueEntry("video-1");
    const secondEntry = createMockQueueEntry("video-2");

    act(() => {
      result.current.addToQueue(firstEntry);
    });

    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0]?.videoId).toBe("video-1");
    expect(result.current.isQueued("video-1")).toBe(true);

    act(() => {
      result.current.addToQueue(secondEntry);
    });

    expect(result.current.entries).toHaveLength(2);
    expect(result.current.isQueued("video-2")).toBe(true);

    // Attempting to add an entry with the same videoId must not duplicate it
    act(() => {
      result.current.addToQueue(createMockQueueEntry("video-1", "Duplicate attempt"));
    });

    expect(result.current.entries).toHaveLength(2);
    expect(result.current.entries[0]?.title).toBe("Video video-1");
  });

  it("removes entries from the queue by videoId", () => {
    const { result } = renderHook(() => useQueue(), { wrapper: QueueTestWrapper });

    const firstEntry = createMockQueueEntry("video-1");
    const secondEntry = createMockQueueEntry("video-2");

    act(() => {
      result.current.addToQueue(firstEntry);
      result.current.addToQueue(secondEntry);
    });

    expect(result.current.entries).toHaveLength(2);

    act(() => {
      result.current.removeFromQueue("video-1");
    });

    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0]?.videoId).toBe("video-2");
    expect(result.current.isQueued("video-1")).toBe(false);
    expect(result.current.isQueued("video-2")).toBe(true);
  });

  it("clears all entries from the queue", () => {
    const { result } = renderHook(() => useQueue(), { wrapper: QueueTestWrapper });

    act(() => {
      result.current.addToQueue(createMockQueueEntry("video-1"));
      result.current.addToQueue(createMockQueueEntry("video-2"));
      result.current.addToQueue(createMockQueueEntry("video-3"));
    });

    expect(result.current.entries).toHaveLength(3);

    act(() => {
      result.current.clearQueue();
    });

    expect(result.current.entries).toEqual([]);
    expect(result.current.isQueued("video-1")).toBe(false);
  });
});

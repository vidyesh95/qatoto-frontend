// TRANSPORT: client-query — reads `GET /research-projects/:projectSlug/videos`.
"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { useProjectVideosQuery } from "@/hooks/rnd/projects";
import { formatDurationLabel } from "@/lib/feed/format";
import type { ProjectVideo } from "@/lib/rnd/projects.schemas";

/**
 * Choose the video a pitch shows.
 *
 * SINGLE-SELECT, unlike the product and playlist pickers this copies its shape from: a pitch
 * embeds one video, so picking a second replaces the first rather than adding to a set.
 *
 * IT READS THE VENTURE'S OWN REEL, `GET /research-projects/:slug/videos`, and that is the
 * whole reason no new endpoint was needed. That read is already public and already filtered
 * by the same `PUBLICLY_SERVABLE` gate the server re-applies when accepting the choice — so
 * every option shown is one the write will accept, and nothing that fails the gate is even
 * offered. A picker over `GET /videos/mine` would have listed drafts and private uploads that
 * the server then refuses, which is the "dangling option" failure `listAttachableProjects`
 * exists to avoid on the venture side.
 *
 * THE EMPTY STATE IS THE COMMON CASE, not an edge. No video in the database has a venture
 * attached yet, so today every founder lands here first — which makes this the most-viewed
 * screen in the whole feature, and the reason it explains the two-step flow rather than
 * shrugging.
 */
export default function PitchVideoPicker({
  projectSlug,
  selectedVideoId,
  onSelect,
  onDone,
}: {
  readonly projectSlug: string;
  readonly selectedVideoId: string | null;
  readonly onSelect: (video: ProjectVideo | null) => void;
  readonly onDone: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const projectVideosQuery = useProjectVideosQuery(projectSlug);

  const ventureVideos = projectVideosQuery.data?.rows ?? [];
  // Client-side, over one page of a set the founder is expected to recognise — the same
  // argument `store-products-picker` makes. A venture with more videos than one page needs a
  // server-side `?query=`, not a second fetch here.
  const matchingVideos = ventureVideos.filter((video) =>
    video.title.toLowerCase().includes(searchQuery.trim().toLowerCase()),
  );

  return (
    <>
      <button
        type="button"
        aria-label="Close video picker"
        onClick={onDone}
        className="fixed inset-0 z-60 cursor-default bg-black/40"
      />
      <div className="fixed inset-x-4 top-1/2 z-70 mx-auto flex max-h-[70dvh] w-auto max-w-md -translate-y-1/2 flex-col rounded-2xl border border-black/10 bg-background shadow-lg">
        {projectVideosQuery.isPending ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Loading your videos…</p>
        ) : projectVideosQuery.error !== null ? (
          // FAILED IS NOT EMPTY. Collapsing the two is how a broken read gets read as "this
          // venture has no videos" — which is exactly what happened here when the request sent
          // a `limit` the route refused.
          <div className="p-6">
            <p className="text-sm text-foreground">
              Couldn&apos;t load this venture&apos;s videos.
            </p>
            <button
              type="button"
              onClick={onDone}
              className="mt-3 cursor-pointer rounded-full border border-border px-4 py-2 text-sm text-foreground"
            >
              Close
            </button>
          </div>
        ) : ventureVideos.length === 0 ? (
          <div className="p-6">
            <p className="text-sm font-medium text-foreground">
              No videos are attached to this venture yet.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              A pitch shows a video that already belongs to the venture. Upload one — or edit a
              video you have already uploaded — and pick this venture in the upload wizard. It will
              appear here once it is published and public.
            </p>
            <Link
              href="/studio/videos"
              className="mt-3 inline-block rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Go to My Videos
            </Link>
            <button
              type="button"
              onClick={onDone}
              className="mt-3 ml-2 cursor-pointer rounded-full border border-border px-4 py-2 text-sm text-foreground"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-black/10 bg-background p-4">
              <Image
                src="/icons/search_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt=""
                width={20}
                height={20}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(changeEvent) => {
                  setSearchQuery(changeEvent.target.value);
                }}
                placeholder="Search this venture's videos"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>

            <ul className="min-h-0 flex-1 overflow-y-auto py-2">
              {matchingVideos.map((video) => {
                const isSelected = video.videoId === selectedVideoId;
                const durationLabel = formatDurationLabel(video.durationSeconds);
                return (
                  <li key={video.videoId}>
                    <button
                      type="button"
                      onClick={() => {
                        // Picking the selected one again clears it — the only way to remove a
                        // video without a separate control.
                        onSelect(isSelected ? null : video);
                      }}
                      className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted"
                    >
                      <span
                        className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
                          isSelected ? "border-foreground bg-foreground" : "border-border"
                        }`}
                      >
                        {isSelected && (
                          <Image
                            src="/icons/check_18dp_FFFFFF_FILL1_wght400_GRAD0_opsz20.svg"
                            alt=""
                            width={14}
                            height={14}
                          />
                        )}
                      </span>
                      <span className="relative flex aspect-video w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary">
                        {video.thumbnailUrl === null ? (
                          <Image
                            src="/icons/video_library_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                            alt=""
                            width={20}
                            height={20}
                          />
                        ) : (
                          <Image
                            src={video.thumbnailUrl}
                            alt=""
                            width={96}
                            height={54}
                            className="size-full object-cover"
                          />
                        )}
                        {/* Absent rather than zero: a null duration means the backend has not
                            measured it yet. */}
                        {durationLabel !== null && (
                          <span className="absolute right-1 bottom-1 rounded bg-black/75 px-1 text-[11px] font-medium text-white">
                            {durationLabel}
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1 text-sm text-foreground">{video.title}</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="flex items-center justify-end border-t border-black/10 p-3">
              <button
                type="button"
                onClick={onDone}
                className="cursor-pointer rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

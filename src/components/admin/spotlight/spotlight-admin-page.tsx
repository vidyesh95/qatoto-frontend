// TRANSPORT: client-query — list + replace call hooks in `@/hooks/spotlight`. Capability
// check reads `@/hooks/rnd/platform-roles`. Video search uses `searchVideos` from the feed
// API so the admin picker only offers catalogue rows the public rail can actually show.
"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { useState } from "react";

import {
  MutationErrorNotice,
  MutationSuccessNotice,
} from "@/components/home/research-and-development/sections/mutation-feedback";
import { useOwnStaffContextQuery } from "@/hooks/rnd/platform-roles";
import { useAdminSpotlightSlotsQuery, useReplaceSpotlightSlotsMutation } from "@/hooks/spotlight";
import { searchVideos } from "@/lib/feed/api";
import type { FeedVideo } from "@/lib/feed/schemas";
import { ApiRequestError, unwrap } from "@/lib/http";
import {
  MAX_SPOTLIGHT_SLOTS,
  type AdminSpotlightSlot,
  type PublicSpotlightVideo,
} from "@/lib/spotlight/schemas";

const SLOT_LABELS = ["Left", "Center", "Right"] as const;

type SlotDraft = PublicSpotlightVideo | null;

type SlotListViewState =
  | { status: "loading" }
  | { status: "restricted" }
  | { status: "error"; message: string }
  | { status: "ready"; slots: AdminSpotlightSlot[] };

function toSlotListViewState(
  canManage: boolean,
  query: {
    isPending: boolean;
    isError: boolean;
    error: unknown;
    data: AdminSpotlightSlot[] | undefined;
  },
): SlotListViewState {
  if (!canManage) return { status: "restricted" };
  if (query.isPending) return { status: "loading" };
  if (query.isError || query.data === undefined) {
    return {
      status: "error",
      message:
        query.error instanceof ApiRequestError
          ? query.error.apiError.message
          : "Couldn't load Spotlight slots.",
    };
  }
  return { status: "ready", slots: query.data };
}

function slotsToDraft(slots: readonly AdminSpotlightSlot[]): SlotDraft[] {
  const draft: SlotDraft[] = [null, null, null];
  for (const slot of slots) {
    if (slot.position < 0 || slot.position >= MAX_SPOTLIGHT_SLOTS) continue;
    draft[slot.position] = {
      videoId: slot.videoId,
      title: slot.title,
      thumbnailUrl: slot.thumbnailUrl,
    };
  }
  return draft;
}

function emptyDraft(): SlotDraft[] {
  return [null, null, null];
}

/**
 * The home Spotlight console — up to three catalogue videos for the expanding-tile rail.
 *
 * `manage_promotions` is the gate (same front-page placement blast radius as the carousel).
 * Failing the capability degrades this page to read-only; it does not hide it.
 *
 * NOTHING IS OPTIMISTIC. Save waits for the server and the draft re-seeds from its answer.
 */
export default function SpotlightAdminPage() {
  const staffContextQuery = useOwnStaffContextQuery();
  const canManageSpotlight =
    staffContextQuery.data?.capabilities.includes("manage_promotions") ?? false;

  const slotsQuery = useAdminSpotlightSlotsQuery(canManageSpotlight);
  const replaceSlots = useReplaceSpotlightSlotsMutation();

  const listState = toSlotListViewState(canManageSpotlight, {
    isPending: slotsQuery.isPending,
    isError: slotsQuery.isError,
    error: slotsQuery.error,
    data: slotsQuery.data,
  });

  const [draftSlots, setDraftSlots] = useState<SlotDraft[]>(emptyDraft);
  const [hasSeededDraft, setHasSeededDraft] = useState(false);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);
  const [searchText, setSearchText] = useState("");
  const [didSaveSucceed, setDidSaveSucceed] = useState(false);

  // Seed the draft ONCE when the admin list first arrives. Do not key off
  // `replaceSlots.isSuccess` — that flag stays true after a save and, combined with
  // setDraftSlots always producing a new array, re-enters forever (Maximum update depth).
  // After Save, apply the mutation result directly in onSuccess instead.
  const serverSlots = slotsQuery.data;
  if (serverSlots !== undefined && !hasSeededDraft) {
    setDraftSlots(slotsToDraft(serverSlots));
    setHasSeededDraft(true);
  }

  const trimmedSearch = searchText.trim();
  const searchQuery = useQuery({
    queryKey: ["spotlight-admin-video-search", trimmedSearch],
    queryFn: async () => unwrap(await searchVideos({ query: trimmedSearch, limit: 8 })),
    enabled: canManageSpotlight && activeSlotIndex !== null && trimmedSearch.length >= 1,
    retry: false,
  });

  function handlePickVideo(video: FeedVideo) {
    if (activeSlotIndex === null) return;
    setDraftSlots((previous) => {
      const next = [...previous];
      // A video already in another slot is moved, not duplicated — the backend rejects
      // duplicates and the rail has no meaning for the same thumbnail twice.
      for (let index = 0; index < next.length; index += 1) {
        if (next[index]?.videoId === video.videoId) {
          next[index] = null;
        }
      }
      next[activeSlotIndex] = {
        videoId: video.videoId,
        title: video.title,
        thumbnailUrl: video.thumbnailUrl,
      };
      return next;
    });
    setActiveSlotIndex(null);
    setSearchText("");
    setDidSaveSucceed(false);
  }

  function handleClearSlot(slotIndex: number) {
    setDraftSlots((previous) => {
      const next = [...previous];
      next[slotIndex] = null;
      return next;
    });
    setDidSaveSucceed(false);
  }

  function handleSave() {
    // Gaps close on save: Left=A, Center=empty, Right=B becomes [A, B]. Contiguous order
    // is the wire contract; sparse positions are not representable.
    const videoIds = draftSlots
      .filter((slot): slot is PublicSpotlightVideo => slot !== null)
      .map((slot) => slot.videoId);
    setDidSaveSucceed(false);
    replaceSlots.mutate(
      { videoIds },
      {
        onSuccess: (slots) => {
          setDidSaveSucceed(true);
          setDraftSlots(slotsToDraft(slots));
          setHasSeededDraft(true);
        },
      },
    );
  }

  const replaceError =
    replaceSlots.error instanceof ApiRequestError ? replaceSlots.error : undefined;

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Spotlight</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          The three-video rail below &quot;What&apos;s on your mind?&quot; on the home page. Pick
          catalogue videos for Left, Center and Right — visitors see them in that order.
        </p>
      </header>

      {staffContextQuery.isError && (
        <output className="block rounded-2xl border border-[#CAC4D0]/60 bg-muted/40 p-3 text-sm text-muted-foreground">
          Couldn&apos;t check your permissions, so this page is read-only.
        </output>
      )}
      {staffContextQuery.isSuccess && !canManageSpotlight && (
        <output className="block rounded-2xl border border-[#CAC4D0]/60 bg-muted/40 p-3 text-sm text-muted-foreground">
          Managing Spotlight needs the admin role. Your role is{" "}
          {staffContextQuery.data.platformRole ?? "none"}, so this page is read-only.
        </output>
      )}

      {replaceError && <MutationErrorNotice error={replaceError.apiError} />}
      {didSaveSucceed && <MutationSuccessNotice message="Spotlight updated." />}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Slots</h2>
        {renderSlotEditor()}
      </section>
    </div>
  );

  function renderSlotEditor() {
    switch (listState.status) {
      case "restricted":
        return (
          <p className="text-sm text-muted-foreground">
            The Spotlight list is only visible to admins.
          </p>
        );
      case "loading":
        return <p className="text-sm text-muted-foreground">Loading…</p>;
      case "error":
        return (
          <p
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {listState.message}
          </p>
        );
      case "ready":
        return (
          <div className="space-y-6">
            <ul className="grid gap-4 md:grid-cols-3">
              {SLOT_LABELS.map((label, slotIndex) => {
                const slot = draftSlots[slotIndex] ?? null;
                const isPicking = activeSlotIndex === slotIndex;
                return (
                  <li
                    key={label}
                    className="flex flex-col gap-3 rounded-2xl border border-[#CAC4D0]/60 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-medium">{label}</h3>
                      {slot !== null && canManageSpotlight && (
                        <button
                          type="button"
                          className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                          onClick={() => handleClearSlot(slotIndex)}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    {slot === null ? (
                      <div className="flex aspect-video items-center justify-center rounded-xl bg-muted/50 text-xs text-muted-foreground">
                        Empty
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="relative aspect-video overflow-hidden rounded-xl bg-muted">
                          {slot.thumbnailUrl !== null ? (
                            <Image
                              src={slot.thumbnailUrl}
                              alt={slot.title}
                              fill
                              className="object-cover"
                              sizes="240px"
                              unoptimized
                            />
                          ) : null}
                        </div>
                        <p className="line-clamp-2 text-sm">{slot.title}</p>
                      </div>
                    )}
                    {canManageSpotlight && (
                      <button
                        type="button"
                        className="rounded-full border border-[#CAC4D0] px-3 py-1.5 text-sm hover:bg-muted/50"
                        onClick={() => {
                          setActiveSlotIndex(isPicking ? null : slotIndex);
                          setSearchText("");
                        }}
                      >
                        {isPicking ? "Cancel" : slot === null ? "Pick a video" : "Change video"}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>

            {canManageSpotlight && activeSlotIndex !== null && (
              <div className="space-y-3 rounded-2xl border border-[#CAC4D0]/60 p-4">
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium">
                    Search catalogue for {SLOT_LABELS[activeSlotIndex]}
                  </span>
                  <input
                    type="search"
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder="Title or keywords"
                    className="w-full rounded-xl border border-[#CAC4D0] bg-background px-3 py-2 text-sm"
                  />
                </label>
                {trimmedSearch.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Type to search published videos.</p>
                ) : searchQuery.isPending ? (
                  <p className="text-sm text-muted-foreground">Searching…</p>
                ) : searchQuery.isError ? (
                  <p role="alert" className="text-sm text-red-800">
                    {searchQuery.error instanceof ApiRequestError
                      ? searchQuery.error.apiError.message
                      : "Search failed."}
                  </p>
                ) : (searchQuery.data?.data.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">No videos matched.</p>
                ) : (
                  <ul className="divide-y divide-[#CAC4D0]/40">
                    {searchQuery.data?.data.map((video) => (
                      <li key={video.videoId}>
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 px-1 py-2 text-left hover:bg-muted/40"
                          onClick={() => handlePickVideo(video)}
                        >
                          <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                            {video.thumbnailUrl !== null ? (
                              <Image
                                src={video.thumbnailUrl}
                                alt=""
                                fill
                                className="object-cover"
                                sizes="80px"
                                unoptimized
                              />
                            ) : null}
                          </div>
                          <span className="line-clamp-2 text-sm">{video.title}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {canManageSpotlight && (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={replaceSlots.isPending}
                  onClick={handleSave}
                  className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  {replaceSlots.isPending ? "Saving…" : "Save Spotlight"}
                </button>
                <p className="text-xs text-muted-foreground">
                  Empty slots are skipped on save. Clearing every slot hides the rail on the home
                  page.
                </p>
              </div>
            )}
          </div>
        );
      default: {
        const exhaustiveCheck: never = listState;
        return exhaustiveCheck;
      }
    }
  }
}

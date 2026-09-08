// TRANSPORT: props-only — the video arrives from whichever detail page rendered it.

"use client";

import { useImperativeHandle, useRef, type RefObject } from "react";

import type { WalkthroughPlayerHandle } from "@/components/home/blueprints/media/walkthrough-seek-context";
import type { HostedBlueprintVideo } from "@/lib/blueprints/schemas";

export interface BlueprintHostedPlayerProps {
  readonly video: HostedBlueprintVideo;
  /** Names the video for a screen reader — "Walkthrough", "Demo". */
  readonly title: string;
  /**
   * Named `playerRef` rather than `ref`, following `TeardownStage`'s `stageRef`: it carries a
   * command handle, and leaving `ref` free keeps it meaning "the DOM node".
   */
  readonly playerRef: RefObject<WalkthroughPlayerHandle | null>;
  /** The position to mount at; later seeks come through the handle. */
  readonly startAtSeconds: number;
}

/** `HTMLMediaElement.HAVE_METADATA` — a constant the DOM types expose only on an instance. */
const HAVE_METADATA_READY_STATE = 1;

/**
 * The `<video>` arm.
 *
 * ITS OWN COMPONENT, and not just for symmetry with the YouTube arm: the element ref and the
 * pending-seek ref belong to whichever player is mounted, so keeping them here means the block
 * above never touches a ref while rendering.
 */
export default function BlueprintHostedPlayer({
  video,
  title,
  playerRef,
  startAtSeconds,
}: BlueprintHostedPlayerProps) {
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  /** Non-null between a seek being asked for and there being metadata enough to honour it. */
  const pendingSeekSecondsRef = useRef<number | null>(startAtSeconds > 0 ? startAtSeconds : null);

  function applyPendingSeek(): void {
    const element = videoElementRef.current;
    const pendingSeekSeconds = pendingSeekSecondsRef.current;
    if (element === null || pendingSeekSeconds === null) return;
    element.currentTime = pendingSeekSeconds;
    // ⚠️ CLEARED ONLY ONCE METADATA EXISTS. Before that the HTML spec routes a `currentTime` write
    // to the default playback start position — which is what makes the very first painted frame
    // the right one — but Safari has historically dropped such a write, so `onLoadedMetadata`
    // re-applies. Re-applying a position the element already holds costs nothing.
    if (element.readyState >= HAVE_METADATA_READY_STATE) pendingSeekSecondsRef.current = null;
    // A rejected play() is the browser's autoplay policy, not an error to report: the controls are
    // on screen and the reader can press play. `no-console` forbids the usual shrug anyway.
    void element.play().catch(() => undefined);
  }

  useImperativeHandle(
    playerRef,
    () => ({
      seekToSeconds(positionSeconds) {
        pendingSeekSecondsRef.current = positionSeconds;
        applyPendingSeek();
      },
    }),
    [],
  );

  function attachVideoElement(element: HTMLVideoElement | null): void {
    videoElementRef.current = element;
    applyPendingSeek();
  }

  /**
   * TWO BRANCHES RATHER THAN ONE WITH A CONDITIONAL CHILD, and the split is what lets the linter
   * do its job. `media-has-caption` cannot see a `<track>` inside a JSX expression container, so a
   * single element with `{captionsUrl === null ? null : <track/>}` had to suppress the rule for
   * BOTH paths — including the captioned one, which is the path worth checking. Written this way
   * the captioned branch is linted normally and the suppression covers only the case where
   * suppressing is correct: there are genuinely no captions to render.
   *
   * ⚠️ THE OTHER WAY OUT OF THIS IS A LIE, and the repo already contains it —
   * `studio/upload/video-preview-card.tsx:95` renders `<track kind="captions" />` with no `src`,
   * which satisfies the rule and delivers no captions to anyone. Do not do that twice.
   *
   * `playerProps` is shared so the two branches cannot drift apart.
   */
  const playerProps = {
    ref: attachVideoElement,
    onLoadedMetadata: applyPendingSeek,
    src: video.url,
    poster: video.posterUrl,
    controls: true,
    autoPlay: true,
    preload: "none",
    className: "size-full",
    "aria-label": title,
  } as const;

  if (video.captionsUrl === null) {
    // oxlint-disable-next-line media-has-caption
    return <video {...playerProps} />;
  }

  return (
    <video {...playerProps}>
      <track kind="captions" src={video.captionsUrl} srcLang="en" label="English" default />
    </video>
  );
}

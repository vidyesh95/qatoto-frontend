// TRANSPORT: props-only — loads a third-party script. No Qatoto backend call.
//
// THE IFRAME API IS A SINGLETON WITH A GLOBAL CALLBACK, AND THAT IS THE WHOLE PROBLEM.
//
// `https://www.youtube.com/iframe_api` signals readiness by invoking `window.onYouTubeIframeAPIReady`
// exactly ONCE, globally. Two players mounting in the same tick would each append a script tag
// and each overwrite that callback, so one of them would wait forever for a call that already
// happened. The module-level promise below is the fix: the first caller appends the tag, every
// later caller — including one arriving after the API is already up — awaits the same promise.
//
// There are no official types for this API and `@types/youtube` is not a dependency, so the
// surface we actually touch is declared here. A narrow hand-written interface is better than
// `any`: it is the same reason CLAUDE.md Pattern 2 forbids `as` on a network payload.

const IFRAME_API_SRC = "https://www.youtube.com/iframe_api";

/** YouTube's `PlayerState` numbers. Documented, stable, and not exported by the API itself. */
export const YOUTUBE_PLAYER_STATE = {
  unstarted: -1,
  ended: 0,
  playing: 1,
  paused: 2,
  buffering: 3,
  cued: 5,
} as const;

export interface YoutubePlayer {
  getCurrentTime: () => number;
  getDuration: () => number;
  destroy: () => void;
}

export interface YoutubePlayerEvent {
  target: YoutubePlayer;
  data: number;
}

export interface YoutubePlayerFactory {
  new (
    container: HTMLElement,
    config: {
      videoId: string;
      host?: string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: (event: YoutubePlayerEvent) => void;
        onStateChange?: (event: YoutubePlayerEvent) => void;
        onError?: (event: YoutubePlayerEvent) => void;
      };
    },
  ): YoutubePlayer;
}

interface YoutubeIframeApi {
  Player: YoutubePlayerFactory;
}

declare global {
  interface Window {
    YT?: YoutubeIframeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

/** The one in-flight (or settled) load. Module scope, so it survives every remount. */
let iframeApiPromise: Promise<YoutubeIframeApi> | null = null;

/**
 * Resolves with the IFrame API, loading the script on first call only.
 *
 * Rejects rather than hanging when the script fails — an ad blocker or a strict CSP will do
 * that, and a player stuck on a blank div with no error is unreportable. `iframeApiPromise` is
 * cleared on failure so a later mount can retry; a permanently rejected promise would poison
 * every subsequent player on the page.
 */
export function loadYoutubeIframeApi(): Promise<YoutubeIframeApi> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("The YouTube IFrame API is browser-only."));
  }
  // Already up — a second player mounting later must not wait on a callback that has fired.
  if (window.YT?.Player !== undefined) return Promise.resolve(window.YT);
  if (iframeApiPromise !== null) return iframeApiPromise;

  iframeApiPromise = new Promise<YoutubeIframeApi>((resolve, reject) => {
    // Chain rather than replace: another script on the page may legitimately own this hook,
    // and clobbering it would break whatever it belongs to.
    const previousReadyCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReadyCallback?.();
      if (window.YT?.Player === undefined) {
        reject(new Error("The YouTube IFrame API loaded without a Player constructor."));
        return;
      }
      resolve(window.YT);
    };

    const scriptElement = document.createElement("script");
    scriptElement.src = IFRAME_API_SRC;
    scriptElement.async = true;
    scriptElement.addEventListener(
      "error",
      () => {
        // Cleared so a later mount can retry. A permanently rejected promise would poison every
        // subsequent player on the page.
        iframeApiPromise = null;
        reject(new Error("The YouTube IFrame API script failed to load."));
      },
      { once: true },
    );
    document.head.append(scriptElement);
  });

  return iframeApiPromise;
}

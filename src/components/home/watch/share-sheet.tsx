"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import StatPill from "@/components/home/watch/stat-pill";
import type { ShareChannel } from "@/lib/feed/schemas";

/** One real share destination, rendered as a circular icon + label in the sheet body. */
type ShareTarget = {
  /** `video_share_channel` pgEnum label, sent verbatim. `copy_link` has its own control. */
  channel: Exclude<ShareChannel, "copy_link">;
  /** icon base name resolved to its FILL0 SVG variant */
  icon: string;
  label: string;
  buildIntentUrl: (shareUrl: string, videoTitle: string) => string;
};

/**
 * THE FOUR CHANNELS THE BACKEND ALREADY ACCEPTS.
 *
 * `video_share_channel` has carried `x`, `whatsapp`, `linkedin` and `email` since the share
 * route shipped, and until now this sheet sent only `copy_link` — four values wired end to end
 * server-side and rendered by nothing.
 *
 * WHAT USED TO BE HERE: three dead buttons labelled Download, Report and Not Interested, with
 * no handlers. Two of the three had become actively misleading rather than merely inert — this
 * sheet opens from `video-card-menu.tsx`, whose kebab wires a REAL "Not interested" and a REAL
 * Report, so the card was offering both the working control and a fake copy of it. A share
 * sheet shares; feedback and downloads belong to the menu that owns them.
 *
 * Download is not among these and is not coming back here. The bytes are on youtube.com — see
 * the long note in `video-card-menu.tsx` for the conditions under which it becomes real, and
 * it is a menu row when it does, not a share target.
 *
 * NO BRAND MARKS FOR THREE OF THE FOUR. `public/icons` has `mail` but no X, WhatsApp or
 * LinkedIn glyph, so those fall back to the generic `share` icon and are told apart by their
 * labels. Inventing the assets — or hand-writing trademarked logo paths from memory — would be
 * worse than a plain glyph. Dropping real marks in is the obvious polish.
 */
const SHARE_TARGETS: ShareTarget[] = [
  {
    channel: "whatsapp",
    icon: "share",
    label: "WhatsApp",
    // wa.me takes ONE `text` field, so the title and the link are joined into it rather than
    // passed separately. Without a title it is the bare link, never the string "undefined".
    buildIntentUrl: (shareUrl, videoTitle) =>
      `https://wa.me/?text=${encodeURIComponent(videoTitle === "" ? shareUrl : `${videoTitle} ${shareUrl}`)}`,
  },
  {
    channel: "x",
    icon: "share",
    label: "X",
    buildIntentUrl: (shareUrl, videoTitle) =>
      `https://x.com/intent/tweet?url=${encodeURIComponent(shareUrl)}${
        videoTitle === "" ? "" : `&text=${encodeURIComponent(videoTitle)}`
      }`,
  },
  {
    channel: "linkedin",
    icon: "share",
    label: "LinkedIn",
    // LinkedIn takes the URL alone and reads the title off the page's own OG tags; passing a
    // `title` parameter has been ignored for years and pretending otherwise would be cargo.
    buildIntentUrl: (shareUrl) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
  },
  {
    channel: "email",
    icon: "mail",
    label: "Email",
    buildIntentUrl: (shareUrl, videoTitle) =>
      `mailto:?subject=${encodeURIComponent(videoTitle === "" ? "A video on Qatoto" : videoTitle)}&body=${encodeURIComponent(shareUrl)}`,
  },
];

type ShareSheetProps = {
  /** Called when the sheet should close — backdrop click, Escape, or the X. */
  onClose: () => void;
  /**
   * The URL "Copy Link" puts on the clipboard.
   *
   * DEFAULTS TO THE CURRENT PAGE, which is right on the watch screen and WRONG anywhere the
   * sheet is opened for a video the page is not about — a feed card's kebab would otherwise
   * copy the feed's URL. Those callers pass the card's own `/watch?v=…`.
   */
  shareUrl?: string;
  /**
   * The video's title, used as the share text on the targets that take one.
   *
   * OPTIONAL, and its absence must never surface. A missing title means the link travels on
   * its own — it must never become the string "undefined" in somebody's WhatsApp message.
   */
  videoTitle?: string;
  /**
   * Records the share against the video, once the user actually shares.
   *
   * Optional so the sheet still renders on surfaces with no video id. The channel is a
   * `video_share_channel` pgEnum label and must byte-match: `copy_link`, not `copy-link`.
   */
  onShared?: (channel: ShareChannel) => void;
};

/**
 * Share surface for the watch screen and for every feed card's kebab. Renders as a bottom
 * sheet on mobile (slides up from the foot of the screen) and an anchored popover on desktop.
 *
 * EVERY CONTROL IN IT IS WIRED: Copy Link, plus the four `video_share_channel` targets. Each
 * reports its own channel through `onShared`, which is what moves `videoStats.shareCount` —
 * and that count feeds the ranker's engagement rate, so a control that recorded a share
 * nobody made would be inflating a ranking input.
 */
export function ShareSheet({ onClose, shareUrl, videoTitle, onShared }: ShareSheetProps) {
  const [copied, setCopied] = useState(false);
  // Reference to the panel, used to detect outside clicks on desktop where
  // there is no full-screen backdrop to catch them.
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape and lock background scroll while the sheet is open.
  useEffect(() => {
    const handleKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);

    // Desktop has no backdrop; dismiss when the user presses outside the panel.
    const handleClickOutside = (mouseEvent: MouseEvent) => {
      const target = mouseEvent.target;
      if (target instanceof Node && panelRef.current && !panelRef.current.contains(target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  /**
   * Resolved against the origin: callers hand us a relative `/watch?v=…` off the card, and a
   * path is not a link once it leaves this tab — not on a clipboard, and not in a WhatsApp
   * message.
   *
   * BROWSER-ONLY. It reads `window`, so it is called from handlers and from render on a
   * `"use client"` component that never server-renders its body — never at module scope.
   */
  const resolveAbsoluteShareUrl = (): string =>
    shareUrl === undefined ? window.location.href : new URL(shareUrl, window.location.origin).href;

  const handleCopyLink = async () => {
    try {
      const linkToCopy = resolveAbsoluteShareUrl();
      await navigator.clipboard.writeText(linkToCopy);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      // Recorded only AFTER the copy succeeds. A share that never made it to the clipboard is
      // not a share, and `videoStats.shareCount` feeds the ranker's engagement rate — the one
      // place an over-eager count is not a cosmetic problem.
      onShared?.("copy_link");
    } catch {
      // Clipboard can be blocked (insecure context, denied permission); nothing is recorded,
      // so a failed copy is a silent no-op.
    }
  };

  return (
    <>
      {/* Backdrop — mobile only; dims the screen and dismisses on tap. On
          desktop the sheet is an anchored popover with no backdrop, dismissed
          via the outside-click handler above. */}
      <button
        type="button"
        aria-label="Close share"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/40 sm:hidden"
      />

      <div
        ref={panelRef}
        aria-label="Share"
        className="fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] overflow-y-auto rounded-t-2xl bg-background pb-8 shadow-lg sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:bottom-auto sm:mt-2 sm:w-96 sm:max-w-[calc(100vw-1rem)] sm:rounded-2xl sm:border sm:border-black/10 sm:pb-6"
      >
        {/* Drag handle — mobile affordance only. */}
        <div className="flex justify-center pt-3 sm:hidden">
          <span className="h-1.5 w-10 rounded-full bg-black/15" />
        </div>

        <header className="flex flex-row items-center gap-4 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            aria-label="Back"
            className="cursor-pointer rounded-full p-1 transition-colors hover:bg-muted sm:hidden"
          >
            <Image
              src="/icons/arrow_back_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              alt=""
              width={24}
              height={24}
            />
          </button>
          <h2 className="flex-1 text-center text-base font-medium text-secondary-foreground sm:text-left">
            Share
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded-full p-1 transition-colors hover:bg-muted"
          >
            <Image
              src="/icons/close_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              alt=""
              width={24}
              height={24}
            />
          </button>
        </header>

        <div className="border-b-2 border-primary" />

        <div className="flex flex-row justify-between gap-4 px-6 pt-6 pb-12 sm:pb-6">
          {/* Copy Link — the one wired action. */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex cursor-pointer flex-col items-center gap-2"
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-muted">
              <Image
                src="/icons/link_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt=""
                width={24}
                height={24}
              />
            </span>
            <span className="text-center text-xs text-secondary-foreground">
              {copied ? "Copied" : "Copy Link"}
            </span>
          </button>

          {/*
            REAL ANCHORS, NOT `window.open`. An anchor hands off to the target the way the
            browser intends, survives popup blockers that would null out a scripted open, and
            makes `mailto:` work without special-casing — `window.open` on a mailto returns
            null even when the mail client did launch, which would suppress the record below.

            WHEN THE SHARE IS RECORDED, and why this bar is lower than Copy Link's. Copying
            records only after the clipboard write RESOLVES, because that is verifiable and a
            failed copy put nothing anywhere. Handing off to WhatsApp is the observable event
            here: whether the sender then hits send happens in another application and is not
            knowable to us — no platform claims otherwise. So the handoff is the share.
          */}
          {SHARE_TARGETS.map((shareTarget) => (
            <a
              key={shareTarget.channel}
              href={shareTarget.buildIntentUrl(resolveAbsoluteShareUrl(), videoTitle ?? "")}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onShared?.(shareTarget.channel)}
              className="flex cursor-pointer flex-col items-center gap-2"
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-muted">
                <Image
                  src={`/icons/${shareTarget.icon}_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg`}
                  alt=""
                  width={24}
                  height={24}
                />
              </span>
              <span className="text-center text-xs text-secondary-foreground">
                {shareTarget.label}
              </span>
            </a>
          ))}
        </div>
      </div>
    </>
  );
}

/**
 * The "share" stat pill plus the sheet it opens. Kept as a client island so
 * the surrounding `WatchContent` can stay a server component.
 */
export default function ShareButton({ shares }: { shares: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex w-full lg:w-24">
      <StatPill icon="share" label={shares} onClick={() => setOpen(true)} />
      {open && <ShareSheet onClose={() => setOpen(false)} />}
    </span>
  );
}

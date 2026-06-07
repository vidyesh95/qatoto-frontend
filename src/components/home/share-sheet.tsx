"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import StatPill from "@/components/home/stat-pill";

/** A secondary action shown as a circular icon + label in the sheet body. */
type ShareAction = {
  /** icon base name resolved to its FILL0 SVG variant */
  icon: string;
  label: string;
};

const SHARE_ACTIONS: ShareAction[] = [
  { icon: "download", label: "Download" },
  { icon: "report", label: "Report" },
  { icon: "heart_broken", label: "Not Interested" },
];

type ShareSheetProps = {
  /** Called when the sheet should close — backdrop click, Escape, or the X. */
  onClose: () => void;
};

/**
 * Share surface for the watch screen. Renders as a bottom sheet on mobile
 * (slides up from the foot of the screen) and a centered modal dialog on
 * desktop. The actions here are presentational stubs — the only one wired up
 * is "Copy Link", which copies the current page URL to the clipboard.
 */
function ShareSheet({ onClose }: ShareSheetProps) {
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

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked (insecure context, denied permission); the
      // backend owns no state here, so a failed copy is a silent no-op.
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
        className="fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] overflow-y-auto rounded-t-2xl bg-background pb-8 shadow-lg sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 sm:max-w-[calc(100vw-1rem)] sm:rounded-2xl sm:border sm:border-black/10 sm:pb-6"
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
            className="cursor-pointer rounded-full p-1 hover:bg-muted transition-colors sm:hidden"
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
            className="cursor-pointer rounded-full p-1 hover:bg-muted transition-colors"
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

          {SHARE_ACTIONS.map((action) => (
            <button
              key={action.label}
              type="button"
              className="flex cursor-pointer flex-col items-center gap-2"
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-muted">
                <Image
                  src={`/icons/${action.icon}_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg`}
                  alt=""
                  width={24}
                  height={24}
                />
              </span>
              <span className="text-center text-xs text-secondary-foreground">{action.label}</span>
            </button>
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

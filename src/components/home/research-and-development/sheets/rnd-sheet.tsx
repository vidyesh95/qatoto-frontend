// TRANSPORT: props-only — client island. Chrome only: it holds open/closed state and the
// escape/scroll-lock effects, and fetches nothing. The sheets that use it are the ones
// that mutate.
"use client";

import { useCallback, useEffect, type ReactNode } from "react";

import Image from "next/image";

/**
 * The bottom-sheet shell every R&D sheet shares.
 *
 * EXTRACTED BECAUSE FOUR SHEETS HAD IDENTICAL COPIES of the overlay, the escape handler
 * and the body scroll lock — and two of them had subtly different versions of the escape
 * rule, which is exactly how a keyboard trap gets shipped.
 *
 * THE ESCAPE RULE IS LOAD-BEARING. It checks `defaultPrevented` rather than relying on
 * `stopPropagation`: a nested popup (the category combobox) preventDefaults Escape when it
 * consumes it, so one press closes the list and a second closes the sheet. In the App
 * Router the React root container is `document`, so this listener sits on the same node as
 * React's and `stopPropagation` could not reach it anyway.
 */
export default function RndSheet({
  title,
  isOpen,
  onClose,
  children,
}: {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  // Stable identity so the keydown effect below does not re-wire its listener and thrash
  // `document.body.style.overflow` on every render.
  const handleClose = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === "Escape" && !keyEvent.defaultPrevented) handleClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    <>
      <button
        type="button"
        aria-label={`Close ${title.toLowerCase()} sheet`}
        onClick={handleClose}
        className="fixed inset-0 z-55 bg-black/40"
      />

      <div
        aria-label={title}
        className="fixed inset-x-0 bottom-0 z-60 flex max-h-[85dvh] flex-col rounded-t-2xl bg-background shadow-lg sm:inset-0 sm:m-auto sm:h-max sm:max-h-[80dvh] sm:w-md sm:rounded-2xl sm:border sm:border-black/10"
      >
        {/* Drag handle — mobile affordance only. */}
        <div className="flex justify-center pt-3 sm:hidden">
          <span className="h-1.5 w-10 rounded-full bg-black/15" />
        </div>

        <header className="flex shrink-0 items-center gap-2 px-4 py-3">
          <h2 className="flex-1 text-base font-medium">{title}</h2>
          <button
            type="button"
            onClick={handleClose}
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

        <div className="min-h-0 flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
          {children}
        </div>
      </div>
    </>
  );
}

/** The confirmation body a sheet shows after a write lands. */
export function RndSheetConfirmation({
  headline,
  detail,
  onDismiss,
}: {
  headline: string;
  detail: string;
  onDismiss: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-[#00696E]/10 text-2xl text-[#00696E]">
        ✓
      </span>
      <p className="text-base font-medium">{headline}</p>
      <p className="text-sm text-muted-foreground">{detail}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="mt-2 cursor-pointer rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white"
      >
        Done
      </button>
    </div>
  );
}

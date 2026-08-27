// TRANSPORT: props-only — client island. Chrome only: it owns the escape and scroll-lock
// effects and fetches nothing. The sheets that use it are the ones that read or mutate.
"use client";

import { useCallback, useEffect, type ReactNode } from "react";

import Image from "next/image";

/**
 * The bottom-sheet shell every store sheet shares.
 *
 * TWELVE FILES HAD A BYTE-IDENTICAL COPY of the overlay, the panel class string, the drag
 * handle, the header and the escape/scroll-lock effect. They were copies of the naive
 * version; this one takes R&D's refined escape rule instead, for a reason that is about to
 * matter rather than a hypothetical:
 *
 * THE ESCAPE RULE IS LOAD-BEARING. It checks `defaultPrevented` rather than relying on
 * `stopPropagation`, so a nested popup that consumes Escape — `creatable-combobox.tsx`,
 * which the RFQ composer puts INSIDE a sheet — closes its own list on the first press and
 * the sheet on the second. Under the naive version one press does both, and the buyer loses
 * a half-filled form. In the App Router the React root container is `document`, so this
 * listener sits on the same node as React's and `stopPropagation` could not reach it anyway.
 *
 * `onClose` ONLY, with no `isOpen`. Every store sheet is conditionally rendered by its
 * parent — `{isSheetOpen && <XSheet onClose={…} />}` — so an `isOpen` prop would mean
 * twelve call-site changes to move a `return null` from the parent into here, for no
 * behavior. R&D's shell takes `isOpen` because its call sites already did.
 *
 * `footer` is the one addition. Cart, checkout and both composers need an action bar that
 * stays put while the body scrolls, and the existing shell had no slot for it — so each of
 * those would otherwise have hand-rolled an `absolute inset-x-0 bottom-0` overlay and got
 * the safe-area inset subtly wrong, which is what `delivery-sheet.tsx` already did.
 *
 * `isFixedHeight` exists for ONE reason and it is worth stating so nobody adds a second
 * height prop later. A TABBED sheet must not resize when the tab changes: `product-details-
 * sheet.tsx` has five tabs whose panels run from three rows to twenty-eight, and under the
 * default `sm:h-max` the sheet would grow and shrink under the buyer's cursor while they
 * compared two tabs. It therefore takes a fixed `80dvh`. Content-sized is right for every
 * other sheet — a five-line address form should not open at 80% of the viewport.
 *
 * `leadingAction` is for a MULTI-VIEW sheet, where the header needs a way back out of an inner
 * view without closing the whole thing. `address-sheet.tsx` needs it today (list → add/edit
 * form) and the six-step RFQ composer needs it next. It sits before the title because that is
 * where a back affordance is looked for, and it is a slot rather than an `onBack` callback
 * because a composer's back control also has to be able to be disabled on step one.
 */
export default function StoreSheet({
  title,
  onClose,
  children,
  footer,
  isFixedHeight = false,
  leadingAction,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  isFixedHeight?: boolean;
  leadingAction?: ReactNode;
}) {
  // Stable identity so the keydown effect below does not re-wire its listener and thrash
  // `document.body.style.overflow` on every render.
  const handleClose = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
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
  }, [handleClose]);

  return (
    <>
      <button
        type="button"
        aria-label={`Close ${title.toLowerCase()}`}
        onClick={handleClose}
        className="fixed inset-0 z-55 bg-black/40"
      />

      <div
        aria-label={title}
        className={`fixed inset-x-0 bottom-0 z-60 flex flex-col rounded-t-2xl bg-background shadow-lg sm:inset-0 sm:m-auto sm:w-md sm:rounded-2xl sm:border sm:border-black/10 ${
          isFixedHeight
            ? "h-[80dvh] sm:h-[80dvh] sm:max-h-160"
            : "max-h-[85dvh] sm:h-max sm:max-h-[80dvh]"
        }`}
      >
        {/* Drag handle — mobile affordance only. */}
        <div className="flex justify-center pt-3 sm:hidden">
          <span className="h-1.5 w-10 rounded-full bg-black/15" />
        </div>

        <header className="flex shrink-0 items-center gap-2 px-4 py-3">
          {leadingAction}
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

        {footer === undefined ? null : (
          <footer className="shrink-0 border-t border-[#CAC4D0]/60 px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
            {footer}
          </footer>
        )}
      </div>
    </>
  );
}

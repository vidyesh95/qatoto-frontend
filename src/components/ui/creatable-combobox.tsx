"use client";

import { useEffect, useId, useRef, useState } from "react";

import { createPortal } from "react-dom";

import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field-classes";

// Typeahead over a list of names, plus a "create" row for anything new. The
// owner holds the option list and decides whether a committed name is new.
//
// The listbox is portaled to document.body and positioned `fixed` so it can be
// used inside a clipping scroll container (an overflow-y-auto sheet body) as
// well as in open page flow. Mock phase: nothing here is persisted.

// `query` exists only in the open variant, so the input's displayed value is
// derived rather than stored — that is what makes Escape/blur revert for free.
// popupPlacement lives in the same variant so a closed combobox can never carry
// a stale placement.
type CreatableComboboxState =
  | { status: "closed" }
  | {
      status: "open";
      query: string;
      highlightedRowIndex: number;
      popupPlacement: PopupPlacement;
    };

// Both variants carry `optionName`, so committing a row is variant-agnostic.
// The distinction only matters when rendering.
type CreatableComboboxRow =
  | { kind: "existing-option"; optionName: string }
  | { kind: "create-option"; optionName: string };

// Which viewport edge the popup is pinned to. A union rather than a
// `shouldFlipUpward` boolean so `top` and `bottom` can never both be emitted.
type PopupPlacement = {
  leftPx: number;
  widthPx: number;
  maxHeightPx: number;
  verticalAnchor: { edge: "top"; offsetPx: number } | { edge: "bottom"; offsetPx: number };
};

export type CreatableComboboxProps = {
  /** Visible field label; also names the listbox via aria-labelledby. */
  labelText: string;
  /** Shown while nothing is committed. */
  placeholderText: string;
  /** The committed value. "" renders the placeholder — the empty state. */
  selectedOptionName: string;
  /** Every option offered, including any created earlier this session. */
  optionNames: string[];
  /** Fires identically for an existing pick and a newly typed name; the owner
   *  decides whether the name is new and appends it to optionNames. */
  onOptionCommit: (committedOptionName: string) => void;
  /** Hint under the field. Omit to render no hint element at all. */
  helpText?: string;
};

const POPUP_MAX_HEIGHT_PX = 256;
const POPUP_MIN_HEIGHT_PX = 96; // ~3 rows; below this, flipping is worth it
const POPUP_ANCHOR_GAP_PX = 4;
const POPUP_VIEWPORT_MARGIN_PX = 8;

/** Appends a committed name unless the list already has it (case-insensitive).
 *  Every CreatableCombobox owner needs exactly this, so it ships with the
 *  component rather than being re-derived at each call site. */
export function appendOptionNameIfNew(
  optionNames: string[],
  committedOptionName: string,
): string[] {
  return optionNames.some(
    (existingOptionName) => existingOptionName.toLowerCase() === committedOptionName.toLowerCase(),
  )
    ? optionNames
    : [...optionNames, committedOptionName];
}

// Geometry is viewport-relative on purpose: the listbox is portaled to
// document.body and positioned `fixed`, and getBoundingClientRect() already
// returns viewport coordinates. That pairing is why no scroll offset is added
// anywhere in this file.
function buildPopupPlacement(anchorRect: DOMRect): PopupPlacement {
  const spaceBelowPx =
    window.innerHeight - anchorRect.bottom - POPUP_ANCHOR_GAP_PX - POPUP_VIEWPORT_MARGIN_PX;
  const spaceAbovePx = anchorRect.top - POPUP_ANCHOR_GAP_PX - POPUP_VIEWPORT_MARGIN_PX;

  // Flip only when downward cannot show a usable list AND upward is strictly
  // roomier. Anchoring the decision to a fixed minimum rather than to the
  // measured content height keeps it from oscillating as rows are filtered out
  // mid-type, and means placement is decided before the popup ever renders.
  const shouldFlipUpward = spaceBelowPx < POPUP_MIN_HEIGHT_PX && spaceAbovePx > spaceBelowPx;
  const availableHeightPx = shouldFlipUpward ? spaceAbovePx : spaceBelowPx;

  return {
    leftPx: anchorRect.left,
    // Matched to the input's border-box width, so the popup tracks the field
    // through every breakpoint without duplicating any width class.
    widthPx: anchorRect.width,
    // Clamped to the space actually available, so a popup in a short sheet
    // shrinks and scrolls internally rather than bleeding past its host.
    maxHeightPx: Math.max(POPUP_MIN_HEIGHT_PX, Math.min(POPUP_MAX_HEIGHT_PX, availableHeightPx)),
    verticalAnchor: shouldFlipUpward
      ? { edge: "bottom", offsetPx: window.innerHeight - anchorRect.top + POPUP_ANCHOR_GAP_PX }
      : { edge: "top", offsetPx: anchorRect.bottom + POPUP_ANCHOR_GAP_PX },
  };
}

function buildPopupStyle(popupPlacement: PopupPlacement): React.CSSProperties {
  const { leftPx, widthPx, maxHeightPx, verticalAnchor } = popupPlacement;
  const sharedStyle = { left: leftPx, width: widthPx, maxHeight: maxHeightPx };
  switch (verticalAnchor.edge) {
    case "top":
      return { ...sharedStyle, top: verticalAnchor.offsetPx };
    case "bottom":
      return { ...sharedStyle, bottom: verticalAnchor.offsetPx };
    default: {
      const exhaustiveCheck: never = verticalAnchor;
      return exhaustiveCheck;
    }
  }
}

function resolveInputDisplayValue(
  comboboxState: CreatableComboboxState,
  selectedOptionName: string,
): string {
  switch (comboboxState.status) {
    case "closed":
      return selectedOptionName;
    case "open":
      return comboboxState.query;
    default: {
      const exhaustiveCheck: never = comboboxState;
      return exhaustiveCheck;
    }
  }
}

/** Prefix matches first, then substring matches; source order kept within each bucket. */
function rankOptionMatches(optionNames: string[], rawQuery: string): string[] {
  const normalizedQuery = rawQuery.trim().toLowerCase();
  if (normalizedQuery === "") return optionNames;

  const prefixMatches: string[] = [];
  const substringMatches: string[] = [];
  for (const optionName of optionNames) {
    const normalizedOption = optionName.toLowerCase();
    if (normalizedOption.startsWith(normalizedQuery)) {
      prefixMatches.push(optionName);
    } else if (normalizedOption.includes(normalizedQuery)) {
      substringMatches.push(optionName);
    }
  }
  return [...prefixMatches, ...substringMatches];
}

function buildComboboxRows(optionNames: string[], rawQuery: string): CreatableComboboxRow[] {
  const existingOptionRows: CreatableComboboxRow[] = rankOptionMatches(optionNames, rawQuery).map(
    (optionName) => ({ kind: "existing-option", optionName }),
  );

  const trimmedQuery = rawQuery.trim();
  const hasExactOptionMatch = optionNames.some(
    (optionName) => optionName.toLowerCase() === trimmedQuery.toLowerCase(),
  );
  if (trimmedQuery === "" || hasExactOptionMatch) return existingOptionRows;

  return [...existingOptionRows, { kind: "create-option", optionName: trimmedQuery }];
}

function renderComboboxRowContent(comboboxRow: CreatableComboboxRow, isRowSelectedOption: boolean) {
  switch (comboboxRow.kind) {
    case "existing-option":
      return (
        <>
          <span aria-hidden="true" className="w-3 shrink-0 text-[#00696E]">
            {isRowSelectedOption ? "✓" : ""}
          </span>
          <span>
            {comboboxRow.optionName}
            {isRowSelectedOption && <span className="sr-only"> (current selection)</span>}
          </span>
        </>
      );
    case "create-option":
      return (
        <>
          <span aria-hidden="true" className="w-3 shrink-0 text-[#00696E]">
            +
          </span>
          <span className="text-muted-foreground">
            Create <span className="font-medium text-foreground">{comboboxRow.optionName}</span>
          </span>
        </>
      );
    default: {
      const exhaustiveCheck: never = comboboxRow;
      return exhaustiveCheck;
    }
  }
}

export default function CreatableCombobox({
  labelText,
  placeholderText,
  selectedOptionName,
  optionNames,
  onOptionCommit,
  helpText,
}: CreatableComboboxProps) {
  const [comboboxState, setComboboxState] = useState<CreatableComboboxState>({ status: "closed" });
  const inputElementRef = useRef<HTMLInputElement | null>(null);
  const rowElementRefs = useRef<(HTMLLIElement | null)[]>([]);

  const instanceId = useId();
  const comboboxLabelId = `${instanceId}-label`;
  const comboboxInputId = `${instanceId}-input`;
  const comboboxListboxId = `${instanceId}-listbox`;

  const comboboxRows =
    comboboxState.status === "open" ? buildComboboxRows(optionNames, comboboxState.query) : [];

  // Narrowed out of comboboxState so the scroll-into-view effect below does not
  // re-fire on every placement update — which would fight the user's own
  // scrolling, since repositioning is itself scroll-driven.
  const highlightedRowIndex =
    comboboxState.status === "open" ? comboboxState.highlightedRowIndex : -1;
  const openQuery = comboboxState.status === "open" ? comboboxState.query : null;

  useEffect(() => {
    if (highlightedRowIndex < 0) return;
    rowElementRefs.current[highlightedRowIndex]?.scrollIntoView({ block: "nearest" });
    // openQuery stays in the deps so re-typing scrolls the new row 0 into view
    // even when the index itself did not change.
  }, [highlightedRowIndex, openQuery]);

  useEffect(() => {
    if (comboboxState.status !== "open") return undefined;
    const inputElement = inputElementRef.current;
    if (!inputElement) return undefined;

    const repositionOrCloseOptionList = () => {
      const anchorRect = inputElement.getBoundingClientRect();

      // The anchor has been scrolled out of the viewport entirely. A popup
      // floating over unrelated chrome with no visible field under it reads as
      // a rendering bug, so close rather than track.
      if (anchorRect.bottom < 0 || anchorRect.top > window.innerHeight) {
        setComboboxState({ status: "closed" });
        return;
      }

      const nextPopupPlacement = buildPopupPlacement(anchorRect);
      setComboboxState((previousState) =>
        previousState.status === "open"
          ? { ...previousState, popupPlacement: nextPopupPlacement }
          : previousState,
      );
    };

    // Correct the placement measured synchronously in openOptionList. Focusing
    // the input can make the browser scroll it into view, and that scroll lands
    // before this effect registers its listener — so without this the popup
    // would open overlapping the field and never self-correct.
    repositionOrCloseOptionList();

    // Capture phase: `scroll` does not bubble, but it captures. One listener on
    // window therefore catches every scrollable ancestor, including a clipping
    // container this component has no reference to. A bubble-phase window
    // listener would receive nothing at all inside a sheet that pins body
    // overflow, because window itself never scrolls there.
    window.addEventListener("scroll", repositionOrCloseOptionList, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", repositionOrCloseOptionList, { passive: true });
    // Catches the field moving with no scroll at all: a textarea autosizing, a
    // web font swapping in, the mobile URL bar collapsing.
    const anchorResizeObserver = new ResizeObserver(repositionOrCloseOptionList);
    anchorResizeObserver.observe(inputElement);

    return () => {
      // `capture` must match on removal or the listener leaks.
      window.removeEventListener("scroll", repositionOrCloseOptionList, { capture: true });
      window.removeEventListener("resize", repositionOrCloseOptionList);
      anchorResizeObserver.disconnect();
    };
    // Deps are the status only. Depending on the whole state object would tear
    // down and re-wire three listeners on every keystroke, and — since
    // repositioning sets state — re-enter this effect on every scroll frame.
  }, [comboboxState.status]);

  /** closed → open. Measures synchronously inside the event handler, so the
   *  first painted frame is already positioned — no layout effect, no flash. */
  const openOptionList = (nextQuery: string, nextHighlightedRowIndex: number) => {
    const inputElement = inputElementRef.current;
    if (!inputElement) return;
    setComboboxState({
      status: "open",
      query: nextQuery,
      highlightedRowIndex: nextHighlightedRowIndex,
      popupPlacement: buildPopupPlacement(inputElement.getBoundingClientRect()),
    });
  };

  /** open → open. Deliberately does NOT re-measure: this fires on every
   *  keystroke and every onMouseMove over a row, and getBoundingClientRect()
   *  forces a layout flush. The field cannot move as a result of those events;
   *  scroll, resize and the ResizeObserver cover everything that can move it. */
  const updateOpenOptionList = (nextQuery: string, nextHighlightedRowIndex: number) => {
    setComboboxState((previousState) =>
      previousState.status === "open"
        ? { ...previousState, query: nextQuery, highlightedRowIndex: nextHighlightedRowIndex }
        : previousState,
    );
  };

  const closeOptionList = () => {
    setComboboxState({ status: "closed" });
  };

  const commitOptionRow = (comboboxRow: CreatableComboboxRow) => {
    // The owner appends the name to the option list only if it is new
    // (case-insensitive), so both row kinds commit the same way.
    onOptionCommit(comboboxRow.optionName);
    closeOptionList();
  };

  const handleComboboxInputChange = (changeEvent: React.ChangeEvent<HTMLInputElement>) => {
    // Every keystroke re-ranks the rows, so the highlight restarts at the top.
    // This is what keeps highlightedRowIndex in bounds by construction — while
    // the list is open the row set can only change through this handler. That
    // invariant breaks if committing is ever changed to leave the list open.
    if (comboboxState.status === "closed") {
      openOptionList(changeEvent.target.value, 0);
      return;
    }
    updateOpenOptionList(changeEvent.target.value, 0);
  };

  const handleComboboxInputClick = () => {
    // Opening on click rather than focus, so tabbing through a form does not
    // pop the list open and blank the committed value on every pass.
    if (comboboxState.status === "closed") openOptionList("", 0);
  };

  const handleComboboxInputBlur = () => {
    // The listbox cancels its own mousedown, so focus never leaves the input on
    // an in-popup click — a real blur therefore always means "close and revert".
    // No document-level click-outside listener needed.
    closeOptionList();
  };

  const handleComboboxInputKeyDown = (keyDownEvent: React.KeyboardEvent<HTMLInputElement>) => {
    switch (keyDownEvent.key) {
      case "ArrowDown": {
        keyDownEvent.preventDefault();
        if (comboboxState.status === "closed") return openOptionList("", 0);
        if (comboboxRows.length === 0) return;
        return updateOpenOptionList(
          comboboxState.query,
          (comboboxState.highlightedRowIndex + 1) % comboboxRows.length,
        );
      }
      case "ArrowUp": {
        keyDownEvent.preventDefault();
        if (comboboxState.status === "closed") {
          // Opening with an empty query means buildComboboxRows returns exactly
          // optionNames with no create row appended, so the last option is the
          // last row. That coupling is why this indexes optionNames.
          return openOptionList("", Math.max(0, optionNames.length - 1));
        }
        if (comboboxRows.length === 0) return;
        return updateOpenOptionList(
          comboboxState.query,
          (comboboxState.highlightedRowIndex - 1 + comboboxRows.length) % comboboxRows.length,
        );
      }
      case "Enter": {
        if (comboboxState.status === "closed") return;
        keyDownEvent.preventDefault();
        const highlightedRow = comboboxRows[comboboxState.highlightedRowIndex];
        if (highlightedRow) commitOptionRow(highlightedRow);
        return;
      }
      case "Escape": {
        if (comboboxState.status === "open") {
          // Mark the key consumed so an outer Escape-to-close (a sheet, a modal)
          // can skip it: first press closes the popup, second closes the host.
          // preventDefault rather than stopPropagation alone, because in the App
          // Router the React root container is `document` — so a host listener
          // on document sits on the same node and stopPropagation cannot reach it.
          keyDownEvent.preventDefault();
          keyDownEvent.stopPropagation();
        }
        return closeOptionList();
      }
      case "Tab":
        // Never preventDefault Tab — focus must move on. Reverts for free: the
        // committed value was never touched and the query dies with the variant.
        return closeOptionList();
      default:
        return;
    }
  };

  return (
    // The label is a sibling rather than a wrapper — a wrapping <label> would
    // forward listbox row clicks to the input.
    <div className="flex flex-col gap-1">
      <label htmlFor={comboboxInputId} id={comboboxLabelId} className={LABEL_CLASS}>
        {labelText}
      </label>

      {/* `relative` is for the chevron only — the listbox is portaled out of
          this subtree and positions itself against the viewport. */}
      <div className="relative">
        <input
          id={comboboxInputId}
          ref={inputElementRef}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-expanded={comboboxState.status === "open"}
          aria-autocomplete="list"
          aria-controls={comboboxState.status === "open" ? comboboxListboxId : undefined}
          aria-activedescendant={
            comboboxState.status === "open"
              ? `${comboboxListboxId}-row-${comboboxState.highlightedRowIndex}`
              : undefined
          }
          value={resolveInputDisplayValue(comboboxState, selectedOptionName)}
          onChange={handleComboboxInputChange}
          onClick={handleComboboxInputClick}
          onBlur={handleComboboxInputBlur}
          onKeyDown={handleComboboxInputKeyDown}
          placeholder={placeholderText}
          className={`${INPUT_CLASS} pr-8`}
        />
        {/* Inline SVG rather than a ▾ glyph — the glyph renders hairline-thin and
            undersized, and there is no down-chevron in public/icons. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#6F7979]"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </div>

      {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}

      {comboboxState.status === "open" &&
        createPortal(
          <ul
            id={comboboxListboxId}
            // eslint-disable-next-line jsx-a11y/no-noninteractive-element-to-interactive-role, jsx-a11y/prefer-tag-over-role -- ul+li carrying listbox/option is the WAI-ARIA combobox pattern; <select>/<datalist> cannot offer a "create new" row
            role="listbox"
            aria-labelledby={comboboxLabelId}
            onMouseDown={(mouseDownEvent) => {
              // Keep focus on the input so onBlur never fires mid-click and
              // unmounts the row before its onClick lands. preventDefault
              // cancels the mousedown's default action (focus transfer), which
              // is not scoped to DOM ancestry — so this still works across the
              // portal boundary.
              mouseDownEvent.preventDefault();
            }}
            style={buildPopupStyle(comboboxState.popupPlacement)}
            className="fixed z-100 overflow-y-auto rounded-lg border border-[#6F7979] bg-popover py-1 text-popover-foreground shadow-lg"
          >
            {comboboxRows.map((comboboxRow, rowIndex) => {
              const isRowHighlighted = rowIndex === comboboxState.highlightedRowIndex;
              const isRowSelectedOption =
                comboboxRow.kind === "existing-option" &&
                comboboxRow.optionName === selectedOptionName;
              return (
                // eslint-disable-next-line jsx-a11y/click-events-have-key-events -- rows are intentionally non-focusable; keyboard selection lives on the input via aria-activedescendant
                <li
                  key={`${comboboxRow.kind}-${comboboxRow.optionName}`}
                  id={`${comboboxListboxId}-row-${rowIndex}`}
                  // eslint-disable-next-line jsx-a11y/no-noninteractive-element-to-interactive-role, jsx-a11y/prefer-tag-over-role -- <option> is only valid inside select/datalist; see the listbox note above
                  role="option"
                  aria-selected={isRowHighlighted}
                  ref={(rowElement) => {
                    rowElementRefs.current[rowIndex] = rowElement;
                    return () => {
                      rowElementRefs.current[rowIndex] = null;
                    };
                  }}
                  onMouseMove={() => {
                    // mousemove, not mouseenter — arrow-key scrolling drags rows
                    // under a stationary cursor and would yank the highlight back.
                    if (!isRowHighlighted) updateOpenOptionList(comboboxState.query, rowIndex);
                  }}
                  onClick={() => commitOptionRow(comboboxRow)}
                  className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm ${
                    isRowHighlighted ? "bg-[#00696E]/10 text-[#00696E]" : ""
                  } ${comboboxRow.kind === "create-option" ? "border-t border-border/50" : ""}`}
                >
                  {renderComboboxRowContent(comboboxRow, isRowSelectedOption)}
                </li>
              );
            })}
          </ul>,
          document.body,
        )}
    </div>
  );
}

"use client";

import { useEffect, useId, useRef, useState } from "react";

import { createPortal } from "react-dom";

import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field-classes";

// Typeahead over a list of options, plus a "create" row for anything new. The
// owner holds the option list and decides what creating actually means.
//
// OPTIONS ARE ID-KEYED, NOT NAME-KEYED. Two options may legitimately share a
// name — research branches have no unique index on `title` — so committing a
// name would silently resolve to whichever one happened to be first. Owners
// whose identity IS the name (the idea wizard's categories) pass the name as
// the id and lose nothing.
//
// SELECT AND CREATE ARE SEPARATE CALLBACKS, because they are not the same act.
// Selecting is instant; creating may need more input than a name (a summary, a
// parent) or a round trip. `onCreateRequest` therefore only reports what the
// user typed — the owner decides whether that opens a form, fires a request, or
// appends to a local array. Omitting it renders no create row at all, which is
// how a caller without permission to create hides the affordance.
//
// The listbox is portaled to document.body and positioned `fixed` so it can be
// used inside a clipping scroll container (an overflow-y-auto sheet body) as
// well as in open page flow.

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

/** One selectable option. `optionId` is what the owner stores; `optionName` is
 *  what is typed against and displayed. */
export type ComboboxOption = {
  optionId: string;
  optionName: string;
  /** A short annotation shown as a tag after the name — "Awaiting review" on a
   *  taxonomy row a moderator has not settled yet, say. Purely informational:
   *  a noted row is selected like any other. Listing such a row rather than
   *  hiding it is also what stops the user typing the same name again and
   *  minting a duplicate. */
  optionNote?: string;
};

// The two variants no longer commit the same way — an existing row carries an
// id to select, a create row carries only the raw text the user typed, because
// nothing has been created yet. That asymmetry is the point of the union.
type CreatableComboboxRow =
  | { kind: "existing-option"; option: ComboboxOption }
  | { kind: "create-option"; typedOptionName: string };

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
  /** The committed option's id. An id matching no option renders the
   *  placeholder — which is also how "" behaves unless the owner offers an
   *  option with that id (the sentinel trick: `{ optionId: "", optionName:
   *  "Programme-wide" }` turns the empty state into a named, pickable row). */
  selectedOptionId: string;
  /** Every option offered, including any created earlier this session. */
  options: ComboboxOption[];
  /** An existing row was picked. */
  onOptionSelect: (selectedOptionId: string) => void;
  /** The user asked to create what they typed. NOTHING HAS BEEN CREATED YET —
   *  the owner decides what happens next and, if it succeeds, adds the option
   *  and selects it. Omit to render no create row. */
  onCreateRequest?: (typedOptionName: string) => void;
  /** Hint under the field. Omit to render no hint element at all. */
  helpText?: string;
};

const POPUP_MAX_HEIGHT_PX = 256;
const POPUP_MIN_HEIGHT_PX = 96; // ~3 rows; below this, flipping is worth it
const POPUP_ANCHOR_GAP_PX = 4;
const POPUP_VIEWPORT_MARGIN_PX = 8;

/** Appends a committed name unless the list already has it (case-insensitive).
 *  For owners whose option identity IS the name — a free-text taxonomy with no
 *  server-side row behind it — creating is just this append. Owners backed by a
 *  real record do NOT use this: their id comes from the server. */
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
  options: ComboboxOption[],
  selectedOptionId: string,
): string {
  switch (comboboxState.status) {
    case "closed":
      // Derived from the id rather than stored, so a rename upstream shows up
      // here without the owner having to re-commit anything.
      return options.find((option) => option.optionId === selectedOptionId)?.optionName ?? "";
    case "open":
      return comboboxState.query;
    default: {
      const exhaustiveCheck: never = comboboxState;
      return exhaustiveCheck;
    }
  }
}

/** Prefix matches first, then substring matches; source order kept within each bucket. */
function rankOptionMatches(options: ComboboxOption[], rawQuery: string): ComboboxOption[] {
  const normalizedQuery = rawQuery.trim().toLowerCase();
  if (normalizedQuery === "") return options;

  const prefixMatches: ComboboxOption[] = [];
  const substringMatches: ComboboxOption[] = [];
  for (const option of options) {
    const normalizedOptionName = option.optionName.toLowerCase();
    if (normalizedOptionName.startsWith(normalizedQuery)) {
      prefixMatches.push(option);
    } else if (normalizedOptionName.includes(normalizedQuery)) {
      substringMatches.push(option);
    }
  }
  return [...prefixMatches, ...substringMatches];
}

function buildComboboxRows(
  options: ComboboxOption[],
  rawQuery: string,
  isCreateOffered: boolean,
): CreatableComboboxRow[] {
  const existingOptionRows: CreatableComboboxRow[] = rankOptionMatches(options, rawQuery).map(
    (option) => ({ kind: "existing-option", option }),
  );

  const trimmedQuery = rawQuery.trim();
  const hasExactOptionMatch = options.some(
    (option) => option.optionName.toLowerCase() === trimmedQuery.toLowerCase(),
  );
  if (!isCreateOffered || trimmedQuery === "" || hasExactOptionMatch) return existingOptionRows;

  return [...existingOptionRows, { kind: "create-option", typedOptionName: trimmedQuery }];
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
            {comboboxRow.option.optionName}
            {isRowSelectedOption && <span className="sr-only"> (current selection)</span>}
          </span>
          {comboboxRow.option.optionNote !== undefined && (
            // Not sr-only and not a title attribute: the note qualifies the option
            // the user is about to pick, so it has to be visible beside it.
            <span className="ml-auto shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
              {comboboxRow.option.optionNote}
            </span>
          )}
        </>
      );
    case "create-option":
      return (
        <>
          <span aria-hidden="true" className="w-3 shrink-0 text-[#00696E]">
            +
          </span>
          <span className="text-muted-foreground">
            Create{" "}
            <span className="font-medium text-foreground">{comboboxRow.typedOptionName}</span>
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
  selectedOptionId,
  options,
  onOptionSelect,
  onCreateRequest,
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
    comboboxState.status === "open"
      ? buildComboboxRows(options, comboboxState.query, onCreateRequest !== undefined)
      : [];

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
    // The list closes either way: a create row hands off to the owner, which may
    // open a form under this field, and leaving a popup over it would cover it.
    closeOptionList();
    switch (comboboxRow.kind) {
      case "existing-option":
        return onOptionSelect(comboboxRow.option.optionId);
      case "create-option":
        // Only reachable when onCreateRequest is defined — buildComboboxRows
        // does not emit this row otherwise.
        return onCreateRequest?.(comboboxRow.typedOptionName);
      default: {
        const exhaustiveCheck: never = comboboxRow;
        return exhaustiveCheck;
      }
    }
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
          // `options` with no create row appended, so the last option is the
          // last row. That coupling is why this indexes `options`.
          return openOptionList("", Math.max(0, options.length - 1));
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
          value={resolveInputDisplayValue(comboboxState, options, selectedOptionId)}
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
                comboboxRow.option.optionId === selectedOptionId;
              return (
                // eslint-disable-next-line jsx-a11y/click-events-have-key-events -- rows are intentionally non-focusable; keyboard selection lives on the input via aria-activedescendant
                <li
                  // Keyed by id, not name: duplicate names are legal upstream and
                  // would otherwise collide into one React key.
                  key={
                    comboboxRow.kind === "existing-option"
                      ? `existing-${comboboxRow.option.optionId}`
                      : "create-option"
                  }
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

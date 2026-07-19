"use client";

import { useEffect, useId, useRef, useState } from "react";

import {
  INPUT_CLASS,
  LABEL_CLASS,
} from "@/components/home/research-and-development/wizard/wizard-shared";

// Creatable category picker for the post-idea wizard (step 1). Typeahead over
// the known categories plus a "create" row for anything new. Mock phase: the
// option list lives in the wizard page's state; nothing is persisted.

// `query` exists only in the open variant, so the input's displayed value is
// derived rather than stored — that is what makes Escape/blur revert for free.
type CategoryComboboxState =
  | { status: "closed" }
  | { status: "open"; query: string; highlightedOptionIndex: number };

// Both variants carry `categoryName`, so committing a row is variant-agnostic.
// The distinction only matters when rendering.
type CategoryComboboxRow =
  | { kind: "existing-category"; categoryName: string }
  | { kind: "create-category"; categoryName: string };

type CategoryComboboxProps = {
  selectedCategory: string;
  categoryOptions: string[];
  onCategoryCommit: (committedCategoryName: string) => void;
};

const CATEGORY_PLACEHOLDER = "Search or create a category";

function resolveInputDisplayValue(
  comboboxState: CategoryComboboxState,
  selectedCategory: string,
): string {
  switch (comboboxState.status) {
    case "closed":
      return selectedCategory;
    case "open":
      return comboboxState.query;
    default: {
      const exhaustiveCheck: never = comboboxState;
      return exhaustiveCheck;
    }
  }
}

/** Prefix matches first, then substring matches; source order kept within each bucket. */
function rankCategoryMatches(categoryOptions: string[], rawQuery: string): string[] {
  const normalizedQuery = rawQuery.trim().toLowerCase();
  if (normalizedQuery === "") return categoryOptions;

  const prefixMatches: string[] = [];
  const substringMatches: string[] = [];
  for (const categoryOption of categoryOptions) {
    const normalizedOption = categoryOption.toLowerCase();
    if (normalizedOption.startsWith(normalizedQuery)) {
      prefixMatches.push(categoryOption);
    } else if (normalizedOption.includes(normalizedQuery)) {
      substringMatches.push(categoryOption);
    }
  }
  return [...prefixMatches, ...substringMatches];
}

function buildCategoryComboboxRows(
  categoryOptions: string[],
  rawQuery: string,
): CategoryComboboxRow[] {
  const existingCategoryRows: CategoryComboboxRow[] = rankCategoryMatches(
    categoryOptions,
    rawQuery,
  ).map((categoryName) => ({ kind: "existing-category", categoryName }));

  const trimmedQuery = rawQuery.trim();
  const hasExactCategoryMatch = categoryOptions.some(
    (categoryOption) => categoryOption.toLowerCase() === trimmedQuery.toLowerCase(),
  );
  if (trimmedQuery === "" || hasExactCategoryMatch) return existingCategoryRows;

  return [...existingCategoryRows, { kind: "create-category", categoryName: trimmedQuery }];
}

function renderCategoryRowContent(
  comboboxRow: CategoryComboboxRow,
  isRowCommittedCategory: boolean,
) {
  switch (comboboxRow.kind) {
    case "existing-category":
      return (
        <>
          <span aria-hidden="true" className="w-3 shrink-0 text-[#00696E]">
            {isRowCommittedCategory ? "✓" : ""}
          </span>
          <span>
            {comboboxRow.categoryName}
            {isRowCommittedCategory && <span className="sr-only"> (current category)</span>}
          </span>
        </>
      );
    case "create-category":
      return (
        <>
          <span aria-hidden="true" className="w-3 shrink-0 text-[#00696E]">
            +
          </span>
          <span className="text-muted-foreground">
            Create <span className="font-medium text-foreground">{comboboxRow.categoryName}</span>
          </span>
        </>
      );
    default: {
      const exhaustiveCheck: never = comboboxRow;
      return exhaustiveCheck;
    }
  }
}

export default function CategoryCombobox({
  selectedCategory,
  categoryOptions,
  onCategoryCommit,
}: CategoryComboboxProps) {
  const [comboboxState, setComboboxState] = useState<CategoryComboboxState>({ status: "closed" });
  const rowElementRefs = useRef<(HTMLLIElement | null)[]>([]);

  const instanceId = useId();
  const categoryLabelId = `${instanceId}-category-label`;
  const categoryInputId = `${instanceId}-category-input`;
  const categoryListboxId = `${instanceId}-category-listbox`;

  const comboboxRows =
    comboboxState.status === "open"
      ? buildCategoryComboboxRows(categoryOptions, comboboxState.query)
      : [];

  useEffect(() => {
    if (comboboxState.status !== "open") return;
    rowElementRefs.current[comboboxState.highlightedOptionIndex]?.scrollIntoView({
      block: "nearest",
    });
  }, [comboboxState]);

  const openCategoryList = (nextQuery: string, nextHighlightedOptionIndex: number) => {
    setComboboxState({
      status: "open",
      query: nextQuery,
      highlightedOptionIndex: nextHighlightedOptionIndex,
    });
  };

  const closeCategoryList = () => {
    setComboboxState({ status: "closed" });
  };

  const commitCategoryRow = (comboboxRow: CategoryComboboxRow) => {
    // The parent appends the name to the option list only if it is new
    // (case-insensitive), so both row kinds commit the same way.
    onCategoryCommit(comboboxRow.categoryName);
    closeCategoryList();
  };

  const handleCategoryInputChange = (changeEvent: React.ChangeEvent<HTMLInputElement>) => {
    // Every keystroke re-ranks the rows, so the highlight restarts at the top.
    // This is what keeps highlightedOptionIndex in bounds by construction — while
    // the list is open the row set can only change through this handler. That
    // invariant breaks if committing is ever changed to leave the list open.
    openCategoryList(changeEvent.target.value, 0);
  };

  const handleCategoryInputClick = () => {
    // Opening on click rather than focus, so tabbing through the form does not
    // pop the list open and blank the committed value on every pass.
    if (comboboxState.status === "closed") openCategoryList("", 0);
  };

  const handleCategoryInputBlur = () => {
    // The listbox cancels its own mousedown, so focus never leaves the input on
    // an in-popup click — a real blur therefore always means "close and revert".
    // No document-level click-outside listener needed.
    closeCategoryList();
  };

  const handleCategoryInputKeyDown = (keyDownEvent: React.KeyboardEvent<HTMLInputElement>) => {
    switch (keyDownEvent.key) {
      case "ArrowDown": {
        keyDownEvent.preventDefault();
        if (comboboxState.status === "closed") return openCategoryList("", 0);
        if (comboboxRows.length === 0) return;
        return openCategoryList(
          comboboxState.query,
          (comboboxState.highlightedOptionIndex + 1) % comboboxRows.length,
        );
      }
      case "ArrowUp": {
        keyDownEvent.preventDefault();
        if (comboboxState.status === "closed") {
          return openCategoryList("", Math.max(0, categoryOptions.length - 1));
        }
        if (comboboxRows.length === 0) return;
        return openCategoryList(
          comboboxState.query,
          (comboboxState.highlightedOptionIndex - 1 + comboboxRows.length) % comboboxRows.length,
        );
      }
      case "Enter": {
        if (comboboxState.status === "closed") return;
        keyDownEvent.preventDefault();
        const highlightedRow = comboboxRows[comboboxState.highlightedOptionIndex];
        if (highlightedRow) commitCategoryRow(highlightedRow);
        return;
      }
      case "Escape":
      case "Tab":
        // Both revert for free: draft.category was never touched, and the typed
        // query dies with the "open" variant.
        return closeCategoryList();
      default:
        return;
    }
  };

  return (
    // Unlike the other fields in this step, the label is a sibling rather than a
    // wrapper — a wrapping <label> would forward row clicks to the input.
    <div className="flex flex-col gap-1">
      <label htmlFor={categoryInputId} id={categoryLabelId} className={LABEL_CLASS}>
        Category
      </label>

      <div className="relative">
        <input
          id={categoryInputId}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-expanded={comboboxState.status === "open"}
          aria-autocomplete="list"
          aria-controls={comboboxState.status === "open" ? categoryListboxId : undefined}
          aria-activedescendant={
            comboboxState.status === "open"
              ? `${categoryListboxId}-row-${comboboxState.highlightedOptionIndex}`
              : undefined
          }
          value={resolveInputDisplayValue(comboboxState, selectedCategory)}
          onChange={handleCategoryInputChange}
          onClick={handleCategoryInputClick}
          onBlur={handleCategoryInputBlur}
          onKeyDown={handleCategoryInputKeyDown}
          placeholder={CATEGORY_PLACEHOLDER}
          className={`${INPUT_CLASS} pr-8`}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-[#6F7979]"
        >
          ▾
        </span>

        {comboboxState.status === "open" && (
          <ul
            id={categoryListboxId}
            // eslint-disable-next-line jsx-a11y/no-noninteractive-element-to-interactive-role, jsx-a11y/prefer-tag-over-role -- ul+li carrying listbox/option is the WAI-ARIA combobox pattern; <select>/<datalist> cannot offer a "create new" row
            role="listbox"
            aria-labelledby={categoryLabelId}
            onMouseDown={(mouseDownEvent) => {
              // Keep focus on the input so onBlur never fires mid-click and
              // unmounts the row before its onClick lands.
              mouseDownEvent.preventDefault();
            }}
            className="absolute top-full right-0 left-0 z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-[#6F7979] bg-popover py-1 text-popover-foreground shadow-lg"
          >
            {comboboxRows.map((comboboxRow, rowIndex) => {
              const isRowHighlighted = rowIndex === comboboxState.highlightedOptionIndex;
              const isRowCommittedCategory =
                comboboxRow.kind === "existing-category" &&
                comboboxRow.categoryName === selectedCategory;
              return (
                // eslint-disable-next-line jsx-a11y/click-events-have-key-events -- rows are intentionally non-focusable; keyboard selection lives on the input via aria-activedescendant
                <li
                  key={`${comboboxRow.kind}-${comboboxRow.categoryName}`}
                  id={`${categoryListboxId}-row-${rowIndex}`}
                  // eslint-disable-next-line jsx-a11y/no-noninteractive-element-to-interactive-role, jsx-a11y/prefer-tag-over-role -- <option> is only valid inside select/datalist; see the listbox note above
                  role="option"
                  aria-selected={isRowHighlighted}
                  ref={(rowElement) => {
                    rowElementRefs.current[rowIndex] = rowElement;
                  }}
                  onMouseMove={() => {
                    // mousemove, not mouseenter — arrow-key scrolling drags rows
                    // under a stationary cursor and would yank the highlight back.
                    if (!isRowHighlighted) openCategoryList(comboboxState.query, rowIndex);
                  }}
                  onClick={() => commitCategoryRow(comboboxRow)}
                  className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm ${
                    isRowHighlighted ? "bg-[#00696E]/10 text-[#00696E]" : ""
                  } ${comboboxRow.kind === "create-category" ? "border-t border-border/50" : ""}`}
                >
                  {renderCategoryRowContent(comboboxRow, isRowCommittedCategory)}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Pick a category or type a new one — press Enter to create it.
      </p>
    </div>
  );
}

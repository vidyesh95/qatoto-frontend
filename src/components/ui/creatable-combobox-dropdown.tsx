"use client";

import type React from "react";
import { createPortal } from "react-dom";
import {
  buildPopupStyle,
  type CreatableComboboxRow,
  type PopupPlacement,
} from "./creatable-combobox-types";

function renderComboboxRowContent(comboboxRow: CreatableComboboxRow, isRowSelectedOption: boolean) {
  switch (comboboxRow.kind) {
    case "existing-option":
      return (
        <>
          <span aria-hidden="true" className="w-3 shrink-0 text-primary-imprint">
            {isRowSelectedOption ? "✓" : ""}
          </span>
          <span>
            {comboboxRow.option.optionName}
            {isRowSelectedOption && <span className="sr-only"> (current selection)</span>}
          </span>
          {comboboxRow.option.optionNote !== undefined && (
            <span className="ml-auto shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {comboboxRow.option.optionNote}
            </span>
          )}
        </>
      );
    case "create-option":
      return (
        <>
          <span aria-hidden="true" className="w-3 shrink-0 text-primary-imprint">
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

export function CreatableComboboxDropdownPortal({
  comboboxListboxId,
  comboboxLabelId,
  popupPlacement,
  comboboxRows,
  highlightedRowIndex,
  selectedOptionId,
  portalContainer,
  rowElementRefs,
  onRowMouseMove,
  onRowClick,
}: {
  readonly comboboxListboxId: string;
  readonly comboboxLabelId: string;
  readonly popupPlacement: PopupPlacement;
  readonly comboboxRows: readonly CreatableComboboxRow[];
  readonly highlightedRowIndex: number;
  readonly selectedOptionId: string;
  readonly portalContainer: HTMLElement;
  readonly rowElementRefs: React.MutableRefObject<(HTMLLIElement | null)[]>;
  readonly onRowMouseMove: (rowIndex: number) => void;
  readonly onRowClick: (row: CreatableComboboxRow) => void;
}) {
  return createPortal(
    <ul
      id={comboboxListboxId}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-element-to-interactive-role, jsx-a11y/prefer-tag-over-role -- ul+li carrying listbox/option is the WAI-ARIA combobox pattern
      role="listbox"
      aria-labelledby={comboboxLabelId}
      onMouseDown={(mouseDownEvent) => {
        mouseDownEvent.preventDefault();
      }}
      style={buildPopupStyle(popupPlacement)}
      className="fixed z-100 overflow-y-auto rounded-lg border border-outline-strong bg-popover py-1 text-popover-foreground shadow-lg"
    >
      {comboboxRows.map((comboboxRow, rowIndex) => {
        const isRowHighlighted = rowIndex === highlightedRowIndex;
        const isRowSelectedOption =
          comboboxRow.kind === "existing-option" &&
          comboboxRow.option.optionId === selectedOptionId;
        return (
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events -- rows are intentionally non-focusable
          <li
            key={
              comboboxRow.kind === "existing-option"
                ? `existing-${comboboxRow.option.optionId}`
                : "create-option"
            }
            id={`${comboboxListboxId}-row-${rowIndex}`}
            // eslint-disable-next-line jsx-a11y/no-noninteractive-element-to-interactive-role, jsx-a11y/prefer-tag-over-role -- <option> is only valid inside select/datalist
            role="option"
            aria-selected={isRowHighlighted}
            ref={(rowElement) => {
              rowElementRefs.current[rowIndex] = rowElement;
              return () => {
                rowElementRefs.current[rowIndex] = null;
              };
            }}
            onMouseMove={() => onRowMouseMove(rowIndex)}
            onClick={() => onRowClick(comboboxRow)}
            className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm ${
              isRowHighlighted ? "bg-primary-imprint/10 text-primary-imprint" : ""
            } ${comboboxRow.kind === "create-option" ? "border-t border-border/50" : ""}`}
          >
            {renderComboboxRowContent(comboboxRow, isRowSelectedOption)}
          </li>
        );
      })}
    </ul>,
    portalContainer,
  );
}

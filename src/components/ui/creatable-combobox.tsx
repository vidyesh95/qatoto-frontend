"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import type React from "react";

import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field-classes";
import {
  buildComboboxRows,
  buildPopupPlacement,
  readPortalContainer,
  readPortalContainerOnServer,
  resolveInputDisplayValue,
  subscribeToNothing,
  type ComboboxOption,
  type CreatableComboboxProps,
  type CreatableComboboxRow,
  type CreatableComboboxState,
} from "./creatable-combobox-types";
import { CreatableComboboxDropdownPortal } from "./creatable-combobox-dropdown";

export type { ComboboxOption, CreatableComboboxProps };

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
  const portalContainer = useSyncExternalStore(
    subscribeToNothing,
    readPortalContainer,
    readPortalContainerOnServer,
  );
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

  const highlightedRowIndex =
    comboboxState.status === "open" ? comboboxState.highlightedRowIndex : -1;
  const openQuery = comboboxState.status === "open" ? comboboxState.query : null;

  useEffect(() => {
    if (highlightedRowIndex < 0 || openQuery === null) return;
    rowElementRefs.current[highlightedRowIndex]?.scrollIntoView({ block: "nearest" });
  }, [highlightedRowIndex, openQuery]);

  useEffect(() => {
    if (comboboxState.status !== "open") return undefined;
    const inputElement = inputElementRef.current;
    if (!inputElement) return undefined;

    const repositionOrCloseOptionList = () => {
      const anchorRect = inputElement.getBoundingClientRect();

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

    repositionOrCloseOptionList();

    window.addEventListener("scroll", repositionOrCloseOptionList, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", repositionOrCloseOptionList, { passive: true });
    const anchorResizeObserver = new ResizeObserver(repositionOrCloseOptionList);
    anchorResizeObserver.observe(inputElement);

    return () => {
      window.removeEventListener("scroll", repositionOrCloseOptionList, { capture: true });
      window.removeEventListener("resize", repositionOrCloseOptionList);
      anchorResizeObserver.disconnect();
    };
  }, [comboboxState.status]);

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
    closeOptionList();
    switch (comboboxRow.kind) {
      case "existing-option":
        return onOptionSelect(comboboxRow.option.optionId);
      case "create-option":
        return onCreateRequest?.(comboboxRow.typedOptionName);
      default: {
        const exhaustiveCheck: never = comboboxRow;
        return exhaustiveCheck;
      }
    }
  };

  const handleComboboxInputChange = (changeEvent: React.ChangeEvent<HTMLInputElement>) => {
    if (comboboxState.status === "closed") {
      openOptionList(changeEvent.target.value, 0);
      return;
    }
    updateOpenOptionList(changeEvent.target.value, 0);
  };

  const handleComboboxInputClick = () => {
    if (comboboxState.status === "closed") openOptionList("", 0);
  };

  const handleComboboxInputBlur = () => {
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
          keyDownEvent.preventDefault();
          keyDownEvent.stopPropagation();
        }
        return closeOptionList();
      }
      case "Tab":
        return closeOptionList();
      default:
        return;
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={comboboxInputId} id={comboboxLabelId} className={LABEL_CLASS}>
        {labelText}
      </label>

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
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-outline-strong"
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

      {comboboxState.status === "open" && portalContainer !== null && (
        <CreatableComboboxDropdownPortal
          comboboxListboxId={comboboxListboxId}
          comboboxLabelId={comboboxLabelId}
          popupPlacement={comboboxState.popupPlacement}
          comboboxRows={comboboxRows}
          highlightedRowIndex={comboboxState.highlightedRowIndex}
          selectedOptionId={selectedOptionId}
          portalContainer={portalContainer}
          rowElementRefs={rowElementRefs}
          onRowMouseMove={(rowIndex) => {
            if (rowIndex !== highlightedRowIndex) {
              updateOpenOptionList(comboboxState.query, rowIndex);
            }
          }}
          onRowClick={commitOptionRow}
        />
      )}
    </div>
  );
}

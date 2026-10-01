import type React from "react";

export function subscribeToNothing(): () => void {
  return () => {};
}

export function readPortalContainer(): HTMLElement | null {
  return document.body;
}

export function readPortalContainerOnServer(): HTMLElement | null {
  return null;
}

export type ComboboxOption = {
  optionId: string;
  optionName: string;
  optionNote?: string;
};

export type CreatableComboboxRow =
  | { kind: "existing-option"; option: ComboboxOption }
  | { kind: "create-option"; typedOptionName: string };

export type PopupPlacement = {
  leftPx: number;
  widthPx: number;
  maxHeightPx: number;
  verticalAnchor: { edge: "top"; offsetPx: number } | { edge: "bottom"; offsetPx: number };
};

export type CreatableComboboxState =
  | { status: "closed" }
  | {
      status: "open";
      query: string;
      highlightedRowIndex: number;
      popupPlacement: PopupPlacement;
    };

export type CreatableComboboxProps = {
  labelText: string;
  placeholderText: string;
  selectedOptionId: string;
  options: ComboboxOption[];
  onOptionSelect: (selectedOptionId: string) => void;
  onCreateRequest?: (typedOptionName: string) => void;
  helpText?: string;
};

const POPUP_MAX_HEIGHT_PX = 256;
const POPUP_MIN_HEIGHT_PX = 96;
const POPUP_ANCHOR_GAP_PX = 4;
const POPUP_VIEWPORT_MARGIN_PX = 8;

export function buildPopupPlacement(anchorRect: DOMRect): PopupPlacement {
  const spaceBelowPx =
    window.innerHeight - anchorRect.bottom - POPUP_ANCHOR_GAP_PX - POPUP_VIEWPORT_MARGIN_PX;
  const spaceAbovePx = anchorRect.top - POPUP_ANCHOR_GAP_PX - POPUP_VIEWPORT_MARGIN_PX;

  const shouldFlipUpward = spaceBelowPx < POPUP_MIN_HEIGHT_PX && spaceAbovePx > spaceBelowPx;
  const availableHeightPx = shouldFlipUpward ? spaceAbovePx : spaceBelowPx;

  return {
    leftPx: anchorRect.left,
    widthPx: anchorRect.width,
    maxHeightPx: Math.max(POPUP_MIN_HEIGHT_PX, Math.min(POPUP_MAX_HEIGHT_PX, availableHeightPx)),
    verticalAnchor: shouldFlipUpward
      ? { edge: "bottom", offsetPx: window.innerHeight - anchorRect.top + POPUP_ANCHOR_GAP_PX }
      : { edge: "top", offsetPx: anchorRect.bottom + POPUP_ANCHOR_GAP_PX },
  };
}

export function buildPopupStyle(popupPlacement: PopupPlacement): React.CSSProperties {
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

export function resolveInputDisplayValue(
  comboboxState: CreatableComboboxState,
  options: ComboboxOption[],
  selectedOptionId: string,
): string {
  switch (comboboxState.status) {
    case "closed":
      return options.find((option) => option.optionId === selectedOptionId)?.optionName ?? "";
    case "open":
      return comboboxState.query;
    default: {
      const exhaustiveCheck: never = comboboxState;
      return exhaustiveCheck;
    }
  }
}

export function rankOptionMatches(options: ComboboxOption[], rawQuery: string): ComboboxOption[] {
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

export function buildComboboxRows(
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

// TRANSPORT: props-only — renders model availability it is given and reports a choice.
"use client";

// WHICH MODEL ANSWERS THIS CHAT: A CHOICE UNTIL THE FIRST ANSWER, A LABEL AFTER IT.
//
// A menu of the two models, each with where its words go, on the `camera-preset-menu.tsx`
// precedent (a button with `aria-haspopup="menu"` over `menuitemradio` items). A model that cannot
// answer here stays in the list, disabled, with its reason: a hidden option is a question the
// viewer cannot ask ("why is there no cloud option?").
//
// LOCKED, IT IS NOT A CONTROL. Once a chat has an answer its model is fixed for good (see
// `assistant-brain-state.ts` for why there is no unlock), so the picker becomes plain text and the
// one action left is a new chat with the other model, offered only when that model can answer.
//
// The menu's Escape closes the menu alone. `assistant-root.tsx` closes the whole panel on Escape at
// the document, so the keydown is stopped here before that listener sees it (see the handler).

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import Image from "next/image";

import {
  ASSISTANT_LOCKED_MODEL_LABELS,
  ASSISTANT_MODEL_NAMES,
  describeModelOption,
  isModelOptionSelectable,
  type AssistantModelAvailability,
} from "@/components/assistant/assistant-brain-state";
import {
  ASSISTANT_MODEL_ROUTES,
  type AssistantModelRoute,
} from "@/lib/assistant/assistant-conversation.schemas";

const FOCUS_RING_CLASS_NAME =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint";

export default function AssistantModelPicker({
  idPrefix,
  lockedModel,
  selectedModel,
  modelAvailability,
  canStartNewChat,
  onSelectModel,
  onStartNewChatWith,
}: {
  readonly idPrefix: string;
  readonly lockedModel: AssistantModelRoute | null;
  /** The model this chat will use: its locked one, or the resolved pick. */
  readonly selectedModel: AssistantModelRoute;
  readonly modelAvailability: AssistantModelAvailability;
  /** False at the chat limit, where a new chat could never be saved. */
  readonly canStartNewChat: boolean;
  readonly onSelectModel: (model: AssistantModelRoute) => void;
  readonly onStartNewChatWith: (model: AssistantModelRoute) => void;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!isMenuOpen) return undefined;
    menuRef.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
    const handlePointerDown = (pointerEvent: PointerEvent) => {
      const container = containerRef.current;
      if (
        container !== null &&
        pointerEvent.target instanceof Node &&
        !container.contains(pointerEvent.target)
      ) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isMenuOpen]);

  if (lockedModel !== null) {
    const otherModel: AssistantModelRoute = lockedModel === "on_device" ? "cloud" : "on_device";
    const canStartWithOtherModel =
      canStartNewChat && isModelOptionSelectable(modelAvailability[otherModel]);
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-xs leading-4 font-medium text-foreground">
          {ASSISTANT_LOCKED_MODEL_LABELS[lockedModel]}
        </span>
        {canStartWithOtherModel && (
          <button
            type="button"
            onClick={() => onStartNewChatWith(otherModel)}
            className={`cursor-pointer text-xs leading-4 font-medium text-foreground underline underline-offset-2 ${FOCUS_RING_CLASS_NAME}`}
          >
            New chat with {ASSISTANT_MODEL_NAMES[otherModel]}
          </button>
        )}
      </div>
    );
  }

  const closeMenu = () => {
    setIsMenuOpen(false);
    triggerRef.current?.focus();
  };

  const handleMenuKeyDown = (keyboardEvent: KeyboardEvent<HTMLUListElement>) => {
    if (keyboardEvent.key === "Escape") {
      // IMMEDIATE, not plain, propagation stop: Next hydrates React on `document`, the same node
      // `assistant-root.tsx` listens on, so `stopPropagation` would not keep that listener from
      // closing the whole panel. React's listener was attached first, at hydration, so it runs first.
      keyboardEvent.nativeEvent.stopImmediatePropagation();
      closeMenu();
      return;
    }
    if (keyboardEvent.key !== "ArrowDown" && keyboardEvent.key !== "ArrowUp") return;
    keyboardEvent.preventDefault();
    const menuItems = [
      ...(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]') ?? []),
    ];
    const focusedIndex = menuItems.findIndex((menuItem) => menuItem === document.activeElement);
    const stepDirection = keyboardEvent.key === "ArrowDown" ? 1 : -1;
    const nextIndex = (focusedIndex + stepDirection + menuItems.length) % menuItems.length;
    menuItems[nextIndex]?.focus();
  };

  const handleModelClick = (model: AssistantModelRoute) => {
    if (!isModelOptionSelectable(modelAvailability[model])) return;
    onSelectModel(model);
    closeMenu();
  };

  const menuId = `${idPrefix}-model-menu`;

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isMenuOpen}
        aria-controls={isMenuOpen ? menuId : undefined}
        onClick={() => setIsMenuOpen((wasMenuOpen) => !wasMenuOpen)}
        className={`inline-flex cursor-pointer items-center gap-1 rounded-full border border-border py-1 pr-2 pl-3 text-xs leading-4 font-medium text-foreground transition-colors hover:bg-muted ${FOCUS_RING_CLASS_NAME}`}
      >
        <span className="sr-only">Model: </span>
        {ASSISTANT_MODEL_NAMES[selectedModel]}
        <Image
          src="/icons/keyboard_arrow_down_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
          alt=""
          width={16}
          height={16}
        />
      </button>

      {isMenuOpen && (
        <ul
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="Model for this chat"
          onKeyDown={handleMenuKeyDown}
          className="absolute top-full right-0 z-10 mt-1.5 w-72 space-y-0.5 rounded-xl border border-border bg-background p-1 shadow-lg"
        >
          {ASSISTANT_MODEL_ROUTES.map((model) => {
            const modelOption = describeModelOption(model, modelAvailability[model]);
            const isSelected = model === selectedModel;
            return (
              <li key={model} role="none">
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={isSelected}
                  aria-disabled={!modelOption.isSelectable}
                  onClick={() => handleModelClick(model)}
                  className={`flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition-colors ${
                    modelOption.isSelectable
                      ? "cursor-pointer hover:bg-muted"
                      : "cursor-not-allowed"
                  } ${FOCUS_RING_CLASS_NAME}`}
                >
                  <span aria-hidden className="w-3 pt-0.5 text-xs leading-4 text-primary-imprint">
                    {isSelected ? "✓" : ""}
                  </span>
                  <span className="min-w-0 flex-1">
                    {/* Dimmed as a disabled control is (docs/Design.md §5); the reason below it is
                        not, because it is the one thing the viewer needs to read here. */}
                    <span className={`block ${modelOption.isSelectable ? "" : "opacity-40"}`}>
                      <span className="block text-sm leading-5 font-medium text-foreground">
                        {modelOption.name}
                      </span>
                      <span className="block text-xs leading-4 text-muted-foreground">
                        {modelOption.privacyLine}
                      </span>
                    </span>
                    {modelOption.reasonText !== null && (
                      <span className="mt-0.5 block text-xs leading-4 font-medium text-foreground">
                        {modelOption.reasonText}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

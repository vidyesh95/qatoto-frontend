// TRANSPORT: props-only — fetches the account menu and the two sheets it opens, on first open.
"use client";

// THE ACCOUNT MENU, THE AI ASSIST SHEET AND THE SEND-FEEDBACK SHEET ARE NOT IN ANY PAGE'S
// INITIAL JAVASCRIPT.
//
// All three are only ever mounted conditionally — `{isOpen && <X />}` — yet a static import put
// them, and everything under them, into the first load of every `(home)`, `(studio)` and `(admin)`
// route: every account panel, `react-easy-crop`, `@simplewebauthn/browser`, the data-export and
// privacy request code, the feedback composer. The 16.4 Bundle Analyzer measured that at about
// 100k per route (todo.md §24.3) for a menu most visits never open. Every mount site imports from
// here instead. How the lazy load, the preload and the failure stand-in work is in
// `@/components/home/shared/lazy-overlay`.
//
// The feedback sheet's trigger is the "Send feedback" row inside the account menu, so that row is
// what preloads it.

import type { ComponentProps } from "react";

import type AccountMenuComponent from "@/components/home/account/menus/account-menu";
import type AiAssistSheetComponent from "@/components/home/account/menus/ai-assist-sheet";
import type SendFeedbackSheetComponent from "@/components/home/shared/send-feedback-sheet";
import { ACCOUNT_MENU_PANEL_CLASS_NAME } from "@/components/home/account/menus/account-menu-layout";
import {
  createLazyOverlay,
  createLazySheet,
  LOAD_FAILED_MESSAGE,
  ReloadPageButton,
} from "@/components/home/shared/lazy-overlay";

type AccountMenuProps = ComponentProps<typeof AccountMenuComponent>;
type AiAssistSheetProps = ComponentProps<typeof AiAssistSheetComponent>;
type SendFeedbackSheetProps = ComponentProps<typeof SendFeedbackSheetComponent>;

// The menu is a dropdown, not a sheet, so its stand-in draws the dropdown frame and offers Close as
// well as Reload — there is no scrim to tap.
function AccountMenuLoadFailedPanel({ onClose }: AccountMenuProps) {
  return (
    <div className={ACCOUNT_MENU_PANEL_CLASS_NAME}>
      <div className="flex flex-col gap-3 p-4">
        <p className="text-sm text-foreground" role="alert">
          {LOAD_FAILED_MESSAGE}
        </p>
        <div className="flex gap-2">
          <ReloadPageButton />
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-full border border-border px-3 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-muted"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export const { LazyOverlay: LazyAccountMenu, preload: preloadAccountMenu } =
  createLazyOverlay<AccountMenuProps>(
    () => import("@/components/home/account/menus/account-menu"),
    AccountMenuLoadFailedPanel,
  );

export const { LazyOverlay: LazyAiAssistSheet, preload: preloadAiAssistSheet } =
  createLazySheet<AiAssistSheetProps>(
    () => import("@/components/home/account/menus/ai-assist-sheet"),
    "AI Assist Mode",
  );

export const { LazyOverlay: LazySendFeedbackSheet, preload: preloadSendFeedbackSheet } =
  createLazySheet<SendFeedbackSheetProps>(
    () => import("@/components/home/shared/send-feedback-sheet"),
    "Send feedback",
  );

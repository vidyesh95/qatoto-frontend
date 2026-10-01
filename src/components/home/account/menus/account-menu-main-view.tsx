"use client";

import type { BrowserPreferences } from "@/lib/browser-preferences";
import {
  AccountMenuNavList,
  AccountMenuPreferencesAndSupport,
  AccountMenuUserCard,
} from "@/components/home/account/menus/account-menu-sections";

export type AccountMenuView =
  | "main"
  | "ai-assist"
  | "language"
  | "location"
  | "settings"
  | "switch-account";

export function AccountMenuMainView({
  userName,
  userHandle,
  userImage,
  preferences,
  onViewChange,
  onSignOut,
  onClose,
  onSendFeedback,
}: {
  readonly userName?: string | null;
  readonly userHandle?: string | null;
  readonly userImage?: string | null;
  readonly preferences: BrowserPreferences;
  readonly onViewChange: (view: AccountMenuView) => void;
  readonly onSignOut: () => void;
  readonly onClose: () => void;
  readonly onSendFeedback: () => void;
}) {
  return (
    <div className="space-y-8">
      <AccountMenuUserCard
        userName={userName}
        userHandle={userHandle}
        userImage={userImage}
        onViewChange={onViewChange}
      />
      <div>
        <AccountMenuNavList onViewChange={onViewChange} onSignOut={onSignOut} onClose={onClose} />
        <AccountMenuPreferencesAndSupport
          preferences={preferences}
          onViewChange={onViewChange}
          onClose={onClose}
          onSendFeedback={onSendFeedback}
        />
      </div>
    </div>
  );
}

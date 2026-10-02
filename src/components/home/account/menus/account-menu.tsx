// TRANSPORT: client-query — the Better Auth session and sign-out, through `lib/auth-client.ts`.
// The panels it swaps between own their own reads; the three preference panels read `localStorage`.
"use client";

import { useEffect, useRef, useState } from "react";
import { signOut, useSession } from "@/lib/auth-client";
import { LanguagePanel } from "@/components/home/account/menus/language-menu";
import { LocationPanel } from "@/components/home/account/menus/location-menu";
import { useBrowserPreferences } from "@/state/browser-preferences-context";
import { AiAssistPanel } from "@/components/home/account/menus/ai-assist-menu";
import { SettingsPanel } from "@/components/home/account/menus/settings-menu";
import { SwitchAccountPanel } from "@/components/home/account/menus/switch-account-menu";
import {
  AccountMenuMainView,
  type AccountMenuView,
} from "@/components/home/account/menus/account-menu-main-view";

type AccountMenuProps = {
  /** Called when the menu should close — e.g. an outside click or after sign-out. */
  onClose: () => void;
  /**
   * Opens the send-feedback sheet.
   *
   * REQUIRED, so the compiler names every caller. This menu is mounted by three different
   * navbars, and an optional handler would have wired one of them and quietly left the other
   * two with the dead button this prop exists to fix.
   *
   * THE OWNER CLOSES THE MENU AND OWNS THE SHEET. This component is unmounted the moment the
   * menu closes, so a sheet rendered here would die with it — the caller opens one beside the
   * menu instead.
   */
  onSendFeedback: () => void;
};

/**
 * Dropdown panel showing the signed-in user's profile, rewards, and account
 * actions (channel, creator studio, settings, sign-out, etc.).
 *
 * Closes itself when the user clicks anywhere outside the panel, and exposes a
 * sign-out action that clears the local auth flag and returns to the home page.
 */
export default function AccountMenu({ onClose, onSendFeedback }: AccountMenuProps) {
  // Reference to the root panel element, used to detect clicks landing outside it.
  const menuPanelRef = useRef<HTMLDivElement>(null);

  // Signed-in user's name + avatar come from the Better Auth session (get-session).
  const { data: session } = useSession();

  // Which panel is showing.
  const [view, setView] = useState<AccountMenuView>("main");

  // THE PREFERENCES ARE NOT LOCAL STATE ANY MORE. They were, and closing this dropdown threw every
  // one of them away — a language picked here was gone the next time the panel opened. They live in
  // `localStorage` behind the context now, so a choice made here survives both the close and a
  // reload.
  const { preferences, setPreference } = useBrowserPreferences();

  // Close the menu whenever the user presses down anywhere outside the panel.
  useEffect(() => {
    const handleClickOutside = (mouseEvent: MouseEvent) => {
      const clickTarget = mouseEvent.target;
      const clickedOutsidePanel =
        clickTarget instanceof Node &&
        menuPanelRef.current &&
        !menuPanelRef.current.contains(clickTarget);

      if (clickedOutsidePanel) onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Reset scroll to the top whenever the visible panel changes, so opening a
  // sub-panel (or returning to main) always starts at the top rather than
  // inheriting the previous panel's scroll position.
  function handleViewChange(nextView: AccountMenuView) {
    setView(nextView);
    menuPanelRef.current?.scrollTo({ top: 0 });
  }

  // Sign the user out: end the Better Auth session (clears the httpOnly
  // cookie), close the menu, and navigate home with a full reload so any
  // in-memory auth state resets.
  const handleSignOut = async () => {
    await signOut();
    onClose();
    window.location.href = "/";
  };

  return (
    <div
      ref={menuPanelRef}
      className="fixed top-15 right-14 left-1 z-50 max-h-[calc(100dvh-9rem)] w-auto overflow-y-auto rounded-lg border border-border bg-background shadow-lg sm:absolute sm:top-12 sm:right-2 sm:left-auto sm:max-h-[calc(100dvh-4rem)] sm:w-95"
    >
      {view === "ai-assist" ? (
        <AiAssistPanel
          selected={preferences.isAiAssistModeOn}
          onSelect={(isAiAssistModeOn) => setPreference("isAiAssistModeOn", isAiAssistModeOn)}
          onBack={() => handleViewChange("main")}
          mascotSize={preferences.assistantMascotSize}
          mascotSpeed={preferences.assistantMascotSpeed}
          onMascotSizeChange={(mascotSize) => setPreference("assistantMascotSize", mascotSize)}
          onMascotSpeedChange={(mascotSpeed) => setPreference("assistantMascotSpeed", mascotSpeed)}
        />
      ) : view === "language" ? (
        <LanguagePanel
          selected={preferences.language}
          onSelect={(language) => setPreference("language", language)}
          onBack={() => handleViewChange("main")}
        />
      ) : view === "location" ? (
        <LocationPanel
          selected={preferences.countryCode}
          onSelect={(countryCode) => setPreference("countryCode", countryCode)}
          onBack={() => handleViewChange("main")}
        />
      ) : view === "settings" ? (
        <SettingsPanel onBack={() => handleViewChange("main")} onSignOut={handleSignOut} />
      ) : view === "switch-account" ? (
        <SwitchAccountPanel onBack={() => handleViewChange("main")} onSignOutAll={handleSignOut} />
      ) : (
        <AccountMenuMainView
          userName={session?.user.name}
          userHandle={session?.user.handle}
          userImage={session?.user.image}
          preferences={preferences}
          onViewChange={handleViewChange}
          onSignOut={handleSignOut}
          onClose={onClose}
          onSendFeedback={onSendFeedback}
        />
      )}
    </div>
  );
}

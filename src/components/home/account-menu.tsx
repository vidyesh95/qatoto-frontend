"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AppearancePanel, THEME_SUMMARY, type Theme } from "@/components/home/appearance-menu";
import { LanguagePanel } from "@/components/home/language-menu";
import { countryName, DEFAULT_COUNTRY_CODE, LocationPanel } from "@/components/home/location-menu";
import { ChildPanel } from "@/components/home/child-menu";
import { IncognitoPanel } from "@/components/home/incognito-menu";
import { AiAssistPanel } from "@/components/home/ai-assist-menu";
import { SettingsPanel } from "@/components/home/settings-menu";

type AccountMenuProps = {
  /** Called when the menu should close — e.g. an outside click or after sign-out. */
  onClose: () => void;
};

/** Which panel of the account menu is currently visible. */
type MenuView =
  | "main"
  | "appearance"
  | "child"
  | "incognito"
  | "ai-assist"
  | "language"
  | "location"
  | "settings";

/**
 * Dropdown panel showing the signed-in user's profile, rewards, and account
 * actions (channel, creator studio, settings, sign-out, etc.).
 *
 * Closes itself when the user clicks anywhere outside the panel, and exposes a
 * sign-out action that clears the local auth flag and returns to the home page.
 */
export default function AccountMenu({ onClose }: AccountMenuProps) {
  // Reference to the root panel element, used to detect clicks landing outside it.
  const menuPanelRef = useRef<HTMLDivElement>(null);

  // Which panel is showing, and the browser-local appearance preference.
  const [view, setView] = useState<MenuView>("main");
  const [theme, setTheme] = useState<Theme>("device");
  const [childMode, setChildMode] = useState(false);
  const [incognitoMode, setIncognitoMode] = useState(false);
  const [aiAssistMode, setAiAssistMode] = useState(false);
  const [language, setLanguage] = useState("English (US)");
  const [location, setLocation] = useState(DEFAULT_COUNTRY_CODE);

  // Close the menu whenever the user presses down anywhere outside the panel.
  useEffect(() => {
    const handleClickOutside = (mouseEvent: MouseEvent) => {
      const clickTarget = mouseEvent.target as Node;
      const clickedOutsidePanel =
        menuPanelRef.current && !menuPanelRef.current.contains(clickTarget);

      if (clickedOutsidePanel) onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Reset scroll to the top whenever the visible panel changes, so opening a
  // sub-panel (or returning to main) always starts at the top rather than
  // inheriting the previous panel's scroll position.
  useEffect(() => {
    menuPanelRef.current?.scrollTo({ top: 0 });
  }, [view]);

  // Sign the user out: drop the persisted auth flag, close the menu, and
  // navigate to the home page (full reload resets any in-memory auth state).
  const handleSignOut = () => {
    localStorage.removeItem("qatoto_authenticated");
    onClose();
    window.location.href = "/";
  };

  return (
    <div
      ref={menuPanelRef}
      className="absolute right-2 top-12 z-50 w-95 max-h-[calc(100dvh-4rem)] overflow-y-auto bg-background border border-black/10 rounded-lg shadow-lg"
    >
      {view === "appearance" ? (
        <AppearancePanel selected={theme} onSelect={setTheme} onBack={() => setView("main")} />
      ) : view === "child" ? (
        <ChildPanel selected={childMode} onSelect={setChildMode} onBack={() => setView("main")} />
      ) : view === "incognito" ? (
        <IncognitoPanel
          selected={incognitoMode}
          onSelect={setIncognitoMode}
          onBack={() => setView("main")}
        />
      ) : view === "ai-assist" ? (
        <AiAssistPanel
          selected={aiAssistMode}
          onSelect={setAiAssistMode}
          onBack={() => setView("main")}
        />
      ) : view === "language" ? (
        <LanguagePanel selected={language} onSelect={setLanguage} onBack={() => setView("main")} />
      ) : view === "location" ? (
        <LocationPanel selected={location} onSelect={setLocation} onBack={() => setView("main")} />
      ) : view === "settings" ? (
        <SettingsPanel onBack={() => setView("main")} onSignOut={handleSignOut} />
      ) : (
        <div className="space-y-8">
          <div className="rounded-lg bg-secondary">
            <header className="rounded-lg bg-background">
              <div className="w-full flex flex-row">
                <div className="flex-1 min-w-0">
                  <div className="w-full pl-4 py-4">
                    <p className="w-full text-base text-[#041F21] truncate">董雪博士</p>
                    <p className="w-full text-xs text-[#041F21] truncate">@drDong2w</p>
                  </div>
                  <p className="w-full ml-4 text-4xl text-[#1DBDC5] flex gap-1">
                    <span>Level</span>
                    <span className="flex-1 min-w-0 truncate">1</span>
                  </p>
                </div>
                <div className="shrink-0 p-4 flex flex-col items-end gap-4">
                  <button
                    type="button"
                    onClick={() => setView("settings")}
                    aria-label="Open settings"
                    className="rounded-full cursor-pointer"
                  >
                    <Image
                      src="/dummy/profile_photo_girl.avif"
                      alt="Account"
                      width={40}
                      height={40}
                      className="rounded-full ring-1 ring-primary"
                    />
                  </button>
                  <button
                    type="button"
                    className="w-fit text-xs bg-secondary text-secondary-foreground rounded-full px-2 py-1 cursor-pointer"
                  >
                    Check-in
                  </button>
                </div>
              </div>
              <div className="w-full flex flex-row gap-4 p-4">
                <div className="w-full flex flex-col items-center p-2 rounded-sm bg-primary">
                  <div className="flex flex-row items-center">
                    <span className="w-full text-sm text-right truncate">0</span>
                    <Image
                      src="/icons/paid_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                      alt="Coins"
                      width={24}
                      height={24}
                    />
                  </div>
                  <p className="text-sm">Coins</p>
                </div>
                <div className="w-full flex flex-col items-center p-2 rounded-sm bg-primary">
                  <div className="flex flex-row items-center">
                    <span className="w-full text-sm text-right truncate">0</span>
                    <Image
                      src="/icons/local_activity_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                      alt="Social Reputation"
                      width={24}
                      height={24}
                    />
                  </div>
                  <p className="text-sm">Social Reputation</p>
                </div>
              </div>
            </header>
            <button
              type="button"
              className="w-full p-4 flex flex-row gap-4 items-center cursor-pointer"
            >
              <Image
                src="/icons/workspace_premium_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt="Premium membership"
                width={24}
                height={24}
              />
              <span className="text-sm text-secondary-foreground font-medium">
                Premium membership
              </span>
            </button>
          </div>

          <div>
            <button
              type="button"
              className="w-full p-4 flex flex-row gap-4 items-center cursor-pointer hover:bg-muted transition-colors"
            >
              <Image
                src="/icons/video_library_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt="Your channel"
                width={24}
                height={24}
              />
              <span className="text-sm text-secondary-foreground font-medium">Library</span>
            </button>
            <button
              type="button"
              className="w-full p-4 flex flex-row gap-4 items-center cursor-pointer hover:bg-muted transition-colors"
            >
              <Image
                src="/icons/history_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt="Your channel"
                width={24}
                height={24}
              />
              <span className="text-sm text-secondary-foreground font-medium">History</span>
            </button>
            <button
              type="button"
              className="w-full p-4 flex flex-row gap-4 items-center cursor-pointer hover:bg-muted transition-colors"
            >
              <Image
                src="/icons/shopping_cart_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt="Your cart"
                width={24}
                height={24}
              />
              <span className="text-sm text-secondary-foreground font-medium">Cart</span>
            </button>
            <button
              type="button"
              className="w-full p-4 flex flex-row gap-4 items-center cursor-pointer hover:bg-muted transition-colors"
            >
              <Image
                src="/icons/favorite_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt="Your wishlist"
                width={24}
                height={24}
              />
              <span className="text-sm text-secondary-foreground font-medium">Wishlist</span>
            </button>
            <button
              type="button"
              className="w-full p-4 flex flex-row gap-4 items-center cursor-pointer hover:bg-muted transition-colors"
            >
              <Image
                src="/icons/local_shipping_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt="Your orders"
                width={24}
                height={24}
              />
              <span className="text-sm text-secondary-foreground font-medium">Orders and returns</span>
            </button>
            <button
              type="button"
              onClick={() => setView("settings")}
              className="w-full p-4 flex flex-row gap-4 items-center cursor-pointer hover:bg-muted transition-colors"
            >
              <Image
                src="/icons/settings_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt="Settings"
                width={24}
                height={24}
              />
              <span className="w-full text-left text-sm text-secondary-foreground font-medium">Settings</span>
              <Image
                src="/icons/chevron_forward_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
                alt="Change device theme"
                width={24}
                height={24}
              />
            </button>
            <button
              type="button"
              className="w-full p-4 flex flex-row gap-4 items-center cursor-pointer hover:bg-muted transition-colors"
            >
              <Image
                src="/icons/switch_account_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt="Switch account"
                width={24}
                height={24}
              />
              <span className="text-sm text-secondary-foreground font-medium">Switch account</span>
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full p-4 flex flex-row gap-4 items-center cursor-pointer hover:bg-muted transition-colors"
            >
              <Image
                src="/icons/logout_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt="Sign out"
                width={24}
                height={24}
              />
              <span className="text-sm text-secondary-foreground font-medium">Sign out</span>
            </button>
            <hr className="mx-4" />
            <button
              type="button"
              onClick={() => setView("appearance")}
              className="w-full p-4 flex flex-row gap-4 items-center cursor-pointer hover:bg-muted transition-colors"
            >
              <Image
                src="/icons/dark_mode_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt="Appearance"
                width={24}
                height={24}
              />
              <span className="flex-1 min-w-0 flex gap-1 text-sm text-secondary-foreground font-medium">
                <span className="shrink-0">Appearance:</span>
                <span className="truncate">{THEME_SUMMARY[theme]}</span>
              </span>
              <Image
                src="/icons/chevron_forward_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
                alt="Change device theme"
                width={24}
                height={24}
              />
            </button>
            <button
              type="button"
              onClick={() => setView("language")}
              className="w-full p-4 flex flex-row gap-4 items-center cursor-pointer hover:bg-muted transition-colors"
            >
              <Image
                src="/icons/translate_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt="Language"
                width={24}
                height={24}
              />
              <span className="flex-1 min-w-0 flex gap-1 text-sm text-secondary-foreground font-medium">
                <span className="shrink-0">Language:</span>
                <span className="truncate">{language}</span>
              </span>
              <Image
                src="/icons/chevron_forward_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
                alt="Change language"
                width={24}
                height={24}
              />
            </button>
            <button
              type="button"
              onClick={() => setView("child")}
              className="w-full p-4 flex flex-row gap-4 items-center cursor-pointer hover:bg-muted transition-colors"
            >
              <Image
                src="/icons/child_care_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt="Child Mode"
                width={24}
                height={24}
              />
              <span className="flex-1 min-w-0 flex gap-1 text-sm text-secondary-foreground font-medium">
                <span className="shrink-0">Child mode:</span>
                <span className="truncate">{childMode ? "On" : "Off"}</span>
              </span>
              <Image
                src="/icons/chevron_forward_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
                alt="Change Child Mode"
                width={24}
                height={24}
              />
            </button>
            <button
              type="button"
              onClick={() => setView("incognito")}
              className="w-full p-4 flex flex-row gap-4 items-center cursor-pointer hover:bg-muted transition-colors"
            >
              <Image
                src="/icons/account_circle_off_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt="Incognito Mode"
                width={24}
                height={24}
              />
              <span className="flex-1 min-w-0 flex gap-1 text-sm text-secondary-foreground font-medium">
                <span className="shrink-0">Incognito mode:</span>
                <span className="truncate">{incognitoMode ? "On" : "Off"}</span>
              </span>
              <Image
                src="/icons/chevron_forward_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
                alt="Change Incognito Mode"
                width={24}
                height={24}
              />
            </button>
            <button
              type="button"
              onClick={() => setView("ai-assist")}
              className="w-full p-4 flex flex-row gap-4 items-center cursor-pointer hover:bg-muted transition-colors"
            >
              <Image
                src="/icons/assistant_navigation_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt="AI Assist Mode"
                width={24}
                height={24}
              />
              <span className="flex-1 min-w-0 flex gap-1 text-sm text-secondary-foreground font-medium">
                <span className="shrink-0">AI assist mode:</span>
                <span className="truncate">{aiAssistMode ? "On" : "Off"}</span>
              </span>
              <Image
                src="/icons/chevron_forward_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
                alt="Change AI Assist Mode"
                width={24}
                height={24}
              />
            </button>
            <button
              type="button"
              onClick={() => setView("location")}
              className="w-full p-4 flex flex-row gap-4 items-center cursor-pointer hover:bg-muted transition-colors"
            >
              <Image
                src="/icons/location_on_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt="Location"
                width={24}
                height={24}
              />
              <span className="flex-1 min-w-0 flex gap-1 text-sm text-secondary-foreground font-medium">
                <span className="shrink-0">Location:</span>
                <span className="truncate">{countryName(location)}</span>
              </span>
              <Image
                src="/icons/chevron_forward_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
                alt="Change Location"
                width={24}
                height={24}
              />
            </button>
            <hr className="mx-4" />
            <button
              type="button"
              className="w-full p-4 flex flex-row gap-4 items-center cursor-pointer hover:bg-muted transition-colors"
            >
              <Image
                src="/icons/forum_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt="Forum"
                width={24}
                height={24}
              />
              <span className="text-sm text-secondary-foreground font-medium">Forum</span>
            </button>
            <button
              type="button"
              className="w-full p-4 flex flex-row gap-4 items-center cursor-pointer hover:bg-muted transition-colors"
            >
              <Image
                src="/icons/help_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt="Help"
                width={24}
                height={24}
              />
              <span className="text-sm text-secondary-foreground font-medium">Help</span>
            </button>
            <button
              type="button"
              className="w-full p-4 flex flex-row gap-4 items-center cursor-pointer hover:bg-muted transition-colors"
            >
              <Image
                src="/icons/support_agent_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt="Send feedback"
                width={24}
                height={24}
              />
              <span className="text-sm text-secondary-foreground font-medium">
                Customer service
              </span>
            </button>
            <button
              type="button"
              className="w-full p-4 flex flex-row gap-4 items-center cursor-pointer hover:bg-muted transition-colors"
            >
              <Image
                src="/icons/rate_review_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt="Send feedback"
                width={24}
                height={24}
              />
              <span className="text-sm text-secondary-foreground font-medium">Send feedback</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

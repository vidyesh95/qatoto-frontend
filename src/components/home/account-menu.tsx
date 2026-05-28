"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AppearancePanel, THEME_SUMMARY, type Theme } from "@/components/home/appearance-menu";
import { LanguagePanel } from "@/components/home/language-menu";
import { RestrictedPanel } from "@/components/home/restricted-menu";

type AccountMenuProps = {
  /** Called when the menu should close — e.g. an outside click or after sign-out. */
  onClose: () => void;
};

/** Which panel of the account menu is currently visible. */
type MenuView = "main" | "appearance" | "restricted" | "language";

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
  const [restricted, setRestricted] = useState(false);
  const [language, setLanguage] = useState("English (US)");

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
      ) : view === "restricted" ? (
        <RestrictedPanel
          selected={restricted}
          onSelect={setRestricted}
          onBack={() => setView("main")}
        />
      ) : view === "language" ? (
        <LanguagePanel selected={language} onSelect={setLanguage} onBack={() => setView("main")} />
      ) : (
        <div className="space-y-8">
          <div className="rounded-lg bg-secondary">
            <header className="rounded-lg bg-background">
              <div className="w-full flex flex-row">
                <div className="flex-1 min-w-0">
                  <div className="w-full pl-4 py-4">
                    <p className="w-full text-base text-[#041F21] truncate">Vidyesh Churi</p>
                    <p className="w-full text-xs text-[#041F21] truncate">@vidyesh</p>
                  </div>
                  <p className="w-full ml-4 text-4xl text-[#1DBDC5] flex gap-1">
                    <span>Level</span>
                    <span className="flex-1 min-w-0 truncate">1</span>
                  </p>
                </div>
                <div className="shrink-0 p-4 flex flex-col items-end gap-4">
                  <Image
                    src="/dummy/authenticated_user01.avif"
                    alt="Account"
                    width={40}
                    height={40}
                    className="rounded-full border border-primary"
                  />
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
                      alt="Tickets"
                      width={24}
                      height={24}
                    />
                  </div>
                  <p className="text-sm">Tickets</p>
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
                src="/icons/account_box_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt="Your channel"
                width={24}
                height={24}
              />
              <span className="text-sm text-secondary-foreground font-medium">Your channel</span>
            </button>
            <button
              type="button"
              className="w-full p-4 flex flex-row gap-4 items-center cursor-pointer hover:bg-muted transition-colors"
            >
              <Image
                src="/icons/video_call_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt="Creator studio"
                width={24}
                height={24}
              />
              <span className="text-sm text-secondary-foreground font-medium">Creator studio</span>
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
              onClick={() => setView("restricted")}
              className="w-full p-4 flex flex-row gap-4 items-center cursor-pointer hover:bg-muted transition-colors"
            >
              <Image
                src="/icons/admin_panel_settings_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt="Restricted Mode"
                width={24}
                height={24}
              />
              <span className="flex-1 min-w-0 flex gap-1 text-sm text-secondary-foreground font-medium">
                <span className="shrink-0">Restricted Mode:</span>
                <span className="truncate">{restricted ? "On" : "Off"}</span>
              </span>
              <Image
                src="/icons/chevron_forward_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
                alt="Change Restricted Mode"
                width={24}
                height={24}
              />
            </button>
            <button
              type="button"
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
                <span className="truncate">United States</span>
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
                src="/icons/settings_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt="Settings"
                width={24}
                height={24}
              />
              <span className="text-sm text-secondary-foreground font-medium">Settings</span>
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

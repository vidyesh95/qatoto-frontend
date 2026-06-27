"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOut, useSession } from "@/lib/auth-client";
import {
  AppearancePanel,
  THEME_SUMMARY,
  type Theme,
} from "@/components/home/account/menus/appearance-menu";
import { LanguagePanel } from "@/components/home/account/menus/language-menu";
import {
  countryName,
  DEFAULT_COUNTRY_CODE,
  LocationPanel,
} from "@/components/home/account/menus/location-menu";
import { ChildPanel } from "@/components/home/account/menus/child-menu";
import { IncognitoPanel } from "@/components/home/account/menus/incognito-menu";
import { AiAssistPanel } from "@/components/home/account/menus/ai-assist-menu";
import { SettingsPanel } from "@/components/home/account/menus/settings-menu";
import { SwitchAccountPanel } from "@/components/home/account/menus/switch-account-menu";

type AccountMenuProps = {
  /** Called when the menu should close — e.g. an outside click or after sign-out. */
  onClose: () => void;
};

/** Marketing/information pages, shown as a divider section near the foot of the menu. */
const INFORMATION_LINKS = [
  { label: "How Qatoto Works", href: "/how-qatoto-works" },
  { label: "About", href: "/about" },
  { label: "Press", href: "/press" },
  { label: "Blogs", href: "/blogs" },
  { label: "Contact Us", href: "/contact-us" },
  { label: "Creator", href: "/creator" },
  { label: "Careers", href: "/careers" },
  { label: "Developers", href: "/developers" },
] as const;

/** Legal/policy pages, shown as the final divider section of the menu. */
const LEGAL_LINKS = [
  { label: "Terms and Conditions", href: "/terms-and-conditions" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Copyright Policy", href: "/copyright-policy" },
  { label: "Community Guidelines", href: "/community-guidelines" },
  { label: "Vulnerability Disclosure Policy", href: "/vulnerability-disclosure-policy" },
] as const;

/** Which panel of the account menu is currently visible. */
type MenuView =
  | "main"
  | "appearance"
  | "child"
  | "incognito"
  | "ai-assist"
  | "language"
  | "location"
  | "settings"
  | "switch-account";

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

  // Signed-in user's name + avatar come from the Better Auth session (get-session).
  const { data: session } = useSession();

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
  useEffect(() => {
    menuPanelRef.current?.scrollTo({ top: 0 });
  }, [view]);

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
      className="fixed top-15 right-14 left-1 z-50 max-h-[calc(100dvh-9rem)] w-auto overflow-y-auto rounded-lg border border-black/10 bg-background shadow-lg sm:absolute sm:top-12 sm:right-2 sm:left-auto sm:max-h-[calc(100dvh-4rem)] sm:w-95"
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
      ) : view === "switch-account" ? (
        <SwitchAccountPanel onBack={() => setView("main")} onSignOutAll={handleSignOut} />
      ) : (
        <div className="space-y-8">
          <div className="rounded-lg bg-secondary">
            <header className="rounded-lg bg-background">
              <div className="flex w-full flex-row">
                <div className="min-w-0 flex-1">
                  <div className="w-full py-4 pl-4">
                    <p className="w-full truncate text-base text-[#041F21]">
                      {session?.user.name ?? "董雪博士"}
                    </p>
                    <p className="w-full truncate text-xs text-[#041F21]">
                      @{session?.user.handle ?? "…"}
                    </p>
                  </div>
                  <p className="ml-4 flex w-full gap-1 text-4xl text-[#1DBDC5]">
                    <span>Level</span>
                    <span className="min-w-0 flex-1 truncate">1</span>
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-4 p-4">
                  <button
                    type="button"
                    onClick={() => setView("settings")}
                    aria-label="Open settings"
                    className="cursor-pointer rounded-full"
                  >
                    <Image
                      src={session?.user.image ?? "/dummy/profile_photo_girl.avif"}
                      alt="Account"
                      width={40}
                      height={40}
                      className="rounded-full ring-1 ring-primary"
                    />
                  </button>
                  <button
                    type="button"
                    className="w-fit cursor-pointer rounded-full bg-secondary px-2 py-1 text-xs text-secondary-foreground"
                  >
                    Check-in
                  </button>
                </div>
              </div>
              <div className="flex w-full flex-row gap-4 p-4">
                <div className="flex w-full flex-col items-center rounded-sm bg-primary p-2">
                  <div className="flex flex-row items-center">
                    <span className="w-full truncate text-right text-sm">0</span>
                    <Image
                      src="/icons/paid_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                      alt="Coins"
                      width={24}
                      height={24}
                    />
                  </div>
                  <p className="text-sm">Coins</p>
                </div>
                <div className="flex w-full flex-col items-center rounded-sm bg-primary p-2">
                  <div className="flex flex-row items-center">
                    <span className="w-full truncate text-right text-sm">0</span>
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
              className="flex w-full cursor-pointer flex-row items-center gap-4 p-4"
            >
              <Image
                src="/icons/workspace_premium_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt="Premium membership"
                width={24}
                height={24}
              />
              <span className="text-sm font-medium text-secondary-foreground">
                Premium membership
              </span>
            </button>
          </div>

          <div>
            <Link
              href="/library"
              onClick={onClose}
              className="flex w-full cursor-pointer flex-row items-center gap-4 p-4 transition-colors hover:bg-muted"
            >
              <Image
                src="/icons/video_library_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt="Your channel"
                width={24}
                height={24}
              />
              <span className="text-sm font-medium text-secondary-foreground">Library</span>
            </Link>
            <Link
              href="/history"
              onClick={onClose}
              className="flex w-full cursor-pointer flex-row items-center gap-4 p-4 transition-colors hover:bg-muted"
            >
              <Image
                src="/icons/history_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt="Your channel"
                width={24}
                height={24}
              />
              <span className="text-sm font-medium text-secondary-foreground">History</span>
            </Link>
            <Link
              href="/wishlist"
              onClick={onClose}
              className="flex w-full cursor-pointer flex-row items-center gap-4 p-4 transition-colors hover:bg-muted"
            >
              <Image
                src="/icons/favorite_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt="Your wishlist"
                width={24}
                height={24}
              />
              <span className="text-sm font-medium text-secondary-foreground">Wishlist</span>
            </Link>
            <Link
              href="/cart"
              onClick={onClose}
              className="flex w-full cursor-pointer flex-row items-center gap-4 p-4 transition-colors hover:bg-muted"
            >
              <Image
                src="/icons/shopping_cart_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt="Your cart"
                width={24}
                height={24}
              />
              <span className="text-sm font-medium text-secondary-foreground">Cart</span>
            </Link>
            <Link
              href="/orders-and-returns"
              onClick={onClose}
              className="flex w-full cursor-pointer flex-row items-center gap-4 p-4 transition-colors hover:bg-muted"
            >
              <Image
                src="/icons/local_shipping_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt="Your orders"
                width={24}
                height={24}
              />
              <span className="text-sm font-medium text-secondary-foreground">
                Orders and returns
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setView("settings")}
              className="flex w-full cursor-pointer flex-row items-center gap-4 p-4 transition-colors hover:bg-muted"
            >
              <Image
                src="/icons/settings_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt="Settings"
                width={24}
                height={24}
              />
              <span className="w-full text-left text-sm font-medium text-secondary-foreground">
                Settings
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
              onClick={() => setView("switch-account")}
              className="flex w-full cursor-pointer flex-row items-center gap-4 p-4 transition-colors hover:bg-muted"
            >
              <Image
                src="/icons/switch_account_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt="Switch account"
                width={24}
                height={24}
              />
              <span className="text-sm font-medium text-secondary-foreground">Switch account</span>
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full cursor-pointer flex-row items-center gap-4 p-4 transition-colors hover:bg-muted"
            >
              <Image
                src="/icons/logout_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt="Sign out"
                width={24}
                height={24}
              />
              <span className="text-sm font-medium text-secondary-foreground">Sign out</span>
            </button>
            <hr className="mx-4" />
            <button
              type="button"
              onClick={() => setView("appearance")}
              className="flex w-full cursor-pointer flex-row items-center gap-4 p-4 transition-colors hover:bg-muted"
            >
              <Image
                src="/icons/dark_mode_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt="Appearance"
                width={24}
                height={24}
              />
              <span className="flex min-w-0 flex-1 gap-1 text-sm font-medium text-secondary-foreground">
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
              className="flex w-full cursor-pointer flex-row items-center gap-4 p-4 transition-colors hover:bg-muted"
            >
              <Image
                src="/icons/translate_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt="Language"
                width={24}
                height={24}
              />
              <span className="flex min-w-0 flex-1 gap-1 text-sm font-medium text-secondary-foreground">
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
              className="flex w-full cursor-pointer flex-row items-center gap-4 p-4 transition-colors hover:bg-muted"
            >
              <Image
                src="/icons/child_care_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt="Child Mode"
                width={24}
                height={24}
              />
              <span className="flex min-w-0 flex-1 gap-1 text-sm font-medium text-secondary-foreground">
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
              className="flex w-full cursor-pointer flex-row items-center gap-4 p-4 transition-colors hover:bg-muted"
            >
              <Image
                src="/icons/account_circle_off_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt="Incognito Mode"
                width={24}
                height={24}
              />
              <span className="flex min-w-0 flex-1 gap-1 text-sm font-medium text-secondary-foreground">
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
              className="flex w-full cursor-pointer flex-row items-center gap-4 p-4 transition-colors hover:bg-muted"
            >
              <Image
                src="/icons/assistant_navigation_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt="AI Assist Mode"
                width={24}
                height={24}
              />
              <span className="flex min-w-0 flex-1 gap-1 text-sm font-medium text-secondary-foreground">
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
              className="flex w-full cursor-pointer flex-row items-center gap-4 p-4 transition-colors hover:bg-muted"
            >
              <Image
                src="/icons/location_on_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt="Location"
                width={24}
                height={24}
              />
              <span className="flex min-w-0 flex-1 gap-1 text-sm font-medium text-secondary-foreground">
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
              className="flex w-full cursor-pointer flex-row items-center gap-4 p-4 transition-colors hover:bg-muted"
            >
              <Image
                src="/icons/forum_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt="Forum"
                width={24}
                height={24}
              />
              <span className="text-sm font-medium text-secondary-foreground">Forum</span>
            </button>
            <button
              type="button"
              className="flex w-full cursor-pointer flex-row items-center gap-4 p-4 transition-colors hover:bg-muted"
            >
              <Image
                src="/icons/help_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt="Help"
                width={24}
                height={24}
              />
              <span className="text-sm font-medium text-secondary-foreground">Help</span>
            </button>
            <Link
              href="/customer-service"
              onClick={onClose}
              className="flex w-full cursor-pointer flex-row items-center gap-4 p-4 transition-colors hover:bg-muted"
            >
              <Image
                src="/icons/support_agent_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt="Send feedback"
                width={24}
                height={24}
              />
              <span className="text-sm font-medium text-secondary-foreground">
                Customer service
              </span>
            </Link>
            <button
              type="button"
              className="flex w-full cursor-pointer flex-row items-center gap-4 p-4 transition-colors hover:bg-muted"
            >
              <Image
                src="/icons/rate_review_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt="Send feedback"
                width={24}
                height={24}
              />
              <span className="text-sm font-medium text-secondary-foreground">Send feedback</span>
            </button>
            <hr className="mx-4" />
            {INFORMATION_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className="flex w-full cursor-pointer flex-row items-center gap-4 p-4 transition-colors hover:bg-muted"
              >
                <span className="text-sm font-medium text-secondary-foreground">{link.label}</span>
              </Link>
            ))}
            <hr className="mx-4" />
            {LEGAL_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className="flex w-full cursor-pointer flex-row items-center gap-4 p-4 transition-colors hover:bg-muted"
              >
                <span className="text-sm font-medium text-secondary-foreground">{link.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

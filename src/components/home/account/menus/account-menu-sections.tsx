"use client";

import Image from "next/image";
import Link from "next/link";
import { countryName } from "@/lib/countries";
import type { BrowserPreferences } from "@/lib/browser-preferences";
import type { AccountMenuView } from "@/components/home/account/menus/account-menu-main-view";

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
  { label: "Roadmap", href: "/roadmap" },
] as const;

/** Legal/policy pages, shown as the final divider section of the menu. */
const LEGAL_LINKS = [
  { label: "Terms and Conditions", href: "/terms-and-conditions" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Copyright Policy", href: "/copyright-policy" },
  { label: "Community Guidelines", href: "/community-guidelines" },
  { label: "Vulnerability Disclosure Policy", href: "/vulnerability-disclosure-policy" },
] as const;

export function AccountMenuUserCard({
  userName,
  userHandle,
  userImage,
  onViewChange,
}: {
  readonly userName?: string | null;
  readonly userHandle?: string | null;
  readonly userImage?: string | null;
  readonly onViewChange: (view: AccountMenuView) => void;
}) {
  return (
    <div className="rounded-lg bg-secondary">
      <header className="rounded-lg bg-background">
        <div className="flex w-full flex-row">
          <div className="min-w-0 flex-1">
            <div className="w-full py-4 pl-4">
              <p className="w-full truncate text-base text-foreground">{userName ?? "董雪博士"}</p>
              <p className="w-full truncate text-xs text-foreground">@{userHandle ?? "…"}</p>
            </div>
            <p className="ml-4 flex w-full gap-1 text-4xl text-primary-imprint">
              <span>Level</span>
              <span className="min-w-0 flex-1 truncate">1</span>
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-4 p-4">
            <button
              type="button"
              onClick={() => onViewChange("settings")}
              aria-label="Open settings"
              className="cursor-pointer rounded-full"
            >
              <Image
                src={userImage ?? "/dummy/profile_photo_girl.avif"}
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
      <button type="button" className="flex w-full cursor-pointer flex-row items-center gap-4 p-4">
        <Image
          src="/icons/workspace_premium_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
          alt="Premium membership"
          width={24}
          height={24}
        />
        <span className="text-sm font-medium text-secondary-foreground">Premium membership</span>
      </button>
    </div>
  );
}

export function AccountMenuNavList({
  onViewChange,
  onSignOut,
  onClose,
}: {
  readonly onViewChange: (view: AccountMenuView) => void;
  readonly onSignOut: () => void;
  readonly onClose: () => void;
}) {
  return (
    <>
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
          src="/icons/bookmark_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
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
        <span className="text-sm font-medium text-secondary-foreground">Orders and returns</span>
      </Link>
      <Link
        href="/messages"
        onClick={onClose}
        className="flex w-full cursor-pointer flex-row items-center gap-4 p-4 transition-colors hover:bg-muted"
      >
        <Image
          src="/icons/forum_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
          alt="Your conversations"
          width={24}
          height={24}
        />
        <span className="text-sm font-medium text-secondary-foreground">Messages</span>
      </Link>
      <Link
        href="/disputes"
        onClick={onClose}
        className="flex w-full cursor-pointer flex-row items-center gap-4 p-4 transition-colors hover:bg-muted"
      >
        <Image
          src="/icons/flag_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
          alt="Your disputes"
          width={24}
          height={24}
        />
        <span className="text-sm font-medium text-secondary-foreground">Disputes</span>
      </Link>
      <button
        type="button"
        onClick={() => onViewChange("settings")}
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
        onClick={() => onViewChange("switch-account")}
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
        onClick={onSignOut}
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
    </>
  );
}

export function AccountMenuPreferencesAndSupport({
  preferences,
  onViewChange,
  onClose,
  onSendFeedback,
}: {
  readonly preferences: BrowserPreferences;
  readonly onViewChange: (view: AccountMenuView) => void;
  readonly onClose: () => void;
  readonly onSendFeedback: () => void;
}) {
  return (
    <>
      <hr className="mx-4" />
      <button
        type="button"
        onClick={() => onViewChange("language")}
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
          <span className="truncate">{preferences.language}</span>
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
        onClick={() => onViewChange("ai-assist")}
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
          <span className="truncate">{preferences.isAiAssistModeOn ? "On" : "Off"}</span>
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
        onClick={() => onViewChange("location")}
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
          <span className="truncate">{countryName(preferences.countryCode)}</span>
        </span>
        <Image
          src="/icons/chevron_forward_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
          alt="Change Location"
          width={24}
          height={24}
        />
      </button>
      <hr className="mx-4" />
      <a
        href="https://github.com/vidyesh95/qatoto-frontend/discussions"
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full cursor-pointer flex-row items-center gap-4 p-4 transition-colors hover:bg-muted"
      >
        <Image
          src="/icons/forum_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
          alt="Forum"
          width={24}
          height={24}
        />
        <span className="text-sm font-medium text-secondary-foreground">Forum</span>
      </a>
      <Link
        href="/customer-service"
        onClick={onClose}
        className="flex w-full cursor-pointer flex-row items-center gap-4 p-4 transition-colors hover:bg-muted"
      >
        <Image
          src="/icons/support_agent_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
          alt=""
          width={24}
          height={24}
        />
        <span className="text-sm font-medium text-secondary-foreground">Customer service</span>
      </Link>
      <button
        type="button"
        onClick={onSendFeedback}
        className="flex w-full cursor-pointer flex-row items-center gap-4 p-4 transition-colors hover:bg-muted"
      >
        <Image
          src="/icons/rate_review_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
          alt=""
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
    </>
  );
}

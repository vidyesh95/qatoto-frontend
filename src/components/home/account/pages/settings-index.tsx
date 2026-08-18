// TRANSPORT: props-only — every value comes from `localStorage` via the preferences context.
"use client";

// THE `/settings` INDEX: the six browser-local preferences, each showing what it is currently set
// to, each a real URL.
//
// NOTHING HERE TALKS TO THE BACKEND, and that is the honest shape rather than a gap. These six are
// device preferences with no server counterpart — the whole `/users` write surface is name, photo
// and handle. The Appearance panel has always said "Setting applies to this browser only"; this
// page keeps that promise literally.
//
// The summaries reuse `THEME_SUMMARY` and `countryName`, which have been exported with no caller
// outside their own files since they were written.

import Image from "next/image";
import Link from "next/link";

import { THEME_SUMMARY } from "@/components/home/account/menus/appearance-menu";
import { countryName } from "@/components/home/account/menus/location-menu";
import { useBrowserPreferences } from "@/state/browser-preferences-context";

export default function SettingsIndex() {
  const { preferences } = useBrowserPreferences();

  const rows = [
    {
      label: "Appearance",
      value: THEME_SUMMARY[preferences.theme],
      href: "/settings/appearance",
      icon: "/icons/dark_mode_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    },
    {
      label: "Language",
      value: preferences.language,
      href: "/settings/language",
      icon: "/icons/translate_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    },
    {
      label: "Browse location",
      value: countryName(preferences.countryCode),
      href: "/settings/location",
      icon: "/icons/location_on_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    },
    {
      label: "Child mode",
      value: preferences.isChildModeOn ? "On" : "Off",
      href: "/settings/child-mode",
      icon: "/icons/child_care_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    },
    {
      label: "Incognito mode",
      value: preferences.isIncognitoModeOn ? "On" : "Off",
      href: "/settings/incognito-mode",
      icon: "/icons/account_circle_off_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    },
    {
      label: "AI assist mode",
      value: preferences.isAiAssistModeOn ? "On" : "Off",
      href: "/settings/ai-assist-mode",
      icon: "/icons/assistant_navigation_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    },
  ];

  return (
    <div>
      <header className="px-4 pt-4 lg:px-6">
        <h1 className="font-serif text-2xl font-semibold text-foreground md:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          These apply to this browser only and are not synced to your account.
        </p>
      </header>

      <ul className="mt-3">
        {rows.map((row) => (
          <li key={row.href}>
            <Link
              href={row.href}
              className="flex w-full flex-row items-center gap-4 p-4 transition-colors hover:bg-muted lg:px-6"
            >
              <Image src={row.icon} alt="" width={24} height={24} className="size-6 shrink-0" />
              <span className="flex min-w-0 flex-1 flex-col text-left">
                <span className="text-sm font-medium text-secondary-foreground">{row.label}</span>
                <span className="truncate text-xs text-muted-foreground">{row.value}</span>
              </span>
              <Image
                src="/icons/chevron_forward_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
                alt=""
                width={24}
                height={24}
                className="size-6 shrink-0"
              />
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-6 px-4 lg:px-6">
        <Link
          href="/your-account"
          className="text-sm font-medium text-secondary-foreground underline underline-offset-4"
        >
          Your account — name, handle, sign-in methods
        </Link>
      </div>
    </div>
  );
}

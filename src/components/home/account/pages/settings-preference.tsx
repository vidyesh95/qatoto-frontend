// TRANSPORT: props-only — reads and writes `localStorage` through the preferences context.
"use client";

// THE HOST FOR EVERY `/settings/*` SUB-ROUTE.
//
// One component, one exhaustive switch, three URLs — same reasoning as `your-account-panel.tsx`.
// Each panel is already a controlled component (`selected` / `onSelect` / `onBack`), so all this
// does is point `selected` at the stored preference and `onSelect` at the setter that persists it.
// A fourth preference is a compile error here until it is handled.
//
// Appearance, Child mode and Incognito mode were removed rather than left as controls promising
// behaviour the product will not have. Appearance took dark mode with it — it was the only thing
// that ever set `.dark` on `<html>`.

import { useRouter } from "next/navigation";

import { AiAssistPanel } from "@/components/home/account/menus/ai-assist-menu";
import { LanguagePanel } from "@/components/home/account/menus/language-menu";
import { LocationPanel } from "@/components/home/account/menus/location-menu";
import { useBrowserPreferences } from "@/state/browser-preferences-context";

/** One `/settings/<segment>`. The values ARE the URL segments — keep them in step. */
export type SettingsPreferenceKind = "language" | "location" | "ai-assist-mode";

export default function SettingsPreference({ preference }: { preference: SettingsPreferenceKind }) {
  const router = useRouter();
  const { preferences, setPreference } = useBrowserPreferences();

  const handleBack = () => router.push("/settings");

  switch (preference) {
    case "language":
      return (
        <LanguagePanel
          selected={preferences.language}
          onSelect={(language) => setPreference("language", language)}
          onBack={handleBack}
        />
      );

    case "location":
      return (
        <LocationPanel
          selected={preferences.countryCode}
          onSelect={(countryCode) => setPreference("countryCode", countryCode)}
          onBack={handleBack}
        />
      );

    case "ai-assist-mode":
      return (
        <AiAssistPanel
          selected={preferences.isAiAssistModeOn}
          onSelect={(isAiAssistModeOn) => setPreference("isAiAssistModeOn", isAiAssistModeOn)}
          onBack={handleBack}
        />
      );

    default: {
      const exhaustiveCheck: never = preference;
      return exhaustiveCheck;
    }
  }
}

// TRANSPORT: props-only — reads and writes `localStorage` through the preferences context.
"use client";

// THE HOST FOR EVERY `/settings/*` SUB-ROUTE.
//
// One component, one exhaustive switch, six URLs — same reasoning as `your-account-panel.tsx`. Each
// panel is already a controlled component (`selected` / `onSelect` / `onBack`), so all this does is
// point `selected` at the stored preference and `onSelect` at the setter that persists it. A
// seventh preference is a compile error here until it is handled.

import { useRouter } from "next/navigation";

import { AiAssistPanel } from "@/components/home/account/menus/ai-assist-menu";
import { AppearancePanel } from "@/components/home/account/menus/appearance-menu";
import { ChildPanel } from "@/components/home/account/menus/child-menu";
import { IncognitoPanel } from "@/components/home/account/menus/incognito-menu";
import { LanguagePanel } from "@/components/home/account/menus/language-menu";
import { LocationPanel } from "@/components/home/account/menus/location-menu";
import { useBrowserPreferences } from "@/state/browser-preferences-context";

/** One `/settings/<segment>`. The values ARE the URL segments — keep them in step. */
export type SettingsPreferenceKind =
  | "appearance"
  | "language"
  | "location"
  | "child-mode"
  | "incognito-mode"
  | "ai-assist-mode";

export default function SettingsPreference({ preference }: { preference: SettingsPreferenceKind }) {
  const router = useRouter();
  const { preferences, setPreference } = useBrowserPreferences();

  const handleBack = () => router.push("/settings");

  switch (preference) {
    case "appearance":
      return (
        <AppearancePanel
          selected={preferences.theme}
          onSelect={(theme) => setPreference("theme", theme)}
          onBack={handleBack}
        />
      );

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

    case "child-mode":
      return (
        <ChildPanel
          selected={preferences.isChildModeOn}
          onSelect={(isChildModeOn) => setPreference("isChildModeOn", isChildModeOn)}
          onBack={handleBack}
        />
      );

    case "incognito-mode":
      return (
        <IncognitoPanel
          selected={preferences.isIncognitoModeOn}
          onSelect={(isIncognitoModeOn) => setPreference("isIncognitoModeOn", isIncognitoModeOn)}
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

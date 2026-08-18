"use client";

// TRANSPORT: props-only — the store behind it is `window.localStorage`, never the network.
//
// The second piece of cross-component client state in this app, beside `sidebar-context.tsx`. It
// exists because the SAME six preferences are now edited from two places — the account dropdown
// and `/settings` — and a preference set in one that is not true in the other is a bug a user can
// see in about four seconds.
//
// WHY THE SERVER RENDER IS ALWAYS THE DEFAULTS. `localStorage` does not exist during SSR, so the
// HTML can only ever contain `DEFAULT_BROWSER_PREFERENCES`; reading storage in a `useState`
// initializer would make the hydration render disagree with that HTML and React would throw away
// the subtree. So the stored values are ADOPTED IN AN EFFECT, one render later. That is a normal
// state update, not a mismatch — `use-viewer-signed-in.ts` documents the class of bug this avoids.
//
// The THEME is the one preference that cannot wait a render, and it does not: a blocking inline
// script in the root `<head>` (`THEME_BOOTSTRAP_SCRIPT`) has already put `.dark` on `<html>`
// before this component's first render. The effect below only keeps it in step afterwards.

import { createContext, use, useCallback, useEffect, useState, type ReactNode } from "react";

import {
  applyThemeToDocument,
  DEFAULT_BROWSER_PREFERENCES,
  readStoredBrowserPreferences,
  writeStoredBrowserPreferences,
  type BrowserPreferences,
} from "@/lib/browser-preferences";

interface BrowserPreferencesContextValue {
  readonly preferences: BrowserPreferences;
  /** Sets one preference and persists the whole object. */
  readonly setPreference: <PreferenceKey extends keyof BrowserPreferences>(
    key: PreferenceKey,
    value: BrowserPreferences[PreferenceKey],
  ) => void;
}

const BrowserPreferencesContext = createContext<BrowserPreferencesContextValue | undefined>(
  undefined,
);

export function BrowserPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<BrowserPreferences>(DEFAULT_BROWSER_PREFERENCES);

  // Whether the stored values have been read yet. Until they have, `preferences` holds the
  // defaults the server rendered, and applying THEM as a theme would flip the class the bootstrap
  // script already set correctly — a light flash, one render wide, on every load. So the theme
  // effect below waits for this.
  const [isStoredPreferencesAdopted, setIsStoredPreferencesAdopted] = useState(false);

  useEffect(() => {
    setPreferences(readStoredBrowserPreferences());
    setIsStoredPreferencesAdopted(true);
  }, []);

  // Keep `<html class="dark">` in step with the chosen theme, and — while the choice is "device" —
  // with the OS setting changing under a page that is already open.
  useEffect(() => {
    if (!isStoredPreferencesAdopted) return undefined;

    applyThemeToDocument(preferences.theme);
    if (preferences.theme !== "device") return undefined;

    const darkSchemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleDeviceThemeChange = () => applyThemeToDocument("device");
    darkSchemeQuery.addEventListener("change", handleDeviceThemeChange);
    return () => darkSchemeQuery.removeEventListener("change", handleDeviceThemeChange);
  }, [isStoredPreferencesAdopted, preferences.theme]);

  // Persisting happens HERE and not in an effect on `preferences`, deliberately. An effect would
  // also fire on the adopt render above, writing the defaults back over storage in the window
  // before the read landed — and on a slow first paint that window is real. A preference is only
  // ever changed by a person clicking something, which is always after mount.
  const setPreference = useCallback(
    <PreferenceKey extends keyof BrowserPreferences>(
      key: PreferenceKey,
      value: BrowserPreferences[PreferenceKey],
    ) => {
      setPreferences((currentPreferences) => {
        const nextPreferences = { ...currentPreferences, [key]: value };
        writeStoredBrowserPreferences(nextPreferences);
        return nextPreferences;
      });
    },
    [],
  );

  return (
    <BrowserPreferencesContext.Provider value={{ preferences, setPreference }}>
      {children}
    </BrowserPreferencesContext.Provider>
  );
}

export function useBrowserPreferences() {
  const context = use(BrowserPreferencesContext);
  if (context === undefined) {
    throw new Error("useBrowserPreferences must be used within a BrowserPreferencesProvider");
  }
  return context;
}

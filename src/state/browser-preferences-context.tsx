"use client";

// TRANSPORT: props-only — the store behind it is `window.localStorage`, never the network.
//
// The second piece of cross-component client state in this app, beside `sidebar-context.tsx`. It
// exists because the SAME three preferences are edited from two places — the account dropdown and
// `/settings` — and a preference set in one that is not true in the other is a bug a user can see
// in about four seconds.
//
// WHY THE SERVER RENDER IS ALWAYS THE DEFAULTS. `localStorage` does not exist during SSR, so the
// HTML can only ever contain `DEFAULT_BROWSER_PREFERENCES`; reading storage in a `useState`
// initializer would make the hydration render disagree with that HTML and React would throw away
// the subtree. So the stored values are ADOPTED IN AN EFFECT, one render later. That is a normal
// state update, not a mismatch — `use-viewer-signed-in.ts` documents the class of bug this avoids.
//
// NOTHING HERE TOUCHES THE DOCUMENT ANY MORE. This provider used to also drive the theme — apply
// `.dark` to `<html>`, subscribe to `prefers-color-scheme` — and that went when Appearance did.
// Every surviving preference is a value the UI reads, not a side effect.

import { createContext, use, useCallback, useEffect, useState, type ReactNode } from "react";

import {
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

  useEffect(() => {
    setPreferences(readStoredBrowserPreferences());
  }, []);

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

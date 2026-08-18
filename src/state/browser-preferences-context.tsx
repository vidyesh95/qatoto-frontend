"use client";

// TRANSPORT: props-only — the store behind it is `window.localStorage`, never the network.
//
// The second piece of cross-component client state in this app, beside `sidebar-context.tsx`. It
// exists because the three preferences must outlive the dropdown that edits them: they are set in a
// panel that closes, and a value discarded on close is a control that does nothing. The store is
// shared rather than local so any future reader sees the same value the dropdown last wrote.
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
  clearStoredBrowserPreferences,
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
  /** Erases the stored blob and returns every preference to its default, for this browser. */
  readonly clearPreferences: () => void;
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

  // THE STORAGE REMOVAL AND THE STATE RESET ARE ONE ACTION, not two a caller could get half of.
  // "Your data & privacy" offers this as an erasure; leaving the adopted values in memory would
  // mean the panels still show a country the device no longer remembers, and the next
  // `setPreference` would write that stale value straight back into the key just removed.
  const clearPreferences = useCallback(() => {
    clearStoredBrowserPreferences();
    setPreferences(DEFAULT_BROWSER_PREFERENCES);
  }, []);

  return (
    <BrowserPreferencesContext.Provider value={{ preferences, setPreference, clearPreferences }}>
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

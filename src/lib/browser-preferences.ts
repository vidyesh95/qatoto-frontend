// TRANSPORT: props-only — reads and writes `window.localStorage`, never the network.
//
// THE THREE BROWSER-LOCAL PREFERENCES, AND WHY THEY ARE BROWSER-LOCAL.
//
// Language, browse country and AI assist mode were `useState` in
// `components/home/account/menus/account-menu.tsx` until this file existed, which meant closing the
// account dropdown discarded every one of them. That was survivable for a dropdown and is not
// survivable for `/settings`: a settings page that forgets what you set the moment you navigate is
// worse than no settings page.
//
// THERE WERE SIX. Appearance, child mode and incognito mode were removed rather than left as
// controls promising behaviour the product is not going to have. Appearance took the whole theme
// system with it — it was the only thing that ever wrote `.dark` onto `<html>` — so there is no
// pre-paint bootstrap script, no `prefers-color-scheme` subscription and no dark palette any more.
// A stored blob from before that removal still carries the three dead keys; see the schema below
// for why that is a non-event.
//
// THEY ARE STORED ON THE DEVICE AND SYNCED NOWHERE. The backend has no preferences endpoint and is
// not getting one for these — `PATCH /users/me`, `/users/me/photo`, `/users/me/handle` and
// `GET /users/me/linked-accounts` are the whole `/users` write surface. Each panel's own copy
// already promises this ("Setting applies to this browser only").
//
// NEITHER OF THE THREE IS A TRUST BOUNDARY, and `countryCode` is the one worth saying twice:
// CLAUDE.md names the browse-country selector as a DISPLAY PREFERENCE ONLY. The backend must never
// take a client-claimed country for tax, pricing, geo-restriction or fraud — it re-derives that
// from IP, verified account region and payment country.
//
// LOCALSTORAGE IS AN UNTRUSTED BOUNDARY. Anyone can open devtools and put `{"language":42}` in that
// key, so the stored blob is read as `unknown` and parsed, never asserted (CLAUDE.md Pattern 2).

import { z } from "zod";

/**
 * Default browse market when nobody has chosen one.
 *
 * IT LIVES HERE RATHER THAN IN `location-menu.tsx`, WHICH RE-EXPORTS IT, because that file is
 * `"use client"` and this module is read from server-rendered code. A runtime import of a client
 * module would turn this one into a client reference and `DEFAULT_BROWSER_PREFERENCES` would be a
 * proxy rather than an object by the time it was evaluated.
 */
export const DEFAULT_COUNTRY_CODE = "US";

/** The single key. One read, one write, one parse — not three keys racing each other. */
export const BROWSER_PREFERENCES_STORAGE_KEY = "qatoto.browser-preferences";

/** Every browser-local preference, as one value. */
export interface BrowserPreferences {
  readonly language: string;
  readonly countryCode: string;
  readonly isAiAssistModeOn: boolean;
}

/**
 * What a browser with nothing stored gets, and what the SERVER renders.
 *
 * These reuse the values the panels already default to, so a visitor who has never opened settings
 * sees exactly what they saw before this file existed.
 */
export const DEFAULT_BROWSER_PREFERENCES: BrowserPreferences = {
  language: "English",
  countryCode: DEFAULT_COUNTRY_CODE,
  isAiAssistModeOn: false,
};

/**
 * `.partial()` so a blob written by an older build cannot fail wholesale and wipe the preferences
 * it *does* carry, and `.strip()` so keys this build no longer knows about are dropped silently.
 *
 * THAT PAIR IS WHY REMOVING THREE PREFERENCES NEEDED NO MIGRATION. A returning visitor's blob still
 * has `theme`, `isChildModeOn` and `isIncognitoModeOn` in it; `.strip()` discards them and the
 * surviving three parse normally. The dead keys linger in storage harmlessly — a migration would be
 * more code than the bytes it reclaims.
 */
const StoredBrowserPreferencesSchema = z
  .object({
    language: z.string(),
    countryCode: z.string(),
    isAiAssistModeOn: z.boolean(),
  })
  .partial()
  .strip();

/**
 * Reads the stored preferences, merged over the defaults.
 *
 * Returns the defaults unchanged on the server, in a browser with storage disabled (Safari private
 * mode throws on access, it does not return null), on malformed JSON, and on a blob that fails the
 * schema. There is no error to surface: a preference that cannot be read is a preference that was
 * never set.
 */
export function readStoredBrowserPreferences(): BrowserPreferences {
  if (typeof window === "undefined") return DEFAULT_BROWSER_PREFERENCES;

  let rawStoredValue: string | null;
  try {
    rawStoredValue = window.localStorage.getItem(BROWSER_PREFERENCES_STORAGE_KEY);
  } catch {
    return DEFAULT_BROWSER_PREFERENCES;
  }
  if (rawStoredValue === null) return DEFAULT_BROWSER_PREFERENCES;

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawStoredValue);
  } catch {
    return DEFAULT_BROWSER_PREFERENCES;
  }

  const parsed = StoredBrowserPreferencesSchema.safeParse(parsedJson);
  if (!parsed.success) return DEFAULT_BROWSER_PREFERENCES;

  return { ...DEFAULT_BROWSER_PREFERENCES, ...parsed.data };
}

/** Writes the whole object back. A failed write is silent for the same reason a failed read is. */
export function writeStoredBrowserPreferences(preferences: BrowserPreferences): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BROWSER_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Storage disabled or over quota. The preference still applies for this page's lifetime.
  }
}

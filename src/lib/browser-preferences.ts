// TRANSPORT: props-only — reads and writes `window.localStorage`, never the network.
//
// THE SIX BROWSER-LOCAL PREFERENCES, AND WHY THEY ARE BROWSER-LOCAL.
//
// Appearance, language, country, child mode, incognito mode and AI assist mode were `useState` in
// `components/home/account/menus/account-menu.tsx` until this file existed, which meant closing the
// account dropdown discarded every one of them. That was survivable for a dropdown and is not
// survivable for `/settings`: a settings page that forgets what you set the moment you navigate is
// worse than no settings page.
//
// THEY ARE STORED ON THE DEVICE AND SYNCED NOWHERE. The backend has no preferences endpoint and is
// not getting one for these — `PATCH /users/me`, `/users/me/photo`, `/users/me/handle` and
// `GET /users/me/linked-accounts` are the whole `/users` write surface. The Appearance panel's own
// copy already promises this ("Setting applies to this browser only").
//
// NONE OF THE SIX IS A TRUST BOUNDARY, and `countryCode` is the one worth saying twice: CLAUDE.md
// names the browse-country selector as a DISPLAY PREFERENCE ONLY. The backend must never take a
// client-claimed country for tax, pricing, geo-restriction or fraud — it re-derives that from IP,
// verified account region and payment country. Child mode is the same shape: real content
// filtering is the backend's job, this flag only decides what this browser asks for.
//
// LOCALSTORAGE IS AN UNTRUSTED BOUNDARY. Anyone can open devtools and put `{"theme":42}` in that
// key, so the stored blob is read as `unknown` and parsed, never asserted (CLAUDE.md Pattern 2).
// The schema is `.partial()` on purpose: a blob written by an older build that predates a
// preference must not fail wholesale and wipe the five preferences it *does* carry.

import { z } from "zod";

import type { Theme } from "@/components/home/account/menus/appearance-menu";

/**
 * Default browse market when nobody has chosen one.
 *
 * IT LIVES HERE RATHER THAN IN `location-menu.tsx`, WHICH RE-EXPORTS IT, and the reason is that
 * this module is imported by the ROOT LAYOUT — a server component. Every panel under
 * `components/home/account/` is `"use client"`, so a runtime import of one would turn this whole
 * module into a client reference and `DEFAULT_BROWSER_PREFERENCES` would be a proxy rather than an
 * object by the time the layout evaluated it. `Theme` above is `import type`, which is erased, so
 * it costs nothing.
 */
export const DEFAULT_COUNTRY_CODE = "US";

/** The single key. One read, one write, one parse — not six keys racing each other. */
export const BROWSER_PREFERENCES_STORAGE_KEY = "qatoto.browser-preferences";

/** Every browser-local preference, as one value. */
export interface BrowserPreferences {
  readonly theme: Theme;
  readonly language: string;
  readonly countryCode: string;
  readonly isChildModeOn: boolean;
  readonly isIncognitoModeOn: boolean;
  readonly isAiAssistModeOn: boolean;
}

/**
 * What a browser with nothing stored gets, and what the SERVER renders.
 *
 * `language` and `countryCode` reuse the values the panels already default to, so a visitor who
 * has never opened settings sees exactly what they saw before this file existed.
 */
export const DEFAULT_BROWSER_PREFERENCES: BrowserPreferences = {
  theme: "device",
  language: "English",
  countryCode: DEFAULT_COUNTRY_CODE,
  isChildModeOn: false,
  isIncognitoModeOn: false,
  isAiAssistModeOn: false,
};

/**
 * Partial on purpose — see the header. A missing key falls back to its default; a key of the
 * wrong type fails the whole parse and every preference falls back, which is the safe direction
 * for a blob somebody hand-edited.
 */
const StoredBrowserPreferencesSchema = z
  .object({
    theme: z.enum(["device", "dark", "light"]),
    language: z.string(),
    countryCode: z.string(),
    isChildModeOn: z.boolean(),
    isIncognitoModeOn: z.boolean(),
    isAiAssistModeOn: z.boolean(),
  })
  .partial()
  .strip();

/**
 * Reads the stored preferences, merged over the defaults.
 *
 * Returns the defaults unchanged on the server, in a browser with storage disabled (Safari
 * private mode throws on access, it does not return null), on malformed JSON, and on a blob that
 * fails the schema. There is no error to surface: a preference that cannot be read is a
 * preference that was never set.
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

/** Whether the dark palette should be on, resolving `"device"` against the OS setting. */
export function resolveIsDarkTheme(theme: Theme): boolean {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Puts the palette on `<html>`.
 *
 * `.dark` in `globals.css` redefines all 32 colour tokens, and every component that uses
 * `bg-background` / `text-foreground` follows it — so this one class is the whole theme and no
 * `dark:` variant is needed anywhere. The exception, stated so nobody hunts for it: the handful of
 * hardcoded Material-3 hexes (`text-[#041F21]`, `bg-[#00696E]`, `text-[#1DBDC5]`) do not follow
 * the tokens and do not flip. `shared/status-panel.tsx` documents the same split.
 */
export function applyThemeToDocument(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", resolveIsDarkTheme(theme));
}

/**
 * The pre-paint bootstrap, injected as a blocking inline `<script>` in the root `<head>`.
 *
 * IT HAS TO BE A STRING AND IT HAS TO BLOCK. React cannot do this job: the earliest a component
 * could set the class is an effect after hydration, by which point the light palette has already
 * been painted and the visitor sees a white flash on every load. This runs before the body exists.
 *
 * It duplicates `readStoredBrowserPreferences` + `applyThemeToDocument` in ES5, which is the cost
 * of running before the bundle. Keep the two in step — the key and the class name are the contract.
 */
export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var s=window.localStorage.getItem(${JSON.stringify(
  BROWSER_PREFERENCES_STORAGE_KEY,
)});var t=s?JSON.parse(s).theme:"device";if(t!=="dark"&&t!=="light")t="device";var d=t==="dark"||(t==="device"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

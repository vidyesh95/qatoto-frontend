import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  BROWSER_PREFERENCES_STORAGE_KEY,
  clearStoredBrowserPreferences,
  DEFAULT_BROWSER_PREFERENCES,
  getBrowserPreferencesSnapshot,
  readStoredBrowserPreferences,
  subscribeToBrowserPreferences,
  writeStoredBrowserPreferences,
  type BrowserPreferences,
} from "./browser-preferences";

describe("browser-preferences", () => {
  beforeEach(() => {
    window.localStorage.clear();
    clearStoredBrowserPreferences();
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("readStoredBrowserPreferences", () => {
    it("returns default preferences when nothing is stored", () => {
      const preferences = readStoredBrowserPreferences();
      expect(preferences).toEqual(DEFAULT_BROWSER_PREFERENCES);
    });

    it("parses valid stored preferences and merges them with defaults", () => {
      const customPreferences = {
        language: "Japanese",
        countryCode: "JP",
        isAiAssistModeOn: true,
        assistantDockSide: "left",
        assistantMascotSize: "large",
        assistantMascotSpeed: "fast",
        assistantMemoryNotes: ["Remember project alpha"],
      };

      window.localStorage.setItem(
        BROWSER_PREFERENCES_STORAGE_KEY,
        JSON.stringify(customPreferences),
      );

      const preferences = readStoredBrowserPreferences();
      expect(preferences.language).toBe("Japanese");
      expect(preferences.countryCode).toBe("JP");
      expect(preferences.isAiAssistModeOn).toBe(true);
      expect(preferences.assistantDockSide).toBe("left");
      expect(preferences.assistantMascotSize).toBe("large");
      expect(preferences.assistantMascotSpeed).toBe("fast");
      expect(preferences.assistantMemoryNotes).toEqual(["Remember project alpha"]);
      expect(preferences.assistantPreferredModel).toBeNull();
    });

    it("returns default preferences when storage contains malformed JSON", () => {
      window.localStorage.setItem(BROWSER_PREFERENCES_STORAGE_KEY, "{ invalid-json: ");

      const preferences = readStoredBrowserPreferences();
      expect(preferences).toEqual(DEFAULT_BROWSER_PREFERENCES);
    });

    it("returns default preferences when storage access throws an exception", () => {
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("SecurityError: Access is denied");
      });

      const preferences = readStoredBrowserPreferences();
      expect(preferences).toEqual(DEFAULT_BROWSER_PREFERENCES);
    });

    it("strips deprecated keys without failing schema validation", () => {
      const storedPayloadWithDeprecatedKeys = {
        language: "French",
        theme: "dark",
        isChildModeOn: true,
        isIncognitoModeOn: false,
      };

      window.localStorage.setItem(
        BROWSER_PREFERENCES_STORAGE_KEY,
        JSON.stringify(storedPayloadWithDeprecatedKeys),
      );

      const preferences = readStoredBrowserPreferences();
      expect(preferences.language).toBe("French");
      expect(preferences).not.toHaveProperty("theme");
      expect(preferences).not.toHaveProperty("isChildModeOn");
      expect(preferences).not.toHaveProperty("isIncognitoModeOn");
    });
  });

  describe("writeStoredBrowserPreferences and getBrowserPreferencesSnapshot", () => {
    it("writes preferences to localStorage and updates external store snapshot", () => {
      const updatedPreferences: BrowserPreferences = {
        ...DEFAULT_BROWSER_PREFERENCES,
        language: "German",
        countryCode: "DE",
        isAiAssistModeOn: true,
      };

      const writeSucceeded = writeStoredBrowserPreferences(updatedPreferences);
      expect(writeSucceeded).toBe(true);

      const storedRawValue = window.localStorage.getItem(BROWSER_PREFERENCES_STORAGE_KEY);
      expect(storedRawValue).not.toBeNull();
      expect(JSON.parse(storedRawValue ?? "{}")).toMatchObject({
        language: "German",
        countryCode: "DE",
        isAiAssistModeOn: true,
      });

      const snapshot = getBrowserPreferencesSnapshot();
      expect(snapshot.language).toBe("German");
      expect(snapshot.countryCode).toBe("DE");
      expect(snapshot.isAiAssistModeOn).toBe(true);
    });

    it("handles storage write errors gracefully by retaining in-memory snapshot and returning false", () => {
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });

      const updatedPreferences: BrowserPreferences = {
        ...DEFAULT_BROWSER_PREFERENCES,
        language: "Spanish",
      };

      const writeSucceeded = writeStoredBrowserPreferences(updatedPreferences);
      expect(writeSucceeded).toBe(false);

      const snapshot = getBrowserPreferencesSnapshot();
      expect(snapshot.language).toBe("Spanish");
    });
  });

  describe("subscribeToBrowserPreferences", () => {
    it("notifies subscriber callback when preferences are written or cleared", () => {
      const listenerCallback = vi.fn<() => void>();
      const unsubscribe = subscribeToBrowserPreferences(listenerCallback);

      writeStoredBrowserPreferences({
        ...DEFAULT_BROWSER_PREFERENCES,
        language: "Italian",
      });

      expect(listenerCallback).toHaveBeenCalledTimes(1);

      clearStoredBrowserPreferences();
      expect(listenerCallback).toHaveBeenCalledTimes(2);

      unsubscribe();

      writeStoredBrowserPreferences({
        ...DEFAULT_BROWSER_PREFERENCES,
        language: "Portuguese",
      });
      expect(listenerCallback).toHaveBeenCalledTimes(2);
    });
  });

  describe("clearStoredBrowserPreferences", () => {
    it("removes the item from localStorage and resets snapshot to defaults", () => {
      writeStoredBrowserPreferences({
        ...DEFAULT_BROWSER_PREFERENCES,
        language: "Swedish",
      });

      expect(window.localStorage.getItem(BROWSER_PREFERENCES_STORAGE_KEY)).not.toBeNull();

      clearStoredBrowserPreferences();

      expect(window.localStorage.getItem(BROWSER_PREFERENCES_STORAGE_KEY)).toBeNull();
      expect(getBrowserPreferencesSnapshot()).toEqual(DEFAULT_BROWSER_PREFERENCES);
    });
  });
});

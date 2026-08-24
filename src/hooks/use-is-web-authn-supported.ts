"use client";

// WHETHER THIS BROWSER EXPOSES `PublicKeyCredential`, WITHOUT TOUCHING `window` DURING SSR.
//
// Sign-in and the passkeys panel both want to hide the passkey control on a browser that cannot
// run the ceremony. Reading `window.PublicKeyCredential` during render is a hydration mismatch
// waiting to happen, and reading it in an effect then `setState` is the React Compiler's
// `set-state-in-effect` error. `useSyncExternalStore` is the same pattern as `use-is-hydrated.ts`:
// the server snapshot assumes support (the control stays visible for the HTML), the client
// snapshot reads the real capability after hydration.

import { useSyncExternalStore } from "react";

const subscribeToNothing = () => () => {};

function getWebAuthnSupportSnapshot(): boolean {
  return typeof window.PublicKeyCredential !== "undefined";
}

function getWebAuthnSupportServerSnapshot(): boolean {
  return true;
}

/** `true` during SSR and hydration; the live capability from the render after. */
export function useIsWebAuthnSupported(): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    getWebAuthnSupportSnapshot,
    getWebAuthnSupportServerSnapshot,
  );
}

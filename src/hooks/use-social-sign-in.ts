"use client";

// GOOGLE / GITHUB SIGN-IN AS A STATE, NOT A FIRE-AND-FORGET CALL.
//
// `signIn.social` POSTs `/api/auth/sign-in/social` and, on success, Better Auth's client
// `redirectPlugin` sets `window.location.href` to the provider's consent URL. On a refusal it
// resolves `{ error }` and navigates nowhere. The three auth pages used to drop that value, so a
// 403 (an untrusted `callbackURL`, which is exactly what `www.qatoto.com` against an apex
// `FRONTEND_URL` produced) read as a button that did nothing. Failure is now a rendered state.
//
// `redirecting` holds until the page unloads. Back from the provider usually restores this page
// from the bfcache with that state frozen, so `pageshow` with `persisted` puts it back to `idle`
// rather than leaving both buttons disabled.

import { useEffect, useState } from "react";
import { signIn } from "@/lib/auth-client";
import { buildSocialCallbackUrl } from "@/lib/auth-return-path";

export type SocialSignInProvider = "google" | "github";

export type SocialSignInState =
  | { status: "idle" }
  | { status: "redirecting"; provider: SocialSignInProvider }
  | { status: "error"; message: string };

const SOCIAL_SIGN_IN_PROVIDER_LABELS: Record<SocialSignInProvider, string> = {
  google: "Google",
  github: "GitHub",
};

function buildSocialSignInFailureMessage(provider: SocialSignInProvider): string {
  return `Couldn't start ${SOCIAL_SIGN_IN_PROVIDER_LABELS[provider]} sign-in. Try again in a moment.`;
}

export function useSocialSignIn(returnPath: string) {
  const [socialSignInState, setSocialSignInState] = useState<SocialSignInState>({
    status: "idle",
  });

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setSocialSignInState({ status: "idle" });
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  const handleSocialSignIn = async (provider: SocialSignInProvider) => {
    if (socialSignInState.status === "redirecting") return;
    setSocialSignInState({ status: "redirecting", provider });
    try {
      const { error } = await signIn.social({
        provider,
        callbackURL: buildSocialCallbackUrl(returnPath),
      });
      if (error) {
        setSocialSignInState({
          status: "error",
          message: buildSocialSignInFailureMessage(provider),
        });
      }
    } catch {
      // A rejected fetch (offline, DNS, a dropped proxy) throws instead of resolving `{ error }`.
      setSocialSignInState({ status: "error", message: buildSocialSignInFailureMessage(provider) });
    }
  };

  return { socialSignInState, handleSocialSignIn };
}

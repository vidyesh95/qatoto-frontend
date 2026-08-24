"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useIsWebAuthnSupported } from "@/hooks/use-is-web-authn-supported";
import { signIn } from "@/lib/auth-client";

const handleGoogleSignIn = () =>
  signIn.social({ provider: "google", callbackURL: window.location.origin });
const handleGitHubSignIn = () =>
  signIn.social({ provider: "github", callbackURL: window.location.origin });

type PasskeySignInState =
  | { status: "idle" }
  | { status: "authenticating" }
  | { status: "error"; message: string };

/**
 * `hasJustDeletedAccount` renders the one thing a person who just closed their account
 * needs to know, at the one moment they can act on it.
 *
 * IT PRINTS NO DATE, and that is a constraint rather than a choice: this page is signed
 * out, so it has no authenticated source for the scheduled anonymization date. The email
 * sent at deactivation carries it and is the authoritative copy.
 *
 * SIGNING IN IS THE WHOLE CANCEL. There is no link to click and no token to find — the
 * backend clears the deactivation on any successful sign-in inside the window — so the copy
 * says exactly that rather than promising a step that does not exist.
 */
export default function SignIn({
  hasJustDeletedAccount = false,
}: {
  readonly hasJustDeletedAccount?: boolean;
}) {
  const router = useRouter();
  const [passkeySignInState, setPasskeySignInState] = useState<PasskeySignInState>({
    status: "idle",
  });
  const isWebAuthnSupported = useIsWebAuthnSupported();

  // WebAuthn ceremony runs in the browser; success sets the session cookie (§5d /passkey/*).
  // autoFill:false → explicit modal prompt on click (autoFill is for conditional-UI autofill).
  const handlePasskeySignIn = async () => {
    setPasskeySignInState({ status: "authenticating" });
    const { error } = await signIn.passkey({ autoFill: false });
    if (error) {
      const webAuthnErrorCode = "code" in error ? error.code : undefined;
      // The user dismissing the OS prompt surfaces as a passed-through
      // NotAllowedError or an aborted ceremony — a normal outcome, not an
      // error to show. (Better Auth's own AUTH_CANCELLED code is NOT a cancel
      // signal: it's the catch-all for unrecognized exceptions.)
      if (
        webAuthnErrorCode === "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY" ||
        webAuthnErrorCode === "ERROR_CEREMONY_ABORTED"
      ) {
        setPasskeySignInState({ status: "idle" });
        return;
      }
      setPasskeySignInState({
        status: "error",
        message:
          "Couldn't sign in with a passkey. Make sure this device has one, or use another method.",
      });
      return;
    }
    router.push("/");
  };

  return (
    <main className="flex min-h-screen w-screen flex-col">
      <header className="space-y-10 bg-background pt-2 pb-4">
        <Link href={"/"} className="mx-1 flex size-12 items-center justify-center">
          <Image
            src="/icons/arrow_back_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt="Navigate back"
            width={24}
            height={24}
          />
        </Link>
        <h1 className="mx-5 text-3xl">Sign in</h1>
        {hasJustDeletedAccount ? (
          <output className="mx-5 block rounded-xl border border-black/10 bg-card p-3 text-sm text-secondary-foreground">
            Your account is deactivated. Sign in again within 30 days and it comes back
            automatically — there is nothing else to do. After that it cannot be restored.
          </output>
        ) : null}
      </header>
      <section className="space-y-4 p-4">
        <button
          type={"button"}
          onClick={handleGoogleSignIn}
          className={
            "border-outline flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border py-2.5 pr-6 pl-4 text-sm font-medium text-[#00696E]"
          }
        >
          <Image
            src={"/icons/google_logo_light.svg"}
            alt={"Continue with Google"}
            width={18}
            height={18}
          />
          <span>Continue with Google</span>
        </button>
        <button
          type={"button"}
          onClick={handleGitHubSignIn}
          className={
            "border-outline flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border py-2.5 pr-6 pl-4 text-sm font-medium text-[#00696E]"
          }
        >
          <Image
            src={"/icons/github_logo_light.svg"}
            alt={"Continue with GitHub"}
            width={18}
            height={18}
          />
          <span>Continue with GitHub</span>
        </button>
        <button
          type={"button"}
          onClick={handlePasskeySignIn}
          disabled={!isWebAuthnSupported || passkeySignInState.status === "authenticating"}
          className={
            "border-outline flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border py-2.5 pr-6 pl-4 text-sm font-medium text-[#00696E] disabled:cursor-not-allowed disabled:opacity-50"
          }
        >
          <Image
            src={"/icons/passkey_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"}
            alt={"Sign in with Passkey"}
            width={18}
            height={18}
          />
          <span>
            {passkeySignInState.status === "authenticating"
              ? "Waiting for your device…"
              : "Sign in with Passkey"}
          </span>
        </button>
        {passkeySignInState.status === "error" ? (
          <p className="px-4 text-center text-xs text-red-600">{passkeySignInState.message}</p>
        ) : !isWebAuthnSupported ? (
          <p className="px-4 text-center text-xs text-muted-foreground">
            Your browser doesn't support passkeys.
          </p>
        ) : null}
        <div className="flex items-center gap-4 px-4 text-[#BEC8C9]">
          <hr className="flex-1" />
          <span className="text-xs">or</span>
          <hr className="flex-1" />
        </div>
        <Link
          href={"/sign-in-with-password"}
          className={
            "border-outline flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border bg-[#00696E] py-2.5 pr-6 pl-4 text-sm font-medium text-background"
          }
        >
          <Image
            src={"/icons/mail_18dp_FFFFFF_FILL1_wght400_GRAD0_opsz20.svg"}
            alt={"Sign in with Password"}
            width={18}
            height={18}
          />
          <span>Sign in with Password</span>
        </Link>
        <p className="space-x-1 text-center text-sm font-medium">
          <span className="text-[#BEC8C9]">Don't have an account?</span>
          <Link href={"/sign-up"} className="cursor-pointer text-[#00696E]">
            Sign up
          </Link>
        </p>
      </section>
    </main>
  );
}

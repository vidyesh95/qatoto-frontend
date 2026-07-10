"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "@/lib/auth-client";

const handleGoogleSignIn = () =>
  signIn.social({ provider: "google", callbackURL: window.location.origin });
const handleGitHubSignIn = () =>
  signIn.social({ provider: "github", callbackURL: window.location.origin });

type PasskeySignInState =
  | { status: "idle" }
  | { status: "authenticating" }
  | { status: "error"; message: string };

export default function SignIn() {
  const router = useRouter();
  const [passkeySignInState, setPasskeySignInState] = useState<PasskeySignInState>({
    status: "idle",
  });

  // WebAuthn ceremony runs in the browser; success sets the session cookie (§5d /passkey/*).
  // autoFill:false → explicit modal prompt on click (autoFill is for conditional-UI autofill).
  const handlePasskeySignIn = async () => {
    setPasskeySignInState({ status: "authenticating" });
    const { error } = await signIn.passkey({ autoFill: false });
    if (error) {
      // Dismissing the OS prompt is a normal outcome, not an error to surface.
      if ("code" in error && error.code === "AUTH_CANCELLED") {
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
          disabled={passkeySignInState.status === "authenticating"}
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

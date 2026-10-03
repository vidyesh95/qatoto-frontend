"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { signIn } from "@/lib/auth-client";
import { TERMS_VERSION } from "@/lib/legal-documents";
import {
  AuthEmailInput,
  AuthOtpStep,
  AuthPasswordStep,
  AuthSocialButtons,
  AuthStepIndicator,
  AuthWizardHeader,
} from "./auth-step-components";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/**
 * The backend's own sentence from a refusal envelope, or a neutral fallback when the body is not
 * the envelope (a proxy error page, say). Read as `unknown` and narrowed — never cast.
 */
async function readRefusalMessage(response: Response): Promise<string> {
  const fallbackMessage = "This could not be completed. Reload the page and try again.";
  try {
    const body: unknown = await response.json();
    if (typeof body === "object" && body !== null && "message" in body) {
      const message = body.message;
      if (typeof message === "string" && message.trim() !== "") return message;
    }
  } catch {
    // Not JSON — fall through to the neutral sentence.
  }
  return fallbackMessage;
}

const handleGoogleSignIn = () =>
  signIn.social({ provider: "google", callbackURL: window.location.origin });
const handleGitHubSignIn = () =>
  signIn.social({ provider: "github", callbackURL: window.location.origin });

export default function SignUp() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const stepContent: Record<1 | 2 | 3, { title: string; description: string }> = {
    1: {
      title: "Enter your email",
      description: "We'll send a 6-digit code to verify your account.",
    },
    2: {
      title: "Check your inbox",
      description: `We sent a 6-digit verification code to ${email}`,
    },
    3: {
      title: "Set your password",
      description: "Choose a strong password to secure your account.",
    },
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => (prev === 3 ? 2 : 1));
    }
  };

  // Step 1 (§5e): /signup/start sends the OTP. Creates NO account.
  const handleEmailSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const response = await fetch(`${API_URL}/signup/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      if (!response.ok) {
        setErrorMessage("Could not send the code. Try again.");
        return;
      }
      setStep(2);
    } catch (submitError) {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      setErrorMessage(
        submitError instanceof Error ? submitError.message : "Could not send the code. Try again.",
      );
    }
  };

  // OTP is verified server-side on the final step (§6): step 2 just advances the UI.
  const handleOtpSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (otp.join("").length === 6) {
      setStep(3);
    }
  };

  // Final step (§5e): /signup/complete verifies the OTP AND sets the password in
  // one atomic call — the ONLY place the account is created, and it opens the session.
  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!password || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch(`${API_URL}/signup/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        // The Terms version beside the button the person just pressed (todo §7). The backend
        // records it as their acceptance, or refuses with a 409 if it is no longer current.
        body: JSON.stringify({
          email,
          otp: otp.join(""),
          password,
          acceptedTermsVersion: TERMS_VERSION,
        }),
      });
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      if (!response.ok) {
        // Bad/expired OTP → 401; nothing was created. Send the user back to re-enter it.
        // A 409 is EITHER an email already registered OR Terms updated since the page loaded, so
        // the backend's own sentence is shown rather than a guess at which.
        if (response.status === 409) {
          setErrorMessage(await readRefusalMessage(response));
          return;
        }
        setErrorMessage("Invalid or expired code.");
        setStep(2);
        return;
      }

      router.push("/");
    } catch (submitError) {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      setErrorMessage(
        submitError instanceof Error ? submitError.message : "Network error. Please try again.",
      );
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste: distribute characters across inputs
      const chars = value
        .replace(/[^0-9]/g, "")
        .split("")
        .slice(0, 6);
      const newOtp = [...otp];
      chars.forEach((char, i) => {
        if (index + i < 6) {
          newOtp[index + i] = char;
        }
      });
      setOtp(newOtp);
      // Focus the next empty input or the last filled one
      const nextIndex = Math.min(index + chars.length, 5);
      const nextInput = document.getElementById(`otp-${nextIndex}`);
      nextInput?.focus();
      return;
    }

    if (!/^[0-9]?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  return (
    <main className="flex min-h-screen w-screen flex-col">
      <AuthWizardHeader title="Sign up" step={step} onBack={handleBack} />

      <AuthStepIndicator currentStep={step} />
      {/* Step Titles & Descriptions */}
      <hgroup className="mt-6 space-y-1 px-4">
        <h2 className="text-xl text-foreground">{stepContent[step].title}</h2>
        <p className="text-sm text-muted-foreground">{stepContent[step].description}</p>
        {errorMessage && <p className="text-sm font-medium text-destructive">{errorMessage}</p>}
      </hgroup>

      <section className="space-y-4 p-4">
        {/* Step 1: Email Entry */}
        {step === 1 && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <AuthEmailInput value={email} onChange={(e) => setEmail(e.target.value)} />
            <button
              type="submit"
              disabled={isSubmitting}
              className="border-outline flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border bg-primary-imprint py-2.5 pr-6 pl-4 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Image
                src="/icons/mail_18dp_FFFFFF_FILL1_wght400_GRAD0_opsz20.svg"
                alt="Get OTP"
                width={18}
                height={18}
              />
              <span>Get OTP</span>
            </button>
            <p className="px-2 text-center text-xs text-muted-foreground">
              By continuing, you agree to Qatoto&apos;s{" "}
              <Link
                href="/terms-and-conditions"
                className="text-primary-imprint underline underline-offset-2 hover:text-foreground"
              >
                Terms and Conditions
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy-policy"
                className="text-primary-imprint underline underline-offset-2 hover:text-foreground"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </form>
        )}

        {/* Step 2: OTP Verification */}
        {step === 2 && (
          <AuthOtpStep
            otp={otp}
            onOtpChange={handleOtpChange}
            onOtpKeyDown={handleOtpKeyDown}
            onSubmit={handleOtpSubmit}
            onResend={() => {
              void fetch(`${API_URL}/signup/start`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ email }),
              });
            }}
          />
        )}

        {/* Step 3: Password Setup */}
        {step === 3 && (
          <AuthPasswordStep
            password={password}
            onPasswordChange={setPassword}
            showPassword={showPassword}
            onToggleShowPassword={() => setShowPassword(!showPassword)}
            rememberMe={rememberMe}
            onRememberMeChange={setRememberMe}
            isSubmitting={isSubmitting}
            onSubmit={handlePasswordSubmit}
          />
        )}

        <AuthSocialButtons
          onGoogleSignIn={handleGoogleSignIn}
          onGitHubSignIn={handleGitHubSignIn}
        />

        <p className="space-x-1 text-center text-sm font-medium">
          <span className="text-muted-foreground">Already have an account?</span>
          <Link href="sign-in" className="cursor-pointer text-primary-imprint">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}

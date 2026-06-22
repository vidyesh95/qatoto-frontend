"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { emailOtp, signIn } from "@/lib/auth-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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

  const handleEmailSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email) return;
    setErrorMessage("");
    const { error } = await emailOtp.sendVerificationOtp({ email, type: "sign-in" });
    if (error) {
      setErrorMessage("Could not send the code. Try again.");
      return;
    }
    setStep(2);
  };

  // OTP is verified on the final step (§6): step 2 just advances the UI.
  const handleOtpSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (otp.join("").length === 6) {
      setStep(3);
    }
  };

  // Two-phase signup (§6): the OTP call creates + signs in the user, then our
  // own endpoint sets their first password.
  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!password) return;
    setErrorMessage("");

    const { error } = await signIn.emailOtp({ email, otp: otp.join("") });
    if (error) {
      setErrorMessage("Invalid or expired code.");
      setStep(2);
      return;
    }

    const response = await fetch(`${API_URL}/set-initial-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ password }),
    });
    if (!response.ok) {
      setErrorMessage("Could not set your password. Try again.");
      return;
    }

    router.push("/");
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
      <header className="space-y-10 bg-background pt-2 pb-4">
        {step === 1 ? (
          <Link href={"/sign-in"} className="mx-1 flex h-12 w-12 items-center justify-center">
            <Image
              src="/icons/arrow_back_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              alt="Navigate back"
              width={24}
              height={24}
            />
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleBack}
            aria-label="Go back"
            className="mx-1 flex h-12 w-12 cursor-pointer items-center justify-center"
          >
            <Image
              src="/icons/arrow_back_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              alt="Navigate back"
              width={24}
              height={24}
            />
          </button>
        )}
        <h1 className="mx-4 text-3xl text-foreground">Sign up</h1>
      </header>

      <div className="flex gap-2 px-4 pt-4">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              s <= step ? "bg-[#00696E]" : "bg-[#DAE4E5]"
            }`}
          />
        ))}
      </div>
      {/* Step Titles & Descriptions */}
      <hgroup className="mt-6 space-y-1 px-4">
        <h2 className="text-xl text-foreground">{stepContent[step].title}</h2>
        <p className="text-sm text-muted-foreground">{stepContent[step].description}</p>
        {errorMessage && <p className="text-sm font-medium text-red-600">{errorMessage}</p>}
      </hgroup>

      <section className="space-y-4 p-4">
        {/* Step 1: Email Entry */}
        {step === 1 && (
          <>
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="relative">
                <div className="relative flex h-14 items-center rounded border border-[#6F7979] px-3">
                  <label
                    htmlFor="email"
                    className="absolute -top-2 left-3 bg-white px-1 text-xs text-black"
                  >
                    Email
                  </label>
                  <div className="mr-3 flex items-center justify-center">
                    <Image
                      src={"/icons/mail_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"}
                      alt={"Email"}
                      width={24}
                      height={24}
                    />
                  </div>
                  <input
                    type="email"
                    id="email"
                    aria-label="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="host@domain.com"
                    className="h-full flex-1 bg-transparent text-base outline-none placeholder:text-foreground"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className={
                  "border-outline flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border bg-[#00696E] py-2.5 pr-6 pl-4 text-sm font-medium text-background"
                }
              >
                <Image
                  src={"/icons/mail_18dp_FFFFFF_FILL1_wght400_GRAD0_opsz20.svg"}
                  alt={"Get OTP"}
                  width={18}
                  height={18}
                />
                <span>Get OTP</span>
              </button>
            </form>
          </>
        )}

        {/* Step 2: OTP Verification */}
        {step === 2 && (
          <>
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div className="flex justify-center gap-3">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    type="text"
                    inputMode="numeric"
                    id={`otp-${index}`}
                    aria-label={`Verification code digit ${index + 1}`}
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="h-14 w-12 rounded border border-[#6F7979] bg-transparent text-center text-xl font-semibold transition-colors outline-none focus:border-2 focus:border-[#00696E]"
                    required
                  />
                ))}
              </div>
              <button
                type="submit"
                className={
                  "border-outline flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border bg-[#00696E] py-2.5 pr-6 pl-4 text-sm font-medium text-background"
                }
              >
                <Image
                  src={"/icons/check_18dp_FFFFFF_FILL1_wght400_GRAD0_opsz20.svg"}
                  alt={"Verify"}
                  width={18}
                  height={18}
                />
                <span>Verify</span>
              </button>
            </form>
            <p className="text-center text-sm font-medium text-[#3F4949]">
              Didn&apos;t receive the code?{" "}
              <button
                type="button"
                onClick={() => emailOtp.sendVerificationOtp({ email, type: "sign-in" })}
                className="cursor-pointer font-medium text-[#00696E]"
              >
                Resend
              </button>
            </p>
          </>
        )}

        {/* Step 3: Password Setup */}
        {step === 3 && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="relative">
              <div className="relative flex h-14 items-center rounded border border-[#6F7979] px-3">
                <label
                  htmlFor="password"
                  className="absolute -top-2 left-3 bg-white px-1 text-xs text-black"
                >
                  Password
                </label>
                <div className="mr-3 flex items-center justify-center">
                  <Image
                    src={"/icons/lock_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"}
                    alt={"Password"}
                    width={24}
                    height={24}
                  />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  aria-label="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="secretPassword123$"
                  className="h-full flex-1 bg-transparent text-base outline-none placeholder:text-foreground"
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="ml-3 flex cursor-pointer items-center justify-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <Image
                    src={
                      showPassword
                        ? "/icons/visibility_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
                        : "/icons/visibility_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
                    }
                    alt={showPassword ? "Hide Password" : "Show Password"}
                    width={24}
                    height={24}
                  />
                </button>
              </div>
              <p className="mt-1 w-full pl-4 text-xs text-[#3F4949]">
                Must be at least 8 characters
              </p>
            </div>
            <div className="flex items-center justify-between gap-4">
              <label htmlFor="remember-me" className="w-full text-sm font-medium">
                Remember me
              </label>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  id="remember-me"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="peer sr-only"
                  aria-label="Remember me toggle switch"
                />
                {/* Track */}
                <div className="h-8 w-13 rounded-full border-2 border-[#6F7979] bg-[#DAE4E5] transition-colors duration-200 ease-in-out peer-checked:border-[#00696E] peer-checked:bg-[#00696E]"></div>

                {/* Thumb */}
                <div className="pointer-events-none absolute top-0.75 left-0.75 flex h-6.5 w-6.5 items-center justify-center rounded-full bg-[#6F7979] shadow-sm transition-transform duration-200 ease-in-out peer-checked:translate-x-5 peer-checked:bg-white peer-checked:[&>svg.check-icon]:opacity-100 peer-checked:[&>svg.x-icon]:opacity-0">
                  {/* X Icon - shown when unchecked */}
                  <svg
                    className="x-icon absolute h-4 w-4 text-white opacity-100 transition-opacity duration-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  {/* Checkmark Icon - shown when checked */}
                  <svg
                    className="check-icon absolute h-4 w-4 text-[#00696E] opacity-0 transition-opacity duration-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </label>
            </div>
            <button
              type="submit"
              className={
                "border-outline flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border bg-[#00696E] py-2.5 pr-6 pl-4 text-sm font-medium text-background"
              }
            >
              <Image
                src={"/icons/mail_18dp_FFFFFF_FILL1_wght400_GRAD0_opsz20.svg"}
                alt={"Sign up"}
                width={18}
                height={18}
              />
              <span>Sign up</span>
            </button>
          </form>
        )}
        <div className="flex items-center gap-4 px-4 text-[#BEC8C9]">
          <hr className="flex-1" />
          <span className="text-xs">or continue with</span>
          <hr className="flex-1" />
        </div>
        <div className="flex items-center justify-center gap-4">
          <button
            type={"button"}
            onClick={handleGoogleSignIn}
            aria-label="Continue with Google"
            className={
              "border-outline flex w-fit cursor-pointer items-center justify-center gap-2 rounded-full border py-2.5 pr-4 pl-4 text-sm font-medium text-[#00696E]"
            }
          >
            <Image
              src={"/icons/google_logo_light.svg"}
              alt={"Continue with Google"}
              width={18}
              height={18}
            />
          </button>
          <button
            type={"button"}
            onClick={handleGitHubSignIn}
            aria-label="Continue with GitHub"
            className={
              "border-outline flex w-fit cursor-pointer items-center justify-center gap-2 rounded-full border py-2.5 pr-4 pl-4 text-sm font-medium text-[#00696E]"
            }
          >
            <Image
              src={"/icons/github_logo_light.svg"}
              alt={"Continue with GitHub"}
              width={18}
              height={18}
            />
          </button>
        </div>
        <p className="space-x-1 text-center text-sm font-medium">
          <span className="text-[#BEC8C9]">Already have an account?</span>
          <Link href={"sign-in"} className="cursor-pointer text-[#00696E]">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}

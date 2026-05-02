"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export default function SignUp() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

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
      setStep((prev) => (prev - 1) as 1 | 2 | 3);
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      // TODO: Call API to send OTP to email
      setStep(2);
    }
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const otpValue = otp.join("");
    if (otpValue.length === 6) {
      // TODO: Call API to verify OTP
      setStep(3);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password) {
      // TODO: Call API to complete sign up
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
    <main className="min-h-screen w-screen flex flex-col">
      <header className="bg-background space-y-10 pt-2 pb-4">
        {step === 1 ? (
          <Link href={"/sign-in"} className="mx-1 w-12 h-12 flex items-center justify-center">
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
            className="mx-1 w-12 h-12 flex items-center justify-center cursor-pointer"
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

      <div className="px-4 pt-4 flex gap-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`flex-1 h-1 rounded-full transition-colors duration-300 ${
              s <= step ? "bg-[#00696E]" : "bg-[#DAE4E5]"
            }`}
          />
        ))}
      </div>
      {/* Step Titles & Descriptions */}
      <div className="px-4 mt-6 space-y-1">
        <h2 className="text-xl text-foreground">
          {stepContent[step].title}
        </h2>
        <p className="text-sm text-muted-foreground">
          {stepContent[step].description}
        </p>
      </div>
      
      <section className="p-4 space-y-4">
        {/* Step 1: Email Entry */}
        {step === 1 && (
          <>
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="relative">
                <div className="relative flex items-center border border-[#6F7979] rounded h-14 px-3">
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="host@domain.com"
                    className="flex-1 h-full bg-transparent outline-none text-base placeholder:text-foreground"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className={
                  "w-full justify-center items-center text-sm font-medium bg-[#00696E] text-background flex gap-2 border border-outline rounded-full pl-4 pr-6 py-2.5 cursor-pointer"
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
              <div className="flex gap-3 justify-center">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    type="text"
                    inputMode="numeric"
                    id={`otp-${index}`}
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="w-12 h-14 text-center text-xl font-semibold border border-[#6F7979] rounded bg-transparent outline-none focus:border-[#00696E] focus:border-2 transition-colors"
                    required
                  />
                ))}
              </div>
              <button
                type="submit"
                className={
                  "w-full justify-center items-center text-sm font-medium bg-[#00696E] text-background flex gap-2 border border-outline rounded-full pl-4 pr-6 py-2.5 cursor-pointer"
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
            <p className="font-medium text-sm text-center text-[#3F4949]">
              Didn&apos;t receive the code?{" "}
              <button type="button" className="text-[#00696E] cursor-pointer font-medium">
                Resend
              </button>
            </p>
          </>
        )}

        {/* Step 3: Password Setup */}
        {step === 3 && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="relative">
              <div className="relative flex items-center border border-[#6F7979] rounded h-14 px-3">
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="secretPassword123$"
                  className="flex-1 h-full bg-transparent outline-none text-base placeholder:text-foreground"
                  required
                />
                <div
                  className="ml-3 flex items-center justify-center cursor-pointer"
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
                </div>
              </div>
              <p className="w-full text-xs text-[#3F4949] mt-1 pl-4">
                Must be at least 8 characters
              </p>
            </div>
            <div className="flex items-center justify-between gap-4">
              <label htmlFor="remember-me" className="w-full font-medium text-sm">
                Remember me
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="remember-me"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="sr-only peer"
                  aria-label="Remember me toggle switch"
                />
                {/* Track */}
                <div className="w-13 h-8 rounded-full border-2 border-[#6F7979] bg-[#DAE4E5] peer-checked:border-[#00696E] peer-checked:bg-[#00696E] transition-colors duration-200 ease-in-out"></div>

                {/* Thumb */}
                <div className="absolute top-0.75 left-0.75 h-6.5 w-6.5 rounded-full bg-[#6F7979] peer-checked:bg-white transition-transform duration-200 ease-in-out peer-checked:translate-x-5 flex items-center justify-center pointer-events-none shadow-sm peer-checked:[&>svg.x-icon]:opacity-0 peer-checked:[&>svg.check-icon]:opacity-100">
                  {/* X Icon - shown when unchecked */}
                  <svg
                    className="w-4 h-4 text-white absolute transition-opacity duration-200 opacity-100 x-icon"
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
                    className="w-4 h-4 text-[#00696E] absolute transition-opacity duration-200 opacity-0 check-icon"
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
                "w-full justify-center items-center text-sm font-medium bg-[#00696E] text-background flex gap-2 border border-outline rounded-full pl-4 pr-6 py-2.5 cursor-pointer"
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
        <div className="px-4 flex items-center gap-4 text-[#BEC8C9]">
          <hr className="flex-1" />
          <span className="text-xs">or continue with</span>
          <hr className="flex-1" />
        </div>
        <div className="flex gap-4 justify-center items-center">
          <button
            type={"button"}
            className={
              "w-fit flex gap-2 justify-center items-center text-sm font-medium text-[#00696E] border border-outline rounded-full pl-4 pr-4 py-2.5 cursor-pointer"
            }
          >
            <Image
              src={"/icons/google_logo_18x18px.svg"}
              alt={"Continue with Google"}
              width={18}
              height={18}
            />
          </button>
          <button
            type={"button"}
            className={
              "w-fit flex gap-2 justify-center items-center text-sm font-medium text-[#00696E] border border-outline rounded-full pl-4 pr-4 py-2.5 cursor-pointer"
            }
          >
            <Image
              src={"/icons/apple_logo_18x18px.svg"}
              alt={"Continue with Apple"}
              width={18}
              height={18}
            />
          </button>
        </div>
        <p className="text-sm font-medium text-center space-x-1">
          <span className="text-[#BEC8C9]">Already have an account?</span>
          <Link href={"sign-in"} className="text-[#00696E] cursor-pointer">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}

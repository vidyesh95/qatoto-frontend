"use client";

import Image from "next/image";
import Link from "next/link";
import type { ChangeEvent, FormEvent, KeyboardEvent } from "react";
import ToggleSwitch from "@/components/ui/toggle-switch";

export interface AuthWizardHeaderProps {
  readonly title: string;
  readonly step: number;
  readonly onBack: () => void;
  readonly fallbackHref?: string;
}

export function AuthWizardHeader({
  title,
  step,
  onBack,
  fallbackHref = "/sign-in",
}: AuthWizardHeaderProps) {
  return (
    <header className="space-y-10 bg-background pt-2 pb-4">
      {step === 1 ? (
        <Link href={fallbackHref} className="mx-1 flex h-12 w-12 items-center justify-center">
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
          onClick={onBack}
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
      <h1 className="mx-4 text-3xl text-foreground">{title}</h1>
    </header>
  );
}

export interface AuthStepIndicatorProps {
  readonly currentStep: number;
  readonly totalSteps?: number;
}

export function AuthStepIndicator({ currentStep, totalSteps = 3 }: AuthStepIndicatorProps) {
  const steps = Array.from({ length: totalSteps }, (_unused, index) => index + 1);
  return (
    <div className="flex gap-2 px-4 pt-4">
      {steps.map((stepNumber) => (
        <div
          key={stepNumber}
          className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
            stepNumber <= currentStep ? "bg-primary-imprint" : "bg-muted"
          }`}
        />
      ))}
    </div>
  );
}

export interface AuthEmailInputProps {
  readonly id?: string;
  readonly value: string;
  readonly disabled?: boolean;
  readonly onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly placeholder?: string;
}

export function AuthEmailInput({
  id = "email",
  value,
  disabled = false,
  onChange,
  placeholder = "name@example.com",
}: AuthEmailInputProps) {
  return (
    <div className="relative">
      <div className="relative flex h-14 items-center rounded border border-outline-strong px-3">
        <label
          htmlFor={id}
          className="absolute -top-2 left-3 bg-background px-1 text-xs text-foreground"
        >
          Email
        </label>
        <div className="mr-3 flex items-center justify-center">
          <Image
            src="/icons/mail_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
            alt="Email"
            width={24}
            height={24}
          />
        </div>
        <input
          id={id}
          type="email"
          aria-label="Email"
          value={value}
          disabled={disabled}
          onChange={onChange}
          placeholder={placeholder}
          className="h-full flex-1 bg-transparent text-base outline-none placeholder:text-foreground"
          required
        />
      </div>
    </div>
  );
}

const OTP_FIELD_IDS = ["otp-1", "otp-2", "otp-3", "otp-4", "otp-5", "otp-6"] as const;

export function AuthOtpStep({
  otp,
  onOtpChange,
  onOtpKeyDown,
  onSubmit,
  onResend,
}: {
  readonly otp: readonly string[];
  readonly onOtpChange: (index: number, value: string) => void;
  readonly onOtpKeyDown: (index: number, event: KeyboardEvent<HTMLInputElement>) => void;
  readonly onSubmit: (event: FormEvent) => void;
  readonly onResend: () => void;
}) {
  return (
    <>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="flex justify-center gap-3">
          {OTP_FIELD_IDS.map((fieldId, index) => (
            <input
              key={fieldId}
              type="text"
              inputMode="numeric"
              id={`otp-${index}`}
              aria-label={`Verification code digit ${index + 1}`}
              maxLength={1}
              value={otp[index]}
              onChange={(e) => onOtpChange(index, e.target.value)}
              onKeyDown={(e) => onOtpKeyDown(index, e)}
              className="h-14 w-12 rounded border border-outline-strong bg-transparent text-center text-xl font-semibold transition-colors outline-none focus:border-2 focus:border-primary-imprint"
              required
            />
          ))}
        </div>
        <button
          type="submit"
          className="border-outline flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border bg-primary-imprint py-2.5 pr-6 pl-4 text-sm font-medium text-background"
        >
          <Image
            src="/icons/check_18dp_FFFFFF_FILL1_wght400_GRAD0_opsz20.svg"
            alt="Verify"
            width={18}
            height={18}
          />
          <span>Verify</span>
        </button>
      </form>
      <p className="text-center text-sm font-medium text-muted-foreground">
        Didn&apos;t receive the code?{" "}
        <button
          type="button"
          onClick={onResend}
          className="cursor-pointer font-medium text-primary-imprint"
        >
          Resend
        </button>
      </p>
    </>
  );
}

export function AuthPasswordStep({
  password,
  onPasswordChange,
  showPassword,
  onToggleShowPassword,
  rememberMe,
  onRememberMeChange,
  isSubmitting,
  onSubmit,
}: {
  readonly password: string;
  readonly onPasswordChange: (value: string) => void;
  readonly showPassword: boolean;
  readonly onToggleShowPassword: () => void;
  readonly rememberMe: boolean;
  readonly onRememberMeChange: (checked: boolean) => void;
  readonly isSubmitting: boolean;
  readonly onSubmit: (event: FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="relative">
        <div className="relative flex h-14 items-center rounded border border-outline-strong px-3">
          <label
            htmlFor="password"
            className="absolute -top-2 left-3 bg-background px-1 text-xs text-foreground"
          >
            Password
          </label>
          <div className="mr-3 flex items-center justify-center">
            <Image
              src="/icons/lock_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
              alt="Password"
              width={24}
              height={24}
            />
          </div>
          <input
            type={showPassword ? "text" : "password"}
            id="password"
            aria-label="Password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder="secretPassword123$"
            className="h-full flex-1 bg-transparent text-base outline-none placeholder:text-foreground"
            required
          />
          <button
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="ml-3 flex cursor-pointer items-center justify-center"
            onClick={onToggleShowPassword}
          >
            <Image
              src="/icons/visibility_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
              alt={showPassword ? "Hide Password" : "Show Password"}
              width={24}
              height={24}
            />
          </button>
        </div>
        <p className="mt-1 w-full pl-4 text-xs text-muted-foreground">
          Must be at least 8 characters
        </p>
      </div>
      <div className="flex items-center justify-between gap-4">
        <label htmlFor="remember-me" className="w-full text-sm font-medium">
          Remember me
        </label>
        <ToggleSwitch
          id="remember-me"
          accessibleName="Remember me"
          isChecked={rememberMe}
          onCheckedChange={onRememberMeChange}
        />
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="border-outline flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border bg-primary-imprint py-2.5 pr-6 pl-4 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Image
          src="/icons/mail_18dp_FFFFFF_FILL1_wght400_GRAD0_opsz20.svg"
          alt="Sign up"
          width={18}
          height={18}
        />
        <span>Sign up</span>
      </button>
      <p className="px-2 text-center text-xs text-muted-foreground">
        By creating an account, you agree to our{" "}
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
  );
}

export function AuthSocialButtons({
  onGoogleSignIn,
  onGitHubSignIn,
}: {
  readonly onGoogleSignIn: () => void;
  readonly onGitHubSignIn: () => void;
}) {
  return (
    <>
      <div className="flex items-center gap-4 px-4 text-muted-foreground">
        <hr className="flex-1" />
        <span className="text-xs">or continue with</span>
        <hr className="flex-1" />
      </div>
      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={onGoogleSignIn}
          aria-label="Continue with Google"
          className="border-outline flex w-fit cursor-pointer items-center justify-center gap-2 rounded-full border py-2.5 pr-4 pl-4 text-sm font-medium text-primary-imprint"
        >
          <Image
            src="/icons/google_logo_light.svg"
            alt="Continue with Google"
            width={18}
            height={18}
          />
        </button>
        <button
          type="button"
          onClick={onGitHubSignIn}
          aria-label="Continue with GitHub"
          className="border-outline flex w-fit cursor-pointer items-center justify-center gap-2 rounded-full border py-2.5 pr-4 pl-4 text-sm font-medium text-primary-imprint"
        >
          <Image
            src="/icons/github_logo_light.svg"
            alt="Continue with GitHub"
            width={18}
            height={18}
          />
        </button>
      </div>
      <SocialSignInTermsNotice />
    </>
  );
}

/**
 * The Terms sentence beside the Google and GitHub buttons (todo §7).
 *
 * LOAD-BEARING, NOT DECORATION. A first sign-in through either button creates an account, and the
 * backend records that as acceptance of the current Terms (`user.create.after`, surface
 * `oauth_sign_up`). That record is only honest because this sentence sits beside the buttons on
 * every page that offers them — sign-up, sign-in and sign-in with password. A new page with these
 * buttons must render it too.
 */
export function SocialSignInTermsNotice() {
  return (
    <p className="px-2 text-center text-xs text-muted-foreground">
      By continuing with Google or GitHub, you agree to Qatoto&apos;s{" "}
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
  );
}

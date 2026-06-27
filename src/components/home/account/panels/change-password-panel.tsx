"use client";

import Image from "next/image";
import { useState } from "react";
import { authClient, useSession } from "@/lib/auth-client";

/**
 * Changes the password on an account that already has an email+password
 * credential. Two modes:
 *
 *   A. Current password — authClient.changePassword({ currentPassword, newPassword })
 *      → POST /api/auth/change-password (Better Auth, emailAndPassword enabled).
 *   B. Forgot password — email-OTP reset:
 *      authClient.emailOtp.sendVerificationOtp({ email, type: "forget-password" })
 *      → authClient.emailOtp.resetPassword({ email, otp, password }).
 *
 * Not a trust boundary — the backend re-verifies the current password / OTP and
 * re-hashes the new password (argon2id). The client only drives the UI.
 */

type ChangePasswordState =
  | { status: "current-form" }
  | { status: "current-submitting" }
  | { status: "current-error"; message: string }
  | { status: "otp-start" }
  | { status: "otp-sending" }
  | { status: "otp-verify" }
  | { status: "otp-submitting" }
  | { status: "otp-error"; message: string }
  | { status: "otp-start-error"; message: string };

type ChangePasswordPanelProps = {
  /** Return to the settings action list. */
  onBack: () => void;
};

export function ChangePasswordPanel({ onBack }: ChangePasswordPanelProps) {
  const { data: session } = useSession();
  const email = session?.user.email ?? "";

  const [changePasswordState, setChangePasswordState] = useState<ChangePasswordState>({
    status: "current-form",
  });
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isCurrentPasswordVisible, setIsCurrentPasswordVisible] = useState(false);
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [rememberMe, setRememberMe] = useState(false);

  const isOtpMode =
    changePasswordState.status === "otp-start" ||
    changePasswordState.status === "otp-sending" ||
    changePasswordState.status === "otp-verify" ||
    changePasswordState.status === "otp-submitting" ||
    changePasswordState.status === "otp-error" ||
    changePasswordState.status === "otp-start-error";

  async function handleChangeWithCurrentPassword(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (currentPassword.length < 1 || newPassword.length < 8) return;
    setChangePasswordState({ status: "current-submitting" });
    const { error } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: false,
    });
    if (error) {
      setChangePasswordState({
        status: "current-error",
        message:
          error.code === "INVALID_PASSWORD"
            ? "Your current password is incorrect."
            : "Couldn't change your password. Please try again.",
      });
      return;
    }
    onBack();
  }

  async function handleSendResetCode() {
    if (!email) return;
    setChangePasswordState({ status: "otp-sending" });
    const { error } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "forget-password",
    });
    if (error) {
      setChangePasswordState({
        status: "otp-start-error",
        message: "Couldn't send the code. Please try again.",
      });
      return;
    }
    setChangePasswordState({ status: "otp-verify" });
  }

  async function handleResetWithOtp(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const code = otp.join("");
    if (code.length !== 6 || newPassword.length < 8) return;
    setChangePasswordState({ status: "otp-submitting" });
    const { error } = await authClient.emailOtp.resetPassword({
      email,
      otp: code,
      password: newPassword,
    });
    if (error) {
      setChangePasswordState({
        status: "otp-error",
        message: "Invalid or expired code. Please try again.",
      });
      return;
    }
    onBack();
  }

  function handleOtpChange(index: number, value: string) {
    if (value.length > 1) {
      // Paste: distribute digits across the inputs from this position.
      const digits = value
        .replace(/[^0-9]/g, "")
        .split("")
        .slice(0, 6);
      const nextOtp = [...otp];
      digits.forEach((digit, offset) => {
        if (index + offset < 6) nextOtp[index + offset] = digit;
      });
      setOtp(nextOtp);
      const nextIndex = Math.min(index + digits.length, 5);
      document.getElementById(`change-pw-otp-${nextIndex}`)?.focus();
      return;
    }
    if (!/^[0-9]?$/.test(value)) return;
    const nextOtp = [...otp];
    nextOtp[index] = value;
    setOtp(nextOtp);
    if (value && index < 5) document.getElementById(`change-pw-otp-${index + 1}`)?.focus();
  }

  function handleOtpKeyDown(index: number, keyEvent: React.KeyboardEvent<HTMLInputElement>) {
    if (keyEvent.key === "Backspace" && !otp[index] && index > 0) {
      document.getElementById(`change-pw-otp-${index - 1}`)?.focus();
    }
  }

  function switchToOtpMode() {
    setChangePasswordState({ status: "otp-start" });
  }

  function switchToCurrentPasswordMode() {
    setChangePasswordState({ status: "current-form" });
  }

  return (
    <div>
      <header className="sticky top-0 z-10 flex flex-row items-center gap-4 border-b border-black/10 bg-background p-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="cursor-pointer rounded-full p-1 transition-colors hover:bg-muted"
        >
          <Image
            src="/icons/arrow_back_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt=""
            width={24}
            height={24}
          />
        </button>
        <h2 className="text-xl font-medium text-secondary-foreground">Change password</h2>
      </header>

      {!isOtpMode ? (
        <form onSubmit={handleChangeWithCurrentPassword} className="flex flex-col gap-6 p-4">
          {/* Hidden username field so the browser's password manager associates the
              saved credential with the account email instead of a stray value. */}
          <input
            type="email"
            name="username"
            autoComplete="username"
            value={email}
            readOnly
            tabIndex={-1}
            aria-hidden="true"
            className="sr-only"
          />
          <p className="text-sm text-muted-foreground">
            Enter your current password and a new password for{" "}
            <span className="font-medium">{email}</span>.
          </p>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-secondary-foreground">Current password</span>
            <div className="flex flex-row items-center gap-1 rounded-xl border border-black/10 bg-card px-4 py-3 focus-within:border-primary">
              <input
                type={isCurrentPasswordVisible ? "text" : "password"}
                aria-label="Current password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(inputEvent) => {
                  setCurrentPassword(inputEvent.target.value);
                  if (changePasswordState.status === "current-error") {
                    setChangePasswordState({ status: "current-form" });
                  }
                }}
                placeholder="Current password"
                className="flex-1 bg-transparent text-base text-secondary-foreground outline-none placeholder:text-muted-foreground"
                required
              />
              <button
                type="button"
                aria-label={isCurrentPasswordVisible ? "Hide password" : "Show password"}
                onClick={() => setIsCurrentPasswordVisible((wasVisible) => !wasVisible)}
                className="flex cursor-pointer items-center justify-center"
              >
                <Image
                  src={
                    isCurrentPasswordVisible
                      ? "/icons/visibility_off_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
                      : "/icons/visibility_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
                  }
                  alt=""
                  width={24}
                  height={24}
                />
              </button>
            </div>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-secondary-foreground">New password</span>
            <div className="flex flex-row items-center gap-1 rounded-xl border border-black/10 bg-card px-4 py-3 focus-within:border-primary">
              <input
                type={isNewPasswordVisible ? "text" : "password"}
                aria-label="New password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(inputEvent) => {
                  setNewPassword(inputEvent.target.value);
                  if (changePasswordState.status === "current-error") {
                    setChangePasswordState({ status: "current-form" });
                  }
                }}
                placeholder="secretPassword123$"
                className="flex-1 bg-transparent text-base text-secondary-foreground outline-none placeholder:text-muted-foreground"
                required
              />
              <button
                type="button"
                aria-label={isNewPasswordVisible ? "Hide password" : "Show password"}
                onClick={() => setIsNewPasswordVisible((wasVisible) => !wasVisible)}
                className="flex cursor-pointer items-center justify-center"
              >
                <Image
                  src={
                    isNewPasswordVisible
                      ? "/icons/visibility_off_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
                      : "/icons/visibility_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
                  }
                  alt=""
                  width={24}
                  height={24}
                />
              </button>
            </div>
            <span className="text-xs text-muted-foreground">Must be at least 8 characters.</span>
            {changePasswordState.status === "current-error" ? (
              <span className="text-xs text-red-600">{changePasswordState.message}</span>
            ) : null}
          </label>

          <div className="flex items-center justify-between gap-4">
            <label htmlFor="change-pw-remember-me" className="w-full text-sm font-medium">
              Remember me
            </label>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                id="change-pw-remember-me"
                checked={rememberMe}
                onChange={(inputEvent) => setRememberMe(inputEvent.target.checked)}
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
            disabled={
              changePasswordState.status === "current-submitting" ||
              currentPassword.length < 1 ||
              newPassword.length < 8
            }
            className="cursor-pointer rounded-full bg-primary px-4 py-3 text-sm font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          >
            {changePasswordState.status === "current-submitting" ? "Saving…" : "Change password"}
          </button>

          <button
            type="button"
            onClick={switchToOtpMode}
            className="cursor-pointer text-center text-sm font-medium text-[#00696E]"
          >
            Forgot password?
          </button>
        </form>
      ) : changePasswordState.status === "otp-verify" ||
        changePasswordState.status === "otp-submitting" ||
        changePasswordState.status === "otp-error" ? (
        <form onSubmit={handleResetWithOtp} className="flex flex-col gap-6 p-4">
          {/* Hidden username field so the saved credential maps to the account email. */}
          <input
            type="email"
            name="username"
            autoComplete="username"
            value={email}
            readOnly
            tabIndex={-1}
            aria-hidden="true"
            className="sr-only"
          />
          <p className="text-sm text-muted-foreground">
            Enter the 6-digit code we sent to <span className="font-medium">{email}</span> and
            choose a new password.
          </p>

          <div className="flex justify-center gap-3">
            {otp.map((digit, index) => (
              <input
                key={index}
                type="text"
                inputMode="numeric"
                id={`change-pw-otp-${index}`}
                aria-label={`Verification code digit ${index + 1}`}
                maxLength={1}
                value={digit}
                onChange={(inputEvent) => handleOtpChange(index, inputEvent.target.value)}
                onKeyDown={(keyEvent) => handleOtpKeyDown(index, keyEvent)}
                className="h-14 w-12 rounded-xl border border-black/10 bg-card text-center text-xl font-semibold text-secondary-foreground outline-none focus:border-primary"
                required
              />
            ))}
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-secondary-foreground">New password</span>
            <div className="flex flex-row items-center gap-1 rounded-xl border border-black/10 bg-card px-4 py-3 focus-within:border-primary">
              <input
                type={isNewPasswordVisible ? "text" : "password"}
                aria-label="New password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(inputEvent) => {
                  setNewPassword(inputEvent.target.value);
                  if (changePasswordState.status === "otp-error") {
                    setChangePasswordState({ status: "otp-verify" });
                  }
                }}
                placeholder="secretPassword123$"
                className="flex-1 bg-transparent text-base text-secondary-foreground outline-none placeholder:text-muted-foreground"
                required
              />
              <button
                type="button"
                aria-label={isNewPasswordVisible ? "Hide password" : "Show password"}
                onClick={() => setIsNewPasswordVisible((wasVisible) => !wasVisible)}
                className="flex cursor-pointer items-center justify-center"
              >
                <Image
                  src={
                    isNewPasswordVisible
                      ? "/icons/visibility_off_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
                      : "/icons/visibility_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
                  }
                  alt=""
                  width={24}
                  height={24}
                />
              </button>
            </div>
            <span className="text-xs text-muted-foreground">Must be at least 8 characters.</span>
            {changePasswordState.status === "otp-error" ? (
              <span className="text-xs text-red-600">{changePasswordState.message}</span>
            ) : null}
          </label>

          <button
            type="submit"
            disabled={changePasswordState.status === "otp-submitting" || otp.join("").length !== 6}
            className="cursor-pointer rounded-full bg-primary px-4 py-3 text-sm font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          >
            {changePasswordState.status === "otp-submitting" ? "Saving…" : "Reset password"}
          </button>

          <button
            type="button"
            onClick={handleSendResetCode}
            className="cursor-pointer text-center text-sm font-medium text-[#00696E]"
          >
            Resend code
          </button>

          <button
            type="button"
            onClick={switchToCurrentPasswordMode}
            className="cursor-pointer text-center text-sm font-medium text-secondary-foreground"
          >
            Back to password change
          </button>
        </form>
      ) : (
        <div className="flex flex-col gap-6 p-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-secondary-foreground">Email address</span>
            <div className="flex flex-row items-center gap-2 rounded-xl border border-black/10 bg-muted px-4 py-3">
              <Image
                src="/icons/mail_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
                alt=""
                width={20}
                height={20}
              />
              <span className="text-base text-secondary-foreground">{email || "…"}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              We&apos;ll send a 6-digit code to your account email so you can set a new password.
            </span>
            {changePasswordState.status === "otp-start-error" ? (
              <span className="text-xs text-red-600">{changePasswordState.message}</span>
            ) : null}
          </label>

          <button
            type="button"
            onClick={handleSendResetCode}
            disabled={changePasswordState.status === "otp-sending" || !email}
            className="cursor-pointer rounded-full bg-primary px-4 py-3 text-sm font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          >
            {changePasswordState.status === "otp-sending" ? "Sending…" : "Send code"}
          </button>

          <button
            type="button"
            onClick={switchToCurrentPasswordMode}
            className="cursor-pointer text-center text-sm font-medium text-secondary-foreground"
          >
            Back to password change
          </button>
        </div>
      )}
    </div>
  );
}

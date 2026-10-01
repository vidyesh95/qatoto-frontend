"use client";

import Image from "next/image";
import { useId } from "react";
import ToggleSwitch from "@/components/ui/toggle-switch";
import { AccountEmailDisplay } from "./account-email-display";

function PasswordInputField({
  id,
  label,
  value,
  onChange,
  isVisible,
  onToggleVisible,
  placeholder,
  autoComplete,
  hintId,
  errorId,
  hintText,
  errorMessage,
}: {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly isVisible: boolean;
  readonly onToggleVisible: () => void;
  readonly placeholder?: string;
  readonly autoComplete: string;
  readonly hintId?: string;
  readonly errorId?: string;
  readonly hintText?: string;
  readonly errorMessage?: string | null;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-secondary-foreground">
        {label}
      </label>
      <div className="flex flex-row items-center gap-1 rounded-xl border border-border bg-card px-4 py-3 focus-within:border-primary">
        <input
          id={id}
          type={isVisible ? "text" : "password"}
          aria-describedby={errorMessage && hintId && errorId ? `${hintId} ${errorId}` : hintId}
          autoComplete={autoComplete}
          value={value}
          onChange={(inputEvent) => onChange(inputEvent.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-base text-secondary-foreground outline-none placeholder:text-muted-foreground"
          required
        />
        <button
          type="button"
          aria-label={isVisible ? "Hide password" : "Show password"}
          onClick={onToggleVisible}
          className="flex cursor-pointer items-center justify-center"
        >
          <Image
            src={
              isVisible
                ? "/icons/visibility_off_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
                : "/icons/visibility_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
            }
            alt=""
            width={24}
            height={24}
          />
        </button>
      </div>
      {hintText && hintId ? (
        <span id={hintId} className="text-xs text-muted-foreground">
          {hintText}
        </span>
      ) : null}
      {errorMessage && errorId ? (
        <span id={errorId} className="text-xs text-destructive">
          {errorMessage}
        </span>
      ) : null}
    </div>
  );
}

const OTP_FIELD_IDS = ["otp-1", "otp-2", "otp-3", "otp-4", "otp-5", "otp-6"] as const;

export function CurrentPasswordForm({
  email,
  currentPassword,
  onCurrentPasswordChange,
  newPassword,
  onNewPasswordChange,
  isCurrentPasswordVisible,
  onToggleCurrentPasswordVisible,
  isNewPasswordVisible,
  onToggleNewPasswordVisible,
  rememberMe,
  onRememberMeChange,
  isSubmitting,
  errorMessage,
  onSubmit,
  onForgotPasswordClick,
}: {
  readonly email: string;
  readonly currentPassword: string;
  readonly onCurrentPasswordChange: (value: string) => void;
  readonly newPassword: string;
  readonly onNewPasswordChange: (value: string) => void;
  readonly isCurrentPasswordVisible: boolean;
  readonly onToggleCurrentPasswordVisible: () => void;
  readonly isNewPasswordVisible: boolean;
  readonly onToggleNewPasswordVisible: () => void;
  readonly rememberMe: boolean;
  readonly onRememberMeChange: (value: boolean) => void;
  readonly isSubmitting: boolean;
  readonly errorMessage: string | null;
  readonly onSubmit: (formEvent: React.FormEvent<HTMLFormElement>) => void;
  readonly onForgotPasswordClick: () => void;
}) {
  const currentPasswordInputId = useId();
  const newPasswordInputId = useId();
  const newPasswordHintId = useId();
  const newPasswordErrorId = useId();

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6 p-4">
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

      <PasswordInputField
        id={currentPasswordInputId}
        label="Current password"
        value={currentPassword}
        onChange={onCurrentPasswordChange}
        isVisible={isCurrentPasswordVisible}
        onToggleVisible={onToggleCurrentPasswordVisible}
        placeholder="Current password"
        autoComplete="current-password"
      />

      <PasswordInputField
        id={newPasswordInputId}
        label="New password"
        value={newPassword}
        onChange={onNewPasswordChange}
        isVisible={isNewPasswordVisible}
        onToggleVisible={onToggleNewPasswordVisible}
        placeholder="secretPassword123$"
        autoComplete="new-password"
        hintId={newPasswordHintId}
        errorId={newPasswordErrorId}
        hintText="Must be at least 8 characters."
        errorMessage={errorMessage}
      />

      <div className="flex items-center justify-between gap-4">
        <label htmlFor="change-pw-remember-me" className="w-full text-sm font-medium">
          Remember me
        </label>
        <ToggleSwitch
          id="change-pw-remember-me"
          accessibleName="Remember me"
          isChecked={rememberMe}
          onCheckedChange={onRememberMeChange}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting || currentPassword.length < 1 || newPassword.length < 8}
        className="cursor-pointer rounded-full bg-primary px-4 py-3 text-sm font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Saving…" : "Change password"}
      </button>

      <button
        type="button"
        onClick={onForgotPasswordClick}
        className="cursor-pointer text-center text-sm font-medium text-primary-imprint"
      >
        Forgot password?
      </button>
    </form>
  );
}

export function OtpResetForm({
  email,
  otp,
  onOtpChange,
  onOtpKeyDown,
  newPassword,
  onNewPasswordChange,
  isNewPasswordVisible,
  onToggleNewPasswordVisible,
  isSubmitting,
  errorMessage,
  onSubmit,
  onResendCode,
  onBackToPasswordChange,
}: {
  readonly email: string;
  readonly otp: readonly string[];
  readonly onOtpChange: (index: number, value: string) => void;
  readonly onOtpKeyDown: (index: number, keyEvent: React.KeyboardEvent<HTMLInputElement>) => void;
  readonly newPassword: string;
  readonly onNewPasswordChange: (value: string) => void;
  readonly isNewPasswordVisible: boolean;
  readonly onToggleNewPasswordVisible: () => void;
  readonly isSubmitting: boolean;
  readonly errorMessage: string | null;
  readonly onSubmit: (formEvent: React.FormEvent<HTMLFormElement>) => void;
  readonly onResendCode: () => void;
  readonly onBackToPasswordChange: () => void;
}) {
  const resetPasswordInputId = useId();
  const resetPasswordHintId = useId();
  const resetPasswordErrorId = useId();

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6 p-4">
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
        Enter the 6-digit code we sent to <span className="font-medium">{email}</span> and choose a
        new password.
      </p>

      <div className="flex justify-center gap-3">
        {OTP_FIELD_IDS.map((fieldId, index) => (
          <input
            key={fieldId}
            type="text"
            inputMode="numeric"
            id={`change-pw-otp-${index}`}
            aria-label={`Verification code digit ${index + 1}`}
            maxLength={1}
            value={otp[index]}
            onChange={(inputEvent) => onOtpChange(index, inputEvent.target.value)}
            onKeyDown={(keyEvent) => onOtpKeyDown(index, keyEvent)}
            className="h-14 w-12 rounded-xl border border-border bg-card text-center text-xl font-semibold text-secondary-foreground outline-none focus:border-primary"
            required
          />
        ))}
      </div>

      <PasswordInputField
        id={resetPasswordInputId}
        label="New password"
        value={newPassword}
        onChange={onNewPasswordChange}
        isVisible={isNewPasswordVisible}
        onToggleVisible={onToggleNewPasswordVisible}
        placeholder="secretPassword123$"
        autoComplete="new-password"
        hintId={resetPasswordHintId}
        errorId={resetPasswordErrorId}
        hintText="Must be at least 8 characters."
        errorMessage={errorMessage}
      />

      <button
        type="submit"
        disabled={isSubmitting || otp.join("").length !== 6}
        className="cursor-pointer rounded-full bg-primary px-4 py-3 text-sm font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Saving…" : "Reset password"}
      </button>

      <button
        type="button"
        onClick={onResendCode}
        className="cursor-pointer text-center text-sm font-medium text-primary-imprint"
      >
        Resend code
      </button>

      <button
        type="button"
        onClick={onBackToPasswordChange}
        className="cursor-pointer text-center text-sm font-medium text-secondary-foreground"
      >
        Back to password change
      </button>
    </form>
  );
}

export function OtpStartView({
  email,
  isSending,
  errorMessage,
  onSendCode,
  onBackToPasswordChange,
}: {
  readonly email: string;
  readonly isSending: boolean;
  readonly errorMessage: string | null;
  readonly onSendCode: () => void;
  readonly onBackToPasswordChange: () => void;
}) {
  return (
    <div className="flex flex-col gap-6 p-4">
      <AccountEmailDisplay
        email={email}
        helperText="We'll send a 6-digit code to your account email so you can set a new password."
        errorMessage={errorMessage}
      />

      <button
        type="button"
        onClick={onSendCode}
        disabled={isSending || !email}
        className="cursor-pointer rounded-full bg-primary px-4 py-3 text-sm font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSending ? "Sending…" : "Send code"}
      </button>

      <button
        type="button"
        onClick={onBackToPasswordChange}
        className="cursor-pointer text-center text-sm font-medium text-secondary-foreground"
      >
        Back to password change
      </button>
    </div>
  );
}

"use client";

import Image from "next/image";
import { useId } from "react";
import ToggleSwitch from "@/components/ui/toggle-switch";
import { AccountEmailDisplay } from "./account-email-display";

const OTP_FIELD_IDS = ["otp-1", "otp-2", "otp-3", "otp-4", "otp-5", "otp-6"] as const;

export function AlreadySetCredentialView({
  email,
  isOriginal,
  accountId,
  unlinkStatus,
  unlinkErrorMessage,
  onUnlink,
  onSetConfirming,
  onCancelConfirming,
}: {
  readonly email: string;
  readonly isOriginal: boolean;
  readonly accountId: string;
  readonly unlinkStatus: "idle" | "confirming" | "unlinking" | "error";
  readonly unlinkErrorMessage?: string;
  readonly onUnlink: (accountId: string) => void;
  readonly onSetConfirming: () => void;
  readonly onCancelConfirming: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 p-4 pt-8">
      <Image
        src="/icons/check_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
        alt=""
        width={48}
        height={48}
      />
      <p className="text-center text-sm font-medium text-primary-imprint">
        Email &amp; password sign-in is already enabled for this account.
      </p>
      {email ? (
        <div className="flex flex-row items-center gap-2 self-stretch rounded-xl border border-border bg-muted px-4 py-3">
          <Image
            src="/icons/mail_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
            alt=""
            width={20}
            height={20}
          />
          <span className="text-base text-secondary-foreground">{email}</span>
        </div>
      ) : null}
      {isOriginal ? (
        <p className="text-center text-sm text-muted-foreground">
          This is your primary sign-in method and can&apos;t be disconnected.
        </p>
      ) : unlinkStatus === "confirming" ? (
        <div className="flex w-full flex-col gap-3">
          <p className="text-center text-sm text-muted-foreground">
            Disconnect email &amp; password? You can set it up again later.
          </p>
          <button
            type="button"
            onClick={() => onUnlink(accountId)}
            className="flex w-full cursor-pointer items-center justify-center rounded-full bg-destructive px-4 py-3 text-sm font-medium text-destructive-foreground transition-opacity hover:opacity-90"
          >
            Disconnect email &amp; password
          </button>
          <button
            type="button"
            onClick={onCancelConfirming}
            className="flex w-full cursor-pointer items-center justify-center rounded-full border border-border px-4 py-3 text-sm font-medium text-secondary-foreground transition-colors hover:bg-muted"
          >
            Cancel
          </button>
        </div>
      ) : unlinkStatus === "unlinking" ? (
        <button
          type="button"
          disabled
          className="flex w-full cursor-not-allowed items-center justify-center rounded-full border border-destructive/40 px-4 py-3 text-sm font-medium text-destructive opacity-50"
        >
          Disconnecting…
        </button>
      ) : (
        <div className="flex w-full flex-col gap-2">
          {unlinkStatus === "error" && unlinkErrorMessage ? (
            <p className="text-center text-sm text-destructive">{unlinkErrorMessage}</p>
          ) : null}
          <button
            type="button"
            onClick={onSetConfirming}
            className="flex w-full cursor-pointer items-center justify-center rounded-full border border-destructive/40 px-4 py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
          >
            Disconnect email &amp; password
          </button>
        </div>
      )}
    </div>
  );
}

export function VerifyAndSetPasswordForm({
  email,
  otp,
  onOtpChange,
  onOtpKeyDown,
  password,
  onPasswordChange,
  isPasswordVisible,
  onTogglePasswordVisible,
  rememberMe,
  onRememberMeChange,
  isSubmitting,
  errorMessage,
  onSubmit,
  onResendCode,
}: {
  readonly email: string;
  readonly otp: readonly string[];
  readonly onOtpChange: (index: number, value: string) => void;
  readonly onOtpKeyDown: (index: number, keyEvent: React.KeyboardEvent<HTMLInputElement>) => void;
  readonly password: string;
  readonly onPasswordChange: (value: string) => void;
  readonly isPasswordVisible: boolean;
  readonly onTogglePasswordVisible: () => void;
  readonly rememberMe: boolean;
  readonly onRememberMeChange: (value: boolean) => void;
  readonly isSubmitting: boolean;
  readonly errorMessage?: string;
  readonly onSubmit: (formEvent: React.FormEvent<HTMLFormElement>) => void;
  readonly onResendCode: () => void;
}) {
  const passwordInputId = useId();
  const passwordHintId = useId();
  const passwordErrorId = useId();

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
        password to enable email sign-in.
      </p>

      <div className="flex justify-center gap-3">
        {OTP_FIELD_IDS.map((fieldId, index) => (
          <input
            key={fieldId}
            type="text"
            inputMode="numeric"
            id={`credential-otp-${index}`}
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

      <div className="flex flex-col gap-2">
        <label htmlFor={passwordInputId} className="text-sm font-medium text-secondary-foreground">
          Password
        </label>
        <div className="flex flex-row items-center gap-1 rounded-xl border border-border bg-card px-4 py-3 focus-within:border-primary">
          <input
            id={passwordInputId}
            type={isPasswordVisible ? "text" : "password"}
            aria-describedby={
              errorMessage ? `${passwordHintId} ${passwordErrorId}` : passwordHintId
            }
            autoComplete="new-password"
            value={password}
            onChange={(inputEvent) => onPasswordChange(inputEvent.target.value)}
            placeholder="secretPassword123$"
            className="flex-1 bg-transparent text-base text-secondary-foreground outline-none placeholder:text-muted-foreground"
            required
          />
          <button
            type="button"
            aria-label={isPasswordVisible ? "Hide password" : "Show password"}
            onClick={onTogglePasswordVisible}
            className="flex cursor-pointer items-center justify-center"
          >
            <Image
              src={
                isPasswordVisible
                  ? "/icons/visibility_off_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
                  : "/icons/visibility_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
              }
              alt=""
              width={24}
              height={24}
            />
          </button>
        </div>
        <span id={passwordHintId} className="text-xs text-muted-foreground">
          Must be at least 8 characters.
        </span>
        {errorMessage ? (
          <span id={passwordErrorId} className="text-xs text-destructive">
            {errorMessage}
          </span>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-4">
        <label htmlFor="email-credential-remember-me" className="w-full text-sm font-medium">
          Remember me
        </label>
        <ToggleSwitch
          id="email-credential-remember-me"
          accessibleName="Remember me"
          isChecked={rememberMe}
          onCheckedChange={onRememberMeChange}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting || otp.join("").length !== 6}
        className="cursor-pointer rounded-full bg-primary px-4 py-3 text-sm font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Saving…" : "Enable email sign-in"}
      </button>

      <button
        type="button"
        onClick={onResendCode}
        className="cursor-pointer text-center text-sm font-medium text-primary-imprint"
      >
        Resend code
      </button>
    </form>
  );
}

export function StartFlowView({
  email,
  isSending,
  errorMessage,
  onSendCode,
}: {
  readonly email: string;
  readonly isSending: boolean;
  readonly errorMessage?: string;
  readonly onSendCode: () => void;
}) {
  return (
    <div className="flex flex-col gap-6 p-4">
      <AccountEmailDisplay
        email={email}
        helperText="We'll send a 6-digit code to your account email so you can add password sign-in."
        errorMessage={errorMessage ?? null}
      />

      <button
        type="button"
        onClick={onSendCode}
        disabled={isSending || !email}
        className="cursor-pointer rounded-full bg-primary px-4 py-3 text-sm font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSending ? "Sending…" : "Send code"}
      </button>
    </div>
  );
}

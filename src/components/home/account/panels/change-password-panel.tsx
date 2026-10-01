"use client";

import Image from "next/image";
import { useState } from "react";
import { authClient, useSession } from "@/lib/auth-client";
import { CurrentPasswordForm, OtpResetForm, OtpStartView } from "./change-password-subforms";

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
      <header className="sticky top-0 z-10 flex flex-row items-center gap-4 border-b border-border bg-background p-4">
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
        <CurrentPasswordForm
          email={email}
          currentPassword={currentPassword}
          onCurrentPasswordChange={(value) => {
            setCurrentPassword(value);
            if (changePasswordState.status === "current-error") {
              setChangePasswordState({ status: "current-form" });
            }
          }}
          newPassword={newPassword}
          onNewPasswordChange={(value) => {
            setNewPassword(value);
            if (changePasswordState.status === "current-error") {
              setChangePasswordState({ status: "current-form" });
            }
          }}
          isCurrentPasswordVisible={isCurrentPasswordVisible}
          onToggleCurrentPasswordVisible={() =>
            setIsCurrentPasswordVisible((wasVisible) => !wasVisible)
          }
          isNewPasswordVisible={isNewPasswordVisible}
          onToggleNewPasswordVisible={() => setIsNewPasswordVisible((wasVisible) => !wasVisible)}
          rememberMe={rememberMe}
          onRememberMeChange={setRememberMe}
          isSubmitting={changePasswordState.status === "current-submitting"}
          errorMessage={
            changePasswordState.status === "current-error" ? changePasswordState.message : null
          }
          onSubmit={handleChangeWithCurrentPassword}
          onForgotPasswordClick={switchToOtpMode}
        />
      ) : changePasswordState.status === "otp-verify" ||
        changePasswordState.status === "otp-submitting" ||
        changePasswordState.status === "otp-error" ? (
        <OtpResetForm
          email={email}
          otp={otp}
          onOtpChange={handleOtpChange}
          onOtpKeyDown={handleOtpKeyDown}
          newPassword={newPassword}
          onNewPasswordChange={(value) => {
            setNewPassword(value);
            if (changePasswordState.status === "otp-error") {
              setChangePasswordState({ status: "otp-verify" });
            }
          }}
          isNewPasswordVisible={isNewPasswordVisible}
          onToggleNewPasswordVisible={() => setIsNewPasswordVisible((wasVisible) => !wasVisible)}
          isSubmitting={changePasswordState.status === "otp-submitting"}
          errorMessage={
            changePasswordState.status === "otp-error" ? changePasswordState.message : null
          }
          onSubmit={handleResetWithOtp}
          onResendCode={handleSendResetCode}
          onBackToPasswordChange={switchToCurrentPasswordMode}
        />
      ) : (
        <OtpStartView
          email={email}
          isSending={changePasswordState.status === "otp-sending"}
          errorMessage={
            changePasswordState.status === "otp-start-error" ? changePasswordState.message : null
          }
          onSendCode={handleSendResetCode}
          onBackToPasswordChange={switchToCurrentPasswordMode}
        />
      )}
    </div>
  );
}

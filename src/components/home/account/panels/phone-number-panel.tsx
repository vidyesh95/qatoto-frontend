"use client";

import Image from "next/image";
import { useState } from "react";
import { authClient, useSession } from "@/lib/auth-client";

/**
 * Sets and verifies the account's phone number via a one-time SMS code:
 *
 *   1. Enter number — authClient.phoneNumber.sendOtp({ phoneNumber })
 *   2. Enter the 6-digit code — authClient.phoneNumber.verify({ phoneNumber, code })
 *      → backend marks phoneNumberVerified and persists the number.
 *
 * Not a trust boundary — the Express backend (Better Auth phoneNumber plugin +
 * SMS provider) owns the code, re-validates the number, and is the only
 * authority that persists it. The client only drives the UI and submits input.
 */

/** What the set-phone flow is currently doing. */
type PhoneNumberState =
  | { status: "enter-number" }
  | { status: "sending-code" }
  | { status: "enter-number-error"; message: string }
  | { status: "verify-code" }
  | { status: "verifying" }
  | { status: "verify-error"; message: string };

type PhoneNumberPanelProps = {
  /** Current phone number, prefilled into the field (from a prior edit). */
  initialPhoneNumber: string;
  /** Return to the settings action list. */
  onBack: () => void;
};

export function PhoneNumberPanel({ initialPhoneNumber, onBack }: PhoneNumberPanelProps) {
  const { refetch } = useSession();
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [phoneNumberState, setPhoneNumberState] = useState<PhoneNumberState>({
    status: "enter-number",
  });

  const trimmedPhoneNumber = phoneNumber.trim();
  const isCodeView =
    phoneNumberState.status === "verify-code" ||
    phoneNumberState.status === "verifying" ||
    phoneNumberState.status === "verify-error";

  async function handleSendCode(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (trimmedPhoneNumber.length === 0) return;
    setPhoneNumberState({ status: "sending-code" });

    const { error } = await authClient.phoneNumber.sendOtp({ phoneNumber: trimmedPhoneNumber });
    if (error) {
      setPhoneNumberState({
        status: "enter-number-error",
        message: "Couldn't send the code. Check the number and try again.",
      });
      return;
    }
    setOtp(["", "", "", "", "", ""]);
    setPhoneNumberState({ status: "verify-code" });
  }

  async function handleVerify(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const code = otp.join("");
    if (code.length !== 6) return;
    setPhoneNumberState({ status: "verifying" });

    const { error } = await authClient.phoneNumber.verify({
      phoneNumber: trimmedPhoneNumber,
      code,
    });
    if (error) {
      setPhoneNumberState({
        status: "verify-error",
        message: "Invalid or expired code. Please try again.",
      });
      return;
    }

    // Backend persisted + verified the number; pull a fresh session so the
    // "Verified" chip shows on the settings list.
    await refetch();
    onBack();
  }

  async function handleResendCode() {
    if (trimmedPhoneNumber.length === 0) return;
    setPhoneNumberState({ status: "sending-code" });
    const { error } = await authClient.phoneNumber.sendOtp({ phoneNumber: trimmedPhoneNumber });
    if (error) {
      setPhoneNumberState({
        status: "verify-error",
        message: "Couldn't resend the code. Please try again.",
      });
      return;
    }
    setPhoneNumberState({ status: "verify-code" });
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
      document.getElementById(`phone-otp-${nextIndex}`)?.focus();
      return;
    }
    if (!/^[0-9]?$/.test(value)) return;
    const nextOtp = [...otp];
    nextOtp[index] = value;
    setOtp(nextOtp);
    if (value && index < 5) document.getElementById(`phone-otp-${index + 1}`)?.focus();
  }

  function handleOtpKeyDown(index: number, keyEvent: React.KeyboardEvent<HTMLInputElement>) {
    if (keyEvent.key === "Backspace" && !otp[index] && index > 0) {
      document.getElementById(`phone-otp-${index - 1}`)?.focus();
    }
  }

  function switchToEnterNumber() {
    setPhoneNumberState({ status: "enter-number" });
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
        <h2 className="text-xl font-medium text-secondary-foreground">Set phone number</h2>
      </header>

      {!isCodeView ? (
        <form onSubmit={handleSendCode} className="flex flex-col gap-6 p-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-secondary-foreground">Phone number</span>
            <input
              type="tel"
              inputMode="tel"
              aria-label="Phone number"
              autoComplete="tel"
              value={phoneNumber}
              onChange={(inputEvent) => {
                setPhoneNumber(inputEvent.target.value);
                if (phoneNumberState.status === "enter-number-error") {
                  setPhoneNumberState({ status: "enter-number" });
                }
              }}
              placeholder="+1 555 000 0000"
              maxLength={20}
              className="rounded-xl border border-black/10 bg-card px-4 py-3 text-base text-secondary-foreground outline-none focus:border-primary"
            />
            <span className="text-xs text-muted-foreground">
              Include your country code. We&apos;ll text a 6-digit code to confirm it&apos;s yours.
            </span>
            {phoneNumberState.status === "enter-number-error" ? (
              <span className="text-xs text-red-600">{phoneNumberState.message}</span>
            ) : null}
          </label>

          <button
            type="submit"
            disabled={phoneNumberState.status === "sending-code" || trimmedPhoneNumber.length === 0}
            className="cursor-pointer rounded-full bg-primary px-4 py-3 text-sm font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          >
            {phoneNumberState.status === "sending-code" ? "Sending…" : "Send code"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="flex flex-col gap-6 p-4">
          <p className="text-sm text-muted-foreground">
            Enter the 6-digit code we sent to{" "}
            <span className="font-medium">{trimmedPhoneNumber}</span>.
          </p>

          <div className="flex justify-center gap-3">
            {otp.map((digit, index) => (
              <input
                key={index}
                type="text"
                inputMode="numeric"
                id={`phone-otp-${index}`}
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

          {phoneNumberState.status === "verify-error" ? (
            <span className="text-center text-xs text-red-600">{phoneNumberState.message}</span>
          ) : null}

          <button
            type="submit"
            disabled={phoneNumberState.status === "verifying" || otp.join("").length !== 6}
            className="cursor-pointer rounded-full bg-primary px-4 py-3 text-sm font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          >
            {phoneNumberState.status === "verifying" ? "Verifying…" : "Verify"}
          </button>

          <button
            type="button"
            onClick={handleResendCode}
            className="cursor-pointer text-center text-sm font-medium text-[#00696E]"
          >
            Resend code
          </button>

          <button
            type="button"
            onClick={switchToEnterNumber}
            className="cursor-pointer text-center text-sm font-medium text-secondary-foreground"
          >
            Change number
          </button>
        </form>
      )}
    </div>
  );
}

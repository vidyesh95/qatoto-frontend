"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { z } from "zod";
import { authClient, useSession } from "@/lib/auth-client";
import { API_BASE_URL } from "@/lib/api";

/**
 * Sets or changes the account's BACKUP recovery email — a second address,
 * distinct from the primary sign-in email (BACKEND_STRUCTURE.md recovery flow):
 *
 *   GET  /users/me/recovery-email                          → current value + verified state
 *   POST /users/me/recovery-email/start  { recoveryEmail } → mails a code to the NEW address
 *   POST /users/me/recovery-email/verify { otp, stepUp… }  → step-up proof + that code → saved
 *
 * Changing the recovery email is step-up gated: a plain session is never enough.
 * Password accounts prove with their password (`stepUpPassword`); OAuth-only
 * accounts request a one-time code to their PRIMARY email via
 * POST /users/me/recovery-email/step-up-challenge and prove with `stepUpOtp`.
 *
 * Not a trust boundary — the Express backend re-validates the OTP, re-checks the
 * step-up credential, and is the sole authority that persists the address.
 */

const ErrorEnvelopeSchema = z
  .object({
    message: z.string().optional(),
    errors: z.record(z.string(), z.array(z.string())).optional(),
  })
  .strip();

const RecoveryEmailStatusSchema = z
  .object({
    recoveryEmail: z.string().nullable(),
    recoveryEmailVerified: z.boolean(),
  })
  .strip();

/** Best-effort read of the backend's error envelope. */
function readErrorMessage(payload: unknown, fallback: string): string {
  const parsed = ErrorEnvelopeSchema.safeParse(payload);
  if (!parsed.success) return fallback;
  return parsed.data.errors?.recoveryEmail?.[0] ?? parsed.data.message ?? fallback;
}

/** The currently-saved recovery email, loaded on mount. */
type CurrentState =
  | { status: "loading" }
  | { status: "ready"; recoveryEmail: string | null; isVerified: boolean };

/** Whether this account proves step-up with a password or a primary-email code. */
type StepUpMode = "password" | "otp";

/** The send-candidate-code → verify+save flow. */
type FlowState =
  | { status: "enter-email" }
  | { status: "starting" }
  | { status: "enter-email-error"; message: string }
  | { status: "verify" }
  | { status: "verifying" }
  | { status: "verify-error"; message: string };

type RecoveryEmailPanelProps = {
  /** Return to the settings action list. */
  onBack: () => void;
};

export function RecoveryEmailPanel({ onBack }: RecoveryEmailPanelProps) {
  const { refetch } = useSession();

  const [currentState, setCurrentState] = useState<CurrentState>({ status: "loading" });
  const [stepUpMode, setStepUpMode] = useState<StepUpMode>("password");
  const [flowState, setFlowState] = useState<FlowState>({ status: "enter-email" });

  const [candidateEmail, setCandidateEmail] = useState("");
  const [candidateOtp, setCandidateOtp] = useState(["", "", "", "", "", ""]);
  const [stepUpPassword, setStepUpPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [stepUpOtp, setStepUpOtp] = useState("");
  const [isStepUpCodeSent, setIsStepUpCodeSent] = useState(false);

  // Load the current recovery email, and decide the step-up path: a `credential`
  // account row means the user has a password; otherwise they're OAuth-only and
  // must prove step-up with a code mailed to their primary email.
  useEffect(() => {
    let isActive = true;
    void (async () => {
      const [statusResponse, accountsResult] = await Promise.all([
        fetch(`${API_BASE_URL}/users/me/recovery-email`, { credentials: "include" }).catch(
          () => null,
        ),
        authClient.listAccounts(),
      ]);
      if (!isActive) return;

      const hasPassword = Boolean(
        accountsResult.data?.some((linkedAccount) => linkedAccount.providerId === "credential"),
      );
      setStepUpMode(hasPassword ? "password" : "otp");

      const rawStatus = await statusResponse?.json().catch(() => null);
      const parsedStatus = RecoveryEmailStatusSchema.safeParse(
        (rawStatus as { data?: unknown } | null)?.data,
      );
      if (!isActive) return;
      if (statusResponse?.ok && parsedStatus.success) {
        setCurrentState({
          status: "ready",
          recoveryEmail: parsedStatus.data.recoveryEmail,
          isVerified: parsedStatus.data.recoveryEmailVerified,
        });
      } else {
        setCurrentState({ status: "ready", recoveryEmail: null, isVerified: false });
      }
    })();
    return () => {
      isActive = false;
    };
  }, []);

  async function handleStart(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const trimmedEmail = candidateEmail.trim();
    if (trimmedEmail.length === 0) return;
    setFlowState({ status: "starting" });
    try {
      const response = await fetch(`${API_BASE_URL}/users/me/recovery-email/start`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recoveryEmail: trimmedEmail }),
      });
      if (!response.ok) {
        const message =
          response.status === 409
            ? "Your recovery email must be different from your primary email."
            : readErrorMessage(
                await response.json().catch(() => null),
                "Couldn't send the code. Please try again.",
              );
        setFlowState({ status: "enter-email-error", message });
        return;
      }
      setFlowState({ status: "verify" });
    } catch {
      setFlowState({ status: "enter-email-error", message: "Network error. Please try again." });
    }
  }

  async function handleSendStepUpCode() {
    try {
      await fetch(`${API_BASE_URL}/users/me/recovery-email/step-up-challenge`, {
        method: "POST",
        credentials: "include",
      });
      setIsStepUpCodeSent(true);
    } catch {
      setFlowState({
        status: "verify-error",
        message: "Couldn't send the step-up code. Please try again.",
      });
    }
  }

  async function handleVerify(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const code = candidateOtp.join("");
    if (code.length !== 6) return;
    const stepUpField =
      stepUpMode === "password" ? { stepUpPassword } : { stepUpOtp: stepUpOtp.trim() };
    setFlowState({ status: "verifying" });
    try {
      const response = await fetch(`${API_BASE_URL}/users/me/recovery-email/verify`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: code, ...stepUpField }),
      });
      if (!response.ok) {
        const message =
          response.status === 401
            ? "Step-up or verification code is wrong. Please check and try again."
            : response.status === 410
              ? "That verification code has expired. Request a new one."
              : response.status === 403
                ? "Too many incorrect attempts. Request a new code."
                : readErrorMessage(
                    await response.json().catch(() => null),
                    "Couldn't verify the recovery email. Please try again.",
                  );
        setFlowState({ status: "verify-error", message });
        return;
      }
      await refetch();
      onBack();
    } catch {
      setFlowState({ status: "verify-error", message: "Network error. Please try again." });
    }
  }

  function handleOtpChange(index: number, value: string) {
    if (value.length > 1) {
      const digits = value
        .replace(/[^0-9]/g, "")
        .split("")
        .slice(0, 6);
      const nextOtp = [...candidateOtp];
      digits.forEach((digit, offset) => {
        if (index + offset < 6) nextOtp[index + offset] = digit;
      });
      setCandidateOtp(nextOtp);
      const nextIndex = Math.min(index + digits.length, 5);
      document.getElementById(`recovery-otp-${nextIndex}`)?.focus();
      return;
    }
    if (!/^[0-9]?$/.test(value)) return;
    const nextOtp = [...candidateOtp];
    nextOtp[index] = value;
    setCandidateOtp(nextOtp);
    if (value && index < 5) document.getElementById(`recovery-otp-${index + 1}`)?.focus();
  }

  function handleOtpKeyDown(index: number, keyEvent: React.KeyboardEvent<HTMLInputElement>) {
    if (keyEvent.key === "Backspace" && !candidateOtp[index] && index > 0) {
      document.getElementById(`recovery-otp-${index - 1}`)?.focus();
    }
  }

  const isVerifyStep =
    flowState.status === "verify" ||
    flowState.status === "verifying" ||
    flowState.status === "verify-error";

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
        <h2 className="text-xl font-medium text-secondary-foreground">
          Set recovery email address
        </h2>
      </header>

      {currentState.status === "loading" ? (
        <p className="p-4 text-sm text-muted-foreground">Loading…</p>
      ) : isVerifyStep ? (
        <form onSubmit={handleVerify} className="flex flex-col gap-6 p-4">
          <p className="text-sm text-muted-foreground">
            Enter the 6-digit code we sent to{" "}
            <span className="font-medium">{candidateEmail.trim()}</span>, then confirm it&apos;s
            you.
          </p>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-secondary-foreground">Verification code</span>
            <div className="flex justify-center gap-3">
              {candidateOtp.map((digit, index) => (
                <input
                  key={index}
                  type="text"
                  inputMode="numeric"
                  id={`recovery-otp-${index}`}
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
          </label>

          {stepUpMode === "password" ? (
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-secondary-foreground">
                Confirm your password
              </span>
              <div className="flex flex-row items-center gap-1 rounded-xl border border-black/10 bg-card px-4 py-3 focus-within:border-primary">
                <input
                  type={isPasswordVisible ? "text" : "password"}
                  aria-label="Password"
                  value={stepUpPassword}
                  onChange={(inputEvent) => {
                    setStepUpPassword(inputEvent.target.value);
                    if (flowState.status === "verify-error") setFlowState({ status: "verify" });
                  }}
                  placeholder="secretPassword123$"
                  className="flex-1 bg-transparent text-base text-secondary-foreground outline-none placeholder:text-muted-foreground"
                  required
                />
                <button
                  type="button"
                  aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                  onClick={() => setIsPasswordVisible((wasVisible) => !wasVisible)}
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
            </label>
          ) : (
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-secondary-foreground">
                Code sent to your primary email
              </span>
              <div className="flex flex-row items-center gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  aria-label="Step-up code from your primary email"
                  value={stepUpOtp}
                  onChange={(inputEvent) => {
                    setStepUpOtp(inputEvent.target.value);
                    if (flowState.status === "verify-error") setFlowState({ status: "verify" });
                  }}
                  placeholder="123456"
                  className="flex-1 rounded-xl border border-black/10 bg-card px-4 py-3 text-base text-secondary-foreground outline-none focus:border-primary"
                  required
                />
                <button
                  type="button"
                  onClick={handleSendStepUpCode}
                  className="shrink-0 cursor-pointer rounded-full border border-black/10 px-4 py-3 text-sm font-medium text-secondary-foreground transition-colors hover:bg-muted"
                >
                  {isStepUpCodeSent ? "Resend" : "Send code"}
                </button>
              </div>
              <span className="text-xs text-muted-foreground">
                We&apos;ll send a code to your primary email to confirm it&apos;s you.
              </span>
            </label>
          )}

          {flowState.status === "verify-error" ? (
            <span className="text-xs text-red-600">{flowState.message}</span>
          ) : null}

          <button
            type="submit"
            disabled={flowState.status === "verifying" || candidateOtp.join("").length !== 6}
            className="cursor-pointer rounded-full bg-primary px-4 py-3 text-sm font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          >
            {flowState.status === "verifying" ? "Saving…" : "Save recovery email"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleStart} className="flex flex-col gap-6 p-4">
          {currentState.recoveryEmail ? (
            <div className="flex flex-col gap-1 rounded-xl bg-muted px-4 py-3">
              <span className="text-xs font-medium text-muted-foreground">
                Current recovery email
              </span>
              <span className="text-sm text-secondary-foreground">
                {currentState.recoveryEmail}
                {currentState.isVerified ? " (verified)" : " (unverified)"}
              </span>
            </div>
          ) : null}

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-secondary-foreground">
              {currentState.recoveryEmail ? "New recovery email" : "Recovery email"}
            </span>
            <input
              type="email"
              aria-label="Recovery email"
              value={candidateEmail}
              onChange={(inputEvent) => {
                setCandidateEmail(inputEvent.target.value);
                if (flowState.status === "enter-email-error")
                  setFlowState({ status: "enter-email" });
              }}
              placeholder="backup@example.com"
              className="rounded-xl border border-black/10 bg-card px-4 py-3 text-base text-secondary-foreground outline-none focus:border-primary"
              required
            />
            <span className="text-xs text-muted-foreground">
              A backup address, different from your sign-in email. We&apos;ll send it a code to
              confirm you own it.
            </span>
            {flowState.status === "enter-email-error" ? (
              <span className="text-xs text-red-600">{flowState.message}</span>
            ) : null}
          </label>

          <button
            type="submit"
            disabled={flowState.status === "starting" || candidateEmail.trim().length === 0}
            className="cursor-pointer rounded-full bg-primary px-4 py-3 text-sm font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          >
            {flowState.status === "starting" ? "Sending…" : "Send code"}
          </button>
        </form>
      )}
    </div>
  );
}

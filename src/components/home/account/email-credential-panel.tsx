"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { z } from "zod";
import { authClient, useSession } from "@/lib/auth-client";
import { API_BASE_URL } from "@/lib/api";

/**
 * Enables email + password sign-in on an account that signed up with OAuth only
 * (Google / GitHub) — the contract's "Path C" (BACKEND_STRUCTURE.md §5e/§6):
 *
 *   POST /signup/start    { email }                 → sends a 6-digit OTP
 *   POST /signup/complete { email, otp, password }  → verifies the OTP and
 *     attaches a `credential` account row to the SAME user (201 linked).
 *
 * The email is LOCKED to the account's own `session.user.email`. Submitting a
 * different email would resolve to Path A and create a SEPARATE user, so we never
 * expose a free-text email field here.
 *
 * Not a trust boundary — the backend re-verifies the OTP, hashes the password
 * (argon2id), and is the sole authority that links the credential.
 */

const ErrorEnvelopeSchema = z
  .object({
    message: z.string().optional(),
    errors: z.record(z.string(), z.array(z.string())).optional(),
  })
  .strip();

/** Best-effort read of the backend's error envelope. */
function readCompleteError(payload: unknown): string {
  const fallback = "Couldn't set up email sign-in. Please try again.";
  const parsed = ErrorEnvelopeSchema.safeParse(payload);
  if (!parsed.success) return fallback;
  return parsed.data.errors?.password?.[0] ?? parsed.data.message ?? fallback;
}

/** Does the account already have an email+password credential? */
type CredentialState = { status: "loading" } | { status: "already-set" } | { status: "available" };

/** The send-OTP → verify+set-password flow. */
type FlowState =
  | { status: "start" }
  | { status: "sending" }
  | { status: "verify" }
  | { status: "submitting" }
  | { status: "start-error"; message: string }
  | { status: "verify-error"; message: string };

type EmailCredentialPanelProps = {
  /** Return to the settings action list. */
  onBack: () => void;
};

export function EmailCredentialPanel({ onBack }: EmailCredentialPanelProps) {
  const { data: session, refetch } = useSession();
  const email = session?.user.email ?? "";

  const [credentialState, setCredentialState] = useState<CredentialState>({ status: "loading" });
  const [flowState, setFlowState] = useState<FlowState>({ status: "start" });
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  // Path C only applies to OAuth-only accounts. If a `credential` row already
  // exists, completing again would 409 — so detect it up front and say so.
  useEffect(() => {
    let isActive = true;
    void (async () => {
      const { data: linkedAccounts, error } = await authClient.listAccounts();
      if (!isActive) return;
      if (error || !linkedAccounts) {
        // Can't confirm; let the user try and rely on the backend to gate it.
        setCredentialState({ status: "available" });
        return;
      }
      const hasCredential = linkedAccounts.some(
        (linkedAccount) => linkedAccount.providerId === "credential",
      );
      setCredentialState({ status: hasCredential ? "already-set" : "available" });
    })();
    return () => {
      isActive = false;
    };
  }, []);

  async function handleSendCode() {
    if (!email) return;
    setFlowState({ status: "sending" });
    try {
      const response = await fetch(`${API_BASE_URL}/signup/start`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        setFlowState({ status: "start-error", message: "Couldn't send the code. Try again." });
        return;
      }
      setFlowState({ status: "verify" });
    } catch {
      setFlowState({ status: "start-error", message: "Network error. Please try again." });
    }
  }

  async function handleComplete(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const code = otp.join("");
    if (code.length !== 6 || password.length < 8) return;
    setFlowState({ status: "submitting" });
    try {
      const response = await fetch(`${API_BASE_URL}/signup/complete`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: code, password }),
      });
      if (!response.ok) {
        const message =
          response.status === 409
            ? "Email & password sign-in is already set up."
            : response.status === 401
              ? "Invalid or expired code."
              : readCompleteError(await response.json().catch(() => null));
        setFlowState({ status: "verify-error", message });
        return;
      }
      // Credential linked; pull a fresh session and return to the list.
      await refetch();
      onBack();
    } catch {
      setFlowState({ status: "verify-error", message: "Network error. Please try again." });
    }
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
      document.getElementById(`credential-otp-${nextIndex}`)?.focus();
      return;
    }
    if (!/^[0-9]?$/.test(value)) return;
    const nextOtp = [...otp];
    nextOtp[index] = value;
    setOtp(nextOtp);
    if (value && index < 5) document.getElementById(`credential-otp-${index + 1}`)?.focus();
  }

  function handleOtpKeyDown(index: number, keyEvent: React.KeyboardEvent<HTMLInputElement>) {
    if (keyEvent.key === "Backspace" && !otp[index] && index > 0) {
      document.getElementById(`credential-otp-${index - 1}`)?.focus();
    }
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
        <h2 className="text-xl font-medium text-secondary-foreground">Set email address</h2>
      </header>

      {credentialState.status === "loading" ? (
        <p className="p-4 text-sm text-muted-foreground">Loading…</p>
      ) : credentialState.status === "already-set" ? (
        <div className="flex flex-col items-center gap-4 p-4 pt-8">
          <Image
            src="/icons/check_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt=""
            width={48}
            height={48}
          />
          <p className="text-center text-sm font-medium text-[#00696E]">
            Email &amp; password sign-in is already enabled for this account.
          </p>
        </div>
      ) : flowState.status === "verify" ||
        flowState.status === "submitting" ||
        flowState.status === "verify-error" ? (
        <form onSubmit={handleComplete} className="flex flex-col gap-6 p-4">
          <p className="text-sm text-muted-foreground">
            Enter the 6-digit code we sent to <span className="font-medium">{email}</span> and
            choose a password to enable email sign-in.
          </p>

          <div className="flex justify-center gap-3">
            {otp.map((digit, index) => (
              <input
                key={index}
                type="text"
                inputMode="numeric"
                id={`credential-otp-${index}`}
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
            <span className="text-sm font-medium text-secondary-foreground">Password</span>
            <div className="flex flex-row items-center gap-1 rounded-xl border border-black/10 bg-card px-4 py-3 focus-within:border-primary">
              <input
                type={isPasswordVisible ? "text" : "password"}
                aria-label="Password"
                value={password}
                onChange={(inputEvent) => {
                  setPassword(inputEvent.target.value);
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
            <span className="text-xs text-muted-foreground">Must be at least 8 characters.</span>
            {flowState.status === "verify-error" ? (
              <span className="text-xs text-red-600">{flowState.message}</span>
            ) : null}
          </label>

          <button
            type="submit"
            disabled={flowState.status === "submitting" || otp.join("").length !== 6}
            className="cursor-pointer rounded-full bg-primary px-4 py-3 text-sm font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          >
            {flowState.status === "submitting" ? "Saving…" : "Enable email sign-in"}
          </button>

          <button
            type="button"
            onClick={handleSendCode}
            className="cursor-pointer text-center text-sm font-medium text-[#00696E]"
          >
            Resend code
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
              We&apos;ll send a 6-digit code to your account email so you can add password sign-in.
            </span>
            {flowState.status === "start-error" ? (
              <span className="text-xs text-red-600">{flowState.message}</span>
            ) : null}
          </label>

          <button
            type="button"
            onClick={handleSendCode}
            disabled={flowState.status === "sending" || !email}
            className="cursor-pointer rounded-full bg-primary px-4 py-3 text-sm font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          >
            {flowState.status === "sending" ? "Sending…" : "Send code"}
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { z } from "zod";
import { authClient, useSession } from "@/lib/auth-client";
import { API_BASE_URL } from "@/lib/api";
import { findOriginalProviderId } from "@/lib/account-links";

const OTP_FIELD_IDS = ["otp-1", "otp-2", "otp-3", "otp-4", "otp-5", "otp-6"] as const;

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
type CredentialState =
  | { status: "loading" }
  // `accountId` targets the row for unlink; `isOriginal` locks the disconnect off
  // when email+password is the method the account was created with.
  | { status: "already-set"; accountId: string; isOriginal: boolean }
  | { status: "available" };

/** The disconnect (unlink credential) flow, separate from the add-credential flow. */
type UnlinkState =
  | { status: "idle" }
  | { status: "confirming" }
  | { status: "unlinking" }
  | { status: "error"; message: string };

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
  const [unlinkState, setUnlinkState] = useState<UnlinkState>({ status: "idle" });
  const [flowState, setFlowState] = useState<FlowState>({ status: "start" });
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

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
      const credentialAccount = linkedAccounts.find(
        (linkedAccount) => linkedAccount.providerId === "credential",
      );
      if (!credentialAccount) {
        setCredentialState({ status: "available" });
        return;
      }
      setCredentialState({
        status: "already-set",
        accountId: credentialAccount.accountId,
        isOriginal: findOriginalProviderId(linkedAccounts) === "credential",
      });
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

  // Remove the email+password credential. The original provider never reaches
  // here (its row hides the button), and the backend re-checks both rules.
  async function handleUnlinkCredential(accountId: string) {
    setUnlinkState({ status: "unlinking" });
    const { error } = await authClient.unlinkAccount({ providerId: "credential", accountId });
    if (error) {
      setUnlinkState({
        status: "error",
        message:
          error.code === "FAILED_TO_UNLINK_LAST_ACCOUNT"
            ? "This is the only sign-in method on your account, so it can't be removed."
            : "Couldn't disconnect email & password. Please try again.",
      });
      return;
    }
    await refetch();
    setUnlinkState({ status: "idle" });
    setCredentialState({ status: "available" });
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
          {email ? (
            <div className="flex flex-row items-center gap-2 self-stretch rounded-xl border border-black/10 bg-muted px-4 py-3">
              <Image
                src="/icons/mail_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
                alt=""
                width={20}
                height={20}
              />
              <span className="text-base text-secondary-foreground">{email}</span>
            </div>
          ) : null}
          {credentialState.isOriginal ? (
            <p className="text-center text-sm text-muted-foreground">
              This is your primary sign-in method and can&apos;t be disconnected.
            </p>
          ) : unlinkState.status === "confirming" ? (
            <div className="flex w-full flex-col gap-3">
              <p className="text-center text-sm text-muted-foreground">
                Disconnect email &amp; password? You can set it up again later.
              </p>
              <button
                type="button"
                onClick={() => handleUnlinkCredential(credentialState.accountId)}
                className="flex w-full cursor-pointer items-center justify-center rounded-full bg-red-600 px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Disconnect email &amp; password
              </button>
              <button
                type="button"
                onClick={() => setUnlinkState({ status: "idle" })}
                className="flex w-full cursor-pointer items-center justify-center rounded-full border border-black/10 px-4 py-3 text-sm font-medium text-secondary-foreground transition-colors hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          ) : unlinkState.status === "unlinking" ? (
            <button
              type="button"
              disabled
              className="flex w-full cursor-not-allowed items-center justify-center rounded-full border border-red-300 px-4 py-3 text-sm font-medium text-red-600 opacity-50"
            >
              Disconnecting…
            </button>
          ) : (
            <div className="flex w-full flex-col gap-2">
              {unlinkState.status === "error" ? (
                <p className="text-center text-sm text-red-600">{unlinkState.message}</p>
              ) : null}
              <button
                type="button"
                onClick={() => setUnlinkState({ status: "confirming" })}
                className="flex w-full cursor-pointer items-center justify-center rounded-full border border-red-300 px-4 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
              >
                Disconnect email &amp; password
              </button>
            </div>
          )}
        </div>
      ) : flowState.status === "verify" ||
        flowState.status === "submitting" ||
        flowState.status === "verify-error" ? (
        <form onSubmit={handleComplete} className="flex flex-col gap-6 p-4">
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
            Enter the 6-digit code we sent to <span className="font-medium">{email}</span> and
            choose a password to enable email sign-in.
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
                autoComplete="new-password"
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

          <div className="flex items-center justify-between gap-4">
            <label htmlFor="email-credential-remember-me" className="w-full text-sm font-medium">
              Remember me
            </label>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                id="email-credential-remember-me"
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

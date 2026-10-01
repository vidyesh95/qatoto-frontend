"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { API_BASE_URL } from "@/lib/api";
import { findOriginalProviderId } from "@/lib/account-links";

export type CredentialState =
  | { status: "loading" }
  | { status: "available" }
  | { status: "already-set"; accountId: string; isOriginal: boolean };

export type UnlinkState =
  | { status: "idle" }
  | { status: "confirming" }
  | { status: "unlinking" }
  | { status: "error"; message: string };

export type FlowState =
  | { status: "start" }
  | { status: "sending" }
  | { status: "verify" }
  | { status: "submitting" }
  | { status: "start-error"; message: string }
  | { status: "verify-error"; message: string };

const ErrorEnvelopeSchema = z.object({
  message: z.string().optional(),
  errors: z.record(z.string(), z.array(z.string())).optional(),
});

function readCompleteError(payload: unknown): string {
  const fallback = "Couldn't set up email sign-in. Please try again.";
  const parsed = ErrorEnvelopeSchema.safeParse(payload);
  if (!parsed.success) return fallback;
  return parsed.data.errors?.password?.[0] ?? parsed.data.message ?? fallback;
}

export function useEmailCredentialState({
  email,
  refetchSession,
  onSuccessBack,
}: {
  readonly email: string;
  readonly refetchSession: () => Promise<unknown>;
  readonly onSuccessBack: () => void;
}) {
  const [credentialState, setCredentialState] = useState<CredentialState>({ status: "loading" });
  const [unlinkState, setUnlinkState] = useState<UnlinkState>({ status: "idle" });
  const [flowState, setFlowState] = useState<FlowState>({ status: "start" });
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    let isActive = true;
    void (async () => {
      const { data: linkedAccounts, error } = await authClient.listAccounts();
      if (!isActive) return;
      if (error || !linkedAccounts) {
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

  const isSendingRef = useRef(false);
  const isSubmittingRef = useRef(false);

  async function handleSendCode() {
    if (!email || isSendingRef.current) return;
    isSendingRef.current = true;
    setFlowState({ status: "sending" });
    try {
      const response = await fetch(`${API_BASE_URL}/signup/start`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      isSendingRef.current = false;
      if (!response.ok) {
        setFlowState({ status: "start-error", message: "Couldn't send the code. Try again." });
        return;
      }
      setFlowState({ status: "verify" });
    } catch (sendError) {
      isSendingRef.current = false;
      setFlowState({
        status: "start-error",
        message:
          sendError instanceof Error ? sendError.message : "Network error. Please try again.",
      });
    }
  }

  async function handleComplete(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const code = otp.join("");
    if (code.length !== 6 || password.length < 8 || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setFlowState({ status: "submitting" });
    try {
      const response = await fetch(`${API_BASE_URL}/signup/complete`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: code, password }),
      });
      isSubmittingRef.current = false;
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
      await refetchSession();
      onSuccessBack();
    } catch (completeError) {
      isSubmittingRef.current = false;
      setFlowState({
        status: "verify-error",
        message:
          completeError instanceof Error
            ? completeError.message
            : "Network error. Please try again.",
      });
    }
  }

  async function handleUnlinkCredential(targetAccountId: string) {
    setUnlinkState({ status: "unlinking" });
    const { error } = await authClient.unlinkAccount({ accountId: targetAccountId });
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
    await refetchSession();
    setUnlinkState({ status: "idle" });
    setCredentialState({ status: "available" });
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

  function handlePasswordChange(value: string) {
    setPassword(value);
    if (flowState.status === "verify-error") setFlowState({ status: "verify" });
  }

  return {
    credentialState,
    unlinkState,
    flowState,
    otp,
    password,
    isPasswordVisible,
    rememberMe,
    handleSendCode,
    handleComplete,
    handleUnlinkCredential,
    handleOtpChange,
    handleOtpKeyDown,
    handlePasswordChange,
    setIsPasswordVisible,
    setRememberMe,
    setUnlinkConfirming: () => setUnlinkState({ status: "confirming" }),
    setUnlinkIdle: () => setUnlinkState({ status: "idle" }),
  };
}

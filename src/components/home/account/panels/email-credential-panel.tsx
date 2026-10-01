"use client";

import Image from "next/image";
import { useSession } from "@/lib/auth-client";
import { useEmailCredentialState } from "@/hooks/account/use-email-credential-state";
import {
  AlreadySetCredentialView,
  StartFlowView,
  VerifyAndSetPasswordForm,
} from "./email-credential-subforms";

type EmailCredentialPanelProps = {
  /** Return to the settings action list. */
  onBack: () => void;
};

function EmailCredentialHeader({ onBack }: { onBack: () => void }) {
  return (
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
      <h2 className="text-xl font-medium text-secondary-foreground">Set email address</h2>
    </header>
  );
}

interface EmailCredentialContentProps {
  email: string;
  state: ReturnType<typeof useEmailCredentialState>;
}

function EmailCredentialContent({ email, state }: EmailCredentialContentProps) {
  const {
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
    setUnlinkConfirming,
    setUnlinkIdle,
  } = state;

  if (credentialState.status === "loading") {
    return <p className="p-4 text-sm text-muted-foreground">Loading…</p>;
  }

  if (credentialState.status === "already-set") {
    return (
      <AlreadySetCredentialView
        email={email}
        isOriginal={credentialState.isOriginal}
        accountId={credentialState.accountId}
        unlinkStatus={unlinkState.status}
        unlinkErrorMessage={unlinkState.status === "error" ? unlinkState.message : undefined}
        onUnlink={handleUnlinkCredential}
        onSetConfirming={setUnlinkConfirming}
        onCancelConfirming={setUnlinkIdle}
      />
    );
  }

  const isVerifying =
    flowState.status === "verify" ||
    flowState.status === "submitting" ||
    flowState.status === "verify-error";

  if (isVerifying) {
    return (
      <VerifyAndSetPasswordForm
        email={email}
        otp={otp}
        onOtpChange={handleOtpChange}
        onOtpKeyDown={handleOtpKeyDown}
        password={password}
        onPasswordChange={handlePasswordChange}
        isPasswordVisible={isPasswordVisible}
        onTogglePasswordVisible={() => setIsPasswordVisible((wasVisible) => !wasVisible)}
        rememberMe={rememberMe}
        onRememberMeChange={setRememberMe}
        isSubmitting={flowState.status === "submitting"}
        errorMessage={flowState.status === "verify-error" ? flowState.message : undefined}
        onSubmit={handleComplete}
        onResendCode={handleSendCode}
      />
    );
  }

  return (
    <StartFlowView
      email={email}
      isSending={flowState.status === "sending"}
      errorMessage={flowState.status === "start-error" ? flowState.message : undefined}
      onSendCode={handleSendCode}
    />
  );
}

export function EmailCredentialPanel({ onBack }: EmailCredentialPanelProps) {
  const { data: session, refetch } = useSession();
  const email = session?.user.email ?? "";

  const state = useEmailCredentialState({
    email,
    refetchSession: refetch,
    onSuccessBack: onBack,
  });

  return (
    <div>
      <EmailCredentialHeader onBack={onBack} />
      <EmailCredentialContent email={email} state={state} />
    </div>
  );
}

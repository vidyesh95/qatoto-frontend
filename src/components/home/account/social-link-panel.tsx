"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { findOriginalProviderId } from "@/lib/account-links";

/**
 * Links a social provider (Google / GitHub) onto the CURRENTLY signed-in account
 * so "one user = one email" holds (BACKEND_STRUCTURE.md §5a/§5e). One reusable
 * panel for both providers.
 *
 * Uses Better Auth's `linkSocial` — NOT `signIn.social`. `linkSocial` is
 * session-scoped: it attaches the provider to *this* user and rejects a provider
 * whose verified email doesn't match the account email, instead of silently
 * creating or switching to a different user. The link is persisted server-side
 * during the OAuth callback, so it survives the full-page redirect even though
 * this client-only menu unmounts.
 *
 * Not a trust boundary — the Express backend re-derives the user from the session
 * cookie and is the sole authority that writes the `account` row.
 */

type SocialProvider = "google" | "github";

const PROVIDER_LABEL: Record<SocialProvider, string> = {
  google: "Google",
  github: "GitHub",
};

const PROVIDER_ICON: Record<SocialProvider, string> = {
  google: "/icons/google_logo_tint.svg",
  github: "/icons/github_logo_light.svg",
};

/** Lifecycle of the link action for the panel's single provider. */
type LinkState =
  | { status: "loading" }
  | { status: "unlinked" }
  // `isOriginal` = this is the provider the account was created with, so it can't
  // be disconnected. `accountId` is what `unlinkAccount` needs to target the row.
  | { status: "linked"; accountId: string; isOriginal: boolean }
  | { status: "confirm-unlink"; accountId: string }
  | { status: "unlinking" }
  | { status: "redirecting" }
  | { status: "error"; message: string };

type SocialLinkPanelProps = {
  /** Which provider this panel links. */
  provider: SocialProvider;
  /** Return to the settings action list. */
  onBack: () => void;
};

/**
 * A failed `linkSocial` returns the user via an OAuth redirect carrying an
 * `?error=` code (not a thrown error), so we read it from the URL on mount and
 * scrub it so a reload doesn't keep showing it. Best-effort: the code isn't
 * provider-tagged, so the message uses this panel's provider.
 */
function readLinkErrorFromUrl(provider: SocialProvider): string | null {
  if (typeof window === "undefined") return null;
  const searchParams = new URLSearchParams(window.location.search);
  const errorCode = searchParams.get("error");
  if (!errorCode) return null;

  searchParams.delete("error");
  const remainingQuery = searchParams.toString();
  const scrubbedUrl =
    window.location.pathname + (remainingQuery ? `?${remainingQuery}` : "") + window.location.hash;
  window.history.replaceState(null, "", scrubbedUrl);

  const providerLabel = PROVIDER_LABEL[provider];
  switch (errorCode) {
    case "email_doesn't_match":
      return `That ${providerLabel} account's email doesn't match your account email.`;
    case "account_already_linked_to_different_user":
      return `That ${providerLabel} account is already linked to a different user.`;
    default:
      return `Couldn't link your ${providerLabel} account. Please try again.`;
  }
}

export function SocialLinkPanel({ provider, onBack }: SocialLinkPanelProps) {
  const [linkState, setLinkState] = useState<LinkState>({ status: "loading" });
  const providerLabel = PROVIDER_LABEL[provider];

  // Bootstrap: surface any redirect error, then ask the backend which providers
  // are already linked so we can show "Connected" instead of a connect button.
  useEffect(() => {
    const redirectErrorMessage = readLinkErrorFromUrl(provider);
    let isActive = true;

    void (async () => {
      const { data: linkedAccounts, error } = await authClient.listAccounts();
      if (!isActive) return;
      if (redirectErrorMessage) {
        setLinkState({ status: "error", message: redirectErrorMessage });
        return;
      }
      if (error || !linkedAccounts) {
        setLinkState({
          status: "error",
          message: `Couldn't load your ${providerLabel} connection. Please try again.`,
        });
        return;
      }
      const thisProviderAccount = linkedAccounts.find(
        (linkedAccount) => linkedAccount.providerId === provider,
      );
      if (!thisProviderAccount) {
        setLinkState({ status: "unlinked" });
        return;
      }
      setLinkState({
        status: "linked",
        accountId: thisProviderAccount.accountId,
        isOriginal: findOriginalProviderId(linkedAccounts) === provider,
      });
    })();

    return () => {
      isActive = false;
    };
  }, [provider, providerLabel]);

  async function handleConnectClick() {
    setLinkState({ status: "redirecting" });
    // callbackURL returns the user to this same page; the link itself is written
    // server-side during the callback regardless of where they land.
    const { data, error } = await authClient.linkSocial({
      provider,
      callbackURL: window.location.href,
      // On a failed link (e.g. the provider email doesn't match this account)
      // come back to the app with `?error=…` instead of Better Auth's raw error
      // page; readLinkErrorFromUrl() turns it into a friendly message.
      errorCallbackURL: window.location.href,
    });
    if (error) {
      setLinkState({
        status: "error",
        message: `Couldn't start linking your ${providerLabel} account. Please try again.`,
      });
      return;
    }
    // The client usually navigates on its own; this is the explicit fallback.
    if (data?.url) window.location.href = data.url;
  }

  // Two-step confirm so a disconnect is never one stray tap; the original
  // provider never reaches here because its row shows no Disconnect button.
  function handleRequestUnlink(accountId: string) {
    setLinkState({ status: "confirm-unlink", accountId });
  }

  function handleCancelUnlink(accountId: string) {
    setLinkState({ status: "linked", accountId, isOriginal: false });
  }

  async function handleConfirmUnlink(accountId: string) {
    setLinkState({ status: "unlinking" });
    const { error } = await authClient.unlinkAccount({ providerId: provider, accountId });
    if (error) {
      setLinkState({
        status: "error",
        message:
          error.code === "FAILED_TO_UNLINK_LAST_ACCOUNT"
            ? "This is the only sign-in method on your account, so it can't be removed."
            : `Couldn't disconnect your ${providerLabel} account. Please try again.`,
      });
      return;
    }
    setLinkState({ status: "unlinked" });
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
        <h2 className="text-xl font-medium text-secondary-foreground">
          Link {providerLabel} account
        </h2>
      </header>

      <div className="flex flex-col items-center gap-6 p-4 pt-8">
        <Image src={PROVIDER_ICON[provider]} alt="" width={48} height={48} />
        <SocialLinkBody
          state={linkState}
          providerLabel={providerLabel}
          onConnect={handleConnectClick}
          onRequestUnlink={handleRequestUnlink}
          onConfirmUnlink={handleConfirmUnlink}
          onCancelUnlink={handleCancelUnlink}
        />
      </div>
    </div>
  );
}

/** Status + action under the provider mark — exhaustive over every link state. */
function SocialLinkBody({
  state,
  providerLabel,
  onConnect,
  onRequestUnlink,
  onConfirmUnlink,
  onCancelUnlink,
}: {
  state: LinkState;
  providerLabel: string;
  onConnect: () => void;
  onRequestUnlink: (accountId: string) => void;
  onConfirmUnlink: (accountId: string) => void;
  onCancelUnlink: (accountId: string) => void;
}) {
  const connectButton = (label: string, disabled: boolean) => (
    <button
      type="button"
      onClick={onConnect}
      disabled={disabled}
      className="flex w-full cursor-pointer items-center justify-center rounded-full bg-primary px-4 py-3 text-sm font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
    >
      {label}
    </button>
  );

  const connectedRow = (
    <div className="flex flex-row items-center gap-2 text-sm font-medium text-[#00696E]">
      <Image
        src="/icons/check_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
        alt=""
        width={20}
        height={20}
      />
      <span>{providerLabel} is connected</span>
    </div>
  );

  switch (state.status) {
    case "loading":
      return <p className="text-sm text-muted-foreground">Loading…</p>;
    case "unlinked":
      return (
        <div className="flex w-full flex-col gap-4">
          <p className="text-center text-sm text-muted-foreground">
            Connect your {providerLabel} account to sign in with {providerLabel} next time. It must
            use the same email as this account.
          </p>
          {connectButton(`Connect ${providerLabel}`, false)}
        </div>
      );
    case "redirecting":
      return (
        <div className="flex w-full flex-col gap-4">
          <p className="text-center text-sm text-muted-foreground">
            Redirecting you to {providerLabel}…
          </p>
          {connectButton("Redirecting…", true)}
        </div>
      );
    case "linked":
      return (
        <div className="flex w-full flex-col items-center gap-4">
          {connectedRow}
          {state.isOriginal ? (
            <p className="text-center text-sm text-muted-foreground">
              This is your primary sign-in method and can&apos;t be disconnected.
            </p>
          ) : (
            <button
              type="button"
              onClick={() => onRequestUnlink(state.accountId)}
              className="flex w-full cursor-pointer items-center justify-center rounded-full border border-red-300 px-4 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              Disconnect {providerLabel}
            </button>
          )}
        </div>
      );
    case "confirm-unlink":
      return (
        <div className="flex w-full flex-col items-center gap-4">
          {connectedRow}
          <p className="text-center text-sm text-muted-foreground">
            Disconnect {providerLabel}? You can reconnect it later.
          </p>
          <button
            type="button"
            onClick={() => onConfirmUnlink(state.accountId)}
            className="flex w-full cursor-pointer items-center justify-center rounded-full bg-red-600 px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Disconnect {providerLabel}
          </button>
          <button
            type="button"
            onClick={() => onCancelUnlink(state.accountId)}
            className="flex w-full cursor-pointer items-center justify-center rounded-full border border-black/10 px-4 py-3 text-sm font-medium text-secondary-foreground transition-colors hover:bg-muted"
          >
            Cancel
          </button>
        </div>
      );
    case "unlinking":
      return (
        <div className="flex w-full flex-col items-center gap-4">
          {connectedRow}
          <button
            type="button"
            disabled
            className="flex w-full cursor-not-allowed items-center justify-center rounded-full border border-red-300 px-4 py-3 text-sm font-medium text-red-600 opacity-50"
          >
            Disconnecting…
          </button>
        </div>
      );
    case "error":
      return (
        <div className="flex w-full flex-col gap-4">
          <p className="text-center text-sm text-red-600">{state.message}</p>
          {connectButton(`Connect ${providerLabel}`, false)}
        </div>
      );
    default: {
      const exhaustiveCheck: never = state;
      return exhaustiveCheck;
    }
  }
}

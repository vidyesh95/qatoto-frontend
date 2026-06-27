"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { authClient, useSession } from "@/lib/auth-client";

/** One signed-in account, projected from a Better Auth device session. */
type DeviceSession = {
  /** Opaque session token — the handle for setActive / revoke. */
  token: string;
  /** Owning user id — used to mark the active account and detect revoking it. */
  userId: string;
  name: string;
  handle: string | null;
  image: string | null;
};

/** Panel data state — one variant per renderable situation (no loose booleans). */
type SwitchAccountState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; sessions: DeviceSession[] };

type SwitchAccountPanelProps = {
  /** Invoked by the header back button. */
  onBack: () => void;
  /** Sign out of every account (clears all device sessions). Owned by the parent menu. */
  onSignOutAll: () => void;
};

/** Project a Better Auth list-device-sessions entry into our row shape. */
function toDeviceSession(entry: {
  session: { token: string };
  user: { id: string; name: string; handle?: string | null; image?: string | null };
}): DeviceSession {
  return {
    token: entry.session.token,
    userId: entry.user.id,
    name: entry.user.name,
    handle: entry.user.handle ?? null,
    image: entry.user.image ?? null,
  };
}

const AVATAR_FALLBACK = "/dummy/profile_photo_girl.avif";

const redirectHome = () => {
  window.location.href = "/";
};

const redirectToSignIn = () => {
  window.location.href = "/sign-in";
};

/**
 * Account switcher backed by Better Auth multi-session. Lists every account
 * signed in on this browser, lets the user switch the active one (setActive),
 * sign out of one (revoke), sign out of all (parent's signOut), or add another
 * (a fresh sign-in, which the backend appends as a new device session).
 *
 * Nothing here is a trust boundary — the Express/Better Auth backend owns every
 * session mutation and re-authorizes each call.
 */
export function SwitchAccountPanel({ onBack, onSignOutAll }: SwitchAccountPanelProps) {
  // The active identity, used to mark the current row and detect when the user
  // revokes the account they're currently signed in as.
  const { data: session, refetch } = useSession();

  const [state, setState] = useState<SwitchAccountState>({ status: "loading" });
  // Token of the row whose switch/revoke is in flight — disables its buttons.
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  // Transient message for a failed switch/revoke, shown above the list.
  const [actionError, setActionError] = useState<string | null>(null);

  // Load the signed-in accounts once when the panel mounts.
  useEffect(() => {
    let isActive = true;
    void (async () => {
      const { data, error } = await authClient.multiSession.listDeviceSessions();
      if (!isActive) return;
      if (error || !data) {
        setState({ status: "error" });
        return;
      }
      setState({ status: "ready", sessions: data.map(toDeviceSession) });
    })();
    return () => {
      isActive = false;
    };
  }, []);

  const activeUserId = session?.user.id ?? null;

  const handleSwitch = async (target: DeviceSession) => {
    if (target.userId === activeUserId) return;
    setPendingToken(target.token);
    setActionError(null);
    const { error } = await authClient.multiSession.setActive({ sessionToken: target.token });
    if (error) {
      setActionError("Couldn't switch to that account. Please try again.");
      setPendingToken(null);
      return;
    }
    // Reload home as the newly-active account so all page data refetches cleanly.
    redirectHome();
  };

  const handleRevoke = async (target: DeviceSession) => {
    setPendingToken(target.token);
    setActionError(null);
    const { error } = await authClient.multiSession.revoke({ sessionToken: target.token });
    if (error) {
      setActionError("Couldn't sign out of that account. Please try again.");
      setPendingToken(null);
      return;
    }
    // Revoke has no auto-refresh, so re-read the list to drive the next step.
    const { data, error: listError } = await authClient.multiSession.listDeviceSessions();
    if (listError || !data) {
      // The revoke succeeded but we can't refresh — fall back to home.
      redirectHome();
      return;
    }
    const refreshed = data.map(toDeviceSession);
    // Stay in the switcher only while two or more accounts remain; once removal
    // drops to one (or zero), leave for the home page.
    if (refreshed.length <= 1) {
      redirectHome();
      return;
    }
    // If the revoked account was the active one, the server promoted another —
    // refresh the session so the navbar/avatar reflect the new active identity.
    if (target.userId === activeUserId) await refetch();
    setState({ status: "ready", sessions: refreshed });
    setPendingToken(null);
  };

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
        <h2 className="text-xl font-medium text-secondary-foreground">Switch account</h2>
      </header>

      {actionError ? (
        <p className="px-4 pt-4 text-sm text-red-600" role="alert">
          {actionError}
        </p>
      ) : null}

      <SwitchAccountBody
        state={state}
        activeUserId={activeUserId}
        pendingToken={pendingToken}
        onSwitch={handleSwitch}
        onRevoke={handleRevoke}
      />

      <hr className="mx-4" />

      <button
        type="button"
        onClick={redirectToSignIn}
        className="flex w-full cursor-pointer flex-row items-center gap-4 p-4 transition-colors hover:bg-muted"
      >
        <Image
          src="/icons/switch_account_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
          alt=""
          width={24}
          height={24}
          className="size-6 shrink-0"
        />
        <span className="text-sm font-medium text-secondary-foreground">Add account</span>
      </button>

      <button
        type="button"
        onClick={onSignOutAll}
        className="flex w-full cursor-pointer flex-row items-center gap-4 p-4 transition-colors hover:bg-muted"
      >
        <Image
          src="/icons/logout_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
          alt=""
          width={24}
          height={24}
          className="size-6 shrink-0"
        />
        <span className="text-sm font-medium text-secondary-foreground">
          Log out of all accounts
        </span>
      </button>
    </div>
  );
}

type SwitchAccountBodyProps = {
  state: SwitchAccountState;
  activeUserId: string | null;
  pendingToken: string | null;
  onSwitch: (target: DeviceSession) => void;
  onRevoke: (target: DeviceSession) => void;
};

/** Renders the account list for each data state with an exhaustive switch. */
function SwitchAccountBody({
  state,
  activeUserId,
  pendingToken,
  onSwitch,
  onRevoke,
}: SwitchAccountBodyProps) {
  switch (state.status) {
    case "loading":
      return <p className="p-4 text-sm text-muted-foreground">Loading…</p>;
    case "error":
      return (
        <p className="p-4 text-sm text-muted-foreground">
          Couldn&apos;t load your accounts. Please try again.
        </p>
      );
    case "ready":
      return (
        <ul>
          {state.sessions.map((account) => {
            const isCurrent = account.userId === activeUserId;
            const isPending = pendingToken === account.token;
            return (
              <li key={account.token} className="flex flex-row items-center">
                <button
                  type="button"
                  onClick={isCurrent ? undefined : () => onSwitch(account)}
                  disabled={isCurrent || isPending}
                  className="flex min-w-0 flex-1 cursor-pointer flex-row items-center gap-4 p-4 transition-colors hover:bg-muted disabled:cursor-default disabled:opacity-60 disabled:hover:bg-transparent"
                >
                  <Image
                    src={account.image ?? AVATAR_FALLBACK}
                    alt=""
                    width={40}
                    height={40}
                    className="size-10 shrink-0 rounded-full object-cover ring-1 ring-primary"
                  />
                  <span className="flex min-w-0 flex-1 flex-col text-left">
                    <span className="truncate text-sm font-medium text-secondary-foreground">
                      {account.name}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      @{account.handle ?? "…"}
                    </span>
                  </span>
                  {isCurrent ? (
                    <span className="shrink-0 text-xs font-medium text-[#00696E]">Current</span>
                  ) : null}
                </button>
                <button
                  type="button"
                  onClick={() => onRevoke(account)}
                  disabled={isPending}
                  aria-label={`Sign out ${account.name}`}
                  className="mr-2 shrink-0 cursor-pointer rounded-full p-2 transition-colors hover:bg-muted disabled:cursor-default disabled:opacity-60"
                >
                  <Image
                    src="/icons/logout_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                    alt=""
                    width={20}
                    height={20}
                    className="size-5"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      );
    default: {
      const exhaustiveCheck: never = state;
      return exhaustiveCheck;
    }
  }
}

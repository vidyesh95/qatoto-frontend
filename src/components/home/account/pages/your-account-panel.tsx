// TRANSPORT: client-query — session, `GET /users/me/linked-accounts`, and the panels' own writes.
"use client";

// THE HOST FOR EVERY `/your-account/*` SUB-ROUTE.
//
// ONE COMPONENT WITH AN EXHAUSTIVE SWITCH, not nine near-identical shells. The panels differ only
// in which props they need, and every one of those props comes from the same two reads — the Better
// Auth session and the provider list — so nine files would each have re-derived them. Adding a
// tenth panel is now a compile error here until it is handled, which is the point of the `never`
// (CLAUDE.md Pattern 1).
//
// THE PANELS THEMSELVES ARE UNTOUCHED. They still draw their own sticky back-header with the arrow,
// which is why the route layout deliberately adds no `<h1>` — two stacked headers is the visible
// tell that Parts 2–3 (the container-query rewrite that gives them page width) have not happened.

import { useRouter } from "next/navigation";

import { signOut, useSession } from "@/lib/auth-client";
import type { ActionResponse } from "@/lib/http";
import type { LinkedAccount } from "@/lib/account/linked-accounts.schemas";
import {
  useInvalidateLinkedAccounts,
  useLinkedAccountsQuery,
} from "@/hooks/account/linked-accounts";
import { ChangePasswordPanel } from "@/components/home/account/panels/change-password-panel";
import { EmailCredentialPanel } from "@/components/home/account/panels/email-credential-panel";
import { FullNamePanel } from "@/components/home/account/panels/full-name-panel";
import { HandlePanel } from "@/components/home/account/panels/handle-panel";
import { PasskeysPanel } from "@/components/home/account/panels/passkeys-panel";
import { PhoneNumberPanel } from "@/components/home/account/panels/phone-number-panel";
import { ProfilePhotoPanel } from "@/components/home/account/panels/profile-photo-panel";
import { SocialLinkPanel } from "@/components/home/account/panels/social-link-panel";
import { SwitchAccountPanel } from "@/components/home/account/menus/switch-account-menu";

/** One `/your-account/<segment>`. The values ARE the URL segments — keep them in step. */
export type YourAccountPanelKind =
  | "full-name"
  | "profile-photo"
  | "handle"
  | "phone-number"
  | "password"
  | "passkeys"
  | "google"
  | "github"
  | "switch-account";

/** What the provider list currently is. Three panels cannot render correctly without it. */
type LinkedAccountsView =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; accountsByProvider: ReadonlyMap<string, string | null> };

export default function YourAccountPanel({ panel }: { panel: YourAccountPanelKind }) {
  const router = useRouter();
  const { data: session } = useSession();
  const linkedAccountsQuery = useLinkedAccountsQuery();
  const invalidateLinkedAccounts = useInvalidateLinkedAccounts();

  // Going back is also the moment the index has to be re-read: the visitor may have just set a
  // password or unlinked GitHub, and those writes go through the Better Auth SDK, so nothing in the
  // query cache knows they happened. Without this the index still says "Set email address" on an
  // account that now has one.
  const handleBack = () => {
    void invalidateLinkedAccounts();
    router.push("/your-account");
  };

  const linkedAccountsView = toLinkedAccountsView(
    linkedAccountsQuery.isPending,
    linkedAccountsQuery.data,
  );

  switch (panel) {
    case "full-name":
      return <FullNamePanel initialFullName={session?.user.name ?? ""} onBack={handleBack} />;

    case "profile-photo":
      return (
        <ProfilePhotoPanel
          currentPhotoUrl={session?.user.image ?? "/dummy/profile_photo_girl.avif"}
          hasExistingPhoto={Boolean(session?.user.image)}
          onBack={handleBack}
        />
      );

    case "handle":
      return <HandlePanel onBack={handleBack} />;

    case "phone-number":
      return (
        <PhoneNumberPanel
          initialPhoneNumber={session?.user.phoneNumber ?? ""}
          onBack={handleBack}
        />
      );

    case "passkeys":
      return <PasskeysPanel onBack={handleBack} />;

    case "switch-account":
      return <SwitchAccountPanel onBack={handleBack} onSignOutAll={signOutAndGoHome} />;

    // ONE URL, TWO PANELS. Whether this is "set a password" or "change the one you have" is not
    // something the URL can know — it is `accountsByProvider.has("credential")`. The dropdown
    // branches on exactly this at `menus/settings-menu.tsx`, and splitting it into two routes would
    // publish a link that is wrong for half the people who click it.
    case "password": {
      if (linkedAccountsView.status !== "ready") {
        return <LinkedAccountsFallback view={linkedAccountsView} />;
      }
      return linkedAccountsView.accountsByProvider.has("credential") ? (
        <ChangePasswordPanel onBack={handleBack} />
      ) : (
        <EmailCredentialPanel onBack={handleBack} />
      );
    }

    case "google":
    case "github": {
      if (linkedAccountsView.status !== "ready") {
        return <LinkedAccountsFallback view={linkedAccountsView} />;
      }
      return (
        <SocialLinkPanel
          provider={panel}
          linkedEmail={linkedAccountsView.accountsByProvider.get(panel) ?? null}
          onBack={handleBack}
        />
      );
    }

    default: {
      const exhaustiveCheck: never = panel;
      return exhaustiveCheck;
    }
  }
}

/** Query result → view state. A failed read is a message, never a silently empty provider list. */
function toLinkedAccountsView(
  isPending: boolean,
  result: ActionResponse<LinkedAccount[]> | undefined,
): LinkedAccountsView {
  if (isPending || result === undefined) return { status: "loading" };
  if (!result.success) return { status: "error", message: result.error.message };
  return {
    status: "ready",
    accountsByProvider: new Map(result.data.map((account) => [account.providerId, account.email])),
  };
}

function LinkedAccountsFallback({ view }: { view: LinkedAccountsView }) {
  return (
    <p className="px-4 pt-6 text-sm text-muted-foreground lg:px-6">
      {view.status === "error" ? view.message : "Loading…"}
    </p>
  );
}

/**
 * End the session and leave.
 *
 * A full reload rather than a router push: it is the only way to be sure no in-memory copy of the
 * previous session survives in the query cache or a provider. Same three lines as
 * `menus/account-menu.tsx`.
 */
async function signOutAndGoHome() {
  await signOut();
  window.location.href = "/";
}

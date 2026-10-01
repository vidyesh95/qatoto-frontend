// TRANSPORT: client-query — the Better Auth session and `GET /users/me/linked-accounts`, which
// together decide which rows this list shows. Every write belongs to the editor it opens.
"use client";

import { useState } from "react";
import { useSession } from "@/lib/auth-client";
import {
  useInvalidateLinkedAccounts,
  useLinkedAccountsQuery,
} from "@/hooks/account/linked-accounts";
import { DataAndPrivacyPanel } from "@/components/home/account/panels/data-and-privacy-panel";
import { WatchTimePanel } from "@/components/home/account/panels/watch-time-panel";
import { FeedPreferencesPanel } from "@/components/home/account/panels/feed-preferences-panel";
import {
  type AccountEditor,
  YourAccountPanel,
} from "@/components/home/account/menus/your-account-menu";
import {
  SettingsEditorView,
  SettingsListView,
} from "@/components/home/account/menus/settings-menu-views";
import { buildSettingsItems } from "@/components/home/account/menus/settings-menu-items";

type SettingsView =
  | { kind: "list" }
  | { kind: "your-account" }
  | { kind: "data-and-privacy" }
  | { kind: "watch-time" }
  | { kind: "feed-preferences" }
  | {
      kind: "editor";
      editor: AccountEditor;
      returnTo: "list" | "your-account" | "data-and-privacy";
    };

type SettingsPanelProps = {
  /** Return to the account menu. */
  onBack: () => void;
  /** Sign the user out (owned by the parent menu). */
  onSignOut: () => void;
};

export function SettingsPanel({ onBack, onSignOut }: SettingsPanelProps) {
  const { data: session } = useSession();
  const avatarSrc = session?.user.image ?? "/dummy/profile_photo_girl.avif";

  const [view, setView] = useState<SettingsView>({ kind: "list" });

  const linkedAccountsQuery = useLinkedAccountsQuery();
  const invalidateLinkedAccounts = useInvalidateLinkedAccounts();

  const openEditorFrom =
    (returnTo: "list" | "your-account" | "data-and-privacy") => (editor: AccountEditor) =>
      setView({ kind: "editor", editor, returnTo });

  if (view.kind === "your-account") {
    return (
      <YourAccountPanel
        onBack={() => setView({ kind: "list" })}
        onOpenEditor={openEditorFrom("your-account")}
      />
    );
  }

  if (view.kind === "data-and-privacy") {
    return (
      <DataAndPrivacyPanel
        onBack={() => setView({ kind: "list" })}
        onOpenEditor={openEditorFrom("data-and-privacy")}
      />
    );
  }

  if (view.kind === "watch-time") {
    return <WatchTimePanel onBack={() => setView({ kind: "list" })} />;
  }

  if (view.kind === "feed-preferences") {
    return <FeedPreferencesPanel onBack={() => setView({ kind: "list" })} />;
  }

  if (view.kind === "editor") {
    const handleEditorBack = () => {
      void invalidateLinkedAccounts();
      setView({ kind: view.returnTo });
    };

    return (
      <SettingsEditorView
        editor={view.editor}
        onBack={handleEditorBack}
        onSignOut={onSignOut}
        userName={session?.user.name}
        userImage={session?.user.image}
        userPhoneNumber={session?.user.phoneNumber}
        avatarSrc={avatarSrc}
        linkedAccountsResult={linkedAccountsQuery.data}
      />
    );
  }

  const linkedAccountsResult = linkedAccountsQuery.data;
  const accountsByProvider =
    linkedAccountsResult?.success === true
      ? new Map(linkedAccountsResult.data.map((account) => [account.providerId, account.email]))
      : null;

  const items = buildSettingsItems({
    session,
    accountsByProvider,
    onOpenView: (kind) => setView({ kind }),
    onOpenEditor: openEditorFrom("list"),
    onSignOut,
  });

  return (
    <SettingsListView
      onBack={onBack}
      avatarSrc={avatarSrc}
      userHandle={session?.user.handle}
      items={items}
    />
  );
}

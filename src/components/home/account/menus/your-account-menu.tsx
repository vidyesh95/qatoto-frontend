// TRANSPORT: client-query — the Better Auth session, `GET /users/me/linked-accounts`, and the
// passkey list. No writes of its own.
"use client";

import Image from "next/image";
import { useState } from "react";

import { useLinkedAccountsQuery } from "@/hooks/account/linked-accounts";
import { usePasskeysQuery } from "@/hooks/account/passkeys";
import { useSession } from "@/lib/auth-client";
import {
  buildAccountDetailRows,
  UNKNOWN_VALUE,
  type AccountDetailRow,
  type AccountEditor,
} from "./your-account-rows";
import { AccountDetailRowItem } from "./your-account-row-item";

export type { AccountEditor, AccountDetailRow };

type YourAccountPanelProps = {
  /** Header back button — returns to the settings action list. */
  onBack: () => void;
  /** Open one of the editors the parent hosts. */
  onOpenEditor: (editor: AccountEditor) => void;
};

export function YourAccountPanel({ onBack, onOpenEditor }: YourAccountPanelProps) {
  const { data: session } = useSession();
  const linkedAccountsQuery = useLinkedAccountsQuery();
  const passkeysQuery = usePasskeysQuery();

  const [copiedRowLabel, setCopiedRowLabel] = useState<string | null>(null);

  const avatarSrc = session?.user.image ?? "/dummy/profile_photo_girl.avif";

  const linkedAccountsResult = linkedAccountsQuery.data;
  const accountsByProvider =
    linkedAccountsResult?.success === true
      ? new Map(linkedAccountsResult.data.map((account) => [account.providerId, account.email]))
      : null;

  const passkeysResult = passkeysQuery.data;
  const passkeyCount = passkeysResult?.success === true ? passkeysResult.data.length : null;

  const handleCopyAccountId = async (row: AccountDetailRow) => {
    try {
      await navigator.clipboard.writeText(row.value);
      setCopiedRowLabel(row.label);
    } catch {
      setCopiedRowLabel(null);
    }
  };

  const rows = buildAccountDetailRows({
    session,
    accountsByProvider,
    passkeyCount,
  });

  return (
    <div>
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
        <h2 className="text-xl font-medium text-secondary-foreground">Your account</h2>
      </header>

      <section className="m-4 flex flex-row items-center gap-4 rounded-2xl bg-card p-4 shadow-sm">
        <Image
          src={avatarSrc}
          alt=""
          width={64}
          height={64}
          className="aspect-square size-16 shrink-0 rounded-lg border border-background object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-medium text-secondary-foreground">
            {session?.user.name ?? UNKNOWN_VALUE}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {session?.user.handle ? `@${session.user.handle}` : "No handle yet"}
          </p>
        </div>
      </section>

      {linkedAccountsQuery.data?.success === false ? (
        <p className="px-4 pb-2 text-sm text-muted-foreground">
          Couldn&apos;t check which sign-in methods are linked. The rows below still open.
        </p>
      ) : null}

      <ul>
        {rows.map((row) => (
          <li key={row.label}>
            <AccountDetailRowItem
              row={row}
              isCopied={copiedRowLabel === row.label}
              onOpenEditor={onOpenEditor}
              onCopyAccountId={handleCopyAccountId}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

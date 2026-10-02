// TRANSPORT: client-query — the Better Auth session, `localStorage` through the browser
// preferences context, and `POST/GET /users/me/export`. Two writes: the local erasure, and
// the export request, which produces no file synchronously.
"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import type { AccountEditor } from "@/components/home/account/menus/your-account-menu";
import { useDataExportQuery, useRequestDataExportMutation } from "@/hooks/account/data-export";
import { useSession } from "@/lib/auth-client";
import {
  buildPrivacyRequestMailtoHref,
  PRIVACY_REQUEST_RESPONSE_WINDOW_LABEL,
} from "@/lib/privacy-request";
import { PRIVACY_CONTACT_EMAIL } from "@/lib/site";
import { useBrowserPreferences } from "@/state/browser-preferences-context";
import { HELD_DATA_CATEGORIES } from "./data-and-privacy-categories";
import { DataExportActionControl } from "./data-export-action-control";

type ClearDeviceDataState = { readonly status: "idle" } | { readonly status: "cleared" };

type DataAndPrivacyPanelProps = {
  /** Header back button — returns to the settings action list. */
  onBack: () => void;
  /** Open one of the editors `menus/settings-menu.tsx` hosts. */
  onOpenEditor: (editor: AccountEditor) => void;
};

export function DataAndPrivacyPanel({ onBack, onOpenEditor }: DataAndPrivacyPanelProps) {
  const { data: session } = useSession();
  const { clearPreferences } = useBrowserPreferences();

  const [clearDeviceDataState, setClearDeviceDataState] = useState<ClearDeviceDataState>({
    status: "idle",
  });

  const accountHandle = session?.user.handle ?? "";
  const accountId = session?.user.id ?? "";
  const isSessionReady = accountHandle.length > 0 && accountId.length > 0;

  const dataExportQuery = useDataExportQuery({ enabled: isSessionReady });
  const dataExportMutation = useRequestDataExportMutation();

  function handleClearDeviceDataClick() {
    clearPreferences();
    setClearDeviceDataState({ status: "cleared" });
  }

  function renderClearDeviceDataAction() {
    switch (clearDeviceDataState.status) {
      case "idle":
        return (
          <button
            type="button"
            onClick={handleClearDeviceDataClick}
            className="cursor-pointer self-start rounded-full border border-border px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-muted"
          >
            Clear data on this device
          </button>
        );
      case "cleared":
        return (
          <span className="flex flex-row items-center gap-1 text-sm font-medium text-primary-imprint">
            <Image
              src="/icons/check_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              alt=""
              width={16}
              height={16}
            />
            Cleared. Your language and browse country are back to their defaults.
          </span>
        );
      default: {
        const exhaustiveCheck: never = clearDeviceDataState;
        return exhaustiveCheck;
      }
    }
  }

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
        <h2 className="text-xl font-medium text-secondary-foreground">Your data &amp; privacy</h2>
      </header>

      <div className="flex flex-col gap-8 p-4">
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-secondary-foreground">What we hold about you</h3>
          <ul className="flex flex-col gap-3">
            {HELD_DATA_CATEGORIES.map((heldDataCategory) => (
              <li
                key={heldDataCategory.title}
                className="flex flex-row gap-3 rounded-xl border border-border bg-card p-3"
              >
                <Image
                  src={heldDataCategory.icon}
                  alt=""
                  width={24}
                  height={24}
                  className="size-6 shrink-0"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-sm font-medium text-secondary-foreground">
                    {heldDataCategory.title}
                  </span>
                  <ul className="flex flex-col">
                    {heldDataCategory.items.map((heldDataItem) => (
                      <li key={heldDataItem} className="text-xs text-muted-foreground">
                        {heldDataItem}
                      </li>
                    ))}
                  </ul>
                  {heldDataCategory.note ? (
                    <span className="text-xs font-medium text-secondary-foreground">
                      {heldDataCategory.note}
                    </span>
                  ) : null}
                  {heldDataCategory.absentFromExport ? (
                    <span className="text-xs text-muted-foreground italic">
                      {heldDataCategory.absentFromExport}
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-secondary-foreground">Data on this device</h3>
          <p className="text-sm text-muted-foreground">
            Your language, browse country, AI assist preference, where the assistant sits and the
            notes you asked it to remember live in this browser. None of them is stored by us; the
            notes travel with a question only when your browser cannot run the assistant itself.
            Clearing them affects this browser only — your account is untouched, and other devices
            keep their own settings.
          </p>
          {renderClearDeviceDataAction()}
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-secondary-foreground">
            Devices you are signed in on
          </h3>
          <p className="text-sm text-muted-foreground">
            See every account signed in on this browser, and sign out of the ones you do not
            recognize.
          </p>
          <button
            type="button"
            onClick={() => onOpenEditor("switch-account")}
            className="flex cursor-pointer flex-row items-center gap-2 self-start rounded-full border border-border px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-muted"
          >
            <Image
              src="/icons/switch_account_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              alt=""
              width={16}
              height={16}
            />
            Manage signed-in accounts
          </button>
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-secondary-foreground">Get a copy of your data</h3>
          <p className="text-sm text-muted-foreground">
            Download everything we hold about you, in a format you can read and take elsewhere. We
            build the file in the background — it can take a few minutes, and you can close this
            panel while it runs.
          </p>
          <DataExportActionControl
            isSessionReady={isSessionReady}
            accountId={accountId}
            accountHandle={accountHandle}
            dataExportQuery={dataExportQuery}
            dataExportMutation={dataExportMutation}
          />
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-secondary-foreground">Delete your account</h3>
          <p className="text-sm text-muted-foreground">
            Sign out everywhere and have your personal details erased after 30 days. Some records
            are kept for legal reasons — the next screen lists exactly which, and why.
          </p>
          <button
            type="button"
            onClick={() => onOpenEditor("delete-account")}
            className="flex cursor-pointer flex-row items-center gap-2 self-start rounded-full border border-destructive px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/5"
          >
            <Image
              src="/icons/delete_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              alt=""
              width={16}
              height={16}
            />
            Delete your account
          </button>
        </section>

        <p className="text-xs text-muted-foreground">
          Read the full{" "}
          <Link href="/privacy-policy" className="underline">
            privacy policy
          </Link>{" "}
          for how we use what we hold.
        </p>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-secondary-foreground">Your other rights</h3>
          <p className="text-sm text-muted-foreground">
            You can also ask us to correct something that is wrong, to pause what we do with your
            information while a question about it is resolved, or to object to a particular use.
            These are handled by a person, and we answer within{" "}
            {PRIVACY_REQUEST_RESPONSE_WINDOW_LABEL}.
          </p>
          {isSessionReady ? (
            <a
              href={buildPrivacyRequestMailtoHref({
                kind: "other-right",
                accountId,
                accountHandle,
              })}
              className="self-start text-sm font-medium text-primary-imprint underline"
            >
              Email {PRIVACY_CONTACT_EMAIL}
            </a>
          ) : (
            <span className="text-sm text-muted-foreground">{PRIVACY_CONTACT_EMAIL}</span>
          )}
        </section>
      </div>
    </div>
  );
}

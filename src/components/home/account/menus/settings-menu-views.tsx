"use client";

import Image from "next/image";
import { FullNamePanel } from "@/components/home/account/panels/full-name-panel";
import { ProfilePhotoPanel } from "@/components/home/account/panels/profile-photo-panel";
import { HandlePanel } from "@/components/home/account/panels/handle-panel";
import { ChannelProfilePanel } from "@/components/home/account/panels/channel-profile-panel";
import { SocialLinkPanel } from "@/components/home/account/panels/social-link-panel";
import { EmailCredentialPanel } from "@/components/home/account/panels/email-credential-panel";
import { ChangePasswordPanel } from "@/components/home/account/panels/change-password-panel";
import { PasskeysPanel } from "@/components/home/account/panels/passkeys-panel";
import { PhoneNumberPanel } from "@/components/home/account/panels/phone-number-panel";
import { SwitchAccountPanel } from "@/components/home/account/menus/switch-account-menu";
import { DeleteAccountPanel } from "@/components/home/account/panels/delete-account-panel";
import type { AccountEditor } from "@/components/home/account/menus/your-account-menu";
import type { ActionResponse } from "@/lib/http";
import type { LinkedAccount } from "@/lib/account/linked-accounts.schemas";

/** One actionable row in the settings list. */
export type SettingsItem = {
  label: string;
  subtitle?: string;
  icon: string;
  onClick: () => void;
  badge?: string;
  disabled?: boolean;
};

export function SettingsItemBody({ item }: { readonly item: SettingsItem }) {
  return (
    <>
      <Image src={item.icon} alt="" width={24} height={24} className="size-6 shrink-0" />
      <span className="flex flex-1 flex-col text-left">
        <span className="text-sm font-medium text-secondary-foreground">{item.label}</span>
        {item.subtitle ? (
          <span className="text-xs text-muted-foreground">{item.subtitle}</span>
        ) : null}
      </span>
      {item.badge ? (
        <span className="flex shrink-0 flex-row items-center gap-1 text-xs font-medium text-primary-imprint">
          <Image
            src="/icons/check_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt=""
            width={16}
            height={16}
          />
          {item.badge}
        </span>
      ) : null}
    </>
  );
}

function SettingsIdentityEditor({
  editor,
  onBack,
  userName,
  userImage,
  userPhoneNumber,
  avatarSrc,
}: {
  readonly editor: "full-name" | "profile-photo" | "handle" | "channel-profile" | "phone-number";
  readonly onBack: () => void;
  readonly userName?: string | null;
  readonly userImage?: string | null;
  readonly userPhoneNumber?: string | null;
  readonly avatarSrc: string;
}) {
  switch (editor) {
    case "full-name":
      return <FullNamePanel initialFullName={userName ?? ""} onBack={onBack} />;
    case "profile-photo":
      return (
        <ProfilePhotoPanel
          currentPhotoUrl={avatarSrc}
          hasExistingPhoto={Boolean(userImage)}
          onBack={onBack}
        />
      );
    case "handle":
      return <HandlePanel onBack={onBack} />;
    case "channel-profile":
      return <ChannelProfilePanel onBack={onBack} />;
    case "phone-number":
      return <PhoneNumberPanel initialPhoneNumber={userPhoneNumber ?? ""} onBack={onBack} />;
    default: {
      const exhaustiveCheck: never = editor;
      return exhaustiveCheck;
    }
  }
}

function SettingsAuthEditor({
  editor,
  onBack,
  onSignOut,
  linkedAccountsResult,
}: {
  readonly editor:
    | "passkeys"
    | "switch-account"
    | "delete-account"
    | "email-credential"
    | "change-password"
    | "link-google"
    | "link-github";
  readonly onBack: () => void;
  readonly onSignOut: () => void;
  readonly linkedAccountsResult?: ActionResponse<LinkedAccount[]> | null;
}) {
  switch (editor) {
    case "passkeys":
      return <PasskeysPanel onBack={onBack} />;
    case "switch-account":
      return <SwitchAccountPanel onBack={onBack} onSignOutAll={onSignOut} />;
    case "delete-account":
      return <DeleteAccountPanel onBack={onBack} />;
    case "email-credential":
      return <EmailCredentialPanel onBack={onBack} />;
    case "change-password":
      return <ChangePasswordPanel onBack={onBack} />;
    case "link-google":
    case "link-github": {
      const provider = editor === "link-google" ? "google" : "github";
      const linkedEmail =
        linkedAccountsResult?.success === true
          ? (linkedAccountsResult.data.find((account) => account.providerId === provider)?.email ??
            null)
          : null;
      return <SocialLinkPanel provider={provider} linkedEmail={linkedEmail} onBack={onBack} />;
    }
    default: {
      const exhaustiveCheck: never = editor;
      return exhaustiveCheck;
    }
  }
}

export function SettingsEditorView({
  editor,
  onBack,
  onSignOut,
  userName,
  userImage,
  userPhoneNumber,
  avatarSrc,
  linkedAccountsResult,
}: {
  readonly editor: AccountEditor;
  readonly onBack: () => void;
  readonly onSignOut: () => void;
  readonly userName?: string | null;
  readonly userImage?: string | null;
  readonly userPhoneNumber?: string | null;
  readonly avatarSrc: string;
  readonly linkedAccountsResult?: ActionResponse<LinkedAccount[]> | null;
}) {
  const isIdentity =
    editor === "full-name" ||
    editor === "profile-photo" ||
    editor === "handle" ||
    editor === "channel-profile" ||
    editor === "phone-number";

  if (isIdentity) {
    return (
      <SettingsIdentityEditor
        editor={editor}
        onBack={onBack}
        userName={userName}
        userImage={userImage}
        userPhoneNumber={userPhoneNumber}
        avatarSrc={avatarSrc}
      />
    );
  }

  return (
    <SettingsAuthEditor
      editor={editor}
      onBack={onBack}
      onSignOut={onSignOut}
      linkedAccountsResult={linkedAccountsResult}
    />
  );
}

export function SettingsListView({
  onBack,
  avatarSrc,
  userHandle,
  items,
}: {
  readonly onBack: () => void;
  readonly avatarSrc: string;
  readonly userHandle?: string | null;
  readonly items: readonly SettingsItem[];
}) {
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
        <h2 className="text-xl font-medium text-secondary-foreground">Settings</h2>
      </header>

      <section className="relative m-4 mt-8 flex flex-col gap-4 rounded-2xl bg-card p-4 pt-16 shadow-sm">
        <Image
          src={avatarSrc}
          alt=""
          width={320}
          height={320}
          className="aspect-square h-auto w-full rounded-xl border border-background object-cover"
        />
        <div className="rounded-xl bg-muted px-4 py-3 text-center text-base leading-6 tracking-wider text-secondary-foreground">
          @{userHandle ?? "…"}
        </div>
        <Image
          src={avatarSrc}
          alt="Current avatar"
          width={64}
          height={64}
          className="absolute -top-4 left-4 aspect-square size-16 rounded-lg border border-background object-cover"
        />
      </section>

      <ul>
        {items.map((item) => (
          <li key={item.label}>
            <button
              type="button"
              onClick={item.onClick}
              disabled={item.disabled}
              className="flex w-full cursor-pointer flex-row items-center gap-4 p-4 transition-colors hover:bg-muted disabled:cursor-default disabled:hover:bg-transparent"
            >
              <SettingsItemBody item={item} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

"use client";

import Image from "next/image";

/** One actionable row in the settings list. */
type SettingsItem = {
  /** Visible label. */
  label: string;
  /** Icon path under `public/icons` (or `public/...` for brand marks). */
  icon: string;
  /** Optional click handler; omitted rows are inert nav stubs for now. */
  onClick?: () => void;
};

type SettingsPanelProps = {
  /** Invoked by the header back button. */
  onBack: () => void;
  /** Sign the user out (owned by the parent menu). */
  onSignOut: () => void;
};

/**
 * Presentational "Settings" panel: header, a profile card (avatar, portrait,
 * handle), and the account-action list. Swapped into the account menu like the
 * Appearance / Location / Language panels.
 *
 * Nothing here is a trust boundary — every action that mutates account state
 * must be re-validated and authorized by the Express backend.
 */
export function SettingsPanel({ onBack, onSignOut }: SettingsPanelProps) {
  const items: SettingsItem[] = [
    {
      label: "Your account",
      icon: "/icons/account_circle_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    },
    {
      label: "Switch account",
      icon: "/icons/switch_account_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    },
    {
      label: "Sign out",
      icon: "/icons/logout_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      onClick: onSignOut,
    },
    { label: "Set password", icon: "/icons/lock_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg" },
    {
      label: "Set handle",
      icon: "/icons/alternate_email_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    },
    {
      label: "Set phone number",
      icon: "/icons/add_call_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    },
    { label: "Set full name", icon: "/icons/id_card_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg" },
    {
      label: "Set profile photo",
      icon: "/icons/add_photo_alternate_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    },
    { label: "Link Google account", icon: "/icons/google_logo_tint.svg" },
    { label: "Link Apple account", icon: "/icons/apple_logo_tint.svg" },
    { label: "Set email address", icon: "/icons/mail_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg" },
    {
      label: "Set recovery email address",
      icon: "/icons/forward_to_inbox_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    },
    { label: "Time watched", icon: "/icons/bar_chart_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg" },
    {
      label: "Your data in app account",
      icon: "/icons/storage_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    },
  ];

  return (
    <div>
      <header className="sticky top-0 z-10 flex flex-row items-center gap-4 p-4 border-b bg-background border-black/10">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="p-1 transition-colors rounded-full cursor-pointer hover:bg-muted"
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

      <section className="relative flex flex-col gap-4 p-4 pt-16 m-4 mt-8 shadow-sm rounded-2xl bg-card">
        <Image
          src="/dummy/profile_photo_girl.avif"
          alt=""
          width={320}
          height={320}
          className="object-cover w-full aspect-square rounded-xl"
        />
        <div className="rounded-xl bg-muted px-4 py-3 text-center text-base leading-6 tracking-[0.5px] text-secondary-foreground">
          @drDong2w
        </div>
        <Image
          src="/dummy/profile_photo_girl.avif"
          alt="Current avatar"
          width={64}
          height={64}
          className="absolute object-cover rounded-lg -top-4 left-4 size-16 aspect-square"
        />
      </section>

      <ul>
        {items.map((item) => (
          <li key={item.label}>
            <button
              type="button"
              onClick={item.onClick}
              className="flex flex-row items-center w-full gap-4 p-4 transition-colors cursor-pointer hover:bg-muted"
            >
              <Image src={item.icon} alt="" width={24} height={24} className="size-6 shrink-0" />
              <span className="text-sm font-medium text-secondary-foreground">{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

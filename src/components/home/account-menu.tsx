"use client";

import Image from "next/image";
import { useEffect, useRef, type ReactNode } from "react";

type Props = {
  onClose: () => void;
};

export default function AccountMenu({ onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onClose]);

  const handleSignOut = () => {
    localStorage.removeItem("qatoto_authenticated");
    onClose();
    window.location.href = "/";
  };

  return (
    <div
      ref={ref}
      className="absolute right-2 top-12 z-50 w-95 max-h-[calc(100dvh-4rem)] overflow-y-auto bg-background border border-outline rounded-lg shadow-lg space-y-8"
    >
      <div className="rounded-lg bg-secondary">
        <header className="rounded-lg bg-background">
          <div className="w-full flex flex-row">
            <div className="flex-1 min-w-0">
              <div className="w-full pl-4 py-4">
                <p className="w-full text-base text-[#041F21] truncate">Vidyesh Churi</p>
                <p className="w-full text-xs text-[#041F21] truncate">@vidyesh</p>
              </div>
              <p className="w-full ml-4 text-4xl text-[#1DBDC5] flex gap-1">
                <span>Level</span>
                <span className="flex-1 min-w-0 truncate">1</span>
              </p>
            </div>
            <div className="shrink-0 p-4 flex flex-col items-end gap-4">
              <Image
                src="/dummy/authenticated_user01.avif"
                alt="Account"
                width={40}
                height={40}
                className="rounded-full border border-primary"
              />
              <button
                type="button"
                className="w-fit text-xs bg-secondary text-secondary-foreground rounded-full px-2 py-1 cursor-pointer"
              >
                Check-in
              </button>
            </div>
          </div>
          <div className="w-full flex flex-row gap-4 p-4">
            <div className="w-full flex flex-col items-center p-2 rounded-sm bg-primary">
              <div className="flex flex-row items-center">
                <span className="w-full text-sm text-right truncate">0</span>
                <Image
                  src="/icons/paid_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                  alt="Coins"
                  width={24}
                  height={24}
                />
              </div>
              <p className="text-sm">Coins</p>
            </div>
            <div className="w-full flex flex-col items-center p-2 rounded-sm bg-primary">
              <div className="flex flex-row items-center">
                <span className="w-full text-sm text-right truncate">0</span>
                <Image
                  src="/icons/local_activity_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                  alt="Coins"
                  width={24}
                  height={24}
                />
              </div>
              <p className="text-sm">Tickets</p>
            </div>
          </div>
        </header>
        <button
          type="button"
          className="w-full p-4 flex flex-row gap-4 items-center cursor-pointer"
        >
          <Image
            src="/icons/workspace_premium_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt="Coins"
            width={24}
            height={24}
          />
          <span className="text-sm text-secondary-foreground font-medium">Premium membership</span>
        </button>
      </div>

      <div>
        <button
          type="button"
          className="w-full p-4 flex flex-row gap-4 items-center cursor-pointer hover:bg-muted transition-colors"
        >
          <Image
            src="/icons/account_box_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt="Coins"
            width={24}
            height={24}
          />
          <span className="text-sm text-secondary-foreground font-medium">Your channel</span>
        </button>
        <button
          type="button"
          className="w-full p-4 flex flex-row gap-4 items-center cursor-pointer hover:bg-muted transition-colors"
        >
          <Image
            src="/icons/video_call_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt="Coins"
            width={24}
            height={24}
          />
          <span className="text-sm text-secondary-foreground font-medium">Creator studio</span>
        </button>
        <button
          type="button"
          className="w-full p-4 flex flex-row gap-4 items-center cursor-pointer hover:bg-muted transition-colors"
        >
          <Image
            src="/icons/switch_account_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt="Coins"
            width={24}
            height={24}
          />
          <span className="text-sm text-secondary-foreground font-medium">Switch account</span>
        </button>
        <button
          type="button"
          className="w-full p-4 flex flex-row gap-4 items-center cursor-pointer hover:bg-muted transition-colors"
        >
          <Image
            src="/icons/logout_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt="Coins"
            width={24}
            height={24}
          />
          <span className="text-sm text-secondary-foreground font-medium">Sign out</span>
        </button>
        <hr className="mx-4" />
        <button
          type="button"
          className="w-full p-4 flex flex-row gap-4 items-center cursor-pointer hover:bg-muted transition-colors"
        >
          <Image
            src="/icons/dark_mode_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt="Coins"
            width={24}
            height={24}
          />
          <span className="text-sm text-secondary-foreground font-medium">Appearance:</span>
          <span className="w-full text-sm text-secondary-foreground font-medium truncate">
            Device theme
          </span>
          <Image
            src="/icons/chevron_forward_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
            alt="Change device theme"
            width={24}
            height={24}
          />
        </button>
        <button
          type="button"
          className="w-full p-4 flex flex-row gap-4 items-center cursor-pointer hover:bg-muted transition-colors"
        >
          <Image
            src="/icons/translate_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt="Coins"
            width={24}
            height={24}
          />
          <span className="text-sm text-secondary-foreground font-medium">Language:</span>
          <span className="w-full text-sm text-secondary-foreground font-medium truncate">
            English(US)
          </span>
          <Image
            src="/icons/chevron_forward_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
            alt="Change language"
            width={24}
            height={24}
          />
        </button>
        <button
          type="button"
          className="w-full p-4 flex flex-row gap-4 items-center cursor-pointer hover:bg-muted transition-colors"
        >
          <Image
            src="/icons/admin_panel_settings_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt="Coins"
            width={24}
            height={24}
          />
          <span className="text-sm text-secondary-foreground font-medium">Restricted Mode:</span>
          <span className="w-full text-sm text-secondary-foreground font-medium truncate">Off</span>
          <Image
            src="/icons/chevron_forward_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
            alt="Change Location"
            width={24}
            height={24}
          />
        </button>
        <button
          type="button"
          className="w-full p-4 flex flex-row gap-4 items-center cursor-pointer hover:bg-muted transition-colors"
        >
          <Image
            src="/icons/location_on_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt="Coins"
            width={24}
            height={24}
          />
          <span className="text-sm text-secondary-foreground font-medium">Location:</span>
          <span className="w-full text-sm text-secondary-foreground font-medium truncate">
            United States
          </span>
          <Image
            src="/icons/chevron_forward_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
            alt="Change Location"
            width={24}
            height={24}
          />
        </button>
        <hr className="mx-4" />
        <button
          type="button"
          className="w-full p-4 flex flex-row gap-4 items-center cursor-pointer hover:bg-muted transition-colors"
        >
          <Image
            src="/icons/settings_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt="Coins"
            width={24}
            height={24}
          />
          <span className="text-sm text-secondary-foreground font-medium">Settings</span>
        </button>
        <button
          type="button"
          className="w-full p-4 flex flex-row gap-4 items-center cursor-pointer hover:bg-muted transition-colors"
        >
          <Image
            src="/icons/help_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt="Coins"
            width={24}
            height={24}
          />
          <span className="text-sm text-secondary-foreground font-medium">Help</span>
        </button>
        <button
          type="button"
          className="w-full p-4 flex flex-row gap-4 items-center cursor-pointer hover:bg-muted transition-colors"
        >
          <Image
            src="/icons/rate_review_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt="Coins"
            width={24}
            height={24}
          />
          <span className="text-sm text-secondary-foreground font-medium">Send feedback</span>
        </button>
      </div>
    </div>
  );
}

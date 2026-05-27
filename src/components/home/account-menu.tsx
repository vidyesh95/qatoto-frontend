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
      className="absolute right-2 top-12 z-50 w-95 max-h-[calc(100dvh-4rem)] overflow-y-auto bg-background border border-outline rounded-lg shadow-lg"
    >
      <header className="rounded-lg bg-secondary">
        <div className="rounded-lg bg-background">
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
        </div>
      </header>

      <button
        type="button"
        className="w-full flex items-center gap-4 px-5 py-3 bg-[#E5E9FF] text-sm font-medium cursor-pointer"
      >
        <PremiumIcon />
        <span>Premium membership</span>
      </button>

      <div className="py-2">
        <MenuItem
          label="Your channel"
          icon={
            <MaterialIcon src="/icons/account_circle_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg" />
          }
        />
        <MenuItem
          label="Creator studio"
          icon={<MaterialIcon src="/icons/video_call_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg" />}
        />
        <MenuItem
          label="Appearance:Device theme"
          icon={
            <MaterialIcon src="/icons/featured_video_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg" />
          }
          chevron
        />
        <MenuItem
          label="Switch account"
          icon={
            <MaterialIcon src="/icons/account_circle_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg" />
          }
        />
        <MenuItem
          label="Sign out"
          icon={<MaterialIcon src="/icons/logout_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg" />}
          onClick={handleSignOut}
        />
      </div>

      <div className="mx-5 border-t border-outline" />

      <div className="py-2">
        <MenuItem label="Appearance:Device theme" icon={<MoonIcon />} chevron />
        <MenuItem
          label="Language:English(US)"
          icon={<MaterialIcon src="/icons/translate_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg" />}
          chevron
        />
        <MenuItem
          label="Restricted Mode:Off"
          icon={<MaterialIcon src="/icons/lock_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg" />}
          chevron
        />
        <MenuItem label="Location:United States" icon={<LocationIcon />} chevron />
      </div>

      <div className="mx-5 border-t border-outline" />

      <div className="py-2 pb-3">
        <MenuItem label="Settings" icon={<SettingsIcon />} />
        <MenuItem label="Help" icon={<HelpIcon />} />
        <MenuItem label="Send feedback" icon={<FeedbackIcon />} />
      </div>
    </div>
  );
}

function MenuItem({
  label,
  icon,
  chevron,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  chevron?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-4 px-5 py-2.5 text-sm hover:bg-[#F4F6F6] cursor-pointer"
    >
      <span className="size-6 flex items-center justify-center">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {chevron && (
        <Image
          src="/icons/chevron_forward_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
          alt=""
          width={20}
          height={20}
        />
      )}
    </button>
  );
}

function MaterialIcon({ src }: { src: string }) {
  return <Image src={src} alt="" width={24} height={24} />;
}

function CoinIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm.88 14.76V18h-1.75v-1.29c-.74-.18-2.16-.69-2.51-2.42l1.61-.65c.05.21.42 1.4 1.62 1.4.61 0 1.3-.32 1.3-1.07 0-.63-.46-.97-1.5-1.34-1.44-.51-2.85-1.13-2.85-2.79 0-1.52 1.15-2.33 2.33-2.55V6.04h1.75v1.29c1.36.31 1.96 1.31 2.13 2.11l-1.55.66c-.07-.28-.39-1.17-1.41-1.17-.62 0-1.45.29-1.45.97 0 .58.49.85 1.6 1.25 1.46.5 2.74 1.16 2.74 2.91 0 1.7-1.32 2.46-2.45 2.7z" />
    </svg>
  );
}

function TicketIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22 10V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v4a2 2 0 0 1 0 4v4a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4a2 2 0 0 1 0-4zm-9 6.25-2.59 1.36.5-2.88-2.1-2.04 2.9-.42L13 9.65l1.29 2.62 2.9.42-2.1 2.04.5 2.88L13 16.25z" />
    </svg>
  );
}

function PremiumIcon() {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.39 5.39 0 0 1-4.4 2.26 5.4 5.4 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94 0 .31.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <circle cx={12} cy={12} r={10} />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1={12} y1={17} x2={12} y2={17.01} />
    </svg>
  );
}

function FeedbackIcon() {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 12h-2v-2h2v2zm0-4h-2V6h2v4z" />
    </svg>
  );
}

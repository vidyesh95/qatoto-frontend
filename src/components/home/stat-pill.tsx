"use client";

import { useState } from "react";

import Image from "next/image";

export type StatPillProps = {
  /** icon base name, e.g. "favorite" — FILL0/FILL1 variants resolved here */
  icon: string;
  label: string;
  /**
   * Optional action handler. When provided the pill acts as a plain button
   * (e.g. "share" opens a sheet) instead of a self-toggling like/bookmark
   * control, so the icon stays in its FILL0 (unfilled) variant.
   */
  onClick?: () => void;
};

export default function StatPill({ icon, label, onClick }: StatPillProps) {
  const [active, setActive] = useState(false);

  // Action pills (onClick provided) never toggle, so they render unfilled.
  const filled = onClick ? false : active;
  const src = `/icons/${icon}_24dp_000000_FILL${filled ? 1 : 0}_wght400_GRAD0_opsz24.svg`;

  return (
    <button
      type="button"
      aria-pressed={onClick ? undefined : active}
      onClick={onClick ?? (() => setActive((prevActive) => !prevActive))}
      className="flex flex-row items-center gap-2 rounded-full bg-[#CCE8E9] px-4 py-2 text-sm font-medium text-[#041F21] cursor-pointer hover:bg-[#bfe0e1]"
    >
      <Image src={src} width={18} height={18} alt="" />
      {label}
    </button>
  );
}

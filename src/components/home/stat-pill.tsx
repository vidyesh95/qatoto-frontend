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
  /**
   * Controlled active state. When set, the pill reflects this value (filled
   * when true) and `onClick` is expected to flip it — used by the comment pill
   * to mirror whether the comments panel is open.
   */
  active?: boolean;
};

export default function StatPill({
  icon,
  label,
  onClick,
  active: controlledActive,
}: StatPillProps) {
  const [internalActive, setInternalActive] = useState(false);

  const isControlled = controlledActive !== undefined;
  const active = isControlled ? controlledActive : internalActive;

  // Uncontrolled action pills (onClick only) never toggle, so render unfilled.
  const filled = isControlled ? active : onClick ? false : active;
  const src = `/icons/${icon}_24dp_000000_FILL${filled ? 1 : 0}_wght400_GRAD0_opsz24.svg`;

  return (
    <button
      type="button"
      aria-pressed={onClick && !isControlled ? undefined : active}
      onClick={onClick ?? (() => setInternalActive((prevActive) => !prevActive))}
      className="flex w-full lg:w-24 flex-row items-center justify-center gap-2 rounded-full bg-[#CCE8E9] px-2.5 py-1.5 text-sm font-medium text-[#041F21] cursor-pointer hover:bg-[#bfe0e1]"
    >
      <Image src={src} width={18} height={18} alt="" />
      {label}
    </button>
  );
}

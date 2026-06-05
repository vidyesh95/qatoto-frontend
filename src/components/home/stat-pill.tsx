"use client";

import { useState } from "react";

import Image from "next/image";

export type StatPillProps = {
  /** icon base name, e.g. "favorite" — FILL0/FILL1 variants resolved here */
  icon: string;
  label: string;
};

export default function StatPill({ icon, label }: StatPillProps) {
  const [active, setActive] = useState(false);

  const src = `/icons/${icon}_24dp_000000_FILL${active ? 1 : 0}_wght400_GRAD0_opsz24.svg`;

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => setActive((v) => !v)}
      className="flex flex-row items-center gap-2 rounded-full bg-[#CCE8E9] px-4 py-2 text-sm font-medium text-[#041F21] cursor-pointer hover:bg-[#bfe0e1]"
    >
      <Image src={src} width={18} height={18} alt="" />
      {label}
    </button>
  );
}

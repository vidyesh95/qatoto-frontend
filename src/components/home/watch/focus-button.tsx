"use client";

import { useState } from "react";

import Image from "next/image";

export default function FocusButton() {
  const [active, setActive] = useState(false);

  const src = `/icons/loupe_24dp_FFFFFF_FILL${active ? 1 : 0}_wght400_GRAD0_opsz24.svg`;

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => setActive((v) => !v)}
      className="flex shrink-0 cursor-pointer flex-row items-center gap-2 rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
    >
      <Image src={src} width={18} height={18} alt="" />
      Focus on
    </button>
  );
}

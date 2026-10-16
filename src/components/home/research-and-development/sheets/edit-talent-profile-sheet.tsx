// TRANSPORT: props-only — the trigger and the sheet's frame. The form, and every read and write,
// load on first open from `edit-talent-profile-form.tsx`.
"use client";

import { useState } from "react";

import RndSheet from "@/components/home/research-and-development/sheets/rnd-sheet";
import { createLazySheetBody } from "@/components/home/shared/lazy-overlay";

const { LazyOverlay: LazyEditTalentProfileForm, preload: preloadEditTalentProfileForm } =
  createLazySheetBody(
    () => import("@/components/home/research-and-development/sheets/edit-talent-profile-form"),
  );

/** Edit your own talent profile. What the form sends, and what it never sends, is documented in `edit-talent-profile-form.tsx`. */
export default function EditTalentProfileSheet() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onPointerEnter={preloadEditTalentProfileForm}
        onFocus={preloadEditTalentProfileForm}
        onClick={() => setIsSheetOpen(true)}
        className="cursor-pointer rounded-full border border-outline-strong px-4 py-2 text-sm font-medium text-primary-imprint"
      >
        Edit your profile
      </button>

      <RndSheet
        title="Your talent profile"
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
      >
        {isSheetOpen && <LazyEditTalentProfileForm onClose={() => setIsSheetOpen(false)} />}
      </RndSheet>
    </>
  );
}

// TRANSPORT: props-only — the trigger and the sheet's frame. The form, and its one write, load on
// first open from `apply-role-form.tsx`.
"use client";

import { useState } from "react";

import SignInReturnLink from "@/components/auth/sign-in-return-link";
import RndSheet from "@/components/home/research-and-development/sheets/rnd-sheet";
import { createLazySheetBody } from "@/components/home/shared/lazy-overlay";
import { useViewerSignedIn } from "@/hooks/use-viewer-signed-in";
import type { OpenRole } from "@/lib/rnd/catalog.schemas";

const { LazyOverlay: LazyApplyRoleForm, preload: preloadApplyRoleForm } = createLazySheetBody(
  () => import("@/components/home/research-and-development/sheets/apply-role-form"),
);

/** Apply to a specific role. What the application carries is documented in `apply-role-form.tsx`. */
export default function ApplyRoleSheet({ role }: { role: OpenRole }) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  // A signed-out visitor used to write a whole application and only then be refused on submit. This
  // is a prompt, not a gate: the backend still authorizes the write.
  const isSignedIn = useViewerSignedIn(false);

  if (!isSignedIn) {
    return (
      <SignInReturnLink className="mt-auto rounded-full border border-outline-strong px-4 py-2 text-center text-sm font-medium text-primary-imprint">
        Sign in to apply
      </SignInReturnLink>
    );
  }

  return (
    <>
      <button
        type="button"
        onPointerEnter={preloadApplyRoleForm}
        onFocus={preloadApplyRoleForm}
        onClick={() => setIsSheetOpen(true)}
        className="mt-auto cursor-pointer rounded-full border border-outline-strong px-4 py-2 text-sm font-medium text-primary-imprint"
      >
        Apply for this role
      </button>

      <RndSheet
        title={`Apply — ${role.roleTitle}`}
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
      >
        {isSheetOpen && <LazyApplyRoleForm role={role} onClose={() => setIsSheetOpen(false)} />}
      </RndSheet>
    </>
  );
}

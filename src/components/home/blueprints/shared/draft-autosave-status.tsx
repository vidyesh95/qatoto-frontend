// TRANSPORT: props-only — renders the state it is handed. Fetches nothing.
"use client";

// ⚠️ **THE REFUSAL ARM IS THE WHOLE REASON THIS COMPONENT EXISTS.** A composer that autosaves and
// says nothing is fine right up until a save fails, at which point the author is working under a
// belief the page put there. So "Saved" is deliberately quiet — it is the expected case and does
// not deserve emphasis — and a refusal is loud, keeps the reason, and says plainly that nothing has
// been stored since.
//
// NOT `role="alert"` ON THE QUIET ARMS. "Saving…" and "Saved 14:32" fire every few seconds while
// somebody types; announcing each one would make a screen reader unusable. The refusal announces,
// because it is the one state that changes what the author should do next.

import type { DraftAutosaveState } from "@/hooks/blueprints/use-draft-autosave";

export default function DraftAutosaveStatus({ state }: { readonly state: DraftAutosaveState }) {
  switch (state.status) {
    case "idle":
      // NOTHING, not "Not saved yet". Before the first edit there is nothing to report, and a
      // standing notice about an absent draft is a worry the author did not have.
      return null;
    case "saving":
      return <p className="text-xs text-muted-foreground">Saving…</p>;
    case "saved":
      return (
        <p className="text-xs text-muted-foreground">
          Draft saved {state.savedAtLabel}. It is in your studio under &ldquo;Not submitted
          yet&rdquo;.
        </p>
      );
    case "refused":
      return (
        <p role="alert" className="text-xs leading-4 text-destructive">
          {state.message}
        </p>
      );
    default: {
      const exhaustiveCheck: never = state;
      return exhaustiveCheck;
    }
  }
}

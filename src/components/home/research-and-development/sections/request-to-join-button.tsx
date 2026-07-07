"use client";

import { useState } from "react";

// Local-state-only join-request toggle on the project header. No request is
// sent in the UI-building phase — team membership is backend-owned later.
export default function RequestToJoinButton() {
  const [hasRequestedToJoin, setHasRequestedToJoin] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setHasRequestedToJoin((wasRequested) => !wasRequested)}
      className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-medium text-[#00696E] transition-colors ${
        hasRequestedToJoin ? "border-[#00696E] bg-[#00696E]/10" : "border-[#6F7979]"
      }`}
    >
      {hasRequestedToJoin ? "Request sent ✓" : "Request to join"}
    </button>
  );
}

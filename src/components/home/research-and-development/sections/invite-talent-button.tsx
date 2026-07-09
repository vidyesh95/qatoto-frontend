"use client";

import { useState } from "react";

// Local-state-only invite toggle on a talent card. No invite is sent in the
// UI-building phase — outreach and matching are backend-owned later.
export default function InviteTalentButton() {
  const [hasSentInvite, setHasSentInvite] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setHasSentInvite((wasSent) => !wasSent)}
      className={`mt-auto cursor-pointer rounded-full border px-4 py-2 text-sm font-medium text-[#00696E] transition-colors ${
        hasSentInvite ? "border-[#00696E] bg-[#00696E]/10" : "border-[#6F7979]"
      }`}
    >
      {hasSentInvite ? "Invite sent ✓" : "Invite to project"}
    </button>
  );
}

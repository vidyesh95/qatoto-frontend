// TRANSPORT: props-only — a client island over a profile the server already fetched.
"use client";

// THE OPENER, SEPARATE FROM THE PANEL, so `channel-page.tsx` stays a server component. The whole
// profile is already in hand there, so the sheet needs no fetch of its own — this passes it down
// and owns nothing but the open/closed bit.

import { useState } from "react";

import ChannelAboutSheet from "@/components/home/channel/channel-about-sheet";
import type { ChannelProfile } from "@/lib/channels/schemas";

export default function ChannelAboutOpener({ profile }: { readonly profile: ChannelProfile }) {
  const [isAboutSheetOpen, setIsAboutSheetOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsAboutSheetOpen(true)}
        className="cursor-pointer text-sm font-medium text-foreground underline"
      >
        More info
      </button>
      {isAboutSheetOpen && (
        <ChannelAboutSheet profile={profile} onClose={() => setIsAboutSheetOpen(false)} />
      )}
    </>
  );
}

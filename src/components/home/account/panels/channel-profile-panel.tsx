// TRANSPORT: props-only — chrome around the shared editor, which owns the network.
"use client";

// THE PANEL IS A WRAPPER AND NOTHING ELSE. Every field, every mutation and the preview live in
// `ChannelProfileEditor`, which `/studio/customize` renders too — so the two surfaces cannot drift
// into two different editors of the same two columns.

import Image from "next/image";

import ChannelProfileEditor from "@/components/home/account/channel-profile-editor";

export function ChannelProfilePanel({ onBack }: { readonly onBack: () => void }) {
  return (
    <div>
      <header className="sticky top-0 z-10 flex flex-row items-center gap-4 border-b border-black/10 bg-background p-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="cursor-pointer rounded-full p-1 transition-colors hover:bg-muted"
        >
          <Image
            src="/icons/arrow_back_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt=""
            width={24}
            height={24}
          />
        </button>
        <h2 className="text-xl font-medium text-secondary-foreground">Channel profile</h2>
      </header>
      {/* NO `onSaved={onBack}`: saving a description is not the end of the task the way setting a
          name is — somebody usually saves, reads the preview, and edits again. The editor says
          "Saved." in place and the person leaves when they are done. */}
      <ChannelProfileEditor />
    </div>
  );
}

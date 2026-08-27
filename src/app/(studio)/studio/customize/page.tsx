import type { Metadata } from "next";

import ChannelProfileEditor from "@/components/home/account/channel-profile-editor";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Customize",
  description: "Your channel description and links on Qatoto",
};

/**
 * `/studio/customize` — the second host for the channel profile editor.
 *
 * IT RENDERS THE SAME COMPONENT THE ACCOUNT PANEL DOES, rather than a studio-flavoured copy of it.
 * Two editors of the same two columns would drift, and the one that drifted would be whichever
 * surface somebody used less.
 *
 * WHY BOTH SURFACES EXIST AT ALL. The account dropdown owns the identity rows and is where somebody
 * goes to change their name or handle; the studio is where a creator works. Neither is wrong and
 * neither can link to the other — `AccountMenu` has no URL and closes on an outside click — so the
 * shared thing is a component.
 *
 * THIS PAGE STOPPED BEING A `StudioPlannedPage` HERE, and its roadmap entry flipped from
 * `kind: "planned"` to `kind: "route"` in the same change. The roadmap's rule is that `route` is a
 * claim the capability exists; it now does. The entry's summary narrowed with it — this ships the
 * description and links, not the banner and layout the old summary promised.
 */
export default function StudioCustomize() {
  return (
    <div className="mx-auto w-full max-w-2xl p-6">
      <h1 className="font-serif text-2xl font-semibold text-foreground">Customize</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your description and links, as visitors see them in the About panel on your channel.
      </p>
      <div className="mt-4">
        <ChannelProfileEditor />
      </div>
    </div>
  );
}

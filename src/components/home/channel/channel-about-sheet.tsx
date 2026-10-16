// TRANSPORT: props-only — it renders a profile the server component already fetched.
"use client";

// THE CHANNEL'S "MORE INFO", and every number in it is a count of things visible on the page
// behind it. That is not a coincidence and it is the reason the panel is safe to publish.
//
// **THE TWO COUNTS ARE NOT `creator_stats`.** That table's `published_video_count` and
// `total_view_count` were withheld from this surface deliberately, and both reasons still hold:
// the first counts published rows REGARDLESS OF VISIBILITY, so it would exceed the grid and read
// as a bug; the second is a lifetime figure including views of videos since made private or
// deleted, which a viewer could diff against the visible grid to infer that withdrawn content
// existed. `publicVideoCount` and `publicViewCount` are aggregated server-side over the SAME
// predicate that selects the videos on this page, so neither can contradict what is on screen.
// Do not "simplify" them back to the cached figures.
//
// THE DESCRIPTION AND LINKS come from `user.bio` and `user_profile_link`, and both arrive already
// gated: a moderator who hides a profile makes the backend send null and an empty array, so this
// file needs no moderation branch of its own. It also cannot tell "unset" from "hidden", which is
// deliberate — see `ChannelProfileDetails`.
//
// THE REPORT CONTROL REPORTS THE PROFILE, NOT THE PERSON, and the distinction is the whole design.
// Upholding one hides this channel's description and links; it does not touch the name, the videos
// or the account. The sheet's copy says so, and its reasons are scoped to what that lever can
// actually do.

import { useState } from "react";

import Image from "next/image";

import ChannelProfileDetails from "@/components/home/channel/channel-profile-details";
import ReportProfileSheet from "@/components/home/channel/report-profile-sheet";
import ModalSheet from "@/components/home/shared/modal-sheet";
import { ShareSheet } from "@/components/home/watch/share-sheet";
import type { ChannelProfile } from "@/lib/channels/schemas";
import { formatCompactCountLabel } from "@/lib/feed/format";
import { formatCountLabel, formatIsoDateLabel } from "@/lib/store/format";

interface ChannelFact {
  readonly iconFileName: string;
  readonly label: string;
  readonly value: string;
}

/**
 * `visibility` HAS NO `FILL0` VARIANT in `public/icons`, unlike its neighbours — so the views row
 * asks for the filled one by name rather than through a helper that would 404 silently.
 *
 * `history` STANDS IN FOR A CALENDAR. There is no `calendar_today`, `event`, `today` or `schedule`
 * glyph in the icon set, and no `info` either; a clock is the closest honest thing to "joined".
 */
function buildChannelFacts(profile: ChannelProfile): readonly ChannelFact[] {
  return [
    {
      iconFileName: "history_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      label: "Joined",
      value: formatIsoDateLabel(profile.joinedAt),
    },
    {
      iconFileName: "group_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      label: "Subscribers",
      value: formatCompactCountLabel(profile.subscriberCount),
    },
    {
      iconFileName: "video_library_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
      label: "Videos",
      // The exact count of what the grid lists, so a creator with private uploads sees no
      // discrepancy to explain.
      value: formatCountLabel(profile.publicVideoCount),
    },
    {
      iconFileName: "visibility_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
      label: "Views",
      // Grouped rather than compact: this is the one figure people read precisely.
      value: formatCountLabel(profile.publicViewCount),
    },
  ];
}

export default function ChannelAboutSheet({
  profile,
  onClose,
}: {
  readonly profile: ChannelProfile;
  readonly onClose: () => void;
}) {
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);
  const [isReportSheetOpen, setIsReportSheetOpen] = useState(false);
  const channelFacts = buildChannelFacts(profile);

  return (
    <ModalSheet title={profile.name} onClose={onClose}>
      <div className="px-4 pb-5">
        <p className="pb-3 text-sm text-muted-foreground">@{profile.handle}</p>

        <ChannelProfileDetails bio={profile.bio} links={profile.links} />

        <ul className="flex flex-col gap-3">
          {channelFacts.map((channelFact) => (
            <li key={channelFact.label} className="flex gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted">
                <Image src={`/icons/${channelFact.iconFileName}`} width={20} height={20} alt="" />
              </span>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">{channelFact.label}</p>
                <p className="text-sm text-foreground">{channelFact.value}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setIsShareSheetOpen(true)}
            className="flex cursor-pointer items-center gap-2 rounded-full bg-background px-4 py-2 text-sm font-medium text-foreground outline -outline-offset-1 outline-border"
          >
            <Image
              src="/icons/share_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              width={18}
              height={18}
              alt=""
            />
            Share channel
          </button>
          {/* Rendered for signed-out visitors too, like `FocusButton` on the page behind this: the
              backend answers with its own refusal, which is what tells somebody why nothing
              happened. Hiding it would just look broken. */}
          <button
            type="button"
            onClick={() => setIsReportSheetOpen(true)}
            className="flex cursor-pointer items-center gap-2 rounded-full bg-background px-4 py-2 text-sm font-medium text-foreground outline -outline-offset-1 outline-border"
          >
            <Image
              src="/icons/flag_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              width={18}
              height={18}
              alt=""
            />
            Report profile
          </button>
        </div>
      </div>

      {/*
        THE WATCH PAGE'S SHARE SHEET, unchanged. Every video-shaped prop on it is optional and
        `resolveAbsoluteShareUrl` resolves a relative path against the origin, so a channel URL
        works as-is.

        `onShared` IS DELIBERATELY OMITTED. `video_share.videoId` is NOT NULL with no polymorphic
        target, so there is no row a channel share could be recorded as — and a callback that
        quietly recorded the wrong thing would be worse than recording nothing.
      */}
      {isShareSheetOpen && (
        <ShareSheet
          onClose={() => setIsShareSheetOpen(false)}
          shareUrl={`/channel/${profile.handle}`}
          videoTitle={profile.name}
        />
      )}

      {isReportSheetOpen && (
        <ReportProfileSheet
          reportedUserId={profile.creatorId}
          displayName={profile.name}
          onClose={() => setIsReportSheetOpen(false)}
        />
      )}
    </ModalSheet>
  );
}

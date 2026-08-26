// TRANSPORT: server-fetch — reads `GET /channels/:handle` and page one of its videos with the
// caller's cookie forwarded.
//
// WHY THIS PAGE EXISTS, and it is a defect report rather than a feature request. `VideoCard`
// links a creator's avatar AND name to `/channel/{handle}`, and the venture reel linked the same
// creator to `/@{handle}` — two shapes for one destination, and NEITHER ROUTE EXISTED. Every card
// in every feed carried two dead links, and `/library`'s subscriptions tab had to render creators
// as unclickable text rather than join them. This is the destination.

import { notFound } from "next/navigation";

import Image from "next/image";

import ChannelVideosGrid from "@/components/home/channel/channel-videos-grid";
import FocusButton from "@/components/home/watch/focus-button";
import { getChannel, listChannelVideos } from "@/lib/channels/api";
import { formatSubscriberCountLabel } from "@/lib/feed/format";
import type { FeedVideo } from "@/lib/feed/schemas";
import { callerRequestOptions } from "@/lib/server-http";

/** One page of the grid — 24 fills a whole number of rows at 2, 3 and 4 columns. */
const CHANNEL_VIDEOS_PAGE_LIMIT = 24;

const PLACEHOLDER_AVATAR_SRC = "/dummy/profile_image01.avif";

export default async function ChannelPage({ handle }: { readonly handle: string }) {
  const requestOptions = await callerRequestOptions();

  // FETCHED TOGETHER, not waterfalled. The video read does not need the profile — it is keyed by
  // the same handle — so serialising them would add a full round trip for nothing. A video read
  // for a handle that turns out not to exist costs one wasted query, which is cheaper.
  const [profileResult, videosResult] = await Promise.all([
    getChannel(handle, requestOptions),
    listChannelVideos(handle, { limit: CHANNEL_VIDEOS_PAGE_LIMIT }, requestOptions),
  ]);

  // A REAL 404, not an empty shell. The backend answers 404 for both "no such handle" and "that
  // handle is unclaimed", and this page must not distinguish them either. `notFound()` also gives
  // crawlers the right status, which matters here: this is the one public page a crawler is most
  // likely to reach by guessing a URL.
  if (!profileResult.success) notFound();
  const profile = profileResult.data;

  // NULL, NOT `[]`, WHEN THE VIDEO READ FAILED. The grid treats null as "no server page, fetch
  // one" and an empty array as "loaded, genuinely nothing" — collapsing them would render "hasn't
  // published any videos yet" over a transient backend error.
  const initialRows: FeedVideo[] | null = videosResult.success ? videosResult.data.rows : null;
  const initialNextCursor = videosResult.success ? videosResult.data.nextCursor : null;

  return (
    <div className="pb-10">
      <header className="flex flex-col gap-4 px-4 pt-6 sm:flex-row sm:items-center lg:px-6">
        <Image
          src={profile.imageUrl ?? PLACEHOLDER_AVATAR_SRC}
          alt=""
          width={96}
          height={96}
          className="size-20 shrink-0 rounded-full object-cover sm:size-24"
        />
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-2xl font-semibold text-foreground md:text-3xl">
            {profile.name}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            @{profile.handle} · {formatSubscriberCountLabel(profile.subscriberCount)}
          </p>
        </div>
        {/*
          THE SAME CONTROL THE WATCH PAGE USES, not a second subscribe button. It is deliberately
          NOT optimistic — a subscription is a relationship, and showing "Focused" before the
          server agrees means a viewer believes they follow a creator they do not.

          Rendered for signed-out viewers too: the button answers with the backend's own refusal
          rather than being hidden, which is what tells somebody why nothing happened.
        */}
        <FocusButton
          creatorId={profile.creatorId}
          isSubscribed={profile.viewerState.isSubscribedToCreator}
        />
      </header>

      <hr className="mt-6 border-border" />

      <ChannelVideosGrid
        handle={profile.handle}
        initialRows={initialRows}
        initialNextCursor={initialNextCursor}
      />
    </div>
  );
}

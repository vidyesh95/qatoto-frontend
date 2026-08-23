// Shared domain types for the video/watch surface. Data truth lives in the
// Express backend; these shapes are the client-side contract only.

export type Episode = { id: string; label: string; isPremium: boolean };
export type Season = { id: string; label: string; episodes: Episode[] };

export type Reply = {
  id: string;
  profileSrc: string;
  author: string;
  /** Author this reply is directed at — shows the "▶ name" badge. */
  replyingTo?: string;
  postedAt: string;
  location: string;
  text: string;
  likes: string;
};

export type Comment = {
  id: string;
  profileSrc: string;
  author: string;
  postedAt: string;
  location: string;
  text: string;
  likes: string;
  /** Count badge fallback; prefer replyList.length when replies are attached. */
  replies: string;
  replyList?: Reply[];
};

export type Review = {
  id: string;
  profileSrc: string;
  author: string;
  variant: string;
  rating: number;
  text: string;
  images: string[];
  postedAt: string;
  location: string;
  likes: string;
  verified: boolean;
  /** Buyer Q&A under the review — viewers ask, reviewer replies. */
  replyList?: Reply[];
};

export type SaleItem = {
  name: string;
  price: string;
  sold: string;
};

export type WatchVideo = {
  id: string;
  videoSrc: string;
  /** WebVTT storyboard file for seek-bar hover previews. */
  thumbnailsSrc?: string;
  title: string;
  profileSrc: string;
  channelName: string;
  subscribers: string;
  views: string;
  postedAt: string;
  description: string;
  verified?: boolean;
  stats: { likes: string; comments: string; bookmarks: string; shares: string };
  chapters: { title: string; time: string; thumbSrc?: string }[];
  transcriptTitle: string;
  transcript: { time: string; text: string }[];
  trending: string;
  comments: Comment[];
  saleItem?: SaleItem;
  reviews?: Review[];
  isPremium?: boolean;
  seasons?: Season[];
};

export type VideoCardProps = {
  /**
   * The backend row id, when this card came from `GET /feed/videos`.
   *
   * OPTIONAL BY DESIGN, not by omission. The anime surface still builds `VideoCardProps`
   * objects from `src/mocks/anime-mocks.ts`, and a required id there would be a compile error
   * in three mock arrays for no benefit — those cards are not wired to engagement yet. Any
   * control that needs an id must branch on its absence rather than assume it.
   */
  videoId?: string;
  thumbnailSrc: string;
  profileSrc: string;
  title: string;
  channelName: string;
  views: string;
  /**
   * A pre-formatted relative label such as `"12 hours ago"`.
   *
   * DEAD FOR ANY FEED-SOURCED CARD — pass `""` and set `publishedAt` instead. Computing a
   * relative label during a server render freezes it into the `cacheComponents` entry, so the
   * page keeps claiming "12 hours ago" for as long as the cache lives and the client disagrees
   * on hydrate. Kept only for the mock surfaces that still hand-author the string.
   */
  postedAt: string;
  /**
   * ISO 8601 publish instant, straight off the wire. Rendered by `<RelativeTime>`, which is a
   * client component precisely so the relative label is computed in the browser.
   */
  publishedAt?: string | null;
  /**
   * `viewerState.hasSaved` off the wire — whether this viewer has bookmarked the video.
   *
   * ONLY FOR THE CARD'S KEBAB MENU, which is why it is not rendered on the card face. Without
   * it the menu opens saying "Save to bookmarks" over a video already bookmarked, and a wired
   * control that lies on first paint is worse than no control. Costs no extra request:
   * `GET /feed/videos` already embeds `viewerState` on every row.
   */
  hasSaved?: boolean;
  /**
   * The creator's backend row id, for the kebab menu's "don't recommend channel".
   *
   * NOT INTERCHANGEABLE WITH `channelHref`. That prop is a PATH built from the creator's
   * handle, and it is omitted entirely when a creator has none — a link to `/channel/null`
   * being worse than no link. The mute route addresses the creator by id, so it needs this.
   * Optional for the same reason `videoId` is: the anime mocks carry neither.
   */
  creatorId?: string;
  verified?: boolean;
  hoverBg?: string;
  isChannelLive?: boolean;
  href?: string;
  channelHref?: string;
  /** Eager-load the thumbnail when the card is above the fold (LCP candidate). */
  isPriority?: boolean;
  /**
   * The `sizes` hint for the thumbnail, describing how wide the card renders at each
   * breakpoint.
   *
   * DEFAULTS TO THE FEED/SEARCH GRID and should be left alone on those surfaces. Pass an
   * override only where cards are laid out differently — the watch page's right-hand rail is
   * a narrow single column, and the grid default would have it fetch a quarter-viewport image
   * for every card in the rail.
   */
  thumbnailSizes?: string;
};

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
  title: string;
  profileSrc: string;
  channelName: string;
  subscribers: string;
  views: string;
  postedAt: string;
  description: string;
  verified?: boolean;
  stats: { likes: string; comments: string; bookmarks: string; shares: string };
  chapters: { title: string; time: string; thumbSrc: string }[];
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
  thumbnailSrc: string;
  profileSrc: string;
  title: string;
  channelName: string;
  views: string;
  postedAt: string;
  verified?: boolean;
  hoverBg?: string;
  isChannelLive?: boolean;
  href?: string;
  channelHref?: string;
};

// Shared domain types for the anime surface. Data truth lives in the Express
// backend; these shapes are the client-side contract only.

export type Media = { id: string; imageSrc: string; title: string };

export type RankedEpisode = {
  id: string;
  rank: number;
  imageSrc: string;
  title: string;
  channelName: string;
  views: string;
  likes: string;
  verified?: boolean;
};

export type DailyEpisode = {
  id: string;
  imageSrc: string;
  title: string;
  channelName: string;
  views: string;
  likes: string;
  verified?: boolean;
};

export type Period = "Weekly" | "Monthly" | "Yearly";
export type RankingSort = "Trending" | "Most viewed" | "Most liked" | "Newest";
export type Day = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";
export type Genre =
  | "All"
  | "Fantasy"
  | "Romance"
  | "Immortal"
  | "Martial Arts"
  | "Adventure"
  | "Action"
  | "Slice of Life"
  | "Sci-fi"
  | "Comedy"
  | "Horror"
  | "History";
export type GenreSort = "Hottest" | "Latest" | "Completed";
export type FavoriteTab = "Liked" | "Bookmarked";

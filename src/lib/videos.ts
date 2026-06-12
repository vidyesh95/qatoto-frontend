import type { Comment, Review, SaleItem } from "@/components/home/watch/comments";

export type Episode = { id: string; label: string; isPremium: boolean };
export type Season = { id: string; label: string; episodes: Episode[] };

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

const VIDEO_API_URL = process.env.QATOTO_VIDEO_API_URL;

async function videoFetch<T>(path: string): Promise<T | null> {
  if (!VIDEO_API_URL) return null;
  try {
    const res = await fetch(`${VIDEO_API_URL}${path}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data: T = await res.json();
    return data;
  } catch {
    return null;
  }
}

export async function getVideo(id: string): Promise<WatchVideo | null> {
  "use cache";
  const remote = await videoFetch<WatchVideo>(`/videos/${encodeURIComponent(id)}`);
  if (remote) return remote;
  return MOCK_VIDEOS[id] ?? null;
}

const TS_THUMB = "/dummy/thumbnail_image01.avif";

const ANIME_SEASONS: Season[] = [
  {
    id: "s1",
    label: "S1",
    episodes: [
      { id: "e1", label: "E1", isPremium: false },
      { id: "e2", label: "E2", isPremium: false },
      { id: "e3", label: "E3", isPremium: true },
      { id: "e4", label: "E4", isPremium: true },
      { id: "e5", label: "E5", isPremium: true },
      { id: "e6", label: "E6", isPremium: true },
      { id: "e7", label: "E7", isPremium: true },
      { id: "e8", label: "E8", isPremium: true },
      { id: "e9", label: "E9", isPremium: true },
      { id: "e10", label: "E10", isPremium: true },
      { id: "e11", label: "E11", isPremium: true },
      { id: "e12", label: "E12", isPremium: true },
      { id: "e13", label: "E13", isPremium: true },
      { id: "e14", label: "E14", isPremium: true },
      { id: "e15", label: "E15", isPremium: true },
    ],
  },
  {
    id: "s2",
    label: "S2",
    episodes: [
      { id: "s2e1", label: "E1", isPremium: true },
      { id: "s2e2", label: "E2", isPremium: true },
      { id: "s2e3", label: "E3", isPremium: true },
      { id: "s2e4", label: "E4", isPremium: true },
      { id: "s2e5", label: "E5", isPremium: true },
      { id: "s2e6", label: "E6", isPremium: true },
      { id: "s2e7", label: "E7", isPremium: true },
      { id: "s2e8", label: "E8", isPremium: true },
      { id: "s2e9", label: "E9", isPremium: true },
      { id: "s2e10", label: "E10", isPremium: true },
      { id: "s2e11", label: "E11", isPremium: true },
      { id: "s2e12", label: "E12", isPremium: true },
    ],
  },
];

const MOCK_VIDEOS: Record<string, WatchVideo> = {
  "1": {
    id: "1",
    videoSrc: "/dummy/video/Sintel_1080_10s_1MB.mp4",
    title: "Pomporo singing 🌼Fengzhi Senai🌼 at Disney Land",
    profileSrc: "/dummy/profile_image_01.avif",
    channelName: "Arin Light",
    subscribers: "14 million",
    views: "2.5M views",
    postedAt: "12 hours ago",
    description:
      "Pomporo takes the stage at Disney Land with a breathtaking live performance of Fengzhi Senai 🌼\n\nShot across the park over two magical evenings. Huge thanks to the crew, the dancers, and everyone who came out to sing along.\n\nFollow for more live sessions, behind-the-scenes clips, and tour dates.\n#Pomporo #FengzhiSenai #DisneyLand #LivePerformance",
    verified: true,
    stats: { likes: "3.7k", comments: "414", bookmarks: "1.1k", shares: "3696" },
    chapters: [
      { title: "Enums", time: "33:08", thumbSrc: TS_THUMB },
      { title: "Functions", time: "36:31", thumbSrc: TS_THUMB },
      { title: "Objects", time: "43:22", thumbSrc: TS_THUMB },
      { title: "Advanced Types", time: "47:57", thumbSrc: TS_THUMB },
      { title: "Type Aliases", time: "48:26", thumbSrc: TS_THUMB },
      { title: "Union Types", time: "50:04", thumbSrc: TS_THUMB },
      { title: "Intersection Types", time: "52:11", thumbSrc: TS_THUMB },
    ],
    transcriptTitle: "What is JavaScript",
    transcript: [
      {
        time: "0:01",
        text: "In this 3-minute introduction, I'm going to answer four frequently asked questions",
      },
      {
        time: "0:06",
        text: "about JavaScript. What is JavaScript, what can you do with it, where does JavaScript code run and what is the difference between",
      },
      {
        time: "0:14",
        text: "JavaScript and ECMAScript. So let's start with the first question. What is",
      },
      {
        time: "0:19",
        text: "JavaScript? JavaScript is one of the most popular and widely used programming languages in the world right now. It's growing faster than any other",
      },
      {
        time: "0:28",
        text: "programming languages and big companies like Netflix, Walmart, and PayPal build",
      },
      {
        time: "0:35",
        text: "their products using JavaScript. So what can you do with JavaScript? You can",
      },
      {
        time: "0:42",
        text: "build interactive web applications, mobile apps, server-side applications, and even",
      },
      {
        time: "0:49",
        text: "desktop applications. JavaScript runs in the browser, Node.js runtime, and many other",
      },
      {
        time: "0:56",
        text: "environments. ECMAScript is the standardized specification of JavaScript while",
      },
      {
        time: "1:03",
        text: "JavaScript is the implementation of that standard. Now that you understand the basics,",
      },
      {
        time: "1:10",
        text: "you're ready to start learning JavaScript. Visit our website to get started today.",
      },
    ],
    trending: "How much is McLaren",
    comments: [
      {
        id: "c1",
        profileSrc: "/dummy/profile_image_02.avif",
        author: "@ikun",
        postedAt: "12 months ago",
        location: "Central African Republic",
        text: "Cement flower pot 🤣 too heavy, No one wants",
        likes: "8.8m",
        replies: "273",
        replyList: [
          {
            id: "c1r1",
            profileSrc: "/dummy/profile_image_03.avif",
            author: "@reallyangrymonk",
            postedAt: "5 hours ago",
            location: "Fujian",
            text: "Noodles? That's something anyone with hands can make!",
            likes: "42",
          },
          {
            id: "c1r2",
            profileSrc: "/dummy/profile_image_04.avif",
            author: "@ayituhi",
            replyingTo: "@reallyangrymonk",
            postedAt: "3 minutes ago",
            location: "Fujian",
            text: "Make one and let me see",
            likes: "5",
          },
          {
            id: "c1r3",
            profileSrc: "/dummy/profile_image_01.avif",
            author: "@sevencolors",
            postedAt: "4 hours ago",
            location: "Anhui",
            text: "Open your mouth 😁😁😁",
            likes: "1",
          },
        ],
      },
      {
        id: "c2",
        profileSrc: "/dummy/profile_image_03.avif",
        author: "@homeowner",
        postedAt: "5 hours ago",
        location: "Singapore",
        text: "Watched this on loop all morning. Disney Land never looked better.",
        likes: "604",
        replies: "8",
      },
      {
        id: "c3",
        profileSrc: "/dummy/profile_image_04.avif",
        author: "@chillhub",
        postedAt: "9 hours ago",
        location: "United Kingdom",
        text: "Anyone know the name of the song at the start?",
        likes: "211",
        replies: "0",
      },
    ],
    saleItem: {
      name: "The same octagonal flowerpot mold as the video",
      price: "$68",
      sold: "310",
    },
    reviews: [
      {
        id: "r1",
        profileSrc: "/dummy/profile_image_02.avif",
        author: "@ikun",
        variant: "Cement flower pot with Safety manual and gray mold 1pc",
        rating: 3,
        text: "Cement flower pot 🤣 too heavy, No one wants",
        images: [
          "/dummy/review_image01.avif",
          "/dummy/review_image02.avif",
          "/dummy/review_image03.avif",
        ],
        postedAt: "12 months ago",
        location: "Central African Republic",
        likes: "8.8m",
        verified: true,
        replyList: [
          {
            id: "r1q1",
            profileSrc: "/dummy/profile_image_04.avif",
            author: "@curiousbuyer",
            postedAt: "8 months ago",
            location: "Vietnam",
            text: "How was it overall? At what price did you purchase it?",
            likes: "32",
          },
          {
            id: "r1q2",
            profileSrc: "/dummy/profile_image_02.avif",
            author: "@ikun",
            replyingTo: "@curiousbuyer",
            postedAt: "8 months ago",
            location: "Central African Republic",
            text: "Quality is good, just heavy. Paid $68 here on the listing.",
            likes: "19",
          },
          {
            id: "r1q3",
            profileSrc: "/dummy/profile_image_03.avif",
            author: "@deals_hunter",
            postedAt: "7 months ago",
            location: "Indonesia",
            text: "Is it more affordable in offline retail stores?",
            likes: "11",
          },
          {
            id: "r1q4",
            profileSrc: "/dummy/profile_image_02.avif",
            author: "@ikun",
            replyingTo: "@deals_hunter",
            postedAt: "7 months ago",
            location: "Central African Republic",
            text: "Couldn't find it offline near me, online was cheaper.",
            likes: "6",
          },
        ],
      },
      {
        id: "r2",
        profileSrc: "/dummy/profile_image_03.avif",
        author: "@homeowner",
        variant: "Octagonal mold with gray mold 1pc",
        rating: 5,
        text: "Perfect for my balcony garden. Sturdy and easy to demold.",
        images: ["/dummy/thumbnail_image04.avif"],
        postedAt: "3 months ago",
        location: "Singapore",
        likes: "1.4k",
        verified: true,
      },
    ],
  },
  "anime-free": {
    id: "anime-free",
    videoSrc: "/dummy/video/Sintel_1080_10s_1MB.mp4",
    title: "Pomporo singing 🌼Fengzhi Senai🌼 at Disney Land",
    profileSrc: "/dummy/profile_image_01.avif",
    channelName: "Arin Light",
    subscribers: "14 million",
    views: "2.5M views",
    postedAt: "12 hours ago",
    description:
      "Pomporo takes the stage at Disney Land with a breathtaking live performance of Fengzhi Senai 🌼\n\nShot across the park over two magical evenings. Huge thanks to the crew, the dancers, and everyone who came out to sing along.\n\nFollow for more live sessions, behind-the-scenes clips, and tour dates.\n#Pomporo #FengzhiSenai #DisneyLand #LivePerformance",
    verified: true,
    stats: { likes: "3.7k", comments: "414", bookmarks: "1.1k", shares: "3696" },
    chapters: [
      { title: "Opening", time: "0:00", thumbSrc: TS_THUMB },
      { title: "Act 1", time: "2:15", thumbSrc: TS_THUMB },
      { title: "Act 2", time: "5:30", thumbSrc: TS_THUMB },
      { title: "Finale", time: "8:45", thumbSrc: TS_THUMB },
    ],
    transcriptTitle: "Fengzhi Senai Performance",
    transcript: [
      { time: "0:01", text: "Welcome to the magical world of Fengzhi Senai at Disney Land." },
      { time: "0:10", text: "Pomporo takes the stage as the crowd erupts in applause." },
      { time: "0:20", text: "The performance begins with the iconic opening melody." },
      { time: "0:35", text: "Dancers fill the stage with vibrant costumes and choreography." },
      { time: "0:50", text: "The chorus echoes through the park as fireworks light the sky." },
    ],
    trending: "Fengzhi Senai Disney Land",
    comments: [
      {
        id: "c1",
        profileSrc: "/dummy/profile_image_02.avif",
        author: "@anime_fan",
        postedAt: "3 hours ago",
        location: "Japan",
        text: "This performance was absolutely stunning! Pomporo never disappoints 🌼",
        likes: "2.1k",
        replies: "47",
        replyList: [
          {
            id: "c1r1",
            profileSrc: "/dummy/profile_image_05.avif",
            author: "@fengzhi_lover",
            postedAt: "2 hours ago",
            location: "South Korea",
            text: "Agreed! The choreography in Act 2 was incredible.",
            likes: "312",
          },
        ],
      },
      {
        id: "c2",
        profileSrc: "/dummy/profile_image_03.avif",
        author: "@disneymagic",
        postedAt: "5 hours ago",
        location: "United States",
        text: "Disney Land is the perfect backdrop for this. The vibes were immaculate.",
        likes: "890",
        replies: "12",
      },
    ],
    seasons: ANIME_SEASONS,
  },
  "anime-premium": {
    id: "anime-premium",
    videoSrc: "/dummy/video/Sintel_1080_10s_1MB.mp4",
    title: "Pomporo singing 🌼Fengzhi Senai🌼 at Disney Land",
    profileSrc: "/dummy/profile_image_01.avif",
    channelName: "Arin Light",
    subscribers: "14 million",
    views: "2.5M views",
    postedAt: "12 hours ago",
    description:
      "Pomporo takes the stage at Disney Land with a breathtaking live performance of Fengzhi Senai 🌼\n\nShot across the park over two magical evenings. Huge thanks to the crew, the dancers, and everyone who came out to sing along.\n\nFollow for more live sessions, behind-the-scenes clips, and tour dates.\n#Pomporo #FengzhiSenai #DisneyLand #LivePerformance",
    verified: true,
    stats: { likes: "3.7k", comments: "414", bookmarks: "1.1k", shares: "3696" },
    chapters: [],
    transcriptTitle: "",
    transcript: [],
    trending: "Fengzhi Senai Disney Land",
    comments: [
      {
        id: "c1",
        profileSrc: "/dummy/profile_image_02.avif",
        author: "@anime_fan",
        postedAt: "3 hours ago",
        location: "Japan",
        text: "This performance was absolutely stunning! Pomporo never disappoints 🌼",
        likes: "2.1k",
        replies: "47",
        replyList: [
          {
            id: "c1r1",
            profileSrc: "/dummy/profile_image_05.avif",
            author: "@fengzhi_lover",
            postedAt: "2 hours ago",
            location: "South Korea",
            text: "Agreed! The choreography in Act 2 was incredible.",
            likes: "312",
          },
        ],
      },
      {
        id: "c2",
        profileSrc: "/dummy/profile_image_03.avif",
        author: "@disneymagic",
        postedAt: "5 hours ago",
        location: "United States",
        text: "Disney Land is the perfect backdrop for this. The vibes were immaculate.",
        likes: "890",
        replies: "12",
      },
    ],
    isPremium: true,
    seasons: ANIME_SEASONS,
  },
};

import SectionDivider from "@/components/home/section-divider";
import SpotlightVideoCards from "@/components/home/spotlight-video-cards";
import VideoCard, { type VideoCardProps } from "@/components/home/video-card";
import VideoCategoryCard, {
  type VideoCategoryCardProps,
} from "@/components/home/video-category-card";

type Video = VideoCardProps & { id: string };
type VideoCategory = VideoCategoryCardProps & { id: string };
type Spotlight = { id: string; imageSrc: string; alt: string };

const SPOTLIGHT_VIDEOS: Spotlight[] = [
  { id: "1", imageSrc: "/dummy/spotlight_image01.avif", alt: "Spotlight" },
  { id: "2", imageSrc: "/dummy/spotlight_image02.avif", alt: "Spotlight" },
  { id: "3", imageSrc: "/dummy/spotlight_image03.avif", alt: "Spotlight" },
];

const POSITIONS = ["left", "center", "right"] as const;

const RECOMMENDED_VIDEOS: Video[] = [
  {
    id: "1",
    thumbnailSrc: "/dummy/thumbnail_image01.avif",
    profileSrc: "/dummy/profile_image_01.avif",
    title: "Pomporo singing 🌼Fengzhi Senai🌼 at Disney Land",
    channelName: "Arin Light",
    views: "2.5M views",
    postedAt: "12 hours ago",
    verified: true,
    hoverBg: "group-hover:bg-yellow-100",
    isChannelLive: false,
  },
  {
    id: "2",
    thumbnailSrc: "/dummy/thumbnail_image02.avif",
    profileSrc: "/dummy/profile_image_02.avif",
    title: "Need for speed @234MPH",
    channelName: "BTS fan boi🤩",
    views: "973 views",
    postedAt: "37 minutes ago",
    verified: false,
    hoverBg: "group-hover:bg-amber-100",
    isChannelLive: false,
  },
  {
    id: "3",
    thumbnailSrc: "/dummy/thumbnail_image03.avif",
    profileSrc: "/dummy/profile_image_03.avif",
    title: "Your everyday slicing made easy - cucumber, carrot, radish in snap",
    channelName: "Home owners friend",
    views: "9k watching",
    postedAt: "Live",
    verified: true,
    hoverBg: "group-hover:bg-green-100",
    isChannelLive: true,
  },
  {
    id: "4",
    thumbnailSrc: "/dummy/thumbnail_image04.avif",
    profileSrc: "/dummy/profile_image_04.avif",
    title: "Driving on Tour de Auto Weisseir",
    channelName: "BMW Girl",
    views: "275K watching",
    postedAt: "Live",
    verified: true,
    hoverBg: "group-hover:bg-green-100",
    isChannelLive: true,
  },
  {
    id: "5",
    thumbnailSrc: "/dummy/thumbnail_image05.avif",
    profileSrc: "/dummy/profile_image_05.avif",
    title: "Traditional Mongolian luxury villa",
    channelName: "Luxury Investment",
    views: "189K views",
    postedAt: "17 hours ago",
    verified: true,
    hoverBg: "group-hover:bg-yellow-100",
    isChannelLive: false,
  },
  {
    id: "6",
    thumbnailSrc: "/dummy/thumbnail_image06.avif",
    profileSrc: "/dummy/profile_image_06.avif",
    title: "Катюша танец",
    channelName: "товарищ Сталин",
    views: "7.9M views",
    postedAt: "3 weeks ago",
    verified: true,
    hoverBg: "group-hover:bg-red-100",
    isChannelLive: true,
  },
  {
    id: "7",
    thumbnailSrc: "/dummy/thumbnail_image07.avif",
    profileSrc: "/dummy/profile_image_07.avif",
    title: 'Studio Ghibli anime "My Neighbour Totoro"',
    channelName: "Little Red Riding Hood",
    views: "1.3K views",
    postedAt: "3 hours ago",
    verified: false,
    hoverBg: "group-hover:bg-amber-100",
    isChannelLive: false,
  },
  {
    id: "8",
    thumbnailSrc: "/dummy/thumbnail_image08.avif",
    profileSrc: "/dummy/profile_image_08.avif",
    title: "Buy Smart LED Wifi dress for night driving",
    channelName: "Ecoco",
    views: "57M views",
    postedAt: "2 years ago",
    verified: true,
    hoverBg: "group-hover:bg-blue-100",
    isChannelLive: false,
  },
];

const EXPLORE_VIDEOS: Video[] = [
  {
    id: "1",
    thumbnailSrc: "/dummy/thumbnail_image01.avif",
    profileSrc: "/dummy/profile_image_01.avif",
    title: "Pomporo singing 🌼Fengzhi Senai🌼 at Disney Land",
    channelName: "Arin Light",
    views: "2.5M views",
    postedAt: "12 hours ago",
    verified: true,
    hoverBg: "group-hover:bg-yellow-100",
    isChannelLive: false,
  },
  {
    id: "2",
    thumbnailSrc: "/dummy/thumbnail_image02.avif",
    profileSrc: "/dummy/profile_image_02.avif",
    title: "Need for speed @234MPH",
    channelName: "BTS fan boi🤩",
    views: "973 views",
    postedAt: "37 minutes ago",
    verified: false,
    hoverBg: "group-hover:bg-amber-100",
    isChannelLive: false,
  },
  {
    id: "3",
    thumbnailSrc: "/dummy/thumbnail_image03.avif",
    profileSrc: "/dummy/profile_image_03.avif",
    title: "Your everyday slicing made easy - cucumber, carrot, radish in snap",
    channelName: "Home owners friend",
    views: "9k watching",
    postedAt: "Live",
    verified: true,
    hoverBg: "group-hover:bg-green-100",
    isChannelLive: true,
  },
  {
    id: "4",
    thumbnailSrc: "/dummy/thumbnail_image04.avif",
    profileSrc: "/dummy/profile_image_04.avif",
    title: "Driving on Tour de Auto Weisseir",
    channelName: "BMW Girl",
    views: "275K watching",
    postedAt: "Live",
    verified: true,
    hoverBg: "group-hover:bg-green-100",
    isChannelLive: true,
  },
  {
    id: "5",
    thumbnailSrc: "/dummy/thumbnail_image05.avif",
    profileSrc: "/dummy/profile_image_05.avif",
    title: "Traditional Mongolian luxury villa",
    channelName: "Luxury Investment",
    views: "189K views",
    postedAt: "17 hours ago",
    verified: true,
    hoverBg: "group-hover:bg-yellow-100",
    isChannelLive: false,
  },
  {
    id: "6",
    thumbnailSrc: "/dummy/thumbnail_image06.avif",
    profileSrc: "/dummy/profile_image_06.avif",
    title: "Катюша танец",
    channelName: "товарищ Сталин",
    views: "7.9M views",
    postedAt: "3 weeks ago",
    verified: true,
    hoverBg: "group-hover:bg-red-100",
    isChannelLive: false,
  },
  {
    id: "7",
    thumbnailSrc: "/dummy/thumbnail_image07.avif",
    profileSrc: "/dummy/profile_image_07.avif",
    title: 'Studio Ghibli anime "My Neighbour Totoro"',
    channelName: "Little Red Riding Hood",
    views: "1.3K views",
    postedAt: "3 hours ago",
    verified: false,
    hoverBg: "group-hover:bg-amber-100",
    isChannelLive: false,
  },
  {
    id: "8",
    thumbnailSrc: "/dummy/thumbnail_image08.avif",
    profileSrc: "/dummy/profile_image_08.avif",
    title: "Buy Smart LED Wifi dress for night driving",
    channelName: "Ecoco",
    views: "57M views",
    postedAt: "2 years ago",
    verified: true,
    hoverBg: "group-hover:bg-blue-100",
    isChannelLive: false,
  },
  {
    id: "9",
    thumbnailSrc: "/dummy/thumbnail_image09.avif",
    profileSrc: "/dummy/profile_image_09.avif",
    title: "Hitman 1867",
    channelName: "Xiaorou",
    views: "17K views",
    postedAt: "14 minutes ago",
    verified: false,
    hoverBg: "group-hover:bg-blue-100",
    isChannelLive: true,
  },
  {
    id: "10",
    thumbnailSrc: "/dummy/thumbnail_image10.avif",
    profileSrc: "/dummy/profile_image_10.avif",
    title: "Evening chat with Shen Yue",
    channelName: "Shen Yue | 沉月",
    views: "1M views",
    postedAt: "1 week ago",
    verified: true,
    hoverBg: "group-hover:bg-red-100",
    isChannelLive: true,
  },
  {
    id: "11",
    thumbnailSrc: "/dummy/thumbnail_image11.avif",
    profileSrc: "/dummy/profile_image_11.avif",
    title: "Beauty of Norway at 60 fps | Drone view",
    channelName: "Nature Traveler",
    views: "6.5M views",
    postedAt: "5 months ago",
    verified: true,
    hoverBg: "group-hover:bg-green-100",
    isChannelLive: false,
  },
  {
    id: "12",
    thumbnailSrc: "/dummy/thumbnail_image12.avif",
    profileSrc: "/dummy/profile_image_12.avif",
    title: "ฉากต่อสู้อนิเมะ | อนิเมะญี่ปุ่น",
    channelName: "อนิเมะญี่ปุ่น",
    views: "369K views",
    postedAt: "1 day ago",
    verified: false,
    hoverBg: "group-hover:bg-amber-100",
    isChannelLive: false,
  },
];

const VIDEO_CATEGORIES: VideoCategory[] = [
  {
    id: "1",
    imageSrc: "/dummy/category_2.avif",
    name: "Manufacturing",
    hoverBg: "group-hover:bg-yellow-100",
  },
  {
    id: "2",
    imageSrc: "/dummy/category_4.avif",
    name: "Robotics",
    hoverBg: "group-hover:bg-blue-100",
  },
  {
    id: "3",
    imageSrc: "/dummy/category_6.avif",
    name: "Immortality",
    hoverBg: "group-hover:bg-red-100",
  },
  {
    id: "4",
    imageSrc: "/dummy/category_1.avif",
    name: "Magic",
    hoverBg: "group-hover:bg-amber-100",
  },
  {
    id: "5",
    imageSrc: "/dummy/category_3.avif",
    name: "Toys",
    hoverBg: "group-hover:bg-green-100",
  },
  {
    id: "6",
    imageSrc: "/dummy/category_5.avif",
    name: "Teleportation",
    hoverBg: "group-hover:bg-blue-100",
  },
  {
    id: "7",
    imageSrc: "/dummy/category_3.avif",
    name: "Fusion Energy",
    hoverBg: "group-hover:bg-green-100",
  },
  {
    id: "8",
    imageSrc: "/dummy/category_2.avif",
    name: "Quantum Computing",
    hoverBg: "group-hover:bg-yellow-100",
  },
  {
    id: "9",
    imageSrc: "/dummy/category_4.avif",
    name: "Neural Interfaces",
    hoverBg: "group-hover:bg-blue-100",
  },
  {
    id: "10",
    imageSrc: "/dummy/category_5.avif",
    name: "Space Mining",
    hoverBg: "group-hover:bg-blue-100",
  },
  {
    id: "11",
    imageSrc: "/dummy/category_6.avif",
    name: "Nanotech",
    hoverBg: "group-hover:bg-red-100",
  },
  {
    id: "12",
    imageSrc: "/dummy/category_1.avif",
    name: "Space Jump Gate",
    hoverBg: "group-hover:bg-amber-100",
  },
];

export default function AllContent() {
  return (
    <section className="py-8 space-y-8">
      <div>
        <SectionDivider title="RECOMMENDED FOR YOU" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-3 gap-y-6 px-4 lg:px-6 py-2">
          {RECOMMENDED_VIDEOS.map(({ id, ...video }) => (
            <VideoCard key={id} {...video} />
          ))}
        </div>
      </div>
      <div>
        <SectionDivider title="WHAT'S ON YOUR MIND?" />
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-3 gap-y-6 px-4 lg:px-6 py-2">
          {VIDEO_CATEGORIES.map(({ id, ...category }) => (
            <VideoCategoryCard key={id} {...category} />
          ))}
        </div>
      </div>
      <div>
        <SectionDivider title="SPOTLIGHT" />
        <div className="md:h-48 lg:h-64 xl:h-93 group/spot flex flex-col md:flex-row gap-4 px-4 lg:px-6 py-2 items-center">
          {SPOTLIGHT_VIDEOS.map(({ id, ...spotlight }, i) => (
            <SpotlightVideoCards key={id} {...spotlight} position={POSITIONS[i]} />
          ))}
        </div>
      </div>
      <div>
        <SectionDivider title="EXPLORE" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-3 gap-y-6 px-4 lg:px-6 py-2">
          {EXPLORE_VIDEOS.map(({ id, ...video }) => (
            <VideoCard key={id} {...video} />
          ))}
        </div>
      </div>
    </section>
  );
}

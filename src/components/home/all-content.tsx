import SectionDivider from "@/components/home/section-divider";
import VideoCard, { type VideoCardProps } from "@/components/home/video-card";

type Video = VideoCardProps & { id: string };

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
  },
  {
    id: "7",
    thumbnailSrc: "/dummy/thumbnail_image07.avif",
    profileSrc: "/dummy/profile_image_07.avif",
    title: "Studio Ghibli anime \"My Neighbour Totoro\"",
    channelName: "Little Red Riding Hood",
    views: "1.3K views",
    postedAt: "3 hours ago",
    verified: false,
    hoverBg: "group-hover:bg-amber-100",
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
  },
];

export default function AllContent() {
  return (
    <section className="py-14 space-y-14">
      <div>
        <SectionDivider title="RECOMMENDED FOR YOU" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-3 gap-y-6 px-6 py-2">
          {RECOMMENDED_VIDEOS.map(({ id, ...video }) => (
            <VideoCard key={id} {...video} />
          ))}
        </div>
      </div>
    </section>
  );
}

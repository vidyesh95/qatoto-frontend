import SectionDivider from "@/components/home/section-divider";
import VideoCard from "@/components/home/video-card";

export default function AllContent() {
  return (
    <section className="py-14 space-y-14">
      <div>
        <SectionDivider title="RECOMMENDED FOR YOU" />
        <div className="flex flex-row">
          <VideoCard
            thumbnailSrc="/dummy/thumbnail_image01.avif"
            profileSrc="/dummy/profile_image_01.avif"
            title="Pomporo singing 🌼Fengzhi Senai🌼 at Disney Land"
            channelName="Arin Light"
            views="2.5M views"
            postedAt="12 hours ago"
            verified
            hoverBg="hover:bg-yellow-100"
          />
          <VideoCard
            thumbnailSrc="/dummy/thumbnail_image02.avif"
            profileSrc="/dummy/profile_image_02.avif"
            title="Need for speed @234MPH"
            channelName="BTS fan boi🤩"
            views="973 views"
            postedAt="37 minutes ago"
            verified
            hoverBg="hover:bg-amber-100"
          />
          <VideoCard
            thumbnailSrc="/dummy/thumbnail_image03.avif"
            profileSrc="/dummy/profile_image_03.avif"
            title="Your everyday slicing made easy - cucumber, carrot, radish in snap"
            channelName="Home owners friend"
            views="9k watching"
            postedAt="Live"
            verified
            hoverBg="hover:bg-green-100"
          />
          <VideoCard
            thumbnailSrc="/dummy/thumbnail_image04.avif"
            profileSrc="/dummy/profile_image_04.avif"
            title="Driving on Tour de Auto Weisseir"
            channelName="BMW Girl"
            views="275K watching"
            postedAt="Live"
            verified
            hoverBg="hover:bg-green-100"
          />
          <VideoCard
            thumbnailSrc="/dummy/thumbnail_image05.avif"
            profileSrc="/dummy/profile_image_05.avif"
            title="Traditional Mongolian luxury villa"
            channelName="Luxury Investment"
            views="189K views"
            postedAt="17 hours ago"
            verified
            hoverBg="hover:bg-yellow-100"
          />
          <VideoCard
            thumbnailSrc="/dummy/thumbnail_image06.avif"
            profileSrc="/dummy/profile_image_06.avif"
            title="Катюша танец"
            channelName="товарищ Сталин"
            views="7.9M views"
            postedAt="3 weeks ago"
            verified
            hoverBg="hover:bg-red-100"
          />
          <VideoCard
            thumbnailSrc="/dummy/thumbnail_image07.avif"
            profileSrc="/dummy/profile_image_07.avif"
            title="Studio Ghibli anime My Neighbour Totoro"
            channelName="Little Red Riding Hood"
            views="1.3K views"
            postedAt="3 hours ago"
            verified
            hoverBg="hover:bg-amber-100"
          />
          <VideoCard
            thumbnailSrc="/dummy/thumbnail_image08.avif"
            profileSrc="/dummy/profile_image_08.avif"
            title="Buy Smart LED Wifi dress for night driving"
            channelName="Ecoco"
            views="57M views"
            postedAt="2 years ago"
            verified
            hoverBg="hover:bg-blue-100"
          />
        </div>
      </div>
    </section>
  );
}

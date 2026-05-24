import SectionDivider from "@/components/home/section-divider";
import VideoCard from "@/components/home/video-card";

export default function AllContent() {
  return (
    <section className="py-14 space-y-14">
      <div>
        <SectionDivider title="RECOMMENDED FOR YOU" />
        <div className="">
          <VideoCard
            thumbnailSrc="/dummy/thumbnail_image01.avif"
            profileSrc="/dummy/profile_image_01.avif"
            title="Pomporo singing 🌼Fengzhi Senai🌼 at Disney Land"
            channelName="Arin Light"
            views="2.5M"
            postedAt="12 hours ago"
            verified
          />
        </div>
      </div>
    </section>
  );
}

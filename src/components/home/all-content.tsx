import SectionDivider from "@/components/home/section-divider";
import Image from "next/image";

export default function AllContent() {
  return (
    <section className="py-14 space-y-14">
      <div>
        <SectionDivider title="RECOMMENDED FOR YOU" />
        <Image
          src={"/dummy/thumbnail_image01.avif"}
          width={246}
          height={138}
          alt="thumbnail"
          className="rounded-xl"
        />
        <Image
          src={"/dummy/profile_image_01.avif"}
          width={36}
          height={36}
          alt="profile image"
          className="rounded-full border border-foreground"
        />
        <p className="line-clamp-2">Pomporo singing 🌼Fengzhi Senai🌼 at Disney Land</p>
        <div className="flex flex-row items-center gap-1">
          <span className="text-xs text-[#6F7979]">
            Arin Light
          </span>
          <Image
            src={"/icons/check_circle_24dp_6F7979_FILL1_wght400_GRAD0_opsz24.svg"}
            width={16}
            height={16}
            alt="verified"
          />
        </div>
        <div className="flex flex-row items-center gap-1">
          <span className="text-xs text-[#6F7979]">
            2.5M
          </span>
          <span className="text-xs text-[#6F7979]">
            views
          </span>
          <Image
            src={"/icons/circle_24dp_6F7979_FILL1_wght400_GRAD0_opsz24.svg"}
            width={4}
            height={4}
            alt="verified"
          />
          <span className="text-xs text-[#6F7979]">
            12 hours
          </span>
          <span className="text-xs text-[#6F7979]">
            ago
          </span>
        </div>
      </div>
    </section>
  );
}

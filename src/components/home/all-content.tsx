import SectionDivider from "@/components/home/section-divider";
import Image from "next/image";

export default function AllContent() {
  return (
    <section className="py-14 space-y-14">
      <div>
        <SectionDivider title="RECOMMENDED FOR YOU" />
        <div className="">
          <div className="p-2 w-61.5 rounded-2xl bg-amber-200">
            <Image
              src={"/dummy/thumbnail_image01.avif"}
              width={246}
              height={138}
              alt="thumbnail"
              className="rounded-xl"
            />
            <div className="flex flex-row items-start pt-2 gap-2">
              <Image
                src={"/dummy/profile_image_01.avif"}
                width={36}
                height={36}
                alt="profile image"
                className="rounded-full border border-foreground shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm line-clamp-2">
                  Pomporo singing 🌼Fengzhi Senai🌼 at Disney Land
                </p>
                <div className="flex flex-row items-center gap-1">
                  <span className="text-xs text-[#6F7979]">Arin Light</span>
                  <Image
                    src={"/icons/check_circle_24dp_6F7979_FILL1_wght400_GRAD0_opsz24.svg"}
                    width={16}
                    height={16}
                    alt="verified"
                  />
                </div>
                <div className="flex flex-row items-center gap-1">
                  <span className="text-xs text-[#6F7979]">2.5M views</span>
                  <Image
                    src={"/icons/circle_24dp_6F7979_FILL1_wght400_GRAD0_opsz24.svg"}
                    width={4}
                    height={4}
                    alt="verified"
                  />
                  <span className="text-xs text-[#6F7979]">12 hours ago</span>
                </div>
              </div>
              <Image
                src={"/icons/more_vert_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"}
                width={14}
                height={14}
                alt="More video options"
                className="shrink-0"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

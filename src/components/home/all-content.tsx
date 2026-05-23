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
      </div>
    </section>
  );
}

import Image from "next/image";
import Link from "next/link";

// Full-width moonshot banner linking to the standalone Project Immortal page.
// Deliberately distinct styling (deep teal gradient) from the rest of the
// landing so the moonshot reads as its own thing, not another project card.
export default function ProjectImmortalBanner() {
  return (
    <section className="mx-4 rounded-2xl bg-linear-to-r from-[#0B1F21] via-[#00393C] to-[#00696E] p-6 text-white md:p-10 lg:mx-6">
      <Image
        src="/icons/diamond_24dp_FFFFFF_FILL1_wght400_GRAD0_opsz24.svg"
        width={24}
        height={24}
        alt=""
      />
      <p className="mt-4 text-xs tracking-widest">MOONSHOT RESEARCH</p>
      <h2 className="mt-1 font-serif text-2xl md:text-4xl">PROJECT IMMORTAL</h2>
      <p className="mt-3 max-w-xl text-sm text-white/80">
        Qatoto&apos;s open, long-horizon research program into extending healthy human life.
      </p>
      <Link
        href="/project-immortal"
        className="mt-6 inline-block cursor-pointer rounded-full bg-white px-4 py-2 text-sm font-medium text-[#00696E]"
      >
        Explore Project Immortal
      </Link>
    </section>
  );
}

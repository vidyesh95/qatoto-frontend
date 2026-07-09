import Image from "next/image";
import Link from "next/link";

import PostIdeaSheet from "@/components/home/research-and-development/sheets/post-idea-sheet";

// Static hero band for the R&D landing — deliberately not a carousel. Pitches
// the whole concept-to-consumer pipeline in one paragraph with two CTAs: the
// post-idea sheet and an anchor down to the featured-projects rail.
export default function PipelineHero() {
  return (
    <section className="relative mx-4 overflow-hidden rounded-2xl lg:mx-6">
      <Image src="/dummy/rnd_hero_bg_01.avif" fill sizes="100vw" alt="" className="object-cover" />
      <div className="absolute inset-0 bg-linear-to-r from-black/70 to-black/30" />
      <div className="relative max-w-2xl p-6 text-white md:p-10">
        <h1 className="font-serif text-3xl md:text-5xl">From concept to consumer.</h1>
        <p className="mt-4 text-sm text-white/90 md:text-base">
          Research where demand is real, map the problems people report on the ground, build a team
          that trades skills for equity, fund every milestone through transparent escrow, and ship
          the finished product to customers worldwide — one pipeline, end to end.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <PostIdeaSheet />
          <Link
            href="#featured-projects"
            className="cursor-pointer rounded-full border border-white/70 px-4 py-2 text-sm font-medium text-white"
          >
            Explore projects
          </Link>
        </div>
      </div>
    </section>
  );
}

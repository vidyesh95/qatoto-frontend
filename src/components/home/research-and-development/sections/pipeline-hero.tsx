// TRANSPORT: props-only — presentational server component. Fetches nothing; data
// arrives as props. Safe on either side of the boundary.
import Image from "next/image";
import Link from "next/link";

// Static hero band for the R&D landing — deliberately not a carousel. Pitches
// the whole concept-to-consumer pipeline in one paragraph with two CTAs: the
// post-idea wizard and an anchor down to the featured-projects rail.
export default function PipelineHero() {
  return (
    <section className="relative mx-4 overflow-hidden rounded-2xl lg:mx-6">
      <Image
        src="/dummy/rnd_hero_bg_01.avif"
        fill
        sizes="100vw"
        alt=""
        loading="eager"
        className="object-cover"
      />
      {/* ⚠️ **THE SCRIM FLOOR IS AN ACCESSIBILITY FLOOR, NOT A TASTE SETTING.** It was
          `from-black/70 to-black/30`, and `todo.md` filed the result as unfixable — "an
          unpredictable photo under a scrim that thins to 30% on the right, which no opacity value
          fixes". The first half is true and the conclusion was wrong: it treated the scrim as fixed
          and the photo as the variable. The scrim is the half we control.

          Measured by sampling the rendered pixels with the text hidden: `rnd_hero_bg_01.avif` has
          BLOWN HIGHLIGHTS, rgb(251-255), directly under the text at every width, and the paragraph's
          ink reaches 91-95% of this section — where the old scrim was 32-34%. Contrast ran
          2.13-3.18:1 against a 4.5:1 requirement, and **even pure white failed**, which is why no
          `text-white/NN` change could have fixed it.

          THE RULE IS THE CONTRAST TARGET, NOT THE NUMBERS: the scrim must deliver 4.5:1 against the
          brightest pixel beneath each element's ink extent. `black/54` is what that works out to for
          THIS photograph and THIS text; the pair below is the gradient that delivers it, bottoming
          out at 60% with the paragraph at ~61%. **Re-derive all three if the image, the text colour
          or the type scale changes** — and note the h1 is now exactly 24px, WCAG's large-text
          threshold with zero margin, so it is deliberately held to the 4.5:1 line too (5.74:1) and
          does not depend on that carve-out surviving. */}
      <div className="absolute inset-0 bg-linear-to-r from-black/80 to-black/60" />
      <div className="relative max-w-2xl p-6 text-white md:p-10">
        <h1 className="text-2xl font-medium tracking-tight lg:text-3xl">
          From concept to consumer.
        </h1>
        <p className="mt-4 text-sm text-white/90 md:text-base">
          Research where demand is real, map the problems people report on the ground, build a team
          that trades skills for equity, keep every commitment and every month-end statement on the
          record, and ship the finished product to customers worldwide — one pipeline, end to end.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href="/research-and-development/new"
            className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Post your idea
          </Link>
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

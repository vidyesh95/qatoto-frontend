// TRANSPORT: props-only — client island for rotation only; renders the slides it is handed.
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { accentSurfaceClass } from "@/lib/store/labels";
import type { StoreHeroSlide } from "@/lib/store/merchandising.schemas";

const ROTATION_INTERVAL = 4000;

/**
 * Where a slide points, or `null` for a slide that points nowhere.
 *
 * `store_hero_slide` carries a CHECK that its three link columns are either ALL null or ALL set, so
 * a slide is either a link or decoration — there is no half-linked state to guess at. A decorative
 * slide renders as a plain figure rather than an anchor to `#`, because a link that goes nowhere is
 * worse for a keyboard or screen-reader user than no link at all.
 */
function slideHref(slide: StoreHeroSlide): string | null {
  if (slide.linkTargetKind === null || slide.linkTargetSlug === null) return null;
  switch (slide.linkTargetKind) {
    case "product":
      return `/store/product/${slide.linkTargetSlug}`;
    case "category":
      return `/store/categories/${slide.linkTargetSlug}`;
    case "organization":
      return `/store/organizations/${slide.linkTargetSlug}`;
    case "provider_offering":
      return `/store/services/${slide.linkTargetSlug}`;
    default: {
      const exhaustiveCheck: never = slide.linkTargetKind;
      return exhaustiveCheck;
    }
  }
}

// Full-bleed auto-advancing hero at the top of the store. Whole banner is a link to its slide
// target; dots are position indicators only (no nested buttons inside the link).
export default function HeroCarousel({ slides }: { slides: readonly StoreHeroSlide[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return undefined;
    const interval = setInterval(() => {
      setCurrentIndex((previousIndex) => (previousIndex + 1) % slides.length);
    }, ROTATION_INTERVAL);
    return () => clearInterval(interval);
  }, [slides.length]);

  if (slides.length === 0) return null;
  const slide = slides[currentIndex];
  const href = slideHref(slide);

  const bannerClassName =
    "relative mx-auto block aspect-video w-full overflow-hidden lg:aspect-auto lg:h-100 lg:w-177.75";

  const banner = (
    <>
      {/* No image falls back to the accent tint — a server-owned semantic token mapped to classes
          on this side, never a class name off the wire. */}
      <div className={`absolute inset-0 ${accentSurfaceClass(slide.accent)}`} />
      {slide.imageUrl !== null && (
        <Image
          src={slide.imageUrl}
          fill
          sizes="(min-width: 1024px) 710px, 100vw"
          className="object-cover object-center"
          loading="eager"
          alt={slide.title}
        />
      )}
      {/* ⚠️ **A FLOOR UNDER THE CAPTION, THEN A FADE — NOT A FADE THE CAPTION SITS IN.**
          This was `from-black/70 via-black/10 to-transparent`, and measured 1.63:1 against a 4.5:1
          requirement. The diagnosis is worth keeping: **the caption never moved, the gradient did.**
          The caption is `absolute bottom-7`, so it occupies 27-83px above this edge at EVERY width;
          the old gradient was percentage-based over a host that ranges 219-400px tall, so the same
          83px was 21% of the way up at desktop and 38% at 390px — deep into the fade, leaving an
          effective black/25.

          So the stop is in PIXELS. Solid to 96px (the caption's 83px top plus headroom), fading
          above that, where no text lives. Variation above the band is decorative, not structural.

          THE TARGET IS IMAGE-INDEPENDENT. Slides are backend-supplied, so the floor is derived
          against a blown-white ground, not against whatever is on the rail today — black/54 for
          non-large white text, shipped at black/60. ⚠️ That 60 assumes the subtitle below is FULL
          WHITE; `text-white/80` would need black/61, so the two move together.

          It also covers the no-image path, which is the one guaranteed failure here:
          `accentSurfaceClass` falls back to `bg-amber-50`/`bg-slate-100`/etc, and white text on a
          50-shade tint is white-on-white. This element renders above both the tint and the image. */}
      <div className="via-24 absolute inset-0 bg-linear-to-t from-black/60 via-black/60 to-transparent" />
      <div className="absolute bottom-7 left-4 lg:left-6">
        {slide.subtitle !== null && <p className="text-sm text-white">{slide.subtitle}</p>}
        <p className="text-3xl font-semibold text-white">{slide.title}</p>
      </div>
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
        {slides.map((eachSlide, index) => (
          <span
            key={eachSlide.id}
            className={`h-2 w-2 rounded-full transition ${
              index === currentIndex ? "bg-white" : "bg-white/40"
            }`}
          />
        ))}
      </div>
    </>
  );

  if (href === null) {
    return <div className={bannerClassName}>{banner}</div>;
  }

  return (
    <Link href={href} className={bannerClassName}>
      {banner}
    </Link>
  );
}

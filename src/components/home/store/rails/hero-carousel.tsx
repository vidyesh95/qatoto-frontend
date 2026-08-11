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
      <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent" />
      <div className="absolute bottom-7 left-4 lg:left-6">
        {slide.subtitle !== null && <p className="text-sm text-white/80">{slide.subtitle}</p>}
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

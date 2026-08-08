"use client";

// TRANSPORT: props-only

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { HeroSlide } from "@/lib/store/catalog.schemas";
import { heroSlideHref } from "@/lib/store/links";
import { accentTokenToSurfaceClass } from "@/lib/store/shared.schemas";

const ROTATION_INTERVAL_MS = 4000;

function SlideBody({ slide }: { slide: HeroSlide }) {
  return (
    <>
      {slide.imageUrl ? (
        <>
          <Image
            src={slide.imageUrl}
            fill
            sizes="(min-width: 1024px) 710px, 100vw"
            className="object-cover object-center"
            loading="eager"
            alt={slide.title}
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent" />
        </>
      ) : null}
      <div className="absolute bottom-6 left-4 lg:left-6">
        <h1 className={`text-2xl font-semibold sm:text-3xl ${slide.imageUrl ? "text-white" : ""}`}>
          {slide.title}
        </h1>
        {slide.subtitle ? (
          <p className={`text-sm ${slide.imageUrl ? "text-white/85" : "opacity-75"}`}>
            {slide.subtitle}
          </p>
        ) : null}
      </div>
    </>
  );
}

/**
 * The store hero.
 *
 * Two things the wire forces: `imageUrl` is nullable, so a slide may be type on its accent
 * surface rather than over a photo; and there is no `href` — the destination is
 * `linkTargetKind` + `linkTargetSlug`, which `heroSlideHref` resolves and which may be null
 * for a purely decorative slide. A slide with no target renders as a `<div>`, never as a
 * link to nowhere.
 */
export default function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return undefined;
    const interval = setInterval(() => {
      setCurrentIndex((previousIndex) => (previousIndex + 1) % slides.length);
    }, ROTATION_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [slides.length]);

  if (slides.length === 0) return null;
  const slide = slides[currentIndex];
  const slideHref = heroSlideHref(slide);
  const frameClass = `relative mx-auto block aspect-video w-full overflow-hidden lg:aspect-auto lg:h-100 lg:w-177.75 ${
    slide.imageUrl ? "bg-black" : accentTokenToSurfaceClass(slide.accent)
  }`;

  const indicators =
    slides.length > 1 ? (
      <div className="absolute right-4 bottom-4 flex gap-1.5">
        {slides.map((heroSlide, slideIndex) => (
          <span
            key={heroSlide.id}
            className={`size-1.5 rounded-full ${
              slideIndex === currentIndex ? "bg-white" : "bg-white/40"
            }`}
          />
        ))}
      </div>
    ) : null;

  if (slideHref === null) {
    return (
      <div className={frameClass}>
        <SlideBody slide={slide} />
        {indicators}
      </div>
    );
  }

  return (
    <Link href={slideHref} className={frameClass}>
      <SlideBody slide={slide} />
      {indicators}
    </Link>
  );
}

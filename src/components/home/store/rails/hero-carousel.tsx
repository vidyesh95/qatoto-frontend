"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { HeroSlide } from "@/types/store";

const ROTATION_INTERVAL = 4000;

// Full-bleed auto-advancing hero at the top of the store. Whole banner is a
// link to its slide target; dots are position indicators only (no nested
// buttons inside the link).
export default function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return undefined;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, ROTATION_INTERVAL);
    return () => clearInterval(interval);
  }, [slides.length]);

  if (slides.length === 0) return null;
  const slide = slides[currentIndex];

  return (
    <Link
      href={slide.href}
      className="relative mx-auto block aspect-video w-full overflow-hidden bg-black lg:aspect-auto lg:h-100 lg:w-177.75"
    >
      <Image
        src={slide.imageSrc}
        fill
        sizes="(min-width: 1024px) 710px, 100vw"
        className="object-cover object-center"
        loading="eager"
        alt={slide.title}
      />
      <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent" />
      <div className="absolute bottom-7 left-4 lg:left-6">
        <p className="text-sm text-white/80">{slide.subtitle}</p>
        <p className="text-3xl font-semibold text-white">{slide.title}</p>
      </div>
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
        {slides.map((s, idx) => (
          <span
            key={s.id}
            className={`h-2 w-2 rounded-full transition ${
              idx === currentIndex ? "bg-white" : "bg-white/40"
            }`}
          />
        ))}
      </div>
    </Link>
  );
}

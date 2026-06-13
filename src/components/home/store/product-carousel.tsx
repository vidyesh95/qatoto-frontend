"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

// Circular image carousel for the product hero. Clones the last slide before
// the first and the first slide after the last, so a swipe past either end
// lands on a clone and then silently jumps to the matching real slide — the
// track reads as an endless loop scrollable from either side at the start.
export default function ProductCarousel({ images, alt }: { images: string[]; alt: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  // DOM order: [lastClone, ...images, firstClone]. Real slide i sits at i + 1.
  const slides = [images[images.length - 1], ...images, images[0]];

  // Start on the first real slide (DOM index 1), not the leading clone.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollLeft = track.clientWidth;
  }, []);

  function handleScroll() {
    const track = trackRef.current;
    if (!track) return;
    const w = track.clientWidth;
    if (w === 0) return;
    const domIndex = Math.round(track.scrollLeft / w);

    // Landed on a clone — jump to the matching real slide without animation.
    if (domIndex === 0) {
      track.scrollTo({ left: images.length * w, behavior: "instant" });
      setActive(images.length - 1);
      return;
    }
    if (domIndex === slides.length - 1) {
      track.scrollTo({ left: w, behavior: "instant" });
      setActive(0);
      return;
    }
    setActive(domIndex - 1);
  }

  return (
    <div>
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="flex w-full snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto bg-[#F5F5F5] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((src, i) => (
          <div key={i} className="relative aspect-square w-full shrink-0 snap-center">
            <Image src={src} fill alt={alt} className="object-contain" />
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-1 py-2">
        {images.map((_, i) => (
          <span
            key={i}
            className={
              i === active
                ? "h-1 w-2 rounded-full bg-[#4A6364]"
                : "size-1 rounded-full bg-[#CCE8E9]"
            }
          />
        ))}
      </div>
    </div>
  );
}

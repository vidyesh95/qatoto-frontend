"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

// Circular image carousel for the product hero. Clones the last slide before
// the first and the first slide after the last, so a swipe past either end
// lands on a clone and then silently jumps to the matching real slide — the
// track reads as an endless loop scrollable from either side at the start.
export default function ProductCarousel({ images, alt }: { images: string[]; alt: string }) {
  const scrollTrackRef = useRef<HTMLDivElement>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // DOM order: [lastClone, ...images, firstClone]. Real image i sits at i + 1.
  const slidesWithClones = [images[images.length - 1], ...images, images[0]];

  // Start on the first real slide (DOM index 1), not the leading clone.
  useEffect(() => {
    const scrollTrack = scrollTrackRef.current;
    if (!scrollTrack) return;
    scrollTrack.scrollLeft = scrollTrack.clientWidth;
  }, []);

  function handleTrackScroll() {
    const scrollTrack = scrollTrackRef.current;
    if (!scrollTrack) return;
    const slideWidth = scrollTrack.clientWidth;
    if (slideWidth === 0) return;
    const domSlideIndex = Math.round(scrollTrack.scrollLeft / slideWidth);

    // Landed on a clone — jump to the matching real slide without animation.
    if (domSlideIndex === 0) {
      scrollTrack.scrollTo({ left: images.length * slideWidth, behavior: "instant" });
      setActiveImageIndex(images.length - 1);
      return;
    }
    if (domSlideIndex === slidesWithClones.length - 1) {
      scrollTrack.scrollTo({ left: slideWidth, behavior: "instant" });
      setActiveImageIndex(0);
      return;
    }
    setActiveImageIndex(domSlideIndex - 1);
  }

  return (
    <div>
      <div
        ref={scrollTrackRef}
        onScroll={handleTrackScroll}
        className="flex w-full snap-x snap-mandatory scrollbar-none overflow-x-auto bg-[#F5F5F5] [&::-webkit-scrollbar]:hidden"
      >
        {slidesWithClones.map((imageSrc, domSlideIndex) => (
          <div key={domSlideIndex} className="relative aspect-square w-full shrink-0 snap-center">
            <Image
              src={imageSrc}
              fill
              priority={domSlideIndex === 0}
              sizes="(min-width: 1024px) 50vw, 100vw"
              alt={alt}
              className="object-contain"
            />
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-1 py-2">
        {images.map((_, imageIndex) => (
          <span
            key={imageIndex}
            className={
              imageIndex === activeImageIndex
                ? "h-1 w-2 rounded-full bg-[#4A6364]"
                : "size-1 rounded-full bg-[#CCE8E9]"
            }
          />
        ))}
      </div>
    </div>
  );
}

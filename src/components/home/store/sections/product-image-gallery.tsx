// TRANSPORT: props-only — renders the images it is handed, no network.
"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import type { ProductMedia } from "@/lib/store/products.schemas";

// Circular image carousel for the product hero. Clones the last slide before
// the first and the first slide after the last, so a swipe past either end
// lands on a clone and then silently jumps to the matching real slide — the
// track reads as an endless loop scrollable from either side at the start.
//
// IT TAKES MEDIA OBJECTS, NOT URL STRINGS, and the two things that buys are both accessibility
// facts the wire already carries. `altText` is the seller's own description of THAT image, so the
// gallery stops labelling eight different photos with one product title; `null` falls back to the
// title, which is what the mock did for every slide. `mediaKind` distinguishes a photo from a
// `spin_360`, which is what makes the 360 affordance expressible at all rather than a banner
// hardcoded beside the gallery.
export default function ProductImageGallery({
  images,
  alt,
}: {
  readonly images: readonly ProductMedia[];
  /** The product title, used for any image whose seller left `altText` null. */
  readonly alt: string;
}) {
  const scrollTrackRef = useRef<HTMLDivElement>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // DOM order: [lastClone, ...images, firstClone]. Real image i sits at i + 1.
  // Built from `filter(Boolean)` rather than indexed directly so the empty case below stays a
  // render decision instead of an out-of-bounds read taken before the hooks have run.
  const slidesWithClones = [images.at(-1), ...images, images.at(0)].filter(
    (image) => image !== undefined,
  );

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

  // Smooth-scroll the track to a real image (real image i sits at DOM index
  // i + 1 because of the leading clone); handleTrackScroll keeps the active
  // index in sync along the way.
  function scrollToImage(imageIndex: number) {
    const scrollTrack = scrollTrackRef.current;
    if (!scrollTrack) return;
    scrollTrack.scrollTo({ left: (imageIndex + 1) * scrollTrack.clientWidth, behavior: "smooth" });
  }

  // A product with no gallery is a listing the seller has not photographed. Rendering the carousel
  // shell around nothing produces a grey square with dots under it. Placed AFTER the hooks — an
  // early return above them changes the hook order between renders.
  if (images.length === 0) return null;

  return (
    <div className="lg:flex lg:gap-3 lg:pl-6">
      {/* Desktop-only clickable thumbnail rail — the dots below are passive,
          so this is the mouse user's way to switch images */}
      <div className="hidden shrink-0 lg:flex lg:flex-col lg:gap-2">
        {images.map((image, imageIndex) => (
          <button
            key={image.id}
            type="button"
            onClick={() => scrollToImage(imageIndex)}
            aria-label={`Image ${imageIndex + 1}`}
            aria-current={imageIndex === activeImageIndex}
            className={`relative size-16 overflow-hidden rounded outline -outline-offset-1 ${
              imageIndex === activeImageIndex ? "outline-[#2A76FD]" : "outline-[#E0E3E3]"
            }`}
          >
            <Image src={image.url} fill sizes="64px" alt="" className="object-cover" />
          </button>
        ))}
      </div>

      <div className="min-w-0 flex-1">
        <div
          ref={scrollTrackRef}
          onScroll={handleTrackScroll}
          className="flex w-full snap-x snap-mandatory scrollbar-none overflow-x-auto bg-[#F5F5F5] [&::-webkit-scrollbar]:hidden"
        >
          {slidesWithClones.map((image, domSlideIndex) => (
            <div key={domSlideIndex} className="relative aspect-square w-full shrink-0 snap-center">
              <Image
                src={image.url}
                fill
                priority={domSlideIndex === 1}
                // ⚠️ NEITHER CLONE MAY BE LAZY, AND THE REASON IS NOT SYMMETRY.
                //
                // The LEADING clone is what the browser actually paints: the track starts at
                // scrollLeft 0 and the effect above only moves it to the first real slide after
                // hydration, so DOM index 0 is the LCP element on every product while `priority`
                // sits on index 1. Lazy there is a genuinely deferred hero fetch.
                //
                // The TRAILING clone is a dev-tooling fact. Next records every rendered image in a
                // module-level `Map` keyed by RESOLVED SRC (`get-img-props.js`, `allImgs.set`),
                // last write wins, and its LCP PerformanceObserver looks the painted element up by
                // that same key. A clone carries the same URL as a real slide, so a lazy trailing
                // clone rendering last overwrites the hero's record and Next warns about an image
                // that is already eager. Measured: index 0 eager alone did NOT silence it.
                //
                // Eager on a clone costs no request — by construction a clone's URL is always also
                // a real slide's URL, and on a one-image product all three are the same file.
                // `loading` rather than a second `priority`: the preload link belongs to the slide
                // the user ends on.
                {...(domSlideIndex === 0 || domSlideIndex === slidesWithClones.length - 1
                  ? { loading: "eager" as const }
                  : {})}
                sizes="(min-width: 1024px) 50vw, 100vw"
                alt={image.altText ?? alt}
                className="object-contain"
              />
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-1 py-2 lg:hidden">
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
    </div>
  );
}

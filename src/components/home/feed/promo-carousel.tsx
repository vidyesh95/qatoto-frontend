// TRANSPORT: props-only — the slides arrive from `promo-carousel-section`, which reads
// `GET /promotions/slides` server-side. This component fetches nothing.
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import type { PromotionalCarouselSlide, PromotionalSlideDestination } from "@/lib/promo/schemas";

const ROTATION_INTERVAL = 2000;

/**
 * Wraps a slide in the right kind of link.
 *
 * TWO ELEMENTS, NOT ONE WITH A CONDITIONAL `target`. An external destination needs
 * `rel="noopener noreferrer"` — without `noopener` the opened page gets a handle on
 * `window.opener` and can navigate this tab somewhere else — and it needs to announce the
 * new tab to a screen reader. An internal one needs `next/link` so navigation stays
 * client-side. Neither is a prop tweak of the other.
 */
function PromotionalSlideLink({
  destination,
  className,
  children,
}: {
  destination: PromotionalSlideDestination;
  className: string;
  children: ReactNode;
}) {
  switch (destination.kind) {
    case "internal_path":
      return (
        <Link href={destination.path} className={className}>
          {children}
        </Link>
      );
    case "external_url":
      return (
        <a href={destination.url} target="_blank" rel="noopener noreferrer" className={className}>
          {children}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      );
    default: {
      const exhaustiveCheck: never = destination;
      return exhaustiveCheck;
    }
  }
}

/**
 * The home-page promotional carousel.
 *
 * THE LINK AND THE CHROME BUTTONS ARE SIBLINGS, NEVER NESTED. The anchor is an
 * `absolute inset-0` layer holding only the image; close, previous, next and the indicator
 * dots sit beside it at a higher z-index. Because a button is not inside the anchor, a click
 * on one cannot bubble into it — there is no `stopPropagation` to forget, and nothing to get
 * wrong when a new control is added later. It also keeps the markup valid: HTML forbids
 * interactive content inside `<a>`, and a nested button is a tree screen readers and
 * keyboard users both stumble over.
 */
export default function PromoCarousel({ slides }: { slides: PromotionalCarouselSlide[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // A single slide has nothing to rotate to, and a timer that reassigns the same index
    // every two seconds is pure wakeups.
    if (slides.length <= 1) {
      return undefined;
    }

    const interval = setInterval(() => {
      setCurrentIndex((previousIndex) => (previousIndex + 1) % slides.length);
    }, ROTATION_INTERVAL);

    return () => clearInterval(interval);
  }, [slides.length]);

  if (!isVisible || slides.length === 0) {
    return null;
  }

  // Modulo rather than a bare index: the slide list can shrink between renders (an admin
  // deletes one) while `currentIndex` still points past the end.
  const currentSlide = slides[currentIndex % slides.length];

  return (
    <div className="relative flex h-65 w-full justify-center bg-gray-200" id="promo-carousel">
      <PromotionalSlideLink
        destination={currentSlide.destination}
        className="absolute inset-0 block"
      >
        <Image
          src={currentSlide.imageUrl}
          fill
          sizes="100vw"
          className="object-contain"
          loading="eager"
          alt={currentSlide.altText}
        />
      </PromotionalSlideLink>

      {/* Close button */}
      <button
        type="button"
        className="absolute top-1.5 right-1.5 z-20 cursor-pointer rounded-lg p-2 transition hover:bg-black/10 lg:top-3 lg:right-3"
        onClick={() => setIsVisible(false)}
        aria-label="Close carousel"
      >
        <Image
          src={"/icons/close_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"}
          width={24}
          height={24}
          alt=""
        />
      </button>

      {/* Previous button */}
      <button
        type="button"
        className="absolute top-1/2 left-1 z-20 -translate-y-1/2 cursor-pointer rounded-full p-2 transition hover:bg-black/20 lg:left-2.5"
        onClick={() =>
          setCurrentIndex((previousIndex) => (previousIndex - 1 + slides.length) % slides.length)
        }
        aria-label="Previous image"
      >
        <Image
          src={"/icons/arrow_back_ios_new_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"}
          width={24}
          height={24}
          alt=""
        />
      </button>

      {/* Next button */}
      <button
        type="button"
        className="absolute top-1/2 right-1 z-20 -translate-y-1/2 cursor-pointer rounded-full p-2 transition hover:bg-black/20 lg:right-2.5"
        onClick={() => setCurrentIndex((previousIndex) => (previousIndex + 1) % slides.length)}
        aria-label="Next image"
      >
        <Image
          src={"/icons/arrow_forward_ios_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"}
          width={24}
          height={24}
          alt=""
        />
      </button>

      {/* Indicator dots */}
      <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2">
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            // Without an explicit type these default to `type="submit"` — inert today, a form
            // submitter the moment this markup lands inside a <form>.
            type="button"
            className={`h-2 w-2 cursor-pointer rounded-full transition ${
              index === currentIndex ? "bg-black" : "bg-gray-400"
            }`}
            onClick={() => setCurrentIndex(index)}
            aria-label={`Go to image ${String(index + 1)}`}
            aria-current={index === currentIndex ? "true" : undefined}
          />
        ))}
      </div>
    </div>
  );
}

// TRANSPORT: props-only — the slides arrive from `anime-hero-carousel-section`, which reads
// `GET /anime/hero-slides` server-side. This component fetches nothing.
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import type { PublicAnimeHeroSlide } from "@/lib/anime/schemas";

/**
 * Five seconds, not the home carousel's two.
 *
 * That one rotates images with no text to read. Every slide here carries a show title in the
 * overlay, and two seconds is not long enough to finish reading one — the whole point of the
 * caption is lost if it leaves before the eye lands on it.
 */
const ROTATION_INTERVAL_MS = 5000;

/**
 * Wraps a slide in a link, or in nothing.
 *
 * A slide with no `destinationPath` is DECORATIVE and renders no anchor at all — not an
 * anchor to "#", not one with no href. An anchor that goes nowhere is still a tab stop and
 * still announces itself as a link, which is a promise the slide cannot keep.
 *
 * There is no external arm. Unlike the promotional carousel, this surface links only into
 * the site, so there is no `target="_blank"` branch and no `rel="noopener"` to forget.
 */
function AnimeHeroSlideLink({
  destinationPath,
  className,
  children,
}: {
  destinationPath: string | null;
  className: string;
  children: ReactNode;
}) {
  if (destinationPath === null) {
    return <div className={className}>{children}</div>;
  }

  return (
    <Link href={destinationPath} className={className}>
      {children}
    </Link>
  );
}

/**
 * The /anime hero carousel.
 *
 * IT REPLACED A CARD WITH A MUTE BUTTON THAT DID NOTHING. The component this supersedes
 * rendered a single `next/image` with a speaker toggle over it — no `<video>`, no iframe,
 * nothing to mute — so `aria-label="Unmute preview"` announced a preview that did not exist.
 * The button is gone rather than wired up: these are stills, and the geometry, the bottom
 * gradient and the two-line clamped title are carried over unchanged.
 *
 * THE LINK AND THE CHROME BUTTONS ARE SIBLINGS, NEVER NESTED. The anchor is an
 * `absolute inset-0` layer holding only the image; previous, next and the indicator dots sit
 * beside it at a higher z-index. Because a button is not inside the anchor, a click on one
 * cannot bubble into it — there is no `stopPropagation` to forget, and nothing to get wrong
 * when a new control is added later. It also keeps the markup valid: HTML forbids
 * interactive content inside `<a>`, and a nested button is a tree screen readers and
 * keyboard users both stumble over.
 *
 * THERE IS NO CLOSE BUTTON, unlike the home carousel. That one is advertising a visitor may
 * dismiss; this is the anime page's own content, and a dismissed hero leaves a hole at the
 * top of the page with no way to bring it back.
 */
export default function AnimeHeroCarousel({ slides }: { slides: PublicAnimeHeroSlide[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shouldAutoRotate, setShouldAutoRotate] = useState(true);

  // A viewer who asked their OS for less motion did not ask for a card that changes itself
  // every five seconds. The arrows and dots still work, so nothing becomes unreachable —
  // rotation just stops happening on its own.
  //
  // Read in an effect rather than during render because `window` does not exist on the
  // server, and the listener matters as much as the initial read: the setting can change
  // while the tab is open.
  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const applyMotionPreference = () => {
      setShouldAutoRotate(!motionQuery.matches);
    };

    applyMotionPreference();
    motionQuery.addEventListener("change", applyMotionPreference);
    return () => {
      motionQuery.removeEventListener("change", applyMotionPreference);
    };
  }, []);

  useEffect(() => {
    // A single slide has nothing to rotate to, and a timer that reassigns the same index
    // every five seconds is pure wakeups.
    if (!shouldAutoRotate || slides.length <= 1) {
      return undefined;
    }

    const interval = setInterval(() => {
      setCurrentIndex((previousIndex) => (previousIndex + 1) % slides.length);
    }, ROTATION_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [shouldAutoRotate, slides.length]);

  if (slides.length === 0) {
    return null;
  }

  // Modulo rather than a bare index: the slide list can shrink between renders (an admin
  // deletes one) while `currentIndex` still points past the end.
  const currentSlide = slides[currentIndex % slides.length];

  return (
    <section className="flex justify-center px-4 pt-1 pb-2 lg:px-6">
      <div className="group/hero relative aspect-video w-full overflow-hidden rounded-xl md:w-82">
        <AnimeHeroSlideLink
          destinationPath={currentSlide.destinationPath}
          className="absolute inset-0 block"
        >
          <Image
            src={currentSlide.imageUrl}
            // The title IS the alt text. The image sits inside a link whose only other
            // content is this caption, so the show's name is exactly what a screen reader
            // needs to announce the destination.
            alt={currentSlide.title}
            fill
            priority
            sizes="(min-width: 768px) 328px, 100vw"
            className="object-cover"
            // A Cloudinary URL is already resized and re-encoded by the backend, and the
            // seeded `/dummy/…` paths are local files Next optimizes for free — but a remote
            // host has to be allowlisted in next.config to be optimized at all, and an
            // un-allowlisted one is a 400, not a fallback.
            unoptimized={currentSlide.imageUrl.startsWith("https://")}
          />

          {/*
            EXTRA BOTTOM PADDING WHEN THERE ARE DOTS. The indicator row is centred on the same
            edge this caption sits on, and with the two-line clamp a long title runs its
            second line straight under the dots — measured at a 4px overlap on the seeded
            "A Record Of Mortal's Journey…" slide. A single slide draws no dots and needs no
            reserve, so the padding is conditional rather than always-on.
          */}
          <div
            className={`absolute inset-x-0 bottom-0 bg-linear-to-t from-black/50 to-transparent p-2 ${
              slides.length > 1 ? "pb-5" : ""
            }`}
          >
            <p className="line-clamp-2 text-xs leading-tight font-normal text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.6)]">
              {currentSlide.title}
            </p>
          </div>
        </AnimeHeroSlideLink>

        {slides.length > 1 && (
          <>
            {/*
              The same treatment `media-rail.tsx` uses two sections down the page: a black
              chevron on a `bg-card` disc, revealed on hover. There is no white arrow asset
              in `public/icons/`, and adding one to put a bare glyph over a photograph would
              be a worse result anyway — a hero still can be light or dark in the corner
              where the control sits, and the disc is what keeps it legible over both.
            */}
            <button
              type="button"
              onClick={() => {
                setCurrentIndex(
                  (previousIndex) => (previousIndex - 1 + slides.length) % slides.length,
                );
              }}
              aria-label="Previous slide"
              className="absolute top-1/2 left-2 z-20 grid size-8 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-card opacity-0 shadow-lg ring-1 ring-black/5 transition group-hover/hero:opacity-100 hover:bg-muted focus-visible:opacity-100"
            >
              <Image
                src="/icons/chevron_backward_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
                width={20}
                height={20}
                alt=""
              />
            </button>

            <button
              type="button"
              onClick={() => {
                setCurrentIndex((previousIndex) => (previousIndex + 1) % slides.length);
              }}
              aria-label="Next slide"
              className="absolute top-1/2 right-2 z-20 grid size-8 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-card opacity-0 shadow-lg ring-1 ring-black/5 transition group-hover/hero:opacity-100 hover:bg-muted focus-visible:opacity-100"
            >
              <Image
                src="/icons/chevron_forward_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
                width={20}
                height={20}
                alt=""
              />
            </button>

            <div className="absolute bottom-1.5 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  // Without an explicit type these default to `type="submit"` — inert today,
                  // a form submitter the moment this markup lands inside a <form>.
                  type="button"
                  className={`h-1.5 w-1.5 cursor-pointer rounded-full transition ${
                    index === currentIndex % slides.length ? "bg-white" : "bg-white/40"
                  }`}
                  onClick={() => {
                    setCurrentIndex(index);
                  }}
                  aria-label={`Go to slide ${String(index + 1)}`}
                  aria-current={index === currentIndex % slides.length ? "true" : undefined}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

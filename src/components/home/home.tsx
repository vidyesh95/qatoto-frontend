"use client";

import Image from "next/image";
import { useState, useEffect } from "react";

const CAROUSEL_IMAGES = [
  {
    src: "/dummy/highlight_image01.avif",
    alt: "Advertise dummy image 1",
  },
  {
    src: "/dummy/spotlight_image02.avif",
    alt: "Advertise dummy image 2",
  },
  {
    src: "/dummy/spotlight_image03.avif",
    alt: "Advertise dummy image 3",
  },
];

const ROTATION_INTERVAL = 2000; // 2 seconds

export default function Home() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % CAROUSEL_IMAGES.length);
    }, ROTATION_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  if (!isVisible) {
    return <main />;
  }

  const currentImage = CAROUSEL_IMAGES[currentIndex];

  return (
    <main>
      <div className="relative w-full h-65 flex justify-center bg-gray-200" id="promo-carousel">
        <Image
          src={currentImage.src}
          fill
          className="object-contain"
          loading="eager"
          alt={currentImage.alt}
        />

        {/* Close button */}
        <button
          className="absolute top-0 right-0 p-2 cursor-pointer hover:bg-black/10 rounded transition"
          onClick={() => setIsVisible(false)}
          aria-label="Close carousel"
        >
          <Image
            src={"/icons/close_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"}
            width={24}
            height={24}
            alt="close promo"
          />
        </button>

        {/* Previous button */}
        <button
          className="absolute left-0 top-1/2 -translate-y-1/2 p-2 cursor-pointer hover:bg-black/20 rounded transition z-10"
          onClick={() =>
            setCurrentIndex(
              (prev) =>
                (prev - 1 + CAROUSEL_IMAGES.length) % CAROUSEL_IMAGES.length
            )
          }
          aria-label="Previous image"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        {/* Next button */}
        <button
          className="absolute right-0 top-1/2 -translate-y-1/2 p-2 cursor-pointer hover:bg-black/20 rounded transition z-10"
          onClick={() =>
            setCurrentIndex((prev) => (prev + 1) % CAROUSEL_IMAGES.length)
          }
          aria-label="Next image"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>

        {/* Indicator dots */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {CAROUSEL_IMAGES.map((_, index) => (
            <button
              key={index}
              className={`w-2 h-2 rounded-full transition ${
                index === currentIndex ? "bg-black" : "bg-gray-400"
              }`}
              onClick={() => setCurrentIndex(index)}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </main>
  );
}

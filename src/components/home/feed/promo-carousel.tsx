"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

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

const ROTATION_INTERVAL = 2000;

export default function PromoCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % CAROUSEL_IMAGES.length);
    }, ROTATION_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  if (!isVisible) {
    return null;
  }

  const currentImage = CAROUSEL_IMAGES[currentIndex];

  return (
    <div className="relative flex h-65 w-full justify-center bg-gray-200" id="promo-carousel">
      <Image
        src={currentImage.src}
        fill
        className="object-contain"
        loading="eager"
        alt={currentImage.alt}
      />

      {/* Close button */}
      <button
        type="button"
        className="absolute top-1.5 right-1.5 cursor-pointer rounded-lg p-2 transition hover:bg-black/10 lg:top-3 lg:right-3"
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
        type="button"
        className="absolute top-1/2 left-1 z-10 -translate-y-1/2 cursor-pointer rounded-full p-2 transition hover:bg-black/20 lg:left-2.5"
        onClick={() =>
          setCurrentIndex((prev) => (prev - 1 + CAROUSEL_IMAGES.length) % CAROUSEL_IMAGES.length)
        }
        aria-label="Previous image"
      >
        <Image
          src={"/icons/arrow_back_ios_new_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"}
          width={24}
          height={24}
          alt="close promo"
        />
      </button>

      {/* Next button */}
      <button
        type="button"
        className="absolute top-1/2 right-1 z-10 -translate-y-1/2 cursor-pointer rounded-full p-2 transition hover:bg-black/20 lg:right-2.5"
        onClick={() => setCurrentIndex((prev) => (prev + 1) % CAROUSEL_IMAGES.length)}
        aria-label="Next image"
      >
        <Image
          src={"/icons/arrow_forward_ios_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"}
          width={24}
          height={24}
          alt="close promo"
        />
      </button>

      {/* Indicator dots */}
      <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
        {CAROUSEL_IMAGES.map((image, index) => (
          <button
            key={image.src}
            className={`h-2 w-2 rounded-full transition ${
              index === currentIndex ? "bg-black" : "bg-gray-400"
            }`}
            onClick={() => setCurrentIndex(index)}
            aria-label={`Go to image ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

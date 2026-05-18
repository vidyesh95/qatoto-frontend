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
        <button
          className="absolute top-0 right-0 p-2 cursor-pointer"
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
      </div>
    </main>
  );
}

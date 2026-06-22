"use client";

import { useState } from "react";
import Image from "next/image";

interface GalleryProps {
  images: string[];
  alt: string;
}

export function Gallery({ images, alt }: GalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex items-center justify-center rounded border border-aluminium bg-neutral-fill" style={{ height: "480px" }}>
        <span className="text-aluminium-dark text-sm">{alt}</span>
      </div>
    );
  }

  const mainSrc = images[activeIndex];

  return (
    <div className="flex flex-col gap-3">
      <div className="relative rounded border border-aluminium bg-neutral-fill overflow-hidden" style={{ height: "480px" }}>
        <Image
          src={mainSrc}
          alt={alt}
          fill
          className="object-contain"
          sizes="(max-width: 1024px) 100vw, 55vw"
        />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <button
              key={src}
              onClick={() => setActiveIndex(i)}
              className={`relative shrink-0 rounded border overflow-hidden ${
                i === activeIndex ? "border-brand" : "border-aluminium"
              }`}
              style={{ width: 72, height: 72 }}
              aria-label={`Imagem ${i + 1}`}
            >
              <Image
                src={src}
                alt={`${alt} thumbnail ${i + 1}`}
                fill
                className="object-cover"
                sizes="72px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

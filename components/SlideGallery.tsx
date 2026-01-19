'use client';

import { useState } from 'react';
import type { UIFilePart } from '@/types';
import Image from 'next/image';

interface SlideGalleryProps {
  slides: UIFilePart[];
}

export function SlideGallery({ slides }: SlideGalleryProps) {
  const [selectedSlide, setSelectedSlide] = useState<UIFilePart | null>(null);

  if (slides.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-warm-brown/40">
        <p className="text-sm">Slides will appear here</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">

      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 gap-4">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className="relative aspect-[7/4] bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-fox-orange transition-all"
              onClick={() => setSelectedSlide(slide)}
            >
              <Image
                src={slide.url}
                alt={`Slide ${index + 1}`}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 400px"
              />
              <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                Slide {index + 1}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Full-screen slide viewer */}
      {selectedSlide && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-8"
          onClick={() => setSelectedSlide(null)}
        >
          <div className="relative w-full h-full max-w-7xl">
            <Image
              src={selectedSlide.url}
              alt="Full slide"
              fill
              className="object-contain"
              sizes="100vw"
            />
            <button
              onClick={() => setSelectedSlide(null)}
              className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { UIFilePart } from '@/types';
import Image from 'next/image';

interface SlideGalleryProps {
  slides: UIFilePart[];
}

export function SlideGallery({ slides }: SlideGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const selectedSlide = selectedIndex !== null ? slides[selectedIndex] : null;

  const goToPrevious = useCallback(() => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  }, [selectedIndex]);

  const goToNext = useCallback(() => {
    if (selectedIndex !== null && selectedIndex < slides.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  }, [selectedIndex, slides.length]);

  const close = useCallback(() => {
    setSelectedIndex(null);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (selectedIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNext();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, goToPrevious, goToNext, close]);

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
              onClick={() => setSelectedIndex(index)}
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
      {selectedSlide && selectedIndex !== null && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={close}
        >
          {/* Previous button */}
          <button
            onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
            disabled={selectedIndex === 0}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-white/20 hover:bg-white/30 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-full transition-colors z-10"
            aria-label="Previous slide"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Slide container */}
          <div 
            className="relative w-full h-full max-w-7xl mx-16 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={selectedSlide.url}
              alt={`Slide ${selectedIndex + 1}`}
              fill
              className="object-contain"
              sizes="100vw"
            />
          </div>

          {/* Next button */}
          <button
            onClick={(e) => { e.stopPropagation(); goToNext(); }}
            disabled={selectedIndex === slides.length - 1}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-white/20 hover:bg-white/30 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-full transition-colors z-10"
            aria-label="Next slide"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Top bar with close and slide counter */}
          <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-4 z-10">
            <div className="bg-black/60 text-white text-sm px-3 py-1.5 rounded-lg">
              {selectedIndex + 1} / {slides.length}
            </div>
            <button
              onClick={close}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

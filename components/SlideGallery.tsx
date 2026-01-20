'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Slide } from '@/types';
import Image from 'next/image';

interface SlideGalleryProps {
  slides: Slide[];
}

export function SlideGallery({ slides }: SlideGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Filter slides with images for full-screen navigation
  const slidesWithImages = slides.filter(s => s.imageUrl);
  
  // selectedIndex refers to slidesWithImages array
  const selectedSlide = selectedIndex !== null ? slidesWithImages[selectedIndex] : null;

  const goToPrevious = useCallback(() => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  }, [selectedIndex]);

  const goToNext = useCallback(() => {
    if (selectedIndex !== null && selectedIndex < slidesWithImages.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  }, [selectedIndex, slidesWithImages.length]);

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
          {slides.map((slide) => {
            // Find the index in slidesWithImages for full-screen navigation
            const imageIndex = slidesWithImages.findIndex(s => s.slot === slide.slot);
            const hasImage = imageIndex !== -1;
            
            return (
              <div
                key={`slide-${slide.slot}`}
                className={`relative aspect-[7/4] rounded-lg overflow-hidden transition-all ${
                  hasImage 
                    ? 'bg-gray-100 cursor-pointer hover:ring-2 hover:ring-fox-orange' 
                    : 'bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-200'
                }`}
                onClick={() => hasImage && setSelectedIndex(imageIndex)}
              >
                {slide.imageUrl ? (
                  <Image
                    src={slide.imageUrl}
                    alt={slide.content.headline || `Slide ${slide.slot}`}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, 400px"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col">
                    {/* Shimmer skeleton effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 animate-pulse" />
                    <div 
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer"
                      style={{ 
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 1.5s infinite'
                      }}
                    />
                    
                    {/* Content overlay */}
                    <div className="relative flex-1 flex flex-col items-center justify-center p-4">
                      {/* Loading spinner */}
                      <div 
                        className="w-10 h-10 rounded-full border-2 mb-3 border-fox-orange border-t-transparent animate-spin"
                      />
                      
                      <div className="text-sm font-medium text-fox-orange animate-pulse">
                        {slide.status === 'generating' ? 'Generating...' : 'Preparing...'}
                      </div>
                      
                      <div className="text-xs text-gray-400 mt-1 line-clamp-1 max-w-[80%] text-center">
                        {slide.content.headline}
                      </div>
                    </div>
                  </div>
                )}
                <div className={`absolute bottom-2 left-2 text-white text-xs px-2 py-1 rounded ${
                  hasImage ? 'bg-black/60' : 'bg-gray-400/80'
                }`}>
                  Slide {slide.slot}
                </div>
                {slide.status === 'generating' && slide.imageUrl && (
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <div className="bg-white/90 px-3 py-1 rounded-full text-sm font-medium text-fox-orange animate-pulse">
                      Generating...
                    </div>
                  </div>
                )}
                {slide.status === 'error' && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                    Error
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Full-screen slide viewer */}
      {selectedSlide && selectedSlide.imageUrl && selectedIndex !== null && (
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
              src={selectedSlide.imageUrl}
              alt={selectedSlide.content.headline || `Slide ${selectedSlide.slot}`}
              fill
              className="object-contain"
              sizes="100vw"
            />
          </div>

          {/* Next button */}
          <button
            onClick={(e) => { e.stopPropagation(); goToNext(); }}
            disabled={selectedIndex === slidesWithImages.length - 1}
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
              Slide {selectedSlide.slot} ({selectedIndex + 1} / {slidesWithImages.length})
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

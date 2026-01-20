import type { UIMessage, UIFilePart, UITextPart } from '@octavus/react';

export type { UIMessage, UIFilePart, UITextPart };

// Slide content structure - matches protocol types
export interface SlideContent {
  headline: string;
  body?: string[];
  slideType: 'title' | 'content' | 'data' | 'quote' | 'section' | 'conclusion';
}

// Individual slide with slot tracking
export interface Slide {
  slot: number;                    // 1-indexed position in deck
  content: SlideContent;           // Structured text content
  imageUrl?: string;               // Generated image URL
  imageToolCallId?: string;        // Links to octavus_generate_image call
  status: 'pending' | 'generating' | 'done' | 'error';
}

// Full presentation state
export interface Presentation {
  sessionId: string;
  title: string;
  style: string;
  slides: Slide[];
  createdAt: number;
  updatedAt: number;
  exists?: boolean; // Added by API to indicate if presentation exists on server
}

// Legacy type for backward compatibility
export interface LocalPresentation {
  sessionId: string;
  title: string;
  createdAt: number;
}

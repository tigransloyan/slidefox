import type { UIMessage, UIFilePart, UITextPart, UIToolCallPart, UIObjectPart } from '@octavus/react';

export type { UIMessage, UIFilePart, UITextPart, UIToolCallPart, UIObjectPart };

// Structured response from agent (matches protocol SlidefoxResponse)
export interface SlideInfo {
  slot: number;
  headline: string;
  slideType?: 'title' | 'content' | 'data' | 'quote' | 'section' | 'conclusion';
}

export interface SlidefoxResponse {
  message: string;
  slides: SlideInfo[];
  style?: string;
}

// Slide content structure - matches protocol types
export interface SlideContent {
  headline: string;
  body?: string[];
  slideType: 'title' | 'content' | 'data' | 'quote' | 'section' | 'conclusion';
}

// Individual slide with slot tracking (used by frontend gallery)
export interface Slide {
  slot: number;
  content: SlideContent;
  imageUrl?: string;
  imageToolCallId?: string;
  status: 'pending' | 'generating' | 'done' | 'error';
}

// For localStorage presentation history
export interface LocalPresentation {
  sessionId: string;
  title: string;
  createdAt: number;
}

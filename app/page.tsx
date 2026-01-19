'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Slidefox } from '@/components/Slidefox';
import { SlideGallery } from '@/components/SlideGallery';
import { ConversationHistory } from '@/components/ConversationHistory';
import { PDFExport } from '@/components/PDFExport';
import { createSlidefoxSession, getSlidefoxSessionMessages } from './actions';
import { getPresentations, savePresentation, deletePresentation } from '@/lib/storage';
import type { UIMessage, UIFilePart, LocalPresentation } from '@/types';

const MIN_GALLERY_WIDTH = 320;
const MAX_GALLERY_WIDTH = 900;
const DEFAULT_GALLERY_WIDTH = 576;

export default function Home() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [presentations, setPresentations] = useState<LocalPresentation[]>([]);
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [currentMessages, setCurrentMessages] = useState<UIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryWidth, setGalleryWidth] = useState(DEFAULT_GALLERY_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const hasAutoOpenedGallery = useRef(false);

  // Load presentations from localStorage on mount
  useEffect(() => {
    setPresentations(getPresentations());
  }, []);

  // Handle gallery resize
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      setGalleryWidth(Math.min(MAX_GALLERY_WIDTH, Math.max(MIN_GALLERY_WIDTH, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Create a new session (called on demand, not on page load)
  const handleNewSession = async (): Promise<string> => {
    const { sessionId: newSessionId } = await createSlidefoxSession();
    const newPresentation: LocalPresentation = {
      sessionId: newSessionId,
      title: 'New Presentation',
      createdAt: Date.now(),
    };
    savePresentation(newPresentation);
    setPresentations(prev => [newPresentation, ...prev]);
    setSessionId(newSessionId);
    setInitialMessages([]);
    setCurrentMessages([]);
    hasAutoOpenedGallery.current = false;
    return newSessionId;
  };

  // Load or restore a session
  const handleSelectSession = async (selectedSessionId: string) => {
    if (selectedSessionId === sessionId) return; // Already on this session
    setIsLoading(true);
    try {
      const messages = await getSlidefoxSessionMessages(selectedSessionId);
      setSessionId(selectedSessionId);
      setInitialMessages(messages);
      setCurrentMessages(messages);
    } catch (error) {
      console.error('Failed to load session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a session
  const handleDeleteSession = (sessionIdToDelete: string) => {
    deletePresentation(sessionIdToDelete);
    setPresentations(prev => prev.filter(p => p.sessionId !== sessionIdToDelete));
    if (sessionIdToDelete === sessionId) {
      setSessionId(null);
      setInitialMessages([]);
      setCurrentMessages([]);
    }
  };

  // Extract slides from current messages for gallery and PDF export
  const slides: UIFilePart[] = useMemo(() => {
    const allMessages = currentMessages.length > 0 ? currentMessages : initialMessages;
    return allMessages
      .flatMap((m) => m.parts)
      .filter(
        (p): p is UIFilePart =>
          p.type === 'file' && p.mediaType?.startsWith('image/') === true,
      );
  }, [currentMessages, initialMessages]);

  // Auto-open gallery when first slide arrives (once per session)
  useEffect(() => {
    if (slides.length > 0 && !hasAutoOpenedGallery.current) {
      hasAutoOpenedGallery.current = true;
      setIsGalleryOpen(true);
    }
  }, [slides.length]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-cream-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fox-orange mx-auto mb-4"></div>
          <p className="text-warm-brown/60">Loading Slidefox...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen flex overflow-hidden bg-cream-white ${isResizing ? 'select-none cursor-ew-resize' : ''}`}>
      {/* Left Sidebar - Conversation History */}
      <ConversationHistory
        currentSessionId={sessionId ?? undefined}
        presentations={presentations}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
      />

      {/* Center - Chat Interface */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-hidden">
          <Slidefox 
            sessionId={sessionId} 
            initialMessages={initialMessages}
            onMessagesChange={setCurrentMessages}
            onCreateSession={handleNewSession}
          />
        </div>
      </div>

      {/* Right Panel - Slide Gallery */}
      {isGalleryOpen ? (
        <div 
          className="border-l border-warm-brown/10 bg-white flex flex-col relative"
          style={{ width: galleryWidth }}
        >
          {/* Resize handle */}
          <div
            onMouseDown={handleMouseDown}
            className={`absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-fox-orange/30 transition-colors z-10 ${
              isResizing ? 'bg-fox-orange/50' : ''
            }`}
          />
          <div className="p-4 border-b border-warm-brown/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsGalleryOpen(false)}
                className="text-warm-brown/60 hover:text-warm-brown transition-colors p-1"
                title="Collapse gallery"
              >
                <svg
                  className="w-5 h-5"
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
              <h2 className="font-semibold text-warm-brown">Gallery</h2>
              {slides.length > 0 && (
                <span className="text-sm text-warm-brown/60">
                  ({slides.length})
                </span>
              )}
            </div>
            <PDFExport slides={slides} />
          </div>
          <div className="flex-1 overflow-hidden">
            <SlideGallery slides={slides} />
          </div>
        </div>
      ) : (
        <div className="w-12 border-l border-warm-brown/10 bg-white flex flex-col items-center py-4">
          <button
            onClick={() => setIsGalleryOpen(true)}
            className="text-warm-brown/60 hover:text-warm-brown transition-colors p-2 relative"
            title="Open gallery"
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
            {slides.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-fox-orange text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                {slides.length}
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

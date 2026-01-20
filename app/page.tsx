'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Slidefox } from '@/components/Slidefox';
import { SlideGallery } from '@/components/SlideGallery';
import { ConversationHistory } from '@/components/ConversationHistory';
import { PDFExport } from '@/components/PDFExport';
import { createSlidefoxSession, getSlidefoxSessionMessages } from './actions';
import { getPresentations, savePresentation, deletePresentation } from '@/lib/storage';
import type { UIMessage, UIFilePart, UIToolCallPart, UIObjectPart, LocalPresentation, Slide, SlidefoxResponse } from '@/types';

const MIN_GALLERY_WIDTH = 320;

// Mobile view states
type MobileView = 'chat' | 'gallery' | 'history';

export default function Home() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [presentations, setPresentations] = useState<LocalPresentation[]>([]);
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [currentMessages, setCurrentMessages] = useState<UIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryWidth, setGalleryWidth] = useState<number | null>(null); // null = 50% (CSS flex)
  const [isResizing, setIsResizing] = useState(false);
  const hasAutoOpenedGallery = useRef(false);
  
  // Mobile-specific state
  const [mobileView, setMobileView] = useState<MobileView>('chat');
  const [isMobile, setIsMobile] = useState(false);
  
  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
      setGalleryWidth(Math.max(MIN_GALLERY_WIDTH, newWidth));
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

  // Helper to parse slot from image generation prompt
  const getSlotFromPrompt = (prompt?: string): number => {
    if (!prompt) return 0;
    const match = prompt.match(/^#\s*SLOT[:\s]+(\d+)/im);
    return match ? parseInt(match[1], 10) : 0;
  };

  // Build slides array using structured response + toolCallId-based image linking
  const slides: Slide[] = useMemo(() => {
    const allMessages = currentMessages.length > 0 ? currentMessages : initialMessages;
    
    // 1. Collect all image generation tool calls with their slots and statuses
    const imageToolCalls = allMessages.flatMap(m => m.parts)
      .filter((p): p is UIToolCallPart => 
        p.type === 'tool-call' && p.toolName === 'octavus_generate_image'
      );
    
    // Build toolCallId -> slot map and track tool call status per slot
    const toolCallToSlot = new Map<string, number>();
    const slotToolCallStatus = new Map<number, UIToolCallPart['status']>();
    
    imageToolCalls.forEach(tc => {
      const slot = getSlotFromPrompt(tc.args?.prompt as string);
      if (slot > 0) {
        toolCallToSlot.set(tc.toolCallId, slot);
        slotToolCallStatus.set(slot, tc.status);
      } else {
        console.warn('Image generation missing slot in prompt:', tc.toolCallId);
      }
    });

    // 2. Build slot -> image map using toolCallId (handles out-of-order completion)
    const imageBySlot = new Map<number, UIFilePart>();
    allMessages.flatMap(m => m.parts)
      .filter((p): p is UIFilePart => 
        p.type === 'file' && p.mediaType?.startsWith('image/') === true
      )
      .forEach(file => {
        if (file.toolCallId) {
          const slot = toolCallToSlot.get(file.toolCallId);
          if (slot) {
            imageBySlot.set(slot, file);
          }
        }
      });

    // 3. Get slide metadata from most recent structured response
    const structuredResponses = allMessages
      .flatMap(m => m.parts)
      .filter((p): p is UIObjectPart => 
        p.type === 'object' && p.typeName === 'SlidefoxResponse'
      );
    
    const latestResponse = structuredResponses[structuredResponses.length - 1];
    const responseData = (latestResponse?.object ?? latestResponse?.partial) as SlidefoxResponse | undefined;

    // Helper to determine slide status from tool call status and image presence
    const getSlideStatus = (slot: number, hasImage: boolean): Slide['status'] => {
      if (hasImage) return 'done';
      const tcStatus = slotToolCallStatus.get(slot);
      if (tcStatus === 'running') return 'generating';
      if (tcStatus === 'error') return 'error';
      return 'pending';
    };

    // 4. Build final slides array from structured response
    if (responseData?.slides && responseData.slides.length > 0) {
      return responseData.slides
        .sort((a, b) => a.slot - b.slot)
        .map(info => {
          const image = imageBySlot.get(info.slot);
          return {
            slot: info.slot,
            content: { 
              headline: info.headline, 
              slideType: info.slideType || 'content' 
            },
            imageUrl: image?.url,
            imageToolCallId: image?.toolCallId,
            status: getSlideStatus(info.slot, !!image),
          };
        });
    }

    // 5. Fallback: no structured response yet, build from tool calls (pending/running) and images
    const allSlots = new Set([...Array.from(slotToolCallStatus.keys()), ...Array.from(imageBySlot.keys())]);
    if (allSlots.size > 0) {
      return Array.from(allSlots)
        .sort((a, b) => a - b)
        .map(slot => {
          const file = imageBySlot.get(slot);
          return {
            slot,
            content: { headline: `Slide ${slot}`, slideType: 'content' as const },
            imageUrl: file?.url,
            imageToolCallId: file?.toolCallId,
            status: getSlideStatus(slot, !!file),
          };
        });
    }

    return [];
  }, [currentMessages, initialMessages]);

  // Auto-open gallery when first slide arrives (once per session)
  useEffect(() => {
    if (slides.length > 0 && !hasAutoOpenedGallery.current) {
      hasAutoOpenedGallery.current = true;
      if (isMobile) {
        // On mobile, switch to gallery view
        setMobileView('gallery');
      } else {
        setIsGalleryOpen(true);
      }
    }
  }, [slides.length, isMobile]);

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

  // Mobile layout
  if (isMobile) {
    return (
      <div className="h-[100dvh] flex flex-col overflow-hidden bg-cream-white">
        {/* Mobile Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-warm-brown/10 bg-white">
          <div className="flex items-center gap-2">
            <Image src="/fox-logo.png" alt="Slidefox" width={24} height={24} className="w-6 h-6" />
            <h1 className="font-bold text-warm-brown text-lg">Slidefox</h1>
          </div>
          {mobileView === 'gallery' && slides.length > 0 && (
            <PDFExport slides={slides} />
          )}
        </div>

        {/* Mobile Content Area */}
        <div className="flex-1 overflow-hidden relative">
          {/* Chat View */}
          <div className={`absolute inset-0 transition-transform duration-300 ${
            mobileView === 'chat' ? 'translate-x-0' : '-translate-x-full'
          } pb-[calc(64px+env(safe-area-inset-bottom))]`}>
            <Slidefox 
              sessionId={sessionId} 
              initialMessages={initialMessages}
              onMessagesChange={setCurrentMessages}
              onCreateSession={handleNewSession}
            />
          </div>

          {/* Gallery View */}
          <div className={`absolute inset-0 bg-white transition-transform duration-300 ${
            mobileView === 'gallery' ? 'translate-x-0' : 'translate-x-full'
          } pb-[calc(64px+env(safe-area-inset-bottom))]`}>
            {slides.length > 0 ? (
              <SlideGallery slides={slides} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-warm-brown/40 px-6">
                <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-center text-sm">Your slides will appear here once generated</p>
              </div>
            )}
          </div>

          {/* History View */}
          <div className={`absolute inset-0 bg-cream-white transition-transform duration-300 ${
            mobileView === 'history' ? 'translate-x-0' : 'translate-x-full'
          } pb-[calc(64px+env(safe-area-inset-bottom))]`}>
            <ConversationHistory
              currentSessionId={sessionId ?? undefined}
              presentations={presentations}
              onSelectSession={(id) => {
                handleSelectSession(id);
                setMobileView('chat');
              }}
              onNewSession={() => {
                handleNewSession();
                setMobileView('chat');
              }}
              onDeleteSession={handleDeleteSession}
              isMobile={true}
            />
          </div>
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 flex border-t border-warm-brown/10 bg-white safe-area-bottom z-20">
          <button
            onClick={() => setMobileView('chat')}
            className={`flex-1 flex flex-col items-center py-3 gap-1 transition-colors ${
              mobileView === 'chat' ? 'text-fox-orange' : 'text-warm-brown/50'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-xs font-medium">Chat</span>
          </button>
          <button
            onClick={() => setMobileView('gallery')}
            className={`flex-1 flex flex-col items-center py-3 gap-1 transition-colors relative ${
              mobileView === 'gallery' ? 'text-fox-orange' : 'text-warm-brown/50'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs font-medium">Gallery</span>
            {slides.length > 0 && (
              <span className="absolute top-2 right-1/4 bg-fox-orange text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {slides.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setMobileView('history')}
            className={`flex-1 flex flex-col items-center py-3 gap-1 transition-colors relative ${
              mobileView === 'history' ? 'text-fox-orange' : 'text-warm-brown/50'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="text-xs font-medium">History</span>
            {presentations.length > 0 && (
              <span className="absolute top-2 right-1/4 bg-warm-brown/30 text-warm-brown text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {presentations.length}
              </span>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Desktop layout (unchanged)
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
          className={`border-l border-warm-brown/10 bg-white flex flex-col relative ${galleryWidth === null ? 'flex-1' : ''}`}
          style={galleryWidth !== null ? { width: galleryWidth } : undefined}
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

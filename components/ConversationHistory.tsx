'use client';

import { useState, useEffect } from 'react';
import { getPresentations, deletePresentation } from '@/lib/storage';
import type { LocalPresentation } from '@/types';
import Image from 'next/image';

interface ConversationHistoryProps {
  currentSessionId?: string;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
}

export function ConversationHistory({
  currentSessionId,
  onSelectSession,
  onNewSession,
}: ConversationHistoryProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [presentations, setPresentations] = useState<LocalPresentation[]>([]);

  useEffect(() => {
    setPresentations(getPresentations());
  }, []);

  const handleDelete = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    deletePresentation(sessionId);
    setPresentations(getPresentations());
    if (sessionId === currentSessionId) {
      onNewSession();
    }
  };

  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        className="h-full w-12 bg-warm-brown/5 border-r border-warm-brown/10 flex items-center justify-center hover:bg-warm-brown/10 transition-colors"
        title="Expand history"
      >
        <svg
          className="w-6 h-6 text-warm-brown"
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
    );
  }

  return (
    <div className="w-64 bg-cream-white border-r border-warm-brown/10 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-warm-brown/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image
            src="/fox-logo.png"
            alt="Slidefox"
            width={24}
            height={24}
            className="object-contain"
          />
          <h1 className="font-bold text-warm-brown text-lg">Slidefox</h1>
        </div>
        <button
          onClick={() => setIsCollapsed(true)}
          className="text-warm-brown/60 hover:text-warm-brown transition-colors"
          title="Collapse"
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
      </div>

      {/* New Presentation Button */}
      <div className="p-4 border-b border-warm-brown/10">
        <button
          onClick={onNewSession}
          className="w-full px-4 py-2 bg-fox-orange text-white rounded-lg hover:bg-fox-orange-light transition-colors font-medium text-sm"
        >
          + New Presentation
        </button>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto">
        {presentations.length === 0 ? (
          <div className="p-4 text-warm-brown/40 text-sm text-center">
            No previous presentations
          </div>
        ) : (
          <div className="p-2">
            {presentations
              .sort((a, b) => b.createdAt - a.createdAt)
              .map((presentation) => (
                <div
                  key={presentation.sessionId}
                  onClick={() => onSelectSession(presentation.sessionId)}
                  className={`p-3 rounded-lg mb-2 cursor-pointer transition-colors group ${
                    presentation.sessionId === currentSessionId
                      ? 'bg-fox-orange/10 border border-fox-orange/20'
                      : 'hover:bg-warm-brown/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-warm-brown truncate">
                        {presentation.title || 'Untitled'}
                      </p>
                      <p className="text-xs text-warm-brown/50 mt-1">
                        {new Date(presentation.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, presentation.sessionId)}
                      className="opacity-0 group-hover:opacity-100 text-warm-brown/40 hover:text-red-500 transition-opacity"
                      title="Delete"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

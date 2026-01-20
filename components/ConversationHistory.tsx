'use client';

import { useState } from 'react';
import type { LocalPresentation } from '@/types';
import Image from 'next/image';

interface ConversationHistoryProps {
  currentSessionId?: string;
  presentations: LocalPresentation[];
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  isMobile?: boolean;
}

export function ConversationHistory({
  currentSessionId,
  presentations,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  isMobile = false,
}: ConversationHistoryProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleDelete = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    onDeleteSession(sessionId);
  };

  // Desktop collapsed state
  if (!isMobile && isCollapsed) {
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

  // Mobile layout - full screen
  if (isMobile) {
    return (
      <div className="flex flex-col h-full">
        {/* New Presentation Button - prominent on mobile */}
        <div className="p-4">
          <button
            onClick={onNewSession}
            className="w-full px-4 py-3 bg-fox-orange text-white rounded-xl hover:bg-fox-orange-light transition-colors font-medium shadow-md shadow-fox-orange/25"
          >
            + New Presentation
          </button>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto px-4">
          {presentations.length === 0 ? (
            <div className="py-12 text-warm-brown/40 text-sm text-center">
              <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p>No previous presentations</p>
              <p className="mt-1 text-xs">Create your first presentation above</p>
            </div>
          ) : (
            <div className="space-y-2 pb-4">
              {presentations
                .sort((a, b) => b.createdAt - a.createdAt)
                .map((presentation) => (
                  <div
                    key={presentation.sessionId}
                    onClick={() => onSelectSession(presentation.sessionId)}
                    className={`p-4 rounded-xl cursor-pointer transition-all active:scale-[0.98] ${
                      presentation.sessionId === currentSessionId
                        ? 'bg-fox-orange/15 border-2 border-fox-orange/40 shadow-sm'
                        : 'bg-white border border-warm-brown/10 hover:border-warm-brown/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium truncate ${
                          presentation.sessionId === currentSessionId
                            ? 'text-fox-orange'
                            : 'text-warm-brown'
                        }`}>
                          {presentation.title || 'Untitled'}
                        </p>
                        <p className="text-xs text-warm-brown/50 mt-1">
                          {new Date(presentation.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDelete(e, presentation.sessionId)}
                        className="text-warm-brown/30 hover:text-red-500 active:text-red-600 p-1 -m-1 transition-colors"
                        title="Delete"
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

        {/* Footer */}
        <div className="p-4 border-t border-warm-brown/10">
          <a
            href="https://github.com/tigransloyan/slidefox"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-warm-brown/50 hover:text-warm-brown transition-colors text-sm"
          >
            <svg
              className="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.341-3.369-1.341-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"
              />
            </svg>
            <span>Open Source on GitHub</span>
          </a>
        </div>
      </div>
    );
  }

  // Desktop layout
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
                  className={`p-3 rounded-lg mb-2 cursor-pointer transition-all group ${
                    presentation.sessionId === currentSessionId
                      ? 'bg-fox-orange/20 border-l-4 border-l-fox-orange border-y border-r border-fox-orange/30 shadow-sm'
                      : 'hover:bg-warm-brown/5 border-l-4 border-l-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${
                        presentation.sessionId === currentSessionId
                          ? 'text-fox-orange'
                          : 'text-warm-brown'
                      }`}>
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

      {/* Footer - matches height of chat input area (83px) */}
      <div className="p-4 border-t border-warm-brown/10 flex items-center">
        <a
          href="https://github.com/tigransloyan/slidefox"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 h-[50px] text-warm-brown/50 hover:text-warm-brown transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.341-3.369-1.341-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"
            />
          </svg>
          <span>Open Source on GitHub</span>
        </a>
      </div>
    </div>
  );
}

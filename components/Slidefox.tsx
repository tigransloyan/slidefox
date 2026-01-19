'use client';

import { useState, useMemo, useEffect } from 'react';
import { useOctavusChat, createHttpTransport, type UIMessage, type UIToolCallPart } from '@octavus/react';
import ReactMarkdown from 'react-markdown';
import Image from 'next/image';

interface SlidefoxProps {
  sessionId: string | null;
  initialMessages?: UIMessage[];
  onMessagesChange?: (messages: UIMessage[]) => void;
  onCreateSession?: () => Promise<string>;
}

export function Slidefox({ sessionId, initialMessages, onMessagesChange, onCreateSession }: SlidefoxProps) {
  const [inputValue, setInputValue] = useState('');
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  // Create transport with abort signal support for stop functionality
  // Transport is only valid when sessionId exists
  const transport = useMemo(
    () =>
      createHttpTransport({
        triggerRequest: (triggerName, input, options) =>
          fetch('/api/trigger', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, triggerName, input }),
            signal: options?.signal,
          }),
      }),
    [sessionId],
  );

  const { messages, status, error, send, stop } = useOctavusChat({
    transport,
    initialMessages,
  });

  // When we have a sessionId and a pending message, send it
  useEffect(() => {
    if (sessionId && pendingMessage) {
      const message = pendingMessage;
      setPendingMessage(null);
      send(
        'user-message',
        { USER_MESSAGE: message },
        { userMessage: { content: message } },
      );
    }
  }, [sessionId, pendingMessage, send]);

  // Notify parent of message changes
  useEffect(() => {
    if (onMessagesChange) {
      onMessagesChange(messages);
    }
  }, [messages, onMessagesChange]);

  const isStreaming = status === 'streaming';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isStreaming || isCreatingSession) return;

    const message = inputValue.trim();
    setInputValue('');

    if (!sessionId && onCreateSession) {
      // No session yet - store message and create session
      setPendingMessage(message);
      setIsCreatingSession(true);
      try {
        await onCreateSession();
      } catch (error) {
        console.error('Failed to create session:', error);
        setPendingMessage(null);
        setInputValue(message); // Restore the message so user can retry
      } finally {
        setIsCreatingSession(false);
      }
    } else {
      // Session exists - send directly
      await send(
        'user-message',
        { USER_MESSAGE: message },
        { userMessage: { content: message } },
      );
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-warm-brown/60">
            <div className="mb-8">
              <Image
                src="/fox-logo.png"
                alt="Slidefox"
                width={120}
                height={120}
                className="object-contain"
              />
            </div>
            <p className="text-lg font-medium">Describe your presentation to get started</p>
            <p className="text-sm mt-2">
              Example: &quot;Create a 5-slide deck about climate change&quot;
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            Error: {error.message || 'An error occurred'}
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-warm-brown/20">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Describe your presentation..."
            className="flex-1 px-4 py-2 border border-warm-brown/20 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-fox-orange focus:border-transparent"
            disabled={isStreaming || isCreatingSession}
          />
          {isStreaming ? (
            <button
              type="button"
              onClick={stop}
              className="px-6 py-2 bg-fox-orange text-white rounded-lg hover:bg-fox-orange-light transition-colors font-medium"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!inputValue.trim() || isCreatingSession}
              className="px-6 py-2 bg-fox-orange text-white rounded-lg hover:bg-fox-orange-light transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreatingSession ? 'Starting...' : 'Send'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === 'user';

  // Group consecutive tool calls together for inline rendering
  const renderParts: Array<{ type: 'text'; text: string; key: number } | { type: 'tool-group'; toolCalls: UIToolCallPart[]; key: number }> = [];
  let currentToolGroup: UIToolCallPart[] = [];

  message.parts.forEach((part) => {
    if (part.type === 'text') {
      // Flush any pending tool group before adding text
      if (currentToolGroup.length > 0) {
        renderParts.push({ type: 'tool-group', toolCalls: [...currentToolGroup], key: renderParts.length });
        currentToolGroup = [];
      }
      renderParts.push({ type: 'text', text: part.text, key: renderParts.length });
    } else if (part.type === 'tool-call' && part.toolName === 'octavus_generate_image') {
      currentToolGroup.push(part);
    }
  });

  // Flush remaining tool group at the end
  if (currentToolGroup.length > 0) {
    renderParts.push({ type: 'tool-group', toolCalls: currentToolGroup, key: renderParts.length });
  }

  // Collect all image generation tool calls for progress tracking
  const allToolCalls = message.parts.filter(
    (p): p is UIToolCallPart => p.type === 'tool-call' && p.toolName === 'octavus_generate_image',
  );

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`p-4 rounded-lg max-w-2xl ${
          isUser
            ? 'bg-fox-orange text-white'
            : 'bg-white border border-warm-brown/10 text-warm-brown'
        }`}
      >
        {renderParts.map((part) => {
          if (part.type === 'text') {
            return (
              <div key={part.key} className={`prose max-w-none ${isUser ? 'prose-invert' : ''}`}>
                <ReactMarkdown>{part.text}</ReactMarkdown>
              </div>
            );
          } else if (part.type === 'tool-group') {
            return (
              <SlideProgressGroup
                key={part.key}
                toolCalls={part.toolCalls}
                allToolCalls={allToolCalls}
              />
            );
          }
          return null;
        })}

        {message.status === 'streaming' && allToolCalls.length === 0 && (
          <StreamingIndicator hasText={renderParts.some((p) => p.type === 'text' && p.text.trim())} />
        )}
      </div>
    </div>
  );
}

function SlideProgressGroup({
  toolCalls,
  allToolCalls,
}: {
  toolCalls: UIToolCallPart[];
  allToolCalls: UIToolCallPart[];
}) {
  const completedSlides = allToolCalls.filter((p) => p.status === 'done').length;
  const totalSlides = allToolCalls.length;
  const hasActiveImageGeneration = allToolCalls.some(
    (p) => p.status === 'pending' || p.status === 'running',
  );

  // Calculate the starting index for this group's slides
  const firstToolCallId = toolCalls[0]?.toolCallId;
  const startIndex = allToolCalls.findIndex((t) => t.toolCallId === firstToolCallId);

  return (
    <div className="my-3 py-3 border-y border-warm-brown/10">
      <div className="flex items-center gap-2 text-sm">
        {hasActiveImageGeneration ? (
          <>
            <span className="h-2 w-2 animate-pulse rounded-full bg-fox-orange" />
            <span className="text-warm-brown/70">
              Generating slides... {completedSlides}/{totalSlides}
            </span>
          </>
        ) : (
          <>
            <span className="text-green-600">✓</span>
            <span className="text-warm-brown/70">
              {totalSlides} slide{totalSlides !== 1 ? 's' : ''} generated
            </span>
          </>
        )}
      </div>

      {/* Individual slide progress */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {toolCalls.map((toolCall, i) => (
          <SlideProgressBadge
            key={toolCall.toolCallId}
            index={startIndex + i + 1}
            toolCall={toolCall}
          />
        ))}
      </div>
    </div>
  );
}

function SlideProgressBadge({ index, toolCall }: { index: number; toolCall: UIToolCallPart }) {
  const statusStyles = {
    pending: 'bg-gray-100 text-gray-400',
    running: 'bg-fox-orange/10 text-fox-orange animate-pulse',
    done: 'bg-green-50 text-green-600',
    error: 'bg-red-50 text-red-600',
    cancelled: 'bg-amber-50 text-amber-600',
  };

  const statusIcons = {
    pending: '○',
    running: '◐',
    done: '✓',
    error: '✗',
    cancelled: '◼',
  };

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[toolCall.status]}`}
      title={`Slide ${index}: ${toolCall.status}`}
    >
      <span className={toolCall.status === 'running' ? 'animate-spin' : ''}>
        {statusIcons[toolCall.status]}
      </span>
      <span>Slide {index}</span>
    </div>
  );
}

function StreamingIndicator({ hasText }: { hasText: boolean }) {
  if (hasText) {
    // Show blinking cursor when text is already streaming
    return (
      <span className="inline-block w-0.5 h-4 bg-warm-brown/60 animate-pulse ml-0.5 align-middle" />
    );
  }

  // Show typing dots when waiting for initial response
  return (
    <div className="flex items-center gap-1 py-1">
      <span
        className="w-2 h-2 rounded-full bg-fox-orange/60 animate-bounce"
        style={{ animationDelay: '0ms', animationDuration: '600ms' }}
      />
      <span
        className="w-2 h-2 rounded-full bg-fox-orange/60 animate-bounce"
        style={{ animationDelay: '150ms', animationDuration: '600ms' }}
      />
      <span
        className="w-2 h-2 rounded-full bg-fox-orange/60 animate-bounce"
        style={{ animationDelay: '300ms', animationDuration: '600ms' }}
      />
    </div>
  );
}

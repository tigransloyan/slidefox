'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useOctavusChat, createHttpTransport, type UIMessage, type UIToolCallPart, type UIObjectPart } from '@octavus/react';
import ReactMarkdown from 'react-markdown';
import Image from 'next/image';
import type { SlidefoxResponse } from '@/types';

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
  
  // Refs for auto-scroll and auto-focus
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const userHasScrolledRef = useRef(false);
  const wasStreamingRef = useRef(false);

  // Create transport with abort signal support for stop functionality
  // Transport is only valid when sessionId exists
  const transport = useMemo(
    () =>
      createHttpTransport({
        request: (payload, options) =>
          fetch('/api/trigger', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, ...payload }),
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

  // Detect if user is near bottom of scroll container
  const isNearBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return true;
    const threshold = 100; // pixels from bottom
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
  }, []);

  // Handle user scroll - detect when user manually scrolls up
  const handleScroll = useCallback(() => {
    if (!isStreaming) {
      userHasScrolledRef.current = false;
      return;
    }
    // If user scrolls away from bottom during streaming, respect their choice
    userHasScrolledRef.current = !isNearBottom();
  }, [isStreaming, isNearBottom]);

  // Auto-scroll during streaming (respecting user scroll)
  useEffect(() => {
    if (!isStreaming) {
      // Reset scroll tracking when not streaming
      userHasScrolledRef.current = false;
      return;
    }

    const container = messagesContainerRef.current;
    if (!container || userHasScrolledRef.current) return;

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
  }, [messages, isStreaming]);

  // Auto-focus input when streaming completes
  useEffect(() => {
    if (wasStreamingRef.current && !isStreaming) {
      // Streaming just completed - focus the input
      inputRef.current?.focus();
    }
    wasStreamingRef.current = isStreaming;
  }, [isStreaming]);

  // Calculate textarea height - only use scrollHeight when there's content
  // On mobile devices, empty textarea scrollHeight can be unreliable
  const calculateTextareaHeight = useCallback(() => {
    const target = inputRef.current;
    if (!target) return;
    
    // If empty, reset to minimum height (don't rely on scrollHeight)
    if (!target.value.trim()) {
      target.style.height = '';
      target.style.overflowY = 'hidden';
      return;
    }
    
    // For non-empty content, calculate based on scrollHeight
    target.style.height = 'auto';
    const maxHeight = window.innerWidth < 768 ? 120 : 200;
    target.style.height = `${Math.min(target.scrollHeight, maxHeight)}px`;
    target.style.overflowY = target.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, []);

  // Reset textarea height when input is cleared
  useEffect(() => {
    if (!inputValue) {
      calculateTextareaHeight();
    }
  }, [inputValue, calculateTextareaHeight]);

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter without Shift, allow new line on Shift+Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-6 space-y-4"
      >
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
            <p className="text-lg font-medium text-center">Describe your presentation to get started</p>
            <p className="text-sm mt-2 text-center px-4">
              Example: &quot;Create a 5-slide deck about climate change&quot;
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {error && (
          <RateLimitOrError error={error} />
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 md:p-4 border-t border-warm-brown/10 bg-white/50">
        <div className="flex gap-2 md:gap-3 items-end">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your presentation..."
            rows={1}
            className="flex-1 px-3 py-2.5 md:px-4 md:py-3 border border-warm-brown/15 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-fox-orange/50 focus:border-fox-orange/30 transition-shadow resize-none min-h-[44px] md:min-h-[50px] max-h-[120px] md:max-h-[200px] overflow-y-hidden text-base"
            disabled={isStreaming || isCreatingSession}
            onInput={calculateTextareaHeight}
          />
          {isStreaming ? (
            <button
              type="button"
              onClick={stop}
              className="px-4 py-2.5 md:px-6 md:py-3 bg-fox-orange text-white rounded-xl hover:bg-fox-orange-light active:bg-fox-orange-light transition-all font-medium shadow-md shadow-fox-orange/25 hover:shadow-lg hover:shadow-fox-orange/30 text-sm md:text-base"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!inputValue.trim() || isCreatingSession}
              className="px-4 py-2.5 md:px-6 md:py-3 bg-fox-orange text-white rounded-xl hover:bg-fox-orange-light active:bg-fox-orange-light transition-all font-medium shadow-md shadow-fox-orange/25 hover:shadow-lg hover:shadow-fox-orange/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none text-sm md:text-base"
            >
              {isCreatingSession ? 'Starting...' : 'Send'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

// Tool call display names for our slide management tools
const TOOL_DISPLAY_NAMES: Record<string, string> = {
  'get-presentation': 'Checking slides',
  'add-slide': 'Adding slide',
  'update-slide': 'Updating slide',
  'delete-slide': 'Deleting slide',
  'reorder-slide': 'Swapping slides',
  'octavus_generate_image': 'Generating image',
};

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === 'user';

  // Separate parts into different render types
  type RenderPart = 
    | { type: 'text'; text: string; key: number }
    | { type: 'image-group'; toolCalls: UIToolCallPart[]; key: number }
    | { type: 'agent-action'; toolCall: UIToolCallPart; key: number }
    | { type: 'structured-response'; part: UIObjectPart; key: number };

  const renderParts: RenderPart[] = [];
  let currentImageGroup: UIToolCallPart[] = [];

  const flushImageGroup = () => {
    if (currentImageGroup.length > 0) {
      renderParts.push({ type: 'image-group', toolCalls: [...currentImageGroup], key: renderParts.length });
      currentImageGroup = [];
    }
  };

  message.parts.forEach((part) => {
    if (part.type === 'text') {
      flushImageGroup();
      renderParts.push({ type: 'text', text: part.text, key: renderParts.length });
    } else if (part.type === 'object' && part.typeName === 'SlidefoxResponse') {
      flushImageGroup();
      renderParts.push({ type: 'structured-response', part, key: renderParts.length });
    } else if (part.type === 'tool-call') {
      if (part.toolName === 'octavus_generate_image') {
        // Group image generation calls together
        currentImageGroup.push(part);
      } else {
        flushImageGroup();
        // Add agent action (slide management tools)
        renderParts.push({ type: 'agent-action', toolCall: part, key: renderParts.length });
      }
    }
  });

  // Flush remaining image group at the end
  flushImageGroup();

  // Collect all image generation tool calls for progress tracking
  const allImageToolCalls = message.parts.filter(
    (p): p is UIToolCallPart => p.type === 'tool-call' && p.toolName === 'octavus_generate_image',
  );

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`p-4 rounded-2xl max-w-2xl ${
          isUser
            ? 'bg-fox-orange text-white shadow-md shadow-fox-orange/25'
            : 'bg-white border border-warm-brown/10 text-warm-brown shadow-sm'
        }`}
      >
        {renderParts.map((part) => {
          if (part.type === 'text') {
            // Render user messages as plain text, agent messages as markdown
            if (isUser) {
              return (
                <div key={part.key} className="whitespace-pre-wrap">
                  {part.text}
                </div>
              );
            }
            return (
              <div key={part.key} className="prose max-w-none">
                <ReactMarkdown>{part.text}</ReactMarkdown>
              </div>
            );
          } else if (part.type === 'structured-response') {
            return (
              <SlidefoxResponseRenderer
                key={part.key}
                part={part.part}
              />
            );
          } else if (part.type === 'image-group') {
            return (
              <SlideProgressGroup
                key={part.key}
                toolCalls={part.toolCalls}
                allToolCalls={allImageToolCalls}
              />
            );
          } else if (part.type === 'agent-action') {
            return (
              <AgentActionBadge
                key={part.key}
                toolCall={part.toolCall}
              />
            );
          }
          return null;
        })}

        {message.status === 'streaming' && allImageToolCalls.length === 0 && !renderParts.some(p => p.type === 'structured-response') && (
          <StreamingIndicator hasText={renderParts.some((p) => p.type === 'text' && p.text.trim())} />
        )}
      </div>
    </div>
  );
}

/**
 * Renders the structured SlidefoxResponse from the agent
 */
function SlidefoxResponseRenderer({ part }: { part: UIObjectPart }) {
  const data = (part.object ?? part.partial) as SlidefoxResponse | undefined;
  const isStreaming = part.status === 'streaming';

  if (!data?.message) {
    return <div className="animate-pulse h-6 bg-warm-brown/10 rounded w-3/4" />;
  }

  return (
    <div className="prose max-w-none">
      <ReactMarkdown>{data.message}</ReactMarkdown>
      {isStreaming && <span className="inline-block w-0.5 h-4 bg-warm-brown/60 animate-pulse ml-0.5 align-middle" />}
    </div>
  );
}

/**
 * Shows agent actions (tool calls other than image generation)
 */
function AgentActionBadge({ toolCall }: { toolCall: UIToolCallPart }) {
  const displayName = toolCall.displayName || TOOL_DISPLAY_NAMES[toolCall.toolName] || toolCall.toolName;
  
  // Extract useful info from args for display
  const getActionDetail = (): string | null => {
    const args = toolCall.args || {};
    if (args.slot !== undefined) {
      return `slot ${args.slot}`;
    }
    if (args.fromSlot !== undefined && args.toSlot !== undefined) {
      return `${args.fromSlot} → ${args.toSlot}`;
    }
    return null;
  };

  const detail = getActionDetail();
  
  const statusStyles = {
    pending: 'bg-white/80 text-warm-brown/50 border-warm-brown/20',
    running: 'bg-blue-50 text-blue-600 border-blue-200 shadow-sm',
    done: 'bg-green-50 text-green-600 border-green-200',
    error: 'bg-red-50 text-red-600 border-red-200',
    cancelled: 'bg-amber-50 text-amber-600 border-amber-200',
  };

  const statusIcons = {
    pending: '○',
    running: '◐',
    done: '✓',
    error: '✗',
    cancelled: '◼',
  };

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 my-1 mr-1.5 rounded-lg border text-xs transition-all ${statusStyles[toolCall.status]}`}>
      <span className={toolCall.status === 'running' ? 'animate-spin' : ''}>
        {statusIcons[toolCall.status]}
      </span>
      <span className="font-medium">{displayName}</span>
      {detail && <span className="opacity-60">({detail})</span>}
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
  const failedSlides = allToolCalls.filter((p) => p.status === 'error').length;
  const cancelledSlides = allToolCalls.filter((p) => p.status === 'cancelled').length;
  const problemSlides = failedSlides + cancelledSlides;
  const totalSlides = allToolCalls.length;
  const hasActiveImageGeneration = allToolCalls.some(
    (p) => p.status === 'pending' || p.status === 'running',
  );

  // Calculate the starting index for this group's slides
  const firstToolCallId = toolCalls[0]?.toolCallId;
  const startIndex = allToolCalls.findIndex((t) => t.toolCallId === firstToolCallId);

  // Determine the overall status message
  const renderStatusMessage = () => {
    if (hasActiveImageGeneration) {
      return (
        <>
          <span className="h-2 w-2 animate-pulse rounded-full bg-fox-orange" />
          <span className="text-warm-brown/70">
            Generating slides... {completedSlides}/{totalSlides}
          </span>
        </>
      );
    }

    if (problemSlides > 0 && completedSlides === 0) {
      // All slides failed or were cancelled
      const message = cancelledSlides === problemSlides 
        ? `Cancelled ${problemSlides} slide${problemSlides !== 1 ? 's' : ''}`
        : `Failed to generate ${failedSlides} slide${failedSlides !== 1 ? 's' : ''}${cancelledSlides > 0 ? `, ${cancelledSlides} cancelled` : ''}`;
      return (
        <>
          <span className={cancelledSlides === problemSlides ? 'text-amber-600' : 'text-red-600'}>
            {cancelledSlides === problemSlides ? '◼' : '✗'}
          </span>
          <span className={cancelledSlides === problemSlides ? 'text-amber-600' : 'text-red-600'}>
            {message}
          </span>
        </>
      );
    }

    if (problemSlides > 0) {
      // Some slides failed/cancelled, some succeeded
      const problemParts = [];
      if (failedSlides > 0) problemParts.push(`${failedSlides} failed`);
      if (cancelledSlides > 0) problemParts.push(`${cancelledSlides} cancelled`);
      return (
        <>
          <span className="text-amber-600">⚠</span>
          <span className="text-warm-brown/70">
            {completedSlides} slide{completedSlides !== 1 ? 's' : ''} generated, {problemParts.join(', ')}
          </span>
        </>
      );
    }

    // All slides succeeded
    return (
      <>
        <span className="text-green-600">✓</span>
        <span className="text-warm-brown/70">
          {totalSlides} slide{totalSlides !== 1 ? 's' : ''} generated
        </span>
      </>
    );
  };

  return (
    <div className="my-3 p-4 bg-gradient-to-br from-cream-white to-fox-orange/5 rounded-xl border border-warm-brown/10 shadow-sm">
      <div className="flex items-center gap-2.5 text-sm font-medium">
        {renderStatusMessage()}
      </div>

      {/* Individual slide progress */}
      <div className="mt-3 flex flex-wrap gap-2">
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

/**
 * Try to extract slot number from tool call args.
 * The agent should include slot info, but we fallback to the provided index.
 */
function getSlotFromToolCall(toolCall: UIToolCallPart, fallbackIndex: number): number {
  // Try to parse slot from the prompt (agent may include "# SLOT: N" in the prompt)
  const prompt = toolCall.args?.prompt as string | undefined;
  if (prompt) {
    const slotMatch = prompt.match(/^#\s*SLOT[:\s]+(\d+)/im);
    if (slotMatch) {
      return parseInt(slotMatch[1], 10);
    }
  }
  // Fallback to position-based index
  return fallbackIndex;
}

function SlideProgressBadge({ index, toolCall }: { index: number; toolCall: UIToolCallPart }) {
  // Try to get slot from tool call, fallback to position-based index
  const slotNumber = getSlotFromToolCall(toolCall, index);
  
  const statusStyles = {
    pending: 'bg-white/80 text-warm-brown/50 border-warm-brown/20',
    running: 'bg-fox-orange/15 text-fox-orange border-fox-orange/30 shadow-sm',
    done: 'bg-green-50 text-green-600 border-green-200',
    error: 'bg-red-50 text-red-600 border-red-200',
    cancelled: 'bg-amber-50 text-amber-600 border-amber-200',
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
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${statusStyles[toolCall.status]}`}
      title={`Slide ${slotNumber}: ${toolCall.status}`}
    >
      <span className={toolCall.status === 'running' ? 'animate-spin' : ''}>
        {statusIcons[toolCall.status]}
      </span>
      <span>Slide {slotNumber}</span>
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

function RateLimitOrError({ error }: { error: Error }) {
  const isRateLimit = error.message?.toLowerCase().includes('high demand') || 
                      error.message?.toLowerCase().includes('rate') ||
                      error.message?.toLowerCase().includes('limit') ||
                      error.message?.toLowerCase().includes('429');

  if (isRateLimit) {
    return (
      <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm">
            {error.message || "We're experiencing high demand right now. Please try again in a few minutes."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
      Something went wrong. Please try again.
    </div>
  );
}

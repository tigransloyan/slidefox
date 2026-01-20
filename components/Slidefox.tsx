'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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
  
  // Refs for auto-scroll and auto-focus
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const userHasScrolledRef = useRef(false);
  const wasStreamingRef = useRef(false);

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
            ref={inputRef}
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

  // Separate tool calls into image generation and agent actions
  type RenderPart = 
    | { type: 'text'; text: string; key: number }
    | { type: 'image-group'; toolCalls: UIToolCallPart[]; key: number }
    | { type: 'agent-action'; toolCall: UIToolCallPart; key: number };

  const renderParts: RenderPart[] = [];
  let currentImageGroup: UIToolCallPart[] = [];

  message.parts.forEach((part) => {
    if (part.type === 'text') {
      // Flush any pending image group before adding text
      if (currentImageGroup.length > 0) {
        renderParts.push({ type: 'image-group', toolCalls: [...currentImageGroup], key: renderParts.length });
        currentImageGroup = [];
      }
      renderParts.push({ type: 'text', text: part.text, key: renderParts.length });
    } else if (part.type === 'tool-call') {
      if (part.toolName === 'octavus_generate_image') {
        // Group image generation calls together
        currentImageGroup.push(part);
      } else {
        // Flush image group first
        if (currentImageGroup.length > 0) {
          renderParts.push({ type: 'image-group', toolCalls: [...currentImageGroup], key: renderParts.length });
          currentImageGroup = [];
        }
        // Add agent action (slide management tools)
        renderParts.push({ type: 'agent-action', toolCall: part, key: renderParts.length });
      }
    }
  });

  // Flush remaining image group at the end
  if (currentImageGroup.length > 0) {
    renderParts.push({ type: 'image-group', toolCalls: currentImageGroup, key: renderParts.length });
  }

  // Collect all image generation tool calls for progress tracking
  const allImageToolCalls = message.parts.filter(
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

        {message.status === 'streaming' && allImageToolCalls.length === 0 && (
          <StreamingIndicator hasText={renderParts.some((p) => p.type === 'text' && p.text.trim())} />
        )}
      </div>
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
    pending: 'bg-gray-50 text-gray-500 border-gray-200',
    running: 'bg-blue-50 text-blue-600 border-blue-200',
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
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 my-1 mr-1 rounded border text-xs ${statusStyles[toolCall.status]}`}>
      <span className={toolCall.status === 'running' ? 'animate-spin' : ''}>
        {statusIcons[toolCall.status]}
      </span>
      <span className="font-medium">{displayName}</span>
      {detail && <span className="opacity-70">({detail})</span>}
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
    <div className="my-3 py-3 border-y border-warm-brown/10">
      <div className="flex items-center gap-2 text-sm">
        {renderStatusMessage()}
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

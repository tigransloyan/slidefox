'use client';

import { useState, useMemo, useEffect } from 'react';
import { useOctavusChat, createHttpTransport, type UIMessage } from '@octavus/react';
import ReactMarkdown from 'react-markdown';
import Image from 'next/image';

interface SlidefoxProps {
  sessionId: string;
  initialMessages?: UIMessage[];
  onMessagesChange?: (messages: UIMessage[]) => void;
}

export function Slidefox({ sessionId, initialMessages, onMessagesChange }: SlidefoxProps) {
  const [inputValue, setInputValue] = useState('');

  // Create transport with abort signal support for stop functionality
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

  // Notify parent of message changes
  useEffect(() => {
    if (onMessagesChange) {
      onMessagesChange(messages);
    }
  }, [messages, onMessagesChange]);

  const isStreaming = status === 'streaming';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isStreaming) return;

    const message = inputValue.trim();
    setInputValue('');

    await send(
      'user-message',
      { USER_MESSAGE: message },
      { userMessage: { content: message } },
    );
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
            disabled={isStreaming}
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
              disabled={!inputValue.trim()}
              className="px-6 py-2 bg-fox-orange text-white rounded-lg hover:bg-fox-orange-light transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`p-4 rounded-lg max-w-2xl ${
          isUser
            ? 'bg-fox-orange text-white'
            : 'bg-white border border-warm-brown/10 text-warm-brown'
        }`}
      >
        {message.parts.map((part, i) => {
          if (part.type === 'text') {
            return (
              <div key={i} className="prose prose-sm max-w-none">
                <ReactMarkdown>{part.text}</ReactMarkdown>
              </div>
            );
          }
          return null;
        })}

        {message.status === 'streaming' && (
          <span className="inline-block w-2 h-4 bg-current opacity-50 animate-pulse ml-1" />
        )}
      </div>
    </div>
  );
}

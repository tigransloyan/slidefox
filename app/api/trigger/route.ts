import { NextRequest } from 'next/server';
import { toSSEStream } from '@octavus/server-sdk';
import { getOctavus } from '@/lib/octavus';
import { ratelimit } from '@/lib/ratelimit';

export async function POST(request: NextRequest) {
  // Rate limiting by IP (fail-open if Redis is unavailable)
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'anonymous';
    const { success, limit, reset } = await ratelimit.limit(ip);

    if (!success) {
      const retryAfterSeconds = Math.ceil((reset - Date.now()) / 1000);
      
      return new Response(
        "We're experiencing high demand right now. Please try again later.",
        {
          status: 429,
          headers: {
            'Content-Type': 'text/plain',
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': reset.toString(),
            'Retry-After': retryAfterSeconds.toString(),
          },
        }
      );
    }
  } catch (e) {
    // Redis unavailable - allow request through
    console.error('Rate limit check failed:', e);
  }

  const { sessionId, triggerName, input } = await request.json();

  // Attach to session (no custom tools needed - structured output handles slide tracking)
  const session = getOctavus().agentSessions.attach(sessionId);

  // Trigger the action with abort signal support
  const events = session.trigger(triggerName, input, {
    signal: request.signal,
  });

  // Convert to SSE stream
  return new Response(toSSEStream(events), {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

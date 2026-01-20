import { NextRequest } from 'next/server';
import { toSSEStream } from '@octavus/server-sdk';
import { getOctavus } from '@/lib/octavus';

export async function POST(request: NextRequest) {
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

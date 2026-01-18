import { NextRequest } from 'next/server';
import { toSSEStream } from '@octavus/server-sdk';
import { octavus } from '@/lib/octavus';

export async function POST(request: NextRequest) {
  const { sessionId, triggerName, input } = await request.json();

  // Attach to session (no tools needed for slidefox agent)
  const session = octavus.agentSessions.attach(sessionId);

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

'use server';

import { getOctavus, AGENT_ID } from '@/lib/octavus';
import type { UIMessage } from '@/types';

export async function createSlidefoxSession(theme?: string) {
  const sessionId = await getOctavus().agentSessions.create(AGENT_ID, {
    THEME: theme || 'modern',
  });
  return { sessionId };
}

export async function getSlidefoxSessionMessages(sessionId: string): Promise<UIMessage[]> {
  const session = await getOctavus().agentSessions.getMessages(sessionId);
  if (session.status === 'expired') {
    return [];
  }
  return session.messages;
}

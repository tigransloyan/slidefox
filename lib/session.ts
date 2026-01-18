// Client-safe session utilities (localStorage only)
import { savePresentation, getPresentation } from './storage';
import type { LocalPresentation } from '@/types';

export function saveSessionToStorage(sessionId: string, title: string): void {
  savePresentation({
    sessionId,
    title,
    createdAt: Date.now(),
  });
}

export function getSessionFromStorage(sessionId: string): LocalPresentation | null {
  return getPresentation(sessionId);
}

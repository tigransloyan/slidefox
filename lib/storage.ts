import type { LocalPresentation } from '@/types';

const STORAGE_KEY = 'slidefox_presentations';

export function savePresentation(presentation: LocalPresentation): void {
  const presentations = getPresentations();
  const existingIndex = presentations.findIndex(
    (p) => p.sessionId === presentation.sessionId,
  );

  if (existingIndex >= 0) {
    presentations[existingIndex] = presentation;
  } else {
    presentations.push(presentation);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(presentations));
}

export function getPresentations(): LocalPresentation[] {
  if (typeof window === 'undefined') return [];
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];

  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function getPresentation(sessionId: string): LocalPresentation | null {
  const presentations = getPresentations();
  return presentations.find((p) => p.sessionId === sessionId) || null;
}

export function deletePresentation(sessionId: string): void {
  const presentations = getPresentations();
  const filtered = presentations.filter((p) => p.sessionId !== sessionId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

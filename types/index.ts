import type { UIMessage, UIFilePart, UITextPart } from '@octavus/react';

export type { UIMessage, UIFilePart, UITextPart };

export interface LocalPresentation {
  sessionId: string;
  title: string;
  createdAt: number;
}

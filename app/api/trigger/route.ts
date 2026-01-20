import { NextRequest } from 'next/server';
import { toSSEStream } from '@octavus/server-sdk';
import { octavus } from '@/lib/octavus';
import { presentationStore } from '@/lib/presentationStore';
import type { SlideContent } from '@/types';

function validateSlot(slot: unknown): { valid: true; slot: number } | { valid: false; error: string } {
  if (typeof slot !== 'number' || !Number.isInteger(slot) || slot < 1) {
    return { valid: false, error: `Invalid slot: must be a positive integer, got ${slot}` };
  }
  return { valid: true, slot };
}

function validateContent(content: unknown): { valid: true; content: SlideContent } | { valid: false; error: string } {
  if (!content || typeof content !== 'object') {
    return { valid: false, error: 'Content must be an object' };
  }
  const c = content as Record<string, unknown>;
  if (typeof c.headline !== 'string' || !c.headline.trim()) {
    return { valid: false, error: 'Content must have a non-empty headline' };
  }
  return { valid: true, content: content as SlideContent };
}

export async function POST(request: NextRequest) {
  const { sessionId, triggerName, input } = await request.json();

  // Attach to session with tool handlers for slide management
  const session = octavus.agentSessions.attach(sessionId, {
    tools: {
      'get-presentation': async () => {
        const presentation = presentationStore.getPresentation(sessionId);
        if (!presentation) {
          return {
            sessionId,
            slides: [],
            nextSlot: 1,
            message: 'No presentation exists yet. Use add-slide to create slides.',
          };
        }
        return {
          ...presentation,
          nextSlot: presentationStore.getNextSlot(sessionId),
        };
      },

      'add-slide': async (args) => {
        const slotResult = validateSlot(args.slot);
        if (!slotResult.valid) {
          return { success: false, error: slotResult.error };
        }
        const contentResult = validateContent(args.content);
        if (!contentResult.valid) {
          return { success: false, error: contentResult.error };
        }
        
        const presentation = presentationStore.addSlide(sessionId, slotResult.slot, contentResult.content);
        return {
          success: true,
          message: `Added slide at slot ${slotResult.slot}`,
          slide: presentation.slides.find(s => s.slot === slotResult.slot),
          totalSlides: presentation.slides.length,
        };
      },

      'update-slide': async (args) => {
        const slotResult = validateSlot(args.slot);
        if (!slotResult.valid) {
          return { success: false, error: slotResult.error };
        }
        const contentResult = validateContent(args.content);
        if (!contentResult.valid) {
          return { success: false, error: contentResult.error };
        }
        
        const presentation = presentationStore.updateSlide(sessionId, slotResult.slot, contentResult.content);
        const slide = presentation.slides.find(s => s.slot === slotResult.slot);
        if (!slide) {
          return {
            success: false,
            error: `Slide at slot ${slotResult.slot} not found`,
          };
        }
        return {
          success: true,
          message: `Updated slide at slot ${slotResult.slot}`,
          slide,
        };
      },

      'delete-slide': async (args) => {
        const slotResult = validateSlot(args.slot);
        if (!slotResult.valid) {
          return { success: false, error: slotResult.error };
        }
        
        const presentation = presentationStore.deleteSlide(sessionId, slotResult.slot);
        return {
          success: true,
          message: `Deleted slide ${slotResult.slot}`,
          remainingSlots: presentation.slides.map(s => s.slot),
          totalSlides: presentation.slides.length,
        };
      },

      'reorder-slide': async (args) => {
        const fromResult = validateSlot(args.fromSlot);
        if (!fromResult.valid) {
          return { success: false, error: `fromSlot: ${fromResult.error}` };
        }
        const toResult = validateSlot(args.toSlot);
        if (!toResult.valid) {
          return { success: false, error: `toSlot: ${toResult.error}` };
        }
        
        const presentation = presentationStore.reorderSlide(sessionId, fromResult.slot, toResult.slot);
        return {
          success: true,
          message: `Swapped slots ${fromResult.slot} and ${toResult.slot}`,
          slides: presentation.slides.map(s => ({ slot: s.slot, headline: s.content.headline })),
        };
      },
    },
  });

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

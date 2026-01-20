import type { Presentation, Slide, SlideContent } from '@/types';

// In-memory store keyed by sessionId
// Can be migrated to Redis/database later
const presentations = new Map<string, Presentation>();

export const presentationStore = {
  /**
   * Get presentation state for a session
   */
  getPresentation(sessionId: string): Presentation | null {
    return presentations.get(sessionId) ?? null;
  },

  /**
   * Get or create presentation for a session
   */
  getOrCreatePresentation(sessionId: string, style: string = 'auto'): Presentation {
    let presentation = presentations.get(sessionId);
    if (!presentation) {
      presentation = {
        sessionId,
        title: 'New Presentation',
        style,
        slides: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      presentations.set(sessionId, presentation);
    }
    return presentation;
  },

  /**
   * Add a new slide at the specified slot.
   * Slots are permanent IDs - no renumbering occurs.
   * If a slide already exists at this slot, it will be replaced.
   */
  addSlide(sessionId: string, slot: number, content: SlideContent): Presentation {
    const presentation = this.getOrCreatePresentation(sessionId);
    
    // Check if slot already exists
    const existingIndex = presentation.slides.findIndex(s => s.slot === slot);
    
    if (existingIndex !== -1) {
      // Replace existing slide at this slot
      presentation.slides[existingIndex] = {
        slot,
        content,
        status: 'pending',
      };
    } else {
      // Add new slide and keep sorted by slot
      presentation.slides.push({
        slot,
        content,
        status: 'pending',
      });
      presentation.slides.sort((a, b) => a.slot - b.slot);
    }

    presentation.updatedAt = Date.now();
    return presentation;
  },

  /**
   * Update an existing slide's content
   */
  updateSlide(sessionId: string, slot: number, content: SlideContent): Presentation {
    const presentation = this.getOrCreatePresentation(sessionId);
    const slide = presentation.slides.find(s => s.slot === slot);
    
    if (slide) {
      slide.content = content;
      slide.status = 'pending'; // Reset status since content changed
      slide.imageUrl = undefined; // Clear old image
      presentation.updatedAt = Date.now();
    }
    
    return presentation;
  },

  /**
   * Delete a slide by slot number.
   * Slots are permanent IDs - remaining slides keep their original slot numbers.
   * This may create gaps in slot sequence (e.g., 1, 3, 4 after deleting slot 2).
   */
  deleteSlide(sessionId: string, slot: number): Presentation {
    const presentation = this.getOrCreatePresentation(sessionId);
    const index = presentation.slides.findIndex(s => s.slot === slot);
    
    if (index !== -1) {
      presentation.slides.splice(index, 1);
      presentation.updatedAt = Date.now();
    }
    
    return presentation;
  },

  /**
   * Swap two slides by their slot numbers.
   * This swaps the slot assignments so images follow their content.
   */
  reorderSlide(sessionId: string, fromSlot: number, toSlot: number): Presentation {
    const presentation = this.getOrCreatePresentation(sessionId);
    const fromSlide = presentation.slides.find(s => s.slot === fromSlot);
    const toSlide = presentation.slides.find(s => s.slot === toSlot);
    
    if (fromSlide && toSlide) {
      // Swap slot numbers
      fromSlide.slot = toSlot;
      toSlide.slot = fromSlot;
      // Re-sort by slot
      presentation.slides.sort((a, b) => a.slot - b.slot);
      presentation.updatedAt = Date.now();
    } else if (fromSlide && !toSlide) {
      // Move to an empty slot
      fromSlide.slot = toSlot;
      presentation.slides.sort((a, b) => a.slot - b.slot);
      presentation.updatedAt = Date.now();
    }
    
    return presentation;
  },

  /**
   * Mark a slide as currently generating
   */
  setSlideStatus(
    sessionId: string,
    slot: number,
    status: Slide['status']
  ): Presentation {
    const presentation = this.getOrCreatePresentation(sessionId);
    const slide = presentation.slides.find(s => s.slot === slot);
    
    if (slide) {
      slide.status = status;
      presentation.updatedAt = Date.now();
    }
    
    return presentation;
  },

  /**
   * Link a generated image to a slot
   */
  setSlideImage(
    sessionId: string,
    slot: number,
    imageUrl: string,
    toolCallId?: string
  ): Presentation {
    const presentation = this.getOrCreatePresentation(sessionId);
    const slide = presentation.slides.find(s => s.slot === slot);
    
    if (slide) {
      slide.imageUrl = imageUrl;
      slide.imageToolCallId = toolCallId;
      slide.status = 'done';
      presentation.updatedAt = Date.now();
    }
    
    return presentation;
  },

  /**
   * Update presentation metadata
   */
  updatePresentation(
    sessionId: string,
    updates: Partial<Pick<Presentation, 'title' | 'style'>>
  ): Presentation {
    const presentation = this.getOrCreatePresentation(sessionId);
    
    if (updates.title) presentation.title = updates.title;
    if (updates.style) presentation.style = updates.style;
    presentation.updatedAt = Date.now();
    
    return presentation;
  },

  /**
   * Get the next available slot number
   */
  getNextSlot(sessionId: string): number {
    const presentation = presentations.get(sessionId);
    if (!presentation || presentation.slides.length === 0) {
      return 1;
    }
    return Math.max(...presentation.slides.map(s => s.slot)) + 1;
  },

  /**
   * Clear presentation (for cleanup/testing)
   */
  clearPresentation(sessionId: string): void {
    presentations.delete(sessionId);
  },
};

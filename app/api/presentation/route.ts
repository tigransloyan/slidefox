import { NextRequest, NextResponse } from 'next/server';
import { presentationStore } from '@/lib/presentationStore';

/**
 * GET /api/presentation?sessionId=xxx
 * Returns the current presentation state for a session
 */
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json(
      { error: 'sessionId is required' },
      { status: 400 }
    );
  }

  const presentation = presentationStore.getPresentation(sessionId);

  if (!presentation) {
    return NextResponse.json(
      { 
        sessionId,
        slides: [],
        exists: false,
      },
      { status: 200 }
    );
  }

  return NextResponse.json({
    ...presentation,
    exists: true,
  });
}

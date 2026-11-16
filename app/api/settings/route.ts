import { NextRequest, NextResponse } from 'next/server';
import { updateEventSettings, verifyModeratorCode } from '@/lib/server-store';
import { EventSettings } from '@/lib/types';

export async function POST(req: NextRequest) {
  const pairCode = req.headers.get('x-pair-code');
  if (!verifyModeratorCode(pairCode)) {
    return NextResponse.json(
      { ok: false, errorCode: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as Partial<EventSettings>;
  const state = updateEventSettings(body);
  return NextResponse.json({ ok: true, state });
}

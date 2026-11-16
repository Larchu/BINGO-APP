import { NextRequest, NextResponse } from 'next/server';
import { commitDraw, verifyModeratorCode } from '@/lib/server-store';

export async function POST(req: NextRequest) {
  const pairCode = req.headers.get('x-pair-code');
  if (!verifyModeratorCode(pairCode)) {
    return NextResponse.json(
      { ok: false, errorCode: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    number?: number;
    source?: 'manual' | 'speech_confirmed' | 'speech_direct';
    transcript?: string;
    captureId?: string;
    roundId?: string;
    deviceId?: string;
    mutationId?: string;
  };

  const num = Number(body.number);
  const res = commitDraw({
    number: num,
    source: body.source || 'manual',
    transcript: body.transcript,
    captureId: body.captureId,
    roundId: body.roundId,
    deviceId: body.deviceId,
    mutationId: body.mutationId,
  });

  if (!res.ok) {
    return NextResponse.json(res, { status: 400 });
  }

  return NextResponse.json(res);
}

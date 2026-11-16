import { NextRequest, NextResponse } from 'next/server';
import { commitUndo, verifyModeratorCode } from '@/lib/server-store';

export async function POST(req: NextRequest) {
  const pairCode = req.headers.get('x-pair-code');
  if (!verifyModeratorCode(pairCode)) {
    return NextResponse.json(
      { ok: false, errorCode: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    reason?: string;
    deviceId?: string;
  };

  const res = commitUndo({
    reason: body.reason,
    deviceId: body.deviceId,
  });

  if (!res.ok) {
    return NextResponse.json(res, { status: 400 });
  }

  return NextResponse.json(res);
}

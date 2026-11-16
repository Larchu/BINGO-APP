import { NextRequest, NextResponse } from 'next/server';
import { commitNewRound, verifyModeratorCode } from '@/lib/server-store';

export async function POST(req: NextRequest) {
  const pairCode = req.headers.get('x-pair-code');
  if (!verifyModeratorCode(pairCode)) {
    return NextResponse.json(
      { ok: false, errorCode: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    confirmed?: boolean;
    deviceId?: string;
  };

  const res = commitNewRound({
    confirmed: Boolean(body.confirmed),
    deviceId: body.deviceId,
  });

  if (!res.ok) {
    return NextResponse.json(res, { status: 400 });
  }

  return NextResponse.json(res);
}

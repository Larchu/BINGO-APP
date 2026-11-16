import { NextRequest, NextResponse } from 'next/server';
import { exportHistoryCsv, exportHistoryJson } from '@/lib/bingo-logic';
import {
  clearArchivedHistory,
  getFullState,
  verifyModeratorCode,
} from '@/lib/server-store';

export async function GET(req: NextRequest) {
  const pairCode =
    req.headers.get('x-pair-code') || req.nextUrl.searchParams.get('pairCode');
  if (!verifyModeratorCode(pairCode)) {
    return NextResponse.json(
      { ok: false, errorCode: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  const format = req.nextUrl.searchParams.get('format') || 'json';
  const state = getFullState();

  if (format === 'csv') {
    const csv = exportHistoryCsv(state);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="world-family-bingo-history.csv"',
      },
    });
  }

  const json = exportHistoryJson(state);
  return new NextResponse(json, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="world-family-bingo-history.json"',
    },
  });
}

export async function POST(req: NextRequest) {
  const pairCode = req.headers.get('x-pair-code');
  if (!verifyModeratorCode(pairCode)) {
    return NextResponse.json(
      { ok: false, errorCode: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    confirmed?: boolean;
  };

  if (body.action === 'clear') {
    const res = clearArchivedHistory(Boolean(body.confirmed));
    if (!res.ok) {
      return NextResponse.json(res, { status: 400 });
    }
    return NextResponse.json(res);
  }

  return NextResponse.json({ ok: false, errorCode: 'BAD_REQUEST' }, { status: 400 });
}

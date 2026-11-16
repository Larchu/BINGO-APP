import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import {
  getFullState,
  getPublicDisplayState,
  regeneratePairCode,
  verifyModeratorCode,
} from '@/lib/server-store';

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get('mode');
  const pairCode = req.headers.get('x-pair-code') || req.nextUrl.searchParams.get('pairCode');

  if (mode === 'public') {
    return NextResponse.json({
      ok: true,
      role: 'display',
      state: getPublicDisplayState(),
    });
  }

  if (mode === 'hub') {
    const state = getFullState();
    const origin =
      process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL'
        ? process.env.APP_URL.replace(/\/$/, '')
        : `${req.nextUrl.protocol}//${req.nextUrl.host}`;
    const pairUrl = `${origin}/moderator?pair=${state.pairCode}`;
    const qrDataUrl = await QRCode.toDataURL(pairUrl, {
      margin: 1,
      width: 240,
      color: {
        dark: '#171C26',
        light: '#FFFFFF',
      },
    });

    return NextResponse.json({
      ok: true,
      publicState: getPublicDisplayState(state),
      pairCode: state.pairCode,
      pairUrl,
      qrDataUrl,
    });
  }

  if (!verifyModeratorCode(pairCode)) {
    return NextResponse.json(
      {
        ok: false,
        errorCode: 'UNAUTHORIZED',
        publicState: getPublicDisplayState(),
      },
      { status: 401 }
    );
  }

  const state = getFullState();
  const origin =
    process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL'
      ? process.env.APP_URL.replace(/\/$/, '')
      : `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  const pairUrl = `${origin}/moderator?pair=${state.pairCode}`;
  const qrDataUrl = await QRCode.toDataURL(pairUrl, {
    margin: 1,
    width: 240,
    color: {
      dark: '#171C26',
      light: '#FFFFFF',
    },
  });

  return NextResponse.json({
    ok: true,
    role: 'moderator',
    state,
    pairUrl,
    qrDataUrl,
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    pairCode?: string;
  };
  const headerCode = req.headers.get('x-pair-code') || body.pairCode;

  if (body.action === 'verify') {
    if (!verifyModeratorCode(headerCode)) {
      return NextResponse.json(
        { ok: false, errorCode: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }
    return NextResponse.json({ ok: true, state: getFullState() });
  }

  if (body.action === 'regenerate') {
    if (!verifyModeratorCode(headerCode)) {
      return NextResponse.json(
        { ok: false, errorCode: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }
    const nextState = regeneratePairCode();
    return NextResponse.json({ ok: true, state: nextState });
  }

  return NextResponse.json({ ok: false, errorCode: 'BAD_REQUEST' }, { status: 400 });
}

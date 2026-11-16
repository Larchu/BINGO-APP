import { NextRequest, NextResponse } from 'next/server';
import { parseSpokenBingoNumbers, validateCaptureResultForState } from '@/lib/bingo-logic';
import { transcribeBingoAudio } from '@/lib/gemini-speech';
import {
  cancelCaptureWindow,
  getFullState,
  startCaptureWindow,
  startLiveSpeech,
  stopCaptureWindow,
  stopLiveSpeech,
  submitSpeechProposal,
  verifyModeratorCode,
} from '@/lib/server-store';

export async function POST(req: NextRequest) {
  const pairCode = req.headers.get('x-pair-code');
  if (!verifyModeratorCode(pairCode)) {
    return NextResponse.json(
      { ok: false, errorCode: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    action?: 'start' | 'stop' | 'cancel' | 'transcribe' | 'live_start' | 'live_stop';
    deviceId?: string;
    captureId?: string;
    roundId?: string;
    base64Audio?: string;
    mimeType?: string;
  };

  if (body.action === 'live_start') {
    const res = await startLiveSpeech({
      requestedByDeviceId: body.deviceId || 'moderator',
    });
    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          errorCode: res.errorCode,
          errorMessage: res.errorMessage,
          state: res.state,
        },
        {
          status:
            res.errorCode === 'SPEECH_NOT_CONFIGURED'
              ? 503
              : res.errorCode === 'LAPTOP_BRIDGE_NOT_ARMED'
                ? 409
                : 502,
        }
      );
    }
    return NextResponse.json({ ok: true, state: res.state });
  }

  if (body.action === 'live_stop') {
    const state = stopLiveSpeech(true);
    return NextResponse.json({ ok: true, state });
  }

  if (body.action === 'start') {
    const res = startCaptureWindow({
      requestedByDeviceId: body.deviceId || 'moderator',
    });
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, errorCode: res.error },
        { status: 409 }
      );
    }
    return NextResponse.json({ ok: true, capture: res.capture, state: getFullState() });
  }

  if (body.action === 'stop' && body.captureId) {
    stopCaptureWindow(body.captureId);
    return NextResponse.json({ ok: true, state: getFullState() });
  }

  if (body.action === 'cancel') {
    cancelCaptureWindow(body.captureId);
    return NextResponse.json({ ok: true, state: getFullState() });
  }

  if (body.action === 'transcribe') {
    const captureId = body.captureId || '';
    const roundId = body.roundId || '';
    const state = getFullState();

    // Discard late results from cancelled capture or previous round before calling upstream API
    const preCheck = validateCaptureResultForState(state, captureId, roundId);
    if (!preCheck.valid) {
      return NextResponse.json({
        ok: false,
        staleIgnored: true,
        reason: preCheck.reason,
        state,
      });
    }

    if (!body.base64Audio) {
      return NextResponse.json(
        { ok: false, errorCode: 'NO_AUDIO' },
        { status: 400 }
      );
    }

    const transcription = await transcribeBingoAudio({
      base64Audio: body.base64Audio,
      mimeType: body.mimeType || 'audio/webm',
      languageHint: state.settings.speechLanguage,
    });

    if (!transcription.ok) {
      cancelCaptureWindow(captureId);
      return NextResponse.json(
        {
          ok: false,
          errorCode: transcription.errorCode,
          errorMessage: transcription.errorMessage,
          state: getFullState(),
        },
        { status: transcription.errorCode === 'SPEECH_NOT_CONFIGURED' ? 503 : 502 }
      );
    }

    // Re-check after async Gemini transcription in case round was reset or capture cancelled while transcribing
    const latestState = getFullState();
    const postCheck = validateCaptureResultForState(
      latestState,
      captureId,
      roundId
    );
    if (!postCheck.valid) {
      return NextResponse.json({
        ok: false,
        staleIgnored: true,
        reason: postCheck.reason,
        state: latestState,
      });
    }

    const drawnNumbers = latestState.currentRound.draws.map((d) => d.number);
    const parsed = parseSpokenBingoNumbers(
      transcription.transcript || '',
      drawnNumbers,
      transcription.detectedLanguage
    );

    const outcome = submitSpeechProposal({
      captureId,
      roundId,
      result: parsed,
      deviceId: body.deviceId,
    });

    return NextResponse.json({
      ok: outcome.accepted,
      staleIgnored: !outcome.accepted,
      publishedDirectly: Boolean(outcome.publishedDirectly),
      result: parsed,
      state: outcome.state,
    });
  }

  return NextResponse.json({ ok: false, errorCode: 'BAD_REQUEST' }, { status: 400 });
}

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  applyDraw,
  applyNewRound,
  applyUndo,
  createInitialGameState,
  evaluateLiveTranscriptSegment,
  isPotentiallyIncompleteCompound,
  validateCaptureResultForState,
} from './bingo-logic';
import { createLiveTranscribeSession, LiveTranscribeHandle } from './gemini-speech';
import {
  AuthoritativeGameState,
  CaptureWindowState,
  DeviceRole,
  EventSettings,
  MutationResult,
  PublicDisplayState,
  SpeechParseResult,
} from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'bingo-store.json');

export interface ConnectedClientInfo {
  clientId: string;
  role: DeviceRole;
  deviceId: string;
  deviceName: string;
  send: (payload: string) => void;
}

interface LiveSessionRuntime {
  session: LiveTranscribeHandle | null;
  clientId?: string;
  interimBuffer: string;
  interimTimer: ReturnType<typeof setTimeout> | null;
  lastInterimAt: number;
  recentlyCommitted: Array<{ number: number; atMs: number }>;
  activeRoundId: string;
}

interface GlobalStoreContainer {
  state: AuthoritativeGameState;
  processedMutationIds: Set<string>;
  clients: Map<string, ConnectedClientInfo>;
  captureTimer: ReturnType<typeof setTimeout> | null;
  liveRuntime: LiveSessionRuntime;
}

declare global {
  var __worldFamilyBingoContainer: GlobalStoreContainer | undefined;
}

function loadPersistedState(): AuthoritativeGameState {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as AuthoritativeGameState;
      if (parsed && parsed.currentRound && parsed.settings) {
        // Ensure transient capture windows, live mic sessions, or connection counts don't survive a process restart
        return {
          ...parsed,
          activeCapture: null,
          liveSpeech: {
            active: false,
            source: parsed.settings.audioSource,
            lastStatus: 'idle',
          },
          connections: {
            moderatorCount: 0,
            displayCount: 0,
            laptopBridgeArmed: false,
          },
        };
      }
    }
  } catch (err) {
    console.error('[BingoStore] Failed to load persisted state, initializing fresh:', err);
  }

  const initial = createInitialGameState(
    'world-family-fisterra',
    generatePairCode()
  );
  persistState(initial);
  return initial;
}

function persistState(state: AuthoritativeGameState): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmpFile = `${STORE_FILE}.${process.pid}.tmp`;
    const serializable: AuthoritativeGameState = {
      ...state,
      activeCapture: null,
      liveSpeech: {
        active: false,
        source: state.settings.audioSource,
        lastStatus: 'idle',
      },
    };
    fs.writeFileSync(tmpFile, JSON.stringify(serializable, null, 2), 'utf-8');
    fs.renameSync(tmpFile, STORE_FILE);
  } catch (err) {
    console.error('[BingoStore] Failed to persist state:', err);
  }
}

export function generatePairCode(): string {
  return String(crypto.randomInt(100000, 999999));
}

function getContainer(): GlobalStoreContainer {
  if (!globalThis.__worldFamilyBingoContainer) {
    const loadedState = loadPersistedState();
    globalThis.__worldFamilyBingoContainer = {
      state: loadedState,
      processedMutationIds: new Set<string>(),
      clients: new Map<string, ConnectedClientInfo>(),
      captureTimer: null,
      liveRuntime: {
        session: null,
        interimBuffer: '',
        interimTimer: null,
        lastInterimAt: 0,
        recentlyCommitted: [],
        activeRoundId: loadedState.currentRound.id,
      },
    };
  }
  return globalThis.__worldFamilyBingoContainer;
}

export function getPublicDisplayState(
  state: AuthoritativeGameState = getContainer().state
): PublicDisplayState {
  return {
    sessionId: state.sessionId,
    stateVersion: state.stateVersion,
    currentRound: state.currentRound,
    lastDrawnNumber: state.lastDrawnNumber,
    lastDrawEventId: state.lastDrawEventId,
    settings: state.settings,
    connections: state.connections,
  };
}

export function getFullState(): AuthoritativeGameState {
  return getContainer().state;
}

export function verifyModeratorCode(code: string | null | undefined): boolean {
  if (!code) return false;
  return code.trim() === getContainer().state.pairCode;
}

function recomputeConnections(): void {
  const container = getContainer();
  let moderatorCount = 0;
  let displayCount = 0;
  let laptopBridgeArmed = false;
  let laptopBridgeDeviceName: string | undefined;

  for (const client of container.clients.values()) {
    if (client.role === 'moderator') moderatorCount += 1;
    if (client.role === 'display') displayCount += 1;
    if (client.role === 'laptop-bridge') {
      laptopBridgeArmed = true;
      laptopBridgeDeviceName = client.deviceName;
    }
  }

  container.state = {
    ...container.state,
    connections: {
      moderatorCount,
      displayCount,
      laptopBridgeArmed,
      laptopBridgeDeviceName,
    },
  };
}

export function broadcastState(): void {
  const container = getContainer();
  const moderatorPayload = JSON.stringify({
    type: 'state:sync',
    state: container.state,
  });
  const displayPayload = JSON.stringify({
    type: 'state:sync',
    state: getPublicDisplayState(container.state),
  });

  for (const client of container.clients.values()) {
    try {
      client.send(client.role === 'display' ? displayPayload : moderatorPayload);
    } catch {
      // Ignore closed socket errors during broadcast
    }
  }
}

export function broadcastModeratorEvent(event: Record<string, unknown>): void {
  const container = getContainer();
  const payload = JSON.stringify(event);
  for (const client of container.clients.values()) {
    if (client.role !== 'display') {
      try {
        client.send(payload);
      } catch {
        // Ignore closed socket
      }
    }
  }
}

export function registerClient(client: ConnectedClientInfo): void {
  const container = getContainer();
  container.clients.set(client.clientId, client);
  recomputeConnections();
  broadcastState();
}

export function unregisterClient(clientId: string): void {
  const container = getContainer();
  const removed = container.clients.get(clientId);
  container.clients.delete(clientId);
  recomputeConnections();

  // If the active audio source disconnected while live voice recognition was running, stop it safely
  if (container.state.liveSpeech.active) {
    const source = container.state.settings.audioSource;
    const lostLaptopBridge =
      source === 'laptop' && !container.state.connections.laptopBridgeArmed;
    const lostActivatingPhone =
      source === 'phone' &&
      removed?.deviceId &&
      removed.deviceId === container.state.liveSpeech.activatedByDeviceId;

    if (lostLaptopBridge || lostActivatingPhone) {
      stopLiveSpeech(false);
    }
  }

  broadcastState();
}

export function commitDraw(params: {
  number: number;
  source: 'manual' | 'speech_confirmed' | 'speech_direct';
  transcript?: string;
  captureId?: string;
  roundId?: string;
  deviceId?: string;
  mutationId?: string;
}): MutationResult {
  const container = getContainer();
  const res = applyDraw(container.state, {
    ...params,
    processedMutationIds: container.processedMutationIds,
  });
  if (res.ok && res.errorCode !== 'DUPLICATE_MUTATION') {
    if (container.captureTimer) {
      clearTimeout(container.captureTimer);
      container.captureTimer = null;
    }
    container.state = res.state;
    persistState(container.state);
    broadcastState();
  }
  return res;
}

export function commitUndo(params: {
  reason?: string;
  deviceId?: string;
}): MutationResult {
  const container = getContainer();
  const res = applyUndo(container.state, params);
  if (res.ok) {
    container.state = res.state;
    persistState(container.state);
    broadcastState();
  }
  return res;
}

export function commitNewRound(params: {
  confirmed: boolean;
  deviceId?: string;
}): MutationResult {
  const container = getContainer();
  if (container.captureTimer) {
    clearTimeout(container.captureTimer);
    container.captureTimer = null;
  }
  if (container.liveRuntime.interimTimer) {
    clearTimeout(container.liveRuntime.interimTimer);
    container.liveRuntime.interimTimer = null;
  }
  container.liveRuntime.interimBuffer = '';
  container.liveRuntime.recentlyCommitted = [];

  const res = applyNewRound(container.state, params);
  if (res.ok) {
    container.liveRuntime.activeRoundId = res.state.currentRound.id;
    container.state = {
      ...res.state,
      liveSpeech: {
        ...res.state.liveSpeech,
        interimTranscript: '',
        lastTranscript: '',
        lastStatus: 'idle',
        lastNumber: undefined,
        lastCandidates: undefined,
      },
    };
    persistState(container.state);
    broadcastState();
  }
  return res;
}

export function updateEventSettings(
  partial: Partial<EventSettings>
): AuthoritativeGameState {
  const container = getContainer();
  const nextSettings: EventSettings = {
    ...container.state.settings,
    ...partial,
  };

  // Enforce explicit opt-in for Direct Mode
  if (partial.confirmationMode === false && !nextSettings.directModeExplicitlyEnabled) {
    nextSettings.confirmationMode = true;
  }

  // Clamp numerical settings safely
  nextSettings.captureMaxSeconds = Math.min(
    15,
    Math.max(2, Math.round(nextSettings.captureMaxSeconds || 6))
  );
  nextSettings.ballDisplaySeconds = Math.min(
    15,
    Math.max(2, Math.round(nextSettings.ballDisplaySeconds || 5))
  );
  nextSettings.beamerScale = Math.min(
    1.3,
    Math.max(0.85, Number(nextSettings.beamerScale || 1))
  );
  nextSettings.beamerSafeMarginPx = Math.min(
    48,
    Math.max(0, Math.round(nextSettings.beamerSafeMarginPx ?? 16))
  );
  nextSettings.soundVolume = Math.min(
    1,
    Math.max(0, Number(nextSettings.soundVolume ?? 0.4))
  );

  container.state = {
    ...container.state,
    stateVersion: container.state.stateVersion + 1,
    settings: nextSettings,
  };
  persistState(container.state);
  broadcastState();
  return container.state;
}

export function regeneratePairCode(): AuthoritativeGameState {
  const container = getContainer();
  container.state = {
    ...container.state,
    pairCode: generatePairCode(),
    stateVersion: container.state.stateVersion + 1,
  };
  persistState(container.state);
  broadcastState();
  return container.state;
}

export function clearArchivedHistory(confirmed: boolean): MutationResult {
  const container = getContainer();
  if (!confirmed) {
    return {
      ok: false,
      state: container.state,
      errorCode: 'CONFIRMATION_REQUIRED',
      message: 'Clearing history requires confirmation',
    };
  }
  container.state = {
    ...container.state,
    stateVersion: container.state.stateVersion + 1,
    history: [],
    corrections: [
      {
        id: `corr-${Date.now().toString(36)}`,
        roundNumber: container.state.currentRound.roundNumber,
        action: 'history_cleared',
        reason: 'Archived round history cleared by moderator',
        timestamp: new Date().toISOString(),
      },
    ],
  };
  persistState(container.state);
  broadcastState();
  return { ok: true, state: container.state };
}

export function startCaptureWindow(params: {
  requestedByDeviceId: string;
}): { ok: boolean; capture?: CaptureWindowState; error?: string } {
  const container = getContainer();
  const source = container.state.settings.audioSource;

  if (source === 'laptop' && !container.state.connections.laptopBridgeArmed) {
    return {
      ok: false,
      error: 'LAPTOP_BRIDGE_NOT_ARMED',
    };
  }

  if (container.captureTimer) {
    clearTimeout(container.captureTimer);
    container.captureTimer = null;
  }

  const captureId = `cap-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;

  const capture: CaptureWindowState = {
    captureId,
    roundId: container.state.currentRound.id,
    source,
    requestedByDeviceId: params.requestedByDeviceId,
    status: 'active',
    startedAt: new Date().toISOString(),
    maxSeconds: container.state.settings.captureMaxSeconds,
    proposal: null,
  };

  container.state = {
    ...container.state,
    stateVersion: container.state.stateVersion + 1,
    activeCapture: capture,
  };

  // Auto-stop capture window slightly after maxSeconds if client hasn't closed it
  container.captureTimer = setTimeout(() => {
    const current = getContainer().state.activeCapture;
    if (current && current.captureId === captureId && current.status === 'active') {
      stopCaptureWindow(captureId);
    }
  }, (capture.maxSeconds + 2) * 1000);

  broadcastState();
  broadcastModeratorEvent({
    type: 'capture:command',
    action: 'start',
    capture,
  });

  return { ok: true, capture };
}

export function stopCaptureWindow(captureId: string): void {
  const container = getContainer();
  const active = container.state.activeCapture;
  if (!active || active.captureId !== captureId) return;

  if (container.captureTimer) {
    clearTimeout(container.captureTimer);
    container.captureTimer = null;
  }

  if (active.status === 'active') {
    container.state = {
      ...container.state,
      stateVersion: container.state.stateVersion + 1,
      activeCapture: {
        ...active,
        status: 'transcribing',
      },
    };
    broadcastState();
    broadcastModeratorEvent({
      type: 'capture:command',
      action: 'stop',
      captureId,
    });
  }
}

export function cancelCaptureWindow(captureId?: string): void {
  const container = getContainer();
  const active = container.state.activeCapture;
  if (!active) return;
  if (captureId && active.captureId !== captureId) return;

  if (container.captureTimer) {
    clearTimeout(container.captureTimer);
    container.captureTimer = null;
  }

  container.state = {
    ...container.state,
    stateVersion: container.state.stateVersion + 1,
    activeCapture: null,
  };
  broadcastState();
  broadcastModeratorEvent({
    type: 'capture:command',
    action: 'cancel',
    captureId: active.captureId,
  });
}

export function submitSpeechProposal(params: {
  captureId: string;
  roundId: string;
  result: SpeechParseResult;
  deviceId?: string;
}): {
  accepted: boolean;
  publishedDirectly?: boolean;
  reason?: string;
  state: AuthoritativeGameState;
} {
  const container = getContainer();
  const validation = validateCaptureResultForState(
    container.state,
    params.captureId,
    params.roundId
  );

  if (!validation.valid) {
    return {
      accepted: false,
      reason: validation.reason ?? 'stale_ignored',
      state: container.state,
    };
  }

  if (container.captureTimer) {
    clearTimeout(container.captureTimer);
    container.captureTimer = null;
  }

  const settings = container.state.settings;
  const isDirectMode =
    !settings.confirmationMode && settings.directModeExplicitlyEnabled;

  // In explicit Direct Mode, publish ONLY if there is one unambiguous, valid, undrawn number
  if (
    isDirectMode &&
    params.result.status === 'valid' &&
    typeof params.result.number === 'number'
  ) {
    const drawRes = commitDraw({
      number: params.result.number,
      source: 'speech_direct',
      transcript: params.result.transcript,
      captureId: params.captureId,
      roundId: params.roundId,
      deviceId: params.deviceId,
      mutationId: `speech-direct-${params.captureId}`,
    });

    if (drawRes.ok) {
      broadcastModeratorEvent({
        type: 'capture:resolved',
        captureId: params.captureId,
        publishedDirectly: true,
        result: params.result,
      });
      return {
        accepted: true,
        publishedDirectly: true,
        state: drawRes.state,
      };
    }
  }

  // Default Confirmation Mode (or non-valid/ambiguous/already_drawn results)
  const active = container.state.activeCapture!;
  container.state = {
    ...container.state,
    stateVersion: container.state.stateVersion + 1,
    activeCapture: {
      ...active,
      status: 'proposal',
      proposal: params.result,
    },
  };
  broadcastState();
  broadcastModeratorEvent({
    type: 'capture:resolved',
    captureId: params.captureId,
    publishedDirectly: false,
    result: params.result,
  });

  return {
    accepted: true,
    publishedDirectly: false,
    state: container.state,
  };
}

function evaluateAndApplyLiveSegment(segmentText: string): void {
  const container = getContainer();
  if (!container.state.liveSpeech.active) return;

  const rt = container.liveRuntime;
  if (rt.activeRoundId !== container.state.currentRound.id) {
    rt.activeRoundId = container.state.currentRound.id;
    rt.recentlyCommitted = [];
    rt.interimBuffer = '';
    return;
  }

  const nowMs = Date.now();
  rt.recentlyCommitted = rt.recentlyCommitted.filter(
    (entry) => nowMs - entry.atMs <= 3500
  );

  const drawnNumbers = container.state.currentRound.draws.map((d) => d.number);
  const evalRes = evaluateLiveTranscriptSegment({
    transcript: segmentText,
    drawnNumbers,
    recentlyCommitted: rt.recentlyCommitted,
    nowMs,
    cooldownMs: 3200,
    detectedLanguage: container.state.settings.speechLanguage,
  });

  if (evalRes.action === 'ignore_empty' || evalRes.action === 'ignore_recent_duplicate') {
    return;
  }

  const settings = container.state.settings;
  const isDirectMode =
    !settings.confirmationMode && settings.directModeExplicitlyEnabled;

  if (
    evalRes.action === 'commit' &&
    evalRes.parseResult.status === 'valid' &&
    typeof evalRes.parseResult.number === 'number'
  ) {
    const num = evalRes.parseResult.number;

    if (isDirectMode) {
      const drawRes = commitDraw({
        number: num,
        source: 'speech_direct',
        transcript: segmentText,
        roundId: container.state.currentRound.id,
        deviceId: container.state.liveSpeech.activatedByDeviceId,
      });

      if (drawRes.ok) {
        rt.recentlyCommitted.push({ number: num, atMs: nowMs });
        container.state = {
          ...getContainer().state,
          liveSpeech: {
            ...getContainer().state.liveSpeech,
            interimTranscript: '',
            lastTranscript: segmentText,
            lastStatus: 'published',
            lastNumber: num,
            lastCandidates: undefined,
            errorCode: undefined,
            errorMessage: undefined,
          },
        };
        broadcastState();
        broadcastModeratorEvent({
          type: 'live:number',
          publishedDirectly: true,
          number: num,
          transcript: segmentText,
        });
      }
      return;
    }

    // Confirmation mode active while live speech is running: propose without killing live stream
    rt.recentlyCommitted.push({ number: num, atMs: nowMs });
    const captureId = `live-${Date.now().toString(36)}`;
    container.state = {
      ...container.state,
      stateVersion: container.state.stateVersion + 1,
      activeCapture: {
        captureId,
        roundId: container.state.currentRound.id,
        source: container.state.settings.audioSource,
        requestedByDeviceId:
          container.state.liveSpeech.activatedByDeviceId || 'live',
        status: 'proposal',
        startedAt: new Date().toISOString(),
        maxSeconds: container.state.settings.captureMaxSeconds,
        proposal: evalRes.parseResult,
      },
      liveSpeech: {
        ...container.state.liveSpeech,
        interimTranscript: '',
        lastTranscript: segmentText,
        lastStatus: 'valid',
        lastNumber: num,
        lastCandidates: undefined,
      },
    };
    broadcastState();
    return;
  }

  // Ambiguous / already_drawn / out_of_range feedback (never alters draws)
  container.state = {
    ...container.state,
    stateVersion: container.state.stateVersion + 1,
    liveSpeech: {
      ...container.state.liveSpeech,
      interimTranscript: '',
      lastTranscript: segmentText,
      lastStatus: evalRes.parseResult.status,
      lastNumber: evalRes.parseResult.number,
      lastCandidates: evalRes.parseResult.candidates,
    },
  };
  broadcastState();
}

function handleLiveTranscription(kind: 'interim' | 'final', rawText: string): void {
  const container = getContainer();
  if (!container.state.liveSpeech.active) return;

  const text = rawText.trim();
  if (!text) return;

  const rt = container.liveRuntime;
  const now = Date.now();

  if (kind === 'interim') {
    // Support both cumulative interim hypotheses and incremental token deltas
    const prev = rt.interimBuffer;
    if (!prev || now - rt.lastInterimAt > 2000) {
      rt.interimBuffer = text;
    } else if (text.toLowerCase().startsWith(prev.toLowerCase())) {
      rt.interimBuffer = text;
    } else if (prev.toLowerCase().endsWith(text.toLowerCase())) {
      rt.interimBuffer = prev;
    } else {
      rt.interimBuffer = `${prev} ${text}`.replace(/\s+/g, ' ').trim();
    }
    rt.lastInterimAt = now;

    container.state = {
      ...container.state,
      liveSpeech: {
        ...container.state.liveSpeech,
        interimTranscript: rt.interimBuffer,
      },
    };
    broadcastModeratorEvent({
      type: 'live:transcript',
      interimTranscript: rt.interimBuffer,
    });

    if (rt.interimTimer) {
      clearTimeout(rt.interimTimer);
    }
    const waitMs = isPotentiallyIncompleteCompound(rt.interimBuffer) ? 620 : 260;
    rt.interimTimer = setTimeout(() => {
      rt.interimTimer = null;
      const buffered = rt.interimBuffer.trim();
      rt.interimBuffer = '';
      if (buffered) {
        evaluateAndApplyLiveSegment(buffered);
      }
    }, waitMs);
    return;
  }

  // Finalized utterance from Gemini Live
  if (rt.interimTimer) {
    clearTimeout(rt.interimTimer);
    rt.interimTimer = null;
  }
  const combined =
    rt.interimBuffer &&
    !text.toLowerCase().includes(rt.interimBuffer.toLowerCase()) &&
    now - rt.lastInterimAt < 1800 &&
    isPotentiallyIncompleteCompound(rt.interimBuffer)
      ? `${rt.interimBuffer} ${text}`
      : text;

  rt.interimBuffer = '';
  evaluateAndApplyLiveSegment(combined);
}

export async function startLiveSpeech(params: {
  requestedByDeviceId: string;
  clientId?: string;
}): Promise<{
  ok: boolean;
  errorCode?: string;
  errorMessage?: string;
  state: AuthoritativeGameState;
}> {
  const container = getContainer();
  const source = container.state.settings.audioSource;

  if (source === 'laptop' && !container.state.connections.laptopBridgeArmed) {
    return {
      ok: false,
      errorCode: 'LAPTOP_BRIDGE_NOT_ARMED',
      state: container.state,
    };
  }

  // Clean up any prior session cleanly without flickering UI prematurely
  stopLiveSpeech(false);

  const rt = container.liveRuntime;
  rt.activeRoundId = container.state.currentRound.id;
  rt.interimBuffer = '';
  rt.recentlyCommitted = [];
  rt.clientId = params.clientId;

  container.state = {
    ...container.state,
    stateVersion: container.state.stateVersion + 1,
    activeCapture: null,
    liveSpeech: {
      active: true,
      source,
      activatedByDeviceId: params.requestedByDeviceId,
      startedAt: new Date().toISOString(),
      interimTranscript: '',
      lastStatus: 'idle',
      errorCode: undefined,
      errorMessage: undefined,
    },
  };
  broadcastState();

  const handle = await createLiveTranscribeSession({
    languageHint: container.state.settings.speechLanguage,
    onInterim: (text) => handleLiveTranscription('interim', text),
    onFinal: (text) => handleLiveTranscription('final', text),
    onError: (code, message) => {
      stopLiveSpeech(false);
      container.state = {
        ...container.state,
        stateVersion: container.state.stateVersion + 1,
        liveSpeech: {
          active: false,
          source: container.state.settings.audioSource,
          lastStatus: 'error',
          errorCode: code,
          errorMessage: message,
        },
      };
      broadcastState();
      broadcastModeratorEvent({
        type: 'live:error',
        errorCode: code,
        errorMessage: message,
      });
    },
    onClose: () => {
      if (getContainer().state.liveSpeech.active) {
        stopLiveSpeech(true);
      }
    },
  });

  if (!handle) {
    return {
      ok: false,
      errorCode: container.state.liveSpeech.errorCode || 'UPSTREAM_ERROR',
      errorMessage: container.state.liveSpeech.errorMessage,
      state: container.state,
    };
  }

  // Verify liveSpeech wasn't deactivated while connecting
  if (!container.state.liveSpeech.active) {
    handle.close();
    return { ok: false, state: container.state };
  }

  rt.session = handle;
  broadcastModeratorEvent({
    type: 'live:command',
    action: 'start',
    source,
    activatedByDeviceId: params.requestedByDeviceId,
  });

  return { ok: true, state: container.state };
}

export function stopLiveSpeech(broadcast = true): AuthoritativeGameState {
  const container = getContainer();
  const rt = container.liveRuntime;

  if (rt.interimTimer) {
    clearTimeout(rt.interimTimer);
    rt.interimTimer = null;
  }
  rt.interimBuffer = '';
  if (rt.session) {
    const s = rt.session;
    rt.session = null;
    s.close();
  }

  const wasActive = container.state.liveSpeech.active;
  container.state = {
    ...container.state,
    stateVersion: wasActive
      ? container.state.stateVersion + 1
      : container.state.stateVersion,
    liveSpeech: {
      ...container.state.liveSpeech,
      active: false,
      interimTranscript: '',
    },
  };

  if (broadcast) {
    broadcastModeratorEvent({
      type: 'live:command',
      action: 'stop',
    });
    broadcastState();
  }
  return container.state;
}

export function pushLiveAudioChunk(base64Pcm: string, level?: number): void {
  const container = getContainer();
  if (!container.state.liveSpeech.active || !container.liveRuntime.session) {
    return;
  }
  container.liveRuntime.session.sendAudioPcm(base64Pcm);
  if (typeof level === 'number') {
    broadcastModeratorEvent({
      type: 'capture:level',
      level: Math.max(0, Math.min(100, Math.round(level))),
    });
  }
}

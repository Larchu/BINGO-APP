import {
  AuthoritativeGameState,
  CaptureWindowState,
  DrawEntry,
  EventSettings,
  MutationResult,
  RoundRecord,
  SpeechParseResult,
} from './types';

export const MIN_BINGO_NUMBER = 1;
export const MAX_BINGO_NUMBER = 90;

export const DEFAULT_EVENT_SETTINGS: EventSettings = {
  displayLanguage: 'es',
  speechLanguage: 'auto',
  audioSource: 'laptop',
  captureMaxSeconds: 5,
  confirmationMode: false,
  directModeExplicitlyEnabled: true,
  ballDisplaySeconds: 5,
  animationIntensity: 'standard',
  reducedMotion: false,
  beamerScale: 1,
  beamerSafeMarginPx: 16,
  soundEnabled: false,
  soundVolume: 0.4,
};

export function createNewRound(roundNumber: number, nowIso: string): RoundRecord {
  return {
    id: `round-${roundNumber}-${Date.now().toString(36)}`,
    roundNumber,
    startedAt: nowIso,
    endedAt: null,
    draws: [],
  };
}

export function createInitialGameState(
  sessionId = 'world-family-fisterra',
  pairCode = '213090',
  nowIso = new Date().toISOString()
): AuthoritativeGameState {
  return {
    sessionId,
    pairCode,
    stateVersion: 1,
    currentRound: createNewRound(1, nowIso),
    lastDrawnNumber: null,
    lastDrawEventId: null,
    activeCapture: null,
    liveSpeech: {
      active: false,
      source: DEFAULT_EVENT_SETTINGS.audioSource,
      lastStatus: 'idle',
    },
    settings: { ...DEFAULT_EVENT_SETTINGS },
    history: [],
    corrections: [],
    connections: {
      moderatorCount: 0,
      displayCount: 0,
      laptopBridgeArmed: false,
    },
  };
}

const SPANISH_UNITS: Record<string, number> = {
  uno: 1,
  una: 1,
  un: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
};

const SPANISH_SPECIALS: Record<string, number> = {
  cero: 0,
  diez: 10,
  once: 11,
  doce: 12,
  trece: 13,
  catorce: 14,
  quince: 15,
  dieciseis: 16,
  diecisiete: 17,
  dieciocho: 18,
  diecinueve: 19,
  veinte: 20,
  veintiuno: 21,
  veintiuna: 21,
  veintiun: 21,
  veintidos: 22,
  veintitres: 23,
  veinticuatro: 24,
  veinticinco: 25,
  veintiseis: 26,
  veintisiete: 27,
  veintiocho: 28,
  veintinueve: 29,
  cien: 100,
  ciento: 100,
  mil: 1000,
};

const SPANISH_TENS: Record<string, number> = {
  diez: 10,
  veinte: 20,
  treinta: 30,
  cuarenta: 40,
  cincuenta: 50,
  sesenta: 60,
  setenta: 70,
  ochenta: 80,
  noventa: 90,
};

const ENGLISH_UNITS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
};

const ENGLISH_SPECIALS: Record<string, number> = {
  zero: 0,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  hundred: 100,
  thousand: 1000,
};

const ENGLISH_TENS: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fourty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

const GERMAN_UNITS: Record<string, number> = {
  eins: 1,
  ein: 1,
  eine: 1,
  einer: 1,
  zwei: 2,
  zwo: 2,
  drei: 3,
  vier: 4,
  fuenf: 5,
  sechs: 6,
  sieben: 7,
  acht: 8,
  neun: 9,
};

const GERMAN_SPECIALS: Record<string, number> = {
  null: 0,
  zehn: 10,
  elf: 11,
  zwoelf: 12,
  dreizehn: 13,
  vierzehn: 14,
  fuenfzehn: 15,
  sechzehn: 16,
  siebzehn: 17,
  achtzehn: 18,
  neunzehn: 19,
  hundert: 100,
  tausend: 1000,
};

const GERMAN_TENS: Record<string, number> = {
  zwanzig: 20,
  dreissig: 30,
  vierzig: 40,
  fuenfzig: 50,
  sechzig: 60,
  siebzig: 70,
  achtzig: 80,
  neunzig: 90,
};

function normalizeText(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-–—/]/g, ' ')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseGermanCompoundToken(token: string): number | null {
  if (GERMAN_SPECIALS[token] !== undefined) return GERMAN_SPECIALS[token];
  if (GERMAN_TENS[token] !== undefined) return GERMAN_TENS[token];
  if (GERMAN_UNITS[token] !== undefined) return GERMAN_UNITS[token];

  const undIdx = token.indexOf('und');
  if (undIdx > 0) {
    const left = token.slice(0, undIdx);
    const right = token.slice(undIdx + 3);
    const unitVal = GERMAN_UNITS[left];
    const tensVal = GERMAN_TENS[right];
    if (unitVal !== undefined && tensVal !== undefined && unitVal >= 1 && unitVal <= 9) {
      return tensVal + unitVal;
    }
  }

  return null;
}

export function extractNumbersFromTranscript(transcript: string): {
  valid: number[];
  outOfRange: number[];
} {
  const normalized = normalizeText(transcript);
  if (!normalized) {
    return { valid: [], outOfRange: [] };
  }

  const tokens = normalized.split(' ');
  const found: number[] = [];

  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];

    // 1. Pure numeric digits (e.g. "36", "0", "95")
    if (/^\d+$/.test(token)) {
      const val = Number.parseInt(token, 10);
      found.push(val);
      i += 1;
      continue;
    }

    // 2. Spanish compound: "<tens> y <unit>" (e.g. "treinta y seis", "diez y seis", "veinte y cuatro")
    if (
      SPANISH_TENS[token] !== undefined &&
      i + 2 < tokens.length &&
      tokens[i + 1] === 'y' &&
      SPANISH_UNITS[tokens[i + 2]] !== undefined
    ) {
      found.push(SPANISH_TENS[token] + SPANISH_UNITS[tokens[i + 2]]);
      i += 3;
      continue;
    }

    // 3. German spaced compound: "<unit> und <tens>" (e.g. "sechs und dreissig")
    if (
      GERMAN_UNITS[token] !== undefined &&
      i + 2 < tokens.length &&
      tokens[i + 1] === 'und' &&
      GERMAN_TENS[tokens[i + 2]] !== undefined
    ) {
      found.push(GERMAN_TENS[tokens[i + 2]] + GERMAN_UNITS[token]);
      i += 3;
      continue;
    }

    // 4. English compound: "<tens> <unit>" (e.g. "thirty six")
    if (
      ENGLISH_TENS[token] !== undefined &&
      i + 1 < tokens.length &&
      ENGLISH_UNITS[tokens[i + 1]] !== undefined
    ) {
      found.push(ENGLISH_TENS[token] + ENGLISH_UNITS[tokens[i + 1]]);
      i += 2;
      continue;
    }

    // 5. German single-word compound or special/tens/unit (e.g. "sechsunddreissig")
    const germanVal = parseGermanCompoundToken(token);
    if (germanVal !== null) {
      found.push(germanVal);
      i += 1;
      continue;
    }

    // 6. Spanish single-word special / tens / unit
    if (SPANISH_SPECIALS[token] !== undefined) {
      found.push(SPANISH_SPECIALS[token]);
      i += 1;
      continue;
    }
    if (SPANISH_TENS[token] !== undefined) {
      found.push(SPANISH_TENS[token]);
      i += 1;
      continue;
    }
    if (SPANISH_UNITS[token] !== undefined) {
      found.push(SPANISH_UNITS[token]);
      i += 1;
      continue;
    }

    // 7. English single-word special / tens / unit
    if (ENGLISH_SPECIALS[token] !== undefined) {
      found.push(ENGLISH_SPECIALS[token]);
      i += 1;
      continue;
    }
    if (ENGLISH_TENS[token] !== undefined) {
      found.push(ENGLISH_TENS[token]);
      i += 1;
      continue;
    }
    if (ENGLISH_UNITS[token] !== undefined) {
      found.push(ENGLISH_UNITS[token]);
      i += 1;
      continue;
    }

    i += 1;
  }

  const validSet = new Set<number>();
  const outOfRangeSet = new Set<number>();

  for (const n of found) {
    if (Number.isInteger(n) && n >= MIN_BINGO_NUMBER && n <= MAX_BINGO_NUMBER) {
      validSet.add(n);
    } else {
      outOfRangeSet.add(n);
    }
  }

  return {
    valid: Array.from(validSet),
    outOfRange: Array.from(outOfRangeSet),
  };
}

export function parseSpokenBingoNumbers(
  transcript: string,
  drawnNumbers: number[],
  detectedLanguage?: string
): SpeechParseResult {
  const cleaned = (transcript ?? '').trim();
  if (
    !cleaned ||
    /^\[?(silence|silent|noise|inaudible|unintelligible|stille|silencio|empty)\]?$/i.test(
      cleaned
    )
  ) {
    return {
      status: 'empty',
      transcript: cleaned,
      detectedLanguage,
    };
  }

  const { valid, outOfRange } = extractNumbersFromTranscript(cleaned);

  if (valid.length === 0 && outOfRange.length === 0) {
    return {
      status: 'unintelligible',
      transcript: cleaned,
      detectedLanguage,
    };
  }

  if (valid.length === 0 && outOfRange.length > 0) {
    return {
      status: 'out_of_range',
      outOfRangeNumbers: outOfRange,
      transcript: cleaned,
      detectedLanguage,
    };
  }

  if (valid.length > 1 || (valid.length === 1 && outOfRange.length > 0)) {
    return {
      status: 'ambiguous',
      candidates: valid,
      outOfRangeNumbers: outOfRange.length > 0 ? outOfRange : undefined,
      transcript: cleaned,
      detectedLanguage,
    };
  }

  const num = valid[0];
  if (drawnNumbers.includes(num)) {
    return {
      status: 'already_drawn',
      number: num,
      transcript: cleaned,
      detectedLanguage,
    };
  }

  return {
    status: 'valid',
    number: num,
    transcript: cleaned,
    detectedLanguage,
  };
}

/**
 * Returns true if the trailing token(s) of a streaming transcript look like
 * the start of a multi-word number (e.g. "treinta", "treinta y", "thirty",
 * "sechs", "sechs und", or a single digit "3") so live streaming can wait
 * briefly (~600ms) for the rest of the compound number instead of firing early.
 */
export function isPotentiallyIncompleteCompound(transcript: string): boolean {
  const normalized = normalizeText(transcript);
  if (!normalized) return false;
  const tokens = normalized.split(' ');
  const last = tokens[tokens.length - 1];
  const prev = tokens.length >= 2 ? tokens[tokens.length - 2] : '';

  // Trailing single digit 1..9 (might become 2 digits like "3" -> "36")
  if (/^[1-9]$/.test(last)) {
    return true;
  }

  // Spanish "<tens>" or "<tens> y"
  if (SPANISH_TENS[last] !== undefined && last !== 'diez') {
    return true;
  }
  if (last === 'y' && SPANISH_TENS[prev] !== undefined) {
    return true;
  }

  // English "<tens>"
  if (ENGLISH_TENS[last] !== undefined) {
    return true;
  }

  // German "<unit>" or "<unit> und" (e.g. "sechs" -> "sechs und dreissig")
  if (GERMAN_UNITS[last] !== undefined) {
    return true;
  }
  if (last === 'und' && GERMAN_UNITS[prev] !== undefined) {
    return true;
  }

  return false;
}

export interface LiveTranscriptEvaluation {
  action: 'ignore_empty' | 'ignore_recent_duplicate' | 'commit' | 'feedback';
  parseResult: SpeechParseResult;
}

export function evaluateLiveTranscriptSegment(params: {
  transcript: string;
  drawnNumbers: number[];
  recentlyCommitted: Array<{ number: number; atMs: number }>;
  nowMs: number;
  cooldownMs?: number;
  detectedLanguage?: string;
}): LiveTranscriptEvaluation {
  const cooldownMs = params.cooldownMs ?? 3000;
  const parseResult = parseSpokenBingoNumbers(
    params.transcript,
    params.drawnNumbers,
    params.detectedLanguage
  );

  if (parseResult.status === 'empty' || parseResult.status === 'unintelligible') {
    return { action: 'ignore_empty', parseResult };
  }

  if (parseResult.status === 'already_drawn' && parseResult.number !== undefined) {
    const justCommitted = params.recentlyCommitted.some(
      (item) =>
        item.number === parseResult.number &&
        params.nowMs - item.atMs <= cooldownMs
    );
    if (justCommitted) {
      return { action: 'ignore_recent_duplicate', parseResult };
    }
    return { action: 'feedback', parseResult };
  }

  if (parseResult.status === 'valid') {
    return { action: 'commit', parseResult };
  }

  return { action: 'feedback', parseResult };
}

export function applyDraw(
  state: AuthoritativeGameState,
  params: {
    number: number;
    source: DrawEntry['source'];
    transcript?: string;
    captureId?: string;
    roundId?: string;
    deviceId?: string;
    mutationId?: string;
    processedMutationIds?: Set<string>;
    nowIso?: string;
  }
): MutationResult {
  const nowIso = params.nowIso ?? new Date().toISOString();

  if (
    params.mutationId &&
    params.processedMutationIds &&
    params.processedMutationIds.has(params.mutationId)
  ) {
    return {
      ok: true,
      state,
      errorCode: 'DUPLICATE_MUTATION',
      message: 'Mutation already applied',
    };
  }

  if (params.roundId && params.roundId !== state.currentRound.id) {
    return {
      ok: false,
      state,
      errorCode: 'ROUND_MISMATCH',
      message: 'Result belongs to a different round',
    };
  }

  if (
    !Number.isInteger(params.number) ||
    params.number < MIN_BINGO_NUMBER ||
    params.number > MAX_BINGO_NUMBER
  ) {
    return {
      ok: false,
      state,
      errorCode: 'INVALID_NUMBER',
      message: 'Number must be an integer between 1 and 90',
    };
  }

  const alreadyDrawn = state.currentRound.draws.some(
    (d) => d.number === params.number
  );
  if (alreadyDrawn) {
    return {
      ok: false,
      state,
      errorCode: 'ALREADY_DRAWN',
      message: `Number ${params.number} has already been drawn in this round`,
    };
  }

  if (params.mutationId && params.processedMutationIds) {
    params.processedMutationIds.add(params.mutationId);
  }

  const entry: DrawEntry = {
    number: params.number,
    drawnAt: nowIso,
    source: params.source,
    transcript: params.transcript,
    captureId: params.captureId,
    deviceId: params.deviceId,
  };

  const nextRound: RoundRecord = {
    ...state.currentRound,
    draws: [...state.currentRound.draws, entry],
  };

  const nextState: AuthoritativeGameState = {
    ...state,
    stateVersion: state.stateVersion + 1,
    currentRound: nextRound,
    lastDrawnNumber: params.number,
    lastDrawEventId: `draw-${nextRound.roundNumber}-${params.number}-${Date.now().toString(36)}`,
    activeCapture: null,
  };

  return { ok: true, state: nextState };
}

export function applyUndo(
  state: AuthoritativeGameState,
  params: {
    reason?: string;
    deviceId?: string;
    nowIso?: string;
  } = {}
): MutationResult {
  const nowIso = params.nowIso ?? new Date().toISOString();
  const draws = state.currentRound.draws;
  if (draws.length === 0) {
    return {
      ok: false,
      state,
      errorCode: 'NOTHING_TO_UNDO',
      message: 'No draws to undo in current round',
    };
  }

  const removed = draws[draws.length - 1];
  const remainingDraws = draws.slice(0, -1);
  const newLast =
    remainingDraws.length > 0
      ? remainingDraws[remainingDraws.length - 1].number
      : null;

  const correction = {
    id: `corr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    roundNumber: state.currentRound.roundNumber,
    action: 'undo_draw' as const,
    number: removed.number,
    reason: params.reason?.trim() || 'Moderator undo',
    timestamp: nowIso,
    deviceId: params.deviceId,
  };

  const nextState: AuthoritativeGameState = {
    ...state,
    stateVersion: state.stateVersion + 1,
    currentRound: {
      ...state.currentRound,
      draws: remainingDraws,
    },
    lastDrawnNumber: newLast,
    lastDrawEventId: newLast
      ? `undo-${state.currentRound.roundNumber}-${newLast}-${Date.now().toString(36)}`
      : null,
    corrections: [correction, ...state.corrections],
  };

  return { ok: true, state: nextState };
}

export function applyNewRound(
  state: AuthoritativeGameState,
  params: {
    confirmed: boolean;
    deviceId?: string;
    nowIso?: string;
  }
): MutationResult {
  if (!params.confirmed) {
    return {
      ok: false,
      state,
      errorCode: 'CONFIRMATION_REQUIRED',
      message: 'Starting a new round requires explicit confirmation',
    };
  }

  const nowIso = params.nowIso ?? new Date().toISOString();
  const archivedRound: RoundRecord = {
    ...state.currentRound,
    endedAt: nowIso,
  };

  const nextHistory =
    archivedRound.draws.length > 0 || state.history.length > 0
      ? [archivedRound, ...state.history]
      : [archivedRound];

  const nextRoundNumber = state.currentRound.roundNumber + 1;
  const freshRound = createNewRound(nextRoundNumber, nowIso);

  const correction = {
    id: `corr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    roundNumber: state.currentRound.roundNumber,
    action: 'round_reset' as const,
    reason: `Archived round ${state.currentRound.roundNumber} (${archivedRound.draws.length} draws) and started round ${nextRoundNumber}`,
    timestamp: nowIso,
    deviceId: params.deviceId,
  };

  const nextState: AuthoritativeGameState = {
    ...state,
    stateVersion: state.stateVersion + 1,
    currentRound: freshRound,
    lastDrawnNumber: null,
    lastDrawEventId: null,
    activeCapture: null,
    history: nextHistory,
    corrections: [correction, ...state.corrections],
  };

  return { ok: true, state: nextState };
}

export function validateCaptureResultForState(
  state: AuthoritativeGameState,
  captureId: string,
  roundId: string
): { valid: boolean; reason?: 'stale_round' | 'cancelled_or_inactive' } {
  if (state.currentRound.id !== roundId) {
    return { valid: false, reason: 'stale_round' };
  }
  const active: CaptureWindowState | null = state.activeCapture;
  if (
    !active ||
    active.captureId !== captureId ||
    active.status === 'cancelled' ||
    active.status === 'completed'
  ) {
    return { valid: false, reason: 'cancelled_or_inactive' };
  }
  return { valid: true };
}

export function exportHistoryCsv(state: AuthoritativeGameState): string {
  const allRounds = [state.currentRound, ...state.history];
  const rows: string[] = [
    'round_number,round_id,started_at,ended_at,draw_order,number,drawn_at,source,transcript',
  ];

  for (const round of allRounds) {
    if (round.draws.length === 0) {
      rows.push(
        [
          round.roundNumber,
          round.id,
          round.startedAt,
          round.endedAt ?? '',
          '',
          '',
          '',
          '',
          '',
        ].join(',')
      );
      continue;
    }
    round.draws.forEach((draw, idx) => {
      const safeTranscript = (draw.transcript ?? '').replace(/"/g, '""');
      rows.push(
        [
          round.roundNumber,
          round.id,
          round.startedAt,
          round.endedAt ?? '',
          idx + 1,
          draw.number,
          draw.drawnAt,
          draw.source,
          `"${safeTranscript}"`,
        ].join(',')
      );
    });
  }

  return rows.join('\n');
}

export function exportHistoryJson(state: AuthoritativeGameState): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      venue: 'World Family Bar · Fisterra',
      currentRound: state.currentRound,
      archivedRounds: state.history,
      corrections: state.corrections,
    },
    null,
    2
  );
}

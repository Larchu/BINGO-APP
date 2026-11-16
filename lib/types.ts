export type LanguageCode = 'es' | 'en' | 'de';
export type SpeechLanguageMode = 'auto' | LanguageCode;
export type AudioSourceMode = 'laptop' | 'phone';
export type AnimationIntensity = 'calm' | 'standard' | 'festive';
export type DeviceRole = 'moderator' | 'display' | 'laptop-bridge';

export interface DrawEntry {
  number: number;
  drawnAt: string;
  source: 'manual' | 'speech_confirmed' | 'speech_direct';
  transcript?: string;
  captureId?: string;
  deviceId?: string;
}

export interface CorrectionEntry {
  id: string;
  roundNumber: number;
  action: 'undo_draw' | 'manual_override' | 'round_reset' | 'history_cleared';
  number?: number;
  reason: string;
  timestamp: string;
  deviceId?: string;
}

export interface RoundRecord {
  id: string;
  roundNumber: number;
  startedAt: string;
  endedAt: string | null;
  draws: DrawEntry[];
}

export interface EventSettings {
  displayLanguage: LanguageCode;
  speechLanguage: SpeechLanguageMode;
  audioSource: AudioSourceMode;
  captureMaxSeconds: number;
  confirmationMode: boolean;
  directModeExplicitlyEnabled: boolean;
  ballDisplaySeconds: number;
  animationIntensity: AnimationIntensity;
  reducedMotion: boolean;
  beamerScale: number;
  beamerSafeMarginPx: number;
  soundEnabled: boolean;
  soundVolume: number;
}

export interface DeviceSettings {
  uiLanguage: LanguageCode;
  preferredAudioDeviceId: string;
}

export interface CaptureWindowState {
  captureId: string;
  roundId: string;
  source: AudioSourceMode;
  requestedByDeviceId: string;
  status: 'active' | 'transcribing' | 'proposal' | 'completed' | 'cancelled';
  startedAt: string;
  maxSeconds: number;
  proposal?: SpeechParseResult | null;
}

export type SpeechParseStatus =
  | 'valid'
  | 'already_drawn'
  | 'ambiguous'
  | 'out_of_range'
  | 'empty'
  | 'unintelligible';

export interface SpeechParseResult {
  status: SpeechParseStatus;
  number?: number;
  candidates?: number[];
  outOfRangeNumbers?: number[];
  transcript: string;
  detectedLanguage?: string;
}

export interface LiveSpeechState {
  active: boolean;
  source: AudioSourceMode;
  activatedByDeviceId?: string;
  startedAt?: string;
  interimTranscript?: string;
  lastTranscript?: string;
  lastStatus?: SpeechParseStatus | 'idle' | 'published' | 'error';
  lastNumber?: number;
  lastCandidates?: number[];
  errorCode?: string;
  errorMessage?: string;
}

export interface SessionConnectionSummary {
  moderatorCount: number;
  displayCount: number;
  laptopBridgeArmed: boolean;
  laptopBridgeDeviceName?: string;
}

export interface AuthoritativeGameState {
  sessionId: string;
  pairCode: string;
  stateVersion: number;
  currentRound: RoundRecord;
  lastDrawnNumber: number | null;
  lastDrawEventId: string | null;
  activeCapture: CaptureWindowState | null;
  liveSpeech: LiveSpeechState;
  settings: EventSettings;
  history: RoundRecord[];
  corrections: CorrectionEntry[];
  connections: SessionConnectionSummary;
}

export interface PublicDisplayState {
  sessionId: string;
  stateVersion: number;
  currentRound: RoundRecord;
  lastDrawnNumber: number | null;
  lastDrawEventId: string | null;
  settings: EventSettings;
  connections: SessionConnectionSummary;
}

export interface MutationResult {
  ok: boolean;
  state: AuthoritativeGameState;
  errorCode?:
    | 'INVALID_NUMBER'
    | 'ALREADY_DRAWN'
    | 'ROUND_MISMATCH'
    | 'NOTHING_TO_UNDO'
    | 'DUPLICATE_MUTATION'
    | 'STALE_CAPTURE'
    | 'UNAUTHORIZED'
    | 'CONFIRMATION_REQUIRED';
  message?: string;
}

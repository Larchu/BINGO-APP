'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AuthoritativeGameState,
  CaptureWindowState,
  DeviceRole,
  LanguageCode,
  PublicDisplayState,
  SpeechParseResult,
} from '@/lib/types';

export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

const STORAGE_PAIR_CODE_KEY = 'wf_bingo_pair_code';
const STORAGE_DEVICE_ID_KEY = 'wf_bingo_device_id';
const STORAGE_UI_LANG_KEY = 'wf_bingo_ui_lang';
const STORAGE_MIC_ID_KEY = 'wf_bingo_mic_device_id';

export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  let existing = window.localStorage.getItem(STORAGE_DEVICE_ID_KEY);
  if (!existing) {
    existing = `dev-${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(STORAGE_DEVICE_ID_KEY, existing);
  }
  return existing;
}

export function getStoredPairCode(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(STORAGE_PAIR_CODE_KEY) || '';
}

export function saveStoredPairCode(code: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_PAIR_CODE_KEY, code.trim());
}

export function clearStoredPairCode(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_PAIR_CODE_KEY);
}

export function getStoredUiLanguage(): LanguageCode {
  if (typeof window === 'undefined') return 'es';
  const saved = window.localStorage.getItem(STORAGE_UI_LANG_KEY);
  if (saved === 'es' || saved === 'en' || saved === 'de') return saved;
  return 'es';
}

export function saveStoredUiLanguage(lang: LanguageCode): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_UI_LANG_KEY, lang);
}

export function getStoredMicId(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(STORAGE_MIC_ID_KEY) || '';
}

export function saveStoredMicId(id: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_MIC_ID_KEY, id);
}

export interface RemoteCaptureEvent {
  type:
    | 'capture:command'
    | 'capture:resolved'
    | 'capture:level'
    | 'capture:error'
    | 'live:command'
    | 'live:transcript'
    | 'live:number'
    | 'live:error';
  action?: 'start' | 'stop' | 'cancel';
  source?: 'laptop' | 'phone';
  activatedByDeviceId?: string;
  capture?: CaptureWindowState;
  captureId?: string;
  level?: number;
  publishedDirectly?: boolean;
  number?: number;
  transcript?: string;
  interimTranscript?: string;
  result?: SpeechParseResult;
  errorCode?: string;
  errorMessage?: string;
}

export function useBingoSync<T extends AuthoritativeGameState | PublicDisplayState>(
  options: {
    role: DeviceRole;
    pairCode?: string;
    enabled?: boolean;
    onCaptureEvent?: (evt: RemoteCaptureEvent) => void;
  }
) {
  const { role, pairCode = '', enabled = true } = options;
  const [state, setState] = useState<T | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('reconnecting');
  const [unauthorized, setUnauthorized] = useState(false);
  const [remoteLevel, setRemoteLevel] = useState(0);
  const [liveInterim, setLiveInterim] = useState('');
  const [pairUrl, setPairUrl] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCaptureEventRef = useRef(options.onCaptureEvent);

  useEffect(() => {
    onCaptureEventRef.current = options.onCaptureEvent;
  }, [options.onCaptureEvent]);

  const fetchLatestState = useCallback(async () => {
    try {
      const url =
        role === 'display' ? '/api/state?mode=public' : '/api/state';
      const headers: HeadersInit = {};
      if (role !== 'display' && pairCode) {
        headers['x-pair-code'] = pairCode;
      }
      const res = await fetch(url, { headers, cache: 'no-store' });
      if (res.status === 401) {
        setUnauthorized(true);
        setConnectionStatus('disconnected');
        return;
      }
      if (!res.ok) return;
      const data = (await res.json()) as {
        ok: boolean;
        state: T;
        pairUrl?: string;
        qrDataUrl?: string;
      };
      if (data.ok && data.state) {
        setUnauthorized(false);
        setState(data.state);
        if (data.pairUrl) setPairUrl(data.pairUrl);
        if (data.qrDataUrl) setQrDataUrl(data.qrDataUrl);
      }
    } catch {
      // Handled by WS reconnect
    }
  }, [role, pairCode]);

  useEffect(() => {
    if (!enabled) return;
    if (role !== 'display' && !pairCode) {
      return;
    }

    let cancelled = false;
    const deviceId = getOrCreateDeviceId();

    const connect = () => {
      if (cancelled) return;

      const protocol =
        window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const deviceName =
        typeof navigator !== 'undefined'
          ? /Mobi|Android|iPhone/i.test(navigator.userAgent)
            ? 'Smartphone'
            : 'Laptop'
          : 'Device';

      const qs = new URLSearchParams({
        role,
        deviceId,
        deviceName,
        ...(role !== 'display' ? { pairCode } : {}),
      });

      const ws = new WebSocket(
        `${protocol}//${window.location.host}/ws?${qs.toString()}`
      );
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelled) {
          ws.close();
          return;
        }
        reconnectAttemptRef.current = 0;
        setConnectionStatus('connected');
        setUnauthorized(false);
        fetchLatestState();
      };

      ws.onmessage = (event) => {
        try {
          type WsIncoming =
            | { type: 'state:sync'; state: T }
            | RemoteCaptureEvent;
          const msg = JSON.parse(event.data as string) as WsIncoming;

          if (msg.type === 'state:sync' && msg.state) {
            setState(msg.state);
            return;
          }
          if (msg.type === 'capture:level' && typeof msg.level === 'number') {
            setRemoteLevel(msg.level);
            onCaptureEventRef.current?.(msg);
            return;
          }
          if (msg.type === 'live:transcript') {
            setLiveInterim(msg.interimTranscript ?? '');
            onCaptureEventRef.current?.(msg);
            return;
          }
          if (msg.type === 'live:number') {
            setLiveInterim('');
            onCaptureEventRef.current?.(msg);
            return;
          }
          if (
            msg.type === 'capture:command' ||
            msg.type === 'capture:resolved' ||
            msg.type === 'capture:error' ||
            msg.type === 'live:command' ||
            msg.type === 'live:error'
          ) {
            if (msg.type === 'live:command' && msg.action === 'stop') {
              setLiveInterim('');
            }
            onCaptureEventRef.current?.(msg);
          }
        } catch {
          // Ignore malformed WS message
        }
      };

      ws.onclose = () => {
        if (cancelled) return;
        setConnectionStatus('reconnecting');
        const delay = Math.min(
          8000,
          1000 * Math.pow(1.6, reconnectAttemptRef.current)
        );
        reconnectAttemptRef.current += 1;
        reconnectTimerRef.current = setTimeout(() => {
          fetchLatestState();
          connect();
        }, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    const initTimer = setTimeout(() => {
      fetchLatestState();
      connect();
    }, 0);

    const heartbeat = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 20000);

    return () => {
      cancelled = true;
      clearTimeout(initTimer);
      clearInterval(heartbeat);
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [role, pairCode, enabled, fetchLatestState]);

  const sendWsMessage = useCallback((payload: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }, []);

  const missingAuth = role !== 'display' && !pairCode;

  return {
    state,
    setState,
    connectionStatus: missingAuth ? 'disconnected' : connectionStatus,
    unauthorized: missingAuth || unauthorized,
    remoteLevel,
    liveInterim,
    pairUrl,
    qrDataUrl,
    refreshState: fetchLatestState,
    sendWsMessage,
  };
}

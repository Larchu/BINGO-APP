'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  Grid3X3,
  Laptop,
  Mic,
  MicOff,
  RotateCcw,
  Send,
  Smartphone,
  Square,
  Undo2,
  Wifi,
  WifiOff,
  X,
  AlertTriangle,
} from 'lucide-react';
import { useAudioCapture } from '@/hooks/useAudioCapture';
import {
  clearStoredPairCode,
  getOrCreateDeviceId,
  getStoredMicId,
  getStoredPairCode,
  getStoredUiLanguage,
  RemoteCaptureEvent,
  saveStoredPairCode,
  saveStoredUiLanguage,
  useBingoSync,
} from '@/hooks/useBingoSync';
import { MAX_BINGO_NUMBER, MIN_BINGO_NUMBER } from '@/lib/bingo-logic';
import { getDictionary } from '@/lib/i18n';
import { AuthoritativeGameState, LanguageCode, SpeechParseResult } from '@/lib/types';
import { DiscoBingoBall } from './DiscoBingoBall';
import { PairingGate } from './PairingGate';
import { TopNavBar } from './TopNavBar';
import { WorldFamilyFrame } from './WorldFamilyFrame';

export function ModeratorConsoleClient() {
  const searchParams = useSearchParams();
  const [pairCode, setPairCode] = useState<string>('');
  const [hydrated, setHydrated] = useState(false);
  const [uiLanguage, setUiLanguage] = useState<LanguageCode>('es');
  const [laptopBridgeArmed, setLaptopBridgeArmed] = useState(false);

  const [manualInput, setManualInput] = useState('');
  const [showQuickBoard, setShowQuickBoard] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [speechNotice, setSpeechNotice] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const [countdownSec, setCountdownSec] = useState<number>(0);

  const [confirmUndoOpen, setConfirmUndoOpen] = useState(false);
  const [confirmNewRoundOpen, setConfirmNewRoundOpen] = useState(false);

  const audio = useAudioCapture();
  const pairCodeRef = useRef(pairCode);
  useEffect(() => {
    pairCodeRef.current = pairCode;
  }, [pairCode]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setUiLanguage(getStoredUiLanguage());
      const urlPair = searchParams.get('pair')?.trim();
      if (urlPair) {
        saveStoredPairCode(urlPair);
        setPairCode(urlPair);
      } else {
        setPairCode(getStoredPairCode());
      }
      setHydrated(true);
    });
    return () => cancelAnimationFrame(raf);
  }, [searchParams]);

  const activeCaptureRef = useRef<{ captureId: string; roundId: string } | null>(null);
  const sendWsRef = useRef<(payload: Record<string, unknown>) => boolean>(() => false);

  const handleCaptureEvent = useCallback(
    (evt: RemoteCaptureEvent) => {
      if (evt.type === 'capture:error') {
        if (evt.errorCode === 'LAPTOP_BRIDGE_NOT_ARMED') {
          setSpeechNotice('LAPTOP_BRIDGE_NOT_ARMED');
        }
        return;
      }

      if (evt.type === 'capture:resolved') {
        if (evt.publishedDirectly && evt.result?.number) {
          setSpeechNotice(`DIRECT_PUBLISHED:${evt.result.number}`);
        } else {
          setSpeechNotice(null);
        }
        return;
      }

      if (evt.type === 'live:error') {
        audio.stopLivePcmStream();
        if (evt.errorCode === 'LAPTOP_BRIDGE_NOT_ARMED') {
          setSpeechNotice('LAPTOP_BRIDGE_NOT_ARMED');
        } else if (evt.errorCode === 'SPEECH_NOT_CONFIGURED') {
          setSpeechNotice('SPEECH_NOT_CONFIGURED');
        } else {
          setSpeechNotice('SPEECH_ERROR');
        }
        return;
      }

      if (evt.type === 'live:number') {
        if (evt.publishedDirectly && evt.number) {
          setSpeechNotice(`DIRECT_PUBLISHED:${evt.number}`);
        }
        return;
      }

      if (evt.type === 'live:command') {
        if (evt.action === 'start') {
          const shouldStreamHere =
            (evt.source === 'laptop' && laptopBridgeArmed) ||
            (evt.source === 'phone' &&
              evt.activatedByDeviceId === getOrCreateDeviceId());

          if (!shouldStreamHere) return;

          const preferredMic = getStoredMicId();
          audio
            .startLivePcmStream({
              preferredDeviceId: preferredMic || undefined,
              onPcmChunk: (base64Pcm, level) => {
                sendWsRef.current({
                  type: 'live:audio',
                  audio: base64Pcm,
                  level,
                });
              },
            })
            .then((started) => {
              if (!started) {
                sendWsRef.current({ type: 'live:stop' });
              }
            });
        } else if (evt.action === 'stop') {
          audio.stopLivePcmStream();
        }
        return;
      }

      if (evt.type === 'capture:command') {
        if (evt.action === 'start' && evt.capture) {
          const cap = evt.capture;
          const shouldRecordHere =
            (cap.source === 'laptop' && laptopBridgeArmed) ||
            (cap.source === 'phone' &&
              cap.requestedByDeviceId === getOrCreateDeviceId());

          if (!shouldRecordHere) return;

          activeCaptureRef.current = {
            captureId: cap.captureId,
            roundId: cap.roundId,
          };

          const preferredMic = getStoredMicId();
          audio.startCaptureWindow({
            preferredDeviceId: preferredMic || undefined,
            maxSeconds: cap.maxSeconds,
            onLevelTick: (level) => {
              sendWsRef.current({
                type: 'capture:level',
                captureId: cap.captureId,
                level,
              });
            },
            onFinished: async (payload) => {
              const target = activeCaptureRef.current;
              activeCaptureRef.current = null;
              if (!payload || !target) return;

              try {
                const res = await fetch('/api/speech', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-pair-code': pairCodeRef.current,
                  },
                  body: JSON.stringify({
                    action: 'transcribe',
                    captureId: target.captureId,
                    roundId: target.roundId,
                    deviceId: getOrCreateDeviceId(),
                    base64Audio: payload.base64Audio,
                    mimeType: payload.mimeType,
                  }),
                });
                const data = (await res.json()) as {
                  ok: boolean;
                  errorCode?: string;
                  staleIgnored?: boolean;
                };
                if (!res.ok) {
                  if (data.errorCode === 'SPEECH_NOT_CONFIGURED') {
                    setSpeechNotice('SPEECH_NOT_CONFIGURED');
                  } else {
                    setSpeechNotice('SPEECH_ERROR');
                  }
                } else if (data.staleIgnored) {
                  setSpeechNotice('STALE_IGNORED');
                }
              } catch {
                setSpeechNotice('SPEECH_ERROR');
              }
            },
          });
        } else if (evt.action === 'stop') {
          audio.stopCaptureAndProcess();
        } else if (evt.action === 'cancel') {
          activeCaptureRef.current = null;
          audio.cancelCapture();
        }
      }
    },
    [audio, laptopBridgeArmed]
  );

  const {
    state,
    setState,
    connectionStatus,
    unauthorized,
    remoteLevel,
    liveInterim,
    refreshState,
    sendWsMessage,
  } = useBingoSync<AuthoritativeGameState>({
    role: laptopBridgeArmed ? 'laptop-bridge' : 'moderator',
    pairCode,
    enabled: hydrated && Boolean(pairCode),
    onCaptureEvent: handleCaptureEvent,
  });

  const sendWsMessageRef = useRef(sendWsMessage);
  useEffect(() => {
    sendWsMessageRef.current = sendWsMessage;
  }, [sendWsMessage]);

  useEffect(() => {
    sendWsRef.current = (payload) => sendWsMessageRef.current(payload);
  }, []);

  // Countdown timer for active capture window
  useEffect(() => {
    const cap = state?.activeCapture;
    if (!cap || cap.status !== 'active') {
      return;
    }

    const updateRemaining = () => {
      const elapsed = (Date.now() - new Date(cap.startedAt).getTime()) / 1000;
      const rem = Math.max(0, Math.ceil(cap.maxSeconds - elapsed));
      setCountdownSec(rem);
    };
    const initId = setTimeout(updateRemaining, 0);
    const id = setInterval(updateRemaining, 250);
    return () => {
      clearTimeout(initId);
      clearInterval(id);
    };
  }, [state?.activeCapture]);

  const handleLanguageChange = (lang: LanguageCode) => {
    setUiLanguage(lang);
    saveStoredUiLanguage(lang);
  };

  const t = getDictionary(uiLanguage);

  const drawnSet = useMemo(() => {
    const s = new Set<number>();
    state?.currentRound.draws.forEach((d) => s.add(d.number));
    return s;
  }, [state?.currentRound.draws]);

  const recentDraws = useMemo(() => {
    return [...(state?.currentRound.draws ?? [])].reverse().slice(0, 12);
  }, [state?.currentRound.draws]);

  const publishNumber = async (
    num: number,
    source: 'manual' | 'speech_confirmed',
    extra?: { transcript?: string; captureId?: string; roundId?: string }
  ) => {
      setActionError(null);
      if (!Number.isInteger(num) || num < MIN_BINGO_NUMBER || num > MAX_BINGO_NUMBER) {
        setActionError(t.speechStatus.out_of_range);
        return;
      }
      if (drawnSet.has(num)) {
        setActionError(`${num} — ${t.moderator.alreadyDrawnTag}`);
        return;
      }

      setIsMutating(true);
      try {
        const mutationId = `mut-${getOrCreateDeviceId()}-${crypto.randomUUID()}`;
        const res = await fetch('/api/draw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-pair-code': pairCode,
        },
        body: JSON.stringify({
          number: num,
          source,
          transcript: extra?.transcript,
          captureId: extra?.captureId,
          roundId: extra?.roundId ?? state?.currentRound.id,
          deviceId: getOrCreateDeviceId(),
          mutationId,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        state?: AuthoritativeGameState;
        errorCode?: string;
        message?: string;
      };
      if (res.status === 401) {
        clearStoredPairCode();
        setPairCode('');
        return;
      }
      if (!res.ok || !data.ok) {
        setActionError(
          data.errorCode === 'ALREADY_DRAWN'
            ? t.speechStatus.already_drawn
            : data.message || t.connection.disconnected
        );
        return;
      }
      if (data.state) setState(data.state);
      setManualInput('');
      setSpeechNotice(null);
    } catch {
      setActionError(t.connection.disconnected);
    } finally {
      setIsMutating(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number.parseInt(manualInput.trim(), 10);
    publishNumber(parsed, 'manual');
  };

  const handleStartListening = async () => {
    setActionError(null);
    setSpeechNotice(null);
    if (!state) return;

    try {
      const res = await fetch('/api/speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-pair-code': pairCode,
        },
        body: JSON.stringify({
          action: 'start',
          deviceId: getOrCreateDeviceId(),
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        errorCode?: string;
        state?: AuthoritativeGameState;
      };
      if (!res.ok || !data.ok) {
        if (data.errorCode === 'LAPTOP_BRIDGE_NOT_ARMED') {
          setSpeechNotice('LAPTOP_BRIDGE_NOT_ARMED');
        } else {
          setSpeechNotice('SPEECH_ERROR');
        }
        return;
      }
      if (data.state) setState(data.state);
    } catch {
      setActionError(t.connection.disconnected);
    }
  };

  const handleStopListening = async () => {
    const capId = state?.activeCapture?.captureId;
    if (!capId) return;
    await fetch('/api/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-pair-code': pairCode,
      },
      body: JSON.stringify({ action: 'stop', captureId: capId }),
    }).catch(() => {});
  };

  const handleCancelCapture = async () => {
    const capId = state?.activeCapture?.captureId;
    await fetch('/api/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-pair-code': pairCode,
      },
      body: JSON.stringify({ action: 'cancel', captureId: capId }),
    }).catch(() => {});
    setSpeechNotice(null);
  };

  const pendingLiveStartRef = useRef(false);

  const sendWsMessageRefForLive = useRef(sendWsMessage);
  useEffect(() => {
    sendWsMessageRefForLive.current = sendWsMessage;
  }, [sendWsMessage]);

  const startLiveSessionNow = useCallback(async () => {
    if (sendWsMessageRefForLive.current({ type: 'live:start' })) {
      return;
    }
    try {
      const res = await fetch('/api/speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-pair-code': pairCodeRef.current,
        },
        body: JSON.stringify({
          action: 'live_start',
          deviceId: getOrCreateDeviceId(),
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        errorCode?: string;
        state?: AuthoritativeGameState;
      };
      if (data.state) setState(data.state);
      if (!res.ok || !data.ok) {
        if (data.errorCode === 'LAPTOP_BRIDGE_NOT_ARMED') {
          setSpeechNotice('LAPTOP_BRIDGE_NOT_ARMED');
        } else if (data.errorCode === 'SPEECH_NOT_CONFIGURED') {
          setSpeechNotice('SPEECH_NOT_CONFIGURED');
        } else {
          setSpeechNotice('SPEECH_ERROR');
        }
      }
    } catch {
      setActionError(t.connection.disconnected);
    }
  }, [setState, t.connection.disconnected]);

  useEffect(() => {
    if (
      pendingLiveStartRef.current &&
      laptopBridgeArmed &&
      state?.connections.laptopBridgeArmed &&
      connectionStatus === 'connected'
    ) {
      pendingLiveStartRef.current = false;
      const id = setTimeout(() => {
        startLiveSessionNow();
      }, 0);
      return () => clearTimeout(id);
    }
  }, [
    laptopBridgeArmed,
    state?.connections.laptopBridgeArmed,
    connectionStatus,
    startLiveSessionNow,
  ]);

  const handleToggleLiveVoice = async () => {
    setActionError(null);
    setSpeechNotice(null);
    if (!state) return;

    const currentlyActive = state.liveSpeech?.active;
    if (currentlyActive) {
      pendingLiveStartRef.current = false;
      audio.stopLivePcmStream();
      const sent = sendWsMessage({ type: 'live:stop' });
      if (!sent) {
        await fetch('/api/speech', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-pair-code': pairCode,
          },
          body: JSON.stringify({ action: 'live_stop' }),
        }).catch(() => {});
      }
      return;
    }

    // If on a non-mobile laptop/desktop and laptop audio source is chosen without an armed bridge,
    // auto-arm this laptop in 1 click and start live voice as soon as the bridge socket registers
    const isMobileUa =
      typeof navigator !== 'undefined' &&
      /Mobi|Android|iPhone/i.test(navigator.userAgent);
    if (
      state.settings.audioSource === 'laptop' &&
      !state.connections.laptopBridgeArmed &&
      !laptopBridgeArmed &&
      !isMobileUa
    ) {
      pendingLiveStartRef.current = true;
      setLaptopBridgeArmed(true);
      return;
    }

    await startLiveSessionNow();
  };

  const handleToggleAudioSourceQuick = async () => {
    if (!state || state.liveSpeech?.active) return;
    const nextSource =
      state.settings.audioSource === 'laptop' ? 'phone' : 'laptop';
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-pair-code': pairCode,
        },
        body: JSON.stringify({ audioSource: nextSource }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        state?: AuthoritativeGameState;
      };
      if (res.ok && data.state) {
        setState(data.state);
        setSpeechNotice(null);
      }
    } catch {
      setActionError(t.connection.disconnected);
    }
  };

  const handleToggleDirectMode = async () => {
    if (!state) return;
    const isCurrentlyDirect =
      !state.settings.confirmationMode && state.settings.directModeExplicitlyEnabled;
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-pair-code': pairCode,
        },
        body: JSON.stringify(
          isCurrentlyDirect
            ? { confirmationMode: true, directModeExplicitlyEnabled: false }
            : { confirmationMode: false, directModeExplicitlyEnabled: true }
        ),
      });
      const data = (await res.json()) as {
        ok: boolean;
        state?: AuthoritativeGameState;
      };
      if (res.ok && data.state) {
        setState(data.state);
      }
    } catch {
      setActionError(t.connection.disconnected);
    }
  };

  const handleUndoConfirm = async () => {
    setConfirmUndoOpen(false);
    setIsMutating(true);
    setActionError(null);
    try {
      const res = await fetch('/api/undo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-pair-code': pairCode,
        },
        body: JSON.stringify({
          deviceId: getOrCreateDeviceId(),
          reason: 'Moderator undo',
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        state?: AuthoritativeGameState;
      };
      if (res.ok && data.state) {
        setState(data.state);
      }
    } catch {
      setActionError(t.connection.disconnected);
    } finally {
      setIsMutating(false);
    }
  };

  const handleNewRoundConfirm = async () => {
    setConfirmNewRoundOpen(false);
    setIsMutating(true);
    setActionError(null);
    try {
      const res = await fetch('/api/round/new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-pair-code': pairCode,
        },
        body: JSON.stringify({
          confirmed: true,
          deviceId: getOrCreateDeviceId(),
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        state?: AuthoritativeGameState;
      };
      if (res.ok && data.state) {
        setState(data.state);
        setSpeechNotice(null);
      }
    } catch {
      setActionError(t.connection.disconnected);
    } finally {
      setIsMutating(false);
    }
  };

  const renderProposalFeedback = (proposal: SpeechParseResult) => {
    if (proposal.status === 'valid' && proposal.number) {
      return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <DiscoBingoBall
              number={proposal.number}
              size={84}
              reducedMotion={state?.settings.reducedMotion}
            />
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-[#8A620B]">
                {t.moderator.proposalTitle}
              </div>
              <div className="font-display text-3xl font-bold text-[#171C26] tabular-nums">
                {proposal.number}
              </div>
              {proposal.transcript && (
                <p className="text-xs text-[#4B5563] mt-0.5">
                  &ldquo;{proposal.transcript}&rdquo;
                </p>
              )}
            </div>
          </div>

          <div className="flex w-full sm:w-auto items-center gap-2.5">
            <button
              type="button"
              disabled={isMutating}
              onClick={() =>
                publishNumber(proposal.number!, 'speech_confirmed', {
                  transcript: proposal.transcript,
                  captureId: state?.activeCapture?.captureId,
                  roundId: state?.activeCapture?.roundId,
                })
              }
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 min-h-[52px] rounded-xl border border-[#B8860B] bg-gradient-to-b from-[#DFB64E] to-[#B6851B] px-5 py-3 text-sm font-bold text-white shadow-sm hover:brightness-105 transition"
            >
              <CheckCircle2 className="h-5 w-5" />
              <span>{t.moderator.confirmAndPublish}</span>
            </button>
            <button
              type="button"
              onClick={handleCancelCapture}
              className="inline-flex items-center justify-center min-h-[52px] rounded-xl border border-[#C9A13F]/50 bg-white px-4 py-3 text-sm font-semibold text-[#374151] hover:bg-[#FCF8EE] transition"
            >
              <X className="h-5 w-5" />
              <span className="sr-only sm:not-sr-only sm:ml-1.5">
                {t.moderator.discardProposal}
              </span>
            </button>
          </div>
        </div>
      );
    }

    // Ambiguous / already_drawn / out_of_range / empty / unintelligible
    return (
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-5 w-5 text-[#B45309] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-[#171C26]">
                {t.speechStatus[proposal.status]}
              </p>
              {proposal.transcript && (
                <p className="text-xs text-[#4B5563] mt-1">
                  &ldquo;{proposal.transcript}&rdquo;
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancelCapture}
            aria-label={t.moderator.discardProposal}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#C9A13F]/40 bg-white text-[#374151] hover:bg-[#FCF8EE]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {proposal.status === 'ambiguous' &&
          proposal.candidates &&
          proposal.candidates.length > 0 && (
            <div className="pt-1">
              <div className="text-xs font-medium text-[#6B7280] mb-2">
                {t.speechStatus.tapCandidateToUse}
              </div>
              <div className="flex flex-wrap gap-2">
                {proposal.candidates.map((cand) => {
                  const isUsed = drawnSet.has(cand);
                  return (
                    <button
                      key={cand}
                      type="button"
                      disabled={isUsed || isMutating}
                      onClick={() =>
                        publishNumber(cand, 'speech_confirmed', {
                          transcript: proposal.transcript,
                          captureId: state?.activeCapture?.captureId,
                          roundId: state?.activeCapture?.roundId,
                        })
                      }
                      className="min-h-[44px] min-w-[56px] rounded-lg border border-[#C9A13F] bg-white px-3 text-base font-bold text-[#171C26] hover:bg-[#FCF8EE] disabled:opacity-40 tabular-nums"
                    >
                      {cand}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
      </div>
    );
  };

  if (!hydrated) {
    return null;
  }

  return (
    <WorldFamilyFrame>
      <div className="mx-auto max-w-6xl">
        <TopNavBar
          activeRoute="moderator"
          uiLanguage={uiLanguage}
          onChangeUiLanguage={handleLanguageChange}
          pairCode={pairCode}
        />

        {!pairCode || unauthorized ? (
          <PairingGate
            uiLanguage={uiLanguage}
            onPaired={(newCode) => {
              saveStoredPairCode(newCode);
              setPairCode(newCode);
            }}
          />
        ) : (
          <div className="space-y-6">
            {/* Connection + Live Round Status Strip */}
            <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#C9A13F]/45 bg-[#FCFBF7] px-4 py-3">
              <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
                <span
                  className={`inline-flex items-center gap-1.5 font-semibold ${
                    connectionStatus === 'connected'
                      ? 'text-[#047857]'
                      : 'text-[#B91C1C]'
                  }`}
                >
                  {connectionStatus === 'connected' ? (
                    <Wifi className="h-4 w-4" />
                  ) : (
                    <WifiOff className="h-4 w-4" />
                  )}
                  <span>{t.connection[connectionStatus]}</span>
                </span>

                <span aria-hidden="true" className="text-[#C9A13F]">
                  ·
                </span>

                <span className="text-[#4B5563]">
                  {state?.settings.audioSource === 'laptop'
                    ? t.moderator.activeSourceLaptop
                    : t.moderator.activeSourcePhone}
                </span>

                {state?.settings.audioSource === 'laptop' && (
                  <>
                    <span aria-hidden="true" className="text-[#C9A13F]">
                      ·
                    </span>
                    <span
                      className={`font-medium ${
                        state.connections.laptopBridgeArmed
                          ? 'text-[#047857]'
                          : 'text-[#B45309]'
                      }`}
                    >
                      {state.connections.laptopBridgeArmed
                        ? t.connection.laptopBridgeReady
                        : t.connection.laptopBridgeMissing}
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-4 text-sm tabular-nums">
                <span>
                  {t.moderator.roundLabel}:{' '}
                  <strong className="font-display text-[#8A620B]">
                    {state?.currentRound.roundNumber ?? 1}
                  </strong>
                </span>
                <span>
                  {t.moderator.drawnCountLabel}:{' '}
                  <strong>{state?.currentRound.draws.length ?? 0} / 90</strong>
                </span>
                <span>
                  {t.moderator.lastNumberLabel}:{' '}
                  <strong className="font-display text-[#8A620B]">
                    {state?.lastDrawnNumber ?? '—'}
                  </strong>
                </span>
              </div>
            </section>

            {/* Disconnected Recovery Banner */}
            {connectionStatus !== 'connected' && (
              <div
                role="alert"
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#B91C1C]/40 bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]"
              >
                <span>{t.connection.reloadingState}</span>
                <button
                  type="button"
                  onClick={() => refreshState()}
                  className="inline-flex items-center gap-1.5 min-h-[40px] rounded-lg border border-[#B91C1C]/40 bg-white px-3 text-xs font-semibold text-[#991B1B]"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Sync</span>
                </button>
              </div>
            )}

            {/* Main 2-column Moderator Layout (Mobile stacks primary voice/manual controls at top) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Primary Voice Capture + Proposal + Manual Input */}
              <div className="lg:col-span-7 space-y-5">
                {/* Voice Capture Card: Primary Toggleable Real-Time Live Voice + Fast Single-Shot */}
                <section className="rounded-xl border border-[#C9A13F]/55 bg-white p-5 shadow-xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        data-testid="toggle-direct-mode-btn"
                        onClick={handleToggleDirectMode}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                          !state?.settings.confirmationMode &&
                          state?.settings.directModeExplicitlyEnabled
                            ? 'border-[#047857]/45 bg-[#ECFDF5] text-[#065F46]'
                            : 'border-[#C9A13F]/55 bg-[#FCF8EE] text-[#8A620B]'
                        }`}
                      >
                        <span>
                          {!state?.settings.confirmationMode &&
                          state?.settings.directModeExplicitlyEnabled
                            ? t.moderator.liveAutoPublishOn
                            : t.moderator.liveAutoPublishOff}
                        </span>
                      </button>

                      <button
                        type="button"
                        data-testid="toggle-audio-source-btn"
                        disabled={Boolean(state?.liveSpeech?.active)}
                        onClick={handleToggleAudioSourceQuick}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#C9A13F]/45 bg-[#FCFBF7] px-2.5 py-1 text-xs font-medium text-[#4B5563] hover:bg-[#F5EEDB] disabled:opacity-50 transition"
                      >
                        {state?.settings.audioSource === 'laptop' ? (
                          <Laptop className="h-3.5 w-3.5 text-[#8A620B]" />
                        ) : (
                          <Smartphone className="h-3.5 w-3.5 text-[#8A620B]" />
                        )}
                        <span>
                          {state?.settings.audioSource === 'laptop'
                            ? 'Laptop'
                            : 'Smartphone'}
                        </span>
                      </button>
                    </div>

                    <span className="text-xs text-[#6B7280]">
                      {state?.settings.speechLanguage === 'auto'
                        ? 'ES · EN · DE'
                        : state?.settings.speechLanguage.toUpperCase()}
                    </span>
                  </div>

                  {/* Primary Live Speech Recognition Activation Toggle */}
                  <div
                    className={`rounded-xl border-2 p-4 space-y-3 transition ${
                      state?.liveSpeech?.active
                        ? 'border-[#047857] bg-[#ECFDF5]/60'
                        : 'border-[#C9A13F]/45 bg-[#FCFBF7]'
                    }`}
                  >
                    <button
                      type="button"
                      data-testid="live-voice-toggle"
                      aria-pressed={Boolean(state?.liveSpeech?.active)}
                      onClick={handleToggleLiveVoice}
                      disabled={connectionStatus !== 'connected'}
                      className={`w-full min-h-[64px] inline-flex items-center justify-center gap-3 rounded-xl border px-6 py-4 text-base sm:text-lg font-bold shadow-sm transition active:scale-[0.99] disabled:opacity-50 ${
                        state?.liveSpeech?.active
                          ? 'border-[#991B1B] bg-[#991B1B] text-white hover:bg-[#7F1D1D]'
                          : 'border-[#B8860B] bg-gradient-to-b from-[#DFB64E] to-[#B6851B] text-white hover:brightness-105'
                      }`}
                    >
                      {state?.liveSpeech?.active ? (
                        <MicOff className="h-6 w-6 shrink-0" />
                      ) : (
                        <Mic className="h-6 w-6 shrink-0" />
                      )}
                      <span>
                        {state?.liveSpeech?.active
                          ? t.moderator.liveVoiceDeactivate
                          : t.moderator.liveVoiceActivate}
                      </span>
                    </button>

                    {state?.liveSpeech?.active ? (
                      <div className="space-y-3 pt-1">
                        <div className="flex items-center justify-between gap-2 text-xs sm:text-sm font-semibold text-[#065F46]">
                          <span className="inline-flex items-center gap-2">
                            <span
                              aria-hidden="true"
                              className="inline-block h-2.5 w-2.5 rounded-full bg-[#059669] animate-pulse"
                            />
                            <span>{t.moderator.liveVoiceActiveStatus}</span>
                          </span>
                          <span className="font-mono text-xs tabular-nums">
                            {audio.isLiveStreaming ? audio.inputLevel : remoteLevel}%
                          </span>
                        </div>

                        {/* Live Input Level Meter */}
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#D1FAE5]">
                          <div
                            className="h-full bg-gradient-to-r from-[#D4A024] to-[#047857] transition-all duration-100"
                            style={{
                              width: `${
                                audio.isLiveStreaming
                                  ? audio.inputLevel
                                  : remoteLevel
                              }%`,
                            }}
                          />
                        </div>

                        {/* Live Interim / Last Transcript Readout */}
                        {(liveInterim ||
                          state.liveSpeech.interimTranscript ||
                          state.liveSpeech.lastTranscript) && (
                          <div
                            data-testid="live-transcript-box"
                            className="rounded-lg border border-[#C9A13F]/45 bg-white px-3.5 py-2.5 text-sm space-y-1"
                          >
                            <div className="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#8A620B]">
                              <span>{t.moderator.liveTranscriptLabel}</span>
                              {state.liveSpeech.lastStatus === 'published' &&
                                state.liveSpeech.lastNumber && (
                                  <span className="font-bold text-[#047857]">
                                    #{state.liveSpeech.lastNumber}
                                  </span>
                                )}
                            </div>
                            <div className="font-medium text-[#171C26]">
                              {liveInterim ||
                                state.liveSpeech.interimTranscript ||
                                state.liveSpeech.lastTranscript}
                            </div>
                            {state.liveSpeech.lastStatus === 'already_drawn' && (
                              <div className="text-xs font-medium text-[#B45309]">
                                #{state.liveSpeech.lastNumber} —{' '}
                                {t.speechStatus.already_drawn}
                              </div>
                            )}
                            {state.liveSpeech.lastStatus === 'out_of_range' && (
                              <div className="text-xs font-medium text-[#B45309]">
                                {t.speechStatus.out_of_range}
                              </div>
                            )}
                            {state.liveSpeech.lastStatus === 'ambiguous' &&
                              state.liveSpeech.lastCandidates &&
                              state.liveSpeech.lastCandidates.length > 0 && (
                                <div className="pt-1 space-y-1.5">
                                  <div className="text-xs text-[#B45309]">
                                    {t.speechStatus.ambiguous}{' '}
                                    {t.speechStatus.tapCandidateToUse}
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {state.liveSpeech.lastCandidates.map((cand) => {
                                      const isUsed = drawnSet.has(cand);
                                      return (
                                        <button
                                          key={cand}
                                          type="button"
                                          disabled={isUsed || isMutating}
                                          onClick={() =>
                                            publishNumber(cand, 'speech_confirmed', {
                                              transcript:
                                                state.liveSpeech.lastTranscript,
                                            })
                                          }
                                          className="min-h-[40px] min-w-[48px] rounded-lg border border-[#C9A13F] bg-[#FCFBF7] px-3 text-sm font-bold text-[#171C26] hover:bg-[#F5EEDB] disabled:opacity-40 tabular-nums"
                                        >
                                          {cand}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-[#4B5563]">
                        {t.moderator.liveVoiceInactiveHint}
                      </p>
                    )}
                  </div>

                  {/* Secondary Single-Shot Fast Capture Controls */}
                  {state?.activeCapture?.status === 'active' ? (
                    <div className="space-y-4 rounded-xl border-2 border-[#B8860B] bg-[#FCF8EE] p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 text-[#8A620B] font-semibold">
                          <Mic className="h-5 w-5" />
                          <span>{t.moderator.listeningActive}</span>
                        </div>
                        <span className="font-mono text-lg font-bold text-[#171C26] tabular-nums">
                          {countdownSec}s
                        </span>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs text-[#6B7280] mb-1">
                          <span>{t.moderator.inputLevelLabel}</span>
                          <span className="tabular-nums">
                            {audio.isRecording ? audio.inputLevel : remoteLevel}%
                          </span>
                        </div>
                        <div className="h-3 w-full overflow-hidden rounded-full bg-[#E5DEC9]">
                          <div
                            className="h-full bg-gradient-to-r from-[#D4A024] to-[#047857] transition-all duration-100"
                            style={{
                              width: `${
                                audio.isRecording ? audio.inputLevel : remoteLevel
                              }%`,
                            }}
                          />
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          type="button"
                          onClick={handleStopListening}
                          className="flex-1 inline-flex items-center justify-center gap-2 min-h-[48px] rounded-xl border border-[#171C26] bg-[#171C26] px-4 text-sm font-semibold text-[#FDF6E2] hover:bg-[#252D3D]"
                        >
                          <Square className="h-4 w-4" />
                          <span>{t.moderator.stopListening}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelCapture}
                          className="inline-flex items-center justify-center gap-2 min-h-[48px] rounded-xl border border-[#C9A13F]/60 bg-white px-4 text-sm font-semibold text-[#374151] hover:bg-[#FCFBF7]"
                        >
                          <X className="h-4 w-4" />
                          <span>{t.moderator.cancelListening}</span>
                        </button>
                      </div>
                    </div>
                  ) : state?.activeCapture?.status === 'transcribing' ? (
                    <div className="flex items-center justify-between rounded-xl border border-[#C9A13F]/60 bg-[#FCFBF7] p-3.5">
                      <span className="text-sm font-semibold text-[#8A620B]">
                        {t.moderator.transcribing}
                      </span>
                      <button
                        type="button"
                        onClick={handleCancelCapture}
                        className="min-h-[38px] rounded-lg border border-[#C9A13F]/50 bg-white px-3 text-xs font-semibold text-[#374151]"
                      >
                        {t.moderator.cancelListening}
                      </button>
                    </div>
                  ) : (
                    !state?.liveSpeech?.active && (
                      <button
                        type="button"
                        data-testid="listen-number-btn"
                        onClick={handleStartListening}
                        disabled={connectionStatus !== 'connected'}
                        className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-[#C9A13F]/65 bg-[#FCFBF7] px-4 py-2.5 text-sm font-semibold text-[#8A620B] hover:bg-[#F5EEDB] disabled:opacity-50 transition"
                      >
                        <Mic className="h-4 w-4" />
                        <span>
                          {t.moderator.listenButton} ({t.moderator.singleShotFallback})
                        </span>
                      </button>
                    )
                  )}

                  {/* Proposal Confirmation Card */}
                  {state?.activeCapture?.status === 'proposal' &&
                    state.activeCapture.proposal && (
                      <div
                        data-testid="speech-proposal-card"
                        className="rounded-xl border-2 border-[#C9A13F] bg-[#FCFBF7] p-4"
                      >
                        {renderProposalFeedback(state.activeCapture.proposal)}
                      </div>
                    )}

                  {/* Audio / Speech Notices */}
                  {audio.micError && (
                    <p
                      role="alert"
                      className="rounded-lg border border-[#B91C1C]/35 bg-[#FEF2F2] px-3 py-2 text-xs sm:text-sm text-[#991B1B]"
                    >
                      {audio.micError === 'micPermissionDenied'
                        ? t.moderator.micPermissionDenied
                        : t.moderator.micNotFound}
                    </p>
                  )}

                  {speechNotice && (
                    <div
                      role="status"
                      className="rounded-lg border border-[#C9A13F]/50 bg-[#FCF8EE] px-3.5 py-2.5 text-xs sm:text-sm text-[#5C4611]"
                    >
                      {speechNotice === 'LAPTOP_BRIDGE_NOT_ARMED' &&
                        t.connection.laptopBridgeMissing}
                      {speechNotice === 'SPEECH_NOT_CONFIGURED' &&
                        t.speechStatus.speechNotConfigured}
                      {speechNotice === 'SPEECH_ERROR' &&
                        t.speechStatus.speechError}
                      {speechNotice === 'STALE_IGNORED' &&
                        t.speechStatus.stale_ignored}
                      {speechNotice.startsWith('DIRECT_PUBLISHED:') &&
                        `${t.speechStatus.valid} (${
                          speechNotice.split(':')[1]
                        })`}
                    </div>
                  )}

                  {/* Laptop Audio Bridge Arm Toggle (when Laptop is selected as source) */}
                  {state?.settings.audioSource === 'laptop' && (
                    <div className="pt-2 border-t border-[#C9A13F]/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="text-xs text-[#4B5563]">
                        <div className="font-semibold text-[#171C26] flex items-start gap-2">
                          <Laptop className="h-4 w-4 shrink-0 text-[#8A620B] mt-0.5" />
                          <span>{t.moderator.laptopBridgeHelp}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLaptopBridgeArmed((prev) => !prev)}
                        className={`inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-lg border text-xs font-semibold whitespace-nowrap shrink-0 transition ${
                          laptopBridgeArmed
                            ? 'border-[#047857] bg-[#ECFDF5] text-[#065F46]'
                            : 'border-[#C9A13F]/60 bg-[#FCFBF7] text-[#8A620B] hover:bg-[#F5EEDB]'
                        }`}
                      >
                        {laptopBridgeArmed ? (
                          <Mic className="h-4 w-4" />
                        ) : (
                          <MicOff className="h-4 w-4" />
                        )}
                        <span>
                          {laptopBridgeArmed
                            ? t.moderator.laptopBridgeArmed
                            : t.moderator.laptopBridgeArm}
                        </span>
                      </button>
                    </div>
                  )}

                  {state?.settings.audioSource === 'phone' && (
                    <div className="pt-2 border-t border-[#C9A13F]/25 flex items-center gap-2 text-xs text-[#4B5563]">
                      <Smartphone className="h-4 w-4 text-[#8A620B]" />
                      <span>{t.moderator.activeSourcePhone}</span>
                    </div>
                  )}
                </section>

                {/* Manual Entry Card (Always Available) */}
                <section className="rounded-xl border border-[#C9A13F]/45 bg-[#FCFBF7] p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-display text-base font-bold text-[#171C26]">
                      {t.moderator.manualEntryTitle}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setShowQuickBoard((v) => !v)}
                      className="inline-flex items-center gap-1.5 min-h-[40px] rounded-lg border border-[#C9A13F]/50 bg-white px-3 text-xs font-semibold text-[#8A620B] hover:bg-[#F5EEDB] whitespace-nowrap shrink-0"
                    >
                      <Grid3X3 className="h-4 w-4" />
                      <span>
                        {showQuickBoard
                          ? t.moderator.hideQuickBoard
                          : t.moderator.showQuickBoard}
                      </span>
                    </button>
                  </div>

                  <form onSubmit={handleManualSubmit} className="flex gap-3">
                    <label htmlFor="manual-number-input" className="sr-only">
                      {t.moderator.manualEntryTitle}
                    </label>
                    <input
                      id="manual-number-input"
                      data-testid="manual-number-input"
                      type="number"
                      min={1}
                      max={90}
                      inputMode="numeric"
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      placeholder={t.moderator.manualInputPlaceholder}
                      className="w-32 sm:w-40 min-h-[52px] rounded-xl border border-[#C9A13F]/65 bg-white px-4 text-center font-display text-2xl font-bold text-[#171C26] tabular-nums focus:border-[#9E7312] focus:outline-none focus:ring-2 focus:ring-[#C9A13F]/30"
                    />
                    <button
                      type="submit"
                      data-testid="manual-publish-btn"
                      disabled={isMutating || !manualInput.trim()}
                      className="flex-1 inline-flex items-center justify-center gap-2 min-h-[52px] rounded-xl border border-[#171C26] bg-[#171C26] px-5 text-sm font-semibold text-[#FDF6E2] hover:bg-[#252D3D] disabled:opacity-45 transition"
                    >
                      <Send className="h-4 w-4" />
                      <span>{t.moderator.publishManual}</span>
                    </button>
                  </form>

                  {actionError && (
                    <p
                      role="alert"
                      className="text-sm font-medium text-[#B91C1C]"
                    >
                      {actionError}
                    </p>
                  )}

                  {showQuickBoard && (
                    <div
                      data-testid="quick-board-grid"
                      className="grid grid-cols-9 sm:grid-cols-10 gap-1.5 pt-2 border-t border-[#C9A13F]/25"
                    >
                      {Array.from({ length: 90 }, (_, idx) => idx + 1).map(
                        (num) => {
                          const isDrawn = drawnSet.has(num);
                          return (
                            <button
                              key={num}
                              type="button"
                              disabled={isDrawn || isMutating}
                              onClick={() => publishNumber(num, 'manual')}
                              className={`min-h-[42px] rounded-md border text-sm font-bold tabular-nums transition ${
                                isDrawn
                                  ? 'border-[#C9A13F]/30 bg-[#171C26]/10 text-[#9CA3AF] line-through cursor-not-allowed'
                                  : 'border-[#C9A13F]/45 bg-white text-[#171C26] hover:border-[#B8860B] hover:bg-[#FCF8EE]'
                              }`}
                            >
                              {num}
                            </button>
                          );
                        }
                      )}
                    </div>
                  )}
                </section>
              </div>

              {/* Right Column: Recent Draws + Round Controls */}
              <div className="lg:col-span-5 space-y-5">
                {/* Recent Draws */}
                <section className="rounded-xl border border-[#C9A13F]/45 bg-[#FCFBF7] p-5 space-y-4">
                  <h2 className="font-display text-base font-bold text-[#171C26]">
                    {t.moderator.recentDrawsTitle}
                  </h2>

                  {recentDraws.length === 0 ? (
                    <p className="text-sm text-[#6B7280] py-4">
                      {t.moderator.noDrawsYet}
                    </p>
                  ) : (
                    <div
                      data-testid="recent-draws-list"
                      className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-4 gap-2 tabular-nums"
                    >
                      {recentDraws.map((d, idx) => (
                        <div
                          key={`${d.number}-${d.drawnAt}`}
                          className={`flex flex-col items-center justify-center rounded-lg border py-2 px-1 ${
                            idx === 0
                              ? 'border-[#B8860B] bg-[#171C26] text-[#FDF6E2]'
                              : 'border-[#C9A13F]/35 bg-white text-[#171C26]'
                          }`}
                        >
                          <span className="font-display text-lg font-bold leading-none">
                            {d.number}
                          </span>
                          <span
                            className={`text-[10px] mt-1 ${
                              idx === 0 ? 'text-[#F8E29B]' : 'text-[#6B7280]'
                            }`}
                          >
                            {new Date(d.drawnAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Undo & New Round Actions */}
                  <div className="pt-3 border-t border-[#C9A13F]/25 flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      data-testid="undo-draw-btn"
                      disabled={
                        isMutating || (state?.currentRound.draws.length ?? 0) === 0
                      }
                      onClick={() => setConfirmUndoOpen(true)}
                      className="flex-1 inline-flex items-center justify-center gap-2 min-h-[48px] rounded-xl border border-[#C9A13F]/70 bg-white px-4 text-sm font-semibold text-[#8A620B] hover:bg-[#FCF8EE] disabled:opacity-40 transition"
                    >
                      <Undo2 className="h-4 w-4" />
                      <span>{t.moderator.undoLastDraw}</span>
                    </button>

                    <button
                      type="button"
                      data-testid="new-round-btn"
                      disabled={isMutating}
                      onClick={() => setConfirmNewRoundOpen(true)}
                      className="flex-1 inline-flex items-center justify-center gap-2 min-h-[48px] rounded-xl border border-[#B91C1C]/45 bg-[#FEF2F2] px-4 text-sm font-semibold text-[#991B1B] hover:bg-[#FEE2E2] disabled:opacity-40 transition"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>{t.moderator.newRound}</span>
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Undo Confirmation Modal */}
      {confirmUndoOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="undo-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-[#C9A13F] bg-white p-6 shadow-xl space-y-4">
            <h2
              id="undo-dialog-title"
              className="font-display text-lg font-bold text-[#171C26]"
            >
              {t.moderator.undoConfirmTitle}
            </h2>
            <p className="text-sm text-[#4B5563]">
              {t.moderator.undoConfirmDesc}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmUndoOpen(false)}
                className="min-h-[44px] rounded-lg border border-[#C9A13F]/50 bg-white px-4 text-sm font-semibold text-[#374151]"
              >
                {t.moderator.cancelAction}
              </button>
              <button
                type="button"
                data-testid="confirm-undo-btn"
                onClick={handleUndoConfirm}
                className="min-h-[44px] rounded-lg bg-[#171C26] px-4 text-sm font-semibold text-[#FDF6E2]"
              >
                {t.moderator.confirmAction}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Round Confirmation Modal */}
      {confirmNewRoundOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-round-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-[#C9A13F] bg-white p-6 shadow-xl space-y-4">
            <h2
              id="new-round-dialog-title"
              className="font-display text-lg font-bold text-[#171C26]"
            >
              {t.moderator.newRoundConfirmTitle}
            </h2>
            <p className="text-sm text-[#4B5563]">
              {t.moderator.newRoundConfirmDesc}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmNewRoundOpen(false)}
                className="min-h-[44px] rounded-lg border border-[#C9A13F]/50 bg-white px-4 text-sm font-semibold text-[#374151]"
              >
                {t.moderator.cancelAction}
              </button>
              <button
                type="button"
                data-testid="confirm-new-round-btn"
                onClick={handleNewRoundConfirm}
                className="min-h-[44px] rounded-lg bg-[#991B1B] px-4 text-sm font-semibold text-white"
              >
                {t.moderator.confirmAction}
              </button>
            </div>
          </div>
        </div>
      )}
    </WorldFamilyFrame>
  );
}

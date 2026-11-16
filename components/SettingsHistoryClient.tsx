'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Check,
  Copy,
  Download,
  Mic,
  Monitor,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Volume2,
} from 'lucide-react';
import { useAudioCapture } from '@/hooks/useAudioCapture';
import {
  getStoredMicId,
  getStoredPairCode,
  getStoredUiLanguage,
  saveStoredMicId,
  saveStoredPairCode,
  saveStoredUiLanguage,
  useBingoSync,
} from '@/hooks/useBingoSync';
import { getDictionary } from '@/lib/i18n';
import {
  AnimationIntensity,
  AudioSourceMode,
  AuthoritativeGameState,
  EventSettings,
  LanguageCode,
  SpeechLanguageMode,
} from '@/lib/types';
import { PairingGate } from './PairingGate';
import { TopNavBar } from './TopNavBar';
import { WorldFamilyFrame } from './WorldFamilyFrame';

export function SettingsHistoryClient() {
  const searchParams = useSearchParams();
  const [pairCode, setPairCode] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [uiLanguage, setUiLanguage] = useState<LanguageCode>('es');
  const [localMicId, setLocalMicId] = useState('');
  const [saveNotice, setSaveNotice] = useState(false);
  const [copied, setCopied] = useState(false);

  const [directConfirmOpen, setDirectConfirmOpen] = useState(false);
  const [clearHistoryConfirmOpen, setClearHistoryConfirmOpen] = useState(false);

  const audio = useAudioCapture();

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setUiLanguage(getStoredUiLanguage());
      setLocalMicId(getStoredMicId());
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

  const { state, setState, unauthorized, pairUrl, qrDataUrl } =
    useBingoSync<AuthoritativeGameState>({
      role: 'moderator',
      pairCode,
      enabled: hydrated && Boolean(pairCode),
    });

  const t = getDictionary(uiLanguage);

  const handleUiLanguageChange = (lang: LanguageCode) => {
    setUiLanguage(lang);
    saveStoredUiLanguage(lang);
  };

  const handleLocalMicChange = (micId: string) => {
    setLocalMicId(micId);
    saveStoredMicId(micId);
  };

  const updateSharedSettings = async (patch: Partial<EventSettings>) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-pair-code': pairCode,
        },
        body: JSON.stringify(patch),
      });
      const data = (await res.json()) as {
        ok: boolean;
        state?: AuthoritativeGameState;
      };
      if (res.ok && data.state) {
        setState(data.state);
        setSaveNotice(true);
        setTimeout(() => setSaveNotice(false), 2000);
      }
    } catch {
      // Handled by sync banner
    }
  };

  const handleRegeneratePairCode = async () => {
    const res = await fetch('/api/state', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-pair-code': pairCode,
      },
      body: JSON.stringify({ action: 'regenerate' }),
    });
    const data = (await res.json()) as {
      ok: boolean;
      state?: AuthoritativeGameState;
    };
    if (res.ok && data.state) {
      saveStoredPairCode(data.state.pairCode);
      setPairCode(data.state.pairCode);
      setState(data.state);
    }
  };

  const handleClearHistoryConfirm = async () => {
    setClearHistoryConfirmOpen(false);
    const res = await fetch('/api/history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-pair-code': pairCode,
      },
      body: JSON.stringify({ action: 'clear', confirmed: true }),
    });
    const data = (await res.json()) as {
      ok: boolean;
      state?: AuthoritativeGameState;
    };
    if (res.ok && data.state) {
      setState(data.state);
    }
  };

  const copyPairingLink = async () => {
    if (!pairUrl) return;
    try {
      await navigator.clipboard.writeText(pairUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked
    }
  };

  const downloadExport = (format: 'csv' | 'json') => {
    const url = `/api/history?format=${format}&pairCode=${encodeURIComponent(
      pairCode
    )}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = `world-family-bingo-history.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!hydrated) return null;

  const settings = state?.settings;

  return (
    <WorldFamilyFrame>
      <div className="mx-auto max-w-6xl">
        <TopNavBar
          activeRoute="settings"
          uiLanguage={uiLanguage}
          onChangeUiLanguage={handleUiLanguageChange}
          pairCode={pairCode}
        />

        {!pairCode || unauthorized ? (
          <PairingGate
            uiLanguage={uiLanguage}
            onPaired={(code) => {
              saveStoredPairCode(code);
              setPairCode(code);
            }}
          />
        ) : (
          <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#C9A13F]/30 pb-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#8A620B]">
                  <ShieldCheck className="h-4 w-4" />
                  <span>{t.settings.protectedNotice}</span>
                </div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold gold-gradient-text mt-1">
                  {t.settings.title}
                </h1>
              </div>

              {saveNotice && (
                <div
                  role="status"
                  className="inline-flex items-center gap-2 rounded-lg border border-[#047857]/40 bg-[#ECFDF5] px-3.5 py-2 text-xs font-semibold text-[#065F46]"
                >
                  <Check className="h-4 w-4" />
                  <span>{t.settings.saveSuccess}</span>
                </div>
              )}
            </div>

            {/* Section 1: Personal Device Preferences vs Shared Event Settings */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Personal Device Settings */}
              <section className="lg:col-span-5 rounded-xl border border-[#C9A13F]/50 bg-[#FCFBF7] p-5 space-y-5">
                <div>
                  <h2 className="font-display text-lg font-bold text-[#171C26]">
                    {t.settings.deviceSectionTitle}
                  </h2>
                  <p className="text-xs text-[#6B7280] mt-1">
                    {t.settings.deviceSectionDesc}
                  </p>
                </div>

                {/* Host UI Language */}
                <div>
                  <label
                    htmlFor="ui-lang-select"
                    className="block text-sm font-semibold text-[#171C26] mb-1.5"
                  >
                    {t.settings.uiLanguageLabel}
                  </label>
                  <select
                    id="ui-lang-select"
                    value={uiLanguage}
                    onChange={(e) =>
                      handleUiLanguageChange(e.target.value as LanguageCode)
                    }
                    className="w-full min-h-[44px] rounded-lg border border-[#C9A13F]/60 bg-white px-3 text-sm text-[#171C26]"
                  >
                    <option value="es">{t.languages.es}</option>
                    <option value="en">{t.languages.en}</option>
                    <option value="de">{t.languages.de}</option>
                  </select>
                </div>

                {/* Local Microphone Input & Mic Test */}
                <div className="space-y-3 pt-2 border-t border-[#C9A13F]/25">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="mic-device-select"
                      className="text-sm font-semibold text-[#171C26]"
                    >
                      {t.settings.micDeviceLabel}
                    </label>
                    <button
                      type="button"
                      onClick={() => audio.refreshDevices()}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#8A620B] hover:underline"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>{t.settings.refreshMics}</span>
                    </button>
                  </div>

                  <select
                    id="mic-device-select"
                    value={localMicId}
                    onChange={(e) => handleLocalMicChange(e.target.value)}
                    className="w-full min-h-[44px] rounded-lg border border-[#C9A13F]/60 bg-white px-3 text-sm text-[#171C26]"
                  >
                    <option value="">{t.settings.defaultMic}</option>
                    {audio.devices.map((dev) => (
                      <option key={dev.deviceId} value={dev.deviceId}>
                        {dev.label}
                      </option>
                    ))}
                  </select>

                  <p className="text-xs text-[#6B7280]">
                    {t.settings.micTestHint}
                  </p>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        audio.isTestingMic
                          ? audio.stopMicTest()
                          : audio.startMicTest(localMicId || undefined)
                      }
                      className={`inline-flex items-center gap-2 min-h-[44px] rounded-lg border px-4 text-xs font-semibold transition ${
                        audio.isTestingMic
                          ? 'border-[#B91C1C] bg-[#FEF2F2] text-[#991B1B]'
                          : 'border-[#B8860B] bg-white text-[#8A620B] hover:bg-[#FCF8EE]'
                      }`}
                    >
                      <Mic className="h-4 w-4" />
                      <span>
                        {audio.isTestingMic
                          ? t.settings.micTestStop
                          : t.settings.micTestStart}
                      </span>
                    </button>

                    <div className="flex-1">
                      <div className="h-3 w-full overflow-hidden rounded-full bg-[#E5DEC9]">
                        <div
                          className="h-full bg-gradient-to-r from-[#D4A024] to-[#047857] transition-all duration-100"
                          style={{ width: `${audio.inputLevel}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-10 text-right font-mono text-xs tabular-nums text-[#374151]">
                      {audio.inputLevel}%
                    </span>
                  </div>

                  {audio.micError && (
                    <p className="text-xs font-medium text-[#B91C1C]">
                      {audio.micError === 'micPermissionDenied'
                        ? t.moderator.micPermissionDenied
                        : t.moderator.micNotFound}
                    </p>
                  )}
                </div>

                {/* Pairing & Beamer Guide */}
                <div className="space-y-4 pt-4 border-t border-[#C9A13F]/30">
                  <h3 className="font-display text-base font-bold text-[#171C26]">
                    {t.settings.pairingSectionTitle}
                  </h3>
                  <div className="flex items-center gap-4">
                    {qrDataUrl && (
                      <img
                        src={qrDataUrl}
                        alt={t.hub.pairingTitle}
                        className="h-24 w-24 rounded-lg border border-[#C9A13F]/50 bg-white p-1.5 object-contain shrink-0"
                      />
                    )}
                    <div className="space-y-2 min-w-0">
                      <div className="font-mono text-xl font-bold tracking-[0.18em] text-[#8A620B] tabular-nums">
                        {pairCode}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={copyPairingLink}
                          className="inline-flex items-center gap-1.5 min-h-[38px] rounded-lg border border-[#C9A13F]/50 bg-white px-3 text-xs font-semibold text-[#171C26]"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          <span>
                            {copied
                              ? t.settings.linkCopied
                              : t.settings.copyPairLink}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRegeneratePairCode}
                          className="inline-flex items-center gap-1.5 min-h-[38px] rounded-lg border border-[#C9A13F]/50 bg-white px-3 text-xs font-semibold text-[#8A620B]"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          <span>{t.settings.regeneratePairCode}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Shared Event Settings */}
              {settings && (
                <section className="lg:col-span-7 rounded-xl border border-[#C9A13F]/50 bg-white p-5 sm:p-6 space-y-5">
                  <div>
                    <h2 className="font-display text-lg font-bold text-[#171C26]">
                      {t.settings.eventSectionTitle}
                    </h2>
                    <p className="text-xs text-[#6B7280] mt-1">
                      {t.settings.eventSectionDesc}
                    </p>
                  </div>

                  {/* Languages */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="display-lang-select"
                        className="block text-sm font-semibold text-[#171C26] mb-1.5"
                      >
                        {t.settings.displayLanguageLabel}
                      </label>
                      <select
                        id="display-lang-select"
                        value={settings.displayLanguage}
                        onChange={(e) =>
                          updateSharedSettings({
                            displayLanguage: e.target.value as LanguageCode,
                          })
                        }
                        className="w-full min-h-[44px] rounded-lg border border-[#C9A13F]/60 bg-[#FCFBF7] px-3 text-sm text-[#171C26]"
                      >
                        <option value="es">{t.languages.es}</option>
                        <option value="en">{t.languages.en}</option>
                        <option value="de">{t.languages.de}</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="speech-lang-select"
                        className="block text-sm font-semibold text-[#171C26] mb-1.5"
                      >
                        {t.settings.speechLanguageLabel}
                      </label>
                      <select
                        id="speech-lang-select"
                        value={settings.speechLanguage}
                        onChange={(e) =>
                          updateSharedSettings({
                            speechLanguage: e.target.value as SpeechLanguageMode,
                          })
                        }
                        className="w-full min-h-[44px] rounded-lg border border-[#C9A13F]/60 bg-[#FCFBF7] px-3 text-sm text-[#171C26]"
                      >
                        <option value="auto">{t.settings.speechAuto}</option>
                        <option value="es">{t.settings.speechEs}</option>
                        <option value="en">{t.settings.speechEn}</option>
                        <option value="de">{t.settings.speechDe}</option>
                      </select>
                    </div>
                  </div>

                  {/* Audio Source */}
                  <div className="pt-3 border-t border-[#C9A13F]/25 space-y-2">
                    <label className="block text-sm font-semibold text-[#171C26]">
                      {t.settings.audioSourceLabel}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(['laptop', 'phone'] as AudioSourceMode[]).map((src) => (
                        <button
                          key={src}
                          type="button"
                          onClick={() =>
                            updateSharedSettings({ audioSource: src })
                          }
                          className={`min-h-[48px] rounded-xl border px-4 py-2.5 text-left text-sm font-medium transition ${
                            settings.audioSource === src
                              ? 'border-[#B8860B] bg-[#FCF8EE] text-[#171C26] ring-1 ring-[#B8860B]'
                              : 'border-[#C9A13F]/35 bg-white text-[#4B5563]'
                          }`}
                        >
                          {src === 'laptop'
                            ? t.settings.audioSourceLaptop
                            : t.settings.audioSourcePhone}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-[#6B7280]">
                      {t.settings.audioSourceHelp}
                    </p>
                  </div>

                  {/* Publish Mode: Confirmation vs Explicit Direct Mode */}
                  <div className="pt-3 border-t border-[#C9A13F]/25 space-y-2">
                    <div className="text-sm font-semibold text-[#171C26]">
                      {t.settings.publishModeLabel}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          updateSharedSettings({
                            confirmationMode: true,
                            directModeExplicitlyEnabled: false,
                          })
                        }
                        className={`rounded-xl border p-3.5 text-left transition ${
                          settings.confirmationMode
                            ? 'border-[#B8860B] bg-[#FCF8EE] ring-1 ring-[#B8860B]'
                            : 'border-[#C9A13F]/35 bg-white'
                        }`}
                      >
                        <div className="text-sm font-semibold text-[#171C26]">
                          {t.settings.confirmationModeLabel}
                        </div>
                        <div className="text-xs text-[#4B5563] mt-1">
                          {t.settings.confirmationModeDesc}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (settings.confirmationMode) {
                            setDirectConfirmOpen(true);
                          }
                        }}
                        className={`rounded-xl border p-3.5 text-left transition ${
                          !settings.confirmationMode &&
                          settings.directModeExplicitlyEnabled
                            ? 'border-[#B8860B] bg-[#FCF8EE] ring-1 ring-[#B8860B]'
                            : 'border-[#C9A13F]/35 bg-white'
                        }`}
                      >
                        <div className="text-sm font-semibold text-[#171C26]">
                          {t.settings.directModeLabel}
                        </div>
                        <div className="text-xs text-[#4B5563] mt-1">
                          {t.settings.directModeDesc}
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Timing & Display Tuning */}
                  <div className="pt-3 border-t border-[#C9A13F]/25 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="capture-sec-input"
                        className="flex items-center justify-between gap-2 text-sm font-semibold text-[#171C26] mb-1.5"
                      >
                        <span>{t.settings.captureDurationLabel}</span>
                        <span className="font-mono text-[#8A620B] tabular-nums whitespace-nowrap shrink-0">
                          {settings.captureMaxSeconds} {t.settings.secondsUnit}
                        </span>
                      </label>
                      <input
                        id="capture-sec-input"
                        type="range"
                        min={2}
                        max={12}
                        step={1}
                        value={settings.captureMaxSeconds}
                        onChange={(e) =>
                          updateSharedSettings({
                            captureMaxSeconds: Number(e.target.value),
                          })
                        }
                        className="w-full accent-[#B8860B]"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="ball-sec-input"
                        className="flex items-center justify-between gap-2 text-sm font-semibold text-[#171C26] mb-1.5"
                      >
                        <span>{t.settings.ballDurationLabel}</span>
                        <span className="font-mono text-[#8A620B] tabular-nums whitespace-nowrap shrink-0">
                          {settings.ballDisplaySeconds} {t.settings.secondsUnit}
                        </span>
                      </label>
                      <input
                        id="ball-sec-input"
                        type="range"
                        min={2}
                        max={10}
                        step={1}
                        value={settings.ballDisplaySeconds}
                        onChange={(e) =>
                          updateSharedSettings({
                            ballDisplaySeconds: Number(e.target.value),
                          })
                        }
                        className="w-full accent-[#B8860B]"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="beamer-scale-input"
                        className="flex items-center justify-between gap-2 text-sm font-semibold text-[#171C26] mb-1.5"
                      >
                        <span>{t.settings.beamerScaleLabel}</span>
                        <span className="font-mono text-[#8A620B] tabular-nums whitespace-nowrap shrink-0">
                          {Math.round(settings.beamerScale * 100)}%
                        </span>
                      </label>
                      <input
                        id="beamer-scale-input"
                        type="range"
                        min={0.85}
                        max={1.25}
                        step={0.05}
                        value={settings.beamerScale}
                        onChange={(e) =>
                          updateSharedSettings({
                            beamerScale: Number(e.target.value),
                          })
                        }
                        className="w-full accent-[#B8860B]"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="beamer-margin-input"
                        className="flex items-center justify-between gap-2 text-sm font-semibold text-[#171C26] mb-1.5"
                      >
                        <span>{t.settings.beamerMarginsLabel}</span>
                        <span className="font-mono text-[#8A620B] tabular-nums whitespace-nowrap shrink-0">
                          {settings.beamerSafeMarginPx}px
                        </span>
                      </label>
                      <input
                        id="beamer-margin-input"
                        type="range"
                        min={0}
                        max={40}
                        step={4}
                        value={settings.beamerSafeMarginPx}
                        onChange={(e) =>
                          updateSharedSettings({
                            beamerSafeMarginPx: Number(e.target.value),
                          })
                        }
                        className="w-full accent-[#B8860B]"
                      />
                    </div>
                  </div>

                  {/* Animation & Sound */}
                  <div className="pt-3 border-t border-[#C9A13F]/25 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    <div>
                      <label
                        htmlFor="anim-intensity-select"
                        className="block text-sm font-semibold text-[#171C26] mb-1.5"
                      >
                        {t.settings.animationIntensityLabel}
                      </label>
                      <select
                        id="anim-intensity-select"
                        value={settings.animationIntensity}
                        onChange={(e) =>
                          updateSharedSettings({
                            animationIntensity: e.target
                              .value as AnimationIntensity,
                          })
                        }
                        className="w-full min-h-[44px] rounded-lg border border-[#C9A13F]/60 bg-[#FCFBF7] px-3 text-sm text-[#171C26]"
                      >
                        <option value="calm">{t.settings.intensityCalm}</option>
                        <option value="standard">
                          {t.settings.intensityStandard}
                        </option>
                        <option value="festive">
                          {t.settings.intensityFestive}
                        </option>
                      </select>
                    </div>

                    <div className="space-y-2.5 pt-2">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.reducedMotion}
                          onChange={(e) =>
                            updateSharedSettings({
                              reducedMotion: e.target.checked,
                            })
                          }
                          className="h-5 w-5 accent-[#B8860B]"
                        />
                        <span className="text-sm font-medium text-[#171C26]">
                          {t.settings.reducedMotionLabel}
                        </span>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.soundEnabled}
                          onChange={(e) =>
                            updateSharedSettings({
                              soundEnabled: e.target.checked,
                            })
                          }
                          className="h-5 w-5 accent-[#B8860B]"
                        />
                        <span className="text-sm font-medium text-[#171C26] flex items-center gap-1.5">
                          <Volume2 className="h-4 w-4 text-[#8A620B]" />
                          <span>{t.settings.soundEffectsLabel}</span>
                        </span>
                      </label>

                      {settings.soundEnabled && (
                        <div className="pl-8">
                          <label
                            htmlFor="sound-vol-input"
                            className="flex justify-between text-xs text-[#6B7280] mb-1"
                          >
                            <span>{t.settings.soundVolumeLabel}</span>
                            <span className="tabular-nums">
                              {Math.round(settings.soundVolume * 100)}%
                            </span>
                          </label>
                          <input
                            id="sound-vol-input"
                            type="range"
                            min={0.1}
                            max={1}
                            step={0.1}
                            value={settings.soundVolume}
                            onChange={(e) =>
                              updateSharedSettings({
                                soundVolume: Number(e.target.value),
                              })
                            }
                            className="w-full accent-[#B8860B]"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              )}
            </div>

            {/* Beamer Extended Display & Fullscreen Setup Guide */}
            <section className="rounded-xl border border-[#C9A13F]/50 bg-[#FCFBF7] p-5 sm:p-6">
              <div className="flex items-center gap-2.5 mb-3">
                <Monitor className="h-5 w-5 text-[#8A620B]" />
                <h2 className="font-display text-lg font-bold text-[#171C26]">
                  {t.settings.beamerGuideTitle}
                </h2>
              </div>
              <ol className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-[#374151]">
                <li className="rounded-lg border border-[#C9A13F]/30 bg-white p-3">
                  {t.settings.beamerGuideStep1}
                </li>
                <li className="rounded-lg border border-[#C9A13F]/30 bg-white p-3">
                  {t.settings.beamerGuideStep2}
                </li>
                <li className="rounded-lg border border-[#C9A13F]/30 bg-white p-3">
                  {t.settings.beamerGuideStep3}
                </li>
                <li className="rounded-lg border border-[#C9A13F]/30 bg-white p-3">
                  {t.settings.beamerGuideStep4}
                </li>
              </ol>
            </section>

            {/* Round History & Correction Audit Log */}
            <section className="rounded-xl border border-[#C9A13F]/50 bg-white p-5 sm:p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#C9A13F]/25 pb-4">
                <h2 className="font-display text-xl font-bold text-[#171C26]">
                  {t.settings.historyTitle}
                </h2>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    data-testid="export-csv-btn"
                    onClick={() => downloadExport('csv')}
                    className="inline-flex items-center gap-2 min-h-[42px] rounded-lg border border-[#C9A13F]/60 bg-[#FCFBF7] px-3.5 text-xs font-semibold text-[#171C26] hover:bg-[#F5EEDB]"
                  >
                    <Download className="h-4 w-4 text-[#8A620B]" />
                    <span>{t.settings.exportCsv}</span>
                  </button>
                  <button
                    type="button"
                    data-testid="export-json-btn"
                    onClick={() => downloadExport('json')}
                    className="inline-flex items-center gap-2 min-h-[42px] rounded-lg border border-[#C9A13F]/60 bg-[#FCFBF7] px-3.5 text-xs font-semibold text-[#171C26] hover:bg-[#F5EEDB]"
                  >
                    <Download className="h-4 w-4 text-[#8A620B]" />
                    <span>{t.settings.exportJson}</span>
                  </button>
                  <button
                    type="button"
                    data-testid="clear-history-btn"
                    onClick={() => setClearHistoryConfirmOpen(true)}
                    disabled={(state?.history.length ?? 0) === 0}
                    className="inline-flex items-center gap-2 min-h-[42px] rounded-lg border border-[#B91C1C]/45 bg-[#FEF2F2] px-3.5 text-xs font-semibold text-[#991B1B] hover:bg-[#FEE2E2] disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>{t.settings.clearHistoryButton}</span>
                  </button>
                </div>
              </div>

              {/* Active + Archived Rounds */}
              <div className="space-y-4" data-testid="history-rounds-list">
                {state &&
                  [state.currentRound, ...state.history].map((round) => (
                    <div
                      key={round.id}
                      className="rounded-xl border border-[#C9A13F]/35 bg-[#FCFBF7] p-4 space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span className="font-display font-bold text-[#171C26]">
                          {t.settings.roundHeader} {round.roundNumber}
                        </span>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-[#6B7280] tabular-nums">
                          <span>
                            {t.settings.startedAt}:{' '}
                            {new Date(round.startedAt).toLocaleString()}
                          </span>
                          <span>·</span>
                          <span>
                            {t.settings.endedAt}:{' '}
                            {round.endedAt
                              ? new Date(round.endedAt).toLocaleString()
                              : t.settings.activeNow}
                          </span>
                          <span>·</span>
                          <span className="font-semibold text-[#8A620B]">
                            {round.draws.length} / 90
                          </span>
                        </div>
                      </div>

                      {round.draws.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 tabular-nums">
                          {round.draws.map((d, idx) => (
                            <span
                              key={`${round.id}-${d.number}-${idx}`}
                              title={`${idx + 1}. #${d.number} (${new Date(
                                d.drawnAt
                              ).toLocaleTimeString()})`}
                              className="inline-flex h-7 min-w-[2rem] items-center justify-center rounded border border-[#C9A13F]/40 bg-white px-1.5 text-xs font-bold text-[#171C26]"
                            >
                              {d.number}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-[#6B7280]">
                          {t.moderator.noDrawsYet}
                        </p>
                      )}
                    </div>
                  ))}
              </div>

              {/* Correction Audit Log */}
              <div className="pt-4 border-t border-[#C9A13F]/25 space-y-3">
                <h3 className="font-display text-base font-bold text-[#171C26]">
                  {t.settings.correctionsTitle}
                </h3>
                {!state || state.corrections.length === 0 ? (
                  <p className="text-sm text-[#6B7280]">
                    {t.settings.noCorrections}
                  </p>
                ) : (
                  <ul className="space-y-2 text-xs text-[#374151]">
                    {state.corrections.slice(0, 20).map((c) => (
                      <li
                        key={c.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#C9A13F]/25 bg-[#FCFBF7] px-3 py-2 tabular-nums"
                      >
                        <span>
                          <strong>
                            {t.settings.roundHeader} {c.roundNumber}
                          </strong>{' '}
                          · {c.action}
                          {c.number !== undefined ? ` (#${c.number})` : ''} —{' '}
                          {c.reason}
                        </span>
                        <span className="text-[#6B7280]">
                          {new Date(c.timestamp).toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>
        )}
      </div>

      {/* Explicit Confirmation Modal for Direct Mode */}
      {directConfirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-[#C9A13F] bg-white p-6 shadow-xl space-y-4">
            <h2 className="font-display text-lg font-bold text-[#171C26]">
              {t.settings.directModeConfirmTitle}
            </h2>
            <p className="text-sm text-[#4B5563]">
              {t.settings.directModeConfirmDesc}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDirectConfirmOpen(false)}
                className="min-h-[44px] rounded-lg border border-[#C9A13F]/50 bg-white px-4 text-sm font-semibold text-[#374151]"
              >
                {t.moderator.cancelAction}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDirectConfirmOpen(false);
                  updateSharedSettings({
                    confirmationMode: false,
                    directModeExplicitlyEnabled: true,
                  });
                }}
                className="min-h-[44px] rounded-lg bg-[#B8860B] px-4 text-sm font-semibold text-white"
              >
                {t.moderator.confirmAction}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Separate Confirmation Modal for Clearing History */}
      {clearHistoryConfirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-[#C9A13F] bg-white p-6 shadow-xl space-y-4">
            <h2 className="font-display text-lg font-bold text-[#171C26]">
              {t.settings.clearHistoryConfirmTitle}
            </h2>
            <p className="text-sm text-[#4B5563]">
              {t.settings.clearHistoryConfirmDesc}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setClearHistoryConfirmOpen(false)}
                className="min-h-[44px] rounded-lg border border-[#C9A13F]/50 bg-white px-4 text-sm font-semibold text-[#374151]"
              >
                {t.moderator.cancelAction}
              </button>
              <button
                type="button"
                onClick={handleClearHistoryConfirm}
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

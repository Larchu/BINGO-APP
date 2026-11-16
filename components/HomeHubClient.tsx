'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Mic, MonitorPlay, QrCode, Settings2, ArrowRight } from 'lucide-react';
import {
  getStoredUiLanguage,
  saveStoredPairCode,
  saveStoredUiLanguage,
} from '@/hooks/useBingoSync';
import { getDictionary } from '@/lib/i18n';
import { LanguageCode, PublicDisplayState } from '@/lib/types';
import { TopNavBar } from './TopNavBar';
import { WorldFamilyFrame } from './WorldFamilyFrame';

interface HubData {
  publicState: PublicDisplayState;
  pairCode: string;
  pairUrl: string;
  qrDataUrl: string;
}

export function HomeHubClient() {
  const [uiLanguage, setUiLanguage] = useState<LanguageCode>('es');
  const [hub, setHub] = useState<HubData | null>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setUiLanguage(getStoredUiLanguage());
    });
    fetch('/api/state?mode=hub', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: { ok: boolean } & HubData) => {
        if (data.ok) {
          setHub(data);
          // Authorize host laptop automatically when visiting the local hub
          if (data.pairCode) {
            saveStoredPairCode(data.pairCode);
          }
        }
      })
      .catch(() => {});
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleLanguageChange = (lang: LanguageCode) => {
    setUiLanguage(lang);
    saveStoredUiLanguage(lang);
  };

  const t = getDictionary(uiLanguage);
  const pairCode = hub?.pairCode || '';
  const modHref = pairCode ? `/moderator?pair=${encodeURIComponent(pairCode)}` : '/moderator';
  const settingsHref = pairCode ? `/settings?pair=${encodeURIComponent(pairCode)}` : '/settings';

  const openBeamerWindow = () => {
    window.open(
      '/display',
      'world_family_bingo_beamer',
      'noopener,noreferrer,width=1280,height=720'
    );
  };

  return (
    <WorldFamilyFrame>
      <div className="mx-auto max-w-6xl">
        <TopNavBar
          activeRoute="hub"
          uiLanguage={uiLanguage}
          onChangeUiLanguage={handleLanguageChange}
          pairCode={pairCode}
        />

        {/* Hero identity section matching the World Family menu design */}
        <section className="flex flex-col items-center text-center pt-4 pb-8 border-b border-[#C9A13F]/30">
          <div className="relative mb-4">
            <img
              src="/assets/aistudio/World_Family_Disco_Logo_b5600ece.png"
              alt="The World Family"
              className="h-32 w-32 sm:h-40 sm:w-40 object-contain"
            />
          </div>

          <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-wider gold-gradient-text text-balance">
            {t.hub.headline}
          </h1>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm font-medium tracking-widest uppercase text-[#8A620B]">
            <span>{t.brand.subtitle}</span>
            <span aria-hidden="true">·</span>
            <span>{t.brand.schedule}</span>
          </div>

          <p className="mt-4 max-w-2xl text-sm sm:text-base text-[#374151] leading-relaxed">
            {t.hub.description}
          </p>

          {hub?.publicState && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-sm text-[#171C26] tabular-nums">
              <span>
                {t.hub.activeRoundSummary}:{' '}
                <strong className="font-semibold text-[#8A620B]">
                  {hub.publicState.currentRound.roundNumber}
                </strong>
              </span>
              <span aria-hidden="true" className="text-[#C9A13F]">
                ·
              </span>
              <span>
                {t.moderator.drawnCountLabel}:{' '}
                <strong className="font-semibold">
                  {hub.publicState.currentRound.draws.length} / 90
                </strong>
              </span>
              {hub.publicState.lastDrawnNumber !== null && (
                <>
                  <span aria-hidden="true" className="text-[#C9A13F]">
                    ·
                  </span>
                  <span>
                    {t.moderator.lastNumberLabel}:{' '}
                    <strong className="font-semibold text-[#8A620B]">
                      {hub.publicState.lastDrawnNumber}
                    </strong>
                  </span>
                </>
              )}
            </div>
          )}
        </section>

        {/* Three Core Areas */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 py-8 border-b border-[#C9A13F]/30">
          <div className="flex flex-col justify-between rounded-xl border border-[#C9A13F]/45 bg-[#FCFBF7] p-6">
            <div>
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#C9A13F]/50 bg-white text-[#8A620B]">
                <Mic className="h-5 w-5" />
              </div>
              <h2 className="font-display text-lg font-bold text-[#171C26] mb-2">
                {t.hub.moderatorCardTitle}
              </h2>
              <p className="text-sm text-[#4B5563] leading-relaxed mb-6">
                {t.hub.moderatorCardDesc}
              </p>
            </div>
            <Link
              href={modHref}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] rounded-lg border border-[#B8860B] bg-gradient-to-b from-[#DFB64E] to-[#B6851B] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-105 transition"
            >
              <span>{t.hub.moderatorCta}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="flex flex-col justify-between rounded-xl border border-[#C9A13F]/45 bg-[#FCFBF7] p-6">
            <div>
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#C9A13F]/50 bg-white text-[#8A620B]">
                <MonitorPlay className="h-5 w-5" />
              </div>
              <h2 className="font-display text-lg font-bold text-[#171C26] mb-2">
                {t.hub.displayCardTitle}
              </h2>
              <p className="text-sm text-[#4B5563] leading-relaxed mb-6">
                {t.hub.displayCardDesc}
              </p>
            </div>
            <button
              type="button"
              onClick={openBeamerWindow}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] rounded-lg border border-[#171C26] bg-[#171C26] px-4 py-2.5 text-sm font-semibold text-[#FDF6E2] shadow-sm hover:bg-[#252D3D] transition"
            >
              <span>{t.hub.displayCta}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-col justify-between rounded-xl border border-[#C9A13F]/45 bg-[#FCFBF7] p-6">
            <div>
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#C9A13F]/50 bg-white text-[#8A620B]">
                <Settings2 className="h-5 w-5" />
              </div>
              <h2 className="font-display text-lg font-bold text-[#171C26] mb-2">
                {t.hub.settingsCardTitle}
              </h2>
              <p className="text-sm text-[#4B5563] leading-relaxed mb-6">
                {t.hub.settingsCardDesc}
              </p>
            </div>
            <Link
              href={settingsHref}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] rounded-lg border border-[#C9A13F]/70 bg-white px-4 py-2.5 text-sm font-semibold text-[#8A620B] hover:bg-[#FCF8EE] transition"
            >
              <span>{t.hub.settingsCta}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* Smartphone Pairing Section */}
        <section className="py-8 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#8A620B] mb-2">
              <QrCode className="h-4 w-4" />
              <span>{t.hub.pairingTitle}</span>
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-[#171C26] mb-2">
              {t.hub.pairingTitle}
            </h2>
            <p className="text-sm text-[#4B5563] leading-relaxed mb-4">
              {t.hub.pairingDesc}
            </p>
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <div className="text-xs uppercase tracking-wider text-[#6B7280] mb-1">
                  {t.hub.pairCodeLabel}
                </div>
                <div
                  data-testid="hub-pair-code"
                  className="font-mono text-2xl font-bold tracking-[0.2em] text-[#8A620B] tabular-nums"
                >
                  {pairCode || '------'}
                </div>
              </div>
              {hub?.pairUrl && (
                <div className="text-xs text-[#6B7280] break-all max-w-xs">
                  <div className="uppercase tracking-wider mb-1">
                    {t.hub.scanQrHint}
                  </div>
                  <span className="font-mono text-[#171C26]">{hub.pairUrl}</span>
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 rounded-xl border border-[#C9A13F]/60 bg-white p-4 shadow-sm">
            {hub?.qrDataUrl ? (
              <img
                src={hub.qrDataUrl}
                alt={t.hub.pairingTitle}
                className="h-40 w-40 object-contain"
              />
            ) : (
              <div className="h-40 w-40 flex items-center justify-center text-xs text-[#6B7280]">
                QR
              </div>
            )}
          </div>
        </section>

        <footer className="pt-4 border-t border-[#C9A13F]/30 text-center text-xs font-medium tracking-[0.2em] uppercase text-[#8A620B]">
          {t.brand.venue}
        </footer>
      </div>
    </WorldFamilyFrame>
  );
}

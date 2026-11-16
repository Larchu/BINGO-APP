'use client';

import React from 'react';
import Link from 'next/link';
import { MonitorPlay } from 'lucide-react';
import { getDictionary } from '@/lib/i18n';
import { LanguageCode } from '@/lib/types';

interface TopNavBarProps {
  activeRoute: 'hub' | 'moderator' | 'display' | 'settings';
  uiLanguage: LanguageCode;
  onChangeUiLanguage: (lang: LanguageCode) => void;
  pairCode?: string;
}

export function TopNavBar({
  activeRoute,
  uiLanguage,
  onChangeUiLanguage,
  pairCode,
}: TopNavBarProps) {
  const t = getDictionary(uiLanguage);

  const openBeamerWindow = () => {
    window.open(
      '/display',
      'world_family_bingo_beamer',
      'noopener,noreferrer,width=1280,height=720'
    );
  };

  const modHref = pairCode ? `/moderator?pair=${encodeURIComponent(pairCode)}` : '/moderator';
  const settingsHref = pairCode ? `/settings?pair=${encodeURIComponent(pairCode)}` : '/settings';

  return (
    <header className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-[#C9A13F]/35 pb-3.5">
      {/* Zone 1: Brand Title + untouched logo */}
      <Link
        href="/"
        className="flex items-center gap-3 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8860B] rounded-md"
      >
        <img
          src="/assets/aistudio/World_Family_Disco_Logo_b5600ece.png"
          alt="World Family"
          className="h-10 w-10 object-contain shrink-0"
        />
        <span className="font-display text-lg sm:text-xl font-bold tracking-wide gold-gradient-text whitespace-nowrap shrink-0">
          {t.brand.title}
        </span>
      </Link>

      {/* Zone 2: Clean single-line text nav links */}
      <nav
        aria-label="Primary"
        className="order-3 md:order-2 w-full md:w-auto flex items-center gap-4 sm:gap-6 text-sm font-medium text-[#2C3444] overflow-x-auto pb-1 md:pb-0"
      >
        <Link
          href="/"
          className={`whitespace-nowrap shrink-0 py-1.5 border-b-2 transition-colors ${
            activeRoute === 'hub'
              ? 'border-[#B8860B] text-[#8A620B] font-semibold'
              : 'border-transparent hover:text-[#8A620B]'
          }`}
        >
          {t.nav.hub}
        </Link>
        <Link
          href={modHref}
          className={`whitespace-nowrap shrink-0 py-1.5 border-b-2 transition-colors ${
            activeRoute === 'moderator'
              ? 'border-[#B8860B] text-[#8A620B] font-semibold'
              : 'border-transparent hover:text-[#8A620B]'
          }`}
        >
          {t.nav.moderator}
        </Link>
        <Link
          href="/display"
          className={`whitespace-nowrap shrink-0 py-1.5 border-b-2 transition-colors ${
            activeRoute === 'display'
              ? 'border-[#B8860B] text-[#8A620B] font-semibold'
              : 'border-transparent hover:text-[#8A620B]'
          }`}
        >
          {t.nav.display}
        </Link>
        <Link
          href={settingsHref}
          className={`whitespace-nowrap shrink-0 py-1.5 border-b-2 transition-colors ${
            activeRoute === 'settings'
              ? 'border-[#B8860B] text-[#8A620B] font-semibold'
              : 'border-transparent hover:text-[#8A620B]'
          }`}
        >
          {t.nav.settings}
        </Link>
      </nav>

      {/* Zone 3: Language Switcher + Beamer Window Action */}
      <div className="order-2 md:order-3 flex items-center gap-3 shrink-0">
        <div
          role="group"
          aria-label="Interface language"
          className="inline-flex items-center border border-[#C9A13F]/45 rounded-lg bg-[#FCFBF7] p-0.5"
        >
          {(['es', 'en', 'de'] as LanguageCode[]).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => onChangeUiLanguage(code)}
              className={`min-h-[36px] px-2.5 text-xs font-semibold uppercase tracking-wide rounded-md transition-colors whitespace-nowrap shrink-0 ${
                uiLanguage === code
                  ? 'bg-[#171C26] text-[#FDF6E2]'
                  : 'text-[#5C4611] hover:bg-[#C9A13F]/15'
              }`}
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={openBeamerWindow}
          className="hidden sm:inline-flex items-center gap-2 min-h-[40px] px-3.5 py-2 text-xs font-semibold rounded-lg border border-[#B8860B] bg-gradient-to-b from-[#DFB64E] to-[#B6851B] text-white shadow-sm hover:brightness-105 transition whitespace-nowrap shrink-0"
        >
          <MonitorPlay className="w-4 h-4 shrink-0" />
          <span>{t.nav.openDisplayWindow}</span>
        </button>
      </div>
    </header>
  );
}

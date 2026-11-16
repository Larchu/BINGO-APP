'use client';

import React, { useId } from 'react';
import { AnimationIntensity } from '@/lib/types';

interface DiscoBingoBallProps {
  number: number;
  size?: number;
  intensity?: AnimationIntensity;
  reducedMotion?: boolean;
  className?: string;
}

const BALL_PALETTES = [
  // Crimson Ruby + Rainbow Rim
  {
    core: '#E11D48',
    mid: '#BE123C',
    edge: '#7F1D1D',
    accent1: '#F59E0B',
    accent2: '#A855F7',
  },
  // Imperial Gold + Prismatic Rim
  {
    core: '#FACC15',
    mid: '#D97706',
    edge: '#854D0E',
    accent1: '#06B6D4',
    accent2: '#EC4899',
  },
  // Emerald Jade + Rainbow Rim
  {
    core: '#10B981',
    mid: '#047857',
    edge: '#064E3B',
    accent1: '#FBBF24',
    accent2: '#3B82F6',
  },
  // Royal Magenta + Rainbow Rim
  {
    core: '#C026D3',
    mid: '#86198F',
    edge: '#4A044E',
    accent1: '#38BDF8',
    accent2: '#FACC15',
  },
  // Sapphire Blue + Rainbow Rim
  {
    core: '#2563EB',
    mid: '#1D4ED8',
    edge: '#1E3A8A',
    accent1: '#10B981',
    accent2: '#F43F5E',
  },
];

export function DiscoBingoBall({
  number,
  size = 180,
  intensity = 'standard',
  reducedMotion = false,
  className = '',
}: DiscoBingoBallProps) {
  const uid = useId().replace(/:/g, '');
  const palette = BALL_PALETTES[Math.abs(number - 1) % BALL_PALETTES.length];
  const fontSize = number >= 10 ? size * 0.31 : size * 0.35;
  const showSparkles = !reducedMotion && intensity !== 'calm';

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
      aria-label={`Bingo ${number}`}
    >
      <svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        className="overflow-visible drop-shadow-[0_14px_24px_rgba(23,28,38,0.18)]"
      >
        <defs>
          {/* Main 3D sphere gradient */}
          <radialGradient id={`sphere-${uid}`} cx="34%" cy="28%" r="72%">
            <stop offset="0%" stopColor="#FFFDF5" stopOpacity="0.95" />
            <stop offset="18%" stopColor={palette.core} stopOpacity="0.96" />
            <stop offset="58%" stopColor={palette.mid} stopOpacity="1" />
            <stop offset="86%" stopColor={palette.edge} stopOpacity="1" />
            <stop offset="100%" stopColor="#1E1B24" stopOpacity="1" />
          </radialGradient>

          {/* Rainbow prismatic lower/side reflection matching Bingo poster balls */}
          <linearGradient id={`rainbow-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={palette.accent1} stopOpacity="0.55" />
            <stop offset="50%" stopColor="#FDE047" stopOpacity="0.35" />
            <stop offset="100%" stopColor={palette.accent2} stopOpacity="0.65" />
          </linearGradient>

          {/* Gold bezel gradient */}
          <linearGradient id={`gold-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F8E29B" />
            <stop offset="35%" stopColor="#D4A024" />
            <stop offset="70%" stopColor="#9A6C0A" />
            <stop offset="100%" stopColor="#F3D179" />
          </linearGradient>

          {/* Clip to sphere */}
          <clipPath id={`clip-${uid}`}>
            <circle cx="100" cy="100" r="92" />
          </clipPath>
        </defs>

        {/* Outer metallic gold rim */}
        <circle
          cx="100"
          cy="100"
          r="95"
          fill="none"
          stroke={`url(#gold-${uid})`}
          strokeWidth="4"
        />

        {/* Base sphere */}
        <circle cx="100" cy="100" r="92" fill={`url(#sphere-${uid})`} />

        {/* Prismatic disco reflection overlay */}
        <g clipPath={`url(#clip-${uid})`}>
          <ellipse
            cx="118"
            cy="148"
            rx="84"
            ry="44"
            fill={`url(#rainbow-${uid})`}
          />

          {/* Curved disco mirror-ball tile grid lines */}
          <g
            stroke="rgba(255,255,255,0.42)"
            strokeWidth="1.2"
            fill="none"
          >
            {/* Latitude rings */}
            <ellipse cx="100" cy="30" rx="58" ry="12" />
            <ellipse cx="100" cy="52" rx="79" ry="16" />
            <ellipse cx="100" cy="76" rx="90" ry="19" />
            <ellipse cx="100" cy="100" rx="92" ry="20" />
            <ellipse cx="100" cy="124" rx="90" ry="19" />
            <ellipse cx="100" cy="148" rx="79" ry="16" />
            <ellipse cx="100" cy="170" rx="58" ry="12" />

            {/* Longitude arcs */}
            <line x1="100" y1="8" x2="100" y2="192" />
            <ellipse cx="100" cy="100" rx="26" ry="92" />
            <ellipse cx="100" cy="100" rx="52" ry="92" />
            <ellipse cx="100" cy="100" rx="76" ry="92" />
          </g>

          {/* Subtle mirror facet glints */}
          <rect
            x="48"
            y="34"
            width="12"
            height="10"
            rx="1.5"
            fill="rgba(255,255,255,0.45)"
          />
          <rect
            x="64"
            y="24"
            width="10"
            height="9"
            rx="1.5"
            fill="rgba(255,250,220,0.55)"
          />
          <rect
            x="134"
            y="144"
            width="11"
            height="10"
            rx="1.5"
            fill="rgba(255,245,190,0.38)"
          />
          <rect
            x="40"
            y="132"
            width="10"
            height="10"
            rx="1.5"
            fill="rgba(255,255,255,0.32)"
          />

          {/* Top-left specular glow */}
          <ellipse
            cx="62"
            cy="46"
            rx="32"
            ry="18"
            transform="rotate(-28 62 46)"
            fill="rgba(255,255,255,0.28)"
          />
        </g>

        {/* Ivory center medallion with gold ring — keeps numeral 100% upright and crisp */}
        <circle
          cx="100"
          cy="100"
          r="46"
          fill="#FCF9EE"
          stroke={`url(#gold-${uid})`}
          strokeWidth="4.5"
        />
        <circle
          cx="100"
          cy="100"
          r="40"
          fill="none"
          stroke="rgba(184,134,11,0.35)"
          strokeWidth="1.2"
        />

        {/* Sparing 4-pointed gold star glints on rim when intensity allows */}
        {showSparkles && (
          <g fill="#FDE68A" stroke="#B8860B" strokeWidth="0.6">
            <path d="M164 26 L167 35 L176 38 L167 41 L164 50 L161 41 L152 38 L161 35 Z" />
            {intensity === 'festive' && (
              <path d="M28 148 L30.5 155 L37.5 157.5 L30.5 160 L28 167 L25.5 160 L18.5 157.5 L25.5 155 Z" />
            )}
          </g>
        )}
      </svg>

      {/* Upright, crisp HTML numeral centered inside medallion */}
      <span
        className="pointer-events-none absolute inset-0 flex items-center justify-center font-display font-bold tracking-tight text-[#111827] tabular-nums"
        style={{ fontSize: `${fontSize}px`, lineHeight: 1 }}
      >
        {number}
      </span>
    </div>
  );
}

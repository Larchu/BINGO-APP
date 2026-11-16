'use client';

import React from 'react';

interface WorldFamilyFrameProps {
  children: React.ReactNode;
  safeMarginPx?: number;
  compact?: boolean;
  className?: string;
}

export function WorldFamilyFrame({
  children,
  safeMarginPx = 12,
  compact = false,
  className = '',
}: WorldFamilyFrameProps) {
  return (
    <div
      className={`relative min-h-screen bg-white text-[#171C26] ${className}`}
      style={{ padding: `${safeMarginPx}px` }}
    >
      {/* Outer metallic gold frame */}
      <div className="relative min-h-[calc(100vh-24px)] w-full border border-[#C9A13F]/70 bg-white">
        {/* Inner hairline gold frame */}
        <div
          className={`relative min-h-full w-full border border-[#C9A13F]/30 ${
            compact ? 'p-3 sm:p-4' : 'p-4 sm:p-6 md:p-8'
          }`}
        >
          {/* Corner architectural brackets matching World Family menu design */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-2 left-2 h-4 w-4 border-t-2 border-l-2 border-[#B8860B]/80"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-2 right-2 h-4 w-4 border-t-2 border-r-2 border-[#B8860B]/80"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-2 left-2 h-4 w-4 border-b-2 border-l-2 border-[#B8860B]/80"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-2 right-2 h-4 w-4 border-b-2 border-r-2 border-[#B8860B]/80"
          />

          {children}
        </div>
      </div>
    </div>
  );
}

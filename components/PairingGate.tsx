'use client';

import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { getDictionary } from '@/lib/i18n';
import { LanguageCode } from '@/lib/types';

interface PairingGateProps {
  uiLanguage: LanguageCode;
  onPaired: (code: string) => void;
}

export function PairingGate({ uiLanguage, onPaired }: PairingGateProps) {
  const t = getDictionary(uiLanguage);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmed = code.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-pair-code': trimmed,
        },
        body: JSON.stringify({ action: 'verify', pairCode: trimmed }),
      });
      if (!res.ok) {
        setError(t.connection.invalidPairCode);
        return;
      }
      onPaired(trimmed);
    } catch {
      setError(t.connection.disconnected);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md my-10 border border-[#C9A13F]/60 bg-[#FCFBF7] p-6 sm:p-8 rounded-xl shadow-sm">
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[#C9A13F]/60 bg-white text-[#8A620B]">
          <KeyRound className="h-6 w-6" />
        </div>
        <h1 className="font-display text-xl font-bold gold-gradient-text mb-2">
          {t.connection.unauthorizedTitle}
        </h1>
        <p className="text-sm text-[#3F4859] mb-6 leading-relaxed">
          {t.connection.unauthorizedDesc}
        </p>

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div>
            <label htmlFor="pair-code-input" className="sr-only">
              {t.hub.pairCodeLabel}
            </label>
            <input
              id="pair-code-input"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t.connection.enterPairCodePlaceholder}
              className="w-full min-h-[48px] rounded-lg border border-[#C9A13F]/70 bg-white px-4 text-center font-mono text-xl tracking-[0.25em] text-[#171C26] focus:border-[#9E7312] focus:outline-none focus:ring-2 focus:ring-[#C9A13F]/30"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm font-medium text-[#B91C1C]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !code.trim()}
            className="w-full min-h-[48px] rounded-lg border border-[#B8860B] bg-gradient-to-b from-[#DFB64E] to-[#B6851B] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-105 disabled:opacity-50 transition"
          >
            {t.connection.pairButton}
          </button>
        </form>
      </div>
    </div>
  );
}

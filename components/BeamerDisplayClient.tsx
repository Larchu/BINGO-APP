'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, Minimize2, WifiOff } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useBingoSync } from '@/hooks/useBingoSync';
import { getDictionary } from '@/lib/i18n';
import { playBingoChime } from '@/lib/sound-effects';
import { PublicDisplayState } from '@/lib/types';
import { DiscoBingoBall } from './DiscoBingoBall';

interface SpotlightState {
  number: number;
  eventId: string;
  phase: 'entering' | 'docking';
  targetDx: number;
  targetDy: number;
}

export function BeamerDisplayClient() {
  const { state, connectionStatus } = useBingoSync<PublicDisplayState>({
    role: 'display',
  });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [spotlight, setSpotlight] = useState<SpotlightState | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cellRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const hasInitializedRef = useRef(false);
  const seenEventIdRef = useRef<string | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearAnimationTimers = () => {
    timersRef.current.forEach((id) => clearTimeout(id));
    timersRef.current = [];
  };

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await (containerRef.current || document.documentElement).requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Fullscreen may be blocked outside user gesture or in sandbox iframe
    }
  };

  const eventId = state?.lastDrawEventId ?? null;
  const lastNum = state?.lastDrawnNumber ?? null;
  const ballDisplaySeconds = state?.settings.ballDisplaySeconds ?? 5;
  const soundEnabled = state?.settings.soundEnabled ?? false;
  const soundVolume = state?.settings.soundVolume ?? 0.4;
  const settingsReducedMotion = state?.settings.reducedMotion ?? false;

  // Trigger giant DiscoBingoBall spotlight when a new draw arrives
  useEffect(() => {
    if (!state) return;

    // On first hydration, sync baseline without replaying historical animation
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      seenEventIdRef.current = eventId;
      return;
    }

    // On round reset or undo to empty, immediately end any active animation
    if (!eventId || lastNum === null) {
      clearAnimationTimers();
      seenEventIdRef.current = eventId;
      const clearTimer = setTimeout(() => setSpotlight(null), 0);
      return () => clearTimeout(clearTimer);
    }

    if (eventId === seenEventIdRef.current) return;
    seenEventIdRef.current = eventId;

    // Only animate actual draws (ignore undo events)
    if (!eventId.startsWith('draw-')) {
      clearAnimationTimers();
      const clearTimer = setTimeout(() => setSpotlight(null), 0);
      return () => clearTimeout(clearTimer);
    }

    clearAnimationTimers();

    if (soundEnabled) {
      playBingoChime(soundVolume);
    }

    const holdSeconds = Math.max(2, ballDisplaySeconds || 5);
    const enterTimer = setTimeout(() => {
      setSpotlight({
        number: lastNum,
        eventId,
        phase: 'entering',
        targetDx: 0,
        targetDy: 0,
      });
    }, 0);
    timersRef.current.push(enterTimer);

    const dockTimer = setTimeout(() => {
      const cellEl = cellRefs.current[lastNum];
      let dx = 0;
      let dy = 0;
      if (cellEl && typeof window !== 'undefined') {
        const rect = cellEl.getBoundingClientRect();
        const cellCx = rect.left + rect.width / 2;
        const cellCy = rect.top + rect.height / 2;
        dx = cellCx - window.innerWidth / 2;
        dy = cellCy - window.innerHeight / 2;
      }

      setSpotlight((prev) =>
        prev && prev.eventId === eventId
          ? { ...prev, phase: 'docking', targetDx: dx, targetDy: dy }
          : prev
      );

      const finishTimer = setTimeout(() => {
        setSpotlight((prev) => (prev && prev.eventId === eventId ? null : prev));
      }, settingsReducedMotion ? 150 : 750);
      timersRef.current.push(finishTimer);
    }, holdSeconds * 1000);

    timersRef.current.push(dockTimer);

    return () => {
      clearAnimationTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    Boolean(state),
    eventId,
    lastNum,
    ballDisplaySeconds,
    soundEnabled,
    soundVolume,
    settingsReducedMotion,
  ]);

  const drawnSet = useMemo(() => {
    const s = new Set<number>();
    state?.currentRound.draws.forEach((d) => s.add(d.number));
    return s;
  }, [state?.currentRound.draws]);

  const recentTail = useMemo(() => {
    const draws = state?.currentRound.draws ?? [];
    return [...draws].reverse().slice(0, 6);
  }, [state?.currentRound.draws]);

  const lang = state?.settings.displayLanguage ?? 'es';
  const t = getDictionary(lang);
  const safeMargin = state?.settings.beamerSafeMarginPx ?? 16;
  const scale = state?.settings.beamerScale ?? 1;
  const reducedMotion = state?.settings.reducedMotion ?? false;
  const intensity = state?.settings.animationIntensity ?? 'standard';

  const numbers = useMemo(
    () => Array.from({ length: 90 }, (_, idx) => idx + 1),
    []
  );

  return (
    <div
      ref={containerRef}
      data-testid="beamer-display"
      data-last-drawn={state?.lastDrawnNumber ?? ''}
      data-round-number={state?.currentRound.roundNumber ?? 1}
      data-drawn-count={state?.currentRound.draws.length ?? 0}
      className="relative h-screen w-screen overflow-hidden bg-white text-[#171C26] select-none"
      style={{ padding: `${safeMargin}px` }}
    >
      {/* Double gold architectural border frame */}
      <div className="relative flex h-full w-full flex-col border border-[#C9A13F]/75 bg-white p-2 sm:p-3">
        <div className="relative flex h-full w-full flex-col border border-[#C9A13F]/30 px-4 py-3 sm:px-6 sm:py-4">
          {/* Corner brackets */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1.5 left-1.5 h-4 w-4 border-t-2 border-l-2 border-[#B8860B]"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1.5 right-1.5 h-4 w-4 border-t-2 border-r-2 border-[#B8860B]"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-1.5 left-1.5 h-4 w-4 border-b-2 border-l-2 border-[#B8860B]"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-1.5 right-1.5 h-4 w-4 border-b-2 border-r-2 border-[#B8860B]"
          />

          {/* Top Event Identity Strip */}
          <header className="flex items-center justify-between gap-4 border-b border-[#C9A13F]/30 pb-2.5 shrink-0">
            <div className="flex items-center gap-3.5 min-w-0">
              <img
                src="/assets/aistudio/World_Family_Disco_Logo_b5600ece.png"
                alt="World Family"
                className="h-12 w-12 sm:h-14 sm:w-14 object-contain shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-baseline gap-3">
                  <h1 className="font-display text-2xl sm:text-4xl font-bold tracking-wider gold-gradient-text leading-none">
                    {t.display.title}
                  </h1>
                  <span className="hidden sm:inline text-xs font-semibold uppercase tracking-[0.2em] text-[#8A620B]">
                    {t.brand.subtitle}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs font-medium tracking-[0.16em] uppercase text-[#5C4611] mt-1">
                  {t.brand.schedule}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 sm:gap-6 shrink-0">
              {connectionStatus !== 'connected' && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-[#B91C1C]">
                  <WifiOff className="h-4 w-4" />
                  <span>{t.connection.reconnecting}</span>
                </div>
              )}

              <div className="flex items-center gap-5 tabular-nums">
                <div className="text-right">
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-[#8A620B]">
                    {t.display.round}
                  </div>
                  <div
                    className="font-display font-bold text-[#171C26]"
                    style={{ fontSize: `${Math.round(24 * scale)}px`, lineHeight: 1.1 }}
                  >
                    {state?.currentRound.roundNumber ?? 1}
                  </div>
                </div>

                <div className="h-8 w-px bg-[#C9A13F]/35" aria-hidden="true" />

                <div className="text-right">
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-[#8A620B]">
                    {t.display.drawn}
                  </div>
                  <div
                    className="font-display font-bold text-[#171C26]"
                    style={{ fontSize: `${Math.round(24 * scale)}px`, lineHeight: 1.1 }}
                  >
                    {state?.currentRound.draws.length ?? 0}
                    <span className="text-sm font-sans font-medium text-[#6B7280]">
                      {' '}
                      / 90
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                data-testid="fullscreen-btn"
                onClick={toggleFullscreen}
                aria-label={
                  isFullscreen
                    ? t.display.fullscreenExit
                    : t.display.fullscreenEnter
                }
                title={
                  isFullscreen
                    ? t.display.fullscreenExit
                    : t.display.fullscreenEnter
                }
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#C9A13F]/50 bg-[#FCFBF7] text-[#8A620B] hover:bg-[#F5EEDB] transition"
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </button>
            </div>
          </header>

          {/* Main 16:9 Stage: Left Last-Drawn Spotlight + Right 10x9 Fixed Number Grid */}
          <main className="mt-3 flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* Left Spotlight Column (Last Drawn Number remains prominent until next draw) */}
            <section
              aria-label={t.display.lastNumber}
              className="lg:col-span-3 flex flex-col justify-between rounded-xl border border-[#C9A13F]/50 bg-[#FCFBF7] p-4"
            >
              <div className="text-center">
                <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#8A620B]">
                  {t.display.lastNumber}
                </span>
                <div className="mt-1 h-px w-16 mx-auto bg-[#C9A13F]/50" />
              </div>

              <div className="flex flex-1 flex-col items-center justify-center py-2">
                {state?.lastDrawnNumber !== null &&
                state?.lastDrawnNumber !== undefined ? (
                  <div className="flex flex-col items-center">
                    <div className="rounded-full p-2 border-2 border-[#C9A13F] bg-white shadow-sm">
                      <DiscoBingoBall
                        number={state.lastDrawnNumber}
                        size={Math.round(156 * Math.min(1.15, scale))}
                        intensity={intensity}
                        reducedMotion={reducedMotion}
                      />
                    </div>
                    <div className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#8A620B]">
                      {t.display.justDrawn}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center px-3">
                    <div className="h-28 w-28 rounded-full border-2 border-dashed border-[#C9A13F]/45 bg-white flex items-center justify-center">
                      <span className="font-display text-3xl text-[#C9A13F]/60">
                        —
                      </span>
                    </div>
                    <p className="mt-4 text-sm font-medium text-[#6B7280]">
                      {t.display.waitingForFirstDraw}
                    </p>
                  </div>
                )}
              </div>

              {/* Recent Draw Sequence */}
              <div className="border-t border-[#C9A13F]/25 pt-3">
                <div className="flex flex-wrap items-center justify-center gap-1.5 tabular-nums">
                  {recentTail.map((d, idx) => (
                    <span
                      key={`${d.number}-${d.drawnAt}`}
                      className={`inline-flex h-8 min-w-[2.25rem] items-center justify-center rounded-md px-2 text-sm font-bold border ${
                        idx === 0
                          ? 'border-[#B8860B] bg-[#171C26] text-[#F8E29B]'
                          : 'border-[#C9A13F]/35 bg-white text-[#374151]'
                      }`}
                    >
                      {d.number}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            {/* Right 10x9 Bingo Grid (All 1–90 numbers always visible) */}
            <section
              aria-label="1-90 Bingo Board"
              className="lg:col-span-9 flex flex-col min-h-0"
            >
              <div
                className="grid flex-1 min-h-0 grid-cols-10 grid-rows-9 gap-1.5 sm:gap-2"
                data-testid="beamer-grid"
              >
                {numbers.map((num) => {
                  const isDrawn = drawnSet.has(num);
                  const isLast = state?.lastDrawnNumber === num;

                  return (
                    <div
                      key={num}
                      ref={(el) => {
                        cellRefs.current[num] = el;
                      }}
                      data-number={num}
                      data-drawn={isDrawn ? 'true' : 'false'}
                      data-last-drawn={isLast ? 'true' : 'false'}
                      className={`relative flex items-center justify-center rounded-lg border font-display tabular-nums transition-colors duration-200 ${
                        isLast
                          ? 'border-2 border-[#8A620B] bg-gradient-to-b from-[#DFB64E] to-[#9E7312] text-white ring-2 ring-[#B8860B] ring-offset-2 font-bold z-10 shadow-sm'
                          : isDrawn
                            ? 'border-[#C9A13F] bg-[#171C26] text-[#FAF1D4] font-bold shadow-xs'
                            : 'border-[#C9A13F]/25 bg-[#FCFBF7] text-[#9A8556] font-semibold'
                      }`}
                      style={{
                        fontSize: `${Math.round(21 * scale)}px`,
                      }}
                    >
                      <span>{num}</span>
                    </div>
                  );
                })}
              </div>

              {/* Clean unboxed legend footer */}
              <footer className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[#6B7280]">
                <div className="flex items-center gap-4">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-3 w-3 rounded-xs border border-[#C9A13F]/35 bg-[#FCFBF7]" />
                    <span>{t.display.openNumbersLegend}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-3 w-3 rounded-xs border border-[#C9A13F] bg-[#171C26]" />
                    <span>{t.display.drawnNumbersLegend}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium text-[#8A620B]">
                    <span className="inline-block h-3 w-3 rounded-xs border-2 border-[#B8860B] bg-[#C99B2B]" />
                    <span>{t.display.lastNumberLegend}</span>
                  </span>
                </div>
                <span className="uppercase tracking-widest text-[11px] text-[#8A620B]">
                  {t.display.readOnlyNote}
                </span>
              </footer>
            </section>
          </main>
        </div>
      </div>

      {/* Animated Giant Disco Ball Overlay — stays legible & upright, then docks into grid cell */}
      <AnimatePresence>
        {spotlight && (
          <motion.div
            key={spotlight.eventId}
            data-testid="spotlight-ball-overlay"
            initial={
              reducedMotion
                ? { opacity: 1, scale: 1 }
                : { opacity: 0, scale: 0.65 }
            }
            animate={
              spotlight.phase === 'entering'
                ? { opacity: 1, scale: 1, x: 0, y: 0 }
                : reducedMotion
                  ? { opacity: 0, scale: 0.9 }
                  : {
                      opacity: 0,
                      scale: 0.25,
                      x: spotlight.targetDx,
                      y: spotlight.targetDy,
                    }
            }
            exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.12 } }}
            transition={{
              duration:
                spotlight.phase === 'entering'
                  ? reducedMotion
                    ? 0.1
                    : 0.45
                  : reducedMotion
                    ? 0.12
                    : 0.7,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
          >
            {/* Subtle radial halo behind ball that keeps the 1-90 board visible */}
            <div className="relative flex flex-col items-center justify-center rounded-full bg-white/90 p-8 shadow-[0_24px_80px_rgba(184,134,11,0.32)] ring-2 ring-[#C9A13F]/70">
              <DiscoBingoBall
                number={spotlight.number}
                size={280}
                intensity={intensity}
                reducedMotion={reducedMotion}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

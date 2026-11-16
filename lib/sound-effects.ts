export function playBingoChime(volume = 0.4): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const gainMaster = ctx.createGain();
    gainMaster.gain.setValueAtTime(Math.max(0.02, Math.min(0.6, volume * 0.4)), now);
    gainMaster.connect(ctx.destination);

    // Warm two-note major fifth chime (G4 -> D5)
    const notes = [392.0, 587.33];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.11);

      noteGain.gain.setValueAtTime(0.001, now + idx * 0.11);
      noteGain.gain.exponentialRampToValueAtTime(1.0, now + idx * 0.11 + 0.02);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.11 + 0.55);

      osc.connect(noteGain);
      noteGain.connect(gainMaster);
      osc.start(now + idx * 0.11);
      osc.stop(now + idx * 0.11 + 0.6);
    });

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 900);
  } catch {
    // Ignore autoplay restriction errors if user hasn't interacted yet
  }
}

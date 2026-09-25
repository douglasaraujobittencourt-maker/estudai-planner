// Alarme sonoro do timer — sino digital agradável (Web Audio, sem arquivos).

function bell(ctx: AudioContext, freq: number, at: number, dur: number, gainPeak: number) {
  // Tom principal + harmônico para timbre de sino
  const partials: Array<[number, number]> = [
    [1, 1],
    [2.01, 0.45],
    [3.02, 0.2],
    [4.16, 0.1],
  ];
  for (const [mult, amp] of partials) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq * mult;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(gainPeak * amp, at + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(at);
    osc.stop(at + dur + 0.05);
  }
}

/** Toca um arpejo de sinos ascendente e depois um acorde final. */
export function playAlarm() {
  try {
    const AudioCtx: typeof AudioContext | undefined =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") void ctx.resume();

    const t0 = ctx.currentTime + 0.05;
    // C6 - E6 - G6 - C7 (arpejo alegre)
    const notes = [1046.5, 1318.5, 1568.0, 2093.0];
    notes.forEach((f, i) => bell(ctx, f, t0 + i * 0.16, 1.6, 0.16));
    // Acorde final sustentado
    [523.25, 659.25, 783.99].forEach((f) => bell(ctx, f, t0 + 0.78, 3.2, 0.13));

    setTimeout(() => { void ctx.close().catch(() => {}); }, 5000);
  } catch {
    /* áudio indisponível */
  }
}

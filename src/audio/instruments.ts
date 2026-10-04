// Small synthesized instruments shared by the background music (rendered offline)
// and the sound effects (played live). Every function schedules notes on any
// BaseAudioContext, so the same sounds work in both.

export type Ctx = BaseAudioContext;

const SEMITONE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** 'F#4' -> 369.99 Hz */
export function hz(note: string): number {
  const m = /^([A-G])([#b]?)(\d)$/.exec(note);
  if (!m) throw new Error(`Bad note: ${note}`);
  const midi = (Number(m[3]) + 1) * 12 + SEMITONE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return 440 * 2 ** ((midi - 69) / 12);
}

// ---------- shared buffers ----------
const noiseBuffers = new WeakMap<Ctx, AudioBuffer>();
export function noiseBuffer(ctx: Ctx): AudioBuffer {
  let b = noiseBuffers.get(ctx);
  if (!b) {
    b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 1.5), ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noiseBuffers.set(ctx, b);
  }
  return b;
}

/** Stereo impulse response for a soft church-hall reverb. */
export function reverbBuffer(ctx: Ctx, seconds: number, decay: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const b = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** decay;
  }
  return b;
}

const reedWaves = new WeakMap<Ctx, PeriodicWave>();
function reedWave(ctx: Ctx): PeriodicWave {
  let w = reedWaves.get(ctx);
  if (!w) {
    // warm, slightly nasal double-reed spectrum (duduk-like)
    const h = [0, 1, 0.62, 0.44, 0.26, 0.17, 0.1, 0.06, 0.035, 0.02];
    w = ctx.createPeriodicWave(new Float32Array(h.length), Float32Array.from(h));
    reedWaves.set(ctx, w);
  }
  return w;
}

// ---------- helpers ----------
function osc(ctx: Ctx, type: OscillatorType, freq: number, t: number, end: number): OscillatorNode {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.start(t);
  o.stop(end + 0.05);
  return o;
}

function filter(ctx: Ctx, type: BiquadFilterType, freq: number, q = 0.7): BiquadFilterNode {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}

/** Percussive envelope: fast attack, exponential decay. */
function hit(ctx: Ctx, t: number, vol: number, attack: number, decay: number): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  return g;
}

function noiseHit(ctx: Ctx, out: AudioNode, t: number, type: BiquadFilterType, freq: number, q: number, vol: number, decay: number) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  const g = hit(ctx, t, vol, 0.002, decay);
  src.connect(filter(ctx, type, freq, q)).connect(g).connect(out);
  src.start(t, Math.random(), decay + 0.06);
}

// ---------- melodic instruments ----------

/** Plucked string (kanun / harp). `rich` adds an octave shimmer (one more oscillator). */
export function pluck(ctx: Ctx, out: AudioNode, t: number, freq: number, vol: number, decay = 0.9, bright = 3200, rich = true) {
  const end = t + decay;
  const f = filter(ctx, 'lowpass', Math.min(bright, 12000), 1.6);
  f.frequency.setValueAtTime(Math.min(bright, 12000), t);
  f.frequency.exponentialRampToValueAtTime(Math.max(260, freq * 1.3), t + decay * 0.55);
  const g = hit(ctx, t, vol, 0.004, decay);
  osc(ctx, 'sawtooth', freq, t, end).connect(f);
  if (rich) {
    const shimmer = ctx.createGain();
    shimmer.gain.value = 0.3;
    osc(ctx, 'triangle', freq * 2, t, end).connect(shimmer).connect(f);
  }
  f.connect(g).connect(out);
}

/** Warm reed melody voice with a little scoop into the note and delayed vibrato. */
export function reed(ctx: Ctx, out: AudioNode, t: number, freq: number, dur: number, vol: number) {
  const rel = 0.12;
  const end = t + dur + rel;
  const o = ctx.createOscillator();
  o.setPeriodicWave(reedWave(ctx));
  o.frequency.setValueAtTime(freq * 0.982, t);
  o.frequency.exponentialRampToValueAtTime(freq, t + 0.07);
  const lfo = osc(ctx, 'sine', 5.4, t, end);
  const depth = ctx.createGain();
  depth.gain.setValueAtTime(0, t);
  depth.gain.linearRampToValueAtTime(freq * 0.007, t + Math.min(0.4, dur * 0.7));
  lfo.connect(depth).connect(o.frequency);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.05);
  g.gain.linearRampToValueAtTime(vol * 0.78, t + Math.max(0.06, dur - 0.03));
  g.gain.linearRampToValueAtTime(0, end);
  o.connect(filter(ctx, 'lowpass', 2600, 0.8)).connect(g).connect(out);
  o.start(t);
  o.stop(end + 0.05);
}

/** Soft plucked bass. */
export function bass(ctx: Ctx, out: AudioNode, t: number, freq: number, dur: number, vol: number) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(vol * 0.45, t + dur * 0.6);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.15);
  const f = filter(ctx, 'lowpass', 750, 0.9);
  osc(ctx, 'triangle', freq, t, t + dur + 0.15).connect(f);
  osc(ctx, 'sine', freq, t, t + dur + 0.15).connect(f);
  f.connect(g).connect(out);
}

/** Quiet sustained chord. */
export function pad(ctx: Ctx, out: AudioNode, t: number, freqs: number[], dur: number, vol: number) {
  const end = t + dur + 0.6;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.5);
  g.gain.setValueAtTime(vol, t + Math.max(0.5, dur - 0.2));
  g.gain.linearRampToValueAtTime(0, end);
  const f = filter(ctx, 'lowpass', 1100, 0.5);
  freqs.forEach((fr, i) => {
    const o = osc(ctx, 'sawtooth', fr, t, end);
    o.detune.value = i % 2 ? 6 : -6;
    o.connect(f);
  });
  f.connect(g).connect(out);
}

/** FM bell / glockenspiel. ratio 2 = sweet glock, 3.5 = church bell, 1.4 = gong. */
export function bell(ctx: Ctx, out: AudioNode, t: number, freq: number, vol: number, decay = 1.6, ratio = 3.5) {
  const end = t + decay;
  const car = osc(ctx, 'sine', freq, t, end);
  const mod = osc(ctx, 'sine', freq * ratio, t, end);
  const mg = ctx.createGain();
  mg.gain.setValueAtTime(freq * 2.2, t);
  mg.gain.exponentialRampToValueAtTime(Math.max(1, freq * 0.04), t + decay * 0.6);
  mod.connect(mg).connect(car.frequency);
  car.connect(hit(ctx, t, vol, 0.003, decay)).connect(out);
}

/** Bright brass voice for fanfares and turn calls. */
export function brass(ctx: Ctx, out: AudioNode, t: number, freq: number, dur: number, vol: number) {
  const end = t + dur + 0.14;
  const f = filter(ctx, 'lowpass', freq * 1.5, 1);
  f.frequency.setValueAtTime(freq * 1.5, t);
  f.frequency.exponentialRampToValueAtTime(Math.min(freq * 8, 7000), t + 0.06);
  f.frequency.exponentialRampToValueAtTime(Math.min(freq * 4, 4000), t + Math.max(0.1, dur));
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.03);
  g.gain.linearRampToValueAtTime(vol * 0.8, t + Math.max(0.04, dur));
  g.gain.linearRampToValueAtTime(0, end);
  for (const cents of [-6, 6]) {
    const o = osc(ctx, 'sawtooth', freq, t, end);
    o.detune.value = cents;
    o.connect(f);
  }
  f.connect(g).connect(out);
}

// ---------- percussion ----------

/** Low frame drum (dhol "doom"). */
export function doom(ctx: Ctx, out: AudioNode, t: number, vol: number) {
  const o = osc(ctx, 'sine', 130, t, t + 0.5);
  o.frequency.exponentialRampToValueAtTime(52, t + 0.22);
  o.connect(hit(ctx, t, vol, 0.004, 0.42)).connect(out);
  noiseHit(ctx, out, t, 'lowpass', 500, 0.6, vol * 0.35, 0.06);
}

/** Bright rim slap ("tek"). */
export function tek(ctx: Ctx, out: AudioNode, t: number, vol: number) {
  noiseHit(ctx, out, t, 'bandpass', 2400, 1.4, vol, 0.09);
  osc(ctx, 'sine', 380, t, t + 0.06).connect(hit(ctx, t, vol * 0.5, 0.002, 0.05)).connect(out);
}

export function shaker(ctx: Ctx, out: AudioNode, t: number, vol: number) {
  noiseHit(ctx, out, t, 'highpass', 6500, 0.7, vol, 0.05);
}

export function woodblock(ctx: Ctx, out: AudioNode, t: number, freq: number, vol: number) {
  osc(ctx, 'sine', freq, t, t + 0.08).connect(hit(ctx, t, vol, 0.002, 0.06)).connect(out);
  noiseHit(ctx, out, t, 'bandpass', freq * 1.6, 3, vol * 0.5, 0.03);
}

export function clap(ctx: Ctx, out: AudioNode, t: number, vol: number) {
  const f = 1100 + Math.random() * 1300;
  for (let k = 0; k < 3; k++) noiseHit(ctx, out, t + k * 0.008, 'bandpass', f, 1.1, vol * (1 - k * 0.25), 0.025 + Math.random() * 0.015);
}

/** Filtered-noise sweep (card turning over, air movement). */
export function whoosh(ctx: Ctx, out: AudioNode, t: number, from: number, to: number, dur: number, vol: number) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  const f = filter(ctx, 'bandpass', from, 1.8);
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + dur * 0.35);
  g.gain.linearRampToValueAtTime(0, t + dur);
  src.connect(f).connect(g).connect(out);
  src.start(t, Math.random(), dur + 0.05);
}

/** Gliding soft tone (friendly "uh-oh"). */
export function glide(ctx: Ctx, out: AudioNode, t: number, from: number, to: number, dur: number, vol: number) {
  const o = osc(ctx, 'triangle', from, t, t + dur + 0.1);
  o.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.02);
  g.gain.setValueAtTime(vol, t + dur * 0.6);
  g.gain.linearRampToValueAtTime(0, t + dur + 0.08);
  o.connect(filter(ctx, 'lowpass', 1400, 0.7)).connect(g).connect(out);
}

// Background music: an original, cheerful tune in the style of an Armenian folk dance (6/8),
// played by a reed (duduk-like) melody over kanun-style plucked strings, bass and frame drum.
// The whole loop is rendered once in an OfflineAudioContext and then looped seamlessly,
// so playback costs almost nothing on a slow touch-board computer.

import { audio } from './core';
import { bass, doom, hz, pad, pluck, reed, reverbBuffer, shaker, tek, type Ctx } from './instruments';

const SAMPLE_RATE = 24000; // plenty for soft background music, and renders fast on slow computers
const EIGHTH = 0.3; // seconds per eighth note: a lively 6/8 dance (dotted quarter ≈ 67 bpm)
const BAR = 6; // eighths per bar
const HURRY_RATE = 1.12; // last minute: the music speeds up

type Note = [string | null, number]; // pitch (null = rest), length in eighths

// ---------- the score ----------
const MELODY_A: Note[][] = [
  [['D5', 2], ['F#5', 1], ['A5', 2], ['F#5', 1]],
  [['G5', 2], ['B5', 1], ['A5', 2], ['G5', 1]],
  [['F#5', 2], ['A5', 1], ['D5', 2], ['F#5', 1]],
  [['E5', 3], ['A4', 3]],
  [['D5', 2], ['F#5', 1], ['A5', 2], ['B5', 1]],
  [['B5', 2], ['A5', 1], ['G5', 2], ['E5', 1]],
  [['F#5', 2], ['E5', 1], ['C#5', 2], ['E5', 1]],
  [['D5', 5], [null, 1]],
];
const MELODY_B: Note[][] = [
  [['B4', 2], ['D5', 1], ['F#5', 3]],
  [['G5', 2], ['F#5', 1], ['E5', 2], ['D5', 1]],
  [['F#5', 2], ['E5', 1], ['D5', 2], ['A4', 1]],
  [['C#5', 2], ['D5', 1], ['E5', 3]],
  [['F#5', 1], ['G5', 1], ['A5', 1], ['B5', 2], ['A5', 1]],
  [['G5', 2], ['F#5', 1], ['E5', 2], ['G5', 1]],
  [['E5', 2], ['F#5', 1], ['E5', 2], ['C#5', 1]],
  [['D5', 3], [null, 1], ['A4', 1], ['C#5', 1]],
];
const CHORDS_A = ['D', 'G', 'D', 'A', 'D', 'G', 'A', 'D'];
const CHORDS_B = ['Bm', 'G', 'D', 'A', 'Bm', 'G', 'A', 'D'];
const ARPEGGIO: Record<string, string[]> = {
  D: ['D4', 'F#4', 'A4', 'D5'],
  G: ['D4', 'G4', 'B4', 'D5'],
  A: ['C#4', 'E4', 'A4', 'C#5'],
  Bm: ['D4', 'F#4', 'B4', 'D5'],
};
const BASS: Record<string, [string, string]> = { D: ['D3', 'A2'], G: ['G2', 'D3'], A: ['A2', 'E3'], Bm: ['B2', 'F#3'] };
const CHORD_TONES: Record<string, string[]> = {
  D: ['D4', 'F#4', 'A4'],
  G: ['D4', 'G4', 'B4'],
  A: ['C#4', 'E4', 'A4'],
  Bm: ['D4', 'F#4', 'B4'],
};
// A B A B; the second time round adds a high kanun doubling, a pad and a shaker.
const FORM = [
  { melody: MELODY_A, chords: CHORDS_A, second: false },
  { melody: MELODY_B, chords: CHORDS_B, second: false },
  { melody: MELODY_A, chords: CHORDS_A, second: true },
  { melody: MELODY_B, chords: CHORDS_B, second: true },
];
const BARS = FORM.length * 8;
export const LOOP_SECONDS = BARS * BAR * EIGHTH;
const TAIL_SECONDS = 3;

/** Slight timing looseness so it sounds played, never before 0 (Web Audio rejects negative times). */
const humanize = (t: number) => Math.max(0, t + (Math.random() - 0.5) * 0.012);
const vary = () => 0.9 + Math.random() * 0.2;

function channel(ctx: Ctx, dest: AudioNode, verb: AudioNode, level: number, send: number, panValue = 0): AudioNode {
  const g = ctx.createGain();
  g.gain.value = level;
  let out: AudioNode = g;
  if (panValue && 'createStereoPanner' in ctx) {
    const p = ctx.createStereoPanner();
    p.pan.value = panValue;
    g.connect(p);
    out = p;
  }
  out.connect(dest);
  const s = ctx.createGain();
  s.gain.value = send;
  out.connect(s).connect(verb);
  return g;
}

function schedule(ctx: Ctx, dest: AudioNode) {
  const verb = ctx.createConvolver();
  verb.buffer = reverbBuffer(ctx, 1.8, 3.2);
  const wet = ctx.createGain();
  wet.gain.value = 0.3;
  verb.connect(wet).connect(dest);

  const melody = channel(ctx, dest, verb, 1, 0.35);
  const harp = channel(ctx, dest, verb, 1, 0.4, -0.25);
  const sparkle = channel(ctx, dest, verb, 1, 0.5, 0.3);
  const low = channel(ctx, dest, verb, 1, 0.08);
  const strings = channel(ctx, dest, verb, 1, 0.6, 0.15);
  const drums = channel(ctx, dest, verb, 1, 0.12);

  let bar = 0;
  for (const part of FORM) {
    for (let i = 0; i < 8; i++, bar++) {
      const t0 = bar * BAR * EIGHTH;
      const chord = part.chords[i];

      let at = 0;
      for (const [note, len] of part.melody[i]) {
        if (note) {
          const t = humanize(t0 + at * EIGHTH);
          reed(ctx, melody, t, hz(note), len * EIGHTH * 0.92, 0.17 * vary());
          if (part.second) pluck(ctx, sparkle, t, hz(note) * 2, 0.045 * vary(), 0.6, 5200, false);
        }
        at += len;
      }

      const arp = ARPEGGIO[chord];
      [0, 1, 2, 3, 2, 1].forEach((k, j) => {
        pluck(ctx, harp, humanize(t0 + j * EIGHTH), hz(arp[k]), (j === 0 ? 0.075 : 0.058) * vary(), 0.9, 2600, false);
      });

      bass(ctx, low, t0, hz(BASS[chord][0]), 3 * EIGHTH, 0.24);
      bass(ctx, low, t0 + 3 * EIGHTH, hz(BASS[chord][1]), 3 * EIGHTH, 0.19);

      if (part.second || part.melody === MELODY_B) pad(ctx, strings, t0, CHORD_TONES[chord].map(hz), BAR * EIGHTH, 0.034);

      doom(ctx, drums, t0, 0.42);
      doom(ctx, drums, t0 + 3 * EIGHTH, 0.28);
      tek(ctx, drums, t0 + 2 * EIGHTH, 0.15);
      tek(ctx, drums, t0 + 4 * EIGHTH, 0.05);
      tek(ctx, drums, t0 + 5 * EIGHTH, 0.15);
      if (part.second) for (let j = 0; j < BAR; j++) shaker(ctx, drums, t0 + j * EIGHTH, j % 3 === 0 ? 0.07 : 0.04);
      if (bar === BARS - 1) {
        // little drum fill leading back to the top of the loop
        for (const e of [3, 3.5, 4, 4.5, 5, 5.5]) tek(ctx, drums, t0 + e * EIGHTH, 0.1 + e * 0.02);
      }
    }
  }
}

function startRendering(ctx: OfflineAudioContext): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    ctx.oncomplete = (e) => resolve(e.renderedBuffer);
    try {
      const p = ctx.startRendering() as Promise<AudioBuffer> | undefined;
      if (p && typeof p.then === 'function') p.then(resolve, reject);
    } catch (err) {
      reject(err);
    }
  });
}

/** Renders the loop, folds the reverb tail back onto the start so it loops seamlessly, and normalizes it. */
export async function renderLoop(sampleRate = SAMPLE_RATE): Promise<AudioBuffer> {
  const Ctor =
    window.OfflineAudioContext || (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext;
  const loopLen = Math.round(LOOP_SECONDS * sampleRate);
  const ctx = new Ctor(2, loopLen + Math.round(TAIL_SECONDS * sampleRate), sampleRate);
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 3;
  comp.connect(ctx.destination);
  schedule(ctx, comp);
  const rendered = await startRendering(ctx);

  const out = ctx.createBuffer(2, loopLen, sampleRate);
  let peak = 0;
  for (let c = 0; c < 2; c++) {
    const src = rendered.getChannelData(c);
    const dst = out.getChannelData(c);
    dst.set(src.subarray(0, loopLen));
    for (let i = loopLen; i < src.length; i++) dst[i - loopLen] += src[i];
    for (let i = 0; i < loopLen; i++) peak = Math.max(peak, Math.abs(dst[i]));
  }
  const scale = peak > 0 ? 0.85 / peak : 1;
  for (let c = 0; c < 2; c++) {
    const d = out.getChannelData(c);
    for (let i = 0; i < d.length; i++) d[i] *= scale;
  }
  return out;
}

// ---------- player ----------
let buffer: AudioBuffer | null = null;
let rendering: Promise<AudioBuffer | null> | null = null;
let source: AudioBufferSourceNode | null = null;
let fade: GainNode | null = null;
let wanted = false;
let hurry = false;
let position = 0; // seconds into the loop
let segmentStart = 0;
let rate = 1;

function currentPosition(ctx: BaseAudioContext): number {
  if (!buffer) return 0;
  return (position + (ctx.currentTime - segmentStart) * rate) % buffer.duration;
}

function startSource() {
  const ctx = audio.ctx();
  const out = audio.musicOut();
  if (!ctx || !out) return;
  if (!buffer) {
    void music.prepare().then(sync);
    return;
  }
  const now = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  rate = hurry ? HURRY_RATE : 1;
  src.playbackRate.value = rate;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(1, now + 1.5);
  src.connect(g).connect(out);
  src.start(now, position % buffer.duration);
  source = src;
  fade = g;
  segmentStart = now;
}

function stopSource() {
  const ctx = audio.ctx();
  if (!ctx || !source || !fade) return;
  const now = ctx.currentTime;
  position = currentPosition(ctx);
  fade.gain.cancelScheduledValues(now);
  fade.gain.setValueAtTime(fade.gain.value, now);
  fade.gain.linearRampToValueAtTime(0, now + 0.7);
  source.stop(now + 0.75);
  source = null;
  fade = null;
}

function sync() {
  const shouldPlay = wanted && audio.isMusicOn();
  if (shouldPlay && !source) startSource();
  else if (!shouldPlay && source) stopSource();
}

export const music = {
  /** Start rendering the loop early (no user gesture needed), so it is ready when the game starts. */
  prepare(): Promise<AudioBuffer | null> {
    if (!rendering) {
      rendering = renderLoop()
        .then((b) => (buffer = b))
        .catch(() => {
          rendering = null; // e.g. Web Audio unavailable; try again next time
          return null;
        });
    }
    return rendering;
  },
  isReady: () => !!buffer,
  /** Play (or continue after a pause). */
  play() {
    wanted = true;
    sync();
  },
  pause() {
    wanted = false;
    sync();
  },
  /** Stop and rewind to the beginning for the next game. */
  stop() {
    wanted = false;
    sync();
    position = 0;
    hurry = false;
  },
  /** Called when the music on/off switch changes. */
  refresh() {
    sync();
  },
  setHurry(on: boolean) {
    if (on === hurry) return;
    hurry = on;
    const ctx = audio.ctx();
    if (!ctx || !source) return;
    position = currentPosition(ctx);
    segmentStart = ctx.currentTime;
    rate = on ? HURRY_RATE : 1;
    source.playbackRate.setValueAtTime(source.playbackRate.value, ctx.currentTime);
    source.playbackRate.linearRampToValueAtTime(rate, ctx.currentTime + 1.5);
  },
};

// The live AudioContext with two separately switchable channels: music and sound effects.
import { reverbBuffer } from './instruments';

const MUSIC_LEVEL = 0.34; // background music sits well under the effects
const EFFECTS_LEVEL = 0.9;

let ctx: AudioContext | null = null;
let musicBus: GainNode | null = null;
let fxDry: GainNode | null = null;
let fxBus: GainNode | null = null;
let musicOn = true;
let effectsOn = true;
let unlocked = false;

function build(): AudioContext | null {
  if (ctx) return ctx;
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor({ latencyHint: 'interactive' });
  } catch {
    return null;
  }
  const c = ctx;
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -10;
  comp.ratio.value = 4;
  comp.attack.value = 0.005;
  comp.release.value = 0.2;
  comp.connect(c.destination);

  musicBus = c.createGain();
  musicBus.gain.value = musicOn ? MUSIC_LEVEL : 0;
  musicBus.connect(comp);

  fxBus = c.createGain();
  fxBus.gain.value = effectsOn ? EFFECTS_LEVEL : 0;
  fxBus.connect(comp);
  fxDry = c.createGain();
  fxDry.connect(fxBus);
  const verb = c.createConvolver();
  verb.buffer = reverbBuffer(c, 1.4, 3.5);
  const send = c.createGain();
  send.gain.value = 0.22;
  fxDry.connect(send).connect(verb).connect(fxBus);
  return c;
}

function ramp(g: GainNode | null, v: number) {
  if (!g || !ctx) return;
  const now = ctx.currentTime;
  g.gain.cancelScheduledValues(now);
  g.gain.setValueAtTime(g.gain.value, now);
  g.gain.linearRampToValueAtTime(v, now + 0.4);
}

export const audio = {
  /** Call from a user gesture: browsers only allow sound after the first tap. */
  unlock() {
    const c = build();
    if (c) unlocked = true;
    if (c && c.state === 'suspended') void c.resume().catch(() => undefined);
  },
  /** The running context, or null before the first tap / when audio is unavailable. */
  ctx(): AudioContext | null {
    return ctx && ctx.state !== 'closed' ? ctx : null;
  },
  musicOut: () => musicBus,
  /** Destination for effects; null when effects are switched off (nothing gets scheduled). */
  fxOut: () => (effectsOn && ctx ? fxDry : null),
  /** True once a user gesture has allowed sound (the context may still be resuming). */
  isUnlocked: () => unlocked,
  isMusicOn: () => musicOn,
  isEffectsOn: () => effectsOn,
  setMusicOn(on: boolean) {
    musicOn = on;
    ramp(musicBus, on ? MUSIC_LEVEL : 0);
  },
  setEffectsOn(on: boolean) {
    effectsOn = on;
    ramp(fxBus, on ? EFFECTS_LEVEL : 0);
  },
  /** Briefly lower the music under an important effect (fanfare, big win). */
  duck(seconds: number) {
    if (!musicBus || !ctx || !musicOn) return;
    const now = ctx.currentTime;
    musicBus.gain.cancelScheduledValues(now);
    musicBus.gain.setValueAtTime(musicBus.gain.value, now);
    musicBus.gain.linearRampToValueAtTime(MUSIC_LEVEL * 0.35, now + 0.08);
    musicBus.gain.setValueAtTime(MUSIC_LEVEL * 0.35, now + seconds);
    musicBus.gain.linearRampToValueAtTime(MUSIC_LEVEL, now + seconds + 0.6);
  },
};

// Sound effects for every game moment, synthesized live.
import { audio } from './core';
import { bell, brass, clap, doom, glide, hz, pluck, whoosh, woodblock } from './instruments';

function fx(): { ctx: AudioContext; out: AudioNode; t: number } | null {
  const ctx = audio.ctx();
  const out = audio.fxOut();
  if (!ctx || !out || !audio.isUnlocked()) return null;
  return { ctx, out, t: ctx.currentTime + 0.01 };
}

const UP_RUN = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6'];

export const sfx = {
  /** A card turns face up. The second card of a try sounds a little higher. */
  flip(order: 0 | 1) {
    const a = fx();
    if (!a) return;
    const { ctx, out, t } = a;
    whoosh(ctx, out, t, 700, 3200, 0.14, 0.3);
    woodblock(ctx, out, t + 0.12, 2200, 0.05);
    pluck(ctx, out, t + 0.1, hz(order === 0 ? 'G5' : 'D6'), 0.12, 0.5, 5000);
  },

  /** Two wrong cards turn back over. */
  close() {
    const a = fx();
    if (!a) return;
    const { ctx, out, t } = a;
    whoosh(ctx, out, t, 2800, 600, 0.18, 0.2);
    whoosh(ctx, out, t + 0.05, 2400, 500, 0.18, 0.14);
  },

  /** Correct pair: a sparkling harp run and bells. */
  match() {
    const a = fx();
    if (!a) return;
    const { ctx, out, t } = a;
    UP_RUN.forEach((n, i) => pluck(ctx, out, t + i * 0.038, hz(n), 0.085, 0.7, 6000));
    const chord = t + UP_RUN.length * 0.038;
    for (const n of ['C6', 'E6', 'G6']) bell(ctx, out, chord, hz(n), 0.09, 1.8, 2);
    bell(ctx, out, chord, hz('C5'), 0.06, 1.2, 3.5);
    whoosh(ctx, out, chord, 6000, 12000, 0.5, 0.04);
  },

  /** Wrong pair: a friendly "uh-oh". */
  miss() {
    const a = fx();
    if (!a) return;
    const { ctx, out, t } = a;
    glide(ctx, out, t, hz('E4'), hz('D#4'), 0.18, 0.2);
    glide(ctx, out, t + 0.22, hz('C4'), hz('A3'), 0.38, 0.2);
  },

  /** Turn passes: each team has its own short horn call. */
  turn(team: 0 | 1) {
    const a = fx();
    if (!a) return;
    const { ctx, out, t } = a;
    const call = team === 0 ? ['G4', 'C5', 'E5'] : ['E5', 'C5', 'G5'];
    brass(ctx, out, t, hz(call[0]), 0.1, 0.1);
    brass(ctx, out, t + 0.13, hz(call[1]), 0.1, 0.1);
    brass(ctx, out, t + 0.26, hz(call[2]), 0.35, 0.12);
    doom(ctx, out, t + 0.26, 0.25);
  },

  /** Game starts: "ta-da". */
  start() {
    const a = fx();
    if (!a) return;
    const { ctx, out, t } = a;
    for (const n of ['C4', 'E4', 'G4']) brass(ctx, out, t, hz(n), 0.1, 0.07);
    for (const n of ['C5', 'E5', 'G5', 'C4']) brass(ctx, out, t + 0.16, hz(n), 0.7, 0.07);
    doom(ctx, out, t + 0.16, 0.4);
    for (const n of ['G6', 'C7']) bell(ctx, out, t + 0.2, hz(n), 0.05, 1.4, 2);
  },

  /** Each of the last ten seconds; the final three sound higher. */
  tick(final: boolean) {
    const a = fx();
    if (!a) return;
    woodblock(a.ctx, a.out, a.t, final ? 1600 : 1050, 0.2);
  },

  /** One minute left: ding-dong. */
  warn() {
    const a = fx();
    if (!a) return;
    const { ctx, out, t } = a;
    bell(ctx, out, t, hz('E6'), 0.13, 1.6, 3.5);
    bell(ctx, out, t + 0.45, hz('C6'), 0.13, 2.2, 3.5);
  },

  /** Time is up: a gong. */
  timeUp() {
    const a = fx();
    if (!a) return;
    const { ctx, out, t } = a;
    bell(ctx, out, t, hz('C3'), 0.4, 3.5, 1.4);
    bell(ctx, out, t, hz('G3'), 0.15, 2.5, 1.4);
    whoosh(ctx, out, t, 300, 120, 1.2, 0.1);
  },

  /** Winner announcement: brass fanfare, drum roll, then applause. */
  fanfare() {
    const a = fx();
    if (!a) return;
    const { ctx, out, t } = a;
    audio.duck(4);
    const lead: [string, string, number, number][] = [
      ['G4', 'E4', 0, 0.12],
      ['G4', 'E4', 0.16, 0.12],
      ['G4', 'E4', 0.32, 0.12],
      ['C5', 'G4', 0.48, 0.55],
      ['A4', 'F4', 1.08, 0.16],
      ['B4', 'G4', 1.28, 0.16],
      ['C5', 'E4', 1.48, 1.1],
    ];
    for (const [hi, lo, at, dur] of lead) {
      brass(ctx, out, t + at, hz(hi), dur, 0.11);
      brass(ctx, out, t + at, hz(lo), dur, 0.07);
    }
    brass(ctx, out, t + 1.48, hz('C4'), 1.1, 0.07);
    brass(ctx, out, t + 1.48, hz('G5'), 1.1, 0.05);
    for (let k = 0; k < 8; k++) doom(ctx, out, t + 1.0 + k * 0.06, 0.12 + k * 0.03);
    doom(ctx, out, t + 1.48, 0.5);
    for (const n of ['C6', 'E6', 'G6', 'C7']) bell(ctx, out, t + 1.5, hz(n), 0.05, 2, 2);
    sfx.applause(t + 1.9 - ctx.currentTime);
  },

  /** A room full of clapping children. */
  applause(delay = 0) {
    const a = fx();
    if (!a) return;
    const { ctx, out, t } = a;
    const start = t + Math.max(0, delay);
    const length = 3.2;
    for (let person = 0; person < 14; person++) {
      const every = 0.17 + Math.random() * 0.1;
      for (let at = Math.random() * every; at < length; at += every * (0.9 + Math.random() * 0.2)) {
        const swell = Math.min(1, at / 0.4) * Math.min(1, (length - at) / 1.2);
        clap(ctx, out, start + at, 0.11 * swell * (0.7 + Math.random() * 0.6));
      }
    }
  },

  /** Soft tap for menu buttons. */
  click() {
    const a = fx();
    if (!a) return;
    woodblock(a.ctx, a.out, a.t, 1900, 0.07);
  },
};

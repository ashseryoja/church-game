import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS, buildDeck, endGame, flip, isValidState, newGame, passTurn, pause, resolve, resume, tick, winner,
  type Card, type GameState,
} from './engine';
import { PAIRS } from '../data/pairs';

// Unshuffled deck: index 2k is hero of pair k, index 2k+1 is its object.
const ordered = (): Card[] => buildDeck();
const start = (over: Partial<typeof DEFAULT_SETTINGS> = {}): GameState =>
  newGame({ ...DEFAULT_SETTINGS, firstTeam: 0, ...over }, Math.random, ordered());

describe('deck', () => {
  it('has 25 pairs = 50 cards, one hero and one object per pair', () => {
    const deck = buildDeck();
    expect(PAIRS).toHaveLength(25);
    expect(deck).toHaveLength(50);
    for (const p of PAIRS) {
      const cards = deck.filter((c) => c.pairId === p.id);
      expect(cards.map((c) => c.kind).sort()).toEqual(['hero', 'object']);
    }
  });

  it('shuffles into a permutation of the same cards', () => {
    const s = newGame(DEFAULT_SETTINGS);
    const key = (c: Card) => `${c.pairId}:${c.kind}`;
    expect(s.deck.map(key).sort()).toEqual(buildDeck().map(key).sort());
  });

  it('uses the configured duration', () => {
    expect(start().timeLeftMs).toBe(15 * 60_000);
    expect(start({ durationMin: 10 }).timeLeftMs).toBe(10 * 60_000);
  });
});

describe('turns', () => {
  it('a correct pair scores 1, stays open and the same team continues', () => {
    let s = flip(flip(start(), 0), 1);
    expect(s.pending).toBe('match');
    expect(s.scores).toEqual([1, 0]);
    expect(s.matchedBy[PAIRS[0].id]).toBe(0);
    s = resolve(s);
    expect(s.turn).toBe(0);
    expect(s.open).toEqual([]);
    // matched cards can no longer be flipped
    expect(flip(s, 0)).toBe(s);
  });

  it('a wrong pair closes again and the turn passes to the other team', () => {
    let s = flip(flip(start(), 0), 3);
    expect(s.pending).toBe('miss');
    expect(s.scores).toEqual([0, 0]);
    s = resolve(s);
    expect(s.open).toEqual([]);
    expect(s.turn).toBe(1);
    expect(s.matchedBy).toEqual({});
  });

  it('ignores taps while two cards are being shown, on the same card, or when paused', () => {
    let s = flip(start(), 0);
    expect(flip(s, 0)).toBe(s);
    s = flip(s, 3);
    expect(flip(s, 5)).toBe(s);
    const p = pause(resolve(s));
    expect(flip(p, 5)).toBe(p);
    expect(flip(resume(p), 5).open).toEqual([5]);
  });

  it('points go to the team whose turn it is', () => {
    let s = resolve(flip(flip(start(), 0), 3)); // team 0 misses
    s = resolve(flip(flip(s, 2), 3)); // team 1 finds pair 1
    expect(s.scores).toEqual([0, 1]);
    expect(s.turn).toBe(1);
  });

  it('host can pass the turn', () => {
    expect(passTurn(start()).turn).toBe(1);
  });
});

describe('end of game', () => {
  it('finishes when every pair is found', () => {
    let s = start();
    for (let k = 0; k < 25; k++) s = resolve(flip(flip(s, 2 * k), 2 * k + 1));
    expect(s.phase).toBe('finished');
    expect(s.endReason).toBe('complete');
    expect(s.scores).toEqual([25, 0]);
    expect(winner(s)).toBe(0);
  });

  it('finishes when time runs out and the clock does not run while paused', () => {
    let s = start({ durationMin: 1 });
    s = tick(s, 30_000);
    expect(s.timeLeftMs).toBe(30_000);
    s = pause(s);
    expect(tick(s, 10_000).timeLeftMs).toBe(30_000);
    s = tick(resume(s), 30_000);
    expect(s.phase).toBe('finished');
    expect(s.endReason).toBe('time');
    expect(s.timeLeftMs).toBe(0);
  });

  it('a draw has no winner and manual end works', () => {
    const s = endGame(start());
    expect(s.phase).toBe('finished');
    expect(s.endReason).toBe('manual');
    expect(winner(s)).toBeNull();
  });

  it('validates restored state', () => {
    expect(isValidState(start())).toBe(true);
    expect(isValidState({})).toBe(false);
    expect(isValidState(null)).toBe(false);
  });
});

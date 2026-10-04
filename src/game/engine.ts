// Pure game rules for «Կափառնա — Համապատասխանեցում».
// Rules from the game description:
//  - two teams, relay style, children take turns and open two windows;
//  - hero + matching object  -> team gets 1 point, both cards stay open, the same team goes on;
//  - no match                -> both cards close again and the turn passes to the other team;
//  - the game lasts 15 minutes (configurable), or until every pair is found.

import { PAIRS } from '../data/pairs';

export type Team = 0 | 1;
export type CardKind = 'hero' | 'object';
export type Phase = 'playing' | 'paused' | 'finished';
export type EndReason = 'time' | 'complete' | 'manual';

export interface Card {
  pairId: string;
  kind: CardKind;
}

export interface Settings {
  teamNames: [string, string];
  durationMin: number;
  firstTeam: Team | 'random';
  objectLabels: boolean;
}

export interface GameState {
  v: 1;
  settings: Settings;
  deck: Card[];
  /** Board indices that are face up in the current attempt (0, 1 or 2 cards). */
  open: number[];
  /** pairId -> team that found it. */
  matchedBy: Record<string, Team>;
  scores: [number, number];
  turn: Team;
  /** Set once two cards are open; the UI shows the result, then calls resolve(). */
  pending: null | 'match' | 'miss';
  timeLeftMs: number;
  phase: Phase;
  endReason: EndReason | null;
  attempts: number;
}

export const DEFAULT_SETTINGS: Settings = {
  teamNames: ['Թիմ 1', 'Թիմ 2'],
  durationMin: 15,
  firstTeam: 'random',
  objectLabels: true,
};

export const other = (t: Team): Team => (t === 0 ? 1 : 0);

export function buildDeck(pairIds: string[] = PAIRS.map((p) => p.id)): Card[] {
  return pairIds.flatMap((pairId) => [
    { pairId, kind: 'hero' as const },
    { pairId, kind: 'object' as const },
  ]);
}

export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function newGame(settings: Settings, rng: () => number = Math.random, deck?: Card[]): GameState {
  const turn: Team = settings.firstTeam === 'random' ? (rng() < 0.5 ? 0 : 1) : settings.firstTeam;
  return {
    v: 1,
    settings,
    deck: deck ?? shuffle(buildDeck(), rng),
    open: [],
    matchedBy: {},
    scores: [0, 0],
    turn,
    pending: null,
    timeLeftMs: Math.round(settings.durationMin * 60_000),
    phase: 'playing',
    endReason: null,
    attempts: 0,
  };
}

export const totalPairs = (s: GameState) => s.deck.length / 2;
export const foundPairs = (s: GameState) => Object.keys(s.matchedBy).length;
export const isMatched = (s: GameState, index: number) => s.deck[index].pairId in s.matchedBy;

export function canFlip(s: GameState, index: number): boolean {
  return (
    s.phase === 'playing' &&
    s.pending === null &&
    index >= 0 &&
    index < s.deck.length &&
    !s.open.includes(index) &&
    !isMatched(s, index)
  );
}

/** A child taps a closed card. */
export function flip(s: GameState, index: number): GameState {
  if (!canFlip(s, index)) return s;
  const open = [...s.open, index];
  if (open.length < 2) return { ...s, open };

  const [a, b] = open.map((i) => s.deck[i]);
  const attempts = s.attempts + 1;
  if (a.pairId === b.pairId) {
    const matchedBy = { ...s.matchedBy, [a.pairId]: s.turn };
    const scores: [number, number] = [...s.scores];
    scores[s.turn] += 1;
    const next: GameState = { ...s, open, matchedBy, scores, pending: 'match', attempts };
    if (Object.keys(matchedBy).length === totalPairs(s)) {
      return { ...next, phase: 'finished', endReason: 'complete' };
    }
    return next;
  }
  return { ...s, open, pending: 'miss', attempts };
}

/** Called by the UI after the children have had time to see the two open cards. */
export function resolve(s: GameState): GameState {
  if (s.pending === null) return s;
  if (s.pending === 'match') return { ...s, open: [], pending: null };
  return { ...s, open: [], pending: null, turn: other(s.turn) };
}

export function tick(s: GameState, dtMs: number): GameState {
  if (s.phase !== 'playing' || dtMs <= 0) return s;
  const timeLeftMs = s.timeLeftMs - dtMs;
  if (timeLeftMs > 0) return { ...s, timeLeftMs };
  return { ...s, timeLeftMs: 0, phase: 'finished', endReason: 'time', open: [], pending: null };
}

export function pause(s: GameState): GameState {
  return s.phase === 'playing' ? { ...s, phase: 'paused' } : s;
}

export function resume(s: GameState): GameState {
  return s.phase === 'paused' ? { ...s, phase: 'playing' } : s;
}

/** Host correction from the pause menu: hand the turn to the other team. */
export function passTurn(s: GameState): GameState {
  if (s.phase === 'finished') return s;
  return { ...s, open: [], pending: null, turn: other(s.turn) };
}

export function endGame(s: GameState): GameState {
  if (s.phase === 'finished') return s;
  return { ...s, phase: 'finished', endReason: 'manual', open: [], pending: null };
}

/** null = draw */
export function winner(s: GameState): Team | null {
  if (s.scores[0] === s.scores[1]) return null;
  return s.scores[0] > s.scores[1] ? 0 : 1;
}

/** Basic shape check for a game restored from storage. */
export function isValidState(x: unknown): x is GameState {
  const s = x as GameState;
  return (
    !!s &&
    s.v === 1 &&
    Array.isArray(s.deck) &&
    s.deck.length === PAIRS.length * 2 &&
    s.deck.every((c) => c && typeof c.pairId === 'string' && (c.kind === 'hero' || c.kind === 'object')) &&
    Array.isArray(s.open) &&
    Array.isArray(s.scores) &&
    (s.turn === 0 || s.turn === 1) &&
    typeof s.timeLeftMs === 'number' &&
    !!s.settings &&
    Array.isArray(s.settings.teamNames)
  );
}

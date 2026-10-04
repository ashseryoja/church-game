import './fonts.css';
import './styles.css';
import { PAIRS, PAIR_BY_ID } from './data/pairs';
import { heroSvg } from './art/heroes';
import { objectSvg } from './art/objects';
import { CARD_BACK_ORNAMENT, CARD_BACK_TILE, ICONS, TEAM_EMBLEMS, svgUrl } from './art/ornaments';
import { audio, music, sfx } from './audio';
import { T } from './i18n';
import * as G from './game/engine';

// ---------- timing ----------
const MATCH_SHOW_MS = 1300; // correct pair: celebrate, then the same team continues
const MISS_SHOW_MS = 2300; // wrong pair: time to remember both pictures before they close
const RESULTS_DELAY_MS = 700;

// ---------- storage (best effort; the game works without it) ----------
const KEY_GAME = 'kapharna-game-v1';
const KEY_SETTINGS = 'kapharna-settings-v1';
const KEY_MUTED = 'kapharna-muted-v1'; // old effects-only switch, read once for migration
const KEY_AUDIO = 'kapharna-audio-v1';
const store = {
  get<V>(k: string): V | null {
    try {
      const v = localStorage.getItem(k);
      return v ? (JSON.parse(v) as V) : null;
    } catch {
      return null;
    }
  },
  set(k: string, v: unknown) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {
      /* storage unavailable */
    }
  },
  del(k: string) {
    try {
      localStorage.removeItem(k);
    } catch {
      /* storage unavailable */
    }
  },
};

// ---------- art ----------
const urlCache = new Map<string, string>();
function artUrl(card: G.Card): string {
  const key = `${card.pairId}:${card.kind}`;
  let url = urlCache.get(key);
  if (!url) {
    url = svgUrl(card.kind === 'hero' ? heroSvg(card.pairId) : objectSvg(PAIR_BY_ID[card.pairId].objectArt));
    urlCache.set(key, url);
  }
  return url;
}
const cardName = (card: G.Card) => (card.kind === 'hero' ? PAIR_BY_ID[card.pairId].hero : PAIR_BY_ID[card.pairId].object);
/** Size class for a card name: long names wrap to two lines, a very long single word needs a smaller font. */
const labelSize = (name: string) => {
  const longestWord = Math.max(...name.split(/\s+/).map((w) => w.length));
  if (longestWord >= 13) return ' xlong';
  return name.length > 12 ? ' long' : '';
};
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const EMBLEM_URLS = TEAM_EMBLEMS.map(svgUrl);

const root = document.documentElement;
root.style.setProperty('--back-ornament', `url("${svgUrl(CARD_BACK_ORNAMENT)}")`);
root.style.setProperty('--back-tile', `url("${svgUrl(CARD_BACK_TILE)}")`);
root.style.setProperty('--emblem-0', `url("${EMBLEM_URLS[0]}")`);
root.style.setProperty('--emblem-1', `url("${EMBLEM_URLS[1]}")`);

// ---------- state ----------
let settings: G.Settings = loadSettings();
let game: G.GameState | null = null;
let revealAll = false;
let resultsShown = false;
let pendingTimer = 0;
let lastTick = performance.now();
let lastSecond = -1;
let lastSave = 0;
let wakeLock: { release(): Promise<void> } | null = null;

function loadSettings(): G.Settings {
  const s = store.get<Partial<G.Settings>>(KEY_SETTINGS);
  const d = G.DEFAULT_SETTINGS;
  if (!s) return { ...d, teamNames: [...d.teamNames] };
  return {
    teamNames: Array.isArray(s.teamNames) && s.teamNames.length === 2 ? [String(s.teamNames[0]), String(s.teamNames[1])] : [...d.teamNames],
    durationMin: typeof s.durationMin === 'number' && s.durationMin >= 1 && s.durationMin <= 60 ? s.durationMin : d.durationMin,
    firstTeam: s.firstTeam === 0 || s.firstTeam === 1 || s.firstTeam === 'random' ? s.firstTeam : d.firstTeam,
    objectLabels: typeof s.objectLabels === 'boolean' ? s.objectLabels : d.objectLabels,
  };
}

function saveGame(force = false) {
  const now = performance.now();
  if (!force && now - lastSave < 2000) return;
  lastSave = now;
  if (game && game.phase !== 'finished') store.set(KEY_GAME, game);
  else store.del(KEY_GAME);
}

// ---------- shell ----------
const app = document.getElementById('app')!;
const teamCard = (t: 0 | 1) => `
  <div class="team" id="team-${t}" data-team="${t}">
    <img class="emblem" src="${EMBLEM_URLS[t]}" alt="" draggable="false">
    <div class="team-text">
      <span class="team-name"></span>
      <span class="turn-flag">${T.yourTurn}</span>
    </div>
    <span class="score" id="score-${t}">0</span>
  </div>`;

const parade = ['noah', 'david', 'daniel', 'jonah']
  .flatMap((id) => [
    { pairId: id, kind: 'hero' as const },
    { pairId: id, kind: 'object' as const },
  ])
  .map(
    (c, i) => `<div class="mini ${c.kind}" style="--i:${i}"><img src="${artUrl(c)}" alt="" draggable="false"><span>${esc(cardName(c))}</span></div>`,
  )
  .join('');

app.innerHTML = `
<section class="screen setup" id="setup">
  <div class="setup-inner">
    <div class="parade" aria-hidden="true">${parade}</div>
    <header class="masthead">
      <h1 class="title">${T.title}</h1>
      <p class="subtitle">${T.subtitle}</p>
    </header>
    <div class="setup-grid">
      <section class="panel rules" aria-labelledby="rules-title">
        <h2 id="rules-title">${T.rulesTitle}</h2>
        <ul>${T.rules.map((r) => `<li>${r}</li>`).join('')}</ul>
        <button type="button" class="btn ghost" id="pairs-btn">${ICONS.book}<span>${T.pairs}</span></button>
      </section>
      <form class="panel settings" id="settings-form" autocomplete="off">
        <div class="field">
          <span class="field-label">${T.teams}</span>
          <div class="team-inputs">
            ${[0, 1]
              .map(
                (t) => `<label class="team-input" for="team-name-${t}" data-team="${t}">
                  <img src="${EMBLEM_URLS[t]}" alt="">
                  <span class="sr-only">${T.teamNameLabel(t + 1)}</span>
                  <input id="team-name-${t}" name="team-${t}" maxlength="18" enterkeyhint="done" spellcheck="false">
                </label>`,
              )
              .join('')}
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <span class="field-label" id="duration-label">${T.duration}</span>
            <div class="stepper" role="group" aria-labelledby="duration-label">
              <button type="button" class="step" id="dur-minus" aria-label="${T.less}">−</button>
              <output id="dur-value" aria-live="polite"></output>
              <span class="unit">${T.minutes}</span>
              <button type="button" class="step" id="dur-plus" aria-label="${T.more}">+</button>
            </div>
          </div>
          <div class="field">
            <span class="field-label" id="labels-label">${T.objectLabels}</span>
            <div class="segmented" role="radiogroup" aria-labelledby="labels-label" id="labels-seg">
              <button type="button" role="radio" data-v="on">${T.show}</button>
              <button type="button" role="radio" data-v="off">${T.hide}</button>
            </div>
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <span class="field-label" id="music-label">${T.music}</span>
            <div class="segmented" role="radiogroup" aria-labelledby="music-label" id="music-seg">
              <button type="button" role="radio" data-v="on">${ICONS.musicOn}<span>${T.on}</span></button>
              <button type="button" role="radio" data-v="off">${T.off}</button>
            </div>
          </div>
          <div class="field">
            <span class="field-label" id="effects-label">${T.sound}</span>
            <div class="segmented" role="radiogroup" aria-labelledby="effects-label" id="effects-seg">
              <button type="button" role="radio" data-v="on">${ICONS.soundOn}<span>${T.on}</span></button>
              <button type="button" role="radio" data-v="off">${T.off}</button>
            </div>
          </div>
        </div>
        <div class="field">
          <span class="field-label" id="first-label">${T.firstTurn}</span>
          <div class="segmented three" role="radiogroup" aria-labelledby="first-label" id="first-seg">
            <button type="button" role="radio" data-v="0" class="first-0"></button>
            <button type="button" role="radio" data-v="random">${T.random}</button>
            <button type="button" role="radio" data-v="1" class="first-1"></button>
          </div>
        </div>
        <div class="actions">
          <button type="submit" class="btn primary big" id="start-btn">${T.start}</button>
          <button type="button" class="btn" id="resume-btn" hidden>${ICONS.play}<span>${T.resume}</span></button>
        </div>
      </form>
    </div>
  </div>
</section>

<section class="screen game" id="game" hidden>
  <header class="hud">
    ${teamCard(0)}
    <div class="clock" id="clock">
      <div class="game-title">${T.fullTitle}</div>
      <div class="time" id="time" role="timer">15:00</div>
      <div class="bar"><span id="time-bar"></span></div>
      <div class="controls">
        <span class="found" id="found"></span>
        <button type="button" class="icon-btn" id="pause-btn" aria-label="${T.pause}" title="${T.pause}">${ICONS.pause}</button>
        <button type="button" class="icon-btn" id="music-btn" aria-label="${T.music}" title="${T.music}"></button>
        <button type="button" class="icon-btn" id="sound-btn" aria-label="${T.sound}" title="${T.sound}"></button>
        <button type="button" class="icon-btn" id="fs-btn" aria-label="${T.fullscreen}" title="${T.fullscreen}">${ICONS.fullscreen}</button>
      </div>
    </div>
    ${teamCard(1)}
  </header>
  <main class="board" id="board"></main>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>
</section>

<div class="overlay" id="pause-overlay" hidden>
  <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="pause-title">
    <h2 id="pause-title">${T.pause}</h2>
    <p class="sheet-score" id="pause-score"></p>
    <div class="sheet-actions">
      <button type="button" class="btn primary big" id="resume-game">${ICONS.play}<span>${T.continue}</span></button>
      <div class="host-row">
        <button type="button" class="btn" id="pass-turn">${ICONS.swap}<span>${T.passTurn}</span></button>
        <button type="button" class="btn" id="end-game" data-confirm>${ICONS.flag}<span>${T.endGame}</span></button>
        <button type="button" class="btn" id="new-game" data-confirm>${ICONS.restart}<span>${T.newGame}</span></button>
      </div>
    </div>
  </div>
</div>

<div class="overlay" id="results-overlay" hidden>
  <div class="sheet results" role="dialog" aria-modal="true" aria-labelledby="results-title">
    <p class="eyebrow" id="results-reason"></p>
    <h2 id="results-title">${T.results}</h2>
    <div class="winner" id="results-winner"></div>
    <div class="final-scores" id="results-scores"></div>
    <div class="sheet-actions row">
      <button type="button" class="btn" id="reveal-all">${ICONS.eye}<span>${T.revealAll}</span></button>
      <button type="button" class="btn ghost-dark" id="results-pairs">${ICONS.book}<span>${T.pairs}</span></button>
      <button type="button" class="btn primary" id="results-new">${ICONS.restart}<span>${T.newGame}</span></button>
    </div>
  </div>
</div>

<div class="overlay pairs-overlay" id="pairs-overlay" hidden>
  <div class="sheet pairs-sheet" role="dialog" aria-modal="true" aria-labelledby="pairs-title">
    <div class="pairs-head">
      <div>
        <h2 id="pairs-title">${T.pairs}</h2>
        <p>${T.pairsCount}</p>
      </div>
      <button type="button" class="icon-btn dark" id="pairs-close" aria-label="${T.close}" title="${T.close}">${ICONS.close}</button>
    </div>
    <div class="pairs-grid" id="pairs-grid"></div>
  </div>
</div>

<canvas id="confetti" aria-hidden="true"></canvas>
`;

const $ = <E extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as E;
const setupEl = $('setup');
const gameEl = $('game');
const boardEl = $('board');
const toastEl = $('toast');
const timeEl = $('time');
const timeBar = $('time-bar');
const clockEl = $('clock');
const foundEl = $('found');
const teamEls = [$('team-0'), $('team-1')];
const scoreEls = [$('score-0'), $('score-1')];
const pauseOverlay = $('pause-overlay');
const resultsOverlay = $('results-overlay');
const pairsOverlay = $('pairs-overlay');
const soundBtn = $('sound-btn');
const musicBtn = $('music-btn');
const fsBtn = $('fs-btn');
let cardEls: HTMLButtonElement[] = [];

// ---------- setup screen ----------
const nameInputs = [$<HTMLInputElement>('team-name-0'), $<HTMLInputElement>('team-name-1')];
const durValue = $<HTMLOutputElement>('dur-value');

function teamNamesFromInputs(): [string, string] {
  return [0, 1].map((t) => nameInputs[t].value.trim() || T.defaultTeam(t + 1)) as [string, string];
}

function renderSetup() {
  nameInputs.forEach((inp, t) => {
    if (document.activeElement !== inp) inp.value = settings.teamNames[t];
    inp.placeholder = T.defaultTeam(t + 1);
  });
  durValue.value = String(settings.durationMin);
  const names = teamNamesFromInputs();
  setupEl.querySelector('.first-0')!.textContent = names[0];
  setupEl.querySelector('.first-1')!.textContent = names[1];
  setupEl.querySelectorAll<HTMLButtonElement>('#first-seg button').forEach((b) => {
    b.setAttribute('aria-checked', String(b.dataset.v === String(settings.firstTeam)));
  });
  setupEl.querySelectorAll<HTMLButtonElement>('#labels-seg button').forEach((b) => {
    b.setAttribute('aria-checked', String((b.dataset.v === 'on') === settings.objectLabels));
  });
  const saved = store.get<unknown>(KEY_GAME);
  $('resume-btn').hidden = !(G.isValidState(saved) && saved.phase !== 'finished');
}

function saveSettings() {
  settings = { ...settings, teamNames: teamNamesFromInputs() };
  store.set(KEY_SETTINGS, settings);
}

nameInputs.forEach((inp) =>
  inp.addEventListener('input', () => {
    saveSettings();
    renderSetup();
  }),
);
$('dur-minus').addEventListener('click', () => {
  settings = { ...settings, durationMin: Math.max(1, settings.durationMin - 1) };
  saveSettings();
  renderSetup();
});
$('dur-plus').addEventListener('click', () => {
  settings = { ...settings, durationMin: Math.min(60, settings.durationMin + 1) };
  saveSettings();
  renderSetup();
});
$('first-seg').addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
  if (!b) return;
  settings = { ...settings, firstTeam: b.dataset.v === 'random' ? 'random' : (Number(b.dataset.v) as G.Team) };
  saveSettings();
  renderSetup();
});
$('labels-seg').addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
  if (!b) return;
  settings = { ...settings, objectLabels: b.dataset.v === 'on' };
  saveSettings();
  renderSetup();
});
$('music-seg').addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
  if (b) setMusic(b.dataset.v === 'on');
});
$('effects-seg').addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
  if (b) setEffects(b.dataset.v === 'on');
});
$('settings-form').addEventListener('submit', (e) => {
  e.preventDefault();
  audio.unlock();
  saveSettings();
  startNewGame();
});
$('resume-btn').addEventListener('click', () => {
  audio.unlock();
  const saved = store.get<unknown>(KEY_GAME);
  if (G.isValidState(saved)) enterGame(saved, true);
});
$('pairs-btn').addEventListener('click', openPairs);

// ---------- game screen ----------
function buildBoard(g: G.GameState) {
  boardEl.innerHTML = g.deck
    .map((card, i) => {
      const name = cardName(card);
      const showLabel = card.kind === 'hero' || g.settings.objectLabels;
      return `<button type="button" class="card" data-i="${i}" aria-label="${T.card(i + 1)}">
        <span class="card-inner">
          <span class="face back"></span>
          <span class="face front ${card.kind}">
            <img class="art" src="${artUrl(card)}" alt="" draggable="false">
            ${showLabel ? `<span class="label${labelSize(name)}">${esc(name)}</span>` : ''}
            <span class="badge"></span>
          </span>
        </span>
      </button>`;
    })
    .join('');
  cardEls = Array.from(boardEl.querySelectorAll<HTMLButtonElement>('.card'));
}

boardEl.addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest<HTMLButtonElement>('.card');
  if (el) onCardTap(Number(el.dataset.i));
});

function startNewGame() {
  const g = G.newGame({ ...settings, teamNames: [...settings.teamNames] as [string, string] });
  music.stop();
  enterGame(g, false);
  toast(`${T.startsFirst} ${g.settings.teamNames[g.turn]}`, g.turn);
  sfx.start();
  setTimeout(() => sfx.turn(g.turn), 900);
  requestFullscreen();
}

function enterGame(g: G.GameState, resumed: boolean) {
  clearTimeout(pendingTimer);
  // a restored game never resumes in the middle of showing two cards
  game = g.pending ? G.resolve(g) : g;
  if (resumed && game.phase === 'playing') game = G.pause(game);
  revealAll = false;
  resultsShown = false;
  lastSecond = -1;
  buildBoard(game);
  setupEl.hidden = true;
  gameEl.hidden = false;
  hide(resultsOverlay);
  render();
  saveGame(true);
  music.setHurry(game.timeLeftMs <= 60_000);
  if (game.phase === 'paused') openPause();
  else if (game.phase === 'finished') showResults(false);
  else music.play();
  requestWakeLock();
}

function exitToSetup() {
  clearTimeout(pendingTimer);
  game = null;
  store.del(KEY_GAME);
  music.stop();
  hide(pauseOverlay);
  hide(resultsOverlay);
  stopConfetti();
  gameEl.hidden = true;
  setupEl.hidden = false;
  renderSetup();
  releaseWakeLock();
}

function onCardTap(i: number) {
  audio.unlock();
  if (!game || !G.canFlip(game, i)) return;
  game = G.flip(game, i);
  sfx.flip(game.open.length === 1 ? 0 : 1);
  if (game.pending === 'match') {
    const team = game.turn;
    setTimeout(() => sfx.match(), 320);
    setTimeout(() => toast(T.correct, team), 380);
    setTimeout(() => bump(scoreEls[team]), 380);
    schedule(MATCH_SHOW_MS, () => {
      if (!game || game.pending !== 'match') return;
      game = G.resolve(game);
      render();
      saveGame(true);
      if (game.phase === 'finished') onFinished();
    });
  } else if (game.pending === 'miss') {
    setTimeout(() => sfx.miss(), 450);
    schedule(MISS_SHOW_MS, () => {
      if (!game || game.pending !== 'miss') return;
      game = G.resolve(game);
      sfx.close();
      const next = game.turn;
      setTimeout(() => sfx.turn(next), 260);
      toast(`${T.turnOf} ${game.settings.teamNames[next]}`, next);
      render();
      saveGame(true);
    });
  }
  render();
  saveGame(true);
}

function schedule(ms: number, fn: () => void) {
  clearTimeout(pendingTimer);
  pendingTimer = window.setTimeout(fn, ms);
}

function render() {
  if (!game) return;
  const g = game;
  for (const t of [0, 1] as const) {
    teamEls[t].classList.toggle('is-turn', g.phase !== 'finished' && g.turn === t);
    teamEls[t].querySelector('.team-name')!.textContent = g.settings.teamNames[t];
    scoreEls[t].textContent = String(g.scores[t]);
  }
  foundEl.textContent = `${T.found}՝ ${G.foundPairs(g)} / ${G.totalPairs(g)}`;
  renderTime();
  const showing = new Set(g.open);
  cardEls.forEach((el, i) => {
    const card = g.deck[i];
    const matched = card.pairId in g.matchedBy;
    const open = matched || showing.has(i) || revealAll;
    el.classList.toggle('is-open', open);
    el.classList.toggle('is-matched', matched);
    el.classList.toggle('is-revealed', revealAll && !matched);
    el.classList.toggle('is-miss', g.pending === 'miss' && showing.has(i));
    el.classList.toggle('is-hit', g.pending === 'match' && showing.has(i));
    if (matched) el.dataset.team = String(g.matchedBy[card.pairId]);
    else delete el.dataset.team;
    el.setAttribute('aria-label', open ? cardName(card) : T.card(i + 1));
  });
  boardEl.classList.toggle('is-locked', g.pending !== null || g.phase !== 'playing');
  $('pause-btn').innerHTML = g.phase === 'finished' ? ICONS.flag : ICONS.pause;
  $('pause-btn').setAttribute('aria-label', g.phase === 'finished' ? T.results : T.pause);
}

function renderTime() {
  if (!game) return;
  const total = game.settings.durationMin * 60_000;
  const secs = Math.ceil(game.timeLeftMs / 1000);
  timeEl.textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  timeBar.style.transform = `scaleX(${Math.max(0, Math.min(1, game.timeLeftMs / total))})`;
  clockEl.classList.toggle('is-low', game.phase !== 'finished' && game.timeLeftMs <= 60_000);
  clockEl.classList.toggle('is-paused', game.phase === 'paused');
}

// ---------- clock ----------
setInterval(() => {
  const now = performance.now();
  const dt = now - lastTick;
  lastTick = now;
  if (!game || game.phase !== 'playing') return;
  const before = game.timeLeftMs;
  game = G.tick(game, dt);
  if (before > 60_000 && game.timeLeftMs <= 60_000 && game.settings.durationMin > 1 && game.phase === 'playing') {
    sfx.warn();
    toast(T.oneMinute, 'warn');
  }
  if (game.timeLeftMs <= 60_000) music.setHurry(true);
  const s = Math.ceil(game.timeLeftMs / 1000);
  if (game.phase === 'playing' && s <= 10 && s !== lastSecond) sfx.tick(s <= 3);
  lastSecond = s;
  if (game.phase === 'finished') {
    clearTimeout(pendingTimer);
    render();
    onFinished();
  } else {
    renderTime();
  }
  saveGame();
}, 200);

// ---------- end of game ----------
function onFinished() {
  if (!game || resultsShown) return;
  resultsShown = true;
  saveGame(true);
  hide(pauseOverlay);
  music.stop();
  if (game.endReason === 'time') sfx.timeUp();
  setTimeout(() => showResults(true), RESULTS_DELAY_MS);
}

function showResults(celebrate: boolean) {
  if (!game) return;
  const g = game;
  const w = G.winner(g);
  $('results-reason').textContent =
    g.endReason === 'time' ? T.timeUp : g.endReason === 'complete' ? T.allFound : T.endedEarly;
  $('results-winner').innerHTML =
    w === null
      ? `<span class="winner-label">${T.draw}</span>`
      : `<img src="${EMBLEM_URLS[w]}" alt=""><span class="winner-label">${T.winner}</span><span class="winner-name team-text-${w}">${esc(g.settings.teamNames[w])}</span>`;
  $('results-scores').innerHTML = ([0, 1] as const)
    .map(
      (t) =>
        `<div class="final ${w === t ? 'is-winner' : ''}" data-team="${t}"><img src="${EMBLEM_URLS[t]}" alt=""><span class="final-name">${esc(g.settings.teamNames[t])}</span><span class="final-score">${g.scores[t]}</span><span class="final-unit">${T.points}</span></div>`,
    )
    .join('');
  $('reveal-all').hidden = G.foundPairs(g) === G.totalPairs(g);
  show(resultsOverlay);
  if (celebrate) {
    sfx.fanfare();
    startConfetti(w);
  }
  releaseWakeLock();
}

$('reveal-all').addEventListener('click', () => {
  revealAll = true;
  hide(resultsOverlay);
  stopConfetti();
  render();
});
$('results-new').addEventListener('click', exitToSetup);
$('results-pairs').addEventListener('click', openPairs);

// ---------- pause menu ----------
function openPause() {
  if (!game) return;
  $('pause-score').innerHTML = ([0, 1] as const)
    .map((t) => `<span data-team="${t}"><img src="${EMBLEM_URLS[t]}" alt="">${esc(game!.settings.teamNames[t])}: <b>${game!.scores[t]}</b></span>`)
    .join('');
  disarmAll();
  show(pauseOverlay);
  render();
}

$('pause-btn').addEventListener('click', () => {
  audio.unlock();
  if (!game) return;
  if (game.phase === 'finished') {
    revealAll = revealAll && resultsOverlay.hidden;
    showResults(false);
    return;
  }
  game = G.pause(game);
  music.pause();
  saveGame(true);
  openPause();
});
$('resume-game').addEventListener('click', () => {
  if (!game) return;
  game = G.resume(game);
  hide(pauseOverlay);
  music.play();
  render();
  saveGame(true);
  requestWakeLock();
});
$('pass-turn').addEventListener('click', () => {
  if (!game) return;
  clearTimeout(pendingTimer);
  game = G.resume(G.passTurn(game));
  hide(pauseOverlay);
  music.play();
  sfx.turn(game.turn);
  toast(`${T.turnOf} ${game.settings.teamNames[game.turn]}`, game.turn);
  render();
  saveGame(true);
});
confirmable($('end-game'), () => {
  if (!game) return;
  clearTimeout(pendingTimer);
  game = G.endGame(game);
  render();
  onFinished();
});
confirmable($('new-game'), exitToSetup);

/** Destructive host actions need a second tap within 4 seconds. */
function confirmable(btn: HTMLElement, action: () => void) {
  const label = btn.querySelector('span')!;
  const original = label.textContent!;
  let timer = 0;
  btn.addEventListener('click', () => {
    if (btn.classList.contains('armed')) {
      clearTimeout(timer);
      btn.classList.remove('armed');
      label.textContent = original;
      action();
      return;
    }
    disarmAll();
    btn.classList.add('armed');
    label.textContent = T.pressAgain;
    timer = window.setTimeout(() => {
      btn.classList.remove('armed');
      label.textContent = original;
    }, 4000);
  });
  btn.addEventListener('disarm', () => {
    clearTimeout(timer);
    btn.classList.remove('armed');
    label.textContent = original;
  });
}
function disarmAll() {
  document.querySelectorAll('[data-confirm]').forEach((b) => b.dispatchEvent(new Event('disarm')));
}

// ---------- pairs gallery ----------
let pairsBuilt = false;
function openPairs() {
  if (!pairsBuilt) {
    $('pairs-grid').innerHTML = PAIRS.map((p) => {
      const hero: G.Card = { pairId: p.id, kind: 'hero' };
      const obj: G.Card = { pairId: p.id, kind: 'object' };
      return `<div class="pair">
        <div class="mini hero"><img src="${artUrl(hero)}" alt="" draggable="false"><span>${esc(p.hero)}</span></div>
        <div class="mini object"><img src="${artUrl(obj)}" alt="" draggable="false"><span>${esc(p.object)}</span></div>
      </div>`;
    }).join('');
    pairsBuilt = true;
  }
  show(pairsOverlay);
}
$('pairs-close').addEventListener('click', () => hide(pairsOverlay));
pairsOverlay.addEventListener('click', (e) => {
  if (e.target === pairsOverlay) hide(pairsOverlay);
});

// ---------- toast & small effects ----------
let toastTimer = 0;
function toast(text: string, kind: G.Team | 'warn') {
  toastEl.className = 'toast';
  toastEl.innerHTML = `${kind === 'warn' ? '' : `<img src="${EMBLEM_URLS[kind]}" alt="">`}<span>${esc(text)}</span>`;
  toastEl.dataset.kind = String(kind);
  void toastEl.offsetWidth; // restart the animation
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), 1900);
}

function bump(el: HTMLElement) {
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
}

function show(el: HTMLElement) {
  el.hidden = false;
}
function hide(el: HTMLElement) {
  el.hidden = true;
}

// ---------- confetti ----------
const confetti = $<HTMLCanvasElement>('confetti');
let confettiRaf = 0;
function startConfetti(w: G.Team | null) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const ctx = confetti.getContext('2d');
  if (!ctx) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  confetti.width = innerWidth * dpr;
  confetti.height = innerHeight * dpr;
  confetti.classList.add('on');
  const colors = w === null ? ['#e8b33a', '#d9432b', '#8350b0', '#f6d779'] : w === 0 ? ['#d9432b', '#f07a5f', '#e8b33a', '#f6d779'] : ['#8350b0', '#a77cc8', '#e8b33a', '#f6d779'];
  const parts = Array.from({ length: 160 }, () => ({
    x: Math.random() * confetti.width,
    y: -Math.random() * confetti.height * 0.6,
    vx: (Math.random() - 0.5) * 2 * dpr,
    vy: (2 + Math.random() * 3) * dpr,
    r: (5 + Math.random() * 7) * dpr,
    a: Math.random() * Math.PI,
    va: (Math.random() - 0.5) * 0.2,
    c: colors[Math.floor(Math.random() * colors.length)],
  }));
  const t0 = performance.now();
  const frame = (t: number) => {
    ctx.clearRect(0, 0, confetti.width, confetti.height);
    for (const p of parts) {
      p.x += p.vx;
      p.y += p.vy;
      p.a += p.va;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.a);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
      ctx.restore();
    }
    if (t - t0 < 5000) confettiRaf = requestAnimationFrame(frame);
    else stopConfetti();
  };
  cancelAnimationFrame(confettiRaf);
  confettiRaf = requestAnimationFrame(frame);
}
function stopConfetti() {
  cancelAnimationFrame(confettiRaf);
  confetti.classList.remove('on');
  confetti.getContext('2d')?.clearRect(0, 0, confetti.width, confetti.height);
}

// ---------- sound, fullscreen, wake lock ----------
// Music and sound effects are switched separately: in the setup form and with the two buttons in the game header.
function renderAudioSwitches() {
  const m = audio.isMusicOn();
  const f = audio.isEffectsOn();
  musicBtn.innerHTML = m ? ICONS.musicOn : ICONS.musicOff;
  musicBtn.setAttribute('aria-pressed', String(m));
  musicBtn.classList.toggle('is-off', !m);
  soundBtn.innerHTML = f ? ICONS.soundOn : ICONS.soundOff;
  soundBtn.setAttribute('aria-pressed', String(f));
  soundBtn.classList.toggle('is-off', !f);
  setupEl.querySelectorAll<HTMLButtonElement>('#music-seg button').forEach((b) => b.setAttribute('aria-checked', String((b.dataset.v === 'on') === m)));
  setupEl.querySelectorAll<HTMLButtonElement>('#effects-seg button').forEach((b) => b.setAttribute('aria-checked', String((b.dataset.v === 'on') === f)));
}
function saveAudio() {
  store.set(KEY_AUDIO, { music: audio.isMusicOn(), effects: audio.isEffectsOn() });
}
function setMusic(on: boolean) {
  audio.unlock();
  audio.setMusicOn(on);
  if (on) void music.prepare();
  music.refresh();
  saveAudio();
  renderAudioSwitches();
}
function setEffects(on: boolean) {
  audio.unlock();
  audio.setEffectsOn(on);
  saveAudio();
  renderAudioSwitches();
  sfx.click();
}
{
  const saved = store.get<{ music?: boolean; effects?: boolean }>(KEY_AUDIO);
  audio.setMusicOn(saved?.music !== false);
  audio.setEffectsOn(saved ? saved.effects !== false : store.get<boolean>(KEY_MUTED) !== true);
  renderAudioSwitches();
}
musicBtn.addEventListener('click', () => setMusic(!audio.isMusicOn()));
soundBtn.addEventListener('click', () => setEffects(!audio.isEffectsOn()));
// Browsers allow sound only after a tap; the first tap anywhere switches audio on.
document.addEventListener('pointerdown', () => audio.unlock(), { capture: true });
document.addEventListener('keydown', () => audio.unlock(), { capture: true });
// Soft tap sound for menu buttons (cards have their own sounds).
document.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest('button');
  if (b && !b.classList.contains('card') && b.id !== 'start-btn' && b.id !== 'sound-btn') sfx.click();
});

const fsSupported = !!(document.fullscreenEnabled && root.requestFullscreen);
fsBtn.hidden = !fsSupported;
function requestFullscreen() {
  if (!fsSupported || document.fullscreenElement) return;
  root.requestFullscreen().catch(() => undefined);
}
fsBtn.addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
  else requestFullscreen();
});

async function requestWakeLock() {
  try {
    const nav = navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<{ release(): Promise<void> }> } };
    if (!nav.wakeLock || wakeLock || document.visibilityState !== 'visible') return;
    wakeLock = await nav.wakeLock.request('screen');
  } catch {
    wakeLock = null;
  }
}
function releaseWakeLock() {
  wakeLock?.release().catch(() => undefined);
  wakeLock = null;
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && game && game.phase !== 'finished') {
    wakeLock = null;
    requestWakeLock();
  }
});

// ---------- touch-board hygiene ----------
document.addEventListener('contextmenu', (e) => {
  if (!(e.target as HTMLElement).closest('input')) e.preventDefault();
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!pairsOverlay.hidden) hide(pairsOverlay);
  else if (game && !gameEl.hidden && game.phase === 'playing') $('pause-btn').click();
});

// Dev-only handle for checking audio from the browser console (removed from the production build).
if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__debug = { audio, music, sfx, getGame: () => game };

// ---------- boot (also restores state when the page is updated in place) ----------
type HotData = { game?: unknown };
interface Hot {
  data?: HotData;
  ready?: (fn: (d: HotData) => void) => void;
  snapshot?: (fn: () => HotData) => void;
}
const hot = (window as unknown as { claude?: { hot?: Hot } }).claude?.hot;
hot?.snapshot?.(() => ({ game }));

function boot(data: HotData = {}) {
  renderSetup();
  if (audio.isMusicOn()) setTimeout(() => void music.prepare(), 700);
  if (G.isValidState(data.game) && data.game.phase !== 'finished') enterGame(data.game, data.game.phase === 'paused');
}
if (hot?.ready) hot.ready(boot);
else boot(hot?.data ?? {});

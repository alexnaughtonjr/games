const MOVES_KEY = "games.memory.bestMoves";
const TIME_KEY = "games.memory.bestTimeMs";

const FACES = [
  {
    id: "diamond",
    label: "Diamond",
    svg: '<svg viewBox="0 0 64 64" aria-hidden="true"><path fill="#58a6ff" d="M32 6 58 32 32 58 6 32Z"/></svg>',
  },
  {
    id: "circle",
    label: "Circle",
    svg: '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="22" fill="#3fb950"/></svg>',
  },
  {
    id: "triangle",
    label: "Triangle",
    svg: '<svg viewBox="0 0 64 64" aria-hidden="true"><path fill="#d2a8ff" d="M32 8 56 54H8Z"/></svg>',
  },
  {
    id: "square",
    label: "Square",
    svg: '<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="12" y="12" width="40" height="40" rx="4" fill="#ffa657"/></svg>',
  },
  {
    id: "star",
    label: "Star",
    svg: '<svg viewBox="0 0 64 64" aria-hidden="true"><path fill="#ff7b72" d="M32 6 39 24l19 2-14 12 4 19-16-10L16 57l4-19L6 26l19-2Z"/></svg>',
  },
  {
    id: "plus",
    label: "Plus",
    svg: '<svg viewBox="0 0 64 64" aria-hidden="true"><path fill="#79c0ff" d="M26 8h12v18h18v12H38v18H26V38H8V26h18Z"/></svg>',
  },
  {
    id: "heart",
    label: "Heart",
    svg: '<svg viewBox="0 0 64 64" aria-hidden="true"><path fill="#f778ba" d="M32 54 12.5 34.8C6 28.4 6.4 18 13.6 12.2 19.6 7.4 27.4 9 32 15.2 36.6 9 44.4 7.4 50.4 12.2 57.6 18 58 28.4 51.5 34.8Z"/></svg>',
  },
  {
    id: "moon",
    label: "Moon",
    svg: '<svg viewBox="0 0 64 64" aria-hidden="true"><path fill="#e3b341" d="M40 8a24 24 0 1 0 0 48 20 20 0 1 1 0-48Z"/></svg>',
  },
];

const grid = document.getElementById("grid");
const movesEl = document.getElementById("moves");
const matchesEl = document.getElementById("matches");
const timeEl = document.getElementById("time");
const bestEl = document.getElementById("best");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayText = document.getElementById("overlay-text");
const restartBtn = document.getElementById("restart");
const overlayRestart = document.getElementById("overlay-restart");

let cards = [];
let buttons = [];
let open = [];
let lock = false;
let moves = 0;
let matches = 0;
let started = false;
let t0 = 0;
let timerId = null;
let mismatchTimer = null;
let bestMoves = readNum(MOVES_KEY);
let bestTime = readNum(TIME_KEY);

function readNum(key) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === "") return null;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : null;
  } catch {
    return null;
  }
}

function writeNum(key, n) {
  try {
    localStorage.setItem(key, String(n));
  } catch {
    /* private mode or blocked storage */
  }
}

function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function fmt(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m + ":" + String(s).padStart(2, "0");
}

function elapsed() {
  return started ? performance.now() - t0 : 0;
}

function bestLabel() {
  if (bestMoves === null) return "—";
  const time = bestTime === null ? "" : " · " + fmt(bestTime);
  return bestMoves + time;
}

function updateHud() {
  movesEl.textContent = String(moves);
  matchesEl.textContent = matches + "/" + FACES.length;
  timeEl.textContent = fmt(elapsed());
  bestEl.textContent = bestLabel();
}

function paint(i) {
  const card = cards[i];
  const btn = buttons[i];
  const faceUp = card.up || card.matched;
  btn.classList.toggle("is-up", faceUp);
  btn.classList.toggle("is-matched", card.matched);
  btn.setAttribute("aria-label", faceUp ? card.label + (card.matched ? ", matched" : "") : "Face-down card");
}

function stopTimer() {
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }
}

function startTimer() {
  t0 = performance.now();
  started = true;
  stopTimer();
  timerId = setInterval(updateHud, 200);
}

function showWin(ms) {
  lock = true;
  stopTimer();
  const improvedMoves = bestMoves === null || moves < bestMoves;
  const improvedTime = bestTime === null || ms < bestTime;
  if (improvedMoves) {
    bestMoves = moves;
    writeNum(MOVES_KEY, moves);
  }
  if (improvedTime) {
    bestTime = ms;
    writeNum(TIME_KEY, Math.round(ms));
  }
  updateHud();
  let note = moves + " moves in " + fmt(ms) + ".";
  if (improvedMoves || improvedTime) note += " New best saved in this browser.";
  overlayTitle.textContent = "Cleared";
  overlayText.textContent = note;
  overlay.hidden = false;
}

function deal() {
  clearTimeout(mismatchTimer);
  stopTimer();
  lock = false;
  open = [];
  moves = 0;
  matches = 0;
  started = false;
  cards = shuffle(FACES.flatMap((face) => [face, face])).map((face) => ({
    id: face.id,
    label: face.label,
    svg: face.svg,
    up: false,
    matched: false,
  }));
  grid.replaceChildren();
  buttons = cards.map((card, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "card";
    btn.innerHTML =
      '<span class="card-inner"><span class="face back"></span><span class="face front">' +
      card.svg +
      "</span></span>";
    btn.addEventListener("click", () => flip(i));
    grid.appendChild(btn);
    return btn;
  });
  buttons.forEach((_, i) => paint(i));
  overlay.hidden = true;
  updateHud();
}

function flip(i) {
  if (lock) return;
  const card = cards[i];
  if (card.up || card.matched) return;
  card.up = true;
  paint(i);
  if (!started) startTimer();
  open.push(i);
  if (open.length < 2) return;

  moves += 1;
  const [a, b] = open;
  updateHud();
  if (cards[a].id === cards[b].id) {
    cards[a].matched = true;
    cards[b].matched = true;
    paint(a);
    paint(b);
    open = [];
    matches += 1;
    updateHud();
    if (matches === FACES.length) showWin(elapsed());
    return;
  }

  lock = true;
  mismatchTimer = setTimeout(() => {
    cards[a].up = false;
    cards[b].up = false;
    paint(a);
    paint(b);
    open = [];
    lock = false;
  }, 700);
}

grid.addEventListener("keydown", (e) => {
  const cols = 4;
  const i = buttons.indexOf(document.activeElement);
  if (i < 0) return;
  let next = i;
  if (e.key === "ArrowRight") next = (i + 1) % buttons.length;
  else if (e.key === "ArrowLeft") next = (i - 1 + buttons.length) % buttons.length;
  else if (e.key === "ArrowDown") next = Math.min(buttons.length - 1, i + cols);
  else if (e.key === "ArrowUp") next = Math.max(0, i - cols);
  else return;
  e.preventDefault();
  buttons[next].focus();
});

restartBtn.addEventListener("click", deal);
overlayRestart.addEventListener("click", deal);
deal();

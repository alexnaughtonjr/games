const COLS = 20;
const ROWS = 20;
const HIGH_KEY = "games.snake.highScore";

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const lengthEl = document.getElementById("length");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayText = document.getElementById("overlay-text");
const pauseBtn = document.getElementById("pause");
const restartBtn = document.getElementById("restart");
const overlayRestart = document.getElementById("overlay-restart");
const pad = document.getElementById("pad");

const DIRS = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  KeyW: [0, -1],
  KeyS: [0, 1],
  KeyA: [-1, 0],
  KeyD: [1, 0],
};

let cell = 24;
let snake = [];
let dir = { x: 1, y: 0 };
let nextDir = { x: 1, y: 0 };
let food = { x: 10, y: 10 };
let score = 0;
let high = readHigh();
let tickMs = 200;
let acc = 0;
let last = 0;
let state = "ready";

function readHigh() {
  try {
    const n = Number(localStorage.getItem(HIGH_KEY));
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

function writeHigh(n) {
  try {
    localStorage.setItem(HIGH_KEY, String(n));
  } catch {
    /* private mode or blocked storage */
  }
}

function showOverlay(title, text, actionLabel) {
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  overlayRestart.hidden = !actionLabel;
  if (actionLabel) overlayRestart.textContent = actionLabel;
  overlay.hidden = false;
}

function hideOverlay() {
  overlay.hidden = true;
}

function updateHud() {
  scoreEl.textContent = String(score);
  bestEl.textContent = String(high);
  lengthEl.textContent = String(snake.length);
  pauseBtn.textContent =
    state === "paused" ? "Resume" : state === "running" ? "Pause" : state === "hold" ? "Steer" : "Start";
}

function placeFood() {
  const taken = new Set(snake.map((s) => s.x + "," + s.y));
  const free = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!taken.has(x + "," + y)) free.push({ x, y });
    }
  }
  if (free.length === 0) return false;
  food = free[Math.floor(Math.random() * free.length)];
  return true;
}

function freshSnake() {
  snake = [
    { x: 8, y: 10 },
    { x: 7, y: 10 },
    { x: 6, y: 10 },
  ];
  dir = { x: 1, y: 0 };
  nextDir = { x: 1, y: 0 };
  score = 0;
  tickMs = 200;
  acc = 0;
  placeFood();
}

function beginReady() {
  freshSnake();
  state = "ready";
  updateHud();
  showOverlay("Ready", "Press an arrow key, WASD, or swipe. Start reveals the board.", "Start");
}

function revealBoard() {
  if (state !== "ready") return;
  state = "hold";
  hideOverlay();
  updateHud();
  canvas.focus({ preventScroll: true });
}

function restart() {
  beginReady();
}

function togglePause() {
  if (state === "over" || state === "hold") return;
  if (state === "ready") {
    revealBoard();
    return;
  }
  if (state === "paused") {
    state = "running";
    hideOverlay();
  } else if (state === "running") {
    state = "paused";
    showOverlay("Paused", "Space resumes. R starts over.");
  }
  updateHud();
}

function endGame(title, text) {
  state = "over";
  updateHud();
  showOverlay(title, text, "Play again");
}

function launch(nx, ny) {
  const head = snake[0];
  snake = [0, 1, 2].map((i) => ({ x: head.x - nx * i, y: head.y - ny * i }));
  dir = { x: nx, y: ny };
  nextDir = dir;
  if (snake.some((s) => s.x === food.x && s.y === food.y)) placeFood();
  state = "running";
  acc = 0;
  hideOverlay();
  updateHud();
  canvas.focus({ preventScroll: true });
}

function setDir(nx, ny) {
  if (state === "over") return;
  if (state === "ready" || state === "hold" || state === "paused") {
    if (state === "paused" && nx === -dir.x && ny === -dir.y) return;
    if (state === "paused") {
      nextDir = { x: nx, y: ny };
      state = "running";
      hideOverlay();
      updateHud();
      return;
    }
    launch(nx, ny);
    return;
  }
  if (nx === -nextDir.x && ny === -nextDir.y) return;
  nextDir = { x: nx, y: ny };
}

function step() {
  dir = nextDir;
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
  if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS) {
    endGame("Game over", "You hit the wall. Score " + score + ".");
    return;
  }
  const willEat = head.x === food.x && head.y === food.y;
  const body = willEat ? snake : snake.slice(0, -1);
  if (body.some((s) => s.x === head.x && s.y === head.y)) {
    endGame("Game over", "You ran into yourself. Score " + score + ".");
    return;
  }
  snake.unshift(head);
  if (willEat) {
    score += 10;
    if (score > high) {
      high = score;
      writeHigh(high);
    }
    tickMs = Math.max(80, 200 - Math.floor(score / 30) * 10);
    if (snake.length === COLS * ROWS) {
      updateHud();
      endGame("Board clear", "You filled the grid. Score " + score + ".");
      return;
    }
    placeFood();
  } else {
    snake.pop();
  }
  updateHud();
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
}

function draw() {
  const w = canvas.width;
  const h = canvas.height;
  if (!w || !h || snake.length === 0) return;
  ctx.fillStyle = "#0d1117";
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "#21262d";
  ctx.lineWidth = Math.max(1, cell * 0.04);
  ctx.beginPath();
  for (let i = 1; i < COLS; i++) {
    ctx.moveTo(Math.round(i * cell) + 0.5, 0);
    ctx.lineTo(Math.round(i * cell) + 0.5, h);
  }
  for (let i = 1; i < ROWS; i++) {
    ctx.moveTo(0, Math.round(i * cell) + 0.5);
    ctx.lineTo(w, Math.round(i * cell) + 0.5);
  }
  ctx.stroke();

  const pulse = state === "running" ? 0.9 + Math.sin(performance.now() / 180) * 0.1 : 1;
  ctx.fillStyle = "#58a6ff";
  ctx.beginPath();
  ctx.arc(
    food.x * cell + cell / 2,
    food.y * cell + cell / 2,
    cell * 0.28 * pulse,
    0,
    Math.PI * 2
  );
  ctx.fill();

  snake.forEach((seg, i) => {
    const pad = cell * 0.14;
    ctx.fillStyle = i === 0 ? "#3fb950" : "#238636";
    roundRect(seg.x * cell + pad, seg.y * cell + pad, cell - pad * 2, cell - pad * 2, cell * 0.2);
    ctx.fill();
  });

  const head = snake[0];
  const cx = head.x * cell + cell / 2;
  const cy = head.y * cell + cell / 2;
  const ex = dir.x * cell * 0.16;
  const ey = dir.y * cell * 0.16;
  const sideX = -dir.y * cell * 0.14;
  const sideY = dir.x * cell * 0.14;
  ctx.fillStyle = "#0d1117";
  ctx.beginPath();
  ctx.arc(cx + ex + sideX, cy + ey + sideY, Math.max(1.5, cell * 0.07), 0, Math.PI * 2);
  ctx.arc(cx + ex - sideX, cy + ey - sideY, Math.max(1.5, cell * 0.07), 0, Math.PI * 2);
  ctx.fill();
}

function resize() {
  const wrap = canvas.parentElement;
  const size = Math.max(240, Math.floor(wrap.clientWidth));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(size * dpr);
  canvas.height = Math.floor(size * dpr);
  cell = canvas.width / COLS;
  draw();
}

function frame(ts) {
  if (!last) last = ts;
  const dt = Math.min(100, ts - last);
  last = ts;
  if (state === "running") {
    acc += dt;
    while (acc >= tickMs && state === "running") {
      acc -= tickMs;
      step();
    }
  }
  draw();
  requestAnimationFrame(frame);
}

window.addEventListener("keydown", (e) => {
  const typing = e.target.closest("button") && (e.key === " " || e.code === "Space");
  if (typing) return;

  if (e.key === " " || e.code === "Space" || e.key === "p" || e.key === "P") {
    e.preventDefault();
    if (state === "ready") revealBoard();
    else togglePause();
    return;
  }
  if (e.key === "r" || e.key === "R") {
    e.preventDefault();
    restart();
    return;
  }
  const d = DIRS[e.code];
  if (!d) return;
  e.preventDefault();
  setDir(d[0], d[1]);
});

pauseBtn.addEventListener("click", () => {
  if (state === "ready") revealBoard();
  else togglePause();
});
restartBtn.addEventListener("click", restart);
overlayRestart.addEventListener("click", revealBoard);

pad.addEventListener("pointerdown", (e) => {
  const btn = e.target.closest("button");
  if (!btn || state === "over") return;
  e.preventDefault();
  const map = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const d = map[btn.dataset.dir];
  if (!d) return;
  setDir(d[0], d[1]);
});

let swipe = null;
canvas.addEventListener("pointerdown", (e) => {
  if (e.pointerType === "mouse" && e.button !== 0) return;
  swipe = { x: e.clientX, y: e.clientY, id: e.pointerId };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointerup", (e) => {
  if (!swipe || swipe.id !== e.pointerId || state === "over") {
    swipe = null;
    return;
  }
  const dx = e.clientX - swipe.x;
  const dy = e.clientY - swipe.y;
  swipe = null;
  if (Math.hypot(dx, dy) < 24) {
    if (state === "ready") revealBoard();
    else if (state === "paused") togglePause();
    return;
  }
  if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 1 : -1, 0);
  else setDir(0, dy > 0 ? 1 : -1);
});
canvas.addEventListener("pointercancel", () => {
  swipe = null;
});

beginReady();
new ResizeObserver(resize).observe(canvas.parentElement);
resize();
requestAnimationFrame(frame);

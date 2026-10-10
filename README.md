# Games

A small collection of free, self-contained browser games. Each one is plain HTML, CSS, and JavaScript: no build step and no install.

Open `index.html` for the list, or open a game file directly. Snake and Memory Match stay fully offline. Vibe Coder vendors Three.js and also requests Inter and JetBrains Mono from Google Fonts, with system-font fallbacks if that request is blocked.

## Play locally

Clone the repo and open the HTML file in any modern browser. A local server is optional; the file protocol works.

```bash
git clone https://github.com/alexnaughtonjr/games.git
cd games
```

Then open `index.html`, or one of the game pages below. On the collection page, press 1–5 to open Snake, Memory Match, Vibe Coder, Rainline, or Uplink. Vibe Coder, Rainline, and Uplink link back to that page.

## Snake

`games/snake/index.html`

Steer a snake around a 20×20 board and eat the blue pellets. Each pellet is worth 10 points and the snake speeds up as the score climbs. Hitting a wall or your own tail ends the run. Filling the board wins it.

- Arrow keys or WASD choose the direction and start the run. The snake stays still until that first direction. On a touch screen, swipe the board or use the on-screen pad.
- A second direction pressed before the next step is kept, so a fast corner still happens. A turn that would reverse into the tail is ignored.
- Start clears the ready message so the board is visible. Space or P pauses. R or Restart returns to the ready screen. Play again, after a wall, a tail, or a full board, deals a fresh snake and waits for the next direction.
- The best score is saved in this browser under `localStorage` (`games.snake.highScore`).

## Memory Match

`games/memory/index.html`

Sixteen cards, eight pairs. Flip two at a time and remember where each shape landed. The clock starts on the first flip.

- Tap a card, or move with the arrow keys and press Enter or Space.
- New game deals a fresh board.
- Fewest moves (`games.memory.bestMoves`) and best time (`games.memory.bestTimeMs`) stay in this browser.

## Vibe Coder: Ship Before Coffee Dies

`vibe-coder/index.html`

Alexander Haislip’s weekly free custom game, rebuilt in 3D. Chain the right AI prompts, clear glitchy landing-page shards on a neon Primer desk, and deploy before the coffee in the mug runs dry.

Open `vibe-coder/index.html` in a browser, or serve the `vibe-coder/` folder. WebGL is required. Three.js ships at `vibe-coder/vendor/three.min.js`.

- Five sprints. Click or tap a prompt card, or press 1–8. Real fixes clear a glitch and build a combo.
- Junk prompts cost coffee and reset the combo. One Sip per sprint (S) adds 10 seconds.
- Deploy (Enter) once every glitch is fixed. Leftover coffee becomes bonus points.
- Space or P pauses the timer and freezes the desk. R restarts the run. The best score is saved in this browser (`games.vibeCoder.highScore`).
- All games, in the top bar and on the title, pause, and result cards, returns to the collection.

Free custom game for Alexander Haislip.

## Rainline

`rainline/index.html`

Free custom game for Alexander Haislip. A short 3D night block: freeflow stick combat, counters, a stone-perch takedown, grapple rings, glide, a stun disc, and a smoke pellet. Clear the alley crew for the win screen. High quality adds soft shadows, neon bloom, denser rain, and lightning; `H` switches to Low if a laptop needs the lighter path.

WebGL is required. Three.js is vendored in the game folder, so play does not call a CDN. Keyboard and mouse. Esc pauses even when the pointer is not locked, and the Pause button in the corner does the same. Title, pause, and result cards link back to all games. A local static server is the surest way to open it:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080/rainline/`. The on-screen card lists every control.

## Uplink

`uplink/index.html`

Free custom game for Alexander Haislip. Climb a dark 3D relay shaft as a courier lamp. Each run builds a new stair up to a relay dish. Boost pads launch you, red lips crumble, blue slabs slide, striped lifts ride, and cyan gust vents shove the lamp sideways. Green rings take a grapple zip. Sweep beams guard the upper shaft. Blue beacons save a checkpoint. Miss a ledge before the first beacon and the run ends.

WebGL is required. Three.js is the shared vendored copy at `shared/vendor/three.min.js`, and bloom is `shared/bloom.js`. Play does not call a CDN and there is no build step. The shaft uses a soft shadow and neon bloom. Green bulbs on the left rail light up to the best height of the run.

- `A` `D` or the arrow keys move. `Space`, `W`, or `Up` jumps. On a touch screen, drag the stick, then tap Jump or Hook.
- `Q` zips to a green ring in reach. The line cools down before the next zip. The camera leads the jump.
- `P` or `Esc` pauses. Blue beacons save a checkpoint. The best score stays in this browser (`games.uplink.best`).
- Open `uplink/index.html` directly, or visit it from the collection.

## Theme

Pages use the GitHub Primer dark palette:

- Page background `#0d1117`
- Panels `#161b22`
- Green accent `#238636`
- Blue accent `#58a6ff`

Body text uses Inter, then the system UI stack. Titles, scores, and labels use JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace. Snake, Memory Match, Rainline, and Uplink do not download fonts. Vibe Coder requests Inter and JetBrains Mono from Google Fonts and falls back to that same stack.

## GitHub Pages

`.github/workflows/pages.yml` publishes the repository root on every push to `main`. When Pages is enabled with GitHub Actions as the source, the collection is at `https://alexnaughtonjr.github.io/games/` and Rainline is at `https://alexnaughtonjr.github.io/games/rainline/`.

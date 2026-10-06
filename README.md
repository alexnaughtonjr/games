# Games

A small collection of free, self-contained browser games. Each one is plain HTML, CSS, and JavaScript: no build step, no install, and no external services.

Open `index.html` for the list, or open a game file directly.

## Play locally

Clone the repo and open the HTML file in any modern browser. A local server is optional; the file protocol works.

```bash
git clone https://github.com/alexnaughtonjr/games.git
cd games
```

Then open `index.html`, or one of the game pages below.

## Snake

`games/snake/index.html`

Steer a snake around a 20×20 board and eat the blue pellets. Each pellet is worth 10 points and the snake speeds up as the score climbs. Hitting a wall or your own tail ends the run. Filling the board wins it.

- Arrow keys or WASD choose the direction and start the run. The snake stays still until that first direction. On a touch screen, swipe the board or use the on-screen pad.
- Start clears the ready message so the board is visible. Space or P pauses. R or Restart returns to the ready screen.
- The best score is saved in this browser under `localStorage` (`games.snake.highScore`).

## Memory Match

`games/memory/index.html`

Sixteen cards, eight pairs. Flip two at a time and remember where each shape landed. The clock starts on the first flip.

- Tap a card, or move with the arrow keys and press Enter or Space.
- New game deals a fresh board.
- Fewest moves (`games.memory.bestMoves`) and best time (`games.memory.bestTimeMs`) stay in this browser.

## Theme

Pages use the GitHub Primer dark palette:

- Page background `#0d1117`
- Panels `#161b22`
- Green accent `#238636`
- Blue accent `#58a6ff`

Body text uses Inter, then the system UI stack. Titles, scores, and labels use JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace. Fonts are not downloaded; the browser uses whichever face in that stack is already installed.

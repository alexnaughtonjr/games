# Rainline

Free custom game for Alexander Haislip. An original stick vigilante on an original rainy night block.

Chain strikes between alley crew, counter the red warning over a thug’s head, drop from the stone perch, grapple the glowing rings, glide between roofs, and use a stun disc and a smoke pellet. Clear the block for the win screen.

## Play

Open `index.html` through a local static server, or play the GitHub Pages build. WebGL is required. Keyboard and mouse.

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080/rainline/`.

## Controls

- `WASD` move, mouse look
- `J` or left click strike (chains across nearby thugs)
- `K` or right click counter while the red warning is up
- `F` finisher when the combo meter is full
- `Q` grapple the ring under the crosshair
- `E` silent drop from the marked stone perch
- `Space` jump, hold in the air to glide
- `1` stun disc, `2` smoke pellet
- `H` switches High / Low quality (shadow detail, bloom, rain density)
- `Esc` pause

Three.js r159 is vendored at `vendor/three.min.js`, and the bloom composer (`EffectComposer`, `UnrealBloomPass`, `OutputPass`) is vendored at `vendor/postprocessing.js`. Both are MIT. Nothing is loaded from a CDN at play time. High quality uses a soft moon shadow, two street-lamp shadow spots, and bloom. Low quality keeps the same fight with a lighter render.

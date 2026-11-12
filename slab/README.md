# Slab

A 3D kiln stack. Drop a sliding glass slab, keep the overlap, and catch the amber embers.

The slab alternates between the side axis and the depth axis. Anything that hangs off the tower is cut away. A clean miss ends the run. Land almost flush and the tower keeps its full size.

## Play

Open `index.html` in a browser. WebGL is required. Three.js is the copy vendored at `shared/vendor/three.min.js`. Bloom comes from `shared/bloom.js`, and the drop sounds come from `shared/juice.js`. Nothing is loaded from a CDN, and there is no build step.

## Controls

- Space, click, or tap drops the slab. On a touch screen, use Drop
- The pale mark on the tower shows where the slab will land
- Each floor is 10 points. A perfect land adds 15 points times the streak
- An amber ember appears every third floor. Cover it for 50 points
- `P` or `Esc` pauses. `R` starts a fresh tower
- The best score is saved in this browser under `games.slab.best`

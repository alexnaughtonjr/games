# Uplink

Free custom game for Alexander Haislip. A 3D courier climb up a dark relay shaft.

Jump a generated service stair cut into the shaft wall, pocket the blue cores, and land on the green relay pad. Missing a ledge ends the run.

## Play

Open `index.html` in a browser. WebGL is required. Three.js is the copy vendored at `shared/vendor/three.min.js` — nothing is loaded from a CDN, and there is no build step.

## Controls

- `A` `D` or the arrow keys move
- `Space`, `W`, or `Up` jumps. Release early for a shorter hop
- Blue cores are worth 100. Height adds 10 points per meter
- Falling off a ledge ends the run. `R` or Climb again builds a new shaft
- The green pad at the top lights the relay and wins the run
- Green chevrons are boost pads. Red lips crumble after you land. Blue slabs slide under you
- The courier carries a lamp. Dust drifts in the shaft, and jumps throw a ring of sparks
- Blue beacon platforms save a checkpoint. Red sweep beams and a long fall return you there
- The top of the shaft is a relay dish. Landing on that pad wins

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const SHAFT_HALF = 3.55;
  const GRAVITY = -24;
  const MOVE_SPEED = 7.1;
  const JUMP_V = 8.7;
  const DUST = 180;
  const SPARKS = 56;
  const TRAIL = 16;
  const PLAT_H = 0.28;
  const PLAT_D = 2.15;
  const PLAT_Z = -0.25;

  const STAIR = [
    { x: 0, y: 0, w: 3.5 },
    { x: -1.2, y: 1.22, w: 2.3 },
    { x: 1.15, y: 2.46, w: 2.15 },
    { x: -0.35, y: 3.7, w: 1.95 },
    { x: 1.45, y: 4.95, w: 2.2 },
    { x: -1.45, y: 6.22, w: 2.05 },
    { x: 0.35, y: 7.5, w: 1.85 },
    { x: -1.05, y: 8.78, w: 2.25 },
    { x: 0.85, y: 10.1, w: 2.7 }
  ];

  const HIGH_KEY = "games.uplink.best";
  const keys = new Set();
  let jumpEdge = false;
  let jumpRelease = false;
  let best = readBest();

  const state = {
    mode: "title",
    time: 0,
    maxY: PLAT_H,
    cores: 0,
    shake: 0,
    checkpoint: null,
    slips: 0,
    floorY: PLAT_H
  };

  const player = {
    x: 0,
    y: 0.28,
    z: 0.08,
    vx: 0,
    vy: 0,
    radius: 0.28,
    grounded: true,
    coyote: 0,
    buffer: 0,
    mesh: null,
    shadow: null,
    ride: null,
    invuln: 0
  };

  const platforms = [];
  const cores = [];
  const lasers = [];
  const coreWorld = new THREE.Vector3();
  let goalBulb = null;
  let dustGeo = null;
  let sparkGeo = null;
  let trailGeo = null;
  let jumpRing = null;
  let ringLife = 0;
  const pulseRings = [];
  const sconces = [];
  let sconceBlue = null;
  let sconceGreen = null;
  const sparkVel = new Float32Array(56 * 3);
  const sparkLife = new Float32Array(56);

  const canvas = $("view");
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  } catch (err) {
    $("fail").classList.remove("hidden");
    return;
  }
  if (!renderer.getContext()) {
    $("fail").classList.remove("hidden");
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x0d1117, 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d1117);
  scene.fog = new THREE.FogExp2(0x0d1117, 0.034);

  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 80);
  camera.position.set(0, 3.2, 8.6);

  scene.add(new THREE.HemisphereLight(0x9aa4b2, 0x0d1117, 0.38));
  const key = new THREE.DirectionalLight(0xe6edf3, 1.55);
  key.position.set(2.4, 12, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 26;
  key.shadow.camera.left = -7.5;
  key.shadow.camera.right = 7.5;
  key.shadow.camera.top = 9;
  key.shadow.camera.bottom = -9;
  key.shadow.bias = -0.00035;
  key.shadow.normalBias = 0.03;
  scene.add(key);
  scene.add(key.target);
  const fill = new THREE.PointLight(0x8b949e, 18, 28, 2);
  fill.position.set(0, 4, 6);
  scene.add(fill);
  const blueWash = new THREE.PointLight(0x58a6ff, 22, 18, 2);
  blueWash.position.set(-2.4, 5.5, 1.2);
  scene.add(blueWash);
  const greenWash = new THREE.PointLight(0x238636, 16, 16, 2);
  greenWash.position.set(2.2, 8.2, 0.6);
  scene.add(greenWash);

  buildShaft();
  buildSconces();
  buildAtmosphere();
  buildCourier();
  buildCourse((Math.random() * 0x7fffffff) >>> 0);
  placeCourier(platforms[0]);
  snapCamera();

  $("start").addEventListener("click", () => {
    $("start").blur();
    startRun();
  });
  $("retry").addEventListener("click", () => {
    $("retry").blur();
    restart();
  });
  $("pauseBtn").addEventListener("click", () => {
    $("pauseBtn").blur();
    togglePause();
  });
  $("resume").addEventListener("click", () => {
    $("resume").blur();
    if (state.mode === "pause") togglePause();
  });
  $("restart").addEventListener("click", () => {
    $("restart").blur();
    restart();
  });
  bindHold("btnLeft", "KeyA");
  bindHold("btnRight", "KeyD");
  bindHold("btnJump", "Space");
  paintBest();

  window.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const move = e.code === "Space" || e.code === "ArrowUp" || e.code === "ArrowDown" ||
      e.code === "ArrowLeft" || e.code === "ArrowRight";
    if (move) e.preventDefault();
    if (e.repeat) return;
    if (state.mode === "title" && (e.code === "Enter" || e.code === "Space")) {
      startRun();
      return;
    }
    if ((e.code === "KeyP" || e.code === "Escape") && (state.mode === "run" || state.mode === "pause")) {
      e.preventDefault();
      togglePause();
      return;
    }
    if ((state.mode === "over" || state.mode === "win") && (e.code === "Enter" || e.code === "Space" || e.code === "KeyR")) {
      restart();
      return;
    }
    if ((state.mode === "run" || state.mode === "pause") && e.code === "KeyR") {
      restart();
      return;
    }
    keys.add(e.code);
    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") jumpEdge = true;
  });

  window.addEventListener("keyup", (e) => {
    keys.delete(e.code);
    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") jumpRelease = true;
  });

  let bloom = null;
  try {
    if (window.LabBloom) {
      const coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
      bloom = window.LabBloom(renderer, scene, camera, {
        threshold: 0.6,
        strength: 0.62,
        div: coarse ? 4 : 2
      });
    }
  } catch (err) {
    bloom = null;
  }

  window.addEventListener("resize", resize);
  resize();

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(frame);

  function startRun() {
    if (state.mode === "run") return;
    state.mode = "run";
    state.maxY = platforms[0].y + platforms[0].h;
    state.floorY = state.maxY;
    state.cores = 0;
    state.checkpoint = null;
    state.slips = 0;
    player.invuln = 0;
    placeCourier(platforms[0]);
    $("title").classList.add("hidden");
    $("end").classList.add("hidden");
    $("pause").classList.add("hidden");
    $("pauseBtn").textContent = "Pause";
    $("pauseBtn").setAttribute("aria-pressed", "false");
    $("hud").hidden = false;
    $("hint").hidden = false;
    updateHud();
  }

  function togglePause() {
    if (state.mode === "run") {
      state.mode = "pause";
      $("pause").classList.remove("hidden");
      $("pauseBtn").textContent = "Resume";
      $("pauseBtn").setAttribute("aria-pressed", "true");
      return;
    }
    if (state.mode === "pause") {
      state.mode = "run";
      $("pause").classList.add("hidden");
      $("pauseBtn").textContent = "Pause";
      $("pauseBtn").setAttribute("aria-pressed", "false");
    }
  }

  function bindHold(id, code) {
    const el = $(id);
    const press = (e) => {
      e.preventDefault();
      if (e.pointerId != null && el.setPointerCapture) {
        try { el.setPointerCapture(e.pointerId); } catch (err) { /* pointer already released */ }
      }
      if (!keys.has(code)) {
        keys.add(code);
        if (code === "Space" && state.mode === "run") jumpEdge = true;
      }
    };
    const release = (e) => {
      e.preventDefault();
      if (keys.has(code) && code === "Space") jumpRelease = true;
      keys.delete(code);
    };
    el.addEventListener("pointerdown", press);
    el.addEventListener("pointerup", release);
    el.addEventListener("pointercancel", release);
  }

  function readBest() {
    try {
      const n = Number(localStorage.getItem(HIGH_KEY));
      return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
    } catch (err) {
      return 0;
    }
  }

  function writeBest(n) {
    try { localStorage.setItem(HIGH_KEY, String(n)); } catch (err) { /* private mode */ }
  }

  function noteBest() {
    if (state.mode !== "run" && state.mode !== "over" && state.mode !== "win") return;
    const score = currentScore();
    if (score <= best) return;
    best = score;
    writeBest(best);
    paintBest();
  }

  function paintBest() {
    const line = best > 0 ? "Best score " + best + " is saved in this browser." : "Best score saves in this browser.";
    $("titleBest").textContent = line;
    $("best").textContent = String(best);
  }

  function restart() {
    state.mode = "boot";
    buildCourse((Math.random() * 0x7fffffff) >>> 0);
    startRun();
    snapCamera();
  }

  function finish(won) {
    if (state.mode !== "run") return;
    state.mode = won ? "win" : "over";
    $("hint").hidden = true;
    $("endEyebrow").textContent = won ? "relay lit" : "signal lost";
    $("endTitle").textContent = won ? "Uplink" : "Dropped";
    const meters = Math.max(0, state.maxY).toFixed(1);
    const score = currentScore();
    const coreWord = state.cores === 1 ? "core" : "cores";
    noteBest();
    const bestBit = " Best " + best + ".";
    $("endText").textContent = won
      ? "The relay pad is lit. " + meters + "m up, " + state.cores + " " + coreWord + ", score " + score + "." + bestBit
      : "The shaft took the lamp at " + meters + "m. Score " + score + ". " + state.cores + " " + coreWord + " banked." + bestBit;
    $("end").classList.remove("hidden");
  }

  function failOrRespawn() {
    if (state.checkpoint) {
      state.slips += 1;
      placeCourier(state.checkpoint);
      state.floorY = player.y;
      player.invuln = 1.1;
      state.shake = 0.18;
      player.mesh.position.set(player.x, player.y, player.z);
      return;
    }
    finish(false);
  }

  function hitLaser() {
    const body = player.y + 0.45;
    for (let i = 0; i < lasers.length; i++) {
      const laser = lasers[i];
      if (Math.abs(body - laser.y) > 0.32) continue;
      if (Math.abs(player.x - laser.beam.position.x) < 0.78) return true;
    }
    return false;
  }

  function updateLasers() {
    for (let i = 0; i < lasers.length; i++) {
      const laser = lasers[i];
      laser.beam.position.x = Math.sin(state.time * laser.speed + laser.phase) * 2.35;
    }
  }

  function currentScore() {
    const climbed = Math.max(0, state.maxY - PLAT_H);
    return Math.round(climbed * 10 + state.cores * 100);
  }

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
    if (bloom) bloom.resize();
  }

  function followKeyLight() {
    key.position.set(player.x * 0.3 + 2.2, player.y + 8.4, 6.5);
    key.target.position.set(player.x * 0.22, player.y + 0.45, -0.35);
    key.target.updateMatrixWorld();
  }

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.033);
    state.time += dt;
    if (state.mode !== "pause") {
      spinCores(dt);
      updatePlatforms(dt);
      updateAtmosphere(dt);
      updateLasers();
      if (goalBulb) goalBulb.material.emissiveIntensity = 1.7 + Math.sin(state.time * 3.2) * 0.7;
    }
    if (state.mode === "run") stepPlayer(dt);
    else if (state.mode === "title") idleCourier();
    followKeyLight();
    updateCamera(dt);
    updateHud();
    if (bloom) bloom.render();
    else renderer.render(scene, camera);
  }

  function idleCourier() {
    const base = platforms[0].y + platforms[0].h;
    player.y = base + Math.sin(state.time * 2.1) * 0.05;
    player.mesh.position.set(player.x, player.y, player.z);
    player.mesh.rotation.y = Math.sin(state.time * 0.7) * 0.18;
    player.shadow.position.set(player.x, base + 0.03, player.z);
  }

  function stepPlayer(dt) {
    const left = keys.has("KeyA") || keys.has("ArrowLeft");
    const right = keys.has("KeyD") || keys.has("ArrowRight");
    const dir = (right ? 1 : 0) - (left ? 1 : 0);
    const desired = dir * MOVE_SPEED;
    player.vx += (desired - player.vx) * Math.min(1, dt * 9);

    if (jumpEdge) player.buffer = 0.14;
    jumpEdge = false;
    if (jumpRelease && player.vy > 1.6) player.vy *= 0.52;
    jumpRelease = false;
    player.buffer -= dt;

    if (player.buffer > 0 && player.coyote > 0) {
      player.vy = JUMP_V;
      player.grounded = false;
      player.coyote = 0;
      player.buffer = 0;
      puff(player.x, player.y, player.z);
      burst(player.x, player.y + 0.05, player.z, 10);
    }

    player.vy += GRAVITY * dt;
    const prevY = player.y;
    player.x += player.vx * dt;
    player.y += player.vy * dt;

    if (player.x < -SHAFT_HALF) {
      player.x = -SHAFT_HALF;
      player.vx = 0;
    } else if (player.x > SHAFT_HALF) {
      player.x = SHAFT_HALF;
      player.vx = 0;
    }

    player.grounded = false;
    let landed = null;
    const fallSpeed = player.vy;
    if (player.vy <= 0.01) {
      for (let i = 0; i < platforms.length; i++) {
        const p = platforms[i];
        const top = p.y + p.h;
        if (p.falling) continue;
        if (Math.abs(player.x - p.x) > p.w / 2 + player.radius * 0.25) continue;
        if (Math.abs(player.z - p.z) > p.d / 2 - 0.08) continue;
        if (prevY >= top - 0.04 && player.y <= top + 0.12) {
          player.y = top;
          player.vy = 0;
          player.grounded = true;
          landed = p;
          break;
        }
      }
    }

    if (player.grounded) {
      player.coyote = 0.12;
      if (player.y > state.maxY) state.maxY = player.y;
    } else player.coyote -= dt;

    collectCores();

    player.ride = null;
    if (landed && !landed.falling) {
      if (fallSpeed < -7) {
        burst(player.x, player.y + 0.08, player.z, 16);
        state.shake = Math.min(0.22, state.shake + 0.1);
      }
      if (landed.kind === "boost") {
        player.vy = 12.8;
        player.grounded = false;
        player.coyote = 0;
        player.buffer = 0;
        burst(player.x, player.y + 0.2, player.z, 18);
        puff(player.x, player.y, player.z);
        state.shake = 0.2;
      } else {
        player.ride = landed;
        if (landed.kind === "crumble" && landed.crumbleT == null) landed.crumbleT = 0.52;
        if (landed.kind === "beacon") state.checkpoint = { x: landed.x, y: landed.y };
      }
    }

    player.mesh.position.set(player.x, player.y, player.z);

    if (landed && landed.kind === "goal") {
      finish(true);
      return;
    }
    if (player.invuln > 0) {
      player.invuln -= dt;
      player.mesh.visible = Math.sin(state.time * 28) > 0;
    } else player.mesh.visible = true;

    if (player.grounded) state.floorY = player.y;
    const laserHit = player.invuln <= 0 && hitLaser();
    if (laserHit || player.y < -1.4 || player.y < state.floorY - 7.5) {
      if (laserHit) burst(player.x, player.y + 0.4, player.z, 14);
      failOrRespawn();
      return;
    }
    player.mesh.rotation.z = THREE.MathUtils.damp(player.mesh.rotation.z, -player.vx * 0.045, 8, dt);
    player.mesh.rotation.y = THREE.MathUtils.damp(player.mesh.rotation.y, dir * -0.25, 6, dt);
    const stretch = player.grounded ? 1 : 1.08;
    player.mesh.scale.set(1, stretch, 1);
    const core = player.mesh.getObjectByName("core");
    if (core) core.scale.setScalar(1 + Math.sin(state.time * 6) * 0.08);

    if (player.grounded) {
      player.shadow.visible = true;
      player.shadow.position.set(player.x, player.y + 0.03, player.z);
      player.shadow.material.opacity = 0.42;
    } else {
      player.shadow.visible = false;
    }
  }

  function updateCamera(dt) {
    const sway = state.mode === "title" ? Math.sin(state.time * 0.35) * 0.85 : 0;
    const destX = player.x * 0.32 + sway;
    const destY = player.y + 2.55;
    const destZ = 8.5;
    const k = 1 - Math.exp(-4.2 * dt);
    const jolt = state.shake > 0 ? (Math.random() - 0.5) * state.shake : 0;
    state.shake = Math.max(0, state.shake - dt * 0.7);
    camera.position.x += (destX - camera.position.x) * k + jolt;
    camera.position.y += (destY - camera.position.y) * k;
    camera.position.z += (destZ - camera.position.z) * k;
    camera.lookAt(player.x * 0.18, player.y + 1.05, -0.4);
  }

  function snapCamera() {
    camera.position.set(player.x * 0.32, player.y + 2.55, 8.5);
    camera.lookAt(player.x * 0.18, player.y + 1.05, -0.4);
  }

  function updateHud() {
    $("height").textContent = Math.max(0, player.y).toFixed(1) + "m";
    $("cores").textContent = String(state.cores);
    $("score").textContent = String(currentScore());
    noteBest();
    $("beacon").textContent = state.checkpoint ? "beacon set" : "no beacon";
    $("slips").textContent = String(state.slips);
  }

  function collectCores() {
    const py = player.y + 0.5;
    for (let i = 0; i < cores.length; i++) {
      const c = cores[i];
      if (c.got) continue;
      c.mesh.getWorldPosition(coreWorld);
      const dx = player.x - coreWorld.x;
      const dy = py - coreWorld.y;
      const dz = player.z - coreWorld.z;
      if (dx * dx + dy * dy + dz * dz < 0.42) {
        c.got = true;
        c.mesh.visible = false;
        state.cores += 1;
      }
    }
  }

  function updatePlatforms(dt) {
    for (let i = 0; i < platforms.length; i++) {
      const p = platforms[i];
      if (p.kind === "mover" && !p.falling) {
        const prev = p.x;
        p.x = p.baseX + Math.sin(state.time * p.speed + p.phase) * p.amp;
        p.mesh.position.x = p.x;
        if (player.ride === p) player.x += p.x - prev;
      }
      if (p.kind === "crumble" && p.crumbleT != null && !p.falling) {
        p.crumbleT -= dt;
        const jolt = p.crumbleT < 0.28 ? Math.sin(state.time * 48) * 0.04 : 0;
        p.mesh.position.x = p.x + jolt;
        if (p.crumbleT <= 0) p.falling = true;
      }
      if (p.falling) {
        p.fallV -= 32 * dt;
        p.y += p.fallV * dt;
        p.mesh.position.y = p.y;
        p.mesh.rotation.z += dt * 1.4;
        if (player.ride === p) player.ride = null;
      }
    }
  }

  function spinCores(dt) {
    for (let i = 0; i < cores.length; i++) {
      const c = cores[i];
      if (c.got) continue;
      c.mesh.rotation.y += dt * 2.2;
      c.mesh.rotation.x += dt * 0.7;
      c.mesh.position.y = c.baseY + Math.sin(state.time * 3 + c.phase) * 0.08;
    }
  }

  function placeCourier(plat) {
    player.x = plat.x;
    player.y = plat.y + PLAT_H;
    player.z = 0.08;
    player.vx = 0;
    player.vy = 0;
    player.grounded = true;
    player.coyote = 0.12;
    player.ride = null;
    player.invuln = 0;
    player.mesh.visible = true;
    player.mesh.position.set(player.x, player.y, player.z);
    player.shadow.position.set(player.x, player.y + 0.03, player.z);
  }

  function buildCourier() {
    const g = new THREE.Group();
    const shell = new THREE.MeshStandardMaterial({
      color: 0x21262d,
      metalness: 0.74,
      roughness: 0.3
    });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.42, 6, 16), shell);
    body.position.y = 0.5;
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 18, 18),
      new THREE.MeshStandardMaterial({
        color: 0x3fb950,
        emissive: 0x238636,
        emissiveIntensity: 2.4,
        roughness: 0.22
      })
    );
    core.name = "core";
    core.position.y = 0.56;
    g.add(core);

    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.07, 0.05),
      new THREE.MeshStandardMaterial({
        color: 0x58a6ff,
        emissive: 0x58a6ff,
        emissiveIntensity: 1.7,
        roughness: 0.18
      })
    );
    visor.position.set(0, 0.72, 0.2);
    g.add(visor);

    const pack = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.28, 0.12),
      new THREE.MeshStandardMaterial({
        color: 0x161b22,
        metalness: 0.55,
        roughness: 0.42,
        emissive: 0x238636,
        emissiveIntensity: 0.45
      })
    );
    pack.position.set(0, 0.52, -0.22);
    pack.castShadow = true;
    g.add(pack);

    const lamp = new THREE.PointLight(0x7ee787, 36, 7.5, 2);
    lamp.position.set(0, 0.62, 0.2);
    g.add(lamp);
    const visorLamp = new THREE.PointLight(0x58a6ff, 10, 3.2, 2);
    visorLamp.position.set(0, 0.74, 0.32);
    g.add(visorLamp);
    player.lamp = lamp;

    scene.add(g);
    player.mesh = g;

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.34, 18),
      new THREE.MeshBasicMaterial({ color: 0x010409, transparent: true, opacity: 0.45, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    scene.add(shadow);
    player.shadow = shadow;
  }

  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function canReach(a, b) {
    const dy = b.y - a.y;
    if (dy < 0.9 || dy > 1.46) return false;
    const aL = a.x - a.w / 2;
    const aR = a.x + a.w / 2;
    const bL = b.x - b.w / 2;
    const bR = b.x + b.w / 2;
    let gap = 0;
    if (bL > aR) gap = bL - aR;
    else if (aL > bR) gap = aL - bR;
    return gap <= 1.2;
  }

  function placeNext(prev, rand) {
    for (let attempt = 0; attempt < 16; attempt++) {
      const step = 1.05 + rand() * 0.3;
      const w = 1.8 + rand() * 0.85;
      const dir = rand() < 0.5 ? -1 : 1;
      const stacked = rand() < 0.2;
      let dx;
      if (stacked) dx = (rand() - 0.5) * Math.min(prev.w, w) * 0.45;
      else {
        const minDx = Math.max(0.2, (prev.w + w) / 2 - 0.55);
        const maxDx = (prev.w + w) / 2 + 1.05;
        dx = minDx + rand() * Math.max(0.05, maxDx - minDx);
      }
      let x = prev.x + dir * dx;
      const limit = SHAFT_HALF - w / 2 - 0.08;
      x = Math.max(-limit, Math.min(limit, x));
      const next = { x, y: prev.y + step, w, kind: "solid" };
      if (canReach(prev, next)) return next;
    }
    const w = 2.5;
    const limit = SHAFT_HALF - w / 2 - 0.08;
    return { x: Math.max(-limit, Math.min(limit, prev.x)), y: prev.y + 1.12, w, kind: "solid" };
  }

  function clearCourse() {
    for (let i = 0; i < platforms.length; i++) disposeObject(platforms[i].mesh);
    for (let i = 0; i < lasers.length; i++) disposeObject(lasers[i].group);
    platforms.length = 0;
    cores.length = 0;
    lasers.length = 0;
    goalBulb = null;
  }

  function placeAfterBoost(prev, rand) {
    const step = 2.2 + rand() * 0.6;
    const w = 2.25 + rand() * 0.45;
    const limit = SHAFT_HALF - w / 2 - 0.08;
    const x = Math.max(-limit, Math.min(limit, prev.x + (rand() - 0.5) * 0.7));
    return { x, y: prev.y + step, w, kind: "solid" };
  }

  function tagSpecial(next, prev, rand) {
    if (prev.kind === "boost" || next.y < 16) return;
    const roll = rand();
    if (roll < 0.16) {
      next.kind = "crumble";
      return;
    }
    if (roll < 0.32) {
      next.kind = "mover";
      next.amp = 0.42 + rand() * 0.18;
      next.speed = 0.85 + rand() * 0.4;
      next.phase = rand() * Math.PI * 2;
      const limit = SHAFT_HALF - next.w / 2 - next.amp - 0.08;
      next.x = Math.max(-limit, Math.min(limit, next.x));
      next.baseX = next.x;
      return;
    }
    if (roll < 0.44 && prev.kind !== "crumble") {
      next.kind = "boost";
      next.w = Math.min(3.15, next.w + 0.4);
    }
  }

  function disposeObject(mesh) {
    scene.remove(mesh);
    mesh.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    });
  }

  function buildCourse(seed) {
    clearCourse();
    const rand = mulberry32(seed);
    const layout = STAIR.map((s) => ({ x: s.x, y: s.y, w: s.w, kind: "solid" }));
    let prev = layout[layout.length - 1];
    let nextBeacon = 20;
    const laserGaps = [];
    while (prev.y < 62) {
      const next = prev.kind === "boost" ? placeAfterBoost(prev, rand) : placeNext(prev, rand);
      if (prev.kind !== "boost" && next.y >= nextBeacon && next.y < 56) {
        next.kind = "beacon";
        next.w = Math.max(next.w, 2.8);
        const limit = SHAFT_HALF - next.w / 2 - 0.08;
        next.x = Math.max(-limit, Math.min(limit, Math.max(-1.1, Math.min(1.1, next.x))));
        nextBeacon += 22;
      } else tagSpecial(next, prev, rand);
      if (next.y > 30 && next.kind !== "beacon" && prev.kind !== "beacon" && rand() < 0.28) {
        laserGaps.push(prev.y + PLAT_H + (next.y - prev.y) * 0.5);
      }
      layout.push(next);
      prev = next;
    }
    let goal;
    if (prev.kind === "boost") {
      goal = placeAfterBoost(prev, rand);
      goal.kind = "goal";
      goal.w = Math.max(goal.w, 3.1);
    } else {
      const goalW = 3.6;
      const goalLimit = SHAFT_HALF - goalW / 2 - 0.05;
      goal = {
        x: Math.max(-goalLimit, Math.min(goalLimit, prev.x * 0.4)),
        y: prev.y + 1.18,
        w: goalW,
        kind: "goal"
      };
      if (!canReach(prev, goal)) {
        goal.x = prev.x;
        goal.y = prev.y + 1.12;
        goal.w = Math.max(2.8, Math.min(3.8, prev.w + 0.8));
      }
    }
    layout.push(goal);
    for (let i = 0; i < layout.length; i++) {
      const rec = addPlatform({
        x: layout[i].x,
        y: layout[i].y,
        z: PLAT_Z,
        w: layout[i].w,
        h: PLAT_H,
        d: PLAT_D,
        kind: layout[i].kind,
        baseX: layout[i].baseX,
        amp: layout[i].amp,
        speed: layout[i].speed,
        phase: layout[i].phase
      });
      const kind = layout[i].kind;
      if ((kind === "solid" || kind === "boost" || kind === "beacon") && i > 1 && i % 3 === 0) addCore(rec, i);
    }
    for (let i = 0; i < laserGaps.length; i++) addLaser(laserGaps[i], rand() * Math.PI * 2, 1.15 + rand() * 0.55);
  }

  function addLaser(y, phase, speed) {
    const group = new THREE.Group();
    group.position.set(0, y, 0.08);
    const track = new THREE.Mesh(
      new THREE.BoxGeometry(5.1, 0.02, 0.02),
      new THREE.MeshBasicMaterial({ color: 0xf85149, transparent: true, opacity: 0.4, depthWrite: false })
    );
    group.add(track);
    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(1.45, 0.07, 0.1),
      new THREE.MeshStandardMaterial({ color: 0xf85149, emissive: 0xf85149, emissiveIntensity: 2.4, roughness: 0.2 })
    );
    group.add(beam);
    scene.add(group);
    lasers.push({ group, beam, y, phase, speed });
  }

  function addCore(platform, phase) {
    const mesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.16, 0),
      new THREE.MeshStandardMaterial({
        color: 0x58a6ff,
        emissive: 0x58a6ff,
        emissiveIntensity: 2.1,
        roughness: 0.2,
        metalness: 0.15
      })
    );
    mesh.position.set(0, PLAT_H + 0.72, 0.15);
    platform.mesh.add(mesh);
    cores.push({ mesh, baseY: PLAT_H + 0.72, phase, got: false });
  }

  function addPlatform(spec) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(spec.w, spec.h, spec.d),
      new THREE.MeshStandardMaterial({
        color: 0x161b22,
        metalness: 0.64,
        roughness: 0.36,
        emissive: 0x0b1522,
        emissiveIntensity: 0.55
      })
    );
    body.position.y = spec.h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const lipColor = spec.kind === "goal" || spec.kind === "boost" ? 0x238636
      : spec.kind === "crumble" ? 0xf85149
      : 0x58a6ff;
    const lipGlow = spec.kind === "beacon" ? 2.3 : spec.kind === "goal" ? 2 : 1.55;
    const lip = new THREE.Mesh(
      new THREE.BoxGeometry(spec.w + 0.05, 0.045, 0.07),
      new THREE.MeshStandardMaterial({
        color: lipColor,
        emissive: lipColor,
        emissiveIntensity: lipGlow,
        roughness: 0.28,
        metalness: 0.15
      })
    );
    lip.position.set(0, spec.h - 0.02, spec.d / 2 - 0.02);
    group.add(lip);

    if (spec.kind === "beacon") {
      const postMat = new THREE.MeshStandardMaterial({
        color: 0x58a6ff,
        emissive: 0x58a6ff,
        emissiveIntensity: 1.5,
        roughness: 0.28
      });
      for (let side = -1; side <= 1; side += 2) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8), postMat);
        post.position.set(side * (spec.w * 0.36), spec.h + 0.45, 0);
        group.add(post);
      }
    }

    if (spec.kind === "boost") {
      const chevron = new THREE.Mesh(
        new THREE.BoxGeometry(Math.max(0.4, spec.w * 0.22), 0.05, 0.42),
        new THREE.MeshStandardMaterial({ color: 0x3fb950, emissive: 0x238636, emissiveIntensity: 1.6, roughness: 0.3 })
      );
      chevron.position.set(0, spec.h + 0.03, 0.1);
      group.add(chevron);
    }

    if (spec.kind === "goal") {
      const metal = new THREE.MeshStandardMaterial({
        color: 0x21262d,
        metalness: 0.8,
        roughness: 0.26,
        emissive: 0x238636,
        emissiveIntensity: 0.2
      });
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.1, 1.7, 12), metal);
      mast.position.y = spec.h + 0.85;
      group.add(mast);
      const bowl = new THREE.Mesh(
        new THREE.SphereGeometry(0.78, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.42),
        new THREE.MeshStandardMaterial({
          color: 0x161b22,
          metalness: 0.84,
          roughness: 0.2,
          side: THREE.DoubleSide,
          emissive: 0x0d1117,
          emissiveIntensity: 0.25
        })
      );
      bowl.position.y = spec.h + 1.62;
      bowl.rotation.x = Math.PI;
      group.add(bowl);
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(0.66, 0.028, 8, 32),
        new THREE.MeshStandardMaterial({ color: 0x238636, emissive: 0x238636, emissiveIntensity: 1.9, roughness: 0.3 })
      );
      rim.rotation.x = Math.PI / 2;
      rim.position.y = spec.h + 1.7;
      group.add(rim);
      goalBulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0x3fb950, emissive: 0x238636, emissiveIntensity: 2.8, roughness: 0.18 })
      );
      goalBulb.position.y = spec.h + 1.42;
      group.add(goalBulb);
    }

    group.position.set(spec.x, spec.y, spec.z);
    scene.add(group);
    const record = {
      mesh: group,
      lip,
      x: spec.x,
      y: spec.y,
      z: spec.z,
      w: spec.w,
      h: spec.h,
      d: spec.d,
      kind: spec.kind,
      baseX: spec.baseX != null ? spec.baseX : spec.x,
      amp: spec.amp || 0,
      speed: spec.speed || 1,
      phase: spec.phase || 0,
      crumbleT: null,
      falling: false,
      fallV: 0
    };
    platforms.push(record);
    return record;
  }

  function buildAtmosphere() {
    dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(DUST * 3);
    for (let i = 0; i < DUST; i++) {
      dustPos[i * 3] = (Math.random() - 0.5) * 7.2;
      dustPos[i * 3 + 1] = Math.random() * 18;
      dustPos[i * 3 + 2] = -1 + Math.random() * 2.2;
    }
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    scene.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({
      color: 0x8b949e,
      size: 3.2,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      sizeAttenuation: true
    })));

    sparkGeo = new THREE.BufferGeometry();
    const sparkPos = new Float32Array(SPARKS * 3);
    for (let i = 0; i < SPARKS; i++) sparkPos[i * 3 + 1] = -40;
    sparkGeo.setAttribute("position", new THREE.BufferAttribute(sparkPos, 3));
    scene.add(new THREE.Points(sparkGeo, new THREE.PointsMaterial({
      color: 0x58a6ff,
      size: 7,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      sizeAttenuation: true
    })));

    trailGeo = new THREE.BufferGeometry();
    const trailPos = new Float32Array(TRAIL * 3);
    trailGeo.setAttribute("position", new THREE.BufferAttribute(trailPos, 3));
    scene.add(new THREE.Points(trailGeo, new THREE.PointsMaterial({
      color: 0x3fb950,
      size: 5,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      sizeAttenuation: true
    })));

    jumpRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.32, 0.02, 8, 20),
      new THREE.MeshBasicMaterial({ color: 0x58a6ff, transparent: true, opacity: 0, depthWrite: false })
    );
    jumpRing.rotation.x = Math.PI / 2;
    scene.add(jumpRing);

    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x58a6ff,
      emissive: 0x58a6ff,
      emissiveIntensity: 0.85,
      roughness: 0.35
    });
    for (let y = 10; y <= 104; y += 12) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(3.65, 0.03, 8, 48), ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0, y, -0.35);
      scene.add(ring);
      pulseRings.push(ring);
    }
  }

  function updateAtmosphere(dt) {
    const dustPos = dustGeo.attributes.position.array;
    for (let i = 0; i < DUST; i++) {
      const y = dustPos[i * 3 + 1] + dt * 0.45;
      if (y > player.y + 12) {
        dustPos[i * 3] = player.x + (Math.random() - 0.5) * 7;
        dustPos[i * 3 + 1] = player.y - 5;
        dustPos[i * 3 + 2] = -1 + Math.random() * 2;
      } else dustPos[i * 3 + 1] = y;
    }
    dustGeo.attributes.position.needsUpdate = true;

    const sparkPos = sparkGeo.attributes.position.array;
    for (let i = 0; i < SPARKS; i++) {
      if (sparkLife[i] <= 0) continue;
      sparkLife[i] -= dt;
      sparkVel[i * 3 + 1] -= 9 * dt;
      sparkPos[i * 3] += sparkVel[i * 3] * dt;
      sparkPos[i * 3 + 1] += sparkVel[i * 3 + 1] * dt;
      sparkPos[i * 3 + 2] += sparkVel[i * 3 + 2] * dt;
      if (sparkLife[i] <= 0) sparkPos[i * 3 + 1] = -40;
    }
    sparkGeo.attributes.position.needsUpdate = true;

    const trailPos = trailGeo.attributes.position.array;
    for (let i = TRAIL - 1; i > 0; i--) {
      trailPos[i * 3] = trailPos[(i - 1) * 3];
      trailPos[i * 3 + 1] = trailPos[(i - 1) * 3 + 1];
      trailPos[i * 3 + 2] = trailPos[(i - 1) * 3 + 2];
    }
    trailPos[0] = player.x;
    trailPos[1] = player.y + 0.55;
    trailPos[2] = player.z - 0.05;
    trailGeo.attributes.position.needsUpdate = true;

    if (ringLife > 0) {
      ringLife -= dt;
      const u = 1 - Math.max(0, ringLife / 0.32);
      jumpRing.scale.setScalar(0.45 + u * 2.4);
      jumpRing.material.opacity = Math.max(0, ringLife / 0.32);
    }
    for (let i = 0; i < pulseRings.length; i++) {
      pulseRings[i].rotation.z += dt * (0.15 + i * 0.02);
    }
    if (player.lamp) player.lamp.intensity = 30 + Math.sin(state.time * 5.5) * 6;
    updateSconces(dt);
  }

  function puff(x, y, z) {
    jumpRing.position.set(x, y + 0.05, z);
    jumpRing.scale.setScalar(0.4);
    jumpRing.material.opacity = 0.9;
    ringLife = 0.32;
  }

  function burst(x, y, z, count) {
    const pos = sparkGeo.attributes.position.array;
    let n = 0;
    for (let i = 0; i < SPARKS && n < count; i++) {
      if (sparkLife[i] > 0) continue;
      sparkLife[i] = 0.28 + Math.random() * 0.28;
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
      const a = Math.random() * Math.PI * 2;
      const s = 1.4 + Math.random() * 2.6;
      sparkVel[i * 3] = Math.cos(a) * s;
      sparkVel[i * 3 + 1] = 1 + Math.random() * 2.4;
      sparkVel[i * 3 + 2] = Math.sin(a) * s * 0.45;
      n++;
    }
  }

  function buildShaft() {
    const facade = facadeTexture(false);
    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(8.7, 120),
      new THREE.MeshStandardMaterial({
        map: facade,
        emissiveMap: facade,
        emissive: 0xffffff,
        emissiveIntensity: 0.55,
        roughness: 0.92,
        metalness: 0.08
      })
    );
    back.position.set(0, 48, -1.72);
    back.receiveShadow = true;
    scene.add(back);

    const sideMat = new THREE.MeshStandardMaterial({
      color: 0x12171e,
      metalness: 0.4,
      roughness: 0.72,
      emissive: 0x0d1117,
      emissiveIntensity: 0.3
    });
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.28, 120, 3.3), sideMat);
    left.position.set(-4.22, 48, -0.2);
    left.receiveShadow = true;
    scene.add(left);
    const right = new THREE.Mesh(new THREE.BoxGeometry(0.28, 120, 3.3), sideMat);
    right.position.set(4.22, 48, -0.2);
    right.receiveShadow = true;
    scene.add(right);

    const railMat = new THREE.MeshStandardMaterial({
      color: 0x238636,
      emissive: 0x238636,
      emissiveIntensity: 0.9,
      roughness: 0.35
    });
    const railL = new THREE.Mesh(new THREE.BoxGeometry(0.045, 120, 0.045), railMat);
    railL.position.set(-4.02, 48, 1.15);
    scene.add(railL);
    const railR = railL.clone();
    railR.position.x = 4.02;
    scene.add(railR);

    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x238636,
      emissive: 0x238636,
      emissiveIntensity: 0.65,
      roughness: 0.4
    });
    for (let y = 6; y <= 108; y += 8) {
      const ring = new THREE.Mesh(new THREE.BoxGeometry(8.35, 0.035, 0.05), ringMat);
      ring.position.set(0, y, -1.62);
      scene.add(ring);
    }

    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(8.6, 0.4, 3.4),
      new THREE.MeshStandardMaterial({ color: 0x0d1117, metalness: 0.3, roughness: 0.85 })
    );
    floor.position.set(0, -0.55, -0.2);
    floor.receiveShadow = true;
    scene.add(floor);
  }

  function buildSconces() {
    for (let i = 0, y = 3.4; y <= 104; y += 6.4, i++) {
      const green = i % 2 === 1;
      const side = i % 2 === 0 ? -1 : 1;
      addSconce(side * 3.9, y, 0.62, green ? 0x238636 : 0x58a6ff, side);
    }
    sconceBlue = new THREE.PointLight(0x58a6ff, 18, 8.5, 2);
    sconceBlue.position.set(-3.2, 4, 1.1);
    scene.add(sconceBlue);
    sconceGreen = new THREE.PointLight(0x238636, 14, 7.5, 2);
    sconceGreen.position.set(3.2, 8, 1.1);
    scene.add(sconceGreen);
  }

  function addSconce(x, y, z, color, side) {
    const group = new THREE.Group();
    const housing = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.5, 0.24),
      new THREE.MeshStandardMaterial({ color: 0x161b22, metalness: 0.62, roughness: 0.36 })
    );
    housing.castShadow = true;
    group.add(housing);
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.1, 0.3),
      new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 2.2,
        roughness: 0.18,
        side: THREE.DoubleSide
      })
    );
    glow.position.set(side > 0 ? -0.09 : 0.09, 0, 0);
    glow.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    group.add(glow);
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.05, 0.26),
      new THREE.MeshStandardMaterial({ color: 0x30363d, metalness: 0.5, roughness: 0.4 })
    );
    cap.position.y = 0.24;
    group.add(cap);
    group.position.set(x, y, z);
    scene.add(group);
    sconces.push({ glow, x, y, z, color });
  }

  function updateSconces(dt) {
    if (!sconceBlue || !sconces.length) return;
    let blue = sconces[0];
    let green = sconces[0];
    let blueDy = Infinity;
    let greenDy = Infinity;
    const glide = 1 - Math.exp(-3.2 * dt);
    for (let i = 0; i < sconces.length; i++) {
      const s = sconces[i];
      const dy = Math.abs(s.y - player.y);
      const near = dy < 9;
      s.glow.material.emissiveIntensity = (near ? 2.4 : 1.1) + Math.sin(state.time * 2.6 + i) * 0.35;
      if (s.color === 0x58a6ff && dy < blueDy) {
        blueDy = dy;
        blue = s;
      }
      if (s.color === 0x238636 && dy < greenDy) {
        greenDy = dy;
        green = s;
      }
    }
    sconceBlue.position.x += (blue.x * 0.78 - sconceBlue.position.x) * glide;
    sconceBlue.position.y += (blue.y - sconceBlue.position.y) * glide;
    sconceBlue.position.z += (blue.z + 0.55 - sconceBlue.position.z) * glide;
    sconceGreen.position.x += (green.x * 0.78 - sconceGreen.position.x) * glide;
    sconceGreen.position.y += (green.y - sconceGreen.position.y) * glide;
    sconceGreen.position.z += (green.z + 0.55 - sconceGreen.position.z) * glide;
  }

  function facadeTexture() {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 512;
    const g = c.getContext("2d");
    g.fillStyle = "#0d1117";
    g.fillRect(0, 0, 256, 512);
    for (let y = 10; y < 512; y += 26) {
      for (let x = 10; x < 256; x += 22) {
        const n = (x * 3 + y * 5) % 17;
        const on = n > 7;
        g.globalAlpha = on ? 0.9 : 1;
        g.fillStyle = !on ? "#161b22" : n % 3 === 0 ? "#238636" : "#58a6ff";
        g.fillRect(x, y, 11, 14);
      }
    }
    g.globalAlpha = 1;
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2.2, 18);
    tex.anisotropy = 4;
    return tex;
  }
})();

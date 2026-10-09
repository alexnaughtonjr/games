(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const SHAFT_HALF = 3.55;
  const GRAVITY = -24;
  const MOVE_SPEED = 7.1;
  const JUMP_V = 8.7;
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

  const keys = new Set();
  let jumpEdge = false;
  let jumpRelease = false;

  const state = {
    mode: "title",
    time: 0,
    maxY: PLAT_H,
    cores: 0
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
    ride: null
  };

  const platforms = [];
  const cores = [];
  const coreWorld = new THREE.Vector3();
  let goalBulb = null;

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
  renderer.toneMappingExposure = 1.08;
  renderer.setClearColor(0x0d1117, 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d1117);
  scene.fog = new THREE.FogExp2(0x0d1117, 0.034);

  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 80);
  camera.position.set(0, 3.2, 8.6);

  scene.add(new THREE.HemisphereLight(0x9aa4b2, 0x0d1117, 0.42));
  const key = new THREE.DirectionalLight(0xe6edf3, 1.35);
  key.position.set(2.4, 12, 7);
  scene.add(key);
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
    if ((state.mode === "over" || state.mode === "win") && (e.code === "Enter" || e.code === "Space" || e.code === "KeyR")) {
      restart();
      return;
    }
    if (state.mode === "run" && e.code === "KeyR") {
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

  window.addEventListener("resize", resize);
  resize();

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(frame);

  function startRun() {
    if (state.mode === "run") return;
    state.mode = "run";
    state.maxY = platforms[0].y + platforms[0].h;
    state.cores = 0;
    placeCourier(platforms[0]);
    $("title").classList.add("hidden");
    $("end").classList.add("hidden");
    $("hud").hidden = false;
    $("hint").hidden = false;
    updateHud();
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
    $("endText").textContent = won
      ? "The relay pad is lit. " + meters + "m up, " + state.cores + " " + coreWord + ", score " + score + "."
      : "The shaft took the lamp at " + meters + "m. Score " + score + ". " + state.cores + " " + coreWord + " banked.";
    $("end").classList.remove("hidden");
  }

  function currentScore() {
    return Math.round(Math.max(0, state.maxY) * 10 + state.cores * 100);
  }

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  }

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.033);
    state.time += dt;
    spinCores(dt);
    updatePlatforms(dt);
    if (goalBulb) goalBulb.material.emissiveIntensity = 1.7 + Math.sin(state.time * 3.2) * 0.7;
    if (state.mode === "run") stepPlayer(dt);
    else if (state.mode === "title") idleCourier();
    updateCamera(dt);
    updateHud();
    renderer.render(scene, camera);
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
      if (landed.kind === "boost") {
        player.vy = 12.8;
        player.grounded = false;
        player.coyote = 0;
        player.buffer = 0;
      } else {
        player.ride = landed;
        if (landed.kind === "crumble" && landed.crumbleT == null) landed.crumbleT = 0.52;
      }
    }

    player.mesh.position.set(player.x, player.y, player.z);

    if (landed && landed.kind === "goal") {
      finish(true);
      return;
    }
    if (player.y < -1.4 || (state.maxY > 2 && player.y < state.maxY - 8)) {
      finish(false);
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
    camera.position.x += (destX - camera.position.x) * k;
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
    g.add(pack);

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
    platforms.length = 0;
    cores.length = 0;
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
    while (prev.y < 62) {
      const next = prev.kind === "boost" ? placeAfterBoost(prev, rand) : placeNext(prev, rand);
      tagSpecial(next, prev, rand);
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
      if ((kind === "solid" || kind === "boost") && i > 1 && i % 3 === 0) addCore(rec, i);
    }
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
    group.add(body);

    const lipColor = spec.kind === "goal" || spec.kind === "boost" ? 0x238636
      : spec.kind === "crumble" ? 0xf85149
      : 0x58a6ff;
    const lip = new THREE.Mesh(
      new THREE.BoxGeometry(spec.w + 0.05, 0.045, 0.07),
      new THREE.MeshStandardMaterial({
        color: lipColor,
        emissive: lipColor,
        emissiveIntensity: spec.kind === "goal" ? 2 : 1.55,
        roughness: 0.28,
        metalness: 0.15
      })
    );
    lip.position.set(0, spec.h - 0.02, spec.d / 2 - 0.02);
    group.add(lip);

    if (spec.kind === "boost") {
      const chevron = new THREE.Mesh(
        new THREE.BoxGeometry(Math.max(0.4, spec.w * 0.22), 0.05, 0.42),
        new THREE.MeshStandardMaterial({ color: 0x3fb950, emissive: 0x238636, emissiveIntensity: 1.6, roughness: 0.3 })
      );
      chevron.position.set(0, spec.h + 0.03, 0.1);
      group.add(chevron);
    }

    if (spec.kind === "goal") {
      const mast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.09, 1.35, 10),
        new THREE.MeshStandardMaterial({ color: 0x161b22, metalness: 0.7, roughness: 0.32, emissive: 0x238636, emissiveIntensity: 0.35 })
      );
      mast.position.y = spec.h + 0.68;
      group.add(mast);
      goalBulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0x3fb950, emissive: 0x238636, emissiveIntensity: 2.2, roughness: 0.2 })
      );
      goalBulb.position.y = spec.h + 1.46;
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
    scene.add(left);
    const right = new THREE.Mesh(new THREE.BoxGeometry(0.28, 120, 3.3), sideMat);
    right.position.set(4.22, 48, -0.2);
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
    scene.add(floor);
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

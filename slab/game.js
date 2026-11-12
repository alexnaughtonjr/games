(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const HIGH_KEY = "games.slab.best";

  function readBest() {
    try {
      const n = Number(localStorage.getItem(HIGH_KEY));
      return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
    } catch (err) {
      return 0;
    }
  }

  function writeBest(n) {
    try {
      localStorage.setItem(HIGH_KEY, String(n));
    } catch (err) {
      /* Private mode can block storage. The run still finishes. */
    }
  }

  function showFail() {
    const fail = $("fail");
    const title = $("title");
    if (fail) fail.classList.remove("hidden");
    if (title) title.classList.add("hidden");
  }

  if (!window.THREE) {
    showFail();
    return;
  }

  const canvas = $("view");
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance"
    });
  } catch (err) {
    showFail();
    return;
  }
  if (!renderer || !renderer.getContext()) {
    showFail();
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.setClearColor(0x0d1117, 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d1117);
  scene.fog = new THREE.FogExp2(0x0d1117, 0.042);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.08, 90);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const THICK = 0.46;
  const box = new THREE.BoxGeometry(1, 1, 1);

  scene.add(new THREE.HemisphereLight(0xc9d1d9, 0x0d1117, 0.42));

  const key = new THREE.DirectionalLight(0xf0f6fc, 1.45);
  key.position.set(5, 14, 7);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x58a6ff, 0.35);
  fill.position.set(-6, 4, -4);
  scene.add(fill);

  const kiln = new THREE.PointLight(0xd29922, 7, 16, 2);
  kiln.position.set(0, 0.35, 0);
  scene.add(kiln);

  const rim = new THREE.PointLight(0x79c0ff, 5, 22, 2);
  rim.position.set(-3.5, 7.5, 2.5);
  scene.add(rim);

  function slabMaterial(hex, intensity) {
    const color = new THREE.Color(hex);
    return new THREE.MeshStandardMaterial({
      color: color.clone().multiplyScalar(0.38),
      emissive: color,
      emissiveIntensity: intensity == null ? 0.7 : intensity,
      roughness: 0.36,
      metalness: 0.24
    });
  }

  function glowTexture() {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 128;
    const g = c.getContext("2d");
    const rad = g.createRadialGradient(64, 64, 6, 64, 64, 64);
    rad.addColorStop(0, "rgba(210, 153, 34, 0.65)");
    rad.addColorStop(0.45, "rgba(210, 153, 34, 0.16)");
    rad.addColorStop(1, "rgba(210, 153, 34, 0)");
    g.fillStyle = rad;
    g.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  const world = new THREE.Group();
  scene.add(world);

  const plinth = new THREE.Mesh(
    new THREE.CylinderGeometry(4.35, 4.85, 0.46, 48),
    new THREE.MeshStandardMaterial({ color: 0x161b22, roughness: 0.88, metalness: 0.18 })
  );
  plinth.position.y = -0.22;
  world.add(plinth);

  const heat = new THREE.Mesh(
    new THREE.CircleGeometry(3.6, 40),
    new THREE.MeshBasicMaterial({
      map: glowTexture(),
      transparent: true,
      depthWrite: false,
      toneMapped: false
    })
  );
  heat.rotation.x = -Math.PI / 2;
  heat.position.y = 0.02;
  world.add(heat);

  const lip = new THREE.Mesh(
    new THREE.TorusGeometry(4.2, 0.04, 8, 64),
    slabMaterial(0xd29922, 0.95)
  );
  lip.rotation.x = Math.PI / 2;
  lip.position.y = 0.03;
  world.add(lip);

  const posts = new THREE.Group();
  world.add(posts);
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + i * Math.PI / 2;
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.07, 3.4, 8),
      new THREE.MeshStandardMaterial({ color: 0x21262d, roughness: 0.7, metalness: 0.4 })
    );
    post.position.set(Math.cos(a) * 3.7, 1.5, Math.sin(a) * 3.7);
    posts.add(post);
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 12, 10),
      slabMaterial(i % 2 === 0 ? 0x3fb950 : 0x58a6ff, 1.1)
    );
    cap.position.set(post.position.x, 3.25, post.position.z);
    posts.add(cap);
  }

  const grid = new THREE.GridHelper(30, 30, 0x238636, 0x21262d);
  grid.position.y = -0.44;
  const gridMats = Array.isArray(grid.material) ? grid.material : [grid.material];
  gridMats.forEach((m) => {
    m.transparent = true;
    m.opacity = 0.32;
  });
  scene.add(grid);

  const PLAY_COLORS = [0x238636, 0x2ea043, 0x3fb950, 0x56d364, 0x58a6ff, 0x79c0ff, 0xbc8cff];
  const previewColors = PLAY_COLORS;
  const tower = new THREE.Group();
  world.add(tower);
  const preview = [];
  previewColors.forEach((hex, i) => {
    const shrink = 1 - i * 0.04;
    const mesh = new THREE.Mesh(box, slabMaterial(hex));
    const w = 3.05 * shrink;
    mesh.scale.set(w, THICK, w);
    mesh.position.y = THICK * 0.5 + i * THICK + (reduceMotion ? 0 : 2.4);
    mesh.userData.baseY = THICK * 0.5 + i * THICK;
    mesh.userData.delay = reduceMotion ? 0 : i * 0.16;
    tower.add(mesh);
    preview.push(mesh);
  });

  const emberCount = 56;
  const emberPos = new Float32Array(emberCount * 3);
  const emberSeed = new Float32Array(emberCount);
  for (let i = 0; i < emberCount; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 0.8 + Math.random() * 6.2;
    emberPos[i * 3] = Math.cos(a) * r;
    emberPos[i * 3 + 1] = Math.random() * 7.5;
    emberPos[i * 3 + 2] = Math.sin(a) * r;
    emberSeed[i] = Math.random() * Math.PI * 2;
  }
  const emberGeo = new THREE.BufferGeometry();
  emberGeo.setAttribute("position", new THREE.BufferAttribute(emberPos, 3));
  const embers = new THREE.Points(
    emberGeo,
    new THREE.PointsMaterial({
      color: 0xe3b341,
      size: 0.16,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      sizeAttenuation: true
    })
  );
  scene.add(embers);

  let bloom = null;
  try {
    if (window.LabBloom) {
      const coarse = window.matchMedia("(pointer: coarse)").matches;
      bloom = window.LabBloom(renderer, scene, camera, {
        threshold: 0.52,
        strength: 0.78,
        div: coarse ? 4 : 2
      });
    }
  } catch (err) {
    bloom = null;
  }

  function resize() {
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(w, h, false);
    if (bloom) bloom.resize();
  }
  window.addEventListener("resize", resize);
  resize();

  const BASE = 3.05;
  const PERFECT = 0.14;
  const MIN_SIZE = 0.18;
  const state = {
    mode: "title",
    floors: 0,
    embers: 0,
    combo: 0,
    score: 0,
    best: readBest(),
    lock: 0,
    elapsed: 0,
    overTimer: 0,
    callout: 0,
    shake: 0
  };
  const stack = [];
  const debris = [];
  let mover = null;
  let ember = null;
  const emberShape = new THREE.SphereGeometry(0.22, 18, 14);
  const playRoot = new THREE.Group();
  scene.add(playRoot);

  const guide = new THREE.Mesh(
    box,
    new THREE.MeshBasicMaterial({
      color: 0xe6edf3,
      transparent: true,
      opacity: 0.2,
      depthWrite: false
    })
  );
  guide.visible = false;
  playRoot.add(guide);

  const sparkGeo = new THREE.BoxGeometry(0.09, 0.09, 0.09);
  const sparks = [];
  for (let i = 0; i < 40; i++) {
    const mesh = new THREE.Mesh(
      sparkGeo,
      new THREE.MeshBasicMaterial({
        color: 0x7ee787,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        toneMapped: false
      })
    );
    mesh.visible = false;
    playRoot.add(mesh);
    sparks.push({ mesh, vx: 0, vy: 0, vz: 0, life: 0 });
  }

  const trails = [];
  for (let i = 0; i < 8; i++) {
    const mesh = new THREE.Mesh(
      box,
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        toneMapped: false
      })
    );
    mesh.visible = false;
    playRoot.add(mesh);
    trails.push({ mesh, life: 0 });
  }
  let trailTick = 0;

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1, 0.035, 8, 40),
    new THREE.MeshBasicMaterial({
      color: 0x7ee787,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false
    })
  );
  ring.rotation.x = Math.PI / 2;
  ring.visible = false;
  playRoot.add(ring);
  let ringLife = 0;

  function tone(name) {
    try {
      const fx = window.LabFX && window.LabFX.sfx;
      if (!fx) return;
      if (name === "pop") fx.pop();
      else if (name === "perfect") fx.orb(Math.max(1, state.combo));
      else if (name === "ember") fx.boost();
      else if (name === "bad") fx.bad();
    } catch (err) {
      /* Audio can fail before a gesture. The drop still counts. */
    }
  }

  function buzz(pattern) {
    try {
      if (navigator.vibrate) navigator.vibrate(pattern);
    } catch (err) {
      /* Some browsers reject vibration outside a gesture. */
    }
  }

  function addShake(amount) {
    if (reduceMotion) return;
    state.shake = Math.min(1.2, state.shake + amount);
  }

  function burst(x, y, z, color, count, speed) {
    let left = count;
    for (let i = 0; i < sparks.length && left > 0; i++) {
      const spark = sparks[i];
      if (spark.life > 0) continue;
      spark.life = 0.32 + Math.random() * 0.28;
      spark.mesh.visible = true;
      spark.mesh.material.color.set(color);
      spark.mesh.material.opacity = 1;
      spark.mesh.position.set(x, y, z);
      const yaw = Math.random() * Math.PI * 2;
      const pitch = Math.random() * Math.PI;
      const mag = speed * (0.45 + Math.random() * 0.7);
      spark.vx = Math.sin(pitch) * Math.cos(yaw) * mag;
      spark.vy = Math.abs(Math.cos(pitch)) * mag + 0.6;
      spark.vz = Math.sin(pitch) * Math.sin(yaw) * mag;
      left -= 1;
    }
  }

  function updateSparks(dt) {
    for (let i = 0; i < sparks.length; i++) {
      const spark = sparks[i];
      if (spark.life <= 0) continue;
      spark.life -= dt;
      spark.vy -= 7 * dt;
      spark.mesh.position.x += spark.vx * dt;
      spark.mesh.position.y += spark.vy * dt;
      spark.mesh.position.z += spark.vz * dt;
      spark.mesh.material.opacity = Math.max(0, spark.life * 2.2);
      if (spark.life <= 0) spark.mesh.visible = false;
    }
  }

  function updateTrail(dt) {
    if (state.mode === "play" && mover && !mover.falling && !reduceMotion) {
      trailTick -= dt;
      if (trailTick <= 0) {
        trailTick = 0.055;
        const slot = trails.find((item) => item.life <= 0);
        if (slot) {
          slot.life = 0.26;
          slot.mesh.visible = true;
          slot.mesh.position.set(mover.x, mover.y, mover.z);
          slot.mesh.scale.set(mover.w * 0.98, THICK * 0.92, mover.d * 0.98);
          slot.mesh.material.color.copy(mover.mesh.material.emissive);
          slot.mesh.material.opacity = 0.28;
        }
      }
    }
    for (let i = 0; i < trails.length; i++) {
      const slot = trails[i];
      if (slot.life <= 0) continue;
      slot.life -= dt;
      slot.mesh.material.opacity = Math.max(0, slot.life * 0.9);
      if (slot.life <= 0) slot.mesh.visible = false;
    }
  }

  function pulseRing(x, y, z, radius) {
    ring.position.set(x, y, z);
    ring.userData.base = Math.max(0.4, radius);
    ring.scale.setScalar(ring.userData.base);
    ring.visible = true;
    ringLife = 0.42;
    ring.material.opacity = 0.95;
  }

  function updateRing(dt) {
    if (ringLife <= 0) return;
    ringLife -= dt;
    const grow = 1 + (0.42 - ringLife) * 1.8;
    ring.scale.setScalar((ring.userData.base || 1) * grow);
    ring.material.opacity = Math.max(0, ringLife * 2);
    if (ringLife <= 0) ring.visible = false;
  }

  function hideJuice() {
    ring.visible = false;
    ringLife = 0;
    state.shake = 0;
    for (let i = 0; i < trails.length; i++) {
      trails[i].life = 0;
      trails[i].mesh.visible = false;
    }
  }

  const desiredCam = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();

  function colorFor(index) {
    return PLAY_COLORS[index % PLAY_COLORS.length];
  }

  function topSlab() {
    return stack[stack.length - 1];
  }

  function makeSlabMesh(w, d, hex, intensity) {
    const mesh = new THREE.Mesh(box, slabMaterial(hex, intensity));
    mesh.scale.set(w, THICK, d);
    return mesh;
  }

  function spawnBase() {
    const mesh = makeSlabMesh(BASE, BASE, colorFor(0), 0.55);
    const y = THICK / 2;
    mesh.position.set(0, y, 0);
    playRoot.add(mesh);
    stack.push({ mesh, x: 0, z: 0, w: BASE, d: BASE, y });
  }

  function overlap1D(centerA, sizeA, centerB, sizeB) {
    const left = Math.max(centerA - sizeA / 2, centerB - sizeB / 2);
    const right = Math.min(centerA + sizeA / 2, centerB + sizeB / 2);
    const size = right - left;
    if (size <= 0) return null;
    return { center: (left + right) / 2, size };
  }

  function paintHint() {
    const hint = $("hint");
    if (!hint || state.mode !== "play") return;
    hint.textContent = ember && !ember.falling
      ? "Ember in play · Space, click, or Drop"
      : "Space, click, or Drop";
  }

  function paintHud() {
    const score = $("score");
    const best = $("best");
    const floors = $("floors");
    const streak = $("streak");
    if (score) score.textContent = String(state.score);
    if (best) best.textContent = String(state.best);
    if (floors) floors.textContent = String(state.floors);
    if (streak) streak.textContent = String(state.combo);
  }

  function showRunChrome(on) {
    const hud = $("hud");
    const home = $("home");
    if (hud) hud.hidden = !on;
    if (home) home.hidden = on;
  }

  function showCallout(text) {
    const el = $("callout");
    if (!el) return;
    el.textContent = text;
    el.classList.remove("hidden");
    state.callout = 0.75;
  }

  function spawnOffcut(x, z, w, d, y, hex, axis, sign) {
    if (w < 0.04 || d < 0.04) return;
    const mesh = makeSlabMesh(w, d, hex, 0.75);
    mesh.position.set(x, y, z);
    mesh.material.transparent = true;
    playRoot.add(mesh);
    burst(x, y, z, hex, 10, 2.1);
    debris.push({
      mesh,
      vy: 0.8,
      vx: axis === "x" ? sign * 1.35 : 0,
      vz: axis === "z" ? sign * 1.35 : 0,
      life: 1.5
    });
  }

  function updateDebris(dt) {
    for (let i = debris.length - 1; i >= 0; i--) {
      const piece = debris[i];
      piece.vy -= 16 * dt;
      piece.mesh.position.x += piece.vx * dt;
      piece.mesh.position.y += piece.vy * dt;
      piece.mesh.position.z += piece.vz * dt;
      piece.mesh.rotation.x += dt * 1.2;
      piece.mesh.rotation.z += dt * 0.8;
      piece.life -= dt;
      piece.mesh.material.opacity = Math.max(0, piece.life / 1.5);
      if (piece.life <= 0 || piece.mesh.position.y < -3) {
        playRoot.remove(piece.mesh);
        piece.mesh.material.dispose();
        debris.splice(i, 1);
      }
    }
  }

  function clearEmber() {
    if (!ember) return;
    playRoot.remove(ember.mesh);
    ember.mesh.material.dispose();
    ember = null;
  }

  function spawnEmber(info) {
    clearEmber();
    const mesh = new THREE.Mesh(emberShape, slabMaterial(0xe3b341, 1.5));
    const light = new THREE.PointLight(0xe3b341, 2.4, 5, 2);
    mesh.add(light);
    const sign = Math.random() < 0.5 ? -1 : 1;
    const offset = sign * info.span * (0.38 + Math.random() * 0.22);
    const x = info.axis === "x" ? info.originX + offset : info.originX;
    const z = info.axis === "z" ? info.originZ + offset : info.originZ;
    mesh.position.set(x, info.y, z);
    playRoot.add(mesh);
    ember = { mesh, x, z, y: info.y, falling: false, vy: 0 };
  }

  function updateEmber(dt) {
    if (!ember) return;
    if (!ember.falling) {
      ember.mesh.position.y = ember.y + Math.sin(state.elapsed * 4.2) * 0.08;
      return;
    }
    ember.vy -= 16 * dt;
    ember.mesh.position.y += ember.vy * dt;
    if (ember.mesh.position.y < -3) clearEmber();
  }

  function emberCaught(placed) {
    if (!ember || ember.falling) return false;
    return Math.abs(ember.x - placed.x) <= placed.w / 2 - 0.04
      && Math.abs(ember.z - placed.z) <= placed.d / 2 - 0.04;
  }

  function spawnMover() {
    const top = topSlab();
    const hex = colorFor(stack.length);
    const mesh = makeSlabMesh(top.w, top.d, hex, 1.05);
    const axis = state.floors % 2 === 0 ? "x" : "z";
    const span = 1.55 + Math.max(top.w, top.d) * 0.72;
    mover = {
      mesh,
      axis,
      hex,
      w: top.w,
      d: top.d,
      x: top.x,
      z: top.z,
      originX: top.x,
      originZ: top.z,
      span,
      dir: 1,
      speed: Math.min(7.4, 2.15 + state.floors * 0.14),
      y: top.y + THICK,
      falling: false,
      vy: 0
    };
    if (axis === "x") mover.x = top.x - span;
    else mover.z = top.z - span;
    mesh.position.set(mover.x, mover.y, mover.z);
    playRoot.add(mesh);
    guide.visible = true;
    guide.scale.set(mover.w, THICK * 0.07, mover.d);
    if (state.floors > 0 && state.floors % 3 === 0) spawnEmber(mover);
    paintHint();
  }

  function updateMover(dt) {
    if (!mover.falling) {
      const axis = mover.axis;
      const current = axis === "x" ? mover.x : mover.z;
      const origin = axis === "x" ? mover.originX : mover.originZ;
      let next = current + mover.dir * mover.speed * dt;
      const min = origin - mover.span;
      const max = origin + mover.span;
      if (next > max) {
        next = max;
        mover.dir = -1;
      } else if (next < min) {
        next = min;
        mover.dir = 1;
      }
      if (axis === "x") mover.x = next;
      else mover.z = next;
    } else {
      mover.vy -= 16 * dt;
      mover.y += mover.vy * dt;
      mover.mesh.rotation.z += dt * (mover.axis === "x" ? 1.6 : 0.4);
      mover.mesh.rotation.x += dt * (mover.axis === "z" ? 1.6 : 0.4);
    }
    mover.mesh.position.set(mover.x, mover.y, mover.z);
    if (!mover.falling) {
      const top = topSlab();
      guide.position.set(mover.x, top.y + THICK * 0.54, mover.z);
      guide.scale.set(mover.w, THICK * 0.07, mover.d);
      guide.visible = true;
    } else {
      guide.visible = false;
    }
  }

  function showEnd() {
    state.mode = "over";
    const floors = state.floors;
    const floorWord = floors === 1 ? "floor" : "floors";
    const emberBit = state.embers ? ` ${state.embers} ember${state.embers === 1 ? "" : "s"} caught.` : "";
    const text = floors === 0
      ? "The first slab missed the base."
      : `The tower held ${floors} ${floorWord}.${emberBit}`;
    const endText = $("endText");
    if (endText) endText.textContent = text;
    if (state.score > state.best) {
      state.best = state.score;
      writeBest(state.best);
    }
    const endScore = $("endScore");
    if (endScore) endScore.textContent = `Score ${state.score} · best ${state.best}`;
    paintHud();
    const end = $("end");
    if (end) end.classList.remove("hidden");
  }

  function missRun() {
    state.mode = "fall";
    state.overTimer = 0.72;
    guide.visible = false;
    if (mover) {
      mover.falling = true;
      mover.vy = 0.4;
    }
    if (ember && !ember.falling) {
      ember.falling = true;
      ember.vy = 0.2;
    }
    const hint = $("hint");
    const touch = $("touch");
    if (hint) hint.classList.add("hidden");
    if (touch) touch.classList.remove("show");
    state.combo = 0;
    addShake(0.9);
    tone("bad");
    buzz(46);
    if (mover) burst(mover.x, mover.y, mover.z, 0xf85149, 18, 3.4);
  }

  function drop() {
    if (state.mode !== "play" || !mover || mover.falling || state.lock > 0) return;
    state.lock = 0.12;
    const top = topSlab();
    const axis = mover.axis;
    const delta = axis === "x" ? mover.x - top.x : mover.z - top.z;
    const perfect = Math.abs(delta) <= PERFECT;
    let x = top.x;
    let z = top.z;
    let w = top.w;
    let d = top.d;

    if (!perfect) {
      if (axis === "x") {
        const hit = overlap1D(mover.x, mover.w, top.x, top.w);
        if (!hit || hit.size < MIN_SIZE) {
          missRun();
          return;
        }
        const overhang = mover.w - hit.size;
        const sign = mover.x >= top.x ? 1 : -1;
        spawnOffcut(
          hit.center + sign * (hit.size / 2 + overhang / 2),
          top.z,
          overhang,
          top.d,
          mover.y,
          mover.hex,
          "x",
          sign
        );
        x = hit.center;
        w = hit.size;
        z = top.z;
        d = top.d;
      } else {
        const hit = overlap1D(mover.z, mover.d, top.z, top.d);
        if (!hit || hit.size < MIN_SIZE) {
          missRun();
          return;
        }
        const overhang = mover.d - hit.size;
        const sign = mover.z >= top.z ? 1 : -1;
        spawnOffcut(
          top.x,
          hit.center + sign * (hit.size / 2 + overhang / 2),
          top.w,
          overhang,
          mover.y,
          mover.hex,
          "z",
          sign
        );
        x = top.x;
        z = hit.center;
        w = top.w;
        d = hit.size;
      }
    }

    const mesh = mover.mesh;
    mesh.scale.set(w, THICK, d);
    mesh.position.set(x, mover.y, z);
    const placed = { mesh, x, z, w, d, y: mover.y };
    stack.push(placed);
    state.floors += 1;

    const notes = [];
    if (perfect) {
      state.combo += 1;
      notes.push(state.combo > 1 ? `Perfect x${state.combo}` : "Perfect");
      mesh.material.emissiveIntensity = 1.7;
      burst(x, mover.y, z, 0x7ee787, 16, 2.5);
      pulseRing(x, mover.y, z, Math.max(w, d) * 0.52);
      addShake(0.16);
      tone("perfect");
      buzz([12, 28, 16]);
    } else {
      state.combo = 0;
      addShake(0.22);
      tone("pop");
      buzz(10);
    }
    if (emberCaught(placed)) {
      state.embers += 1;
      burst(ember.x, ember.y, ember.z, 0xe3b341, 20, 3);
      clearEmber();
      notes.push("Ember");
      tone("ember");
      addShake(0.28);
    } else if (ember && !ember.falling) {
      ember.falling = true;
      ember.vy = 0.3;
    }
    if (notes.length) showCallout(notes.join(" · "));

    state.score += 10 + (perfect ? 15 * state.combo : 0) + (notes.indexOf("Ember") >= 0 ? 50 : 0);
    paintHud();
    mover = null;
    spawnMover();
  }

  function clearPlay() {
    clearEmber();
    clearDebris();
    if (mover) {
      playRoot.remove(mover.mesh);
      mover.mesh.material.dispose();
      mover = null;
    }
    while (stack.length) {
      const slab = stack.pop();
      playRoot.remove(slab.mesh);
      slab.mesh.material.dispose();
    }
    guide.visible = false;
    hideJuice();
  }

  function clearDebris() {
    while (debris.length) {
      const piece = debris.pop();
      playRoot.remove(piece.mesh);
      piece.mesh.material.dispose();
    }
  }

  function startRun() {
    if (state.mode === "play" || state.mode === "fall") return;
    clearPlay();
    state.mode = "play";
    state.floors = 0;
    state.embers = 0;
    state.combo = 0;
    state.score = 0;
    state.shake = 0;
    state.lock = 0.2;
    state.callout = 0;
    const title = $("title");
    const hint = $("hint");
    const touch = $("touch");
    const end = $("end");
    const callout = $("callout");
    if (title) title.classList.add("hidden");
    if (end) end.classList.add("hidden");
    if (callout) callout.classList.add("hidden");
    if (hint) hint.classList.remove("hidden");
    if (touch) touch.classList.add("show");
    const pause = $("pause");
    if (pause) pause.classList.add("hidden");
    const pauseBtn = $("pauseBtn");
    if (pauseBtn) {
      pauseBtn.textContent = "Pause";
      pauseBtn.setAttribute("aria-pressed", "false");
    }
    tower.visible = false;
    showRunChrome(true);
    spawnBase();
    spawnMover();
    paintHint();
    paintHud();
  }

  function togglePause() {
    const card = $("pause");
    const pauseBtn = $("pauseBtn");
    const hint = $("hint");
    const touch = $("touch");
    if (state.mode === "play") {
      state.mode = "pause";
      if (card) card.classList.remove("hidden");
      if (hint) hint.classList.add("hidden");
      if (touch) touch.classList.remove("show");
      if (pauseBtn) {
        pauseBtn.textContent = "Resume";
        pauseBtn.setAttribute("aria-pressed", "true");
      }
      return;
    }
    if (state.mode === "pause") {
      state.mode = "play";
      if (card) card.classList.add("hidden");
      if (hint) hint.classList.remove("hidden");
      if (touch) touch.classList.add("show");
      if (pauseBtn) {
        pauseBtn.textContent = "Pause";
        pauseBtn.setAttribute("aria-pressed", "false");
      }
    }
  }

  function restartRun() {
    if (state.mode === "fall") return;
    if (state.mode === "title") {
      startRun();
      return;
    }
    state.mode = "over";
    startRun();
  }

  const startBtn = $("start");
  if (startBtn) startBtn.addEventListener("click", startRun);
  const retryBtn = $("retry");
  if (retryBtn) retryBtn.addEventListener("click", startRun);
  const pauseBtn = $("pauseBtn");
  if (pauseBtn) pauseBtn.addEventListener("click", togglePause);
  const resumeBtn = $("resume");
  if (resumeBtn) resumeBtn.addEventListener("click", togglePause);
  const restartBtn = $("restart");
  if (restartBtn) restartBtn.addEventListener("click", restartRun);
  const dropBtn = $("dropBtn");
  if (dropBtn) {
    dropBtn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      drop();
    });
  }
  canvas.addEventListener("pointerdown", () => {
    if (state.mode === "play") drop();
  });
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  document.addEventListener("keydown", (e) => {
    if (e.repeat) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.code === "KeyP" || e.code === "Escape") {
      if (state.mode === "play" || state.mode === "pause") {
        e.preventDefault();
        togglePause();
      }
      return;
    }
    if (e.code === "KeyR") {
      e.preventDefault();
      restartRun();
      return;
    }
    if (e.code !== "Space" && e.code !== "Enter") return;
    e.preventDefault();
    if (state.mode === "title" || state.mode === "over") startRun();
    else if (state.mode === "play") drop();
  });

  const titleBest = $("titleBest");
  if (titleBest && state.best > 0) titleBest.textContent = `Best ${state.best}`;
  paintHud();

  const clock = new THREE.Clock();
  let spin = 0.85;
  let age = 0;

  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(0.033, clock.getDelta());
    age += dt;
    state.elapsed += dt;
    if (state.lock > 0) state.lock = Math.max(0, state.lock - dt);
    if (state.callout > 0) {
      state.callout -= dt;
      if (state.callout <= 0) {
        const callout = $("callout");
        if (callout) callout.classList.add("hidden");
      }
    }
    if (state.mode === "fall") {
      state.overTimer -= dt;
      if (state.overTimer <= 0) showEnd();
    }
    if (state.mode !== "pause") {
      updateDebris(dt);
      updateEmber(dt);
      updateSparks(dt);
      updateTrail(dt);
      updateRing(dt);
    }
    if (state.shake > 0) state.shake *= Math.exp(-3.6 * dt);
    if (!reduceMotion && state.mode === "title") spin += dt * 0.24;

    if (state.mode === "title") {
      preview.forEach((mesh) => {
        const u = reduceMotion ? 1 : Math.min(1, Math.max(0, (age - mesh.userData.delay) / 0.42));
        const ease = 1 - Math.pow(1 - u, 3);
        mesh.position.y = mesh.userData.baseY + (1 - ease) * 2.4;
      });
      const dist = 9.6;
      const lift = 5.2;
      camera.position.set(Math.sin(spin) * dist, lift + Math.sin(spin * 0.7) * 0.25, Math.cos(spin) * dist);
      camera.lookAt(0, 1.55, 0);
    } else if (stack.length) {
      if (mover && state.mode !== "pause") updateMover(dt);
      const top = topSlab();
      const focusY = mover ? mover.y : top.y;
      const portrait = camera.aspect < 0.95;
      const wantFov = portrait ? 64 : 42;
      if (Math.abs(camera.fov - wantFov) > 0.1) {
        camera.fov = wantFov;
        camera.updateProjectionMatrix();
      }
      const back = portrait ? 12.2 : 6.5;
      const lift = portrait ? 13.2 : 6.5;
      desiredCam.set(top.x + back, focusY + lift, top.z + back);
      const blend = 1 - Math.exp(-2.8 * dt);
      camera.position.lerp(desiredCam, blend);
      lookTarget.set(top.x, focusY - (portrait ? 0.6 : 0.35), top.z);
      camera.lookAt(lookTarget);
      if (state.shake > 0.004) {
        const kick = state.shake * state.shake * 0.55;
        camera.position.x += (Math.random() - 0.5) * kick;
        camera.position.y += (Math.random() - 0.5) * kick * 0.65;
      }
      kiln.position.y = Math.max(0.35, top.y);
    }

    if (!reduceMotion) {
      for (let i = 0; i < emberCount; i++) {
        emberPos[i * 3 + 1] += dt * (0.22 + (i % 5) * 0.06);
        if (emberPos[i * 3 + 1] > 8) emberPos[i * 3 + 1] = 0.1;
        emberPos[i * 3] += Math.sin(age * 1.4 + emberSeed[i]) * dt * 0.08;
      }
      emberGeo.attributes.position.needsUpdate = true;
      heat.material.opacity = 0.82 + Math.sin(age * 2.4) * 0.12;
    }

    kiln.intensity = 6 + Math.sin(age * 2.6) * 1.1;
    rim.position.y = 6.8 + Math.sin(age * 0.8) * 0.4;

    if (bloom) bloom.render();
    else renderer.render(scene, camera);
  }

  frame();
})();

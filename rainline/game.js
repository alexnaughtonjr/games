/* Rainline — original stick vigilante. Free custom game for Alexander Haislip. */
(function () {
  const canvas = document.getElementById("view");
  const hud = document.getElementById("hud");
  const titleEl = document.getElementById("title");
  const pauseEl = document.getElementById("pause");
  const endEl = document.getElementById("end");
  const promptEl = document.getElementById("prompt");
  const tipEl = document.getElementById("tip");
  const reticle = document.getElementById("reticle");
  const gadgetsEl = document.getElementById("gadgets");
  const hpBar = document.getElementById("hpBar");
  const comboBar = document.getElementById("comboBar");
  const comboN = document.getElementById("comboN");
  const alertEl = document.getElementById("alert");
  const remainEl = document.getElementById("remain");
  const cdDisc = document.getElementById("cdDisc");
  const cdSmoke = document.getElementById("cdSmoke");

  const BLOCKS = [
    { minX: -30, maxX: -14, minZ: -8, maxZ: 14, h: 12 },
    { minX: -14, maxX: 18, minZ: -28, maxZ: -12, h: 8 },
    { minX: 14, maxX: 30, minZ: -12, maxZ: 16, h: 10 },
    { minX: -10, maxX: 12, minZ: 14, maxZ: 28, h: 5 },
  ];

  const ENEMY_DEFS = [
    { x: -10.2, z: 0.8, patrol: [[-10.2, 0.8], [-8.8, 1.5], [-9.6, 2.2]] },
    { x: 2.2, z: -2.4, patrol: [[2.2, -2.4], [6.4, 1.6], [-1.2, 3.4]] },
    { x: -1.5, z: 8.5, patrol: [[-1.5, 8.5], [5.5, 11], [-4.2, 6.4]] },
    { x: 9.5, z: -6.2, patrol: [[9.5, -6.2], [12.2, -1.2], [6.4, -7.4]] },
    { x: 1.5, z: -18, patrol: [[1.5, -18], [-6, -16.5], [8, -20]] },
    { x: 20, z: 3.5, patrol: [[20, 3.5], [23, 9], [16.5, 7]] },
  ];

  const PERCH = new THREE.Vector3(-15.2, 12, 0.6);
  const MAX_HP = 120;
  const COMBO_NEED = 5;
  const DISC_CD = 4.5;
  const SMOKE_CD = 7;

  const keys = {};
  const cam = { yaw: Math.PI / 2, pitch: -0.16, dist: 6.4 };
  const player = {
    pos: new THREE.Vector3(-22, 12, 2),
    vy: 0,
    yaw: Math.PI / 2,
    hp: MAX_HP,
    combo: 0,
    comboT: 0,
    attackT: 0,
    attackCd: 0,
    invuln: 0,
    onGround: true,
    moving: false,
    perched: false,
    gliding: false,
  };

  let renderer;
  let scene;
  let camera;
  let solids = [];
  let hero;
  let enemies = [];
  let grapples = [];
  let targetGrapple = null;
  let mode = "title";
  let started = false;
  let paused = false;
  let ending = false;
  let slowUntil = 0;
  let slowScale = 0.32;
  let impactFlashUntil = 0;
  let shake = 0;
  let hurtFlash = 0;
  let tipUntil = 0;
  let time = 0;
  let leap = null;
  let grapple = null;
  const disc = { active: false, cd: 0, life: 0, pos: new THREE.Vector3(), vel: new THREE.Vector3(), mesh: null };
  const smoke = { life: 0, cd: 0, radius: 0.4, pos: new THREE.Vector3(), mesh: null };
  const raycaster = new THREE.Raycaster();
  const lookDir = new THREE.Vector3();
  const camTarget = new THREE.Vector3();
  const desiredCam = new THREE.Vector3();
  const back = new THREE.Vector3();
  const handPos = new THREE.Vector3();
  let sparkPool = [];
  let liveSparks = [];
  let rain;
  let rainPos;
  let rainCount = 0;
  let quality = "high";
  let composer = null;
  let bloomPass = null;
  let moon = null;
  let rimLight = null;
  let stormLight = null;
  let stormEl = null;
  let groundMat = null;
  let rippleMap = null;
  let cape = null;
  let bolt = null;
  let strikeRibbon = null;
  let glideRibbon = null;
  let impactLight = null;
  let impactRing = null;
  let impactLife = 0;
  let impactDur = 0.14;
  let impactScale = 1.2;
  let lightningT = 0;
  let nextLightning = 3.4;
  const signLights = [];
  const streetSpots = [];
  const lampCones = [];
  const splashPool = [];
  const liveSplashes = [];
  const heroVel = new THREE.Vector3();
  const prevPlayer = new THREE.Vector3(-22, 12, 2);
  const pin = new THREE.Vector3();
  const glidePoint = new THREE.Vector3();
  const side = new THREE.Vector3();
  const _up = new THREE.Vector3(0, 1, 0);
  const _dir = new THREE.Vector3();
  const _v1 = new THREE.Vector3();
  const fogBase = new THREE.Color(0x0b121c);
  const fogFlash = new THREE.Color(0x314862);
  const bgBase = new THREE.Color(0x070b14);
  const MOON_BASE = 1.22;
  let actx = null;
  try {
    if (localStorage.getItem("rainline.quality") === "low") quality = "low";
  } catch (err) { /* storage is optional */ }
  let snapCam = true;
  let dragging = false;
  let haveLast = false;
  let lastMX = 0;
  let lastMY = 0;

  const rendererOk = boot();
  if (!rendererOk) return;

  document.getElementById("start").addEventListener("click", () => {
    begin();
    canvas.requestPointerLock();
  });
  document.getElementById("resume").addEventListener("click", () => {
    paused = false;
    pauseEl.classList.add("hidden");
    canvas.requestPointerLock();
  });
  document.getElementById("hudPause").addEventListener("click", () => {
    pauseGame();
  });
  document.getElementById("hudQuality").addEventListener("click", () => {
    toggleQuality();
  });
  const titleQuality = document.getElementById("titleQuality");
  if (titleQuality) titleQuality.addEventListener("click", () => toggleQuality());
  document.getElementById("retry").addEventListener("click", () => {
    ending = false;
    endEl.classList.add("hidden");
    resetSimulation();
    begin();
    canvas.requestPointerLock();
  });

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", (e) => { keys[e.code] = false; });
  window.addEventListener("blur", () => { for (const k in keys) keys[k] = false; });
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  canvas.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mouseup", () => { dragging = false; haveLast = false; });
  window.addEventListener("mousemove", onMouseMove);
  document.addEventListener("pointerlockchange", onLockChange);
  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(frame);

  function boot() {
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    } catch (err) {
      document.getElementById("fail").classList.remove("hidden");
      return false;
    }
    if (!renderer.getContext()) {
      document.getElementById("fail").classList.remove("hidden");
      return false;
    }
    renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    scene = new THREE.Scene();
    scene.background = bgBase.clone();
    scene.fog = new THREE.FogExp2(fogBase.clone(), 0.023);
    camera = new THREE.PerspectiveCamera(58, 1, 0.1, 180);

    const env = makeEnv();
    scene.environment = env;

    scene.add(new THREE.HemisphereLight(0x8eaccc, 0x120e0c, 0.38));
    moon = new THREE.DirectionalLight(0xc5d8ff, MOON_BASE);
    moon.position.set(18, 32, 12);
    moon.castShadow = true;
    moon.shadow.mapSize.set(2048, 2048);
    moon.shadow.camera.near = 1;
    moon.shadow.camera.far = 80;
    moon.shadow.camera.left = -18;
    moon.shadow.camera.right = 18;
    moon.shadow.camera.top = 18;
    moon.shadow.camera.bottom = -18;
    moon.shadow.bias = -0.00022;
    moon.shadow.normalBias = 0.028;
    scene.add(moon);
    scene.add(moon.target);

    rimLight = new THREE.SpotLight(0x9fd4ff, 2.4, 11, 0.9, 0.55, 1);
    rimLight.position.set(-24, 15, 0);
    scene.add(rimLight);
    scene.add(rimLight.target);

    stormLight = new THREE.DirectionalLight(0xe9f2ff, 0);
    stormLight.position.set(-12, 40, 8);
    scene.add(stormLight);
    scene.add(stormLight.target);

    buildCity(env);
    captureBlock();
    hero = createStick({ body: 0xaeb9c8, accent: 0x58a6ff, cape: true });
    hero.group.scale.setScalar(1.28);
    scene.add(hero.group);
    buildCape();
    spawnEnemies();
    buildSparks();
    buildSplashes();
    buildRibbons();
    buildImpact();
    buildBolt();
    buildComposer();
    stormEl = document.getElementById("storm");
    applyQuality();
    disc.mesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.045, 8, 14),
      new THREE.MeshStandardMaterial({
        color: 0x041018,
        emissive: 0x58a6ff,
        emissiveIntensity: 2.8,
        roughness: 0.3,
        metalness: 0.45,
      })
    );
    disc.mesh.visible = false;
    scene.add(disc.mesh);
    smoke.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(1, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xc9d1d9, transparent: true, opacity: 0.22, depthWrite: false })
    );
    smoke.mesh.visible = false;
    scene.add(smoke.mesh);
    return true;
  }

  function groundHeight(x, z) {
    let h = 0;
    for (let i = 0; i < BLOCKS.length; i++) {
      const b = BLOCKS[i];
      if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ) h = Math.max(h, b.h);
    }
    return h;
  }

  function buildCity(env) {
    const winCanvas = windowCanvas();
    for (let i = 0; i < BLOCKS.length; i++) {
      const b = BLOCKS[i];
      const w = b.maxX - b.minX;
      const d = b.maxZ - b.minZ;
      const tex = new THREE.CanvasTexture(winCanvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(Math.max(1, w / 6), Math.max(1, b.h / 4));
      const mat = new THREE.MeshStandardMaterial({
        color: 0x1a222c,
        emissive: 0xffffff,
        emissiveMap: tex,
        emissiveIntensity: 1.15,
        roughness: 0.86,
        metalness: 0.08,
      });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, b.h, d), mat);
      mesh.position.set((b.minX + b.maxX) / 2, b.h / 2, (b.minZ + b.maxZ) / 2);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      solids.push(mesh);
    }

    rippleMap = makeRippleNormal();
    groundMat = new THREE.MeshPhysicalMaterial({
      color: 0x161d27,
      roughness: 0.38,
      metalness: 0.64,
      clearcoat: 0.78,
      clearcoatRoughness: 0.16,
      envMap: env,
      envMapIntensity: 1.35,
      normalMap: rippleMap,
      normalScale: new THREE.Vector2(0.28, 0.28),
      roughnessMap: makeWetRoughness(),
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(180, 180), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const puddleMat = new THREE.MeshPhysicalMaterial({
      color: 0x101820,
      roughness: 0.04,
      metalness: 1,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      envMap: env,
      envMapIntensity: 1.7,
      normalMap: rippleMap,
      normalScale: new THREE.Vector2(0.12, 0.12),
    });
    [[-4, 2, 3.2], [6, -4, 2.4], [1, 7, 2.8], [-6, -5, 1.8]].forEach((p) => {
      const puddle = new THREE.Mesh(new THREE.CircleGeometry(p[2], 18), puddleMat);
      puddle.rotation.x = -Math.PI / 2;
      puddle.position.set(p[0], 0.03, p[1]);
      puddle.receiveShadow = true;
      scene.add(puddle);
    });

    addSign("RAIN LINE", "#58a6ff", -2, 7.2, -11.85, 7.2, 1.6, 0);
    addSign("NIGHT BOWL", "#3fb950", 13.85, 6.4, 2, 6.4, 1.4, -Math.PI / 2);
    addSign("OPEN LATE", "#d29922", 2, 4.3, 13.85, 5.2, 1.2, Math.PI);
    addLamp(3.2, 2.4, 0x58a6ff);
    addLamp(-6.5, 8.2, 0x3fb950);
    addLamp(8, -8.5, 0xd29922);
    addCrate(4.2, 4.4, 0.7);
    addCrate(-7.4, -3.2, 0.55);
    addCrate(11.2, 6.4, 0.85);

    addGrapple(-22, -4);
    addGrapple(0, -16);
    addGrapple(20, 2);
    addGrapple(0, 18);
    addGrapple(0.4, 0.2);

    buildGargoyle();
    buildSkyline(winCanvas);

    const mark = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 0.62, 20),
      new THREE.MeshBasicMaterial({ color: 0x58a6ff, side: THREE.DoubleSide })
    );
    mark.rotation.x = -Math.PI / 2;
    mark.position.set(PERCH.x, PERCH.y + 0.05, PERCH.z);
    scene.add(mark);
  }

  function windowCanvas() {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 256;
    const g = c.getContext("2d");
    g.fillStyle = "#10151b";
    g.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const n = Math.random();
        let color = "#070b10";
        if (n > 0.78) color = "#1f6feb";
        else if (n > 0.66) color = "#238636";
        else if (n > 0.56) color = "#9a6700";
        g.fillStyle = color;
        g.fillRect(x * 64 + 16, y * 64 + 12, 26, 34);
      }
    }
    return c;
  }

  function addSign(text, color, x, y, z, w, h, rotY) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 128;
    const g = c.getContext("2d");
    g.fillStyle = "#0d1117";
    g.fillRect(0, 0, 512, 128);
    g.strokeStyle = color;
    g.lineWidth = 10;
    g.strokeRect(8, 8, 496, 112);
    g.fillStyle = color;
    g.font = "700 64px ui-monospace, monospace";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, 256, 68);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const nx = Math.sin(rotY);
    const nz = Math.cos(rotY);
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x0d1117, roughness: 0.62, metalness: 0.28 })
    );
    board.position.set(x, y, z);
    board.rotation.y = rotY;
    board.castShadow = true;
    board.receiveShadow = true;
    scene.add(board);
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 0.96, h * 0.9),
      new THREE.MeshStandardMaterial({
        map: tex,
        emissive: new THREE.Color(color),
        emissiveMap: tex,
        emissiveIntensity: 2.1,
        roughness: 0.35,
        metalness: 0.05,
      })
    );
    mesh.position.set(x + nx * 0.07, y, z + nz * 0.07);
    mesh.rotation.y = rotY;
    scene.add(mesh);
    const light = new THREE.PointLight(color, 2.4, 18, 2);
    light.position.set(x + nx * 0.35, y, z + nz * 0.35);
    light.userData.base = 2.4;
    scene.add(light);
    signLights.push(light);
  }

  function addLamp(x, z, color) {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.1, 3.4, 8),
      new THREE.MeshStandardMaterial({ color: 0x2a3340, roughness: 0.6, metalness: 0.4 })
    );
    pole.position.set(x, 1.7, z);
    pole.castShadow = true;
    pole.receiveShadow = true;
    scene.add(pole);
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 12, 10),
      new THREE.MeshStandardMaterial({
        color: 0x111111,
        emissive: color,
        emissiveIntensity: 2.8,
        roughness: 0.25,
      })
    );
    bulb.position.set(x, 3.45, z);
    scene.add(bulb);
    const spot = new THREE.SpotLight(color, 7.5, 18, 0.62, 0.5, 1);
    spot.position.set(x, 3.35, z);
    spot.target.position.set(x, 0.05, z);
    spot.castShadow = false;
    spot.shadow.mapSize.set(512, 512);
    spot.shadow.bias = -0.00045;
    spot.shadow.normalBias = 0.045;
    spot.shadow.camera.near = 0.4;
    spot.shadow.camera.far = 16;
    spot.userData.base = 7.5;
    scene.add(spot);
    scene.add(spot.target);
    streetSpots.push(spot);
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 2.15, 3.15, 14, 1, true),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.07,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      })
    );
    shaft.position.set(x, 1.75, z);
    scene.add(shaft);
    lampCones.push(shaft);
  }

  function addCrate(x, z, size) {
    const y = groundHeight(x, z);
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(size, size * 0.72, size * 0.86),
      new THREE.MeshStandardMaterial({ color: 0x3a2a22, roughness: 0.78, metalness: 0.08 })
    );
    mesh.position.set(x, y + size * 0.36, z);
    mesh.rotation.y = 0.4;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  }

  function addGrapple(x, z) {
    const y = groundHeight(x, z);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.05, 10, 20),
      new THREE.MeshStandardMaterial({
        color: 0x071018,
        emissive: 0x58a6ff,
        emissiveIntensity: 2.5,
        roughness: 0.28,
        metalness: 0.4,
      })
    );
    ring.position.set(x, y + 2.4, z);
    scene.add(ring);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 2.4, 6),
      new THREE.MeshStandardMaterial({ color: 0x30363d, metalness: 0.6, roughness: 0.4 })
    );
    pole.position.set(x, y + 1.2, z);
    pole.castShadow = true;
    pole.receiveShadow = true;
    scene.add(pole);
    grapples.push(ring);
  }

  function buildGargoyle() {
    const stone = new THREE.MeshStandardMaterial({ color: 0x242b33, roughness: 0.78, metalness: 0.12 });
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 1.3), stone);
    body.position.y = 0.45;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.32, 0.42), stone);
    head.position.set(0, 0.72, 0.62);
    const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.55), stone);
    wingL.position.set(-0.7, 0.7, -0.05);
    wingL.rotation.z = 0.5;
    const wingR = wingL.clone();
    wingR.position.x = 0.7;
    wingR.rotation.z = -0.5;
    g.add(body, head, wingL, wingR);
    g.position.set(-16.4, 12, 3.1);
    g.rotation.y = 0.5;
    g.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    scene.add(g);
  }

  function buildSkyline(winCanvas) {
    const specs = [
      [-48, -20, 10, 22, 12],
      [-42, 18, 8, 16, 10],
      [40, -24, 12, 26, 14],
      [46, 10, 9, 18, 11],
      [8, -48, 16, 14, 18],
      [-18, 46, 14, 12, 16],
    ];
    specs.forEach((s) => {
      const tex = new THREE.CanvasTexture(winCanvas);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(2, 3);
      tex.colorSpace = THREE.SRGBColorSpace;
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(s[2], s[3], s[4]),
        new THREE.MeshStandardMaterial({
          color: 0x121820,
          emissive: 0xffffff,
          emissiveMap: tex,
          emissiveIntensity: 0.4,
          roughness: 0.9,
        })
      );
      mesh.position.set(s[0], s[3] / 2, s[1]);
      scene.add(mesh);
    });
  }

  function captureBlock() {
    try {
      const rt = new THREE.WebGLCubeRenderTarget(128, {
        generateMipmaps: true,
        minFilter: THREE.LinearMipmapLinearFilter,
      });
      const cam = new THREE.CubeCamera(0.4, 180, rt);
      cam.position.set(1.6, 1.7, 0.8);
      const shadows = renderer.shadowMap.enabled;
      renderer.shadowMap.enabled = false;
      cam.update(renderer, scene);
      renderer.shadowMap.enabled = shadows;
      scene.environment = rt.texture;
      scene.traverse((obj) => {
        if (obj.isMesh && obj.material && obj.material.envMap) {
          obj.material.envMap = rt.texture;
          obj.material.needsUpdate = true;
        }
      });
    } catch (err) { /* the painted cube map still lights the street */ }
  }

  function makeRippleNormal() {
    const size = 128;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const g = c.getContext("2d");
    const img = g.createImageData(size, size);
    const h = new Float32Array(size * size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        h[y * size + x] = Math.sin(x * 0.42) * Math.cos(y * 0.36) * 0.55
          + Math.sin(x * 0.13 + y * 0.19) * 0.45;
      }
    }
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const hl = h[y * size + ((x + size - 1) % size)];
        const hr = h[y * size + ((x + 1) % size)];
        const hd = h[((y + size - 1) % size) * size + x];
        const hu = h[((y + 1) % size) * size + x];
        const dx = (hl - hr) * 2.4;
        const dy = (hd - hu) * 2.4;
        const len = Math.hypot(dx, dy, 1);
        const o = (y * size + x) * 4;
        img.data[o] = (dx / len * 0.5 + 0.5) * 255;
        img.data[o + 1] = (dy / len * 0.5 + 0.5) * 255;
        img.data[o + 2] = (1 / len * 0.5 + 0.5) * 255;
        img.data[o + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(22, 22);
    return tex;
  }

  function makeWetRoughness() {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 256;
    const g = c.getContext("2d");
    g.fillStyle = "#6e6e6e";
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 28; i++) {
      g.fillStyle = i % 3 === 0 ? "#2a2a2a" : "#9a9a9a";
      g.beginPath();
      g.ellipse(Math.random() * 256, Math.random() * 256, 12 + Math.random() * 36, 8 + Math.random() * 22, Math.random() * 3, 0, Math.PI * 2);
      g.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 6);
    return tex;
  }

  function makeEnv() {
    function face(top, bot, glow) {
      const c = document.createElement("canvas");
      c.width = 64;
      c.height = 64;
      const g = c.getContext("2d");
      const grd = g.createLinearGradient(0, 0, 0, 64);
      grd.addColorStop(0, top);
      grd.addColorStop(1, bot);
      g.fillStyle = grd;
      g.fillRect(0, 0, 64, 64);
      if (glow) {
        g.fillStyle = glow;
        g.fillRect(18, 28, 8, 20);
        g.fillRect(36, 18, 6, 16);
      }
      return c;
    }
    const cube = new THREE.CubeTexture([
      face("#102033", "#070b10", "#1f6feb"),
      face("#102033", "#070b10", "#238636"),
      face("#243246", "#243246", null),
      face("#050608", "#050608", null),
      face("#121c28", "#070b10", "#58a6ff"),
      face("#121c28", "#070b10", "#d29922"),
    ]);
    cube.needsUpdate = true;
    return cube;
  }

  function createStick(palette) {
    const body = new THREE.MeshStandardMaterial({
      color: palette.body,
      roughness: 0.34,
      metalness: 0.28,
      emissive: palette.accent,
      emissiveIntensity: palette.cape ? 0.04 : 0.02,
    });
    addRim(body, palette.accent, palette.cape ? 0.78 : 0.55);
    const accent = new THREE.MeshStandardMaterial({
      color: 0x05070a,
      emissive: palette.accent,
      emissiveIntensity: palette.cape ? 2.4 : 1.7,
      roughness: 0.28,
      metalness: 0.2,
    });
    const group = new THREE.Group();
    const hips = new THREE.Group();
    hips.position.y = 0.56;
    group.add(hips);
    const legL = limb(0.52, 0.078, body);
    legL.position.set(-0.12, 0, 0);
    const legR = limb(0.52, 0.078, body);
    legR.position.set(0.12, 0, 0);
    hips.add(legL, legR);
    const chest = new THREE.Mesh(new THREE.CapsuleGeometry(0.125, 0.32, 4, 8), body);
    chest.position.y = 0.28;
    chest.castShadow = true;
    chest.receiveShadow = true;
    hips.add(chest);
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.07, 0.16), accent);
    band.position.set(0, 0.34, 0.09);
    hips.add(band);
    const shoulders = new THREE.Group();
    shoulders.position.y = 0.52;
    hips.add(shoulders);
    const armL = limb(0.44, 0.064, body);
    armL.position.set(-0.24, 0, 0);
    const armR = limb(0.44, 0.064, body);
    armR.position.set(0.24, 0, 0);
    shoulders.add(armL, armR);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), body);
    head.position.y = 0.24;
    head.castShadow = true;
    head.receiveShadow = true;
    shoulders.add(head);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.055, 0.08), accent);
    visor.position.set(0, 0.24, 0.13);
    shoulders.add(visor);
    const hand = new THREE.Object3D();
    hand.position.y = -0.46;
    armR.add(hand);
    return {
      group, hips, legL, legR, armL, armR, shoulders, accent, hand,
      blend: {
        legL: 0, legR: 0, armL: 0, armR: 0,
        armLz: -0.2, armRz: 0.2,
        hipsX: 0, hipsY: 0, hipsYpos: 0.56,
      },
    };
  }

  function addRim(material, colorHex, strength) {
    const color = new THREE.Color(colorHex);
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uRimColor = { value: color };
      shader.uniforms.uRimStrength = { value: strength };
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          "#include <common>\nuniform vec3 uRimColor;\nuniform float uRimStrength;"
        )
        .replace(
          "#include <opaque_fragment>",
          "float rimGlow = pow(1.0 - saturate(dot(normalize(normal), normalize(vViewPosition))), 2.2);\noutgoingLight += uRimColor * rimGlow * uRimStrength;\n#include <opaque_fragment>"
        );
    };
  }

  function limb(len, radius, material) {
    const pivot = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, len, 3, 6), material);
    mesh.position.y = -len * 0.5;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    pivot.add(mesh);
    return pivot;
  }

  function spawnEnemies() {
    ENEMY_DEFS.forEach((def) => {
      const fig = createStick({ body: 0xd8c2a8, accent: 0xf85149, tails: false });
      fig.group.scale.setScalar(1.16);
      scene.add(fig.group);
      const coneMat = new THREE.MeshBasicMaterial({
        color: 0x238636,
        transparent: true,
        opacity: 0.14,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const cone = new THREE.Mesh(new THREE.ConeGeometry(2.2, 6.2, 7, 1, true), coneMat);
      cone.rotation.x = Math.PI / 2;
      cone.position.set(0, 1.05, 3.05);
      fig.group.add(cone);
      const marker = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.16, 0),
        new THREE.MeshBasicMaterial({ color: 0xf85149 })
      );
      marker.position.y = 2.15;
      marker.visible = false;
      fig.group.add(marker);
      const e = {
        fig,
        cone,
        marker,
        pos: new THREE.Vector3(def.x, groundHeight(def.x, def.z), def.z),
        yaw: 0,
        hp: 3,
        state: "patrol",
        patrol: def.patrol,
        pi: 0,
        attackCd: 1.2,
        telegraphT: 0,
        stun: 0,
        daze: 0,
        dead: false,
        moving: false,
      };
      enemies.push(e);
    });
  }

  function buildRain() {
    if (rain) {
      scene.remove(rain);
      rain.geometry.dispose();
      rain.material.dispose();
    }
    rainCount = quality === "high" ? 3600 : 1200;
    rainPos = new Float32Array(rainCount * 3);
    const positions = new Float32Array(rainCount * 6);
    for (let i = 0; i < rainCount; i++) {
      rainPos[i * 3] = (Math.random() - 0.5) * 40;
      rainPos[i * 3 + 1] = Math.random() * 22;
      rainPos[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    rain = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
      color: 0xd5e4f5,
      transparent: true,
      opacity: quality === "high" ? 0.55 : 0.4,
    }));
    rain.frustumCulled = false;
    scene.add(rain);
  }

  function buildSplashes() {
    const geo = new THREE.RingGeometry(0.06, 0.14, 10);
    for (let i = 0; i < 40; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        color: 0xd7e6f6,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }));
      m.rotation.x = -Math.PI / 2;
      m.visible = false;
      scene.add(m);
      splashPool.push(m);
    }
  }

  function buildSparks() {
    const geo = new THREE.SphereGeometry(0.05, 6, 5);
    for (let i = 0; i < 72; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        color: 0xffe08a,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }));
      m.visible = false;
      scene.add(m);
      sparkPool.push(m);
    }
  }

  function buildRibbons() {
    strikeRibbon = makeRibbon(14, 0xb6dcff);
    glideRibbon = makeRibbon(16, 0x58a6ff);
  }

  function makeRibbon(count, color) {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 6);
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const idx = [];
    for (let i = 0; i < count - 1; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    geo.setIndex(idx);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    mesh.visible = false;
    scene.add(mesh);
    const pts = [];
    for (let i = 0; i < count; i++) pts.push(new THREE.Vector3());
    return { mesh, geo, mat, pts, count, heat: 0, ready: false };
  }

  function buildImpact() {
    impactLight = new THREE.PointLight(0xffe08a, 0, 8, 2);
    scene.add(impactLight);
    impactRing = new THREE.Mesh(
      new THREE.RingGeometry(0.1, 0.22, 20),
      new THREE.MeshBasicMaterial({
        color: 0xffe08a,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    impactRing.rotation.x = -Math.PI / 2;
    impactRing.visible = false;
    scene.add(impactRing);
  }

  function buildBolt() {
    boltGeo = new THREE.BufferGeometry();
    bolt = new THREE.Line(boltGeo, new THREE.LineBasicMaterial({
      color: 0xe7f1ff,
      transparent: true,
      opacity: 0.95,
    }));
    bolt.frustumCulled = false;
    bolt.visible = false;
    scene.add(bolt);
  }

  function buildCape() {
    const rows = 8;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(rows * 6);
    const uvs = new Float32Array(rows * 4);
    const idx = [];
    for (let i = 0; i < rows; i++) {
      uvs[i * 4] = 0;
      uvs[i * 4 + 1] = i / (rows - 1);
      uvs[i * 4 + 2] = 1;
      uvs[i * 4 + 3] = i / (rows - 1);
      if (i < rows - 1) {
        const a = i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(idx);
    const cloth = document.createElement("canvas");
    cloth.width = 64;
    cloth.height = 128;
    const g = cloth.getContext("2d");
    g.fillStyle = "#121820";
    g.fillRect(0, 0, 64, 128);
    g.fillStyle = "#58a6ff";
    g.fillRect(0, 0, 4, 128);
    g.fillRect(60, 0, 4, 128);
    g.fillStyle = "#1f6feb";
    g.fillRect(0, 118, 64, 6);
    const map = new THREE.CanvasTexture(cloth);
    map.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshStandardMaterial({
      color: 0x161b22,
      map,
      roughness: 0.55,
      metalness: 0.22,
      emissive: 0x1f6feb,
      emissiveIntensity: 0.45,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    scene.add(mesh);
    const pts = [];
    for (let i = 0; i < rows; i++) pts.push(new THREE.Vector3(-22, 13 - i * 0.14, 2));
    cape = { mesh, geo, pts };
  }

  function buildComposer() {
    if (!window.RainPost) return;
    try {
      composer = new RainPost.EffectComposer(renderer);
      composer.addPass(new RainPost.RenderPass(scene, camera));
      bloomPass = new RainPost.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.46, 0.4, 0.86);
      composer.addPass(bloomPass);
      composer.addPass(new RainPost.OutputPass());
    } catch (err) {
      composer = null;
      bloomPass = null;
    }
  }

  function toggleQuality() {
    quality = quality === "high" ? "low" : "high";
    applyQuality();
  }

  function applyQuality() {
    const high = quality === "high";
    const pr = Math.min(window.devicePixelRatio || 1, high ? 1.25 : 1);
    renderer.setPixelRatio(pr);
    renderer.toneMappingExposure = high ? 1.05 : 1.16;
    if (moon) {
      const size = high ? 2048 : 1024;
      moon.shadow.mapSize.set(size, size);
      if (moon.shadow.map) {
        moon.shadow.map.dispose();
        moon.shadow.map = null;
      }
    }
    streetSpots.forEach((spot, i) => {
      spot.castShadow = high && i < 2;
      if (!spot.castShadow && spot.shadow.map) {
        spot.shadow.map.dispose();
        spot.shadow.map = null;
      }
    });
    if (bloomPass) bloomPass.enabled = high;
    renderer.shadowMap.needsUpdate = true;
    buildRain();
    if (composer) composer.setPixelRatio(pr);
    resize();
    const label = high ? "Quality: High" : "Quality: Low";
    const hudBtn = document.getElementById("hudQuality");
    const titleBtn = document.getElementById("titleQuality");
    if (hudBtn) hudBtn.textContent = label;
    if (titleBtn) titleBtn.textContent = label;
    try { localStorage.setItem("rainline.quality", quality); } catch (err) { /* ignore */ }
  }

  function burst(x, y, z, color, power) {
    const count = quality === "high" ? 14 : 8;
    const tint = color || 0xffe08a;
    for (let i = 0; i < count; i++) {
      let m = null;
      for (let s = 0; s < sparkPool.length; s++) {
        if (!sparkPool[s].visible) { m = sparkPool[s]; break; }
      }
      if (!m) break;
      m.visible = true;
      m.position.set(x, y, z);
      m.material.color.set(tint);
      m.material.opacity = 1;
      m.userData.vel = new THREE.Vector3((Math.random() - 0.5) * 8, Math.random() * 6 + 1.2, (Math.random() - 0.5) * 8);
      m.userData.life = 0.28 + Math.random() * 0.18;
      liveSparks.push(m);
    }
    flashImpact(x, y, z, tint, power || 0);
  }

  function flashImpact(x, y, z, color, power) {
    impactDur = 0.12 + power * 0.1;
    impactLife = impactDur;
    impactScale = 1.1 + power * 2.2;
    impactLight.color.set(color || 0xffe08a);
    impactLight.position.set(x, y, z);
    impactRing.material.color.set(color || 0xffe08a);
    impactRing.position.set(x, Math.max(0.05, groundHeight(x, z) + 0.06), z);
    impactRing.rotation.z = Math.random() * Math.PI;
    impactRing.visible = true;
    if (power > 0.6) impactFlashUntil = performance.now() + 110;
  }

  function begin() {
    started = true;
    paused = false;
    mode = "play";
    ending = false;
    cam.yaw = Math.PI / 2;
    cam.pitch = -0.16;
    snapCam = true;
    titleEl.classList.add("hidden");
    pauseEl.classList.add("hidden");
    hud.hidden = false;
    gadgetsEl.hidden = false;
    reticle.hidden = false;
    tipEl.hidden = false;
    tipUntil = performance.now() + 14000;
    unlockAudio();
  }

  function resetSimulation() {
    player.pos.set(-22, 12, 2);
    player.vy = 0;
    player.yaw = Math.PI / 2;
    player.hp = MAX_HP;
    player.combo = 0;
    player.comboT = 0;
    player.attackT = 0;
    player.attackCd = 0;
    player.invuln = 0;
    player.onGround = true;
    player.perched = false;
    player.gliding = false;
    disc.active = false;
    disc.cd = 0;
    disc.mesh.visible = false;
    smoke.life = 0;
    smoke.cd = 0;
    smoke.mesh.visible = false;
    leap = null;
    grapple = null;
    enemies.forEach((e, i) => {
      const def = ENEMY_DEFS[i];
      e.pos.set(def.x, groundHeight(def.x, def.z), def.z);
      e.yaw = 0;
      e.hp = 3;
      e.dead = false;
      e.state = "patrol";
      e.pi = 0;
      e.stun = 0;
      e.daze = 0;
      e.attackCd = 1;
      e.telegraphT = 0;
      e.fig.group.visible = true;
      e.fig.group.rotation.x = 0;
      e.cone.visible = true;
      e.marker.visible = false;
    });
  }

  function focusResume() {
    if (!paused || ending) return;
    const resume = document.getElementById("resume");
    if (resume) resume.focus({ preventScroll: true });
  }

  function pauseGame() {
    if (!started || ending || paused) return;
    paused = true;
    for (const k in keys) keys[k] = false;
    pauseEl.classList.remove("hidden");
    if (document.pointerLockElement) document.exitPointerLock();
    setTimeout(focusResume, 0);
  }

  function onKeyDown(e) {
    keys[e.code] = true;
    if (["Space", "KeyJ", "KeyK", "KeyF", "KeyE", "KeyQ", "Escape"].includes(e.code)) e.preventDefault();
    if (e.code === "Escape") {
      if (started && !ending && !paused) pauseGame();
      return;
    }
    if (e.code === "KeyH" && !e.repeat) {
      toggleQuality();
      return;
    }
    if (e.repeat) return;
    if (e.code === "Enter" && !started && !ending) {
      begin();
      canvas.requestPointerLock();
      return;
    }
    if (!started || paused || ending) return;
    if (e.code === "KeyJ") tryAttack();
    if (e.code === "KeyK") tryCounter();
    if (e.code === "KeyF") tryFinisher();
    if (e.code === "KeyQ") tryGrapple();
    if (e.code === "KeyE") tryTakedown();
    if (e.code === "Digit1") tryDisc();
    if (e.code === "Digit2") trySmoke();
    if (e.code === "Space" && player.onGround && mode === "play") {
      player.vy = 7.6;
      player.onGround = false;
    }
  }

  function onMouseDown(e) {
    if (!started || ending) {
      if (!started && !ending) canvas.requestPointerLock();
      return;
    }
    if (paused) return;
    if (document.pointerLockElement !== canvas) {
      dragging = true;
      canvas.requestPointerLock();
    }
    if (e.button === 0) tryAttack();
    if (e.button === 2) tryCounter();
  }

  function onMouseMove(e) {
    if (document.pointerLockElement === canvas) {
      applyLook(e.movementX, e.movementY);
      return;
    }
    if (!dragging) { haveLast = false; return; }
    if (haveLast) applyLook(e.clientX - lastMX, e.clientY - lastMY);
    lastMX = e.clientX;
    lastMY = e.clientY;
    haveLast = true;
  }

  function applyLook(dx, dy) {
    cam.yaw -= dx * 0.0022;
    cam.pitch -= dy * 0.0018;
    cam.pitch = Math.max(-0.65, Math.min(0.75, cam.pitch));
  }

  function onLockChange() {
    const locked = document.pointerLockElement === canvas;
    if (!locked && started && !ending && !paused && (mode === "play" || mode === "grapple" || mode === "leap")) {
      pauseGame();
    } else if (!locked && paused) {
      setTimeout(focusResume, 0);
    }
  }

  function frame(now) {
    try {
      const real = Math.min(0.05, (now - (frame.last || now)) / 1000);
      frame.last = now;
      const scale = now < slowUntil ? slowScale : 1;
      const dt = real * scale;
      document.body.classList.toggle("slow", now < slowUntil);
      if (hurtFlash > 0) hurtFlash -= real;
      document.body.classList.toggle("hurt", hurtFlash > 0);
      document.body.classList.toggle("impact", now < impactFlashUntil);
      if (!paused) update(dt, now);
      else updateAmbience(real);
      updateCamera(real);
      updateHud(now);
      if (quality === "high" && composer) composer.render();
      else renderer.render(scene, camera);
    } catch (err) {
      if (!frame.reported) {
        console.error(err);
        frame.reported = true;
      }
    }
    requestAnimationFrame(frame);
  }

  function update(dt, now) {
    time += dt;
    if (mode === "title") cam.yaw += dt * 0.08;
    if (started && mode === "play") updatePlayer(dt);
    else if (mode === "grapple") updateGrapple(dt);
    else if (mode === "leap") updateLeap(dt);
    if (started) {
      player.attackCd = Math.max(0, player.attackCd - dt);
      player.invuln = Math.max(0, player.invuln - dt);
      if (player.comboT > 0) {
        player.comboT -= dt;
        if (player.comboT <= 0) player.combo = 0;
      }
      if (player.attackT > 0) {
        const prev = player.attackT;
        player.attackT -= dt;
        if (prev > 0.15 && player.attackT <= 0.15) resolveHit();
      }
      disc.cd = Math.max(0, disc.cd - dt);
      smoke.cd = Math.max(0, smoke.cd - dt);
      updateDisc(dt);
      updateSmoke(dt);
    }
    updateEnemies(dt);
    updateAmbience(dt);
    poseHero(dt);
    poseEnemies(dt);
    updateRibbons();
    updateCape(dt);
    if (started && !ending && player.hp <= 0) finish(false);
    if (started && !ending && enemies.every((e) => e.dead)) finish(true);
  }

  function updatePlayer(dt) {
    const forward = new THREE.Vector3(Math.sin(cam.yaw), 0, Math.cos(cam.yaw));
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0));
    const wish = new THREE.Vector3();
    if (keys.KeyW) wish.add(forward);
    if (keys.KeyS) wish.sub(forward);
    if (keys.KeyD) wish.add(right);
    if (keys.KeyA) wish.sub(right);
    const perchDist = flatDist(player.pos, PERCH);
    player.perched = perchDist < 2.4 && Math.abs(player.pos.y - PERCH.y) < 0.9;
    const speed = player.perched ? 2.2 : 6.6;
    player.moving = wish.lengthSq() > 0.001 && player.onGround;
    if (wish.lengthSq() > 0) {
      wish.normalize();
      moveHorizontal(wish.x * speed * dt, wish.z * speed * dt);
      if (player.attackT <= 0) player.yaw = Math.atan2(wish.x, wish.z);
    }
    player.gliding = !!keys.Space && !player.onGround && player.vy < 0;
    player.vy -= 26 * dt * (player.gliding ? 0.18 : 1);
    if (player.gliding && player.vy < -3.1) player.vy = -3.1;
    if (player.gliding) moveHorizontal(Math.sin(cam.yaw) * 6.5 * dt, Math.cos(cam.yaw) * 6.5 * dt);
    const before = player.vy;
    player.pos.y += player.vy * dt;
    const floor = groundHeight(player.pos.x, player.pos.z);
    if (player.pos.y <= floor) {
      if (before < -16) {
        damagePlayer(10);
        shake = Math.max(shake, 0.22);
      }
      player.pos.y = floor;
      player.vy = 0;
      player.onGround = true;
      player.gliding = false;
    } else player.onGround = false;
    player.pos.x = Math.max(-38, Math.min(38, player.pos.x));
    player.pos.z = Math.max(-38, Math.min(38, player.pos.z));
  }

  function moveHorizontal(dx, dz) {
    const y = player.pos.y;
    if (groundHeight(player.pos.x + dx, player.pos.z) <= y + 0.6) player.pos.x += dx;
    if (groundHeight(player.pos.x, player.pos.z + dz) <= y + 0.6) player.pos.z += dz;
  }

  function updateGrapple(dt) {
    grapple.t += dt;
    const s = smooth(Math.min(1, grapple.t / grapple.dur));
    player.pos.lerpVectors(grapple.from, grapple.to, s);
    player.pos.y += Math.sin(s * Math.PI) * 1.35;
    player.yaw = Math.atan2(grapple.to.x - grapple.from.x, grapple.to.z - grapple.from.z);
    player.onGround = false;
    if (s >= 1) {
      player.pos.copy(grapple.to);
      player.vy = 0;
      player.onGround = true;
      player.invuln = 0.3;
      mode = "play";
      grapple = null;
    }
  }

  function updateLeap(dt) {
    leap.t += dt;
    const s = smooth(Math.min(1, leap.t / leap.dur));
    player.pos.lerpVectors(leap.from, leap.to, s);
    player.pos.y = leap.from.y + (leap.to.y - leap.from.y) * s + Math.sin(s * Math.PI) * 2.5;
    player.yaw = Math.atan2(leap.to.x - leap.from.x, leap.to.z - leap.from.z);
    if (s >= 1) {
      player.pos.copy(leap.to);
      player.vy = 0;
      player.onGround = true;
      if (leap.enemy && !leap.enemy.dead) {
        burst(leap.enemy.pos.x, 1, leap.enemy.pos.z, 0x58a6ff, 0.85);
        killEnemy(leap.enemy);
        triggerSlow(560, 0.26);
        shake = Math.max(shake, 0.48);
        blip(180, 0.18, "sine", 0.05, 70);
        noise(0.12, 0.07);
      }
      player.combo = Math.min(8, player.combo + 1);
      player.comboT = 1.4;
      mode = "play";
      leap = null;
    }
  }

  function updateEnemies(dt) {
    let heard = false;
    enemies.forEach((e) => {
      if (e.dead) return;
      if (smoke.life > 0 && flatDist(e.pos, smoke.pos) < smoke.radius) e.daze = Math.max(e.daze, 0.35);
      if (e.stun > 0) {
        e.stun -= dt;
        e.state = "stun";
        e.moving = false;
        if (e.stun <= 0) e.state = "chase";
        return;
      }
      if (e.daze > 0) {
        e.daze -= dt;
        e.state = "daze";
        e.moving = false;
        return;
      }
      const dist = flatDist(e.pos, player.pos);
      const see = started && canSee(e, dist);
      if (see) {
        e.state = e.state === "telegraph" ? "telegraph" : "chase";
        heard = true;
      }
      if (e.state === "telegraph") {
        e.moving = false;
        e.telegraphT -= dt;
        e.yaw = dampAngle(e.yaw, Math.atan2(player.pos.x - e.pos.x, player.pos.z - e.pos.z), dt, 10);
        if (e.telegraphT <= 0) {
          e.state = "chase";
          e.attackCd = 1.65;
          if (started && dist < 2.2 && player.invuln <= 0 && mode === "play") {
            damagePlayer(18);
            player.combo = 0;
            shake = Math.max(shake, 0.32);
            blip(90, 0.16, "sawtooth", 0.05, 40);
          }
        }
        return;
      }
      if (e.state === "chase") {
        e.yaw = dampAngle(e.yaw, Math.atan2(player.pos.x - e.pos.x, player.pos.z - e.pos.z), dt, 8);
        e.attackCd -= dt;
        if (dist > 1.45) {
          e.moving = true;
          stepActor(e, 3.5 * dt);
        } else {
          e.moving = false;
          if (started && e.attackCd <= 0 && dist < 2.05 && mode === "play") {
            e.state = "telegraph";
            e.telegraphT = 0.72;
          }
        }
        if (dist > 18) e.state = "patrol";
        return;
      }
      const wp = e.patrol[e.pi];
      const dx = wp[0] - e.pos.x;
      const dz = wp[1] - e.pos.z;
      if (Math.hypot(dx, dz) < 0.45) e.pi = (e.pi + 1) % e.patrol.length;
      else {
        e.yaw = dampAngle(e.yaw, Math.atan2(dx, dz), dt, 5);
        e.moving = true;
        stepActor(e, 1.55 * dt);
      }
    });
    if (heard) {
      enemies.forEach((e) => {
        if (!e.dead && e.state === "patrol" && flatDist(e.pos, player.pos) < 12) e.state = "chase";
      });
    }
  }

  function canSee(e, dist) {
    if (dist > 7.2 || dist < 0.01) return false;
    if (player.pos.y > e.pos.y + 3.2) return false;
    if (Math.abs(player.pos.y - e.pos.y) > 2.2) return false;
    const dx = player.pos.x - e.pos.x;
    const dz = player.pos.z - e.pos.z;
    const fwdX = Math.sin(e.yaw);
    const fwdZ = Math.cos(e.yaw);
    const dot = (dx / dist) * fwdX + (dz / dist) * fwdZ;
    if (dot < 0.62) return false;
    const origin = new THREE.Vector3(e.pos.x, e.pos.y + 1.2, e.pos.z);
    const target = new THREE.Vector3(player.pos.x, player.pos.y + 1.1, player.pos.z);
    const dir = target.clone().sub(origin);
    const len = dir.length();
    dir.multiplyScalar(1 / len);
    raycaster.set(origin, dir);
    raycaster.far = len;
    const hits = raycaster.intersectObjects(solids, false);
    return hits.length === 0;
  }

  function stepActor(e, step) {
    const nx = e.pos.x + Math.sin(e.yaw) * step;
    const nz = e.pos.z + Math.cos(e.yaw) * step;
    const h = groundHeight(nx, nz);
    if (Math.abs(h - e.pos.y) > 0.75) return;
    e.pos.x = nx;
    e.pos.z = nz;
    e.pos.y = h;
  }

  function updateDisc(dt) {
    if (!disc.active) return;
    disc.life -= dt;
    disc.vel.y -= 3 * dt;
    disc.pos.addScaledVector(disc.vel, dt);
    disc.mesh.position.copy(disc.pos);
    disc.mesh.rotation.x += dt * 14;
    disc.mesh.rotation.y += dt * 10;
    const floor = groundHeight(disc.pos.x, disc.pos.z);
    let hit = disc.life <= 0 || disc.pos.y < floor + 0.2;
    if (!hit) {
      enemies.forEach((e) => {
        if (hit || e.dead) return;
        const d = disc.pos.distanceTo(new THREE.Vector3(e.pos.x, e.pos.y + 1.1, e.pos.z));
        if (d < 0.85) {
          e.stun = 2.1;
          e.state = "stun";
          e.telegraphT = 0;
          burst(e.pos.x, e.pos.y + 1.2, e.pos.z, 0x58a6ff);
          hit = true;
        }
      });
    }
    if (hit) {
      disc.active = false;
      disc.mesh.visible = false;
    }
  }

  function updateSmoke(dt) {
    if (smoke.life <= 0) {
      smoke.mesh.visible = false;
      return;
    }
    smoke.life -= dt;
    smoke.radius = Math.min(4.2, smoke.radius + dt * 6);
    smoke.mesh.visible = true;
    smoke.mesh.position.copy(smoke.pos);
    smoke.mesh.position.y += 0.8;
    smoke.mesh.scale.setScalar(smoke.radius);
    smoke.mesh.material.opacity = Math.min(0.28, smoke.life * 0.12);
  }

  function updateAmbience(dt) {
    const cx = camera.position.x;
    const cz = camera.position.z;
    const arr = rain.geometry.attributes.position.array;
    const splash = quality === "high";
    for (let i = 0; i < rainCount; i++) {
      let x = rainPos[i * 3] + 2.4 * dt;
      let y = rainPos[i * 3 + 1] - 24 * dt;
      let z = rainPos[i * 3 + 2] + 0.4 * dt;
      if (y < 14) {
        const gy = groundHeight(x, z);
        if (y <= gy + 0.05) {
          if (splash && Math.random() < 0.22) {
            const dx = x - cx;
            const dz = z - cz;
            if (dx * dx + dz * dz < 160) spawnSplash(x, gy, z);
          }
          x = cx + (Math.random() - 0.5) * 38;
          y = 16 + Math.random() * 10;
          z = cz + (Math.random() - 0.5) * 38;
        }
      }
      rainPos[i * 3] = x;
      rainPos[i * 3 + 1] = y;
      rainPos[i * 3 + 2] = z;
      const o = i * 6;
      arr[o] = x;
      arr[o + 1] = y;
      arr[o + 2] = z;
      arr[o + 3] = x - 0.14;
      arr[o + 4] = y + 0.62;
      arr[o + 5] = z - 0.02;
    }
    rain.geometry.attributes.position.needsUpdate = true;
    for (let i = liveSplashes.length - 1; i >= 0; i--) {
      const m = liveSplashes[i];
      m.userData.life -= dt;
      if (m.userData.life <= 0) {
        m.visible = false;
        liveSplashes.splice(i, 1);
        continue;
      }
      const k = m.userData.life / m.userData.dur;
      m.scale.setScalar(0.4 + (1 - k) * 2.4);
      m.material.opacity = k * 0.65;
    }
    for (let i = liveSparks.length - 1; i >= 0; i--) {
      const m = liveSparks[i];
      m.userData.life -= dt;
      if (m.userData.life <= 0) {
        m.visible = false;
        liveSparks.splice(i, 1);
        continue;
      }
      m.position.addScaledVector(m.userData.vel, dt);
      m.userData.vel.y -= 14 * dt;
      m.material.opacity = Math.max(0, m.userData.life * 3);
      const s = 0.7 + m.userData.life * 2.2;
      m.scale.setScalar(s);
    }
    if (impactLife > 0) {
      impactLife -= dt;
      const k = Math.max(0, impactLife / impactDur);
      impactLight.intensity = (quality === "high" ? 9 : 3.2) * k;
      impactRing.scale.setScalar(impactScale * (1.35 - k));
      impactRing.material.opacity = k * 0.9;
      if (impactLife <= 0) {
        impactLight.intensity = 0;
        impactRing.visible = false;
      }
    }
    signLights.forEach((light, i) => {
      const flicker = 0.86 + Math.sin(time * (2.4 + i) + i) * 0.1;
      light.intensity = light.userData.base * (Math.random() < 0.012 ? 0.45 : flicker);
    });
    lampCones.forEach((cone, i) => {
      cone.material.opacity = 0.045 + Math.sin(time * 2.2 + i) * 0.02;
    });
    updateStorm(dt);
    updateHeroLight();
    if (rippleMap) {
      rippleMap.offset.x += dt * 0.018;
      rippleMap.offset.y += dt * 0.012;
    }
    shake *= Math.exp(-5.5 * Math.max(dt, 0.008));
  }

  function spawnSplash(x, y, z) {
    let m = null;
    for (let i = 0; i < splashPool.length; i++) {
      if (!splashPool[i].visible) { m = splashPool[i]; break; }
    }
    if (!m) return;
    m.visible = true;
    m.position.set(x, y + 0.04, z);
    m.scale.setScalar(0.35);
    m.userData.life = 0.28;
    m.userData.dur = 0.28;
    m.material.opacity = 0.65;
    liveSplashes.push(m);
  }

  function updateStorm(dt) {
    nextLightning -= dt;
    if (nextLightning <= 0) {
      strikeLightning();
      nextLightning = 7 + Math.random() * 9;
    }
    if (lightningT > 0) {
      lightningT *= Math.exp(-7.5 * Math.max(dt, 0.001));
      if (lightningT < 0.03) lightningT = 0;
    }
    if (moon) moon.intensity = MOON_BASE * (1 + lightningT * 0.45);
    if (stormLight) stormLight.intensity = lightningT * lightningT * 7.2;
    if (bolt) {
      bolt.visible = lightningT > 0.2;
      bolt.material.opacity = Math.min(1, lightningT * 1.4);
    }
    const flash = lightningT * 0.72;
    scene.fog.color.copy(fogBase).lerp(fogFlash, flash);
    scene.background.copy(bgBase).lerp(fogFlash, flash * 0.85);
    if (stormEl) stormEl.style.opacity = String(Math.min(0.62, lightningT * 0.8));
  }

  function strikeLightning() {
    lightningT = 1;
    const end = new THREE.Vector3((Math.random() - 0.5) * 30, 6 + Math.random() * 8, (Math.random() - 0.5) * 30);
    const start = end.clone().add(new THREE.Vector3((Math.random() - 0.5) * 10, 26 + Math.random() * 8, (Math.random() - 0.5) * 10));
    const pts = [];
    const segs = 8;
    for (let i = 0; i <= segs; i++) {
      const p = new THREE.Vector3().lerpVectors(start, end, i / segs);
      if (i > 0 && i < segs) {
        p.x += (Math.random() - 0.5) * 2.8;
        p.z += (Math.random() - 0.5) * 2.8;
      }
      pts.push(p);
    }
    boltGeo.setFromPoints(pts);
    stormLight.position.copy(start);
    stormLight.target.position.copy(end);
    shake = Math.max(shake, 0.14);
  }

  function updateHeroLight() {
    const bx = player.pos.x - Math.sin(player.yaw) * 2.1;
    const bz = player.pos.z - Math.cos(player.yaw) * 2.1;
    rimLight.position.set(bx, player.pos.y + 2.15, bz);
    rimLight.target.position.set(player.pos.x, player.pos.y + 1.2, player.pos.z);
    const half = 16;
    moon.position.set(player.pos.x + 14, 30, player.pos.z + 9);
    moon.target.position.set(player.pos.x, player.pos.y + 1, player.pos.z);
    const cam = moon.shadow.camera;
    cam.left = -half;
    cam.right = half;
    cam.top = half;
    cam.bottom = -half;
    cam.updateProjectionMatrix();
  }

  function poseHero(dt) {
    hero.group.position.copy(player.pos);
    hero.group.rotation.x = 0;
    hero.group.rotation.y = player.yaw;
    poseFigure(hero, {
      moving: player.moving,
      attackT: player.attackT,
      perched: player.perched && mode === "play",
      gliding: player.gliding || mode === "grapple" || mode === "leap",
      dead: false,
    }, dt);
  }

  function poseEnemies(dt) {
    enemies.forEach((e) => {
      e.fig.group.position.copy(e.pos);
      e.fig.group.rotation.y = e.yaw;
      if (e.dead) {
        e.fig.group.rotation.x = -1.15;
        e.cone.visible = false;
        e.marker.visible = false;
        return;
      }
      e.fig.group.rotation.x = 0;
      const telegraph = e.state === "telegraph";
      e.marker.visible = telegraph;
      if (telegraph) e.marker.scale.setScalar(1 + Math.sin(time * 18) * 0.25);
      e.cone.visible = e.state === "patrol" || e.state === "chase";
      e.cone.material.color.set(e.state === "chase" ? 0xf85149 : 0x238636);
      e.fig.accent.emissiveIntensity = telegraph ? 3.1 : 1.7;
      poseFigure(e.fig, { moving: e.moving, attackT: 0, perched: false, gliding: false, dead: false }, dt);
    });
  }

  function poseFigure(fig, state, dt) {
    const phase = time * (state.moving ? 9 : 2.2);
    const amp = state.moving ? 0.62 : 0.045;
    let legL = Math.sin(phase) * amp;
    let legR = Math.sin(phase + Math.PI) * amp;
    let armL = Math.sin(phase + Math.PI) * amp * 0.75;
    let armR = Math.sin(phase) * amp * 0.75;
    let armLz = -0.22;
    let armRz = 0.22;
    let hipsX = 0;
    let hipsY = 0;
    let hipsYpos = 0.56 + Math.sin(phase * 2) * (state.moving ? 0.04 : 0.012);
    let speed = state.moving ? 12 : 7;
    if (state.attackT > 0) {
      const k = 1 - Math.max(0, state.attackT) / 0.32;
      const swing = Math.sin(Math.min(1, k) * Math.PI);
      armR = -1.45 + swing * 2.55;
      armRz = -0.4 * swing;
      hipsY = swing * 0.5;
      speed = 20;
    }
    if (state.perched) {
      hipsX = 0.82;
      legL = -1.1;
      legR = -0.42;
      armL = -0.48;
      armR = -0.22;
      speed = 9;
    }
    if (state.gliding) {
      armL = -0.95;
      armR = -0.95;
      armLz = -0.7;
      armRz = 0.7;
      hipsX = 0.38;
      legL = 0.25;
      legR = -0.15;
      speed = 8;
    }
    const b = fig.blend;
    const k = 1 - Math.exp(-speed * Math.max(dt || 0.016, 0.001));
    b.legL += (legL - b.legL) * k;
    b.legR += (legR - b.legR) * k;
    b.armL += (armL - b.armL) * k;
    b.armR += (armR - b.armR) * k;
    b.armLz += (armLz - b.armLz) * k;
    b.armRz += (armRz - b.armRz) * k;
    b.hipsX += (hipsX - b.hipsX) * k;
    b.hipsY += (hipsY - b.hipsY) * k;
    b.hipsYpos += (hipsYpos - b.hipsYpos) * k;
    fig.legL.rotation.x = b.legL;
    fig.legR.rotation.x = b.legR;
    fig.armL.rotation.x = b.armL;
    fig.armR.rotation.x = b.armR;
    fig.armL.rotation.z = b.armLz;
    fig.armR.rotation.z = b.armRz;
    fig.hips.rotation.x = b.hipsX;
    fig.hips.rotation.y = b.hipsY;
    fig.hips.position.y = b.hipsYpos;
  }

  function updateRibbons() {
    hero.hand.getWorldPosition(handPos);
    pushRibbon(strikeRibbon, handPos, player.attackT > 0, 0.09);
    glidePoint.set(0, 0.95, -0.2);
    hero.group.localToWorld(glidePoint);
    const gliding = player.gliding || mode === "grapple" || mode === "leap";
    pushRibbon(glideRibbon, glidePoint, gliding, 0.16);
  }

  function pushRibbon(ribbon, point, active, width) {
    const pts = ribbon.pts;
    if (!ribbon.ready) {
      pts.forEach((p) => p.copy(point));
      ribbon.ready = true;
    }
    if (active) {
      for (let i = pts.length - 1; i > 0; i--) pts[i].copy(pts[i - 1]);
      pts[0].copy(point);
      ribbon.heat = 1;
    } else {
      ribbon.heat = Math.max(0, ribbon.heat - 0.07);
    }
    const arr = ribbon.geo.attributes.position.array;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const bpt = pts[Math.min(pts.length - 1, i + 1)];
      _dir.copy(bpt).sub(a);
      if (_dir.lengthSq() < 1e-6) _dir.set(0, 0, 1);
      _dir.normalize();
      side.crossVectors(_dir, _up);
      if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
      side.normalize().multiplyScalar(width * (1 - i / pts.length));
      const o = i * 6;
      arr[o] = a.x + side.x;
      arr[o + 1] = a.y;
      arr[o + 2] = a.z + side.z;
      arr[o + 3] = a.x - side.x;
      arr[o + 4] = a.y;
      arr[o + 5] = a.z - side.z;
    }
    ribbon.geo.attributes.position.needsUpdate = true;
    ribbon.mat.opacity = ribbon.heat * 0.85;
    ribbon.mesh.visible = ribbon.heat > 0.05;
  }

  function updateCape(dt) {
    if (!cape) return;
    const step = Math.max(dt, 0.001);
    heroVel.copy(player.pos).sub(prevPlayer).multiplyScalar(1 / step);
    prevPlayer.copy(player.pos);
    pin.set(0, 1.02, -0.16);
    hero.group.localToWorld(pin);
    const yaw = player.yaw;
    const backX = -Math.sin(yaw);
    const backZ = -Math.cos(yaw);
    const rightX = Math.cos(yaw);
    const rightZ = -Math.sin(yaw);
    const speed = Math.min(1.4, heroVel.length() * 0.08);
    const streaming = player.gliding || mode === "grapple" || mode === "leap";
    const trail = streaming ? 0.9 : 0.2 + speed;
    const pts = cape.pts;
    pts[0].copy(pin);
    for (let i = 1; i < pts.length; i++) {
      const parent = pts[i - 1];
      const wobble = Math.sin(time * 5.2 + i * 0.8) * (0.03 + (streaming ? 0.05 : 0));
      const reach = 0.08 + trail * (i / pts.length);
      _v1.copy(parent);
      _v1.x += backX * reach + rightX * wobble;
      _v1.y -= 0.135;
      _v1.z += backZ * reach + rightZ * wobble;
      const k = 1 - Math.exp(-(streaming ? 5.5 : 9) * step);
      pts[i].lerp(_v1, k);
      _v1.copy(pts[i]).sub(parent);
      const len = Math.max(0.001, _v1.length());
      pts[i].copy(parent).addScaledVector(_v1, 0.145 / len);
    }
    const arr = cape.geo.attributes.position.array;
    for (let i = 0; i < pts.length; i++) {
      const t = i / (pts.length - 1);
      const w = 0.5 * (1 - t * 0.35);
      const p = pts[i];
      const o = i * 6;
      arr[o] = p.x - rightX * w;
      arr[o + 1] = p.y;
      arr[o + 2] = p.z - rightZ * w;
      arr[o + 3] = p.x + rightX * w;
      arr[o + 4] = p.y + Math.sin(time * 6 + i) * 0.012;
      arr[o + 5] = p.z + rightZ * w;
    }
    cape.geo.attributes.position.needsUpdate = true;
    cape.geo.computeVertexNormals();
  }

  function updateCamera(real) {
    const look = new THREE.Vector3(
      Math.sin(cam.yaw) * Math.cos(cam.pitch),
      Math.sin(cam.pitch),
      Math.cos(cam.yaw) * Math.cos(cam.pitch)
    );
    const eye = player.pos.clone();
    eye.y += 1.45;
    desiredCam.copy(eye).addScaledVector(look, -cam.dist);
    desiredCam.y += 0.9;
    back.copy(desiredCam).sub(eye);
    const dist = Math.max(0.001, back.length());
    back.multiplyScalar(1 / dist);
    raycaster.set(eye, back);
    raycaster.far = dist;
    const hits = raycaster.intersectObjects(solids, false);
    if (hits.length && hits[0].distance < dist - 0.35) {
      desiredCam.copy(eye).addScaledVector(back, Math.max(1.35, hits[0].distance - 0.3));
    }
    if (desiredCam.y < 0.4) desiredCam.y = 0.4;
    const k = 1 - Math.exp(-8 * real);
    if (snapCam) {
      camera.position.copy(desiredCam);
      snapCam = false;
    } else {
      camera.position.lerp(desiredCam, mode === "title" ? 0.08 : k);
    }
    if (shake > 0.01) {
      camera.position.x += (Math.random() - 0.5) * shake;
      camera.position.y += (Math.random() - 0.5) * shake;
    }
    camTarget.copy(eye).addScaledVector(look, 9);
    camera.lookAt(camTarget);
    if (shake > 0.01) camera.rotateZ((Math.random() - 0.5) * shake * 0.45);
    const fov = 58 + Math.min(6, shake * 10);
    if (Math.abs(camera.fov - fov) > 0.05) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }

  function updateHud(now) {
    const living = enemies.filter((e) => !e.dead).length;
    hpBar.style.transform = "scaleX(" + Math.max(0, player.hp / MAX_HP) + ")";
    hpBar.style.background = player.hp < 40 ? "#f85149" : "#238636";
    comboBar.style.transform = "scaleX(" + Math.min(1, player.combo / COMBO_NEED) + ")";
    comboN.textContent = "x" + player.combo;
    remainEl.textContent = living + " left";
    const alert = enemies.some((e) => !e.dead && (e.state === "chase" || e.state === "telegraph"));
    alertEl.textContent = alert ? "alert" : "hidden";
    alertEl.className = alert ? "on" : "off";
    cdDisc.style.transform = "scaleX(" + (1 - disc.cd / DISC_CD) + ")";
    cdSmoke.style.transform = "scaleX(" + (1 - smoke.cd / SMOKE_CD) + ")";
    targetGrapple = findGrapple();
    grapples.forEach((g) => {
      const hot = g === targetGrapple;
      g.scale.setScalar(hot ? 1.35 : 1);
      g.material.emissive.set(hot ? 0xffffff : 0x58a6ff);
      g.material.emissiveIntensity = hot ? 3.6 : 2.5;
    });
    reticle.classList.toggle("lock", !!targetGrapple);
    if (tipUntil && now > tipUntil) tipEl.hidden = true;
    promptEl.textContent = currentPrompt();
  }

  function currentPrompt() {
    if (!started || paused || ending || mode === "title") return "";
    const threat = enemies.find((e) => !e.dead && e.state === "telegraph" && flatDist(e.pos, player.pos) < 3);
    if (threat && mode === "play") return "K  ·  Counter";
    if (mode === "play" && player.combo >= COMBO_NEED && nearestLiving(2.7)) return "F  ·  Finisher";
    if (mode === "play" && takedownTarget()) return "E  ·  Drop takedown";
    if (mode === "grapple") return "Grappling";
    if (mode === "leap") return "Takedown";
    if (mode === "play" && targetGrapple) return "Q  ·  Grapple";
    if (player.gliding) return "Gliding";
    if (!player.onGround) return "Hold Space  ·  Glide";
    return "";
  }

  function findGrapple() {
    camera.getWorldDirection(lookDir);
    let best = null;
    let bestAng = 0.34;
    grapples.forEach((g) => {
      const stand = Math.hypot(player.pos.x - g.position.x, player.pos.z - g.position.z);
      const landY = groundHeight(g.position.x, g.position.z);
      if (stand < 1.25 && Math.abs(player.pos.y - landY) < 1) return;
      const to = g.position.clone().sub(camera.position);
      const dist = to.length();
      if (dist > 30 || dist < 1.4) return;
      const ang = lookDir.angleTo(to.normalize());
      if (ang < bestAng) {
        bestAng = ang;
        best = g;
      }
    });
    return best;
  }

  function tryAttack() {
    if (mode !== "play" || player.attackCd > 0) return;
    player.attackCd = 0.36;
    player.attackT = 0.32;
    player.yaw = cam.yaw;
    moveHorizontal(Math.sin(player.yaw) * 0.28, Math.cos(player.yaw) * 0.28);
    blip(240, 0.07, "sawtooth", 0.03, 90);
  }

  function resolveHit() {
    const facingX = Math.sin(player.yaw);
    const facingZ = Math.cos(player.yaw);
    let best = null;
    let bestScore = -999;
    enemies.forEach((e) => {
      if (e.dead) return;
      const dx = e.pos.x - player.pos.x;
      const dz = e.pos.z - player.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 3.15 || dist < 0.001) return;
      if (Math.abs(e.pos.y - player.pos.y) > 1.4) return;
      const dot = (dx / dist) * facingX + (dz / dist) * facingZ;
      if (dot < 0.2 && dist > 2.15) return;
      const score = dot * 2 - dist * 0.35;
      if (score > bestScore) { best = e; bestScore = score; }
    });
    if (!best) return;
    player.yaw = Math.atan2(best.pos.x - player.pos.x, best.pos.z - player.pos.z);
    best.hp -= 1;
    best.stun = best.state === "telegraph" ? 0.95 : 0.42;
    best.telegraphT = 0;
    player.combo = Math.min(8, player.combo + 1);
    player.comboT = 1.35;
    player.attackCd = 0.2;
    const killing = best.hp <= 0;
    burst(best.pos.x, best.pos.y + 1.15, best.pos.z, 0xffe08a, killing ? 0.9 : 0.2);
    shake = Math.max(shake, killing ? 0.2 : 0.16);
    noise(0.06, 0.05);
    if (killing) {
      killEnemy(best);
      triggerSlow(520, 0.28);
      shake = Math.max(shake, 0.5);
    }
  }

  function tryCounter() {
    if (mode !== "play") return;
    const e = enemies.find((en) => !en.dead && en.state === "telegraph" && flatDist(en.pos, player.pos) < 2.9 && Math.abs(en.pos.y - player.pos.y) < 1.4);
    if (!e) return;
    e.stun = 1.55;
    e.state = "stun";
    e.telegraphT = 0;
    player.combo = Math.min(8, player.combo + 2);
    player.comboT = 1.6;
    player.invuln = 0.35;
    player.yaw = Math.atan2(e.pos.x - player.pos.x, e.pos.z - player.pos.z);
    burst(e.pos.x, e.pos.y + 1.4, e.pos.z, 0x58a6ff, 0.4);
    shake = Math.max(shake, 0.28);
    triggerSlow(200, 0.38);
    blip(560, 0.1, "square", 0.04, 180);
  }

  function tryFinisher() {
    if (mode !== "play" || player.combo < COMBO_NEED) return;
    const e = nearestLiving(2.7);
    if (!e) return;
    player.pos.x = e.pos.x - Math.sin(player.yaw) * 0.7;
    player.pos.z = e.pos.z - Math.cos(player.yaw) * 0.7;
    burst(e.pos.x, e.pos.y + 1.2, e.pos.z, 0xffffff, 1);
    killEnemy(e);
    player.combo = 0;
    player.comboT = 0;
    player.invuln = 0.55;
    triggerSlow(900, 0.22);
    shake = Math.max(shake, 0.72);
    blip(140, 0.22, "sawtooth", 0.05, 40);
  }

  function nearestLiving(range) {
    let best = null;
    let bestD = range;
    enemies.forEach((e) => {
      if (e.dead) return;
      if (Math.abs(e.pos.y - player.pos.y) > 1.5) return;
      const d = flatDist(e.pos, player.pos);
      if (d < bestD) { best = e; bestD = d; }
    });
    return best;
  }

  function takedownTarget() {
    if (flatDist(player.pos, PERCH) > 2.4) return null;
    if (Math.abs(player.pos.y - PERCH.y) > 0.9) return null;
    let best = null;
    let bestD = 8.2;
    enemies.forEach((e) => {
      if (e.dead || e.pos.y > PERCH.y - 3) return;
      const d = Math.hypot(e.pos.x - PERCH.x, e.pos.z - PERCH.z);
      if (d < bestD) { best = e; bestD = d; }
    });
    return best;
  }

  function tryTakedown() {
    const e = takedownTarget();
    if (!e || mode !== "play") return;
    e.stun = 1.2;
    e.state = "stun";
    mode = "leap";
    leap = {
      from: player.pos.clone(),
      to: new THREE.Vector3(e.pos.x, e.pos.y, e.pos.z),
      t: 0,
      dur: 0.52,
      enemy: e,
    };
    tipEl.hidden = true;
  }

  function tryGrapple() {
    if (mode !== "play" || !targetGrapple) return;
    const land = new THREE.Vector3(
      targetGrapple.position.x,
      groundHeight(targetGrapple.position.x, targetGrapple.position.z),
      targetGrapple.position.z
    );
    mode = "grapple";
    grapple = { from: player.pos.clone(), to: land, t: 0, dur: 0.46 };
    player.invuln = 0.46;
    blip(200, 0.18, "sine", 0.04, 520);
    tipEl.hidden = true;
  }

  function tryDisc() {
    if (mode !== "play" || disc.cd > 0 || disc.active) return;
    disc.cd = DISC_CD;
    disc.active = true;
    disc.life = 0.95;
    const dir = new THREE.Vector3(Math.sin(cam.yaw), 0.05, Math.cos(cam.yaw)).normalize();
    disc.pos.copy(player.pos).add(new THREE.Vector3(0, 1.3, 0)).addScaledVector(dir, 0.5);
    disc.vel.copy(dir).multiplyScalar(22);
    disc.mesh.visible = true;
    disc.mesh.position.copy(disc.pos);
    blip(660, 0.08, "square", 0.03, 220);
  }

  function trySmoke() {
    if (mode !== "play" || smoke.cd > 0) return;
    smoke.cd = SMOKE_CD;
    smoke.life = 3.4;
    smoke.radius = 0.5;
    smoke.pos.copy(player.pos);
    noise(0.15, 0.04);
  }

  function killEnemy(e) {
    if (e.dead) return;
    e.dead = true;
    e.hp = 0;
    e.state = "dead";
    e.cone.visible = false;
    e.marker.visible = false;
  }

  function damagePlayer(amount) {
    if (!started || ending || player.invuln > 0 || mode !== "play") return;
    player.hp -= amount;
    player.invuln = 0.45;
    hurtFlash = 0.18;
  }

  function finish(win) {
    ending = true;
    paused = false;
    mode = win ? "won" : "dead";
    if (document.pointerLockElement) document.exitPointerLock();
    endEl.classList.remove("hidden");
    document.getElementById("endEyebrow").textContent = win ? "cleared" : "down";
    document.getElementById("endTitle").textContent = win ? "Block clear" : "The rain wins";
    document.getElementById("endText").textContent = win
      ? "The alley crew is down. The block belongs to the rain again."
      : "You hit the pavement. The crew still owns the block.";
    if (win) {
      blip(440, 0.12, "sine", 0.05, 660);
      setTimeout(() => blip(660, 0.18, "sine", 0.05, 880), 140);
    }
  }

  function triggerSlow(ms, scale) {
    slowUntil = performance.now() + ms;
    slowScale = scale || 0.32;
  }

  function flatDist(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }

  function smooth(t) { return t * t * (3 - 2 * t); }

  function dampAngle(a, b, dt, k) {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return a + d * (1 - Math.exp(-k * dt));
  }

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    if (composer) composer.setSize(w, h);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  }

  function unlockAudio() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!actx) actx = new Ctx();
      if (actx.state === "suspended") actx.resume();
    } catch (err) { /* audio is optional */ }
  }

  function blip(freq, dur, type, gain, slide) {
    try {
      if (!actx) return;
      const o = actx.createOscillator();
      const g = actx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, actx.currentTime);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), actx.currentTime + dur);
      g.gain.setValueAtTime(gain, actx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);
      o.connect(g);
      g.connect(actx.destination);
      o.start();
      o.stop(actx.currentTime + dur + 0.02);
    } catch (err) { /* ignore */ }
  }

  function noise(dur, gain) {
    try {
      if (!actx) return;
      const n = actx.createBuffer(1, Math.floor(actx.sampleRate * dur), actx.sampleRate);
      const data = n.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const src = actx.createBufferSource();
      src.buffer = n;
      const filter = actx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = 800;
      const g = actx.createGain();
      g.gain.value = gain;
      src.connect(filter);
      filter.connect(g);
      g.connect(actx.destination);
      src.start();
    } catch (err) { /* ignore */ }
  }
})();

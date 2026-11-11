(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

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

  const previewColors = [0x238636, 0x2ea043, 0x3fb950, 0x56d364, 0x58a6ff, 0x79c0ff, 0xbc8cff];
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

  let closer = false;
  const startBtn = $("start");
  if (startBtn) {
    startBtn.addEventListener("click", () => {
      const title = $("title");
      if (title) title.classList.add("hidden");
      closer = true;
    });
  }

  const clock = new THREE.Clock();
  let spin = 0.85;
  let age = 0;

  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(0.033, clock.getDelta());
    age += dt;
    if (!reduceMotion) spin += dt * (closer ? 0.38 : 0.24);

    preview.forEach((mesh) => {
      const u = reduceMotion ? 1 : Math.min(1, Math.max(0, (age - mesh.userData.delay) / 0.42));
      const ease = 1 - Math.pow(1 - u, 3);
      mesh.position.y = mesh.userData.baseY + (1 - ease) * 2.4;
    });

    const dist = closer ? 6.6 : 9.6;
    const lift = closer ? 3.5 : 5.2;
    camera.position.set(Math.sin(spin) * dist, lift + Math.sin(spin * 0.7) * 0.25, Math.cos(spin) * dist);
    camera.lookAt(0, 1.55, 0);

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

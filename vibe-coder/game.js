(() => {
  const GLITCHES = {
    misaligned: { fix: "Center the CTA button and kill the random rotate", log: "button.cta re-centered", color: 0x238636 },
    contrast: { fix: "Bump the text contrast to WCAG AA", log: "contrast ratio 4.5:1 ✓", color: 0x58a6ff },
    overflow: { fix: "Wrap the overflowing headline", log: "h2 now wraps nicely", color: 0xf85149 },
    nav: { fix: "Bring back the missing nav bar", log: "<nav> restored", color: 0x3fb950 },
    modal: { fix: "Dismiss the stuck cookie modal", log: "modal z-index fixed, dismissed", color: 0xd29922 },
    font: { fix: "Normalize the subtitle font size and family", log: "no more Comic Sans, phew", color: 0xa371f7 },
    image: { fix: "Restore the broken hero image", log: "hero.svg 200 OK", color: 0xf78166 },
    flashbang: { fix: "Turn off the neon yellow background", log: "eyes saved, bg reset", color: 0xffff00 }
  };
  const JUNK = [
    ["Rewrite the whole thing in Rust", "rustc: 412 errors, 0 features"],
    ["Make it pop more", "added 9 gradients, nothing fixed"],
    ["Add a blockchain", "minted 1 NFT of a broken button"],
    ["Ask the AI if it is sentient", "it said 'maybe', glitches remain"],
    ["Add more AI to the AI", "recursion depth exceeded"],
    ["Refactor into 40 microservices", "kubernetes says no"],
    ["Ship it, nobody will notice", "QA noticed"],
    ["Add confetti on every click", "so much confetti, still broken"]
  ];
  const SPRINTS = [
    { n: 2, coffee: 60 }, { n: 3, coffee: 55 }, { n: 4, coffee: 52 }, { n: 5, coffee: 50 }, { n: 6, coffee: 48 }
  ];

  const HIGH_KEY = "games.vibeCoder.highScore";
  const $ = id => document.getElementById(id);
  let lvl = 0, score = 0, combo = 1, coffee = 0, maxCoffee = 60;
  let active = [], sipped = false, timer = null, playing = false, paused = false, deckCards = [];
  let sceneApi = null, sprintTimer = null, endTimer = null, inRun = false;
  let best = readHigh(), bestAtStart = best;

  function readHigh() {
    try {
      const n = Number(localStorage.getItem(HIGH_KEY));
      return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
    } catch {
      return 0;
    }
  }

  function writeHigh(n) {
    try {
      localStorage.setItem(HIGH_KEY, String(n));
    } catch {
      /* private mode or blocked storage */
    }
  }

  const shuffle = a => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  function log(msg, cls = "info") {
    const d = document.createElement("div");
    d.className = cls;
    d.textContent = "> " + msg;
    $("log").appendChild(d);
    $("log").scrollTop = 1e9;
  }

  function show(id) {
    ["title", "game", "end"].forEach(s => $(s).classList.toggle("hidden", s !== id));
  }

  function hud() {
    $("lvl").textContent = lvl + 1;
    $("score").textContent = score;
    $("combo").textContent = "x" + combo;
    $("secs").textContent = Math.ceil(coffee) + "s";
    $("glitchCount").textContent = active.length
      ? active.length + " glitch" + (active.length > 1 ? "es" : "")
      : "0 glitches · ready to ship";
    $("glitchCount").className = "pill" + (active.length ? "" : " ok");
    $("sip").disabled = sipped || paused;
    $("deploy").disabled = paused;
    if (score > best) {
      best = score;
      writeHigh(best);
    }
    $("best").textContent = String(best);
    $("titleBest").textContent = best > 0
      ? "Best score in this browser: " + best
      : "Best score saves in this browser.";
    const pauseBtn = $("pauseBtn");
    pauseBtn.disabled = !playing;
    pauseBtn.textContent = paused ? "Resume" : "Pause";
    pauseBtn.setAttribute("aria-pressed", paused ? "true" : "false");
    if (sceneApi) sceneApi.setCoffee(Math.max(0, coffee / maxCoffee), coffee / maxCoffee < 0.25);
  }

  function bestBlurb() {
    if (score > bestAtStart) return "New best saved in this browser: " + score + ".";
    if (best > 0) return "Best in this browser: " + best + ".";
    return "Your best score will be saved in this browser.";
  }

  function hidePause() {
    paused = false;
    $("paused").classList.add("hidden");
    $("paused").setAttribute("aria-hidden", "true");
    if (sceneApi) sceneApi.setPaused(false);
  }

  function togglePause() {
    if (!playing) return;
    paused = !paused;
    $("paused").classList.toggle("hidden", !paused);
    $("paused").setAttribute("aria-hidden", paused ? "false" : "true");
    if (sceneApi) sceneApi.setPaused(paused);
    log(paused ? "paused — coffee timer and desk frozen" : "resumed", "info");
    hud();
    if (paused) $("resume").focus();
    else $("pauseBtn").focus();
  }

  function startSprint() {
    const s = SPRINTS[lvl];
    maxCoffee = s.coffee;
    coffee = s.coffee;
    sipped = false;
    active = shuffle(Object.keys(GLITCHES)).slice(0, s.n);
    if (sceneApi) sceneApi.setGlitches(active);

    const junk = shuffle(JUNK.slice()).slice(0, 8 - active.length).map(([t, l]) => ({ t, l, junk: true }));
    deckCards = shuffle(
      active.map(g => ({ t: GLITCHES[g].fix, l: GLITCHES[g].log, g })).concat(junk)
    );
    const deck = $("deck");
    deck.innerHTML = "";
    deckCards.forEach((c, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "card";
      b.innerHTML = '<span class="k">[' + (i + 1) + "]</span>";
      b.appendChild(document.createTextNode(c.t));
      b.onclick = () => play(i);
      c.el = b;
      deck.appendChild(b);
    });
    log("sprint " + (lvl + 1) + ": " + active.length + " glitches in prod. coffee at " + coffee + "s", "info");
    playing = true;
    hud();
  }

  function play(i) {
    if (!playing || paused) return;
    const c = deckCards[i];
    if (!c || c.el.classList.contains("used")) return;
    c.el.classList.add("used");
    if (c.junk) {
      coffee = Math.max(0, coffee - 8);
      combo = 1;
      log(c.t + " → " + c.l + " (-8s coffee)", "bad");
      c.el.classList.add("shake");
      if (sceneApi) sceneApi.pulseBad();
    } else {
      active = active.filter(g => g !== c.g);
      if (sceneApi) sceneApi.clearGlitch(c.g);
      score += 100 * combo;
      log(c.t + " → " + c.l + " (+" + 100 * combo + ")", "ok");
      combo = Math.min(combo + 1, 5);
      if (sceneApi) sceneApi.pulseGood();
    }
    hud();
    if (coffee <= 0) lose();
  }

  function deploy() {
    if (!playing || paused) return;
    if (active.length) {
      coffee = Math.max(0, coffee - 5);
      combo = 1;
      log("deploy blocked: " + active.length + " glitch(es) still live (-5s)", "bad");
      if (sceneApi) sceneApi.pulseBad();
      hud();
      if (coffee <= 0) lose();
      return;
    }
    const bonus = Math.ceil(coffee) * 10;
    score += bonus;
    playing = false;
    if (sceneApi) sceneApi.celebrate();
    log("🚀 deployed! coffee bonus +" + bonus, "ok");
    hud();
    clearTimeout(sprintTimer);
    sprintTimer = setTimeout(() => {
      lvl++;
      if (lvl >= SPRINTS.length) win();
      else startSprint();
    }, 1000);
  }

  function sip() {
    if (!playing || paused || sipped) return;
    sipped = true;
    coffee = Math.min(maxCoffee, coffee + 10);
    log("☕ emergency sip +10s", "info");
    if (sceneApi) sceneApi.sipFx();
    hud();
  }

  function tick() {
    if (!playing || paused) return;
    coffee -= 0.1;
    if (coffee <= 0) {
      coffee = 0;
      hud();
      lose();
    } else hud();
  }

  function endRun() {
    playing = false;
    inRun = false;
    hidePause();
    clearInterval(timer);
    clearTimeout(sprintTimer);
    hud();
  }

  function lose() {
    if (!playing) return;
    endRun();
    if (sceneApi) sceneApi.setMood("lose");
    $("endTitle").textContent = "Coffee died ☠️";
    $("endText").textContent =
      "You made it to sprint " + (lvl + 1) + " with " + score + " points. Brew another pot and try again.";
    $("endBest").textContent = bestBlurb();
    clearTimeout(endTimer);
    endTimer = setTimeout(() => {
      if (!playing) show("end");
    }, 600);
  }

  function win() {
    endRun();
    if (sceneApi) sceneApi.setMood("win");
    $("endTitle").textContent = "Shipped all 5 sprints! 🚀";
    $("endText").textContent =
      "Final score: " + score + ". Clean prompts, hot coffee, real deploys in 3D. That's how Alexander Haislip ships.";
    $("endBest").textContent = bestBlurb();
    show("end");
  }

  function begin() {
    clearTimeout(sprintTimer);
    clearTimeout(endTimer);
    inRun = true;
    lvl = 0;
    score = 0;
    combo = 1;
    bestAtStart = best;
    hidePause();
    $("log").innerHTML = "";
    show("game");
    if (sceneApi) sceneApi.setMood("play");
    startSprint();
    clearInterval(timer);
    timer = setInterval(tick, 100);
  }

  // ---------- Three.js scene ----------
  function initScene() {
    if (typeof THREE === "undefined") {
      console.error("THREE missing");
      return null;
    }
    const canvas = $("c3d");
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d1117);
    scene.fog = new THREE.Fog(0x0d1117, 12, 28);

    const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0.8, 2.4, 6.2);

    // Lights
    scene.add(new THREE.AmbientLight(0x8b949e, 0.35));
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(4, 8, 5);
    key.castShadow = true;
    scene.add(key);
    const fill = new THREE.PointLight(0x58a6ff, 1.4, 20);
    fill.position.set(-3, 2.5, 2);
    scene.add(fill);
    const rim = new THREE.PointLight(0x238636, 1.6, 18);
    rim.position.set(3, 1.5, -2);
    scene.add(rim);
    const deskGlow = new THREE.PointLight(0x58a6ff, 0.6, 10);
    deskGlow.position.set(0, 0.4, 1);
    scene.add(deskGlow);

    // Floor / room
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0d1117, metalness: 0.4, roughness: 0.55, emissive: 0x111820, emissiveIntensity: 0.2
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Grid accent (emissive lines via thin boxes)
    const gridGroup = new THREE.Group();
    const lineMat = new THREE.MeshStandardMaterial({
      color: 0x238636, emissive: 0x238636, emissiveIntensity: 0.7, metalness: 0.2, roughness: 0.4
    });
    for (let i = -6; i <= 6; i++) {
      const hx = new THREE.Mesh(new THREE.BoxGeometry(12, 0.015, 0.02), lineMat);
      hx.position.set(0, 0.01, i);
      gridGroup.add(hx);
      const hz = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.015, 12), lineMat.clone());
      hz.material.color.set(0x58a6ff);
      hz.material.emissive.set(0x58a6ff);
      hz.position.set(i, 0.01, 0);
      gridGroup.add(hz);
    }
    scene.add(gridGroup);

    // Desk
    const desk = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 0.12, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x161b22, metalness: 0.55, roughness: 0.35, emissive: 0x0a1018, emissiveIntensity: 0.3 })
    );
    desk.position.set(0, 0.9, 0.6);
    desk.castShadow = true;
    desk.receiveShadow = true;
    scene.add(desk);

    const deskEdge = new THREE.Mesh(
      new THREE.BoxGeometry(4.25, 0.03, 2.25),
      new THREE.MeshStandardMaterial({ color: 0x238636, emissive: 0x238636, emissiveIntensity: 0.85 })
    );
    deskEdge.position.set(0, 0.84, 0.6);
    scene.add(deskEdge);

    // Monitor frame
    const monitor = new THREE.Group();
    monitor.position.set(-0.35, 1.85, 0.15);
    const bezel = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 1.7, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x21262d, metalness: 0.7, roughness: 0.3 })
    );
    bezel.castShadow = true;
    monitor.add(bezel);
    const stand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.18, 0.55, 16),
      new THREE.MeshStandardMaterial({ color: 0x30363d, metalness: 0.6, roughness: 0.4 })
    );
    stand.position.set(0, -1.05, 0.05);
    monitor.add(stand);
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.4, 0.06, 24),
      new THREE.MeshStandardMaterial({ color: 0x30363d, metalness: 0.5, roughness: 0.45 })
    );
    base.position.set(0, -1.34, 0.08);
    monitor.add(base);
    scene.add(monitor);

    // Floating page group (on/above screen)
    const page = new THREE.Group();
    page.position.set(-0.35, 1.85, 0.28);
    scene.add(page);

    const bgMat = new THREE.MeshStandardMaterial({
      color: 0xf0f6fc, emissive: 0x1a2330, emissiveIntensity: 0.15, metalness: 0.05, roughness: 0.7
    });
    const pageBg = new THREE.Mesh(new THREE.PlaneGeometry(2.35, 1.45), bgMat);
    page.add(pageBg);

    const navMat = new THREE.MeshStandardMaterial({ color: 0x161b22, emissive: 0x58a6ff, emissiveIntensity: 0.25 });
    const navBar = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.16, 0.04), navMat);
    navBar.position.set(0, 0.55, 0.03);
    page.add(navBar);

    const titleMat = new THREE.MeshStandardMaterial({ color: 0x0d1117, emissive: 0x58a6ff, emissiveIntensity: 0.1 });
    const titleBar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 0.03), titleMat);
    titleBar.position.set(0, 0.22, 0.04);
    page.add(titleBar);

    const subMat = new THREE.MeshStandardMaterial({ color: 0x57606a, emissive: 0x30363d, emissiveIntensity: 0.1 });
    const subBar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.07, 0.02), subMat);
    subBar.position.set(0, 0.05, 0.04);
    page.add(subBar);

    const heroMat = new THREE.MeshStandardMaterial({ color: 0x24292f, emissive: 0x238636, emissiveIntensity: 0.35 });
    const hero = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.05), heroMat);
    hero.position.set(0, -0.2, 0.05);
    page.add(hero);

    const ctaMat = new THREE.MeshStandardMaterial({ color: 0x238636, emissive: 0x238636, emissiveIntensity: 0.9 });
    const cta = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 0.05), ctaMat);
    cta.position.set(0, -0.52, 0.06);
    page.add(cta);

    const modalMat = new THREE.MeshStandardMaterial({
      color: 0xffe8a3, emissive: 0xd29922, emissiveIntensity: 0.5, transparent: true, opacity: 0
    });
    const modal = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.45, 0.06), modalMat);
    modal.position.set(0, 0, 0.12);
    modal.visible = false;
    page.add(modal);

    // Glitch shards orbiting page
    const shards = [];
    for (let i = 0; i < 10; i++) {
      const sm = new THREE.MeshStandardMaterial({
        color: 0x58a6ff, emissive: 0x58a6ff, emissiveIntensity: 0.8, transparent: true, opacity: 0.85
      });
      const shard = new THREE.Mesh(
        new THREE.TetrahedronGeometry(0.08 + Math.random() * 0.06, 0),
        sm
      );
      shard.userData = {
        base: new THREE.Vector3(
          (Math.random() - 0.5) * 2.8,
          (Math.random() - 0.5) * 1.6,
          0.2 + Math.random() * 0.5
        ),
        speed: 0.4 + Math.random() * 0.8,
        phase: Math.random() * Math.PI * 2
      };
      shard.position.copy(shard.userData.base);
      shard.visible = false;
      page.add(shard);
      shards.push(shard);
    }

    // Coffee mug (right side of desk)
    const mugGroup = new THREE.Group();
    mugGroup.position.set(1.45, 1.05, 1.05);
    const mugMat = new THREE.MeshStandardMaterial({ color: 0xe6edf3, metalness: 0.15, roughness: 0.35 });
    const mugOuter = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.25, 0.55, 32, 1, true), mugMat);
    mugOuter.castShadow = true;
    mugGroup.add(mugOuter);
    const mugBottom = new THREE.Mesh(
      new THREE.CircleGeometry(0.25, 32),
      new THREE.MeshStandardMaterial({ color: 0xc9d1d9, metalness: 0.2, roughness: 0.4 })
    );
    mugBottom.rotation.x = -Math.PI / 2;
    mugBottom.position.y = -0.275;
    mugGroup.add(mugBottom);
    const handle = new THREE.Mesh(
      new THREE.TorusGeometry(0.14, 0.035, 12, 24, Math.PI),
      mugMat
    );
    handle.rotation.y = Math.PI / 2;
    handle.position.set(0.3, 0.02, 0);
    mugGroup.add(handle);
    const coffeeMat = new THREE.MeshStandardMaterial({
      color: 0x5b3a1a, emissive: 0x8a5a2b, emissiveIntensity: 0.35, metalness: 0.1, roughness: 0.5
    });
    const coffeeMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.22, 0.48, 32), coffeeMat);
    coffeeMesh.position.y = 0;
    mugGroup.add(coffeeMesh);
    // steam particles
    const steam = [];
    const steamGeo = new THREE.SphereGeometry(0.03, 8, 8);
    for (let i = 0; i < 18; i++) {
      const p = new THREE.Mesh(
        steamGeo,
        new THREE.MeshStandardMaterial({
          color: 0x8b949e, emissive: 0xffffff, emissiveIntensity: 0.2, transparent: true, opacity: 0.35
        })
      );
      p.userData = { phase: Math.random() * Math.PI * 2, speed: 0.4 + Math.random() * 0.5, r: Math.random() * 0.12 };
      p.position.set(0, 0.35, 0);
      mugGroup.add(p);
      steam.push(p);
    }
    scene.add(mugGroup);

    // Keyboard prop
    const kb = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.06, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x21262d, metalness: 0.4, roughness: 0.5, emissive: 0x58a6ff, emissiveIntensity: 0.08 })
    );
    kb.position.set(-0.6, 0.99, 1.15);
    kb.castShadow = true;
    scene.add(kb);

    // Floating accent cubes in room
    const accents = [];
    for (let i = 0; i < 8; i++) {
      const a = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.12, 0.12),
        new THREE.MeshStandardMaterial({
          color: i % 2 ? 0x238636 : 0x58a6ff,
          emissive: i % 2 ? 0x238636 : 0x58a6ff,
          emissiveIntensity: 0.7
        })
      );
      a.position.set((Math.random() - 0.5) * 8, 1 + Math.random() * 3, -2 - Math.random() * 4);
      a.userData = { spin: (Math.random() - 0.5) * 0.02 };
      scene.add(a);
      accents.push(a);
    }

    // State for glitches
    const rest = {
      cta: cta.position.clone(),
      ctaRot: cta.rotation.clone(),
      title: titleBar.scale.clone(),
      titlePos: titleBar.position.clone(),
      sub: { scale: subBar.scale.clone(), color: subMat.color.clone() },
      hero: heroMat.clone(),
      bg: bgMat.color.clone(),
      bgEm: bgMat.emissive.clone(),
      bgEmI: bgMat.emissiveIntensity
    };

    let activeGlitches = [];
    let flash = 0;
    let mood = "idle"; // idle | play | win | lose
    let camT = 0;
    let coffeeLevel = 1;
    let coffeeLow = false;
    let scenePaused = false;

    function applyGlitches() {
      // reset
      cta.position.copy(rest.cta);
      cta.rotation.set(0, 0, 0);
      titleBar.scale.copy(rest.title);
      titleBar.position.copy(rest.titlePos);
      subBar.scale.copy(rest.sub.scale);
      subMat.color.copy(rest.sub.color);
      subBar.scale.set(1, 1, 1);
      navBar.visible = true;
      modal.visible = false;
      modalMat.opacity = 0;
      heroMat.color.set(0x24292f);
      heroMat.emissive.set(0x238636);
      heroMat.emissiveIntensity = 0.35;
      bgMat.color.copy(rest.bg);
      bgMat.emissive.copy(rest.bgEm);
      bgMat.emissiveIntensity = rest.bgEmI;
      titleMat.emissiveIntensity = 0.1;
      titleMat.color.set(0x0d1117);

      shards.forEach((s, i) => {
        s.visible = i < activeGlitches.length;
        if (s.visible) {
          const g = activeGlitches[i];
          const col = GLITCHES[g] ? GLITCHES[g].color : 0x58a6ff;
          s.material.color.setHex(col);
          s.material.emissive.setHex(col);
        }
      });

      activeGlitches.forEach(g => {
        if (g === "misaligned") {
          cta.position.set(0.55, -0.35, 0.08);
          cta.rotation.z = -0.35;
        } else if (g === "contrast") {
          titleMat.color.set(0xe9e9e9);
          titleMat.emissiveIntensity = 0.02;
          subMat.color.set(0xe9e9e9);
        } else if (g === "overflow") {
          titleBar.scale.set(2.2, 1, 1);
          titleBar.position.x = 0.4;
        } else if (g === "nav") {
          navBar.visible = false;
        } else if (g === "modal") {
          modal.visible = true;
          modalMat.opacity = 0.95;
        } else if (g === "font") {
          subBar.scale.set(1.4, 2.8, 1);
          subMat.color.set(0xf85149);
        } else if (g === "image") {
          heroMat.color.set(0xf85149);
          heroMat.emissive.set(0xffffff);
          heroMat.emissiveIntensity = 0.9;
        } else if (g === "flashbang") {
          bgMat.color.set(0xffff00);
          bgMat.emissive.set(0xffff00);
          bgMat.emissiveIntensity = 0.85;
        }
      });
    }

    function setGlitches(list) {
      activeGlitches = list.slice();
      applyGlitches();
    }

    function clearGlitch(g) {
      activeGlitches = activeGlitches.filter(x => x !== g);
      applyGlitches();
      flash = 0.4;
    }

    function setCoffee(pct, low) {
      coffeeLevel = Math.max(0, Math.min(1, pct));
      coffeeLow = !!low;
      const h = 0.08 + coffeeLevel * 0.4;
      coffeeMesh.scale.y = h / 0.48;
      coffeeMesh.position.y = -0.275 + h / 2;
      coffeeMat.color.setHex(low ? 0x7a1f1b : 0x5b3a1a);
      coffeeMat.emissive.setHex(low ? 0xf85149 : 0x8a5a2b);
      coffeeMat.emissiveIntensity = low ? 0.55 : 0.35;
      steam.forEach(p => { p.visible = coffeeLevel > 0.05; });
    }

    function pulseGood() {
      flash = 0.55;
      rim.intensity = 3.2;
    }
    function pulseBad() {
      flash = -0.55;
      fill.intensity = 2.4;
    }
    function sipFx() {
      coffeeMat.emissiveIntensity = 0.9;
      setTimeout(() => { coffeeMat.emissiveIntensity = coffeeLow ? 0.55 : 0.35; }, 400);
    }
    function celebrate() {
      flash = 1;
      accents.forEach(a => { a.material.emissiveIntensity = 1.4; });
      setTimeout(() => accents.forEach(a => { a.material.emissiveIntensity = 0.7; }), 800);
    }
    function setMood(m) { mood = m; }
    function setPaused(p) { scenePaused = !!p; }

    function onResize() {
      const w = window.innerWidth, h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener("resize", onResize);

    function animate() {
      requestAnimationFrame(animate);
      if (scenePaused) {
        renderer.render(scene, camera);
        return;
      }
      camT += 0.008;
      const breathe = mood === "idle" ? 0.35 : 0.18;
      camera.position.x = 0.8 + Math.sin(camT * 0.7) * breathe;
      camera.position.y = 2.4 + Math.sin(camT * 0.5) * 0.08;
      camera.position.z = 6.2 + Math.cos(camT * 0.4) * 0.15;
      camera.lookAt(-0.1, 1.5, 0.3);

      page.rotation.y = Math.sin(camT * 0.6) * 0.04;
      page.position.y = 1.85 + Math.sin(camT) * 0.03;
      monitor.rotation.y = page.rotation.y * 0.5;

      shards.forEach((s, i) => {
        if (!s.visible) return;
        const u = s.userData;
        s.position.x = u.base.x + Math.sin(camT * u.speed + u.phase) * 0.15;
        s.position.y = u.base.y + Math.cos(camT * u.speed * 1.2 + u.phase) * 0.12;
        s.rotation.x += 0.02;
        s.rotation.y += 0.03;
      });

      steam.forEach((p, i) => {
        if (!p.visible) return;
        const t = camT * p.userData.speed + p.userData.phase;
        const rise = ((t * 0.35) % 1);
        p.position.set(
          Math.sin(t) * p.userData.r,
          0.32 + rise * 0.55,
          Math.cos(t * 0.8) * p.userData.r
        );
        p.material.opacity = 0.35 * (1 - rise);
        p.scale.setScalar(0.7 + rise * 1.4);
      });

      accents.forEach(a => {
        a.rotation.x += a.userData.spin;
        a.rotation.y += a.userData.spin * 1.3;
      });

      mugGroup.rotation.y = Math.sin(camT * 0.3) * 0.05;

      if (flash > 0) {
        flash *= 0.9;
        rim.intensity = 1.6 + flash * 2;
        if (flash < 0.02) flash = 0;
      } else if (flash < 0) {
        flash *= 0.9;
        fill.intensity = 1.4 + Math.abs(flash) * 2;
        if (flash > -0.02) flash = 0;
      } else {
        rim.intensity += (1.6 - rim.intensity) * 0.05;
        fill.intensity += (1.4 - fill.intensity) * 0.05;
      }

      if (mood === "lose") {
        scene.fog.near = 6;
        key.intensity = 0.5;
      } else if (mood === "win") {
        rim.intensity = 2.8;
        fill.intensity = 2.2;
      } else {
        scene.fog.near = 12;
        key.intensity += (1.1 - key.intensity) * 0.05;
      }

      renderer.render(scene, camera);
    }
    animate();
    setCoffee(1, false);

    return { setGlitches, clearGlitch, setCoffee, pulseGood, pulseBad, sipFx, celebrate, setMood, setPaused };
  }

  sceneApi = initScene();

  $("best").textContent = String(best);
  $("titleBest").textContent = best > 0
    ? "Best score in this browser: " + best
    : "Best score saves in this browser.";
  $("start").onclick = begin;
  $("again").onclick = begin;
  $("deploy").onclick = deploy;
  $("sip").onclick = sip;
  $("pauseBtn").onclick = togglePause;
  $("resume").onclick = togglePause;
  $("restart").onclick = begin;
  document.addEventListener("keydown", e => {
    if (e.repeat) return;
    const key = e.key.toLowerCase();
    if (e.key === "Enter") e.preventDefault();
    if (playing && (key === "p" || e.key === " " || e.key === "Escape")) {
      e.preventDefault();
      togglePause();
      return;
    }
    if (key === "r" && (inRun || !$("end").classList.contains("hidden"))) {
      begin();
      return;
    }
    if ($("game").classList.contains("hidden")) {
      if (e.key === "Enter" && !$("title").classList.contains("hidden")) begin();
      return;
    }
    if (paused) {
      if (e.key === "Enter") togglePause();
      return;
    }
    if (/^[1-8]$/.test(e.key)) play(+e.key - 1);
    else if (e.key === "Enter") deploy();
    else if (key === "s") sip();
  });

  if (/[?&]autostart=1/.test(location.search)) {
    setTimeout(() => { if (!$("game") || $("game").classList.contains("hidden")) begin(); }, 400);
  }

})();

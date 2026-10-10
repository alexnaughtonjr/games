/* LabFX: WebAudio one-shots, camera shake, and canvas-texture color fix.
   No samples. Audio starts on the first tap or key, which browsers require. */
(function(){
  let ctx, master;
  function ac(){
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx){
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.2;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, dur, type, gain, slide){
    const c = ac(); if (!c) return;
    const t = c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(Math.max(40, freq), t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t + dur);
    g.gain.setValueAtTime(gain || 0.15, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  const sfx = {
    unlock(){ ac(); },
    ui(){ tone(740, 0.05, 'sine', 0.07); },
    pop(){ tone(520, 0.07, 'triangle', 0.12, 1.7); },
    orb(combo){
      const n = Math.max(1, combo || 1);
      tone(420 + n * 38, 0.09, 'triangle', 0.14, 1.9);
      if (n > 2) tone(640 + n * 22, 0.11, 'sine', 0.07, 1.4);
    },
    boost(){ tone(160, 0.18, 'sawtooth', 0.07, 2.8); tone(90, 0.22, 'sine', 0.08, 1.6); },
    hit(){ tone(150, 0.16, 'square', 0.14, 0.35); tone(70, 0.2, 'sawtooth', 0.08, 0.5); },
    win(){ [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.16, 'triangle', 0.1), i * 80)); },
    bad(){ tone(180, 0.14, 'square', 0.1, 0.45); }
  };
  function Shaker(){
    let mag = 0;
    return {
      add(n){ mag = Math.min(1.4, mag + n); },
      /* returns a small offset that decays. Call once per frame. */
      apply(dt){
        mag *= Math.exp(-3.2 * (dt || 0.016));
        if (mag < 0.004) mag = 0;
        const s = mag * mag * 1.6;
        return { x: (Math.random() - 0.5) * s, y: (Math.random() - 0.5) * s, mag };
      }
    };
  }
  /* Canvas pixels are sRGB. Without this, Three r160 lifts dark fills into a flat grey up close. */
  function colorMap(tex){
    if (!tex) return tex;
    if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
  }
  function damp(current, target, dt, speed){
    return current + (target - current) * (1 - Math.exp(-(speed || 6) * dt));
  }
  addEventListener('pointerdown', () => ac(), { once: false, passive: true });
  addEventListener('keydown', () => ac());
  const coarse = matchMedia('(pointer:coarse)').matches || innerWidth < 760;
  window.LabFX = { sfx, Shaker, colorMap, damp, ac, coarse };
})();

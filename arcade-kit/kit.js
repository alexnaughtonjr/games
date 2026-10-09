/*! Arcade Kit v0.1 - drop-in monetization + social layer for indie browser games.
   by Alexander Haislip (@alexnaughtonjr). MIT. No backend, no tracking, no fake checkout.
   <script src="kit.js" data-game="My Game" data-venmo="yourhandle" data-contact="https://x.com/you"
           data-ad-price="100" data-ring="https://a.com/game1,https://b.com/game2"></script>
   API: ArcadeKit.submitScore(score, name?) -> rank   ArcadeKit.challengeLink(score)   ArcadeKit.billboard(w,h) -> canvas
        ArcadeKit.onChallenge(fn)  (fires if the page was opened from a challenge link) */
(function(){
  const me = document.currentScript || document.querySelector('script[src*="kit.js"]');
  const cfg = {
    game: me?.dataset.game || document.title || 'game',
    venmo: me?.dataset.venmo || '', contact: me?.dataset.contact || '',
    adPrice: +(me?.dataset.adPrice || 100), sponsor: me?.dataset.sponsor || '', sponsorUrl: me?.dataset.sponsorUrl || '',
    ring: (me?.dataset.ring || '').split(',').map(s=>s.trim()).filter(Boolean), position: me?.dataset.position || 'bottom-left'
  };
  const key = 'arcadekit.' + cfg.game.toLowerCase().replace(/[^a-z0-9]+/g,'-');
  const load = () => { try { return JSON.parse(localStorage.getItem(key)) || {scores:[], name:''}; } catch(e){ return {scores:[], name:''}; } };
  const save = d => { try { localStorage.setItem(key, JSON.stringify(d)); } catch(e){} };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  // Challenge links: score + name + checksum packed in the URL hash. Not cheat-proof - it's a friendly dare.
  const sum = s => [...s].reduce((a,c)=>(a*33 + c.charCodeAt(0))>>>0, 5381).toString(36).slice(0,4);
  function challengeLink(score, name){ const p = `${Math.round(score)}.${encodeURIComponent((name||load().name||'someone').slice(0,16))}`; return location.origin + location.pathname + '#ak=' + p + '.' + sum(cfg.game+p); }
  function readChallenge(){ const m = location.hash.match(/ak=(\d+)\.([^.]+)\.([a-z0-9]+)/); if(!m) return null; const p = `${m[1]}.${m[2]}`; if (sum(cfg.game+p)!==m[3]) return null; return {score:+m[1], name:decodeURIComponent(m[2])}; }
  const challenge = readChallenge();

  const css = `
  .ak-bar{position:fixed;${cfg.position.includes('top')?'top':'bottom'}:12px;${cfg.position.includes('right')?'right':'left'}:12px;z-index:2147483000;font:12px/1.3 'JetBrains Mono',ui-monospace,Menlo,monospace;color:#e6edf3;display:flex;gap:6px;align-items:center}
  .ak-b{background:rgba(22,27,34,.92);border:1px solid #30363d;border-radius:8px;padding:7px 10px;color:#e6edf3;cursor:pointer;text-decoration:none;backdrop-filter:blur(6px)}
  .ak-b:hover{border-color:#58a6ff}.ak-g{border-color:#238636}
  .ak-panel{position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(1,4,9,.6);z-index:2147483001}
  .ak-card{width:min(380px,92vw);background:#161b22;border:1px solid #30363d;border-radius:12px;padding:16px;font:13px/1.45 'JetBrains Mono',ui-monospace,Menlo,monospace;color:#e6edf3}
  .ak-card h3{margin:0 0 8px;font-size:15px}.ak-card ol{padding-left:22px;margin:8px 0}.ak-card li{margin:3px 0}.ak-card .ak-me{color:#3fb950}
  .ak-card input{width:100%;box-sizing:border-box;background:#0d1117;border:1px solid #30363d;border-radius:6px;color:#e6edf3;padding:7px;font:inherit}
  .ak-row{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.ak-muted{color:#8b949e}
  .ak-toast{position:fixed;top:16px;left:50%;transform:translateX(-50%);background:#161b22;border:1px solid #bc8cff;color:#e6edf3;padding:10px 14px;border-radius:8px;font:13px 'JetBrains Mono',monospace;z-index:2147483002}`;
  const st = document.createElement('style'); st.textContent = css; document.head.append(st);

  const bar = document.createElement('div'); bar.className = 'ak-bar';
  const sponsorHtml = cfg.sponsor
    ? `<a class="ak-b" href="${esc(cfg.sponsorUrl||'#')}" target="_blank" rel="noopener sponsored">sponsored · ${esc(cfg.sponsor)}</a>`
    : (cfg.contact ? `<a class="ak-b" href="${esc(cfg.contact)}" target="_blank" rel="noopener" title="Advertise in this game">your ad here · $${cfg.adPrice}/mo</a>` : '');
  bar.innerHTML = `<button class="ak-b" data-ak="board">🏆 scores</button>${cfg.venmo?`<a class="ak-b ak-g" target="_blank" rel="noopener" href="https://venmo.com/u/${encodeURIComponent(cfg.venmo)}?txn=pay&amount=2&note=${encodeURIComponent('Tip for '+cfg.game)}">♥ tip $2</a>`:''}${sponsorHtml}${cfg.ring.length?`<button class="ak-b" data-ak="ring" title="Jump to another indie game">⟳ next game</button>`:''}`;
  const panel = document.createElement('div'); panel.className = 'ak-panel'; panel.innerHTML = '<div class="ak-card"></div>';
  const ready = () => { document.body.append(bar, panel); if (challenge) toast(`⚔️ ${esc(challenge.name)} dares you to beat ${challenge.score.toLocaleString()} in ${esc(cfg.game)}`, 5000); };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', ready) : ready();
  panel.addEventListener('click', e => { if (e.target === panel) panel.style.display='none'; });
  bar.addEventListener('click', e => { const a = e.target.closest('[data-ak]')?.dataset.ak; if (a==='board') openBoard(); if (a==='ring') nextGame(); });

  function toast(html, ms=2600){ const t=document.createElement('div'); t.className='ak-toast'; t.innerHTML=html; document.body.append(t); setTimeout(()=>t.remove(), ms); }
  function openBoard(highlight){
    const d = load(); const c = panel.firstChild;
    const rows = d.scores.slice(0,10).map((s,i)=>`<li class="${s.t===highlight?'ak-me':''}">${s.score.toLocaleString()} <span class="ak-muted">${esc(s.name||'you')} · ${new Date(s.t).toLocaleDateString()}</span></li>`).join('');
    c.innerHTML = `<h3>🏆 ${esc(cfg.game)} - top runs</h3>
      ${challenge?`<p>⚔️ Challenge: <b>${challenge.score.toLocaleString()}</b> by ${esc(challenge.name)} ${d.scores[0]&&d.scores[0].score>challenge.score?'<span class="ak-me">- beaten ✓</span>':''}</p>`:''}
      ${rows?`<ol>${rows}</ol>`:'<p class="ak-muted">No runs yet. Play one!</p>'}
      <label class="ak-muted">Your name for challenge links</label><input maxlength="16" value="${esc(d.name)}" placeholder="name">
      <div class="ak-row">${d.scores[0]?'<button class="ak-b ak-g" data-x="dare">⚔️ Copy challenge link</button>':''}<button class="ak-b" data-x="close">close</button></div>
      <p class="ak-muted" style="margin-top:10px">Scores live in this browser. Challenge links carry your best score to a friend.</p>`;
    c.querySelector('input').onchange = e => { const dd = load(); dd.name = e.target.value.trim(); save(dd); };
    c.onclick = e => { const x = e.target.dataset.x; if (x==='close') panel.style.display='none';
      if (x==='dare') { const best = load().scores[0]; const link = challengeLink(best.score); navigator.clipboard?.writeText(link).then(()=>toast('Challenge link copied'), ()=>prompt('Copy:', link)); } };
    panel.style.display='flex';
  }
  function nextGame(){ const others = cfg.ring.filter(u => !location.href.startsWith(u)); if (!others.length) return; location.href = others[Math.floor(Math.random()*others.length)]; }
  function submitScore(score, name){
    const d = load(); const t = Date.now(); d.scores.push({score:Math.round(score), name:name||d.name||'', t}); d.scores.sort((a,b)=>b.score-a.score); d.scores = d.scores.slice(0,50); save(d);
    const rank = d.scores.findIndex(s=>s.t===t)+1;
    if (challenge && score > challenge.score) toast(`🎉 You beat ${esc(challenge.name)}'s ${challenge.score.toLocaleString()}!`, 4000);
    else if (rank===1) toast('🏆 New personal best!');
    return rank;
  }
  // In-world billboard: returns a canvas you can use as a texture (Three.js CanvasTexture, Phaser, 2D, etc.)
  function billboard(w=512, h=256){
    const cv = document.createElement('canvas'); cv.width=w; cv.height=h; const c = cv.getContext('2d');
    c.fillStyle='#0d1117'; c.fillRect(0,0,w,h); c.strokeStyle=cfg.sponsor?'#58a6ff':'#2ea043'; c.lineWidth=Math.max(4,w/60); c.strokeRect(c.lineWidth/2,c.lineWidth/2,w-c.lineWidth,h-c.lineWidth);
    c.fillStyle='#e6edf3'; c.textAlign='center'; c.font=`bold ${Math.round(h/5.5)}px JetBrains Mono, monospace`;
    if (cfg.sponsor) c.fillText(cfg.sponsor, w/2, h*.55);
    else { c.fillText('YOUR AD HERE', w/2, h*.45); c.font=`${Math.round(h/10)}px JetBrains Mono, monospace`; c.fillStyle='#3fb950'; c.fillText(`$${cfg.adPrice}/mo · ${cfg.game}`, w/2, h*.68); }
    return cv;
  }
  window.ArcadeKit = { submitScore, challengeLink, billboard, openBoard, challenge, onChallenge: fn => challenge && fn(challenge), config: cfg };
})();

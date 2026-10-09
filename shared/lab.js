/* lab.js - shared build-in-public toolkit for Alexander Haislip's product lab.
   No backend, no fake payments. Everything persistent lives in this browser's localStorage,
   and every number shown as "public" comes from the PRODUCT config that Alexander edits by hand. */
(function(){
  const HUB = (document.currentScript && document.currentScript.src) ? new URL('../lab.html', document.currentScript.src).href : '../lab.html';
  const LINKS = {
    venmo: 'https://venmo.com/u/alexnaughtonjr',
    x: 'https://x.com/alexnaughtonjr',
    issues: 'https://github.com/alexnaughtonjr/games/issues/new',
    repo: 'https://github.com/alexnaughtonjr/games'
  };
  const $ = (s, r=document) => r.querySelector(s);
  const h = (tag, attrs={}, ...kids) => {
    const e = document.createElement(tag);
    for (const [k,v] of Object.entries(attrs||{})) {
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) e.setAttribute(k, v);
    }
    for (const k of kids.flat()) if (k != null) e.append(k.nodeType ? k : document.createTextNode(String(k)));
    return e;
  };
  const store = {
    get(k, d){ try{ const v = localStorage.getItem('lab.'+k); return v==null ? d : JSON.parse(v);}catch(e){return d;} },
    set(k, v){ try{ localStorage.setItem('lab.'+k, JSON.stringify(v)); }catch(e){} }
  };
  const money = n => '$' + Math.round(n).toLocaleString('en-US');
  function toast(msg, ms=2200){
    const t = h('div',{class:'toast'}, msg); document.body.append(t);
    setTimeout(()=>t.remove(), ms);
  }

  /* Header / prototype banner / footer */
  function chrome(cfg){
    const top = h('div',{class:'topbar'}, h('div',{class:'wrap'},
      h('a',{class:'brand',href:cfg.home||'./'}, cfg.icon ? cfg.icon+' ' : '', cfg.name),
      h('span',{class:'pill '+(cfg.proto?'orange':'green')}, cfg.proto ? 'private prototype' : (cfg.tag||'live mvp')),
      h('span',{class:'sp'}),
      ...(cfg.nav||[]).map(([t,href,cls]) => h('a',{class:'nav '+(cls||''),href}, t)),
      h('a',{class:'nav hide-m',href: cfg.labHome || HUB}, 'all products')
    ));
    document.body.prepend(top);
    if (cfg.proto) document.body.prepend(h('div',{class:'banner-proto'},
      'PRIVATE PROTOTYPE - personal side project by Alexander Haislip. Not a product, not for sale, not marketed, not affiliated with any employer. Sample data only.'));
    document.body.append(h('footer',{class:'foot'}, h('div',{class:'wrap'},
      h('div',{}, 'Built in public by ', h('a',{href:LINKS.x,target:'_blank',rel:'noopener'},'@alexnaughtonjr'),
        ' · plain HTML/JS · free to host · ', h('a',{href:LINKS.repo,target:'_blank',rel:'noopener'},'source')),
      h('div',{class:'small',style:'margin-top:6px'}, cfg.footnote || 'No accounts, no trackers. Anything you save stays in this browser.')
    )));
    track(cfg.id, 'visits');
  }

  /* Local, honest counters (this browser only) */
  function track(id, ev, n=1){ if(!id) return 0; const k='count.'+id+'.'+ev; const v=store.get(k,0)+n; store.set(k,v); return v; }
  function count(id, ev){ return store.get('count.'+id+'.'+ev, 0); }

  /* Sponsor slots: each next slot costs more (price ladder). Sold slots are listed in config by hand. */
  function sponsors(el, cfg){
    const base = cfg.base||100, mult = cfg.mult||2, n = cfg.slots||4, sold = cfg.sold||[];
    el.innerHTML='';
    el.append(h('p',{class:'muted small'}, cfg.blurb || `Sponsor slots are priced as a ladder: every slot that sells makes the next one cost more. Slot 1 starts at ${money(base)}/${cfg.unit||'mo'}.`));
    const g = h('div',{class:'grid g4'});
    for (let i=0;i<n;i++){
      const price = base*Math.pow(mult,i), s = sold[i];
      const subject = encodeURIComponent(`Sponsor slot ${i+1} on ${cfg.product} (${money(price)}/${cfg.unit||'mo'})`);
      g.append(s
        ? h('a',{class:'slot sold',href:s.url||'#',target:'_blank',rel:'noopener sponsored'},
            h('span',{class:'pill blue'},'sponsor'), h('b',{},s.name), h('span',{class:'muted small'},s.tagline||''))
        : h('div',{class:'slot'},
            h('span',{class:'pill'}, `slot ${i+1}${i===sold.length?' · next up':''}`),
            h('span',{class:'price'}, money(price), h('span',{class:'muted small'},'/'+(cfg.unit||'mo'))),
            h('span',{class:'muted small'}, cfg.placement || 'Your ad here'),
            h('div',{style:'display:flex;gap:6px;flex-wrap:wrap;margin-top:auto'},
              h('a',{class:'btn',href:LINKS.x,target:'_blank',rel:'noopener',title:'DM to agree on details first'},'DM @alexnaughtonjr'),
              h('a',{class:'btn',href:`${LINKS.venmo}?txn=pay&note=${subject}`,target:'_blank',rel:'noopener',title:'Only pay after we agree in DM'},'Venmo'))
          ));
    }
    el.append(g, h('p',{class:'muted small'}, 'How it works: DM first, I confirm the slot is free and what it shows, then you pay via Venmo. No automated checkout - nothing is charged on this page.'));
  }

  /* Feature request board: local votes + one click to file a real public GitHub issue */
  function board(el, cfg){
    const key = 'board.'+cfg.product;
    let items = store.get(key, null) || (cfg.seed||[]).map((t,i)=>({id:'s'+i,t,v:0,mine:false,done:false}));
    const draw = () => {
      el.innerHTML='';
      const inp = h('input',{placeholder:'Request a feature or report a bug…',maxlength:140});
      const add = () => { const t=inp.value.trim(); if(!t) return; items.unshift({id:Date.now()+'',t,v:1,mine:true,voted:true}); store.set(key,items); draw(); toast('Added. File it publicly so I actually see it.'); };
      inp.addEventListener('keydown', e => e.key==='Enter' && add());
      el.append(h('div',{style:'display:flex;gap:8px'}, inp, h('button',{class:'btn primary',onclick:add},'Add')));
      const list = h('div',{});
      [...items].sort((a,b)=>(a.done-b.done)||(b.v-a.v)).forEach(it => {
        const vb = h('button',{class:'vote'+(it.voted?' on':''),onclick:()=>{it.voted=!it.voted;it.v+=it.voted?1:-1;store.set(key,items);draw();}}, '▲ '+it.v);
        const issue = `${LINKS.issues}?title=${encodeURIComponent('['+cfg.product+'] '+it.t)}&body=${encodeURIComponent('Requested from the '+cfg.product+' feature board.')}`;
        list.append(h('div',{class:'board-item'}, vb, h('div',{style:'flex:1'},
          h('div',{}, it.t, ' ', it.done?h('span',{class:'pill green'},'shipped'):null),
          h('div',{class:'small'}, h('a',{href:issue,target:'_blank',rel:'noopener'},'file publicly on GitHub →'))
        )));
      });
      el.append(list, h('p',{class:'muted small'},'Votes are stored in your browser. The public queue is GitHub issues - that is what I read.'));
    };
    draw();
  }

  /* Tiny dependency-free line/bar chart */
  function chart(canvas, series, opt={}){
    const dpr = window.devicePixelRatio||1, W = canvas.clientWidth||600, H = canvas.clientHeight||180;
    canvas.width = W*dpr; canvas.height = H*dpr; const c = canvas.getContext('2d'); c.scale(dpr,dpr);
    c.clearRect(0,0,W,H);
    const pad = 34, vals = series.map(p=>p.v), max = Math.max(1, ...vals)*1.15;
    c.strokeStyle='#21262d'; c.fillStyle='#8b949e'; c.font='11px JetBrains Mono, monospace';
    for (let i=0;i<=3;i++){ const y = H-pad+ -(H-pad*1.6)*i/3; c.beginPath(); c.moveTo(pad,y); c.lineTo(W-8,y); c.stroke(); c.fillText(opt.fmt?opt.fmt(max*i/3):Math.round(max*i/3), 2, y+4); }
    const bw = (W-pad-12)/Math.max(1,series.length);
    series.forEach((p,i) => {
      const x = pad + i*bw + bw*.15, bh = (H-pad*1.6)*(p.v/max), y = H-pad-bh;
      const g = c.createLinearGradient(0,y,0,H-pad); g.addColorStop(0, opt.color||'#2ea043'); g.addColorStop(1,'rgba(35,134,54,.15)');
      c.fillStyle = g; c.fillRect(x, y, bw*.7, Math.max(bh, p.v>0?2:1));
      c.fillStyle='#8b949e'; if (series.length<=14 || i%Math.ceil(series.length/10)===0) c.fillText(p.l, x, H-pad+16);
    });
    if (vals.every(v=>v===0)) { c.fillStyle='#8b949e'; c.font='13px JetBrains Mono, monospace'; c.fillText(opt.empty||'$0 so far - day one. Updates land here.', pad+10, H/2); }
  }

  /* Open stats dashboard: public numbers from config (hand-updated) + this-browser counters */
  function stats(el, cfg){
    el.innerHTML='';
    const pub = cfg.public||{};
    const g = h('div',{class:'grid g4'});
    const card = (label, val, note) => h('div',{class:'card stat'}, h('span',{},label), h('b',{},val), note?h('div',{class:'small muted'},note):null);
    g.append(card('MRR (public)', money(pub.mrr||0), 'hand-updated'));
    g.append(card('Sponsors', String(pub.sponsors||0), 'paid slots live'));
    g.append(card('Launched', pub.launched||'2026-10-09', ''));
    (cfg.local||[]).forEach(([label,ev]) => g.append(card(label+' (you)', String(count(cfg.product, ev)), 'this browser only')));
    const cv = h('canvas',{class:'chart'});
    el.append(g, h('div',{class:'card',style:'margin-top:14px'}, h('div',{class:'mono small muted'}, 'Revenue by month (public, honest: starts at $0)'), cv));
    requestAnimationFrame(()=>chart(cv, (pub.history||[{l:'Oct',v:0}]), {fmt:money}));
    if (cfg.log) el.append(h('div',{class:'card',style:'margin-top:14px'}, h('div',{class:'mono small muted'},'Build log'),
      h('ul',{class:'log'}, ...cfg.log.map(([d,t])=>h('li',{},h('time',{},d),t)))));
  }

  /* One-click support/upgrade CTA (Venmo, honest copy) */
  function upgrade(el, cfg){
    el.append(h('a',{class:'btn primary big',href:`${LINKS.venmo}?txn=pay&amount=${cfg.amount||5}&note=${encodeURIComponent(cfg.note||'Support')}`,target:'_blank',rel:'noopener'},
      cfg.label || `★ Support - ${money(cfg.amount||5)} via Venmo`));
  }

  window.Lab = { LINKS, h, $, store, money, toast, chrome, track, count, sponsors, board, chart, stats, upgrade };
})();

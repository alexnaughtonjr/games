/* Podcast to Playable engine: pure client-side text analysis. No AI and no upload; the transcript never leaves the browser. */
window.P2P = (function(){
  const STOP = new Set('a about above after again against all am an and any are as at be because been before being below between both but by can could did do does doing down during each few for from further had has have having he her here hers herself him himself his how i if in into is it its itself just like me more most my myself no nor not now of off on once only or other our ours out over own really right same she should so some such than that thats the their theirs them then there these they this those through to too under until up very was we were what when where which while who whom why will with would you your yours yeah okay gonna kind sort thing things know mean think going get got lot actually um uh dont im youre its well also one two way much even still something someone anything every people time say said'.split(' '));
  function clean(raw){
    // strip SRT/VTT numbering + timestamps, keep "[mm:ss]" markers for chapters
    const chapters = []; let out = [];
    raw.replace(/\r/g,'').split('\n').forEach(line => {
      const ts = line.match(/^(\d{1,2}:)?(\d{1,2}):(\d{2})[.,]\d{3}\s*-->/);
      if (ts) { out.push(`[[${(ts[1]||'').replace(':','')?ts[1]:''}${ts[2]}:${ts[3]}]]`); return; }
      if (/^\d+$/.test(line.trim()) || /^WEBVTT/.test(line)) return;
      out.push(line);
    });
    return out.join('\n');
  }
  function analyze(raw){
    const text = clean(raw);
    const speakers = {}; let lastTs = '0:00';
    const sentences = [];
    text.split('\n').forEach(line => {
      const ts = line.match(/\[\[([\d:]+)\]\]/) || line.match(/^\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s/); if (ts) lastTs = ts[1];
      line = line.replace(/\[\[[\d:]+\]\]/g,'').replace(/^\[?\d{1,2}:\d{2}(?::\d{2})?\]?\s*/,'').trim(); if (!line) return;
      let sp = null; const m = line.match(/^([A-Z][\w .'-]{1,24}):\s+(.*)$/); if (m) { sp = m[1].trim(); line = m[2]; speakers[sp] = (speakers[sp]||0)+1; }
      (line.match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g)||[]).forEach(s => { s = s.trim(); if (s.split(/\s+/).length >= 4) sentences.push({s, sp: sp || sentences.at(-1)?.sp || null, ts:lastTs}); });
    });
    // keywords by frequency (words 4+ chars, not stopwords), with bigram boost
    const freq = {}; const words = text.toLowerCase().replace(/\[\[[\d:]+\]\]/g,'').match(/[a-z][a-z'-]{3,}/g) || [];
    words.forEach(w => { w = w.replace(/'s$/,''); if (!STOP.has(w) && !STOP.has(w.replace(/'/g,''))) freq[w] = (freq[w]||0)+1; });
    const keywords = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,30).map(e=>e[0]);
    const kwSet = new Set(keywords.slice(0,15));
    // quote score: punchy length, contains keywords, numbers, contrast words, first-person conviction
    sentences.forEach(o => { const s=o.s, n=s.split(/\s+/).length; let sc = 0;
      sc += n>=8 && n<=28 ? 3 : n<=40 ? 1 : -2;
      sc += (s.toLowerCase().match(/[a-z]+/g)||[]).filter(w=>kwSet.has(w)).length * 1.2;
      if (/\d/.test(s)) sc += 1.5; if (/!/.test(s)) sc += 1; if (/\b(never|always|nobody|everyone|secret|truth|mistake|best|worst|biggest|only)\b/i.test(s)) sc += 2;
      if (/\b(but|instead|actually|turns out)\b/i.test(s)) sc += 1; if (/\b(I|we)\b/.test(s)) sc += .5; if (/\?$/.test(s)) sc -= .5;
      o.score = sc; });
    const quotes = [...sentences].sort((a,b)=>b.score-a.score).filter((q,i,arr)=>arr.findIndex(x=>x.s===q.s)===i).slice(0,8);
    // chapters: first strong sentence after each timestamp change, or every ~N sentences
    const chap = []; let seen = new Set();
    sentences.forEach((o,i) => { if (!seen.has(o.ts) && o.ts!=='0:00' || i===0) { seen.add(o.ts); const kws = (o.s.toLowerCase().match(/[a-z]{4,}/g)||[]).filter(w=>kwSet.has(w)); chap.push({ts:o.ts, title: kws.length ? kws.slice(0,3).map(cap).join(' · ') : o.s.split(/\s+/).slice(0,6).join(' ')+'…'}); } });
    return { sentences, keywords, quotes, speakers:Object.keys(speakers), chapters: chap.slice(0,12) };
  }
  const cap = w => w[0].toUpperCase()+w.slice(1);
  function makeQuiz(a, title){
    const qs = []; const pool = a.keywords.slice(0,25);
    // 1) fill-the-blank from top quotes
    a.quotes.forEach(q => { const ws = (q.s.match(/[A-Za-z][a-z'-]{3,}/g)||[]).filter(w=>pool.includes(w.toLowerCase())); if (!ws.length) return;
      const ans = ws.sort((x,y)=>pool.indexOf(x.toLowerCase())-pool.indexOf(y.toLowerCase()))[0];
      const wrong = shuffle(pool.filter(w=>w!==ans.toLowerCase())).slice(0,3);
      if (wrong.length<3) return;
      qs.push({type:'blank', q: q.s.replace(new RegExp('\\b'+ans+'\\b'), '_____'), a: ans.toLowerCase(), opts: shuffle([ans.toLowerCase(), ...wrong]), sp:q.sp}); });
    // 2) who said it
    if (a.speakers.length >= 2) a.quotes.filter(q=>q.sp).slice(0,4).forEach(q => qs.push({type:'who', q:`"${q.s}"`, a:q.sp, opts: shuffle([...a.speakers].slice(0,4).includes(q.sp)?a.speakers.slice(0,4):[q.sp,...a.speakers.filter(s=>s!==q.sp).slice(0,3)])}));
    return { title: title||'Episode quiz', qs: shuffle(qs).slice(0,8) };
  }
  function shuffle(a){ a=[...a]; for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
  // Share: quiz JSON -> deflate -> base64url in the URL hash. No server.
  async function pack(obj){ const bytes = new TextEncoder().encode(JSON.stringify(obj));
    if (window.CompressionStream) { const cs = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw')); const buf = new Uint8Array(await new Response(cs).arrayBuffer()); return 'z'+b64(buf); }
    return 'j'+b64(bytes); }
  async function unpack(str){ const kind=str[0], bytes=unb64(str.slice(1));
    if (kind==='z') { const ds = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')); return JSON.parse(await new Response(ds).text()); }
    return JSON.parse(new TextDecoder().decode(bytes)); }
  const b64 = u8 => btoa(String.fromCharCode(...u8)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  const unb64 = s => Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')), c=>c.charCodeAt(0));
  return { analyze, makeQuiz, pack, unpack };
})();

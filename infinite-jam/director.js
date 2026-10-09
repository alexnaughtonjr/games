/* Infinite Jam "director": turns free-text prompts into stage parameters with plain rules, no AI and no API bills.
   Each prompt airs for SEG seconds. After every BREAK_EVERY prompts there's a short sponsor break. */
window.Director = (function(){
  const SEG = 20, BREAK_EVERY = 4, BREAK_LEN = 10;
  const base = { text:'ambient warmup', by:'stage', tags:['ambient'], c1:'#1f6feb', c2:'#bc8cff', bg:'#0d1117', pc:'#58a6ff', psize:.12, pvy:0, pvx:0, swirl:.3, speed:1, spike:1.2, fog:.02, city:false, key:0, density:.25, wave:'triangle', bpm:0 };
  const RULES = [
    [/rain|storm|thunder|cloud|grey|gray/, {c1:'#30363d',c2:'#8b949e',bg:'#05070a',pc:'#a5d6ff',pvy:-14,pvx:-2,psize:.07,fog:.04,key:-2,density:.15}],
    [/chill|calm|slow|lofi|sleep|dream/, {speed:.5,density:.12,spike:.7,wave:'sine'}],
    [/hype|fast|rave|party|crazy|energy|drop/, {speed:2,density:.5,spike:3,wave:'square'}],
    [/ocean|sea|wave|water|beach|surf/, {c1:'#0a3d62',c2:'#39c5cf',bg:'#031926',pc:'#a5d6ff',pvy:.6,swirl:.6,spike:.8,key:-3,wave:'sine'}],
    [/fire|flame|lava|volcano|hot|burn/, {c1:'#f85149',c2:'#d29922',bg:'#1a0500',pc:'#f0883e',pvy:3,psize:.18,spike:2.4,speed:1.4,key:2,wave:'sawtooth'}],
    [/space|star|galaxy|cosmic|moon|planet|orbit/, {c1:'#0d1117',c2:'#a371f7',bg:'#000004',pc:'#ffffff',psize:.08,swirl:1.2,fog:.006,spike:.9,key:-5}],
    [/city|tokyo|neon|street|downtown|night/, {c1:'#ff2e88',c2:'#58a6ff',bg:'#07001a',pc:'#ff7bd5',city:true,spike:1.6,key:1}],
    [/love|heart|romance|pink|valentine/, {c1:'#ff7b72',c2:'#ffa7c4',bg:'#1a0410',pc:'#ff9bce',pvy:1.2,psize:.22,spike:.7,key:4,wave:'sine'}],
    [/forest|tree|jungle|green|nature|leaf/, {c1:'#0f5323',c2:'#7ee787',bg:'#020d04',pc:'#d2ff9e',pvy:-1,swirl:.4,fog:.035,key:-1}],
    [/gold|money|rich|sun|summer|yellow/, {c1:'#9e6a03',c2:'#ffdf5d',bg:'#120c00',pc:'#ffd33d',psize:.16,spike:1.8,key:5}],
    [/ice|snow|winter|cold|frozen/, {c1:'#cae8ff',c2:'#ffffff',bg:'#0b1a2a',pc:'#ffffff',pvy:-2,pvx:.5,psize:.14,speed:.6,key:-4,wave:'sine'}],
    [/glitch|cyber|matrix|hack|robot/, {c1:'#238636',c2:'#3fb950',bg:'#000800',pc:'#56d364',pvy:-8,psize:.09,spike:4,wave:'square'}]
  ];
  // Unknown words still get a stable, unique look: hash the text into a palette.
  function hashLook(t){ let h=0; for (const ch of t) h=(h*31+ch.charCodeAt(0))>>>0; const hue=h%360, hue2=(hue+120+(h>>8)%80)%360;
    return { c1:`hsl(${hue},70%,35%)`, c2:`hsl(${hue2},85%,65%)`, bg:`hsl(${hue},40%,5%)`, pc:`hsl(${hue2},90%,80%)`, spike:.8+((h>>4)%30)/10, swirl:((h>>6)%10)/10, key:(h%12)-6 }; }
  function parse(text){
    const t = text.toLowerCase(); let look = {}, tags = [];
    RULES.forEach(([re, v]) => { const m = t.match(re); if (m) { look = {...look, ...v}; tags.push(m[0]); } });
    if (!tags.length) { look = hashLook(t); tags = ['remix']; }
    const bpm = t.match(/(\d{2,3})\s*bpm/); if (bpm) look.bpm = Math.max(60, Math.min(180, +bpm[1]));
    return {...base, ...look, text, tags};
  }
  const api = { state:{...base}, queue:[], history:[{...base}], onChange:()=>{}, onBreak:()=>{} };
  const AUTOPLAY = ['neon rain over tokyo','deep ocean at night','gold summer sunrise','galaxy lofi dream','forest storm','frozen glitch city','fire rave drop'];
  let aired = 0, auto = 0, breaks = 0;
  api.enqueue = (text, by) => { api.queue.push({text: String(text).slice(0,80), by}); };
  function airNext(){
    let p = api.queue.shift(); if (!p) p = {text: AUTOPLAY[auto++ % AUTOPLAY.length], by:'autopilot'};
    api.state = {...parse(p.text), by:p.by}; api.history.push(api.state); aired++; api.onChange(api.state);
    setTimeout(() => { if (aired % BREAK_EVERY === 0) { api.onBreak(true, breaks); setTimeout(()=>{ api.onBreak(false, breaks++); airNext(); }, BREAK_LEN*1000); } else airNext(); }, SEG*1000);
  }
  api.start = () => airNext();
  api.parse = parse;
  return api;
})();

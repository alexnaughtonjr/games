/* Live Arcade transport: PeerJS (WebRTC via the free public PeerJS broker) with a BroadcastChannel
   fallback so two tabs on one machine always work. Host = 1 peer, controllers connect to it. */
window.LANet = (function(){
  const PREFIX = 'alexarcade-';
  function host(code, onMsg, onStatus){
    const conns = new Map(); const bc = new BroadcastChannel(PREFIX+code);
    bc.onmessage = e => { const m = e.data; if (m.to === 'host') onMsg(m.msg, (out)=>bc.postMessage({to:m.msg.id, msg:out})); };
    let peer = null;
    try {
      peer = new Peer(PREFIX+code, {debug:0});
      peer.on('open', () => onStatus('online'));
      peer.on('error', err => onStatus(err.type==='unavailable-id' ? 'code-taken' : 'local-only'));
      peer.on('connection', c => { c.on('data', msg => { if (msg && msg.id) conns.set(msg.id, c); onMsg(msg, out => c.open && c.send(out)); }); });
    } catch(e){ onStatus('local-only'); }
    return { send(id, msg){ const c = conns.get(id); if (c && c.open) c.send(msg); else bc.postMessage({to:id, msg}); }, close(){ bc.close(); peer && peer.destroy(); } };
  }
  function client(code, id, onMsg, onStatus){
    const bc = new BroadcastChannel(PREFIX+code); let conn = null, mode = 'connecting';
    bc.onmessage = e => { if (e.data.to === id) onMsg(e.data.msg); };
    try {
      const peer = new Peer(undefined, {debug:0});
      peer.on('open', () => { conn = peer.connect(PREFIX+code, {reliable:false}); conn.on('open', () => { mode='p2p'; onStatus('p2p'); }); conn.on('data', onMsg); conn.on('close', ()=>{ mode='local'; onStatus('local'); }); });
      peer.on('error', () => { if (mode!=='p2p') { mode='local'; onStatus('local'); } });
    } catch(e){ mode='local'; onStatus('local'); }
    setTimeout(() => { if (mode==='connecting') { mode='local'; onStatus('local'); } }, 7000);
    return { send(msg){ if (conn && conn.open) conn.send(msg); bc.postMessage({to:'host', msg}); }, get mode(){ return mode; } };
  }
  return { host, client };
})();

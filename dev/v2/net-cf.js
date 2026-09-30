/* Fischerdock – Cloudflare network layer. Provides window.claude.use("room"|"db"|"user") backed by the Worker. */
(()=>{
  const LS=(k,v)=>{ try{ if(v===undefined) return localStorage.getItem(k); localStorage.setItem(k,v) }catch(e){ return null } };
  let TOKEN=LS("fd-token"); if(!TOKEN||TOKEN.length<20){ const a=new Uint8Array(24); crypto.getRandomValues(a); TOKEN=[...a].map(b=>b.toString(16).padStart(2,"0")).join(""); LS("fd-token",TOKEN) }
  const idP=crypto.subtle.digest("SHA-256",new TextEncoder().encode(TOKEN)).then(h=>[...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,"0")).join("").slice(0,16));
  async function api(path,opt={}){ const r=await fetch(path,{...opt,headers:{"authorization":"Bearer "+TOKEN,"content-type":"application/json"}});
    if(!r.ok){ const e=new Error("HTTP "+r.status); e.code=r.status===400?"invalid_argument":"http"; throw e } return r.status===204?null:r.json() }
  const boardListeners=new Set();
  function makeRoom(){
    let ws=null, peersCb=null, connCb=null, myPres=null, retry=0; const peers=new Map();
    const P=(peer,by,p)=>({peer,by,presence:p||{},sameTab:false,isMe:false});
    const emit=(joined,updated,left)=>{ if(peersCb) peersCb({peers:[...peers.values()],joined,updated,left}) };
    function connect(){
      ws=new WebSocket((location.protocol==="https:"?"wss://":"ws://")+location.host+"/ws");
      ws.onopen=()=>{ retry=0; ws.send(JSON.stringify({t:"auth",token:TOKEN})) };
      ws.onmessage=e=>{ let m; try{ m=JSON.parse(e.data) }catch(_){ return }
        if(m.t==="hello"){ peers.clear(); const joined=m.peers.map(x=>{ const q=P(x.peer,x.by,x.p); peers.set(x.peer,q); return q }); if(connCb) connCb(true); if(myPres) ws.send(JSON.stringify({t:"p",p:myPres})); emit(joined,[],[]) }
        else if(m.t==="j"){ const q=P(m.peer,m.by,m.p); peers.set(m.peer,q); emit([q],[],[]) }
        else if(m.t==="u"){ let q=peers.get(m.peer); if(q){ q.presence=m.p||{}; emit([],[q],[]) } }
        else if(m.t==="l"){ const q=peers.get(m.peer); if(q){ peers.delete(m.peer); emit([],[],[q]) } }
        else if(m.t==="board"){ boardListeners.forEach(f=>f()) } };
      ws.onclose=()=>{ if(connCb) connCb(false); if(peers.size){ const left=[...peers.values()]; peers.clear(); emit([],[],left) } setTimeout(connect,Math.min(15000,800*2**retry++)) };
    }
    return {
      presence(p){ myPres=p; if(ws&&ws.readyState===1) ws.send(JSON.stringify({t:"p",p})); return Promise.resolve() },
      onPeers(cb){ peersCb=cb; if(!ws) connect(); return ()=>{ peersCb=null } },
      onConnection(cb){ connCb=cb; if(ws) cb(ws.readyState===1); return ()=>{ connCb=null } },
    };
  }
  let boardTimer=0;
  const db={
    collection(){ const q={ orderBy(){ return q }, limit(){ return q }, onSnapshot(cb,err){
      const load=()=>api("/api/board").then(rows=>cb({docs:rows.map(r=>({id:r.id,data:()=>r.d}))})).catch(e=>err&&err(e));
      const soon=()=>{ clearTimeout(boardTimer); boardTimer=setTimeout(load,1500) };
      load(); boardListeners.add(soon); const iv=setInterval(load,90000); return ()=>{ boardListeners.delete(soon); clearInterval(iv) } } }; return q },
    doc(path){ return {
      async get(){ if(/^data\/users\/[^/]+\/save$/.test(path)){ const r=await api("/api/save"); return {exists:!!r,data:()=>r} } return {exists:false,data:()=>null} },
      async set(obj){ const body=JSON.stringify(obj); if(/^data\/users\//.test(path)) return api("/api/save",{method:"PUT",body}); if(/^board\//.test(path)) return api("/api/board",{method:"PUT",body}) } } },
  };
  const user={ async me(){ return {id:await idP,name:""} }, async profiles(){ return {} }, async can(){ return true } };
  let room=null;
  window.claude={ use:async k=>{ if(k==="room") return room||(room=makeRoom()); if(k==="db") return db; if(k==="user") return user; throw new Error("unknown capability "+k) } };
})();

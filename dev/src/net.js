/* Fischerdock v3 – Cloudflare network layer: accounts (name + password), presence room, global world state, board, cloud saves.
   Exposes window.FDNET (accounts) and window.claude.use("room"|"db"|"user") for the game. */
(()=>{
  const LS=(k,v)=>{ try{ if(v===undefined) return localStorage.getItem(k); if(v===null) localStorage.removeItem(k); else localStorage.setItem(k,v) }catch(e){ return null } };
  let TOKEN=LS("fd3-token")||"", ME=null;
  const online=location.protocol.startsWith("http");
  async function api(path,opt={}){ const r=await fetch(path,{...opt,headers:{"authorization":"Bearer "+TOKEN,"content-type":"application/json"}});
    let d=null; try{ d=r.status===204?null:await r.json() }catch(e){}
    if(!r.ok){ const e=new Error((d&&d.error)||("HTTP "+r.status)); e.status=r.status; e.code=r.status===400?"invalid_argument":"http"; throw e } return d }
  const boardListeners=new Set();
  const gwListeners=new Set(), sysListeners=new Set(), admListeners=new Set();
  let clockSkew=0;
  const FDNET={
    online, get me(){ return ME }, get token(){ return TOKEN },
    now:()=>Date.now()+clockSkew,
    async resume(){ if(!online||!TOKEN) return null; try{ ME=await api("/api/me"); return ME }catch(e){ if(e.status===401){ TOKEN=""; LS("fd3-token",null) } return null } },
    async auth(kind,name,pass){ const d=await api("/api/"+kind,{method:"POST",body:JSON.stringify({name,pass})}); TOKEN=d.token; LS("fd3-token",TOKEN); LS("fd3-lastname",d.name); ME={id:d.id,name:d.name,admin:d.admin}; return ME },
    async logout(){ try{ await api("/api/logout",{method:"POST"}) }catch(e){} TOKEN=""; ME=null; LS("fd3-token",null) },
    lastName:()=>LS("fd3-lastname")||"",
    onGW(cb){ gwListeners.add(cb) }, onSys(cb){ sysListeners.add(cb) }, onAdmin(cb){ admListeners.add(cb) },
    send(o){ if(room&&room._ws&&room._ws.readyState===1){ room._ws.send(JSON.stringify(o)); return true } return false },
    async fetchGW(){ if(!online) return null; try{ const d=await api("/api/gw"); clockSkew=d.now-Date.now(); gwListeners.forEach(f=>f(d.gw,null)); return d.gw }catch(e){ return null } },
  };
  window.FDNET=FDNET;
  let room=null;
  function makeRoom(){
    let ws=null, peersCb=null, connCb=null, myPres=null, retry=0, dead=false; const peers=new Map();
    const P=(peer,by,name,p)=>({peer,by,name,presence:p||{},sameTab:false,isMe:false});
    const emit=(joined,updated,left)=>{ if(peersCb) peersCb({peers:[...peers.values()],joined,updated,left}) };
    const R={};
    function connect(){
      if(dead||!TOKEN) return;
      ws=R._ws=new WebSocket((location.protocol==="https:"?"wss://":"ws://")+location.host+"/ws");
      ws.onopen=()=>{ retry=0; ws.send(JSON.stringify({t:"auth",token:TOKEN})) };
      ws.onmessage=e=>{ let m; try{ m=JSON.parse(e.data) }catch(_){ return }
        if(m.t==="hello"){ clockSkew=(m.now||Date.now())-Date.now(); peers.clear(); const joined=m.peers.map(x=>{ const q=P(x.peer,x.by,x.name,x.p); peers.set(x.peer,q); return q }); if(connCb) connCb(true); if(myPres) ws.send(JSON.stringify({t:"p",p:myPres}));
          if(ME) ME.admin=!!m.admin; admListeners.forEach(f=>f(!!m.admin,true)); gwListeners.forEach(f=>f(m.gw,null)); emit(joined,[],[]) }
        else if(m.t==="j"){ const q=P(m.peer,m.by,m.name,m.p); peers.set(m.peer,q); emit([q],[],[]) }
        else if(m.t==="u"){ let q=peers.get(m.peer); if(q){ q.presence=m.p||{}; emit([],[q],[]) } }
        else if(m.t==="l"){ const q=peers.get(m.peer); if(q){ peers.delete(m.peer); emit([],[],[q]) } }
        else if(m.t==="board"){ boardListeners.forEach(f=>f()) }
        else if(m.t==="gw"){ if(m.now) clockSkew=m.now-Date.now(); gwListeners.forEach(f=>f(m.gw,m.by||null)) }
        else if(m.t==="sys"){ sysListeners.forEach(f=>f(m.text,m.by)) }
        else if(m.t==="adm"){ if(ME) ME.admin=!!m.ok; admListeners.forEach(f=>f(!!m.ok,false)) }
        else if(m.t==="kicked"){ dead=true; sysListeners.forEach(f=>f("Du hast dich an einem anderen Gerät angemeldet. Diese Sitzung ist jetzt offline.","System")) }
        else if(m.t==="denied"){ dead=true } };
      ws.onclose=()=>{ if(connCb) connCb(false); if(peers.size){ const left=[...peers.values()]; peers.clear(); emit([],[],left) } if(!dead) setTimeout(connect,Math.min(15000,800*2**retry++)) };
    }
    Object.assign(R,{
      presence(p){ myPres=p; if(ws&&ws.readyState===1) ws.send(JSON.stringify({t:"p",p})); return Promise.resolve() },
      onPeers(cb){ peersCb=cb; if(!ws) connect(); return ()=>{ peersCb=null } },
      onConnection(cb){ connCb=cb; if(ws) cb(ws.readyState===1); return ()=>{ connCb=null } },
    });
    return R;
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
  const user={ async me(){ return ME?{id:ME.id,name:ME.name}:{id:null,name:""} }, async profiles(){ return {} }, async can(){ return true } };
  window.claude={ use:async k=>{ if(!ME) throw new Error("offline"); if(k==="room") return room||(room=makeRoom()); if(k==="db") return db; if(k==="user") return user; throw new Error("unknown capability "+k) } };
})();

/* ============================ GAME: player, fishing, shadows, UI, audio, multiplayer ============================ */
const fwd=a=>({x:Math.sin(a),z:Math.cos(a)});
function toast(text,color="#fff"){ const d=document.createElement("div"); d.className="toast"; d.style.setProperty("--c",color); d.textContent=text; const f=$("feed"); f.prepend(d);
  while(f.children.length>5) f.lastChild.remove(); setTimeout(()=>d.classList.add("fade"),5000); setTimeout(()=>d.remove(),5700) }
let bigTimer=0; function bigMsg(t,s,col){ $("bigT").textContent=t; $("bigS").textContent=s||""; $("bigT").style.color=col||"var(--gold)"; const el=$("bigmsg"); el.classList.add("on"); clearTimeout(bigTimer); bigTimer=setTimeout(()=>el.classList.remove("on"),2600) }
function flash(col="#ffffff"){ const f=$("flash"); f.style.background=col; f.classList.remove("on"); void f.offsetWidth; f.classList.add("on") }
let bannerTimer=0; function banner(t,s){ $("bannerT").textContent=t; $("bannerS").textContent=s||""; const b=$("banner"); b.classList.add("on"); clearTimeout(bannerTimer); bannerTimer=setTimeout(()=>b.classList.remove("on"),3200) }

/* ---------- audio ---------- */
const AU={ctx:null,master:null,music:null,sfx:null,amb:null,rainG:null,nextNote:0,step:0};
function initAudio(){ if(AU.ctx) return; try{ const C=new (window.AudioContext||window.webkitAudioContext)(); AU.ctx=C;
  AU.master=C.createGain(); AU.master.gain.value=0.9; AU.master.connect(C.destination);
  AU.music=C.createGain(); AU.music.gain.value=S.settings.music?0.16:0; AU.music.connect(AU.master);
  AU.sfx=C.createGain(); AU.sfx.gain.value=S.settings.sfx?0.7:0; AU.sfx.connect(AU.master);
  AU.amb=C.createGain(); AU.amb.gain.value=S.settings.sfx?0.22:0; AU.amb.connect(AU.master);
  const len=C.sampleRate*3, buf=C.createBuffer(1,len,C.sampleRate), d=buf.getChannelData(0); let last=0; for(let i=0;i<len;i++){ const w=Math.random()*2-1; last=(last+0.02*w)/1.02; d[i]=last*3.2 }
  AU.noise=buf; const src=C.createBufferSource(); src.buffer=buf; src.loop=true; const lp=C.createBiquadFilter(); lp.type="lowpass"; lp.frequency.value=520; const g=C.createGain(); g.gain.value=0.7;
  const lfo=C.createOscillator(); lfo.frequency.value=0.12; const lg=C.createGain(); lg.gain.value=0.35; lfo.connect(lg); lg.connect(g.gain); lfo.start(); src.connect(lp); lp.connect(g); g.connect(AU.amb); src.start();
  const wn=C.createBuffer(1,C.sampleRate*2,C.sampleRate), wd=wn.getChannelData(0); for(let i=0;i<wd.length;i++) wd[i]=Math.random()*2-1; AU.white=wn;
  const rs=C.createBufferSource(); rs.buffer=wn; rs.loop=true; const hp=C.createBiquadFilter(); hp.type="highpass"; hp.frequency.value=2500; AU.rainG=C.createGain(); AU.rainG.gain.value=0; rs.connect(hp); hp.connect(AU.rainG); AU.rainG.connect(AU.amb); rs.start();
  const dl=C.createDelay(); dl.delayTime.value=0.38; const fb=C.createGain(); fb.gain.value=0.35; const wet=C.createGain(); wet.gain.value=0.4; AU.echoIn=C.createGain(); AU.echoIn.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(AU.music); AU.echoIn.connect(AU.music);
  AU.nextNote=C.currentTime+0.5 }catch(e){ AU.ctx=null } }
function tone(freq,dur,type="sine",vol=0.2,when=0,dest=null,slide=0){ const C=AU.ctx; if(!C) return; const t=C.currentTime+when; const o=C.createOscillator(), g=C.createGain(); o.type=type; o.frequency.setValueAtTime(freq,t); if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(30,freq*slide),t+dur);
  g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(vol,t+0.012); g.gain.exponentialRampToValueAtTime(0.0001,t+dur); o.connect(g); g.connect(dest||AU.sfx); o.start(t); o.stop(t+dur+0.05) }
function noiseHit(dur,freq,vol=0.3,type="lowpass",when=0,q=1){ const C=AU.ctx; if(!C) return; const t=C.currentTime+when; const s=C.createBufferSource(); s.buffer=AU.white; const f=C.createBiquadFilter(); f.type=type; f.frequency.setValueAtTime(freq,t); f.Q.value=q; const g=C.createGain();
  g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.0001,t+dur); s.connect(f); f.connect(g); g.connect(AU.sfx); s.start(t); s.stop(t+dur+0.05); return f }
const SFX={
  cast(){ const f=noiseHit(0.35,400,0.25,"bandpass",0,2); if(f) f.frequency.exponentialRampToValueAtTime(2400,AU.ctx.currentTime+0.3) },
  splash(p=1){ noiseHit(0.45,900,0.35*p); noiseHit(0.2,2500,0.12*p,"highpass") },
  bite(r=0,v=1){ const T=(f,d,ty,vo,w,sl)=>tone(f,d,ty,vo*v,w||0,null,sl||0);
    if(r<=1){ T(620,0.09,"sine",0.22); T(880,0.12,"sine",0.2,0.08); return }
    if(r===2){ T(660,0.09,"sine",0.22); T(880,0.1,"sine",0.2,0.07); T(1175,0.16,"sine",0.16,0.14); return }
    if(r===3){ T(988,0.5,"sine",0.2); T(1480,0.6,"sine",0.12,0.04); T(1976,0.4,"sine",0.06,0.08); return }
    if(r===4){ [784,988,1175,1568].forEach((f,i)=>T(f,0.35,"triangle",0.15,i*0.06)); T(2349,0.7,"sine",0.08,0.26); noiseHit(0.5,6000,0.05*v,"highpass",0.2); return }
    if(r===5){ [523,659,784,1047].forEach(f=>{ T(f,0.9,"triangle",0.08); T(f*1.006,0.9,"sine",0.06) }); T(400,0.5,"sine",0.12,0,2.6); [1319,1568,2093].forEach((f,i)=>T(f,0.4,"sine",0.07,0.3+i*0.07)); return }
    if(r===6){ const sc=[523,587,659,784,880,1047,1175,1319,1568,1760,2093]; sc.forEach((f,i)=>T(f,0.3,"sine",0.1,i*0.035)); T(2637,1,"triangle",0.06,0.4); noiseHit(0.8,7000,0.06*v,"highpass",0.3); return }
    if(r===7){ T(110,1.4,"sawtooth",0.1,0,0.5); T(2637,1.2,"sine",0.05,0.1); T(2793,1.2,"sine",0.05,0.1); T(3322,0.6,"sine",0.04,0.5); return }
    if(r===8||r===9){ T(70,1.2,"sine",0.35,0,0.5); noiseHit(0.7,300,0.35*v); [196,247,294,392].forEach(f=>T(f,1.1,"sawtooth",0.05,0.05)); T(784,0.8,"triangle",0.08,0.4); return }
    [523,659,784,1047,1319].forEach((f,i)=>{ T(f,2.2,"sine",0.07,i*0.05); T(f*1.004,2.2,"sine",0.05,i*0.05); T(f*0.996,2.2,"triangle",0.03,i*0.05) }); T(2093,1.5,"sine",0.1,0.5); T(3136,1.2,"sine",0.05,0.7); noiseHit(1.5,9000,0.05*v,"highpass",0.4) },
  thunder(d=300){ const v=clamp(1.4-d/500,0.25,1); noiseHit(2.2,180,0.5*v,"lowpass",d/340); noiseHit(0.4,900,0.25*v,"lowpass",d/340); tone(45,1.6,"sine",0.3*v,d/340,null,0.6) },
  tick(){ tone(1800+Math.random()*300,0.025,"square",0.03) },
  catch(r){ const base=[523,587,659,784,880,988,1047,1175,1319]; const n=3+Math.min(5,r); for(let i=0;i<n;i++) tone(base[i],0.35,"triangle",0.16,i*0.075); if(r>=4) tone(base[n]*2,0.8,"sine",0.12,n*0.075) },
  coin(){ tone(1319,0.09,"square",0.07); tone(1760,0.18,"square",0.07,0.07) },
  level(){ [523,659,784,1047].forEach((f,i)=>tone(f,0.5,"triangle",0.16,i*0.1)); tone(1568,0.9,"sine",0.1,0.42) },
  quest(){ [784,988,1175,1568].forEach((f,i)=>tone(f,0.3,"triangle",0.14,i*0.08)) },
  fail(){ tone(420,0.35,"sawtooth",0.08,0,null,0.5) },
  ui(){ tone(900,0.04,"sine",0.08) },
  jump(){ tone(380,0.15,"sine",0.08,0,null,1.8) },
  boat(){ noiseHit(0.5,300,0.2); tone(110,0.4,"sawtooth",0.05,0,null,1.5) },
  chest(){ [659,784,988,1319,1568].forEach((f,i)=>tone(f,0.4,"triangle",0.13,i*0.07)); noiseHit(0.3,1800,0.1,"highpass",0.35) },
  portal(){ noiseHit(1.6,200,0.4); tone(90,1.8,"sine",0.18,0,null,4); tone(220,1.4,"triangle",0.08,0.2,null,3) },
  relic(){ [880,1175,1480,1760].forEach((f,i)=>tone(f,0.6,"sine",0.12,i*0.09)) },
  enchant(){ for(let i=0;i<8;i++) tone(400+i*140,0.5,"triangle",0.08,i*0.06); tone(1760,1.2,"sine",0.12,0.55) },
};
const SCALE_DAY=[0,2,4,7,9,12,14,16], SCALE_NIGHT=[0,3,5,7,10,12,15,17];
function musicTick(){ const C=AU.ctx; if(!C||!S.settings.music) return; const W=world(); const bpm=W.day?96:72, beat=60/bpm/2;
  while(AU.nextNote<C.currentTime+0.2){ const st=AU.step++; const sc=W.day?SCALE_DAY:SCALE_NIGHT; const root=W.day?261.63:220;
    const when=AU.nextNote-C.currentTime;
    if(st%16===0){ const chord=[[0,4,7],[5,9,12],[7,11,14],[9,12,16]][(st/16|0)%4]; chord.forEach(n=>tone(root/2*Math.pow(2,n/12),beat*14,"sine",0.05,when,AU.music)) }
    if(Math.random()<(W.day?0.55:0.35)){ const n=sc[Math.floor(Math.random()*sc.length)]; tone(root*Math.pow(2,n/12),0.5,"triangle",0.06,when,AU.echoIn) }
    AU.nextNote+=beat }
}

/* ---------- player ---------- */
const MOOSE=ISLBY["Moosewood"];
const myColor=(()=>{ try{ const c=localStorage.getItem("fd-col"); if(c) return c }catch(e){} const hues=[200,12,140,280,45,330,170]; const c=`hsl(${hues[Math.floor(Math.random()*hues.length)]}, 62%, 50%)`; try{localStorage.setItem("fd-col",c)}catch(e){} return c })();
const me=makeCharacter({shirt:new THREE.Color().setStyle(myColor).getHexString().replace(/^/,"#"),hat:"cap",rod:true,backpack:true,skin:SKINS[hashStr(myColor)%SKINS.length]}); scene.add(me.group); setRodLook(me,S.rod);
let boats=[]; function makeMyBoats(){ boats.forEach(b=>b&&scene.remove(b)); boats=[null,...BOATS.slice(1).map(b=>makeBoat(b.id))]; boats.forEach(b=>{ if(b){ b.visible=false; scene.add(b) } }) } makeMyBoats();
const pl={x:0,z:0,y:2,vy:0,ry:0,boat:false,boatSpeed:0,swim:false,walkT:0,moving:false,grounded:true};
const cam={yaw:0,pitch:0.34,dist:TOUCH?28:24,x:0,y:10,z:0};
let curSea=1; const seaC=s=>s===2?SEA2X:0, seaR=s=>s===2?SEA2_R:SEA1_R;
let mBoost=false;
function spawnHome(){ const D=MOOSE.dock; pl.x=D.ex-Math.cos(D.ang)*5; pl.z=D.ez-Math.sin(D.ang)*5; pl.y=groundAt(pl.x,pl.z); pl.ry=Math.PI/2-D.ang; pl.boat=false; cam.yaw=pl.ry }

/* ---------- input ---------- */
const keys={}; let rmb=false, mx=innerWidth/2, my=innerHeight/2, lastMX=0, lastMY=0;
const typing=()=>document.activeElement&&(document.activeElement.tagName==="INPUT");
const modalOpen=()=>$("modal").classList.contains("on");
addEventListener("keydown",e=>{
  if(typing()) return; initAudio();
  if(modalOpen()){ if(e.key==="Escape"||["i","j","q","g","m","p"].includes(e.key.toLowerCase())) closeModal(); return }
  if(e.key==="Shift") keys.shift=true;
  const k=e.key.toLowerCase(); keys[k]=true;
  if(e.key==="Escape"){ cancelFishing(); return }
  if(e.key==="Enter"){ $("chatin").focus(); e.preventDefault(); return }
  if(e.code==="Space"){ e.preventDefault(); if(e.repeat) return; if(F.state==="reel"&&F.reel){ F.reel.hold=true } else if(F.state==="lure"&&!F.target){ shake() } else if(F.state==="idle") jump(); return }
  if(e.repeat) return;
  ({b:toggleBoat,e:interact,h:toggleHold,r:toggleRadar,i:()=>openModal("bag"),j:()=>openModal("dex"),q:()=>openModal("quests"),g:()=>openModal("gear"),m:()=>openModal("map"),p:()=>openModal("players")})[k]?.();
  if(["arrowup","arrowdown","arrowleft","arrowright"].includes(k)) e.preventDefault();
});
addEventListener("keyup",e=>{ keys[e.key.toLowerCase()]=false; if(e.code==="Space"&&F.reel) F.reel.hold=false });
addEventListener("blur",()=>{ for(const k in keys) keys[k]=false; if(F.reel) F.reel.hold=false });
canvas.addEventListener("contextmenu",e=>e.preventDefault());
/* touch: canvas = camera (drag) + pinch zoom + tap-to-cast; floating joystick on the left; big action buttons on the right */
const touches=new Map(); let pinch=null; const capP=(el,id)=>{ try{ el.setPointerCapture(id) }catch(_){} };
canvas.addEventListener("pointerdown",e=>{ initAudio(); mx=e.clientX; my=e.clientY;
  if(e.pointerType==="touch"){ capP(canvas,e.pointerId); touches.set(e.pointerId,{x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,t:performance.now()});
    if(touches.size===2){ const [a,b]=[...touches.values()]; pinch={d:Math.hypot(a.x-b.x,a.y-b.y)||1,dist:cam.dist} }
    if(F.state==="reel"&&F.reel) F.reel.hold=true; else if(F.state==="lure"&&!F.target) shake(); return }
  if(e.button===2){ rmb=true; lastMX=e.clientX; lastMY=e.clientY; capP(canvas,e.pointerId); return }
  if(e.button===0){ if(F.state==="reel"&&F.reel) F.reel.hold=true; else if(F.state==="idle") startCharge() }
});
canvas.addEventListener("pointermove",e=>{ mx=e.clientX; my=e.clientY;
  const T=touches.get(e.pointerId); if(T){ const dx=e.clientX-T.x, dy=e.clientY-T.y; T.x=e.clientX; T.y=e.clientY;
    if(pinch&&touches.size>=2){ const [a,b]=[...touches.values()]; cam.dist=clamp(pinch.dist*pinch.d/Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),10,70); return }
    cam.yaw-=dx*0.0075; cam.pitch=clamp(cam.pitch+dy*0.006,0.05,1.3); return }
  if(rmb){ cam.yaw-=(e.clientX-lastMX)*0.006; cam.pitch=clamp(cam.pitch+(e.clientY-lastMY)*0.005,0.05,1.3); lastMX=e.clientX; lastMY=e.clientY }
});
function touchEnd(e){ const T=touches.get(e.pointerId); if(!T) return false; touches.delete(e.pointerId); if(touches.size<2) pinch=null;
  if(F.reel&&!fishHeld) F.reel.hold=touches.size>0;
  if(e.type==="pointerup"&&performance.now()-T.t<260&&Math.hypot(T.x-T.sx,T.y-T.sy)<12&&F.state==="idle"&&!pl.swim&&!(pl.boat&&Math.abs(pl.boatSpeed)>3)){
    mx=T.x; my=T.y; const A=aimPoint(); if(A&&A.water){ startCharge(); if(F.state==="charge"){ F.power=0.72; releaseCast() } } }
  return true }
addEventListener("pointerup",e=>{ if(touchEnd(e)) return; if(e.button===2) rmb=false; if(e.button===0){ if(F.state==="charge"&&!F.auto) releaseCast(); if(F.reel&&!fishHeld) F.reel.hold=false } });
addEventListener("pointercancel",e=>{ touchEnd(e) });
canvas.addEventListener("wheel",e=>{ cam.dist=clamp(cam.dist+e.deltaY*0.02,8,70); e.preventDefault() },{passive:false});
const joy={x:0,y:0,id:null,ox:0,oy:0}; const joyEl=$("joy"), knob=joyEl.firstElementChild, joyZone=$("joyZone");
joyZone.addEventListener("pointerdown",e=>{ initAudio(); $("joyHint").style.display="none"; joy.id=e.pointerId; capP(joyZone,e.pointerId); joy.ox=e.clientX; joy.oy=e.clientY; joyEl.style.left=(e.clientX-62)+"px"; joyEl.style.top=(e.clientY-62)+"px"; joyEl.classList.add("on"); joyMove(e); e.preventDefault() });
joyZone.addEventListener("pointermove",e=>{ if(e.pointerId===joy.id) joyMove(e) });
const joyEnd=e=>{ if(e.pointerId!==joy.id) return; joy.id=null; joy.x=joy.y=0; knob.style.transform=""; joyEl.classList.remove("on") }; joyZone.addEventListener("pointerup",joyEnd); joyZone.addEventListener("pointercancel",joyEnd);
function joyMove(e){ let x=(e.clientX-joy.ox)/56, y=(e.clientY-joy.oy)/56; const m=Math.hypot(x,y); if(m>1){ joy.ox+=(x/m)*(m-1)*56*0.35; joy.oy+=(y/m)*(m-1)*56*0.35; x/=m; y/=m } joy.x=x; joy.y=y; knob.style.transform=`translate(${x*40}px,${y*40}px)` }
let fishHeld=false;
const tFish=$("tFish");
tFish.addEventListener("pointerdown",e=>{ e.preventDefault(); e.stopPropagation(); initAudio(); capP(tFish,e.pointerId); fishHeld=true;
  if(F.state==="reel"&&F.reel){ F.reel.hold=true; return } if(F.state==="lure"&&!F.target){ shake(); return } if(F.state==="idle"){ F.auto=true; startCharge(); if(F.state!=="charge") F.auto=false } });
const fishUp=e=>{ fishHeld=false; if(F.state==="charge"&&F.auto) releaseCast(); if(F.reel) F.reel.hold=touches.size>0 };
tFish.addEventListener("pointerup",fishUp); tFish.addEventListener("pointercancel",fishUp);
$("tJump").addEventListener("pointerdown",e=>{ e.preventDefault(); e.stopPropagation(); if(pl.boat){ mBoost=true } else jump() });
$("tJump").addEventListener("pointerup",()=>{ mBoost=false }); $("tJump").addEventListener("pointercancel",()=>{ mBoost=false });
$("tCancel").addEventListener("click",e=>{ e.stopPropagation(); cancelFishing() });
$("tBoat").addEventListener("click",()=>toggleBoat()); $("tUse").addEventListener("click",()=>interact()); $("prompt").addEventListener("click",()=>interact());
$("tMenu").addEventListener("click",()=>{ $("mmenu").classList.toggle("on"); SFX.ui() }); $("mmenu").addEventListener("click",e=>{ if(e.target.id==="mmenu") $("mmenu").classList.remove("on") });
$("tChat").addEventListener("click",()=>{ $("mmenu").classList.remove("on"); $("chat").classList.toggle("open"); if($("chat").classList.contains("open")) $("chatin").focus() });
$("qchip").addEventListener("click",()=>{ $("quests").classList.toggle("open"); SFX.ui() });

/* ---------- aiming ---------- */
const ray=new THREE.Raycaster(), ndc=new THREE.Vector2(), plane0=new THREE.Plane(new THREE.Vector3(0,1,0),0), hit=new THREE.Vector3();
const marker=new THREE.Mesh(new THREE.RingGeometry(0.9,1.25,32),new THREE.MeshBasicMaterial({color:0x7dff8a,transparent:true,opacity:.85,depthWrite:false,side:THREE.DoubleSide})); marker.rotation.x=-Math.PI/2; marker.visible=false; marker.renderOrder=6; scene.add(marker);
const MAXCAST=34, MINCAST=5;
function autoAim(){ const f=fwd(cam.yaw); let best=null,bs=-1e9;
  for(const s of shadows){ if(s.state!=="wander") continue; const dx=s.x-pl.x, dz=s.z-pl.z, d=Math.hypot(dx,dz); if(d<MINCAST+1||d>MAXCAST) continue; const dot=(dx*f.x+dz*f.z)/d; if(dot<0.3) continue; const sc=dot*2+s.ri*0.5-d/MAXCAST; if(sc>bs){ bs=sc; best=s } }
  if(best){ const a=Math.atan2(best.z-pl.z,best.x-pl.x); const x=best.x-Math.cos(a)*1.4, z=best.z-Math.sin(a)*1.4; return {x,z,water:waterAt(x,z)||waterAt(best.x,best.z),shadow:best} }
  for(const d of [18,24,13,30,9]) for(const da of [0,0.3,-0.3,0.65,-0.65,1.1,-1.1]){ const g=fwd(cam.yaw+da); const x=pl.x+g.x*d, z=pl.z+g.z*d; const w=waterAt(x,z); if(w&&(w.kind==="fresh"||terrainAt(x,z)<-0.8)) return {x,z,water:w} }
  const g=fwd(cam.yaw); return {x:pl.x+g.x*18,z:pl.z+g.z*18,water:null} }
function aimPoint(){ if(F.auto) return autoAim(); ndc.set(mx/innerWidth*2-1,-(my/innerHeight)*2+1); ray.setFromCamera(ndc,camera);
  let ok=ray.ray.intersectPlane(plane0,hit); if(!ok) return null; let x=hit.x, z=hit.z;
  const pond=pondAt(x,z); if(pond){ plane0.constant=-pond.y; if(ray.ray.intersectPlane(plane0,hit)){ x=hit.x; z=hit.z } plane0.constant=0 }
  let dx=x-pl.x, dz=z-pl.z, d=Math.hypot(dx,dz); if(d<0.01) return null; const dd=clamp(d,MINCAST,MAXCAST); x=pl.x+dx/d*dd; z=pl.z+dz/d*dd;
  return {x,z,water:waterAt(x,z)} }

/* ---------- boat & movement ---------- */
function toggleBoat(){
  if(F.state!=="idle") return;
  if(pl.boat){ for(let d=2;d<=14;d+=1.5) for(const off of [0,Math.PI/2,-Math.PI/2,Math.PI]){ const f=fwd(pl.ry+off), x=pl.x+f.x*d, z=pl.z+f.z*d; if(groundAt(x,z)>-0.2){ pl.x=x; pl.z=z; pl.y=groundAt(x,z); pl.boat=false; SFX.jump(); pushPresence(true); return } }
    pl.boat=false; toast("Du springst ins Wasser.","#8fd3ff"); SFX.splash(0.6); pushPresence(true); return }
  if(!S.boat){ toast("Du hast noch kein Boot. Folge dem Story-Auftrag, dann bekommst du ein Ruderboot.","#ffb35a"); return }
  const f=fwd(pl.ry); let ok=false;
  for(let d=0;d<=10;d+=2){ const x=pl.x+f.x*d, z=pl.z+f.z*d; if(terrainAt(x,z)<-1.4&&platformAt(x,z)<-50){ pl.x=x; pl.z=z; ok=true; break } }
  if(!ok&&pl.swim) ok=true;
  if(!ok){ toast("Stell dich an tieferes Wasser (Stegende) und schau aufs Meer.","#ffb35a"); return }
  pl.boat=true; pl.boatSpeed=0; SFX.boat(); pushPresence(true);
}
function jump(){ if(pl.boat||pl.swim||!pl.grounded) return; pl.vy=13; pl.grounded=false; SFX.jump() }
let rangeWarnT=0, swimWarnT=0;
function updatePlayer(dt,t){
  const locked=F.state==="reel"||F.state==="bite"||F.state==="show";
  let ix=0,iz=0;
  if(!typing()&&!modalOpen()&&!locked){ if(keys.w||keys.arrowup) iz+=1; if(keys.s||keys.arrowdown) iz-=1; if(keys.a) ix-=1; if(keys.d) ix+=1;
    if(keys.arrowleft) cam.yaw+=dt*2; if(keys.arrowright) cam.yaw-=dt*2; if(joy.id!==null){ ix+=joy.x; iz+=-joy.y } }
  const mag=Math.min(1,Math.hypot(ix,iz));
  if(mag>0.15&&(F.state==="lure"||F.state==="cast")) cancelFishing(true);
  if(pl.boat){
    const B=BOATS[S.boat]; const boost=(keys.shift||mBoost)&&iz>0.1; const turn=pl.boatSpeed>=0?ix:-ix; pl.ry-=turn*dt*1.25*(0.35+Math.min(1,Math.abs(pl.boatSpeed)/15));
    const target=iz>0.1?B.speed*iz*(boost?1.45:1)*ADM.speed:iz<-0.1?-B.speed*0.3:0; pl.boatSpeed=lerp(pl.boatSpeed,target,clamp(dt*(target===0?0.8:1.1),0,1));
    const f=fwd(pl.ry); let nx=pl.x+f.x*pl.boatSpeed*dt, nz=pl.z+f.z*pl.boatSpeed*dt; const dir=Math.sign(pl.boatSpeed||1);
    const px=nx+f.x*dir*5, pz=nz+f.z*dir*5;
    if(terrainAt(px,pz)<-1.2&&platformAt(px,pz)<-50){ const sea=seaAt(nx), cx=seaC(sea);
      if(sea===1&&B.range<5000){ const R=Math.hypot(nx,nz); if(R>B.range){ const k=B.range/R; nx*=k; nz*=k; pl.boatSpeed*=0.5; if(t-rangeWarnT>4){ rangeWarnT=t; toast(`Die See wird zu rau für dein ${B.n}. Ein besseres Boot gibt es in der Werft von Moosewood.`,"#ffb35a") } } }
      const RR=seaR(sea), dd=Math.hypot(nx-cx,nz); if(dd>RR){ const k=RR/dd; nx=cx+(nx-cx)*k; nz*=k; pl.boatSpeed*=0.4; if(t-rangeWarnT>4){ rangeWarnT=t; toast("Hier endet die bekannte See. Dahinter nur Sturm und Nebel.","#ffb35a") } }
      pl.x=nx; pl.z=nz } else { pl.boatSpeed*=-0.25; if(Math.abs(pl.boatSpeed)>4) SFX.splash(0.3) }
    pl.y=waveHeight(pl.x,pl.z,t)+0.55+((boats[S.boat]&&boats[S.boat].userData.seat)||0); pl.swim=false; pl.moving=Math.abs(pl.boatSpeed)>1;
    const sp=Math.abs(pl.boatSpeed); if(sp>8&&Math.random()<dt*(boost?60:30)){ const b=fwd(pl.ry+Math.PI); for(const s of [-1,1]) FX.emit(pl.x+b.x*5+Math.cos(pl.ry)*s*1.8,0.3,pl.z+b.z*5-Math.sin(pl.ry)*s*1.8,(Math.random()-.5)*2+Math.cos(pl.ry)*s*2,2+Math.random()*(boost?4:2),(Math.random()-.5)*2-Math.sin(pl.ry)*s*2,0.7,boost?1:0.7,"#ffffff",-10) }
    if(boost&&sp>20&&Math.random()<dt*20){ const b=fwd(pl.ry+Math.PI); FX.emit(pl.x+b.x*7,0.4,pl.z+b.z*7,(Math.random()-.5)*3,5+Math.random()*3,(Math.random()-.5)*3,0.8,1.3,"#e8f8ff",-14) }
    checkPortals(t);
    return;
  }
  const speed=(pl.swim?9:(keys.shift?22:15))*ADM.speed;
  if(mag>0.1){ const f=fwd(cam.yaw), r={x:-Math.cos(cam.yaw),z:Math.sin(cam.yaw)}; const n=Math.max(1,Math.hypot(ix,iz));
    const mvx=(f.x*iz+r.x*ix)/n, mvz=(f.z*iz+r.z*ix)/n; let nx=pl.x+mvx*speed*mag*dt, nz=pl.z+mvz*speed*mag*dt;
    const c=collide(nx,nz,0.8); nx=c.x; nz=c.z;
    const gNew=groundAt(nx,nz), gNow=Math.max(groundAt(pl.x,pl.z),-1.2);
    if(gNew-gNow<1.4||!pl.grounded){ pl.x=nx; pl.z=nz }
    const want=Math.atan2(mvx,mvz); let d=want-pl.ry; d=Math.atan2(Math.sin(d),Math.cos(d)); pl.ry+=d*clamp(dt*12,0,1); pl.walkT+=dt*(pl.swim?5:10)*mag; pl.moving=true } else pl.moving=false;
  { const cx=seaC(seaAt(pl.x)), RR=seaR(seaAt(pl.x)), dd=Math.hypot(pl.x-cx,pl.z); if(dd>RR){ const k=RR/dd; pl.x=cx+(pl.x-cx)*k; pl.z*=k } }
  const g=groundAt(pl.x,pl.z), pond=pondAt(pl.x,pl.z); const wy=pond&&g<pond.y-1.1?pond.y:(g<-1.1?0:null);
  if(wy!==null&&pl.y<=wy-0.5+0.2&&g<wy-1.1){ pl.swim=true; pl.grounded=true; pl.vy=0; pl.y=lerp(pl.y,wy-2.7+Math.sin(t*2)*0.12,clamp(dt*6,0,1));
    if(Math.random()<dt*4&&pl.moving) FX.emit(pl.x,wy+0.2,pl.z,(Math.random()-.5)*2,1.5,(Math.random()-.5)*2,0.5,0.6,"#ffffff",-8);
    let md=1e9; for(const I of ISL) md=Math.min(md,Math.hypot(pl.x-I.x,pl.z-I.z)-I.r); if(md>70){ const I=ISL.reduce((a,b)=>Math.hypot(pl.x-a.x,pl.z-a.z)-a.r<Math.hypot(pl.x-b.x,pl.z-b.z)-b.r?a:b); const dx=pl.x-I.x, dz=pl.z-I.z, dd=Math.hypot(dx,dz); pl.x=I.x+dx/dd*(I.r+70); pl.z=I.z+dz/dd*(I.r+70); if(t-swimWarnT>4){ swimWarnT=t; toast("Zu weit zum Schwimmen. Nimm das Boot (B).","#ffb35a") } } }
  else { pl.swim=false; pl.vy-=38*dt; pl.y+=pl.vy*dt; if(pl.y<=g){ if(!pl.grounded&&pl.vy<-14) FX.emit(pl.x,g,pl.z,0,2,0,0.4,1,"#d8c9a0",-5); pl.y=g; pl.vy=0; pl.grounded=true } else if(pl.y>g+0.3) pl.grounded=false; if(pl.grounded&&pl.y<g+0.3) pl.y=lerp(pl.y,g,clamp(dt*20,0,1)) }
}

let portalUntil=0, bannerLock=0;
function checkPortals(t){ if(performance.now()<portalUntil) return; for(const Pt of PORTALS){ const d=Math.hypot(pl.x-Pt.x,pl.z-Pt.z); if(d>Pt.r*0.42) continue;
    if(Pt.from===1&&(levelInfo(S.xp).L<25||S.boat<3)){ const a=Math.atan2(pl.z-Pt.z,pl.x-Pt.x); pl.x=Pt.x+Math.cos(a)*Pt.r*0.75; pl.z=Pt.z+Math.sin(a)*Pt.r*0.75; pl.boatSpeed=0; portalUntil=performance.now()+2000; SFX.splash(1.2); splashFX(pl.x,0.5,pl.z,30,1.4);
      toast("Der Mahlstrom schleudert dich zurück! Du brauchst Level 25 und das Hochseeboot.","#ff9a6a"); return }
    travelTo(Pt.to.x,Pt.to.z,true); return } }
function travelTo(x,z,boat){ portalUntil=performance.now()+3000; bannerLock=performance.now()+3500; cancelFishing(true); if(F.reel){ F.reel=null; $("reel").style.display="none"; F.state="idle"; bobber.visible=false; myLine.visible=false } flash(); SFX.portal(); for(const s of [...shadows]) removeShadow(s);
  const prevSea=seaAt(pl.x); pl.x=x; pl.z=z; const sea=seaAt(x); pl.ry=Math.atan2(seaC(sea)-x,-z); pl.boat=!!boat&&S.boat>0; pl.boatSpeed=0; pl.y=pl.boat?0.5:groundAt(x,z); cam.yaw=pl.ry;
  cam.x=pl.x-Math.sin(cam.yaw)*20; cam.z=pl.z-Math.cos(cam.yaw)*20; cam.y=pl.y+10; lastLoc=""; curSea=sea; updateSeaVis(); warmWorld(pl.x,pl.z);
  if(sea!==prevSea) banner(sea===2?"Die Zweite See":"Die Erste See",sea===2?"Stürmischer, tiefer, reicher. Ankerheim liegt im Osten.":"Willkommen zurück. Moosewood liegt im Norden."); pushPresence(true) }
function updateSeaVis(){ SEAG[1].visible=curSea===1; SEAG[2].visible=curSea===2; setWaterZones(curSea) }
/* stream terrain detail + height map around a new position right away (teleports, boot) */
function warmWorld(x,z){ fineTilesAround(x,z,LOW?260:380); updateHMap(x,z,true); if(typeof cullIslands==="function") cullIslands() }

/* ---------- fish areas: like Fisch, most fish live in their own patch of water. The Fish Radar makes them visible. ---------- */
const AREAS=[], AREA_LOC={};
const AWLOCS=new Set(Object.values(AW_LOC)), DEEPLOCS=new Set(DEEPZ.map(z=>z.n));
const isBound=f=>!EVSET.has(f.sub)&&f.r!=="Apex"&&!AWLOCS.has(f.l)&&!DEEPLOCS.has(f.l)&&rIdx(f.r)>=2&&f.sub!=="Freshwater"&&f.sub!=="Coral Reef";
function coastDist(I,a){ const ca=Math.cos(a), sa=Math.sin(a); let d=I.r*0.25; while(d<I.ext&&terrainAt(I.x+ca*d,I.z+sa*d)>-1.5) d+=6; return d }
function addArea(o){ o.id=AREAS.length; o.asp=o.asp||1; AREAS.push(o); (AREA_LOC[o.loc]||(AREA_LOC[o.loc]=[])).push(o); return o }
function genAreas(){ const r=rng(424242); for(const f of FISH) f.area=isBound(f);
  const byR=(a,b)=>rIdx(a.r)-rIdx(b.r)||a.n.localeCompare(b.n);
  for(const I of ISL){
    if(I.reefAng!==undefined){ const a=I.reefAng, d=coastDist(I,a)+70; addArea({loc:I.n,x:I.x+Math.cos(a)*d,z:I.z+Math.sin(a)*d,r:170,nat:"Korallenriff",fish:FISH.filter(f=>f.l===I.n&&f.sub==="Coral Reef").map(f=>f.n)}) }
    if(I.pond) addArea({loc:I.n,x:I.pond.x,z:I.pond.z,r:I.pond.r,nat:"Teich",fresh:1,fish:FISH.filter(f=>f.l===I.n&&f.sub==="Freshwater").map(f=>f.n)});
    const bound=FISH.filter(f=>f.l===I.n&&f.area).sort(byR); if(!bound.length) continue;
    const n=clamp(Math.ceil(bound.length/3),2,6), base=r()*6.28, list=[];
    for(let k=0;k<n;k++){ const a=base+k/n*6.28+(r()-.5)*0.5; if(I.chanAng!==undefined&&Math.abs(angDiff(a,I.chanAng))<0.25) continue; const d=coastDist(I,a)+50+r()*110;
      list.push(addArea({loc:I.n,x:I.x+Math.cos(a)*d,z:I.z+Math.sin(a)*d,r:70+r()*60,asp:0.65+r()*0.5,fish:[]})) }
    // the Castaway lagoon keeps its own treasures
    if(I.biome==="cliffring") list.push(addArea({loc:I.n,x:I.x+18,z:I.z-10,r:I.r*0.22,fish:[],lagoon:1}));
    bound.forEach((f,i)=>list[(i*7)%list.length].fish.push(f.n)) }
  for(const [loc,n,cx,R] of [["Ocean",14,0,SEA1_R*0.86],["Sturmsee",8,SEA2X,SEA2_R*0.86]]){
    const bound=FISH.filter(f=>f.l===loc&&f.area).sort(byR); if(!bound.length) continue; const list=[]; let g=0;
    while(list.length<n&&g++<6000){ const a=r()*6.28, d=Math.sqrt(r())*R, x=cx+Math.cos(a)*d, z=Math.sin(a)*d;
      if(ISL.some(I=>Math.hypot(x-I.x,z-I.z)<I.r*1.35+420)||DEEPZ.some(Z=>Math.hypot(x-Z.x,z-Z.z)<Z.r+320)||PORTALS.some(P=>Math.hypot(x-P.x,z-P.z)<P.r+300)||RAFTS.some(R=>Math.hypot(x-R.x,z-R.z)<260)||list.some(A=>Math.hypot(x-A.x,z-A.z)<1100)) continue;
      const deep=ISL.every(I=>Math.hypot(x-I.x,z-I.z)-I.r>1150); if(!deep&&list.filter(A=>!A.deep).length>=Math.ceil(n*0.55)) continue;
      list.push(addArea({loc,x,z,r:190+r()*150,asp:0.6+r()*0.5,fish:[],deep})) }
    const deepA=list.filter(A=>A.deep), shA=list.filter(A=>!A.deep);
    bound.forEach((f,i)=>{ const wantDeep=f.sub==="Deep Ocean", pool=wantDeep?deepA:f.sub==="Open Sea"?shA:list; if(!pool.length){ f.area=false; return } pool[(i*5)%pool.length].fish.push(f.n) }) }
}
function areasHere(x,z,loc){ const A=AREA_LOC[loc]; if(!A) return null; let set=null; for(const a of A){ if(a.nat) continue; const dx=x-a.x, dz=(z-a.z)*a.asp; if(dx*dx+dz*dz<a.r*a.r){ if(!set){ set=new Set(); set.areas=new Set() } a.fish.forEach(n=>set.add(n)); set.areas.add(a.id) } } return set }
/* radar: stripes in the water shader + floating "[Fish]" labels above each area */
const radarLbl=new Map(); let radarT=0;
const radarOn=()=>!!S.radar&&S.settings.radar!==false;
function toggleRadar(){ if(!S.radar){ toast("Du hast noch keinen Fisch-Radar. Ihn gibt es über die Story (Kapitel „Der Fischfinder“).","#ffb35a"); return } S.settings.radar=!radarOn(); markDirty(); updateRadarUI(); SFX.ui(); toast(radarOn()?"Fisch-Radar an":"Fisch-Radar aus","#5fffd0") }
function updateRadarUI(){ const b=$("radarBtn"); if(b){ b.style.display=S.radar?"flex":"none"; b.classList.toggle("on",radarOn()) } if(!radarOn()){ waterU.uRadar.value=0; for(const L of radarLbl.values()) L.s.visible=false } }
function areaText(a){ const known=a.fish.filter(n=>S.dex[n]).length; const names=a.fish.slice().sort((x,y)=>rIdx(FISHBY[y].r)-rIdx(FISHBY[x].r)).map(n=>S.dex[n]?n:"???");
  const shown=names.slice(0,3).join(", ")+(names.length>3?` +${names.length-3}`:""); return (a.nat?a.nat+": ":a.school?"Schwarm: ":"")+"["+(shown||"leer")+"]" }
function areaColor(a){ let best=0; for(const n of a.fish){ const f=FISHBY[n]; if(f) best=Math.max(best,rIdx(f.r)) } return RCOL[RARITY[best]]||"#9ff3ff" }
function updateRadar(dt,t){ radarT-=dt; const on=radarOn(); waterU.uRadar.value=lerp(waterU.uRadar.value,on?1:0,clamp(dt*4,0,1)); if(!on) return;
  if(radarT<=0){ radarT=0.5; const W=world(); const cand=AREAS.filter(a=>a.fish.length&&SEAOF(a.loc)===curSea&&!(ISLBY[a.loc]&&ISLBY[a.loc].hidden&&!S.visited[a.loc])).map(a=>[Math.hypot(a.x-pl.x,a.z-pl.z)-a.r,a]).filter(x=>x[0]<1800);
    const SCH=schoolFor(W,locationAt(pl.x,pl.z)); if(SCH) cand.push([Math.hypot(SCH.x-pl.x,SCH.z-pl.z)-SCH.r,{id:"school",x:SCH.x,z:SCH.z,r:SCH.r,asp:1,fish:[SCH.f.n],school:1}]);
    cand.sort((a,b)=>a[0]-b[0]); const U=waterU.uA.value, C=waterU.uAC.value;
    for(let i=0;i<16;i++){ const a=cand[i]&&cand[i][1]; if(a&&!a.fresh){ U[i].set(a.x,a.z,a.r,a.asp); C[i].set(areaColor(a)) } else U[i].set(0,0,0,1) }
    const keep=new Set();
    for(const [d,a] of cand.slice(0,12)){ if(d>900) continue; const key=a.id+"|"+areaText(a); keep.add(a.id); let L=radarLbl.get(a.id);
      if(!L||L.key!==key){ if(L) scene.remove(L.s); const s=textSprite(areaText(a),{size:44,color:areaColor(a),scale:0.05}); s.renderOrder=7; s.userData.w0=s.scale.x; s.userData.h0=s.scale.y; scene.add(s); L={s,key,a}; radarLbl.set(a.id,L) } L.a=a }
    for(const [id,L] of radarLbl){ if(!keep.has(id)){ scene.remove(L.s); L.s.material.map.dispose(); radarLbl.delete(id) } } }
  for(const L of radarLbl.values()){ const a=L.a, d=Math.hypot(a.x-pl.x,a.z-pl.z); const f=clamp((900-d)/200,0,1); L.s.visible=f>0.02; L.s.material.opacity=f; const y=(a.fresh?(ISLBY[a.loc].pond.y||2):0)+8+Math.min(40,d*0.035)+Math.sin(t*1.5+a.x)*0.4; L.s.position.set(a.x,y,a.z); const k=clamp(d/180,1,4.5); L.s.scale.set(L.s.userData.w0*k,L.s.userData.h0*k,1) } }

/* ---------- hunts: a huge shadow roams a region; fishing anywhere inside sometimes hooks it ---------- */
const huntSil=new THREE.Mesh(shadowGeo,new THREE.MeshBasicMaterial({color:0x020a12,transparent:true,opacity:0,depthWrite:false})); huntSil.renderOrder=3; scene.add(huntSil);
const huntFin=new THREE.Mesh(new THREE.ConeGeometry(2.6,7,3),stdMat({color:"#2a2f36"})); huntFin.scale.z=0.35; scene.add(huntFin);
const huntBirds=[]; { const wing=new THREE.PlaneGeometry(2.2,0.7); wing.translate(1.1,0,0); const mat=stdMat({color:"#f4f6f8",side:THREE.DoubleSide});
  for(let i=0;i<6;i++){ const g=new THREE.Group(); const b=new THREE.Mesh(new THREE.CapsuleGeometry(.25,.9,4,8),stdMat({color:"#ffffff"})); b.rotation.z=Math.PI/2; const l=new THREE.Mesh(wing,mat), rr=new THREE.Mesh(wing,mat); rr.scale.x=-1; g.add(b,l,rr); g.visible=false; scene.add(g); huntBirds.push({g,l,r:rr,ph:i*1.1}) } }
const HUNT_SIZE={Megalodon:26,Livyatan:30,"Blue Whale":34,"Humpback Whale":30,"Sei Whale":28,Narwhal:14,Orca:14,Shark:12,Megamouth:18,Bloop:34,Mosslurker:26,Dreadfin:24,Mossjaw:22};
function updateHunt(dt,t,W){ const EZ=W.event&&!W.aw?eventZone(W.event):null; const vis=!!EZ&&seaAt(EZ.x)===curSea&&Math.hypot(EZ.x-pl.x,EZ.z-pl.z)<EZ.r+2500;
  waterU.uHunt.value.set(EZ?EZ.x:0,EZ?EZ.z:0,EZ?EZ.r:0,vis?1:0); huntSil.visible=huntFin.visible=vis; huntBirds.forEach(b=>b.g.visible=vis); if(!vis) return;
  const key=Object.keys(HUNT_SIZE).find(k=>W.event.n.includes(k)), sz=HUNT_SIZE[key]||16;
  const a=t*0.05+(W.event.slot%7), rr=EZ.r*(0.35+0.2*Math.sin(t*0.13)), x=EZ.x+Math.cos(a)*rr, z=EZ.z+Math.sin(a)*rr;
  huntSil.position.set(x,-1.2,z); huntSil.rotation.y=-a-Math.PI/2; huntSil.scale.setScalar(sz); huntSil.material.opacity=0.28+0.08*Math.sin(t*0.7);
  const surf=Math.max(0,Math.sin(t*0.45))**6; huntFin.position.set(x+Math.cos(a+Math.PI/2)*sz*0.2,-2+surf*(2.2+sz*0.08),z+Math.sin(a+Math.PI/2)*sz*0.2); huntFin.rotation.y=-a; huntFin.scale.set(sz/12,sz/12,sz/12*0.35);
  if(surf>0.4&&Math.random()<dt*30) FX.emit(huntFin.position.x,0.4,huntFin.position.z,(Math.random()-.5)*3,3+Math.random()*3,(Math.random()-.5)*3,0.8,1.2,"#ffffff",-9);
  if(surf>0.9&&Math.random()<dt*2) splashFX(x,0.3,z,30,2.2);
  huntBirds.forEach((b,i)=>{ const ba=t*0.35+b.ph, br=24+i*5; b.g.position.set(x+Math.cos(ba)*br,34+i*3+Math.sin(t+i)*2,z+Math.sin(ba)*br); b.g.rotation.y=-ba; const f=Math.sin(t*8+i)*0.6; b.l.rotation.x=f; b.r.rotation.x=f }) }

/* ---------- fish shadows ---------- */
const shadows=[]; let shadowSpawnT=0;
function schoolFor(W,loc){ const slot=Math.floor(nowMs()/SCHOOL_MS); const r=rng(slot*7919+hashStr(loc)); const I=ISLBY[loc];
  if(!I) return null; const pool=poolFor(loc,"",W,false).map(x=>x.f).filter(f=>!f.sub&&f.c>=3&&f.c<=60&&rIdx(f.r)<=4); if(!pool.length) return null;
  const f=pool[Math.floor(r()*pool.length)]; const a=r()*Math.PI*2; const d=I.r*(1.08+r()*0.25); return {f,x:I.x+Math.cos(a)*d,z:I.z+Math.sin(a)*d,r:45,loc} }
function eventZone(ev){ if(!ev) return null; const r=rng(ev.slot*131+7); const I=ISLBY[ev.l], Z=DEEPZ.find(z=>z.n===ev.l);
  if(I){ const a=r()*Math.PI*2, d=I.r*1.25+120; return {x:I.x+Math.cos(a)*d,z:I.z+Math.sin(a)*d,r:200} }
  if(Z) return {x:Z.x+(r()-.5)*120,z:Z.z+(r()-.5)*120,r:200};
  for(let k=0;k<60;k++){ const a=r()*Math.PI*2, d=1500+r()*6000, x=Math.cos(a)*d, z=Math.sin(a)*d; if(ISL.every(I=>Math.hypot(x-I.x,z-I.z)>I.r+500)&&DEEPZ.every(Z=>Math.hypot(x-Z.x,z-Z.z)>Z.r+300)) return {x,z,r:260} } return {x:1800,z:1800,r:260} }
function fishContext(x,z,w){ const W=world(); let loc=locationAt(x,z); const deep=DEEPZ.some(Z=>Z.n===loc); if(deep&&!S.bell) loc=seaAt(x)===2?"Sturmsee":"Ocean";
  let spot=spotAt(loc,x,z,w.kind); const EZ=eventZone(W.event); const inEvent=!!(EZ&&W.event&&Math.hypot(x-EZ.x,z-EZ.z)<EZ.r&&(W.event.l===loc||W.event.l==="Ocean"&&loc==="Ocean"));
  const SC=schoolFor(W,loc); const inSchool=!!(SC&&Math.hypot(x-SC.x,z-SC.z)<SC.r); const here=w.kind==="fresh"?null:areasHere(x,z,loc); return {W,loc,spot,inEvent,school:inSchool?SC:null,deepBlocked:deep&&!S.bell,kind:w.kind,deep:deep&&!!S.bell,here,areas:here?[...here.areas]:[]} }
function rollAW(W,G){ const loc=AW_LOC[W.aw]; let tot=0; const cand=FISH.filter(f=>f.l===loc).map(f=>{ let w=f.c*Math.max(0.3,1+G.luck/300); if(G.bait&&f.b.includes(G.bait.n)) w*=1.6; tot+=w; return [f,w] });
  let r=Math.random()*(tot+380); for(const [f,w] of cand){ if((r-=w)<=0) return f } return null }
function rollAt(ctx,G){ if(ctx.W.aw&&ctx.kind!=="fresh"){ const f=rollAW(ctx.W,G); if(f) return f }
  const AB=G.AB||{}; const ex=AB.luckIf&&AB.luckIf[0]==="deep"&&ctx.deep?AB.luckIf[1]:0;
  if(ctx.school&&Math.random()<0.55) return ctx.school.f; if(ctx.inEvent&&Math.random()<0.3){ const ev=poolFor(ctx.loc,ctx.spot,ctx.W,true).filter(x=>x.isEv); if(ev.length) return ev[Math.floor(Math.random()*ev.length)].f } return rollFish(ctx.loc,ctx.spot,ctx.W,G,ctx.inEvent,(ctx.school?40:0)+ex,ctx.here) }
function spawnShadow(){
  const G=gearStats(); for(let k=0;k<12;k++){ const a=Math.random()*Math.PI*2, d=10+Math.random()*52, x=pl.x+Math.cos(a)*d, z=pl.z+Math.sin(a)*d; const w=waterAt(x,z); if(!w) continue;
    if(w.kind==="sea"&&terrainAt(x,z)>-1.3) continue; const ctx=fishContext(x,z,w); const f=rollAt(ctx,G); if(!f) return;
    const sz=fishSize(f)*(w.kind==="fresh"?0.8:1); const mesh=new THREE.Mesh(shadowGeo,shadowMat); mesh.scale.setScalar(sz); mesh.position.set(x,w.y-0.55,z); scene.add(mesh);
    let glow=null; const ri=rIdx(f.r); if(ri>=3){ glow=new THREE.Mesh(glowRingGeo,new THREE.MeshBasicMaterial({color:new THREE.Color(RCOL[f.r]),transparent:true,opacity:.5,blending:THREE.AdditiveBlending,depthWrite:false})); glow.scale.setScalar(sz*1.6); glow.renderOrder=4; scene.add(glow) }
    shadows.push({mesh,glow,f,x,z,y:w.y,kind:w.kind,tx:x,tz:z,ry:Math.random()*6,sp:2+Math.random()*2,life:50+Math.random()*50,state:"wander",sz,ri,t:Math.random()*10,ctx}); return }
}
function removeShadow(s){ scene.remove(s.mesh); if(s.glow){ scene.remove(s.glow); s.glow.material.dispose() } const i=shadows.indexOf(s); if(i>=0) shadows.splice(i,1) }
function updateShadows(dt,t){
  shadowSpawnT-=dt; const want=pl.boat?11:(pl.swim?4:9);
  const near=shadows.filter(s=>Math.hypot(s.x-pl.x,s.z-pl.z)<75).length;
  if(shadowSpawnT<=0&&near<want){ shadowSpawnT=0.35; spawnShadow() }
  for(const s of [...shadows]){ s.life-=dt; s.t+=dt; const dp=Math.hypot(s.x-pl.x,s.z-pl.z);
    if((s.life<=0||dp>95)&&s!==F.target){ removeShadow(s); continue }
    if(s.state==="wander"){ if(Math.hypot(s.tx-s.x,s.tz-s.z)<1){ for(let k=0;k<5;k++){ const a=Math.random()*Math.PI*2, d=3+Math.random()*9, x=s.x+Math.cos(a)*d, z=s.z+Math.sin(a)*d; const w=waterAt(x,z); if(w&&w.kind===s.kind&&(w.kind==="fresh"||terrainAt(x,z)<-1.3)){ s.tx=x; s.tz=z; break } } } }
    else if(s.state==="approach"){ s.tx=F.bob.x; s.tz=F.bob.z; s.sp=3.2 }
    else if(s.state==="flee"){ s.sp=10; s.life=Math.min(s.life,1.5) }
    const dx=s.tx-s.x, dz=s.tz-s.z, d=Math.hypot(dx,dz);
    if(d>0.05){ const sp=Math.min(d,s.sp*dt*(s.state==="wander"?(0.5+0.5*Math.sin(s.t*0.7)):1)); s.x+=dx/d*sp; s.z+=dz/d*sp; const want=Math.atan2(dz,dx); let dr=want-s.ry; dr=Math.atan2(Math.sin(dr),Math.cos(dr)); s.ry+=dr*clamp(dt*5,0,1) }
    if(s.state==="approach"&&d<0.9&&F.state==="lure"){ biteFrom(s) }
    const wig=Math.sin(s.t*(s.state==="wander"?5:12))*0.12;
    s.mesh.position.set(s.x,s.y-0.55,s.z); s.mesh.rotation.y=-s.ry+wig;
    if(s.glow){ s.glow.position.set(s.x,s.y+0.08+waveHeight(s.x,s.z,t)*(s.kind==="sea"?1:0),s.z); s.glow.material.opacity=0.35+0.25*Math.sin(t*3+s.t); if(s.ri>=4&&Math.random()<dt*6) GLOW.emit(s.x+(Math.random()-.5)*s.sz*2,s.y+0.3,s.z+(Math.random()-.5)*s.sz*2,0,1.5,0,0.9,0.7,RCOL[s.f.r],-0.5) }
    if(s.ri>=3&&Math.random()<dt*1.5) FX.emit(s.x,s.y,s.z,0,2,0,0.6,0.35,"#dff6ff",-2);
  }
}

/* ---------- fishing ---------- */
const F={state:"idle",power:0,pdir:1,aim:null,bob:{x:0,y:0,z:0},from:null,castT:0,target:null,lureNeed:0,lureT:0,hooked:null,reel:null,ctx:null,showT:0,showMesh:null,streakGrade:""};
const bobber=new THREE.Group(); { const t=new THREE.Mesh(new THREE.SphereGeometry(.42,14,10,0,Math.PI*2,0,Math.PI/2),stdMat({color:"#e0453a",roughness:.4})); const b=new THREE.Mesh(new THREE.SphereGeometry(.42,14,10,0,Math.PI*2,Math.PI/2,Math.PI/2),stdMat({color:"#ffffff",roughness:.4})); const a=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.5,6),stdMat({color:"#222"})); a.position.y=.55; bobber.add(t,b,a) }
bobber.visible=false; scene.add(bobber);
function colorBobber(g,rn){ const r=ROD[rn]||ROD["Flimsy Rod"]; g.children[0].material=stdMat({color:r.c1,roughness:.4}); g.children[1].material=stdMat({color:r.c2,roughness:.4}) } colorBobber(bobber,S.rod);
const LINE_N=28; function makeLine(op){ const g=new THREE.BufferGeometry(); g.setAttribute("position",new THREE.BufferAttribute(new Float32Array(LINE_N*3),3)); const l=new THREE.Line(g,new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:op})); l.frustumCulled=false; l.visible=false; scene.add(l); return l }
const myLine=makeLine(.9);
function setLine(line,a,b,sag){ const p=line.geometry.attributes.position.array; for(let i=0;i<LINE_N;i++){ const t=i/(LINE_N-1); p[i*3]=lerp(a.x,b.x,t); p[i*3+2]=lerp(a.z,b.z,t); p[i*3+1]=lerp(a.y,b.y,t)-Math.sin(t*Math.PI)*sag } line.geometry.attributes.position.needsUpdate=true; line.visible=true }
function setHint(s){ $("hint").textContent=s }
function startCharge(){
  if(modalOpen()) return;
  if(pl.swim){ toast("Schwimmend kannst du nicht angeln.","#ffb35a"); return }
  if(pl.boat&&Math.abs(pl.boatSpeed)>3){ toast("Halte das Boot erst an (S).","#ffb35a"); return }
  if(S.fish.length>=bagCap()){ toast(`Rucksack voll (${bagCap()}). Verkaufe beim Händler oder rüste den Rucksack auf.`,"#ff6363"); SFX.fail(); return }
  if(holdIt) setHold(null); F.state="charge"; F.power=0; F.pdir=1; setHint("Loslassen zum Werfen"); pushPresence(true);
}
function castGrade(p){ return p>=.93?"PERFECT!!":p>=.8?"Amazing!":p>=.62?"Great!":p>=.42?"Good!":p>=.22?"Fine.":"Meh.." }
function releaseCast(){
  if(F.state!=="charge") return; const A=aimPoint(); marker.visible=false; $("power").style.display="none";
  if(!A){ F.state="idle"; F.auto=false; return }
  const scatter=(1-F.power)*5.5, a=Math.random()*Math.PI*2; const tx=A.x+Math.cos(a)*scatter*Math.random(), tz=A.z+Math.sin(a)*scatter*Math.random();
  pl.ry=Math.atan2(tx-pl.x,tz-pl.z); const tip=new THREE.Vector3(); me.group.rotation.y=pl.ry; me.group.updateMatrixWorld(true); me.tip.getWorldPosition(tip);
  F.auto=false; F.from={x:tip.x,y:tip.y,z:tip.z}; F.bob={x:tx,z:tz,y:0}; F.castT=0; F.state="cast"; F.grade=castGrade(F.power); F.perfectCast=F.power>=.93;
  floatText(F.grade,F.perfectCast?"#7dff7a":"#ffffff"); SFX.cast(); pushPresence(true);
}
function landBobber(){
  const w=waterAt(F.bob.x,F.bob.z);
  if(!w){ F.state="idle"; bobber.visible=false; myLine.visible=false; toast("Da ist kein Wasser.","#ffb35a"); setHint(""); pushPresence(true); return }
  F.bob.y=w.y; SFX.splash(0.5); splashFX(F.bob.x,w.y,F.bob.z,10,0.6);
  F.ctx=fishContext(F.bob.x,F.bob.z,w); if(F.ctx.deepBlocked) toast("Ohne Tauchglocke beißen hier nur Meeresfische. Die Glocke gibt es in der Werft von Moosewood.","#ffb35a");
  let best=null,bd=F.perfectCast?9:7; for(const s of shadows){ if(s.state!=="wander"||s.kind!==w.kind) continue; const d=Math.hypot(s.x-F.bob.x,s.z-F.bob.z); if(d<bd||(best&&d<bd+2&&s.ri>best.ri)){ bd=d; best=s } }
  for(const s of shadows){ if(s!==best&&Math.hypot(s.x-F.bob.x,s.z-F.bob.z)<1.6){ s.state="flee"; const a=Math.atan2(s.z-F.bob.z,s.x-F.bob.x); s.tx=s.x+Math.cos(a)*20; s.tz=s.z+Math.sin(a)*20 } }
  F.state="lure"; F.lureT=0;
  if(best){ F.target=best; best.state="approach"; best.life=Math.max(best.life,20); setHint(best.ri>=3?`Ein ${RDE[best.f.r].toLowerCase()}er Schatten schwimmt zum Köder…`:"Ein Fisch schwimmt zum Köder…") }
  else { F.target=null; const G=gearStats(); const W=F.ctx.W; const base=7.5*(1-G.lure/100)*(W.weather==="Rain"?0.8:1); F.lureNeed=ADM.instant?0.3:clamp(base*(0.75+Math.random()*0.5),0.8,30);
    moveShake(); if(!TOUCH) $("shake").style.display="block"; setHint(TOUCH?"Tippe SHAKE, um Fische anzulocken. Tipp: wirf neben einen Schatten!":"Klicke SHAKE, um Fische anzulocken, oder zieh ein (Esc). Tipp: wirf neben einen Schatten!") }
  pushPresence(true);
}
function moveShake(){ const b=$("shake"); b.style.left=(innerWidth*(.3+Math.random()*.4))+"px"; b.style.top=(innerHeight*(.3+Math.random()*.3))+"px" }
function shake(){ if(F.state!=="lure"||F.target) return; F.lureT+=0.7+Math.random()*0.9; moveShake(); tone(700+Math.random()*200,0.05,"square",0.05); splashFX(F.bob.x,F.bob.y,F.bob.z,3,0.3) }
$("shake").addEventListener("pointerdown",e=>{ e.stopPropagation(); initAudio(); shake() });
function cancelFishing(silent){ F.auto=false; if(["lure","cast","charge"].includes(F.state)){ if(F.target){ F.target.state="wander"; F.target=null } F.state="idle"; $("shake").style.display="none"; bobber.visible=false; myLine.visible=false; marker.visible=false; $("power").style.display="none"; setHint(""); pushPresence(true) } }
const wBonus=()=>gearStats().fx.weight||0;
function biteFrom(s){ const f=adminFish()||s.f; F.hooked={f,w:rollWeight(f,wBonus()),shadow:s,fromShadow:true}; doBite() }
function randomBite(){ const G=gearStats(); const f=adminFish()||rollAt(F.ctx,G); if(!f){ cancelFishing(); toast("Hier beißt gerade nichts.","#ff9a6a"); return } F.hooked={f,w:rollWeight(f,G.fx.weight||0),shadow:null,fromShadow:false}; doBite() }
function doBite(){ const f=F.hooked.f; $("shake").style.display="none"; F.state="bite"; SFX.bite(rIdx(f.r)); splashFX(F.bob.x,F.bob.y,F.bob.z,14,0.8);
  spawnBiteMark(F.bob.x,F.bob.y,F.bob.z,rIdx(f.r)); if(rIdx(f.r)>=9) shakeCam(0.6); if(F.hooked.shadow){ removeShadow(F.hooked.shadow); F.target=null }
  setTimeout(startReel,520); pushPresence(true) }
function startReel(){
  if(F.state!=="bite") return; const G=gearStats(), f=F.hooked.f, w=F.hooked.w;
  const barW=clamp(0.30+G.ctrl,0.08,1), diff=Math.max(0,(100-f.res)/100), eff=diff*(1-clamp(G.res,-150,95)/100);
  const AB=G.AB||{}; let rate=0.135*Math.max(0.06,1+f.ps/100)*(1+(G.fx.prog||0)+(AB.prog||0)), heavy=1; if(G.mw>0&&w>G.mw){ heavy=clamp(Math.sqrt(G.mw/w),0.14,1); if(AB.heavy) heavy=1-(1-heavy)*AB.heavy; rate*=heavy }
  F.reel={x:.5-barW/2,v:0,w:barW,fx:.5,ft:.5,fv:0,re:0,eff,rate,heavy,prog:.06,lock:1.1,perfect:true,hold:!!(keys[" "]||fishHeld||touches.size>0),t:0,dart:rIdx(f.r)>=3?0.35+0.1*rIdx(f.r):0,tick:0,freeze:AB.freeze||0,freezeT:AB.freeze||0,frozen:0,slash:AB.slash?{t:AB.slash[0],p:AB.slash[1],c:AB.slash[0]}:null,anchor:AB.anchor||0};
  F.state="reel"; $("reel").style.display="block"; $("slider").style.width=(barW*100)+"%";
  const sz=fishSize(f); $("reelWho").textContent=sz>2.6?"Etwas RIESIGES hat angebissen!":sz>1.8?"Etwas Großes hat angebissen!":"Etwas hat angebissen!"; $("reelWho").style.color=rIdx(f.r)>=4?RCOL[f.r]:"#fff";
  const mods=[]; if(R_passive(G)) mods.push(R_passive(G)); if(f.ps) mods.push(`Fortschritt ${f.ps>0?"+":""}${f.ps}%`); if(heavy<1) mods.push(`zu schwer für die Rute (max ${fmtKg(G.mw)})`); $("reelMod").textContent=mods.join(" · ");
  setHint(""); pushPresence(true);
}
function updateReel(dt){
  const R=F.reel; if(!R) return; R.t+=dt; R.re-=dt;
  if(R.slash&&R.lock<=0){ R.slash.c-=dt; if(R.slash.c<=0){ R.slash.c=R.slash.t; R.prog+=R.slash.p; tone(220,0.25,"sawtooth",0.1,0,null,3); sparkleFX(F.bob.x,F.bob.y+0.5,F.bob.z,"#ff8a3a",20,2.5) } }
  if(R.freeze){ R.freeze-=dt; if(R.freeze<=0){ R.freeze=R.freezeT; R.frozen=1; tone(1600,0.25,"sine",0.08); sparkleFX(F.bob.x,F.bob.y+0.5,F.bob.z,"#bff4ff",14,2) } }
  const frozen=R.frozen>0; if(frozen){ R.frozen-=dt; R.re+=dt } $("fishIcon").classList.toggle("ice",frozen);
  if(!frozen&&R.re<=0){ const jump=0.12+0.6*Math.min(1.4,R.eff); R.ft=clamp(R.fx+(Math.random()*2-1)*jump,0.03,0.97); R.re=(0.35+Math.random()*1.3)/(0.6+R.eff);
    if(R.dart&&Math.random()<R.dart*0.5){ R.ft=Math.random()<0.5?0.05+Math.random()*0.2:0.75+Math.random()*0.2; R.re*=0.6 } }
  const spd=0.18+1.35*Math.min(1.6,R.eff)+(R.dart?0.6:0); if(!frozen){ R.fv=lerp(R.fv,(R.ft-R.fx)*6,clamp(dt*(2+R.eff*4),0,1)); R.fv=clamp(R.fv,-spd,spd); R.fx=clamp(R.fx+R.fv*dt,0.02,0.98) }
  if(R.lock>0){ R.lock-=dt; R.prog+=R.rate*dt; if(R.prog>=0.2) R.lock=0 }
  else { const A=3; R.v+=(R.hold?A:-A)*dt; R.v=clamp(R.v,-1.5,1.5); R.x+=R.v*dt; if(R.x<0){R.x=0;R.v=-R.v*0.3} if(R.x>1-R.w){R.x=1-R.w;R.v=-R.v*0.3}
    const inside=R.fx>=R.x&&R.fx<=R.x+R.w; if(inside){ R.prog+=R.rate*dt; R.tick-=dt; if(R.tick<=0){ R.tick=0.09; SFX.tick() } } else { R.prog-=0.12*dt; R.perfect=false } $("slider").classList.toggle("off",!inside) }
  $("slider").style.left=(R.x*100)+"%"; $("fishIcon").style.left=(R.fx*100)+"%"; const pi=$("prog").firstElementChild; pi.style.width=(clamp(R.prog,0,1)*100)+"%"; pi.classList.toggle("low",R.prog<0.2);
  $("reelPerf").textContent=R.perfect?"Perfect!":"";
  if(Math.random()<dt*4) splashFX(F.bob.x,F.bob.y,F.bob.z,3,0.5+R.eff*0.5);
  if(ADM.autoReel) R.prog+=dt*0.9; if(R.anchor&&R.lock<=0) R.prog=Math.max(R.prog,R.anchor);
  if(R.prog>=1) catchFish(); else if(R.prog<=0) loseFish();
}
function roredTrack(ev,o){ const q=S.lq&&S.lq.rored; if(!q||q.done) return; const st=LQ.rored.steps[q.step]; if(!st) return; const streak=st.k==="flimsyPerfect"||st.k==="flimsyPP";
  const breakIt=()=>{ if(q.cnt&&q.cnt<st.goal) toast(`RoRed: Serie gerissen bei ${q.cnt}. Nochmal von vorn!`,"#ff6363"); if(q.cnt<st.goal) q.cnt=0 };
  if(ev==="lose"){ if(streak) breakIt(); renderQuests(); return }
  const flimsy=o.rod.n==="Flimsy Rod", before=q.cnt||0;
  if(st.k==="flimsyPerfect"){ if(flimsy&&o.R.perfect) q.cnt=before+1; else breakIt() }
  if(st.k==="flimsyPP"){ if(flimsy&&o.R.perfect&&F.perfectCast) q.cnt=before+1; else breakIt() }
  if(st.k==="tryMeg"&&flimsy&&o.f.n==="Megalodon"&&S.ench["Flimsy Rod"]==="hasty") q.cnt=1;
  if(q.cnt>=st.goal&&before<st.goal) setTimeout(()=>{ toast("RoRed: „Nicht schlecht. Komm zum Vulkan zurück.“","#ff3a3a"); SFX.quest() },2000); renderQuests() }
let camShake=0; function shakeCam(a){ camShake=Math.max(camShake,a) }
/* hold a fish up so everybody can see it (H or backpack) */
let holdIt=null, holdMesh=null, holdLbl=null;
function setHold(it){ if(holdMesh){ scene.remove(holdMesh); holdMesh=null } if(holdLbl){ scene.remove(holdLbl); holdLbl.material.map.dispose(); holdLbl=null } holdIt=it||null;
  if(holdIt){ const f=FISHBY[it.n]; holdMesh=makeFishMesh(it.n,it.m); holdMesh.scale.setScalar(clamp(fishSize(f)*0.9,0.7,3.2)); holdMesh.userData.s=holdMesh.scale.x; scene.add(holdMesh);
    holdLbl=textSprite(`${fishLabel(it)} · ${fmtKg(it.w)}`,{size:36,color:RCOL[f.r]||"#fff",scale:0.03}); scene.add(holdLbl) } pushPresence(true) }
function toggleHold(){ if(holdIt){ setHold(null); return } if(F.state!=="idle") return; if(!S.fish.length){ toast("Dein Rucksack ist leer.","#ffb35a"); return } setHold([...S.fish].sort((a,b)=>fishValue(b)-fishValue(a))[0]) }
function updateHold(t){ if(holdIt&&(!S.fish.includes(holdIt)||F.state!=="idle"||pl.swim)) setHold(null); if(!holdMesh) return; const y=me.group.position.y+(pl.boat?6.4:7.6)+holdMesh.userData.s*0.35;
  holdMesh.position.set(pl.x,y,pl.z); holdMesh.rotation.set(0,pl.ry+Math.PI/2+Math.sin(t*1.5)*0.2,Math.sin(t*3)*0.08); holdLbl.position.set(pl.x,y+1.6+holdMesh.userData.s*0.5,pl.z);
  const f=FISHBY[holdIt.n]; if((rIdx(f.r)>=4||holdIt.m)&&Math.random()<0.25) GLOW.emit(pl.x+(Math.random()-.5)*2,y+(Math.random()-.5),pl.z+(Math.random()-.5)*2,0,1,0,0.8,0.6,holdIt.m&&MUT[holdIt.m]?MUT[holdIt.m].c:RCOL[f.r],-0.5) }
function loseFish(){ roredTrack("lose"); F.reel=null; $("reel").style.display="none"; F.state="idle"; S.stats.snaps++; bobber.visible=false; myLine.visible=false;
  if(S.stats.streak>=5) toast(`Streak von ${S.stats.streak} verloren.`,"#ff6363"); S.stats.streak=0; toast("Der Fisch ist entkommen!","#ff6363"); SFX.fail(); markDirty(); pushPresence(true) }
let lastCatch=null;
function R_passive(G){ return G.AB&&G.AB.n?"✦ "+G.AB.n:"" }
function makeItem(f,w,ctx,G,bonus){ const AB=G.AB||{}; const mutExtra=(ctx.inEvent?0.05:0)+(G.fx.mut?0.06:0)+(AB.mutPlus||0);
  let m=rollMutation(mutExtra,ctx.W); if(!m&&G.fx.abyssal&&Math.random()<G.fx.abyssal) m="Abyssal";
  if(ctx.W.aw&&Math.random()<(AW_LOC[ctx.W.aw]===f.l?0.5:0.12)) m=AW[ctx.W.aw].mut;
  if(AB.mut){ const [mn,ch,cond]=AB.mut; const ok=!cond||(cond==="night"&&!ctx.W.day)||(cond==="day"&&ctx.W.day)||(cond==="deep"&&ctx.deep); const chance=AB.auroraMut&&ctx.W.aurora?AB.auroraMut:ch; if(ok&&Math.random()<chance) m=mn }
  if(ADM.nextMut){ m=ADM.nextMut; if(!ADM.sticky) ADM.nextMut="" }
  return {id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),n:f.n,w,m,sh:Math.random()<0.02,sp:Math.random()<0.02,bonus:Math.round(bonus*100)/100,fav:false} }
function catchFish(){
  const {f,w,fromShadow}=F.hooked, R=F.reel; F.reel=null; $("reel").style.display="none";
  const ctx=F.ctx, W=ctx.W, G=gearStats(W), rod=G.rod, ri=rIdx(f.r); const streak=S.stats.streak+1;
  const AB=G.AB||{}; let bonus=Math.min(0.45,(streak-1)*0.03)+(R.perfect?0.1:0)+(G.fx.val||0)+(AB.val||0); if(R.perfect&&AB.perfectVal) bonus+=AB.perfectVal;
  if(AB.every){ S.everyN=(S.everyN||0)+1; if(S.everyN%AB.every[0]===0){ bonus+=AB.every[1]; setTimeout(()=>toast(`${AB.n}: dieser Fang ist ${Math.round(AB.every[1]*100)} % mehr wert!`,"#2fd0c0"),700) } }
  const it=makeItem(f,w,ctx,G,bonus);
  const val=fishValue(it); let xp=Math.round(f.xp*G.xpMul); if(R.perfect){ xp=Math.round(xp*1.5); S.stats.perfect++ }
  const first=!S.dex[f.n]; const d=S.dex[f.n]||{c:0,bw:0,first:Date.now()}; d.c++; d.bw=Math.max(d.bw,w); S.dex[f.n]=d;
  S.dexLoc[ctx.loc]=(S.dexLoc[ctx.loc]||0)+1;
  S.fish.push(it); S.stats.caught++; S.stats.streak=streak; S.stats.bestStreak=Math.max(S.stats.bestStreak,streak); S.stats.rarest=Math.max(S.stats.rarest,ri);
  if(fromShadow) S.stats.shadow++; if(ctx.spot==="Coral Reef") S.stats.reef=1; if(ctx.inEvent&&EVSET.has(f.sub)) S.stats.event++;
  if(val>S.stats.bestV){ S.stats.bestV=val; S.stats.bestN=fishLabel(it) }
  if(G.bait){ S.bait[G.bait.n]--; if(S.bait[G.bait.n]<=0){ delete S.bait[G.bait.n]; S.baitEq=""; toast("Köder aufgebraucht.","#ffb35a") } }
  // counters for master quests
  if(W.weather==="Foggy"){ S.stats.foggy++; lqCount("foggy") } if(!W.day&&ri>=4){ S.stats.nightLeg++; lqCount("nightLeg") } if(ri>=6){ S.stats.exoticPlus++; lqCount("exoticPlus") }
  if(ctx.loc==="Snowcap Island"){ S.stats.snowCaught++; lqCount("snowCaught") } if(it.m==="Frozen"){ S.stats.frozen++; lqCount("frozen") } lqCount("fish:"+f.n);
  // rod mastery
  const mb=masteryOf(rod.n).L; S.mastery[rod.n]=(S.mastery[rod.n]||0)+1; const ma=masteryOf(rod.n).L;
  if(ma>mb) setTimeout(()=>{ bigMsg(`Meisterschaft ${ma}!`,`${rod.n} · Glück +${ma*4} % · Lure +${ma*2} %`,"#ffd24a"); SFX.level() },3000);
  // passives: double catch
  const dbl=(AB.dbl&&Math.random()<AB.dbl)||(AB.dblNight&&!W.day&&Math.random()<AB.dblNight);
  if(dbl&&S.fish.length<bagCap()){ const it2=makeItem(f,rollWeight(f,G.fx.weight||0),ctx,G,bonus); S.fish.push(it2); S.stats.caught++; d.c++; setTimeout(()=>{ toast(`Doppelfang! Noch ein ${fishLabel(it2)} (${fmtKg(it2.w)})`,"#cfd8e3"); SFX.coin() },900) }
  // relics & treasure maps
  if(!S.bottle&&Math.random()<0.007&&ISL.some(I=>I.sandbar&&!S.visited[I.n])){ const cand=ISL.filter(I=>I.sandbar&&!S.visited[I.n]); S.bottle=cand[Math.floor(Math.random()*cand.length)].n; setTimeout(()=>{ bigMsg("Flaschenpost!",bottleRiddle(S.bottle),"#bfe6ff"); SFX.quest(); addChat("Flaschenpost",bottleRiddle(S.bottle),false) },2600) }
  else if(Math.random()<(ri>=4?0.08:0.009)){ S.relics++; setTimeout(()=>{ bigMsg("Enchant-Relikt!","Am Altar kannst du damit eine Rute verzaubern.","#8fe8ff"); SFX.relic() },2400) }
  else if(!S.tmap&&Math.random()<0.014+(AB.tmap||0)){ const m=makeTreasureMap(); if(m){ S.tmap=m; setTimeout(()=>{ bigMsg("Schatzkarte!",`Irgendwo auf ${m.loc} ist etwas vergraben. Folge dem roten Strahl.`,"#ff8a6a"); SFX.quest() },2400) } }
  roredTrack("catch",{f,rod,R});
  if(SEAOF(f.l)&&Object.values(AW_LOC).includes(f.l)&&ri>=6) setTimeout(()=>bigMsg(f.r==="Divine"?"GÖTTLICH!!!":"UNGLAUBLICH!",`${fishLabel(it)} aus dem ${f.l}`,RCOL[f.r]),1600);
  gainXP(xp+(first?50:0));
  F.state="show"; F.showT=0; bobber.visible=false; myLine.visible=false; startShow(it,f);
  showCard(it,f,val,xp,first,R.perfect,streak); SFX.catch(ri); SFX.splash(1.2); splashFX(F.bob.x,F.bob.y,F.bob.z,26,1.3);
  if(ri>=4){ bigMsg(RDE[f.r].toUpperCase()+"!",f.n,RCOL[f.r]); if(ri>=5) flash(RCOL[f.r]+"66") }
  lastCatch={n:f.n,r:f.r,w,m:it.m,sh:it.sh,sp:it.sp,v:val,t:Date.now()};
  onCatchQuests(it,f,ctx); checkDexMilestones(f.l); checkStory();
  markDirty(); boardDirty=true; refreshHUD(); pushPresence(true);
}
function gainXP(x){ const before=levelInfo(S.xp).L; S.xp+=x; const after=levelInfo(S.xp).L;
  if(after>before){ const reward=40*after; S.money+=reward; setTimeout(()=>{ bigMsg(`Level ${after}!`,`+${fmt(reward)} C$ · +1 % Glück${titleFor(after)!==titleFor(before)?` · Titel: ${titleFor(after)}`:""}`,"#5fd8ff"); SFX.level() },900);
    BOATS.forEach(b=>{ if(b.lvl===after&&b.price) setTimeout(()=>toast(`Neu freigeschaltet: ${b.n} in der Werft von Moosewood!`,"#5fd8ff"),2600) }); if(after===BELL.lvl) setTimeout(()=>toast("Neu freigeschaltet: Tauchglocke in der Werft!","#5fd8ff"),2600);
    if(after===25) setTimeout(()=>toast("Level 25: Der Mahlstrom weit im Süden lässt dich jetzt mit dem Hochseeboot passieren. Dahinter liegt die Zweite See!","#bff0ff"),3200) } }

/* ---------- catch show ---------- */
let showFish=null; const showFrom=new THREE.Vector3(), showTo=new THREE.Vector3();
function startShow(it,f){ if(showFish){ scene.remove(showFish) } showFish=makeFishMesh(it.n,it.m); const s=clamp(fishSize(f)*0.9,0.7,3.2); showFish.scale.setScalar(s); showFish.userData.s=s; scene.add(showFish);
  showFrom.set(F.bob.x,F.bob.y,F.bob.z); F.showRar=f.r; F.showIt=it; burstFX(F.bob.x,F.bob.y+1,F.bob.z,RCOL[f.r],rIdx(f.r)>=4?120:50) }
function updateShow(dt,t){
  if(!showFish) return; F.showT+=dt; const T=F.showT;
  showTo.set(pl.x,me.group.position.y+(pl.boat?6.4:7.6)+showFish.userData.s*0.35,pl.z);
  if(T<0.75){ const k=smooth(T/0.75); showFish.position.lerpVectors(showFrom,showTo,k); showFish.position.y+=Math.sin(k*Math.PI)*7; showFish.rotation.set(Math.sin(T*20)*0.3,T*9,Math.sin(T*14)*0.5); if(Math.random()<0.5) FX.emit(showFish.position.x,showFish.position.y,showFish.position.z,0,-1,0,0.5,0.5,"#dff6ff",-8) }
  else { showFish.position.copy(showTo); showFish.rotation.set(0,pl.ry+Math.PI/2+Math.sin(t*2)*0.15,Math.sin(t*6)*0.12); if(F.state==="show") F.state="hold";
    const it=F.showIt; if((it.sh||it.sp||rIdx(F.showRar)>=4)&&Math.random()<dt*14) GLOW.emit(showFish.position.x+(Math.random()-.5)*2,showFish.position.y+(Math.random()-.5),showFish.position.z+(Math.random()-.5)*2,0,1,0,0.8,0.7,it.sh||it.sp?"#fff3b0":RCOL[F.showRar],-0.5) }
  if(T>3.1){ scene.remove(showFish); showFish=null; if(F.state==="hold"||F.state==="show") F.state="idle"; pushPresence(true) }
}
let cardTimer=0;
function showCard(it,f,val,xp,first,perfect,streak){
  const c=$("catchCv").getContext("2d"); c.clearRect(0,0,400,220); c.drawImage(fishIcon(it.n,it.m,false),0,0,400,220);
  $("cName").innerHTML=esc(fishLabel(it))+(first?'<span class="newtag">NEU</span>':""); $("cRar").innerHTML=rarHTML(f.r);
  const tag=it.w>1.99*f.bw?" · Giant!":it.w>f.bw?" · Big":""; const ml=masteryOf(S.rod); $("cMeta").textContent=`${fmtKg(it.w)}${tag} · +${fmt(xp+(first?50:0))} XP · Meisterschaft ${ml.L}${ml.next?` (${ml.c}/${ml.next})`:""}`;
  $("cVal").textContent=`${fmt(val)} C$`; const b=[]; if(perfect) b.push("Perfect +10 %"); if(streak>1) b.push(`Serie ×${streak} +${Math.round(Math.min(0.45,(streak-1)*0.03)*100)} %`); $("cBon").textContent=b.join(" · ");
  const el=$("catch"); el.style.borderColor=RCOL[f.r]; el.style.boxShadow=`0 24px 60px rgba(0,0,0,.5), 0 0 40px ${RCOL[f.r]}55`; el.classList.add("show"); clearTimeout(cardTimer); cardTimer=setTimeout(()=>el.classList.remove("show"),3200)
}
const floats=[];
function floatText(txt,color,life=1.4,scale=1){ const s=textSprite(txt,{size:64,color,scale:0.04*scale}); scene.add(s); floats.push({s,life,max:life}) }

/* ---------- fish icons (rendered with a small second renderer) ---------- */
const iconR=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true}); iconR.setSize(400,220,false); iconR.toneMapping=THREE.ACESFilmicToneMapping; iconR.setClearColor(0x000000,0);
const iconScene=new THREE.Scene(); iconScene.add(new THREE.HemisphereLight(0xffffff,0x33475e,1.6)); { const d=new THREE.DirectionalLight(0xffffff,2.6); d.position.set(2,4,5); iconScene.add(d); const d2=new THREE.DirectionalLight(0x9fd8ff,1.2); d2.position.set(-4,1,-2); iconScene.add(d2) }
const iconCam=new THREE.PerspectiveCamera(28,400/220,0.1,50); iconCam.position.set(0.3,0.55,5.2); iconCam.lookAt(0,0,0);
const ICONS={}; const silMat=new THREE.MeshBasicMaterial({color:0x14263a});
function fishIcon(n,mut,sil){ const key=n+"|"+(mut||"")+"|"+(sil?1:0); if(ICONS[key]) return ICONS[key];
  const m=makeFishMesh(n,mut); if(sil) m.material=silMat; m.geometry.computeBoundingSphere(); const bs=m.geometry.boundingSphere; m.scale.setScalar(1.62/bs.radius); m.position.set(-bs.center.x*1.62/bs.radius,-bs.center.y*1.62/bs.radius,0); m.rotation.y=-0.35;
  iconScene.add(m); iconR.render(iconScene,iconCam); iconScene.remove(m); if(!sil) m.material.dispose();
  const c=document.createElement("canvas"); c.width=400; c.height=220; c.getContext("2d").drawImage(iconR.domElement,0,0); return ICONS[key]=c }
function iconCanvas(n,mut,sil,w,h){ const c=document.createElement("canvas"); const dpr=Math.min(2,devicePixelRatio||1); c.width=w*dpr; c.height=h*dpr; c.style.width=w+"px"; c.style.height=h+"px"; c.getContext("2d").drawImage(fishIcon(n,mut,sil),0,0,c.width,c.height); return c }

/* ---------- quests ---------- */
function reward(rw,src){ if(rw.c){ S.money+=rw.c } if(rw.radar&&!S.radar){ S.radar=true; S.settings.radar=true; updateRadarUI(); setTimeout(()=>{ bigMsg("Fisch-Radar erhalten!","Taste R oder der Radar-Knopf zeigt Fischgebiete im Wasser.","#5fffd0"); SFX.relic() },3000) } if(rw.relic){ S.relics+=rw.relic; setTimeout(()=>toast(`+${rw.relic} Enchant-Relikt${rw.relic>1?"e":""}`,"#8fe8ff"),1800) } if(rw.bait){ S.bait[rw.bait[0]]=(S.bait[rw.bait[0]]||0)+rw.bait[1]; if(!S.baitEq) S.baitEq=rw.bait[0] } if(rw.boat&&S.boat<rw.boat){ S.boat=rw.boat; setTimeout(()=>{ bigMsg("Ruderboot erhalten!","Drücke B am Wasser, um es zu rufen.","#5fd8ff") },2800) } SFX.coin() }
function checkStory(){ let guard=0; while(STORY[S.story]&&guard++<5){ const q=STORY[S.story]; if(q.prog()<q.goal) break; reward(q.rw); const t=q.t; S.story++; setTimeout(()=>{ bigMsg("Auftrag erfüllt!",`${t} · +${fmt(q.rw.c||0)} C$`); SFX.quest() },1200); markDirty() } renderQuests(true) }
function onCatchQuests(it,f,ctx){ for(const b of S.bounties){ let ok=false;
    if(b.k==="count") ok=ctx.loc===b.loc; else if(b.k==="species") ok=f.n===b.f; else if(b.k==="rarity") ok=rIdx(f.r)>=b.min; else if(b.k==="weight") ok=f.n===b.f&&it.w>=b.w;
    if(ok){ b.have++; if(b.have>=b.n) b.done=true } }
  const done=S.bounties.filter(b=>b.done); if(done.length){ S.bounties=S.bounties.filter(b=>!b.done); done.forEach(b=>{ S.money+=b.rw; gainXP(b.xp); S.bountyDone++; lqCount("bounties"); setTimeout(()=>{ toast(`Auftrag erledigt: ${b.txt} · +${fmt(b.rw)} C$`,"#ffd24a"); SFX.coin() },1500) }); ensureBounties(ctx.loc) }
  renderQuests(done.length>0) }
function checkDexMilestones(loc){ const all=FISH.filter(f=>f.l===loc&&(f.r!=="Apex"||EVSET.has(f.sub))); if(!all.length) return; const got=all.filter(f=>S.dex[f.n]).length; const pct=got/all.length;
  const base=locTier(loc)*1.1;
  for(const [th,mul] of [[0.5,300],[1,1500]]){ const k=loc+"@"+th; if(pct>=th&&!S.dexRewards[k]){ S.dexRewards[k]=1; const c=Math.round(mul*base); S.money+=c; setTimeout(()=>{ bigMsg(th===1?"Bestiary-Seite komplett!":"Halbe Bestiary-Seite!",`${loc} · +${fmt(c)} C$`,"#c78bff"); SFX.quest() },2200) } } }
function renderQuests(flash){ const el=$("quests"); const q=STORY[S.story]; let h="";
  if(q){ const p=Math.min(q.goal,q.prog()); h+=`<div class="q story ${flash?"done":""}" data-open="quests"><div class="h"><span>STORY ${S.story+1}/${STORY.length}</span><span class="rw">+${fmt(q.rw.c||0)}</span></div>${esc(q.t)}<div style="font-weight:700;color:var(--ink2);font-size:12px">${esc(q.d)}</div>${q.goal>1?`<div class="bar"><i style="width:${p/q.goal*100}%"></i></div>`:""}</div>` }
  for(const b of S.bounties){ h+=`<div class="q" data-open="quests"><div class="h"><span>AUFTRAG</span><span class="rw">+${fmt(b.rw)}</span></div>${esc(b.txt)}${b.hint?`<div style="font-weight:700;color:var(--ink3);font-size:11px">${esc(b.hint)}</div>`:""}${b.n>1?`<div class="bar"><i style="width:${b.have/b.n*100}%"></i></div>`:""}</div>` }
  for(const id of Object.keys(LQ)){ const q=S.lq[id]; if(!q||q.done) continue; const st=LQ[id].steps[q.step]; if(!st) continue; const p=Math.min(st.goal,lqProgress(id));
    h+=`<div class="q master" data-open="quests"><div class="h"><span>${esc(LQ[id].npc.toUpperCase())}</span><span class="rw">${esc(LQ[id].rod)}</span></div>${esc(st.d)}${st.goal>1?`<div class="bar"><i style="width:${p/st.goal*100}%"></i></div>`:""}</div>` }
  el.innerHTML=h; el.querySelectorAll("[data-open]").forEach(x=>x.onclick=()=>openModal("quests")); $("qchipN").textContent=String(el.children.length) }

/* ---------- NPC, chest & dig interaction ---------- */
let nearNPC=null, curNPC=null, nearAct=null;
const NPC_LBL={merchant:n=>`Händler${n.loc==="Ocean"?" (Meer)":n.loc==="Sturmsee"?" (Sturmsee)":" · "+n.loc}`,shipwright:()=>"Werft",appraiser:()=>"Appraiser",alchemist:n=>n.label,altar:n=>n.label+" · Verzaubern",lq:n=>n.label,villager:n=>n.label};
function updatePrompt(){ nearNPC=null; nearAct=null; let bd=9;
  if(!pl.boat){ for(const n of NPCS){ const d=Math.hypot(n.x-pl.x,n.z-pl.z); if(d<bd){ bd=d; nearNPC=n } if(n.type==="lq"&&d<16&&!S.found[n.lq]){ S.found[n.lq]=1; markDirty(); bigMsg("Verborgener Meister!",n.label,"#ffd24a"); SFX.quest(); checkStory() } }
    if(nearNPC) nearAct={kind:"npc",n:nearNPC,label:NPC_LBL[nearNPC.type](nearNPC)};
    for(const c of CHESTS){ if(S.chests[c.id]) continue; const d=Math.hypot(c.x-pl.x,c.z-pl.z); if(d<4.5&&d<bd){ bd=d; nearAct={kind:"chest",c,label:"Schatztruhe öffnen"} } }
    if(S.tmap){ const d=Math.hypot(S.tmap.x-pl.x,S.tmap.z-pl.z); if(d<5) nearAct={kind:"dig",label:"Hier graben"} } }
  const show=nearAct&&F.state==="idle"&&!modalOpen(); $("prompt").style.display=show&&!TOUCH?"block":"none"; $("tUse").style.display=show?"flex":"none";
  if(show){ $("promptT").textContent=nearAct.label; $("tUseT").textContent=nearAct.kind==="chest"?"Öffnen":nearAct.kind==="dig"?"Graben":nearAct.n.type==="villager"?"Reden":"Reden" } }
function interact(){ if(!nearAct||F.state!=="idle") return; SFX.ui();
  if(nearAct.kind==="chest") return openChest(nearAct.c); if(nearAct.kind==="dig") return digTreasure();
  const n=nearAct.n; curNPC=n; if(n.type==="villager") return villagerTalk(n); if(n.type==="lq") return openModal("lq"); openModal(n.type) }

/* ---------- panels ---------- */
let panel=null, panelTab=null;
document.querySelectorAll("[data-open]").forEach(b=>b.addEventListener("click",e=>{ e.stopPropagation(); curNPC=null; openModal(b.dataset.open,b.dataset.tab) }));
$("closeBtn").addEventListener("click",()=>closeModal()); $("modal").addEventListener("pointerdown",e=>{ if(e.target.id==="modal") closeModal() });
function closeModal(){ $("modal").classList.remove("on"); panel=null; SFX.ui() }
function openModal(p,tab){ $("mmenu").classList.remove("on"); if(F.state==="charge") cancelFishing(); panel=p; panelTab=tab||null; $("modal").classList.add("on"); if(F.reel) F.reel.hold=false; renderPanel() }
function setTabs(list,cur){ $("tabs").innerHTML=list.map(([k,l])=>`<button data-tab="${esc(k)}" class="${k===cur?"on":""}">${esc(l)}</button>`).join("") }
$("tabs").addEventListener("click",e=>{ const b=e.target.closest("button[data-tab]"); if(!b) return; panelTab=b.dataset.tab; SFX.ui(); renderPanel() });
function renderPanel(){ const body=$("sheetBody"); const st=body.scrollTop; body.innerHTML=""; ({bag:panelBag,quests:panelQuests,dex:panelDex,gear:panelGear,map:panelMap,players:panelPlayers,merchant:panelMerchant,shipwright:panelShip,appraiser:panelAppraise,admin:panelAdmin,altar:panelAltar,alchemist:panelAlchemist,lq:panelLQ})[panel]?.(body); if(panel!=="map") body.scrollTop=st }
function fishRow(it,actions){ const f=FISHBY[it.n], v=fishValue(it); const row=document.createElement("div"); row.className="fishrow"; row.appendChild(iconCanvas(it.n,it.m,false,70,40));
  const mid=document.createElement("div"); mid.innerHTML=`<div class="nm">${esc(fishLabel(it))}</div><div class="sub">${rarHTML(f.r)} · ${fmtKg(it.w)} · <span style="color:var(--cash)">${fmt(v)} C$</span></div>`; row.appendChild(mid);
  const act=document.createElement("div"); act.className="row"; const fav=document.createElement("button"); fav.className="fav"+(it.fav?" on":""); fav.textContent="★"; fav.title="Favorit (wird nicht mitverkauft)"; fav.onclick=()=>{ it.fav=!it.fav; markDirty(); renderPanel() }; act.appendChild(fav); actions(act,it,v,f); row.appendChild(act); return row }
function sellFish(filter){ let v=0,n=0; S.fish=S.fish.filter(it=>{ if(filter(it)){ v+=fishValue(it); n++; return false } return true }); if(!n) return 0; S.money+=v; S.stats.earned+=v; S.stats.sold+=n; markDirty(); boardDirty=true; refreshHUD(); SFX.coin(); checkStory(); return v }
function panelBag(body){ $("sheetTitle").textContent="Rucksack"; setTabs([],null); const total=S.fish.reduce((s,it)=>s+fishValue(it),0);
  const bf=Object.entries(POTIONS).filter(([k])=>buffActive(k)).map(([k,p])=>`${p.n} (${Math.ceil((S.buffs[k]-Date.now())/60000)} min)`);
  body.insertAdjacentHTML("beforeend",`<div class="row chips"><span class="chip">Enchant-Relikte <b>${S.relics}</b></span><span class="chip">Schatzkarte <b>${S.tmap?esc(S.tmap.loc):"keine"}</b></span>${S.bottle?`<span class="chip good" title="${esc(bottleRiddle(S.bottle))}">Flaschenpost <b>1</b></span>`:""}${bf.map(x=>`<span class="chip good">${esc(x)}</span>`).join("")}</div>`);
  if(S.bottle) body.insertAdjacentHTML("beforeend",`<p class="note" style="color:#bfe6ff;font-style:italic">Flaschenpost: ${esc(bottleRiddle(S.bottle))}</p>`);
  body.insertAdjacentHTML("beforeend",`<p class="note">Mit „Hochhalten“ (oder Taste H) zeigst du allen Spielern einen Fisch. ${S.fish.length}/${bagCap()} Fische · Wert <b style="color:var(--cash)">${fmt(total)} C$</b>. Verkaufen kannst du bei jedem Händler (Stand am Steg jeder Insel, Flöße auf dem Meer). Mit ★ markierte Fische werden nicht mitverkauft.</p>`);
  if(!S.fish.length) body.insertAdjacentHTML("beforeend",`<p class="note">Noch leer.</p>`);
  [...S.fish].sort((a,b)=>fishValue(b)-fishValue(a)).forEach(it=>body.appendChild(fishRow(it,act=>{ const b=document.createElement("button"); b.className="btn "+(holdIt===it?"":"alt"); b.textContent=holdIt===it?"Ablegen":"Hochhalten"; b.title="Allen zeigen (Taste H)"; b.onclick=()=>{ if(holdIt===it) setHold(null); else { if(F.state!=="idle") return; setHold(it); closeModal() } renderPanel() }; act.appendChild(b) }))) }
function panelMerchant(body){ const loc=curNPC?.loc||"Moosewood"; $("sheetTitle").textContent=loc==="Ocean"?"Meereshändler":`Händler · ${loc}`; const tab=panelTab||"sell";
  setTabs([["sell","Verkaufen"],["rods","Ruten"],["bait","Köder"],["bag","Rucksack-Upgrade"]],tab);
  if(tab==="sell"){ const sellable=S.fish.filter(it=>!it.fav); const total=sellable.reduce((s,it)=>s+fishValue(it),0);
    const top=document.createElement("div"); top.className="row"; top.innerHTML=`<span class="note" style="flex:1">${S.fish.length} Fische · ohne Favoriten <b style="color:var(--cash)">${fmt(total)} C$</b></span>`;
    const b=document.createElement("button"); b.className="btn gold"; b.textContent="Alles verkaufen"; b.disabled=!sellable.length; b.onclick=()=>{ const v=sellFish(it=>!it.fav); toast(`+${fmt(v)} C$`,"#ffe27a"); renderPanel() }; top.appendChild(b); body.appendChild(top);
    [...S.fish].sort((a,b)=>fishValue(b)-fishValue(a)).forEach(it=>body.appendChild(fishRow(it,(act)=>{ const s=document.createElement("button"); s.className="btn"; s.textContent="Verkaufen"; s.onclick=()=>{ sellFish(x=>x.id===it.id); renderPanel() }; act.appendChild(s) }))); return }
  if(tab==="rods"){ const list=RODS.filter(r=>r.loc===loc&&r.price>0); if(!list.length) body.insertAdjacentHTML("beforeend",`<p class="note">Dieser Händler hat keine Ruten. Unter „Ausrüstung“ siehst du, wo es welche gibt.</p>`);
    const g=document.createElement("div"); g.className="grid"; list.forEach(r=>g.appendChild(rodCard(r,true))); body.appendChild(g); return }
  if(tab==="bait"){ const items=Object.entries(BAIT_SHOP).filter(([,v])=>v[1]===loc); const crates=Object.entries(CRATES).filter(([,c])=>c.loc===loc);
    if(!items.length&&!crates.length) body.insertAdjacentHTML("beforeend",`<p class="note">Hier gibt es keine Köder. Würmer und die Bait Crate gibt es in Moosewood.</p>`);
    const g=document.createElement("div"); g.className="grid";
    for(const [k,[price]] of items){ const b=BAIT[k]; const c=document.createElement("div"); c.className="card"; c.innerHTML=`<h3>${esc(k)}</h3><div class="sub">${rarHTML(b.r)} · ${FISH.filter(f=>f.b.includes(k)).length} Arten mögen ihn · du hast ${S.bait[k]||0}</div><div class="kv"><span>Lieblingsköder-Glück</span><b>+${b.pl}%</b><span>Glück</span><b>${b.ul}%</b><span>Resilience</span><b>${b.res}%</b><span>Lure</span><b>${b.lure}%</b></div>`;
      const bt=document.createElement("button"); bt.className="btn gold"; bt.textContent=`5 Stück · ${fmt(price*5)} C$`; bt.disabled=S.money<price*5; bt.onclick=()=>{ if(S.money<price*5) return; S.money-=price*5; S.bait[k]=(S.bait[k]||0)+5; if(!S.baitEq) S.baitEq=k; SFX.coin(); markDirty(); refreshHUD(); renderPanel() }; c.appendChild(bt); g.appendChild(c) }
    for(const [name,cr] of crates){ const c=document.createElement("div"); c.className="card"; const tot=Object.values(cr.items).reduce((a,b)=>a+b,0);
      c.innerHTML=`<h3>${esc(name)}</h3><div class="sub">Zufallsköder</div><div class="kv">${Object.entries(cr.items).map(([k,w])=>`<span>${esc(k)}</span><b>${(w/tot*100).toFixed(0)}%</b>`).join("")}</div>`;
      const bt=document.createElement("button"); bt.className="btn gold"; bt.textContent=`Öffnen · ${fmt(cr.price)} C$`; bt.disabled=S.money<cr.price;
      bt.onclick=()=>{ if(S.money<cr.price) return; S.money-=cr.price; const k=wpick(cr.items); const bb=BAIT[k]; const q=bb&&rIdx(bb.r)<=2?4:bb&&rIdx(bb.r)===3?3:2; S.bait[k]=(S.bait[k]||0)+q; if(!S.baitEq) S.baitEq=k; markDirty(); refreshHUD(); SFX.coin(); toast(`${name}: ${k} ×${q}`,RCOL[bb?.r]||"#fff"); renderPanel() };
      c.appendChild(bt); g.appendChild(c) } body.appendChild(g); return }
  const nxt=S.bag+1; body.insertAdjacentHTML("beforeend",`<p class="note">Aktuell passen <b>${bagCap()}</b> Fische in deinen Rucksack.</p>`);
  if(BAGS[nxt]){ const c=document.createElement("div"); c.className="card"; c.style.maxWidth="360px"; c.innerHTML=`<h3>Größerer Rucksack</h3><div class="kv"><span>Platz</span><b class="up">${bagCap()} → ${BAGS[nxt]}</b><span>Preis</span><b>${fmt(BAG_PRICE[nxt])} C$</b></div>`;
    const b=document.createElement("button"); b.className="btn gold"; b.textContent="Aufrüsten"; b.disabled=S.money<BAG_PRICE[nxt]; b.onclick=()=>{ if(S.money<BAG_PRICE[nxt]) return; S.money-=BAG_PRICE[nxt]; S.bag=nxt; SFX.level(); markDirty(); refreshHUD(); renderPanel() }; c.appendChild(b); body.appendChild(c) }
  else body.insertAdjacentHTML("beforeend",`<p class="note">Das ist der größte Rucksack.</p>`) }
function statCmp(v,cur,fmtf=(x)=>x){ const cls=v>cur?"up":v<cur?"down":""; return `<b class="${cls}">${fmtf(v)}</b>` }
const rodCol=r=>{ const L=c=>new THREE.Color(c).getHSL({}).l; return L(r.mc)>=0.3?r.mc:L(r.c1)>=0.3?r.c1:L(r.c2)>=0.3?r.c2:"#ffffff" };
function rodCard(r,atShop){ const own=S.rods.includes(r.n), cur=ROD[S.rod]; const c=document.createElement("div"); c.className="card"+(S.rod===r.n?" sel":"")+(r.quest?" legend":"");
  const M=masteryOf(r.n), E=ENCHBY[S.ench[r.n]];
  c.innerHTML=`<h3 style="color:${esc(rodCol(r))}">${esc(r.n)}</h3><div class="sub">${r.quest?"Legendäre Rute · Quest bei "+esc(LQ[r.quest].npc)+" ("+esc(S.visited[LQ[r.quest].loc]||!ISLBY[LQ[r.quest].loc]?.hidden?LQ[r.quest].loc:"???")+")":r.price?fmt(r.price)+" C$ · "+esc(locName(r.loc)):"Startrute"}</div>
   ${abilOf(r.n)?`<div class="sub abil">✦ <b>${esc(abilOf(r.n).n)}</b>: ${esc(abilOf(r.n).d)}</div>`:""}${own?`<div class="sub">Meisterschaft <b style="color:var(--gold)">${M.L}</b>${M.next?` · ${M.c}/${M.next} Fänge`:" · max"}${E?` · <span style="color:${enchTier(E)[1]}">${esc(E.n)}</span>`:""}</div>`:""}
   <div class="kv"><span>Lure Speed</span>${statCmp(r.lure,cur.lure,x=>x+"%")}<span>Glück</span>${statCmp(r.luck,cur.luck,x=>x+"%")}<span>Control</span>${statCmp(r.ctrl,cur.ctrl,x=>Math.round(x*100)+"%")}<span>Resilience</span>${statCmp(r.res,cur.res,x=>x+"%")}<span>Max Gewicht</span>${statCmp(r.mw||1e9,cur.mw||1e9,x=>x>=1e9?"∞":fmtKg(x))}</div>`;
  const b=document.createElement("button");
  if(own){ b.className="btn"; b.textContent=S.rod===r.n?"Ausgerüstet":"Ausrüsten"; b.disabled=S.rod===r.n; b.onclick=()=>{ S.rod=r.n; setRodLook(me,r.n); colorBobber(bobber,r.n); SFX.ui(); markDirty(); refreshHUD(); pushPresence(true); renderPanel() } }
  else if(atShop){ b.className="btn gold"; b.textContent=`Kaufen · ${fmt(r.price)} C$`; b.disabled=S.money<r.price; b.onclick=()=>{ if(S.money<r.price) return; S.money-=r.price; S.rods.push(r.n); S.rod=r.n; setRodLook(me,r.n); colorBobber(bobber,r.n); SFX.level(); bigMsg("Neue Rute!",r.n,r.mc); markDirty(); refreshHUD(); pushPresence(true); checkStory(); renderPanel() } }
  else { b.className="btn alt"; b.textContent=r.quest?"Nicht käuflich":`Beim Händler: ${locName(r.loc)}`; b.disabled=true }
  c.appendChild(b); return c }
function panelGear(body){ $("sheetTitle").textContent="Ausrüstung"; const tab=panelTab||"rods"; setTabs([["rods","Meine Ruten"],["all","Alle Ruten"],["bait","Köder"],["boats","Boote"]],tab);
  if(tab==="rods"||tab==="all"){ const g=document.createElement("div"); g.className="grid"; (tab==="rods"?RODS.filter(r=>S.rods.includes(r.n)):RODS).forEach(r=>g.appendChild(rodCard(r,false))); body.appendChild(g);
    if(tab==="all") body.insertAdjacentHTML("afterbegin",`<p class="note">Grün = besser als deine aktuelle Rute. Ruten kaufst du beim Händler der jeweiligen Insel.</p>`); return }
  if(tab==="bait"){ const inv=Object.entries(S.bait).filter(([,n])=>n>0); const g=document.createElement("div"); g.className="grid";
    const none=document.createElement("div"); none.className="card"+(!S.baitEq?" sel":""); none.innerHTML=`<h3>Ohne Köder</h3><div class="sub">Keine Boni</div>`; const nb=document.createElement("button"); nb.className="btn alt"; nb.textContent=S.baitEq?"Ablegen":"Aktiv"; nb.disabled=!S.baitEq; nb.onclick=()=>{ S.baitEq=""; markDirty(); refreshHUD(); renderPanel() }; none.appendChild(nb); g.appendChild(none);
    for(const [k,n] of inv){ const b=BAIT[k]||{r:"Common",pl:0,ul:0,res:0,lure:0}; const c=document.createElement("div"); c.className="card"+(S.baitEq===k?" sel":"");
      c.innerHTML=`<h3>${esc(k)} ×${n}</h3><div class="sub">${rarHTML(b.r)} · ${FISH.filter(f=>f.b.includes(k)).length} Arten mögen ihn</div><div class="kv"><span>Lieblingsköder-Glück</span><b>+${b.pl}%</b><span>Glück</span><b>${b.ul}%</b><span>Resilience</span><b>${b.res}%</b><span>Lure</span><b>${b.lure}%</b></div>`;
      const bt=document.createElement("button"); bt.className="btn"; bt.textContent=S.baitEq===k?"Aktiv":"Benutzen"; bt.disabled=S.baitEq===k; bt.onclick=()=>{ S.baitEq=k; SFX.ui(); markDirty(); refreshHUD(); renderPanel() }; c.appendChild(bt); g.appendChild(c) }
    body.appendChild(g); if(!inv.length) body.insertAdjacentHTML("beforeend",`<p class="note">Keine Köder. Würmer gibt es beim Händler in Moosewood.</p>`); return }
  body.insertAdjacentHTML("beforeend",`<p class="note">Boote kaufst du in der Werft von Moosewood. Jedes Boot fährt weiter hinaus; die Ringe siehst du auf der Karte.</p>`);
  const g=document.createElement("div"); g.className="grid"; BOATS.slice(1).forEach(b=>{ const c=document.createElement("div"); c.className="card"+(S.boat===b.id?" sel":"")+(S.boat<b.id?" lock":""); c.innerHTML=`<h3>${b.n}</h3><div class="sub">${esc(b.d)}</div><div class="kv"><span>Tempo</span><b>${b.speed}</b><span>Reichweite</span><b>${b.range>5000?"unbegrenzt":b.range}</b><span>Status</span><b>${S.boat>=b.id?"Besitzt du":"Werft · "+(b.price?fmt(b.price)+" C$":"Story")+" · Lvl "+b.lvl}</b></div>`; g.appendChild(c) });
  const bc=document.createElement("div"); bc.className="card"+(S.bell?" sel":" lock"); bc.innerHTML=`<h3>Tauchglocke</h3><div class="sub">Damit beißen in den Tiefseezonen (auch im Abgrund der Stille) deren eigene Fische.</div><div class="kv"><span>Status</span><b>${S.bell?"Besitzt du":"Werft · "+fmt(BELL.price)+" C$ · Lvl "+BELL.lvl}</b></div>`; g.appendChild(bc); body.appendChild(g) }
function panelShip(body){ $("sheetTitle").textContent="Werft · Moosewood"; setTabs([],null); const L=levelInfo(S.xp).L;
  body.insertAdjacentHTML("beforeend",`<p class="note">Werftmeister Ole: „Mit einem besseren Boot kommst du weiter raus. Da draußen warten größere Fische.“</p>`);
  const g=document.createElement("div"); g.className="grid";
  BOATS.slice(1).forEach(b=>{ const c=document.createElement("div"); c.className="card"+(S.boat===b.id?" sel":""); c.innerHTML=`<h3>${b.n}</h3><div class="sub">${esc(b.d)}</div><div class="kv"><span>Tempo</span><b>${b.speed}</b><span>Reichweite</span><b>${b.range>5000?"unbegrenzt":b.range}</b><span>Level</span><b>${b.lvl}</b><span>Preis</span><b>${b.price?fmt(b.price)+" C$":"Story-Belohnung"}</b></div>`;
    const bt=document.createElement("button"); if(S.boat>=b.id){ bt.className="btn alt"; bt.textContent="Besitzt du"; bt.disabled=true } else if(!b.price){ bt.className="btn alt"; bt.textContent="Über die Story"; bt.disabled=true }
    else { bt.className="btn gold"; bt.textContent=L<b.lvl?`Ab Level ${b.lvl}`:`Kaufen · ${fmt(b.price)} C$`; bt.disabled=L<b.lvl||S.money<b.price||S.boat<b.id-1; bt.onclick=()=>{ if(S.money<b.price) return; S.money-=b.price; S.boat=b.id; SFX.level(); bigMsg(`${b.n}!`,"Drücke B am Wasser.","#5fd8ff"); markDirty(); refreshHUD(); checkStory(); renderPanel() } }
    c.appendChild(bt); g.appendChild(c) });
  const c=document.createElement("div"); c.className="card"+(S.bell?" sel":""); c.innerHTML=`<h3>Tauchglocke</h3><div class="sub">Öffnet die Tiefseezonen Desolate Deep, Vertigo und The Depths für ihre eigenen Fische.</div><div class="kv"><span>Level</span><b>${BELL.lvl}</b><span>Preis</span><b>${fmt(BELL.price)} C$</b></div>`;
  const bt=document.createElement("button"); if(S.bell){ bt.className="btn alt"; bt.textContent="Besitzt du"; bt.disabled=true } else { bt.className="btn gold"; bt.textContent=L<BELL.lvl?`Ab Level ${BELL.lvl}`:`Kaufen · ${fmt(BELL.price)} C$`; bt.disabled=L<BELL.lvl||S.money<BELL.price; bt.onclick=()=>{ if(S.money<BELL.price) return; S.money-=BELL.price; S.bell=true; SFX.level(); bigMsg("Tauchglocke!","Die Tiefe ruft.","#5fd8ff"); markDirty(); refreshHUD(); checkStory(); renderPanel() } }
  c.appendChild(bt); g.appendChild(c); body.appendChild(g) }
function panelAppraise(body){ $("sheetTitle").textContent="Appraiser"; setTabs([],null);
  body.insertAdjacentHTML("beforeend",`<p class="note">Appraiserin Vivi würfelt Gewicht und mit Glück eine Mutation neu. Kosten: 30 % des Fischwerts. Shiny und Sparkling bleiben erhalten.</p>`);
  if(!S.fish.length) body.insertAdjacentHTML("beforeend",`<p class="note">Du hast keine Fische dabei.</p>`);
  [...S.fish].sort((a,b)=>fishValue(b)-fishValue(a)).forEach(it=>body.appendChild(fishRow(it,(act,it,v,f)=>{ const cost=Math.max(30,Math.round(v*0.3)); const b=document.createElement("button"); b.className="btn alt"; b.textContent=`Appraise · ${fmt(cost)}`; b.disabled=S.money<cost;
    b.onclick=()=>{ if(S.money<cost) return; S.money-=cost; it.w=rollWeight(f); if(Math.random()<0.15) it.m=rollMutation(1)||it.m; if(!it.sh&&Math.random()<0.015) it.sh=true; if(!it.sp&&Math.random()<0.015) it.sp=true;
      SFX.coin(); markDirty(); refreshHUD(); toast(`${fishLabel(it)} · ${fmtKg(it.w)} · ${fmt(fishValue(it))} C$`,"#c78bff"); renderPanel() }; act.appendChild(b) }))) }
function panelQuests(body){ $("sheetTitle").textContent="Aufträge"; setTabs([],null); const q=STORY[S.story];
  body.insertAdjacentHTML("beforeend",`<div class="sect">Story</div>`);
  if(q){ const p=Math.min(q.goal,q.prog()); body.insertAdjacentHTML("beforeend",`<div class="card"><h3>${S.story+1}. ${esc(q.t)}</h3><div class="sub">${esc(q.d)}</div><div class="pbar"><i style="width:${p/q.goal*100}%"></i></div><div class="sub">${fmt(p)} / ${fmt(q.goal)} · Belohnung ${fmt(q.rw.c||0)} C$${q.rw.boat?" + Ruderboot":""}${q.rw.bait?` + ${q.rw.bait[1]}× ${q.rw.bait[0]}`:""}</div></div>`) }
  else body.insertAdjacentHTML("beforeend",`<p class="note">Du hast die ganze Story abgeschlossen. Respekt, Meisterangler!</p>`);
  body.insertAdjacentHTML("beforeend",`<p class="note">${S.story} von ${STORY.length} Kapiteln erledigt.</p><div class="sect">Aufträge</div>`);
  S.bounties.forEach((b,i)=>{ const c=document.createElement("div"); c.className="card"; c.innerHTML=`<h3>${esc(b.txt)}</h3>${b.hint?`<div class="sub">${esc(b.hint)}</div>`:""}<div class="pbar"><i style="width:${b.have/b.n*100}%"></i></div><div class="sub">${b.have}/${b.n} · Belohnung ${fmt(b.rw)} C$ + ${fmt(b.xp)} XP</div>`;
    const bt=document.createElement("button"); bt.className="btn alt"; bt.textContent="Neuer Auftrag · 25 C$"; bt.disabled=S.money<25; bt.onclick=()=>{ S.money-=25; S.bounties.splice(i,1); ensureBounties(locationAt(pl.x,pl.z)); markDirty(); refreshHUD(); renderQuests(); renderPanel() }; c.appendChild(bt); body.appendChild(c) });
  body.insertAdjacentHTML("beforeend",`<p class="note">${S.bountyDone} Aufträge erledigt. Neue Aufträge richten sich nach der Insel, auf der du gerade bist.</p><div class="sect">Verborgene Meister</div>`);
  const g=document.createElement("div"); g.className="grid"; for(const [id,L] of Object.entries(LQ)){ const q=S.lq[id], found=S.found[id]; const c=document.createElement("div"); c.className="card"+(q&&q.done?" sel":found?"":" lock");
    const st=q&&!q.done?L.steps[q.step]:null; c.innerHTML=`<h3>${found?esc(L.npc):"???"}</h3><div class="sub">${found?esc(L.loc)+" · "+esc(L.rod):"Ein Gerücht: "+esc({aldo:"im Nebel ganz im Osten",mara:"hinter den Klippen von Castaway",rored:"am Rand eines glühenden Kraters",tenzin:"auf dem Gipfel von Snowcap",ysolde:"am Ostrand der Zweiten See"}[id])}</div>${q&&q.done?`<div class="sub" style="color:var(--good)">Abgeschlossen · Titel „${esc(L.title)}“</div>`:st?`<div class="sub">Schritt ${q.step+1}/4: ${esc(st.d)}</div><div class="pbar"><i style="width:${Math.min(1,lqProgress(id)/st.goal)*100}%"></i></div>`:found?`<div class="sub">Sprich mit ${esc(L.npc)}, um die Prüfung anzunehmen.</div>`:""}`; g.appendChild(c) }
  body.appendChild(g) }
let dexSea=0;
const locKnown=l=>{ const I=ISLBY[l]; return !(I&&I.hidden)||S.visited[l] };
function panelDex(body){ $("sheetTitle").textContent="Bestiary"; let tab=panelTab||locationAt(pl.x,pl.z); if(tab==="sea1"||tab==="sea2"){ dexSea=tab==="sea2"?2:1; tab=ALL_LOC.find(l=>SEAOF(l)===dexSea) } if(!dexSea||SEAOF(tab)!==dexSea) dexSea=SEAOF(tab);
  setTabs([["sea"+(dexSea===1?2:1),dexSea===1?"Zweite See ›":"‹ Erste See"],...ALL_LOC.filter(l=>SEAOF(l)===dexSea).map(l=>[l,!locKnown(l)?"???":l==="Ocean"?"Meer":l])],tab);
  if(!locKnown(tab)){ body.insertAdjacentHTML("beforeend",`<p class="note">Diesen Ort hast du noch nicht gefunden.</p>`); return }
  const list=FISH.filter(f=>f.l===tab&&(f.r!=="Apex"||EVSET.has(f.sub))).sort((a,b)=>rIdx(a.r)-rIdx(b.r)||a.n.localeCompare(b.n)); const got=list.filter(f=>S.dex[f.n]).length;
  body.insertAdjacentHTML("beforeend",`<div class="row"><span class="note" style="flex:1"><b>${got}/${list.length}</b> Arten in ${esc(locName(tab))} · 50 % und 100 % geben Bonus-C$ · gesamt ${Object.keys(S.dex).length}/${FISH.length}</span></div><div class="pbar"><i style="width:${list.length?got/list.length*100:0}%"></i></div>`);
  const g=document.createElement("div"); g.className="grid";
  for(const f of list){ const d=S.dex[f.n]; const c=document.createElement("div"); c.className="card"; c.appendChild(iconCanvas(f.n,"",!d,180,99)); const ev=EVSET.has(f.sub);
    const info=`<div class="kv"><span>Zeit</span><b>${f.t?(f.t==="Day"?"Tag":"Nacht"):"immer"}</b><span>Wetter</span><b>${f.w.length?f.w.map(w=>WEATHER_DE[w]||w).join(", "):"egal"}</b><span>Saison</span><b>${f.s.length?f.s.map(s=>SEASON_DE[s]||s).join(", "):"egal"}</b><span>Köder</span><b>${f.b.length?esc(f.b.join(", ")):"egal"}</b>${f.sub&&!ev?`<span>Ort</span><b>${esc(spotDE(f.sub))}</b>`:""}</div>`;
    c.insertAdjacentHTML("beforeend", d ? `<h3>${esc(f.n)}</h3><div class="sub">${rarHTML(f.r)} · ${d.c}× · max ${fmtKg(d.bw)} · ~${fmt(f.bv)} C$</div>${info}` : `<h3>???</h3><div class="sub">${rarHTML(f.r)}${ev?" · nur bei "+esc(f.sub):""}</div>${rIdx(f.r)<=3?info:""}`);
    g.appendChild(c) } body.appendChild(g) }
let mapSea=0;
function mapFrame(sea){ const cx=seaC(sea), R=seaR(sea)*1.1; return {cx,R} }
function w2mS(x,z,size,M){ return [((x-M.cx)/(M.R*2)+.5)*size,(z/(M.R*2)+.5)*size] }
function drawMap(c,size,full,sea){ sea=sea||curSea; const M=mapFrame(sea), sc=size/(M.R*2), w2m=(x,z)=>w2mS(x,z,size,M); c.clearRect(0,0,size,size);
  const gr=c.createRadialGradient(size/2,size/2,size*0.1,size/2,size/2,size*0.7); gr.addColorStop(0,sea===2?"#1a6a8a":"#1576ad"); gr.addColorStop(1,sea===2?"#0a2e46":"#0a3e66"); c.fillStyle=gr; c.fillRect(0,0,size,size);
  const [ox,oy]=w2m(seaC(sea),0); c.strokeStyle="rgba(255,255,255,.15)"; c.lineWidth=2; c.beginPath(); c.arc(ox,oy,seaR(sea)*sc,0,7); c.stroke();
  if(sea===1){ c.setLineDash([8,8]); BOATS.slice(1,3).forEach(b=>{ c.strokeStyle=S.boat>b.id?"rgba(255,255,255,.2)":"rgba(255,210,74,.55)"; c.beginPath(); c.arc(ox,oy,b.range*sc,0,7); c.stroke() }); c.setLineDash([]) }
  const W=world(), EZ=sea===1?eventZone(W.event):null;
  for(const Z of DEEPZ){ if(Z.sea!==sea) continue; const [x,y]=w2m(Z.x,Z.z); c.fillStyle=Z.col; c.beginPath(); c.arc(x,y,Z.r*sc,0,7); c.fill(); c.strokeStyle="rgba(200,160,255,.5)"; c.lineWidth=1.5; c.stroke() }
  for(const Pt of PORTALS){ if(Pt.from!==sea) continue; const [x,y]=w2m(Pt.x,Pt.z); const g2=c.createRadialGradient(x,y,0,x,y,Pt.r*sc*1.3); g2.addColorStop(0,"#ffffff"); g2.addColorStop(0.4,sea===1?"#5fd8ff":"#ffb35a"); g2.addColorStop(1,"rgba(0,0,0,0)"); c.fillStyle=g2; c.beginPath(); c.arc(x,y,Pt.r*sc*1.3,0,7); c.fill() }
  for(const I of ISL){ if(I.sea!==sea||(I.hidden&&!S.visited[I.n])) continue; const [x,y]=w2m(I.x,I.z); c.fillStyle=I.pal.sand; c.beginPath(); c.arc(x,y,I.r*sc*1.02,0,7); c.fill(); c.fillStyle=I.pal.grass; c.beginPath(); c.arc(x,y,I.r*sc*0.8,0,7); c.fill();
    if(I.biome==="cliffring"){ c.fillStyle="#2a9ec4"; c.beginPath(); c.arc(x,y,I.r*sc*0.32,0,7); c.fill() } }
  if(radarOn()) for(const a of AREAS){ if(SEAOF(a.loc)!==sea||!a.fish.length||a.fresh||(ISLBY[a.loc]&&ISLBY[a.loc].hidden&&!S.visited[a.loc])) continue; const [x,y]=w2m(a.x,a.z); c.fillStyle=areaColor(a)+"55"; c.beginPath(); c.ellipse(x,y,Math.max(2,a.r*sc),Math.max(2,a.r*sc/a.asp),0,0,7); c.fill() }
  if(EZ){ const [x,y]=w2m(EZ.x,EZ.z); c.fillStyle="rgba(255,90,60,.18)"; c.setLineDash([6,5]); c.strokeStyle="#ff7b54"; c.lineWidth=full?3:2; c.beginPath(); c.arc(x,y,Math.max(5,EZ.r*sc),0,7); c.fill(); c.stroke(); c.setLineDash([]) }
  for(const R of RAFTS){ if(seaAt(R.x)!==sea) continue; const [x,y]=w2m(R.x,R.z); c.fillStyle="#e6c28a"; c.fillRect(x-5,y-5,10,10) }
  if(S.tmap&&seaAt(S.tmap.x)===sea){ const [x,y]=w2m(S.tmap.x,S.tmap.z); c.strokeStyle="#ff3a2a"; c.lineWidth=4; c.beginPath(); c.moveTo(x-8,y-8); c.lineTo(x+8,y+8); c.moveTo(x+8,y-8); c.lineTo(x-8,y+8); c.stroke() }
  if(full){ c.textAlign="center"; c.textBaseline="middle"; c.font=`700 ${size/44}px Fredoka, sans-serif`;
    for(const I of [...ISL,...DEEPZ]){ if(I.sea!==sea||(I.hidden&&!S.visited[I.n])) continue; const [x,y]=w2m(I.x,I.z); const vis=S.visited[I.n]; c.lineWidth=4; c.strokeStyle="rgba(0,0,0,.55)"; c.strokeText(I.n,x,y-I.r*sc-12); c.fillStyle=vis?"#fff":"#bcd3e8"; c.fillText(I.n,x,y-I.r*sc-12) }
    for(const Pt of PORTALS){ if(Pt.from!==sea) continue; const [x,y]=w2m(Pt.x,Pt.z); c.lineWidth=4; c.strokeStyle="rgba(0,0,0,.55)"; const s=sea===1?"Mahlstrom → Zweite See":"Mahlstrom → Erste See"; c.strokeText(s,x,y-Pt.r*sc-14); c.fillStyle="#bff0ff"; c.fillText(s,x,y-Pt.r*sc-14) }
    if(EZ){ const [x,y]=w2m(EZ.x,EZ.z); c.font=`700 ${size/55}px Fredoka, sans-serif`; c.fillStyle="#ffb09a"; c.fillText(W.event.n,x,y+EZ.r*sc+14) } }
  for(const p of peers){ if(p.sameTab) continue; const pr=p.presence||{}; if(typeof pr.x!=="number"||seaAt(pr.x)!==sea) continue; const [x,y]=w2m(pr.x,pr.z); c.fillStyle=typeof pr.col==="string"?pr.col:"#f90"; c.strokeStyle="#fff"; c.lineWidth=2; c.beginPath(); c.arc(x,y,full?6:4,0,7); c.fill(); c.stroke() }
  if(sea===curSea){ const [px,py]=w2m(pl.x,pl.z); c.save(); c.translate(px,py); c.rotate(Math.PI-pl.ry); const s=full?12:9; c.fillStyle="#ffd24a"; c.strokeStyle="#000"; c.lineWidth=2; c.beginPath(); c.moveTo(0,-s); c.lineTo(s*.7,s*.7); c.lineTo(0,s*.35); c.lineTo(-s*.7,s*.7); c.closePath(); c.fill(); c.stroke(); c.restore() } }
function panelMap(body){ $("sheetTitle").textContent="Seekarte"; const sea=mapSea||curSea; const seas=[["1","Erste See"]]; if(S.visited["Ankerheim"]) seas.push(["2","Zweite See"]); setTabs(seas.length>1?seas:[],String(sea));
  const cv=document.createElement("canvas"); cv.id="mapcv"; cv.width=1000; cv.height=1000; body.appendChild(cv); drawMap(cv.getContext("2d"),1000,true,sea);
  body.insertAdjacentHTML("beforeend",`<p class="note">${sea===1?"Gelbe Ringe: Reichweite von Ruderboot und Motorboot. ":""}Rot gestrichelt: ungefähres Hunt-Gebiet. Farbige Flecken (mit Fisch-Radar): Fischgebiete. Rotes X: deine Schatzkarte. Graue Namen: noch nicht besucht. Manche Orte erscheinen erst, wenn du sie gefunden hast.</p>`);
  const row=document.createElement("div"); row.className="row";
  const b=document.createElement("button"); b.className="btn alt"; b.textContent="Nach Moosewood reisen"; b.onclick=()=>{ closeModal(); fastTravel("Moosewood") }; row.appendChild(b);
  if(S.visited["Ankerheim"]){ const b2=document.createElement("button"); b2.className="btn alt"; b2.textContent="Nach Ankerheim reisen"; b2.onclick=()=>{ closeModal(); fastTravel("Ankerheim") }; row.appendChild(b2) }
  body.appendChild(row) }
function fastTravel(n){ const I=ISLBY[n], D=I.dock; travelTo(D.ex-Math.cos(D.ang)*5,D.ez-Math.sin(D.ang)*5,false); pl.ry=Math.PI/2-D.ang; cam.yaw=pl.ry; pl.y=groundAt(pl.x,pl.z); banner(n,"Schnellreise") }
$("tabs").addEventListener("click",e=>{ if(panel==="map"){ const b=e.target.closest("button[data-tab]"); if(b) mapSea=+b.dataset.tab } },true);
const miniCtx=$("mini").getContext("2d");
function drawMini(){ const size=336, c=miniCtx, range=pl.boat?1500:700, sc=size/(range*2); c.save(); c.clearRect(0,0,size,size); c.beginPath(); c.arc(size/2,size/2,size/2,0,7); c.clip(); c.fillStyle="#0f5a8a"; c.fillRect(0,0,size,size);
  const tx=x=>size/2+(x-pl.x)*sc, tz=z=>size/2+(z-pl.z)*sc; const W=world(), EZ=eventZone(W.event);
  c.setLineDash([6,6]); c.lineWidth=2; const B=BOATS[S.boat]; if(B&&B.range<5000&&curSea===1){ c.strokeStyle="rgba(255,210,74,.6)"; c.beginPath(); c.arc(tx(0),tz(0),B.range*sc,0,7); c.stroke() } c.setLineDash([]);
  for(const Z of DEEPZ){ if(Z.sea!==curSea) continue; c.fillStyle=Z.col; c.beginPath(); c.arc(tx(Z.x),tz(Z.z),Z.r*sc,0,7); c.fill() }
  for(const I of ISL){ if(I.sea!==curSea) continue; if(I.hidden&&!S.visited[I.n]&&Math.hypot(I.x-pl.x,I.z-pl.z)>260) continue; c.fillStyle=I.pal.sand; c.beginPath(); c.arc(tx(I.x),tz(I.z),I.r*sc,0,7); c.fill(); c.fillStyle=I.pal.grass; c.beginPath(); c.arc(tx(I.x),tz(I.z),I.r*sc*0.78,0,7); c.fill(); if(I.biome==="cliffring"&&S.visited[I.n]){ c.fillStyle="#2a9ec4"; c.beginPath(); c.arc(tx(I.x),tz(I.z),I.r*sc*0.32,0,7); c.fill() } }
  for(const Pt of PORTALS){ if(Pt.from!==curSea) continue; c.fillStyle=curSea===1?"rgba(95,216,255,.6)":"rgba(255,179,90,.6)"; c.beginPath(); c.arc(tx(Pt.x),tz(Pt.z),Pt.r*sc,0,7); c.fill() }
  if(S.tmap){ c.strokeStyle="#ff3a2a"; c.lineWidth=5; const x=clamp(tx(S.tmap.x),10,size-10), y=clamp(tz(S.tmap.z),10,size-10); c.beginPath(); c.moveTo(x-9,y-9); c.lineTo(x+9,y+9); c.moveTo(x+9,y-9); c.lineTo(x-9,y+9); c.stroke() }
  if(radarOn()) for(const a of AREA_LOC[locationAt(pl.x,pl.z)]||[]){ if(!a.fish.length||a.fresh) continue; c.fillStyle=areaColor(a)+"66"; c.beginPath(); c.ellipse(tx(a.x),tz(a.z),a.r*sc,a.r*sc/a.asp,0,0,7); c.fill() }
  if(EZ&&seaAt(EZ.x)===curSea){ c.setLineDash([7,6]); c.fillStyle="rgba(255,90,60,.16)"; c.strokeStyle="#ff7b54"; c.lineWidth=3; c.beginPath(); c.arc(tx(EZ.x),tz(EZ.z),EZ.r*sc,0,7); c.fill(); c.stroke(); c.setLineDash([]) }
  for(const n of NPCS){ if(n.type==="villager") continue; { const I=ISLBY[n.loc]; if(I&&I.hidden&&!(ISG[I.n]&&ISG[I.n].visible)) continue } c.fillStyle={merchant:"#ffd24a",shipwright:"#5fd8ff",appraiser:"#c78bff",alchemist:"#6fe37b",altar:"#8fe8ff",lq:"#ff8a3a"}[n.type]||"#fff"; c.beginPath(); c.arc(tx(n.x),tz(n.z),n.type==="lq"?7:5,0,7); c.fill() }
  for(const p of peers){ if(p.sameTab) continue; const pr=p.presence||{}; if(typeof pr.x!=="number"||seaAt(pr.x)!==curSea) continue; c.fillStyle=typeof pr.col==="string"?pr.col:"#f90"; c.strokeStyle="#fff"; c.lineWidth=2; c.beginPath(); c.arc(tx(pr.x),tz(pr.z),7,0,7); c.fill(); c.stroke() }
  c.translate(size/2,size/2); c.rotate(Math.PI-pl.ry); c.fillStyle="#ffd24a"; c.strokeStyle="#000"; c.lineWidth=3; c.beginPath(); c.moveTo(0,-16); c.lineTo(11,11); c.lineTo(0,5); c.lineTo(-11,11); c.closePath(); c.fill(); c.stroke(); c.restore() }
$("mini").addEventListener("click",()=>openModal("map")); $("radarBtn").addEventListener("click",e=>{ e.stopPropagation(); toggleRadar() });

/* ---------- HUD ---------- */
function refreshHUD(){ updateRadarUI();
  $("coinv").textContent=fmt(S.money); const li=levelInfo(S.xp); $("lvlnum").textContent=li.L; $("lvltitle").textContent=S.title||titleFor(li.L); $("lvlxp").textContent=`${fmt(li.rest)} / ${fmt(li.need)} XP`; $("lvlarc").style.strokeDashoffset=107*(1-li.rest/li.need);
  const G=gearStats(); $("sRod").textContent=G.rod.n; $("sBait").textContent=G.bait?`${G.bait.n} ×${S.bait[G.bait.n]}`:"keiner"; $("sBag").textContent=`${S.fish.length}/${bagCap()}`; $("sBagSlot").classList.toggle("full",S.fish.length>=bagCap()); $("sBoat").textContent=S.boat?BOATS[S.boat].n:"—";
  const sg=v=>(v>0?"+":"")+v; $("sRel").textContent=S.relics;
  $("buffs").innerHTML=Object.entries(POTIONS).filter(([k])=>buffActive(k)).map(([k,p])=>`<span style="--c:${p.col}" title="${esc(p.d)}">${esc(p.n)} ${Math.ceil((S.buffs[k]-Date.now())/60000)}′</span>`).join("")+(G.M?`<span style="--c:#ffd24a">Meisterschaft ${G.M}</span>`:"")+(G.ench?`<span style="--c:${enchTier(G.ench)[1]}">${esc(G.ench.n)}</span>`:"");
  $("stats").innerHTML=`<span>Lure <b>${sg(G.lure)}%</b></span><span>Glück <b>${sg(G.luck)}%</b></span><span>Control <b>${sg(Math.round(G.ctrl*100))}%</b></span><span>Resilience <b>${sg(G.res)}%</b></span><span>Max <b>${G.mw>0?fmtKg(G.mw):"∞"}</b></span>${S.stats.streak>1?`<span>Serie <b style="color:var(--gold)">×${S.stats.streak}</b></span>`:""}`;
  const bb=$("bagBadge"); bb.style.display=S.fish.length>=bagCap()?"flex":"none"; bb.textContent="!";
}
let lastLoc="", lastEvent="";
function refreshWorldHUD(){
  const W=world(); const hh=Math.floor(W.hour), mm=Math.floor((W.hour-hh)*6)*10; const loc=locationAt(pl.x,pl.z);
  $("clock").innerHTML=`<b>${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}</b><span>${W.day?"Tag":"Nacht"}</span><b>${W.aw?`<span style="color:${AW[W.aw].col}">${AW[W.aw].n} ${Math.floor(W.awLeft/60000)}:${String(Math.floor(W.awLeft/1000)%60).padStart(2,"0")}</span>`:W.aurora?'<span style="color:#8affc9">Polarlicht</span>':WEATHER_DE[W.weather]}</b><b class="opt">${SEASON_DE[W.season]}</b><span class="opt">${esc(locName(loc))}</span>`;
  if(loc!==lastLoc){ lastLoc=loc; const I=ISLBY[loc]; if(!S.visited[loc]){ S.visited[loc]=1; const xp=I&&I.hidden?400:60; gainXP(xp); markDirty(); if(performance.now()<bannerLock) toast(`Neu entdeckt: ${locName(loc)} · +${xp} XP`,"#5fd8ff"); else banner(loc==="Ocean"?"Offenes Meer":loc,(LOCDESC[loc]||"")+` · Neu entdeckt! +${xp} XP`); SFX.quest(); if(I&&I.hidden) flash("#ffffff55"); checkStory() } else if(loc!=="Ocean"&&loc!=="Sturmsee"&&performance.now()>=bannerLock) banner(loc,LOCDESC[loc]||"");
    if(S.bounties.length<3) ensureBounties(loc); pushPresence(true) }
  const ev=$("event"); if(W.event){ const left=Math.max(0,Math.ceil((W.event.ends-Date.now())/60000)); ev.style.display="block"; ev.textContent=`${W.event.n} · ${W.event.l==="Ocean"?"offene See":W.event.l} · noch ${left} min`;
    if(lastEvent!==W.event.n){ lastEvent=W.event.n; toast(`Hunt: ${W.event.n}! Das ungefähre Gebiet steht auf der Karte. Angle irgendwo darin – mit Glück beißt er an.`,"#ff7b54") } } else { ev.style.display="none"; lastEvent="" }
  if(AU.rainG) AU.rainG.gain.value=W.weather==="Rain"?0.5:0;
}
function contextHint(){ if(F.state!=="idle"||modalOpen()) return; if(nearNPC){ setHint(""); return } if(pl.swim){ setHint("Du schwimmst. Mit B rufst du dein Boot."); return }
  if(TOUCH){ setHint(pl.boat?"Joystick = fahren · ⚡ halten = Turbo":S.stats.caught<3?"Angel-Knopf halten und loslassen = Auswerfen":""); return }
  const A=aimPoint(); if(A&&A.water){ setHint(pl.boat?"Linke Maustaste halten und loslassen = Auswerfen · W/S fahren · Shift = Turbo":"Linke Maustaste auf dem Wasser halten und loslassen = Auswerfen") } else setHint(pl.boat?"W/S fahren · A/D lenken · Shift Turbo · B aussteigen":"") }

/* ---------- sky / lighting ---------- */
const C_=hex=>new THREE.Color(hex);
const SKYC={day:[C_("#2f86d8"),C_("#bfe6ff")],dusk:[C_("#3a4f94"),C_("#ffab6b")],night:[C_("#040a1c"),C_("#16264a")]};
const tmpA=new THREE.Color(), tmpB=new THREE.Color();
function updateSky(){
  const W=world(), h=W.hour; let top,hor,night;
  if(h>=7&&h<18.3){ top=SKYC.day[0].clone(); hor=SKYC.day[1].clone(); night=0 }
  else if(h>=18.3&&h<20.6){ const t=(h-18.3)/2.3; top=SKYC.day[0].clone().lerp(SKYC.dusk[0],Math.min(1,t*1.6)).lerp(SKYC.night[0],Math.max(0,t-0.55)/0.45); hor=SKYC.day[1].clone().lerp(SKYC.dusk[1],Math.min(1,t*1.8)).lerp(SKYC.night[1],Math.max(0,t-0.6)/0.4); night=smooth(clamp((t-0.35)/0.65,0,1)) }
  else if(h>=4.8&&h<7){ const t=(h-4.8)/2.2; top=SKYC.night[0].clone().lerp(SKYC.dusk[0],Math.min(1,t*1.6)).lerp(SKYC.day[0],Math.max(0,t-0.5)/0.5); hor=SKYC.night[1].clone().lerp(SKYC.dusk[1],Math.min(1,t*1.5)).lerp(SKYC.day[1],Math.max(0,t-0.55)/0.45); night=1-smooth(clamp(t/0.7,0,1)) }
  else { top=SKYC.night[0].clone(); hor=SKYC.night[1].clone(); night=1 }
  if(W.weather==="Rain"){ top.lerp(C_("#4c5a68"),0.6-night*0.3); hor.lerp(C_("#7d8b97"),0.6-night*0.35) }
  const NB=ISLBY["Nebelinsel"]; const nd=Math.hypot(pl.x-NB.x,pl.z-NB.z); const nebel=curSea===1?smooth(clamp((1500-nd)/1100,0,1)):0;
  const foggy=Math.max(W.weather==="Foggy"?1:0,nebel);
  if(foggy>0){ top.lerp(C_("#98a6b2"),(0.5-night*0.3)*foggy); hor.lerp(C_("#c9d2d9"),(0.65-night*0.4)*foggy) }
  if(curSea===2&&W.weather!=="Clear"){ top.lerp(C_("#3a4a5a"),0.25); hor.lerp(C_("#8a9aa6"),0.2) }
  const AWk=W.aw; if(AWk&&AW[AWk].night&&night<0.95){ night=0.95; top.copy(SKYC.night[0]); hor.copy(SKYC.night[1]) }
  if(AWk==="blood"){ top.lerp(C_("#140205"),0.85); hor.lerp(C_("#4a0a10"),0.8) } else if(AWk==="star"){ top.lerp(C_("#06031a"),0.8); hor.lerp(C_("#22124a"),0.7) } else if(AWk==="storm"){ top.lerp(C_("#121821"),0.85); hor.lerp(C_("#303a48"),0.82) }
  skyU.uMoonCol.value.set(AWk==="blood"?"#ff3020":AWk==="star"?"#e6d8ff":"#ebf2ff"); skyU.uMoonSize.value=lerp(skyU.uMoonSize.value,AWk==="blood"?1:0,0.15);
  skyU.uTop.value.copy(top); skyU.uHorizon.value.copy(hor); skyU.uBottom.value.copy(hor).multiplyScalar(0.7); skyU.uNight.value=night;
  const dayP=clamp((h-5.5)/15,0,1), sa=dayP*Math.PI; const sd=new THREE.Vector3(Math.cos(sa)*0.85,Math.sin(sa)*0.95+0.02,0.35).normalize(); skyU.uSunDir.value.copy(sd);
  const np=AWk&&AW[AWk].night&&W.realDay?0.42:((h-19.5+24)%24)/11, ma=clamp(np,0,1)*Math.PI; const md=new THREE.Vector3(-Math.cos(ma)*0.8,Math.sin(ma)*0.9+0.05,-0.4).normalize(); skyU.uMoonDir.value.copy(md);
  const low=clamp(sd.y*3,0,1); skyU.uSunCol.value.setRGB(1,0.72+0.23*low,0.45+0.4*low);
  const useMoon=night>0.5, L=useMoon?md:sd; sun.position.set(pl.x+L.x*200,Math.max(40,L.y*200),pl.z+L.z*200); sun.target.position.set(pl.x,0,pl.z);
  const wf=W.weather==="Clear"?1:W.weather==="Windy"?0.9:0.55;
  sun.intensity=useMoon?0.55:(2.4*wf*clamp(sd.y*2.5,0.15,1)); sun.color.copy(useMoon?C_("#8fa8ff"):skyU.uSunCol.value);
  hemiBase=lerp(1.0,0.38,night)*(W.weather==="Clear"?1:0.85)*(AWk==="blood"?1.1:1); hemi.intensity=hemiBase; if(AWk==="blood") hemi.color.set("#ff9a8e"); if(AWk!=="blood") hemi.color.copy(hor).lerp(C_("#ffffff"),0.3); hemi.groundColor.set(night>0.5?"#1a2230":"#5b6b3a");
  const fogC=hor.clone(); scene.fog.color.copy(fogC); let dens=AWk==="storm"?0.0011:AWk==="blood"?0.00032:AWk==="star"?0.00022:W.weather==="Foggy"?0.0019:W.weather==="Rain"?0.0005:curSea===2?0.00016:0.00011; dens=Math.max(dens,nebel*0.004); scene.fog.density=lerp(scene.fog.density,dens,0.08);
  const au=W.aurora?night:0; skyU.uAurora.value=lerp(skyU.uAurora.value,au,0.1); waterU.uAurora.value=skyU.uAurora.value;
  if(gradePass){ const gu=gradePass.uniforms; gu.uTint.value.setRGB(1-night*0.08,1-night*0.04+au*0.04,1+night*0.06); if(AWk==="blood") gu.uTint.value.setRGB(1.1,0.9,0.9); else if(AWk==="star") gu.uTint.value.setRGB(1.0,0.97,1.08); gu.uSat.value=1.12-foggy*0.18+au*0.1; gu.uVig.value=0.3+night*0.25 }
  waterU.uSky.value.copy(hor).lerp(top,0.3); waterU.uSunDir.value.copy(useMoon?md:sd); waterU.uSunCol.value.copy(useMoon?C_("#8fa8ff").multiplyScalar(0.6):skyU.uSunCol.value).multiplyScalar(wf);
  waterU.uDeep.value.set("#0b4f8a").lerp(C_("#031428"),night*0.8); waterU.uShallow.value.set("#1cb8c8").lerp(C_("#0b3a50"),night*0.75); waterU.uNight.value=night;
  if(AWk==="blood"){ waterU.uDeep.value.set("#2a0308"); waterU.uShallow.value.set("#7a0c16") } else if(AWk==="star"){ waterU.uDeep.value.set("#0b0632"); waterU.uShallow.value.set("#3a2a8a") } else if(AWk==="storm"){ waterU.uDeep.value.set("#07202e"); waterU.uShallow.value.set("#1a4452") }
  waterU.fogColor.value.copy(fogC); waterU.fogDensity.value=scene.fog.density;
  for(const gm of Object.values(GRASS)){ if(!gm) continue; const u=gm.material.uniforms; u.uLight.value.setRGB(lerp(1,0.32,night),lerp(1,0.38,night),lerp(1,0.55,night)); u.fogColor.value.copy(fogC); u.fogDensity.value=scene.fog.density }
  cloudMat.color.copy(C_("#ffffff").lerp(C_("#2a3350"),night*0.85)).lerp(C_("#8a939c"),W.weather==="Rain"?0.5:0); cloudMat.opacity=W.weather==="Clear"?0.85:0.97;
  lanternMat.emissiveIntensity=lerp(0.2,3.2,night); windowMat.emissiveIntensity=lerp(0,2.2,night); GLOWMATS.forEach(g=>g.mat.emissiveIntensity=lerp(g.base,g.night,night));
  if(lighthouseBeam) lighthouseBeam.visible=night>0.3;
  rain.visible=W.weather==="Rain"; rain.material.opacity=AWk==="storm"?0.75:0.45; if(bloom) bloom.strength=lerp(0.38,0.7,night);
  renderer.toneMappingExposure=lerp(1.05,1.25,night);
  return W;
}

/* ---------- multiplayer ---------- */
let room=null, db=null, user=null, myId=null, peers=[], boardDirty=false, board=[], names={}, canBoard=true, myProfileName="", myMsg=null, joinedAt=0;
const seenCatch=new Map(), seenMsg=new Map(), avatars=new Map();
function peerName(p){ return (typeof p.name==="string"&&p.name)||"Fischer" }
function myName(){ return S.nick||myProfileName||"Du" }
let lastPresSent=0, lastPresKey="", presTimer=0;
function presenceObj(){ const p={v:5,nick:S.nick||"",loc:locationAt(pl.x,pl.z),x:Math.round(pl.x*10)/10,z:Math.round(pl.z*10)/10,y:Math.round(pl.y*10)/10,ry:Math.round(pl.ry*100)/100,b:pl.boat?S.boat:0,sw:pl.swim?1:0,mv:pl.moving?1:0,st:F.state,rod:S.rod,lvl:levelInfo(S.xp).L,col:myColor};
  if(["cast","lure","bite","reel"].includes(F.state)){ p.bx=Math.round(F.bob.x*10)/10; p.bz=Math.round(F.bob.z*10)/10; p.by=Math.round((F.bob.y||0)*10)/10 }
  const H=showFish&&F.showIt?F.showIt:holdIt; if(H) p.hold={n:H.n,m:H.m||"",w:H.w,sh:H.sh?1:0,sp:H.sp?1:0};
  if((F.state==="bite"||F.state==="reel")&&F.hooked) p.br=rIdx(F.hooked.f.r); if(lastCatch) p.last=lastCatch; if(myMsg) p.msg=myMsg; return p }
function pushPresence(force){ if(!room) return; const now=performance.now(); if(!force&&now-lastPresSent<180){ clearTimeout(presTimer); presTimer=setTimeout(()=>pushPresence(true),190); return }
  const p=presenceObj(); const key=JSON.stringify(p); if(key===lastPresKey) return; lastPresKey=key; lastPresSent=now; room.presence(p).catch(()=>{}) }
function avatarFor(p){ let a=avatars.get(p.peer); const pr=p.presence||{};
  if(!a){ let col="#c46b3b"; try{ col="#"+new THREE.Color().setStyle(typeof pr.col==="string"?pr.col:"#c46b3b").getHexString() }catch(e){}
    const ch=makeCharacter({shirt:col,hat:["cap","straw","captain"][hashStr(p.peer)%3],rod:true,skin:SKINS[hashStr(p.peer)%SKINS.length]}); scene.add(ch.group);
    const bts=[null,...BOATS.slice(1).map(b=>makeBoat(b.id))]; bts.forEach(b=>{ if(b){ b.visible=false; scene.add(b) } }); const bob=bobber.clone(); bob.visible=false; scene.add(bob); const line=makeLine(.6);
    a={ch,bts,bob,line,x:+pr.x||0,z:+pr.z||0,y:+pr.y||0,ry:+pr.ry||0,walkT:0,label:null,labelText:"",bubble:null,bubbleT:0,rod:"",holdMesh:null,holdName:""}; avatars.set(p.peer,a) }
  return a }
function removeAvatar(peer){ const a=avatars.get(peer); if(!a) return; scene.remove(a.ch.group,a.bob,a.line); a.bts.forEach(b=>b&&scene.remove(b)); if(a.label) scene.remove(a.label); if(a.bubble) scene.remove(a.bubble); if(a.holdMesh) scene.remove(a.holdMesh); if(a.holdLbl) scene.remove(a.holdLbl); avatars.delete(peer) }
function updatePeers(dt,t){
  for(const p of peers){ if(p.sameTab) continue; const pr=p.presence||{}; if(typeof pr.x!=="number"||typeof pr.z!=="number") continue;
    const a=avatarFor(p); const tx=clamp(pr.x,-SEA1_R-500,SEA2X+SEA2_R+500), tz=clamp(pr.z,-SEA1_R-500,SEA1_R+500), ty=clamp(+pr.y||0,-30,90);
    const vis=seaAt(tx)===curSea; a.ch.group.visible=vis; if(a.label) a.label.visible=vis;
    if(Math.hypot(tx-a.x,tz-a.z)>40){ a.x=tx; a.z=tz } else { const k=clamp(dt*6,0,1); a.x=lerp(a.x,tx,k); a.z=lerp(a.z,tz,k) } a.y=lerp(a.y,ty,clamp(dt*9,0,1));
    let dr=(+pr.ry||0)-a.ry; dr=Math.atan2(Math.sin(dr),Math.cos(dr)); a.ry+=dr*clamp(dt*10,0,1);
    const bt=clamp(+pr.b||0,0,BOATS.length-1)|0; a.bts.forEach((b,i)=>{ if(!b) return; b.visible=i===bt&&vis; if(i===bt){ b.position.set(a.x,waveHeight(a.x,a.z,t)-0.3,a.z); b.rotation.y=a.ry } });
    const rod=ROD[pr.rod]?pr.rod:"Flimsy Rod"; if(a.rod!==rod){ a.rod=rod; setRodLook(a.ch,rod); colorBobber(a.bob,rod) }
    if(pr.mv===1) a.walkT+=dt*10; const st=typeof pr.st==="string"?pr.st:"idle";
    poseCharacter(a.ch,{moving:pr.mv===1,boat:bt>0,swim:pr.sw===1,walkT:a.walkT,st:pr.hold?"hold":st,y:a.y},t);
    if((st==="bite"||st==="reel")&&a.lastSt!=="bite"&&a.lastSt!=="reel"&&typeof pr.bx==="number"&&vis){ const br=clamp(+pr.br||0,0,10)|0; spawnBiteMark(pr.bx,+pr.by||0,pr.bz,br); const dd=Math.hypot(pr.bx-pl.x,pr.bz-pl.z); if(dd<140) SFX.bite(br,clamp(1-dd/140,0.12,0.7)) } a.lastSt=st; a.ch.group.position.x=a.x; a.ch.group.position.z=a.z; a.ch.group.rotation.y=a.ry;
    const txt=`${peerName(p)} · ${+pr.lvl||1}`; if(txt!==a.labelText){ if(a.label) scene.remove(a.label); a.label=textSprite(txt,{size:40,scale:0.03}); scene.add(a.label); a.labelText=txt }
    a.label.position.set(a.x,a.ch.group.position.y+8.3,a.z); { const f=clamp((70-Math.hypot(a.x-pl.x,a.z-pl.z))/15,0,1); a.label.visible=vis&&f>0.01; a.label.material.opacity=f }
    const m=pr.msg, showMsg=m&&typeof m.x==="string"&&Date.now()-(+m.t||0)<7000;
    if(showMsg&&a.bubbleT!==m.t){ if(a.bubble) scene.remove(a.bubble); a.bubble=textSprite(m.x.slice(0,60),{size:34,color:"#132030",bg:"rgba(255,255,255,.95)",scale:0.032,font:"Nunito"}); scene.add(a.bubble); a.bubbleT=m.t }
    if(a.bubble){ a.bubble.visible=!!showMsg; a.bubble.position.set(a.x,a.ch.group.position.y+10.2,a.z) }
    const fishing=["lure","bite","reel","cast"].includes(st)&&typeof pr.bx==="number"; a.bob.visible=fishing; a.line.visible=fishing;
    if(fishing){ const by=(+pr.by||0)+(st==="reel"||st==="bite"?Math.sin(t*25)*0.15-0.2:Math.sin(t*3)*0.08); a.bob.position.set(pr.bx,by,pr.bz); const tip=new THREE.Vector3(); a.ch.tip.getWorldPosition(tip); setLine(a.line,tip,a.bob.position,st==="reel"?0.3:1.6) }
    const ho=pr.hold&&typeof pr.hold==="object"?pr.hold:typeof pr.hold==="string"?{n:pr.hold}:null; const hn=ho&&typeof ho.n==="string"&&FISHBY[ho.n]?ho.n:""; const hm=hn&&typeof ho.m==="string"&&MUT[ho.m]?ho.m:""; const hk=hn?hn+"|"+hm+"|"+(+ho.w||0):"";
    if(hk!==a.holdName){ if(a.holdMesh){ scene.remove(a.holdMesh); a.holdMesh=null } if(a.holdLbl){ scene.remove(a.holdLbl); a.holdLbl=null } a.holdName=hk;
      if(hn){ const f=FISHBY[hn]; a.holdMesh=makeFishMesh(hn,hm); const s=clamp(fishSize(f)*0.9,0.7,3.2); a.holdMesh.scale.setScalar(s); a.holdMesh.userData.s=s; scene.add(a.holdMesh);
        if(ho.w) { a.holdLbl=textSprite(`${ho.sh?"Shiny ":""}${ho.sp?"Sparkling ":""}${hm?hm+" ":""}${hn} · ${fmtKg(+ho.w)}`,{size:36,color:RCOL[f.r]||"#fff",scale:0.03}); scene.add(a.holdLbl) } } }
    if(a.holdMesh){ a.holdMesh.visible=vis; const hy=a.ch.group.position.y+7.6+a.holdMesh.userData.s*0.35; a.holdMesh.position.set(a.x,hy,a.z); a.holdMesh.rotation.set(0,a.ry+Math.PI/2+Math.sin(t*1.5)*0.2,0); if(a.holdLbl){ a.holdLbl.visible=vis; a.holdLbl.position.set(a.x,hy+1.6+a.holdMesh.userData.s*0.5,a.z) } }
  }
  for(const peer of [...avatars.keys()]) if(!peers.some(p=>p.peer===peer&&!p.sameTab)) removeAvatar(peer);
}
$("chatin").addEventListener("keydown",e=>{ if(e.key==="Enter"){ const v=$("chatin").value.replace(/[\u0000-\u001f\u007f​-‏‪-‮⁠-⁯]/g,"").trim().slice(0,90); $("chatin").value=""; $("chatin").blur(); if(!v) return;
    if(v.startsWith("/")){ e.preventDefault(); runCommand(v); return }
    myMsg={t:Date.now(),x:v}; addChat(myName(),v,true); showMyBubble(v); pushPresence(true); e.preventDefault() } if(e.key==="Escape") $("chatin").blur(); e.stopPropagation() });
$("chatin").addEventListener("keyup",e=>e.stopPropagation());
let myBubble=null, myBubbleT=0; function showMyBubble(v){ if(myBubble) scene.remove(myBubble); myBubble=textSprite(v.slice(0,60),{size:34,color:"#132030",bg:"rgba(255,255,255,.95)",scale:0.032,font:"Nunito"}); scene.add(myBubble); myBubbleT=7 }
function addChat(who,text,mine){ const d=document.createElement("div"); const w=document.createElement("span"); w.className="who"; w.textContent=who+": "; if(mine) w.style.color="#8fd3ff"; d.appendChild(w); d.appendChild(document.createTextNode(text)); const log=$("chatlog"); log.appendChild(d); while(log.children.length>40) log.firstChild.remove(); log.scrollTop=log.scrollHeight }
function onPeersChange(ch){ peers=ch.peers; $("pcount").textContent=String(peers.filter(p=>!p.sameTab).length+1);
  for(const p of ch.joined) if(!p.sameTab&&!p.isMe&&Date.now()-joinedAt>3000){ toast(`${peerName(p)} ist online`,"#5fd8ff") }
  for(const p of [...ch.joined,...ch.updated]){ if(p.sameTab) continue; const pr=p.presence||{};
    const lc=pr.last; if(lc&&typeof lc==="object"&&typeof lc.n==="string"&&FISHBY[lc.n]){ const prev=seenCatch.get(p.peer); if(prev!==lc.t){ seenCatch.set(p.peer,lc.t); if(prev!==undefined){ const f=FISHBY[lc.n]; const lbl=(lc.sh?"Shiny ":"")+(lc.sp?"Sparkling ":"")+(typeof lc.m==="string"&&MUT[lc.m]?lc.m+" ":"")+lc.n;
      if(rIdx(f.r)>=3) toast(`${peerName(p)} fing ${lbl} (${f.r}, ${fmtKg(+lc.w||0)})`,RCOL[f.r]) } } }
    const m=pr.msg; if(m&&typeof m==="object"&&typeof m.x==="string"){ const prev=seenMsg.get(p.peer); if(prev!==m.t){ seenMsg.set(p.peer,m.t); if(Date.now()-(+m.t||0)<15000) addChat(peerName(p),m.x.slice(0,90),false) } } }
  resolveNames(); if(panel==="players"&&(panelTab||"online")==="online") renderPanel() }
async function resolveNames(){ if(!user) return; const ids=[...new Set(peers.map(p=>p.by).concat(board.map(b=>b.id)).filter(Boolean))]; if(!ids.length) return; try{ const ps=await user.profiles(ids); for(const id of ids) if(ps[id]&&ps[id].name) names[id]=ps[id].name }catch(e){} }
function panelPlayers(body){ $("sheetTitle").textContent="Spieler"; const tab=panelTab||"online"; setTabs([["online","Online"],["board","Rangliste"],["me","Profil & Einstellungen"]],tab);
  if(tab==="online"){ if(!room){ body.insertAdjacentHTML("beforeend",`<p class="note">Multiplayer ist in dieser Ansicht nicht verfügbar. Du spielst solo in derselben Welt.</p>`); return }
    const stDE={idle:"schaut sich um",charge:"zielt",cast:"wirft aus",lure:"wartet auf Biss",bite:"Biss!",reel:"kämpft mit einem Fisch",show:"hat gefangen!",hold:"hat gefangen!"};
    const rows=[{name:myName()+" (du)",loc:locationAt(pl.x,pl.z),lvl:levelInfo(S.xp).L,st:F.state,me:true}].concat(peers.filter(p=>!p.sameTab).map(p=>({name:peerName(p),loc:p.presence?.loc||"?",lvl:+p.presence?.lvl||1,st:p.presence?.st||"idle"})));
    body.insertAdjacentHTML("beforeend",`<div style="overflow-x:auto"><table class="lb"><tr><th>Spieler</th><th>Ort</th><th>Status</th><th class="n">Lvl</th></tr>${rows.map(r=>`<tr class="${r.me?"me":""}"><td>${esc(r.name)}</td><td>${esc(ALL_LOC.includes(r.loc)?locName(r.loc):"?")}</td><td>${esc(stDE[r.st]||"")}</td><td class="n">${r.lvl}</td></tr>`).join("")}</table></div><p class="note">Mitspieler siehst du live in der Welt und als Punkte auf der Karte. Fänge ab Rare werden allen gemeldet. Teile einfach den Link zu dieser Seite, dann spielen Freunde live mit.</p>`); return }
  if(tab==="board"){ if(!db){ body.insertAdjacentHTML("beforeend",`<p class="note">Die Rangliste ist in dieser Ansicht nicht verfügbar.</p>`); return }
    const rows=[...board].sort((a,b)=>(b.earned||0)-(a.earned||0)).slice(0,25);
    body.insertAdjacentHTML("beforeend",`<div style="overflow-x:auto"><table class="lb"><tr><th>#</th><th>Spieler</th><th class="n">Lvl</th><th class="n">Verdient</th><th class="n">Arten</th><th>Bester Fang</th></tr>${rows.map((r,i)=>`<tr class="${r.id===myId?"me":""}"><td>${i+1}</td><td>${esc(names[r.id]||(typeof r.nick==="string"&&r.nick)||"Fischer")}${typeof r.title==="string"&&r.title?` <span class="ttl">${esc(r.title.slice(0,30))}</span>`:""}${+r.qr?` <span class="ttl">${"★".repeat(clamp(+r.qr|0,0,4))}</span>`:""}</td><td class="n">${+r.lvl||1}</td><td class="n">${fmt(+r.earned||0)}</td><td class="n">${fmt(+r.dex||0)}</td><td>${esc(String(r.bestN||"").slice(0,40))}${r.bestV?" · "+fmt(+r.bestV)+" C$":""}</td></tr>`).join("")||`<tr><td colspan="6">Noch keine Einträge.</td></tr>`}</table></div>${canBoard?"":`<p class="note">Du kannst nur mitlesen. Mit Contributor-Rechten erscheinst du selbst in der Liste.</p>`}`); return }
  const li=levelInfo(S.xp);
  body.insertAdjacentHTML("beforeend",`<div class="kv" style="max-width:440px;font-size:14px"><span>Level</span><b>${li.L} · ${titleFor(li.L)}</b><span>Gefangen</span><b>${fmt(S.stats.caught)}</b><span>Perfect Catches</span><b>${fmt(S.stats.perfect)}</b><span>Verdient</span><b>${fmt(S.stats.earned)} C$</b><span>Bester Fang</span><b>${esc(S.stats.bestN||"–")}</b><span>Beste Serie</span><b>${S.stats.bestStreak}</b><span>Aufträge</span><b>${S.bountyDone}</b><span>Bestiary</span><b>${Object.keys(S.dex).length}/${FISH.length}</b><span>Truhen</span><b>${S.stats.chests}</b><span>Verzauberungen</span><b>${S.stats.enchants}</b></div>
    ${S.titles.length?`<div class="row"><span class="note">Titel:</span>${["",...S.titles].map(x=>`<button class="btn ${S.title===x?"":"alt"}" data-title="${esc(x)}">${esc(x||"Standard")}</button>`).join("")}</div>`:""}
    <div class="row"><span class="note">Account: <b style="color:var(--ink)">${esc(acctName()||"Gast")}</b>${isOnlineAcct()?"":" (offline)"}</span>${isOnlineAcct()?'<button class="btn alt" id="logoutBtn">Abmelden</button>':""}</div>
    <div class="row"><span class="note">Grafik:</span><button class="btn alt" data-q="2">Hoch</button><button class="btn alt" data-q="1">Mittel</button><button class="btn alt" data-q="0">Niedrig</button></div>
    <div class="row"><button class="btn alt" id="musBtn">Musik: ${S.settings.music?"an":"aus"}</button><button class="btn alt" id="sfxBtn">Geräusche: ${S.settings.sfx?"an":"aus"}</button></div>
    <p class="note">Inoffizielles Fanprojekt nach dem Roblox-Spiel Fisch, nicht mit dessen Entwicklern verbunden. Fischnamen und -werte stammen aus dem Official Fisch Wiki (fischipedia.org); Welt, Modelle, Musik und Balancing sind eigene Arbeit.</p>
    <p class="note">Spielstand: ${myId&&db?"wird in deinem Account (Cloud) und im Browser gespeichert. Du kannst dich auf jedem Gerät einloggen.":"wird in diesem Browser gespeichert."}</p>
    <div class="row"><button class="btn alt" id="resetBtn">Spielstand zurücksetzen</button><span class="note" id="resetNote"></span></div>`);
  body.querySelectorAll("[data-title]").forEach(bt=>bt.onclick=()=>{ S.title=bt.dataset.title; markDirty(); boardDirty=true; refreshHUD(); renderPanel() });
  body.querySelectorAll("[data-q]").forEach(bt=>{ const q=+bt.dataset.q; if((S.settings.q??2)===q) bt.className="btn"; bt.onclick=()=>{ S.settings.qLocked=true; setQuality(q); renderPanel() } });
  if($("logoutBtn")) $("logoutBtn").onclick=async()=>{ dirty=true; await syncLoop(); await FDNET.logout(); location.reload() };
  $("musBtn").onclick=()=>{ S.settings.music=!S.settings.music; if(AU.music) AU.music.gain.value=S.settings.music?0.16:0; markDirty(); renderPanel() };
  $("sfxBtn").onclick=()=>{ S.settings.sfx=!S.settings.sfx; if(AU.sfx){ AU.sfx.gain.value=S.settings.sfx?0.7:0; AU.amb.gain.value=S.settings.sfx?0.22:0 } markDirty(); renderPanel() };
  let armed=false; $("resetBtn").onclick=()=>{ if(!armed){ armed=true; $("resetNote").textContent="Nochmal klicken zum Bestätigen."; return } const keep=S.nick; S=freshState(); S.nick=keep; S.admin=adminOn(); ensureBounties("Moosewood"); markDirty(); boardDirty=true; spawnHome(); curSea=1; updateSeaVis(); syncChests(); refreshHUD(); renderQuests(); closeModal(); toast("Neuer Spielstand","#fff") } }
async function initMultiplayer(){
  const use=window.claude&&typeof window.claude.use==="function"?window.claude.use.bind(window.claude):null; if(!use) return;
  const [r,d,u]=await Promise.all([use("room").catch(()=>null),use("db").catch(()=>null),use("user").catch(()=>null)]); room=r; db=d; user=u;
  if(user){ try{ const m=await user.me(); myId=m.id; myProfileName=m.name||"" }catch(e){} }
  FDNET.onGW((gw,by)=>{ if(gw) Object.assign(GW,gw); onGWChanged(by); if(panel==="admin") renderPanel() });
  FDNET.onSys((text,by)=>{ addChat(by||"Admin",text,false); bigMsg(by?`${by}:`:"Ansage",text,"#ff8a3a"); SFX.quest() });
  FDNET.onAdmin((ok,fromHello)=>{ if(!fromHello){ if(ok){ S.admin=true; SFX.quest(); sysMsg("Admin-Modus aktiv. Tippe / im Chat für alle Befehle. Globale Befehle (Zeit, Wetter, Events, Admin-Wetter) gelten für alle. Dein Account ist jetzt aus der Rangliste ausgeblendet.") } else if(isLeif()&&!S.admin) sysMsg("Falscher Code.","#ff9a6a") } else S.admin=ok; updateAdminUI(); markDirty() });
  if(room){ joinedAt=Date.now(); room.onPeers(onPeersChange,()=>{ room=null; $("netdot").style.background="#7f93ab" }); room.onConnection(c=>{ $("netdot").style.background=c?"#6fe37b":"#ffb35a" }); pushPresence(true) }
  if(db){ try{ db.collection("board").orderBy("earned","desc").limit(50).onSnapshot(s=>{ board=s.docs.map(x=>({id:x.id,...x.data()})); resolveNames(); drawBoard3D(); if(panel==="players"&&panelTab==="board") renderPanel() },()=>{}) }catch(e){}
    if(myId){ try{ const snap=await db.doc(`data/users/${myId}/save`).get(); if(snap.exists){ const o=snap.data(); if(o&&typeof o.json==="string"){ const cloud=JSON.parse(o.json);
        if(cloud&&cloud.v===SAVE_V&&(cloud.savedAt||0)>(S.savedAt||0)&&F.state==="idle"){ S=loadSave(cloud); try{ localStorage.setItem(SAVE_KEY,JSON.stringify(S)) }catch(e){}
          S.nick=FDNET.me.name; if(validPos(S.pos)){ pl.x=S.pos.x; pl.z=S.pos.z; pl.ry=S.pos.ry||0; pl.boat=!!S.pos.boat&&S.boat>0; pl.y=groundAt(pl.x,pl.z); curSea=seaAt(pl.x); updateSeaVis() } syncChests(); setRodLook(me,S.rod); colorBobber(bobber,S.rod); refreshHUD(); renderQuests(); toast("Cloud-Spielstand geladen","#8fd3ff"); pushPresence(true) } } } }catch(e){}
      if(user){ try{ const c=await user.can("data.write"); if(c===false) canBoard=false }catch(e){} } dirty=true; boardDirty=true } }
}
let writing=false;
async function syncLoop(){ S.pos={x:Math.round(pl.x*10)/10,z:Math.round(pl.z*10)/10,ry:Math.round(pl.ry*100)/100,boat:pl.boat?1:0}; try{ localStorage.setItem(SAVE_KEY,JSON.stringify(S)) }catch(e){}
  if(db&&myId&&!writing){ writing=true;
    try{ if(dirty){ dirty=false; await db.doc(`data/users/${myId}/save`).set({json:JSON.stringify(S),savedAt:S.savedAt||Date.now()}) } }catch(e){}
    try{ if(boardDirty&&canBoard&&!adminOn()){ boardDirty=false; const doc={earned:S.stats.earned,caught:S.stats.caught,bestV:S.stats.bestV,bestN:String(S.stats.bestN).slice(0,60),dex:Object.keys(S.dex).length,lvl:levelInfo(S.xp).L,t:Date.now(),title:String(S.title||"").slice(0,30),qr:["Nebelrute","Klippenbrecher","Frostfang","Tiefenkrone"].filter(n=>S.rods.includes(n)).length}; if(S.nick) doc.nick=S.nick; await db.doc(`board/${myId}`).set(doc) } }catch(e){ if(e&&e.code==="invalid_argument") canBoard=false }
    writing=false } }
setInterval(syncLoop,15000); document.addEventListener("visibilitychange",()=>{ if(document.hidden){ dirty=true; syncLoop() } });

/* ---------- v2: chests, treasure maps, masters, altar, alchemy ---------- */
function validPos(p){ if(!p||typeof p.x!=="number"||typeof p.z!=="number"||!isFinite(p.x)||!isFinite(p.z)) return false; const s=seaAt(p.x); if(Math.hypot(p.x-seaC(s),p.z)>seaR(s)) return false; if(s===2&&!S.visited["Ankerheim"]) return false; return true }
function addBuff(k,min){ S.buffs[k]=Math.max(Date.now(),S.buffs[k]||0)+min*60000 }
function lqCount(k,n=1){ for(const id in LQ){ const q=S.lq[id]; if(!q||q.done) continue; const st=LQ[id].steps[q.step]; if(!st) continue;
    if(st.k===k){ q.cnt=(q.cnt||0)+n; if(q.cnt===st.goal) setTimeout(()=>{ toast(`${LQ[id].npc}: Aufgabe erfüllt! Kehre zu mir zurück.`,"#ffd24a"); SFX.quest() },2200) }
    if(st.k==="snowtrio"&&k.startsWith("fish:")){ const fn=k.slice(5); if(["Glacierfish","Pond Emperor","Walrus"].includes(fn)){ q.got=q.got||[]; if(!q.got.includes(fn)){ q.got.push(fn); toast(`${LQ[id].npc}: ${fn} gefangen (${q.got.length}/3)`,"#bfefff") } } } }
  renderQuests() }
function chestLoot(tier,loc){ const lt=locTier(loc); const c=Math.round((500+Math.random()*800)*tier*lt); S.money+=c; S.stats.earned+=c; const out=[`${fmt(c)} C$`];
  if(Math.random()<0.2+tier*0.2){ S.relics++; out.push("Enchant-Relikt") }
  const baits=tier>=3?["Truffle Worm","Shark Head","Night Shrimp","Weird Algae"]:tier===2?["Squid","Fish Head","Night Shrimp","Super Flakes"]:["Minnow","Shrimp","Squid","Worm"];
  const b=baits[Math.floor(Math.random()*baits.length)]; const q=3+tier*2; S.bait[b]=(S.bait[b]||0)+q; if(!S.baitEq) S.baitEq=b; out.push(`${q}× ${b}`);
  if(tier>=2&&Math.random()<0.45){ const k=["luck","lure","xp"][Math.floor(Math.random()*3)]; addBuff(k,POTIONS[k].min); out.push(POTIONS[k].n) }
  gainXP(Math.round(90*tier*lt)); boardDirty=true; return out }
function openChest(c){ if(S.chests[c.id]) return; S.chests[c.id]=1; S.stats.chests++; const out=chestLoot(c.tier,c.loc); c.opening=0; SFX.chest(); burstFX(c.x,c.y+1.5,c.z,"#ffd24a",90);
  bigMsg(c.tier>=3?"Legendäre Truhe!":"Schatztruhe!",out.join(" · "),"#ffd24a"); markDirty(); refreshHUD(); checkStory() }
function syncChests(){ for(const c of CHESTS){ c.lid.rotation.x=S.chests[c.id]?-1.9:0; c.glow.visible=false; c.opening=null } }
function makeTreasureMap(){ const cand=ISL.filter(I=>I.sea===curSea&&!I.hidden&&S.visited[I.n]&&!["reef","reefcrown"].includes(I.biome)); if(!cand.length) return null;
  for(let k=0;k<60;k++){ const I=cand[Math.floor(Math.random()*cand.length)]; const a=Math.random()*6.28, d=Math.sqrt(Math.random())*I.r*0.75; const x=I.x+Math.cos(a)*d, z=I.z+Math.sin(a)*d; const h=terrainAt(x,z);
    if(h<1.8||h>I.peak*0.8||platformAt(x,z)>-50||pondAt(x,z)) continue; const c=collide(x,z,1.4); if(Math.hypot(c.x-x,c.z-z)>0.01) continue; return {x:Math.round(x*10)/10,z:Math.round(z*10)/10,loc:I.n} } return null }
function digTreasure(){ if(!S.tmap) return; const loc=S.tmap.loc; const x=S.tmap.x, z=S.tmap.z; S.tmap=null; S.stats.digs++; S.stats.chests++; const out=chestLoot(2,loc);
  for(let i=0;i<40;i++) FX.emit(x,groundAt(x,z)+0.3,z,(Math.random()-.5)*6,4+Math.random()*6,(Math.random()-.5)*6,0.9,0.8,"#8a6a44",-16); SFX.chest(); burstFX(x,groundAt(x,z)+1,z,"#ffd24a",60);
  bigMsg("Schatz ausgegraben!",out.join(" · "),"#ffd24a"); markDirty(); refreshHUD(); checkStory() }
const digBeam=new THREE.Mesh(new THREE.CylinderGeometry(1.2,1.6,260,16,1,true),new THREE.MeshBasicMaterial({color:0xff4a2a,transparent:true,opacity:.22,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false})); digBeam.visible=false; scene.add(digBeam);
const digX=new THREE.Group(); { const m=new THREE.MeshBasicMaterial({color:0xd8261a}); for(const r of [0.785,-0.785]){ const b=new THREE.Mesh(new THREE.BoxGeometry(4,.12,.7),m); b.rotation.y=r; digX.add(b) } } digX.visible=false; scene.add(digX);
function villagerTalk(n){ const lines=n.lines||["Schönes Wetter heute."]; const txt=lines[(n.li=(n.li||0))%lines.length]; n.li++; if(n.bubble) scene.remove(n.bubble);
  n.bubble=textSprite(txt.length>70?txt.slice(0,txt.lastIndexOf(" ",68))+" …":txt,{size:30,color:"#132030",bg:"rgba(255,255,255,.96)",scale:0.03,font:"Nunito"}); scene.add(n.bubble); n.bubbleT=8; n.talkT=8; addChat(n.label,txt,false); if(TOUCH) toast(`${n.label}: ${txt}`,"#bfe6ff") }

function panelAltar(body){ $("sheetTitle").textContent=curNPC?.label||"Altar"; const tab=panelTab||"ench"; setTabs([["ench","Verzaubern"],["list","Alle Verzauberungen"]],tab);
  if(tab==="list"){ const tot=ENCH.reduce((s,e)=>s+e.w,0); const g=document.createElement("div"); g.className="grid"; ENCH.forEach(e=>{ const [tn,tc]=enchTier(e); const c=document.createElement("div"); c.className="card"; c.innerHTML=`<h3 style="color:${tc}">${esc(e.n)}</h3><div class="sub">${tn} · ${(e.w/tot*100).toFixed(1)} %</div><div class="sub" style="color:var(--ink)">${esc(e.d)}</div>`; g.appendChild(c) }); body.appendChild(g); return }
  const r=ROD[S.rod], cur=ENCHBY[S.ench[r.n]];
  body.insertAdjacentHTML("beforeend",`<p class="note">„Lege ein Relikt auf den Altar, und deine ausgerüstete Rute erhält eine zufällige Verzauberung. Eine alte Verzauberung wird dabei ersetzt.“ Relikte fängst du selten (bei legendären Fischen öfter), findest sie in Truhen oder kaufst sie hier.</p>`);
  const c=document.createElement("div"); c.className="card sel"; c.style.maxWidth="440px";
  c.innerHTML=`<h3 style="color:${esc(r.mc)}">${esc(r.n)}</h3><div class="kv"><span>Verzauberung</span><b style="color:${cur?enchTier(cur)[1]:"var(--ink3)"}">${cur?esc(cur.n):"keine"}</b>${cur?`<span>Effekt</span><b>${esc(cur.d)}</b>`:""}<span>Meisterschaft</span><b>${masteryOf(r.n).L}</b><span>Deine Relikte</span><b>${S.relics}</b></div>`;
  const row=document.createElement("div"); row.className="row";
  const b=document.createElement("button"); b.className="btn gold"; b.textContent="Verzaubern · 1 Relikt"; b.disabled=S.relics<1; b.onclick=doEnchant; row.appendChild(b);
  const b2=document.createElement("button"); b2.className="btn alt"; b2.textContent=`Relikt kaufen · ${fmt(RELIC_PRICE)} C$`; b2.disabled=S.money<RELIC_PRICE; b2.onclick=()=>{ if(S.money<RELIC_PRICE) return; S.money-=RELIC_PRICE; S.relics++; SFX.relic(); markDirty(); refreshHUD(); renderPanel() }; row.appendChild(b2);
  c.appendChild(row); body.appendChild(c);
  if(S.rods.length>1){ body.insertAdjacentHTML("beforeend",`<div class="sect">Andere Rute ausrüsten</div>`); const rr=document.createElement("div"); rr.className="row"; S.rods.forEach(n=>{ const e=ENCHBY[S.ench[n]]; const bb=document.createElement("button"); bb.className="btn "+(S.rod===n?"":"alt"); bb.textContent=n+(e?" · "+e.n:""); bb.onclick=()=>{ S.rod=n; setRodLook(me,n); colorBobber(bobber,n); markDirty(); refreshHUD(); pushPresence(true); renderPanel() }; rr.appendChild(bb) }); body.appendChild(rr) } }
function doEnchant(){ const r=S.rod; if(S.relics<1) return; S.relics--; const pool={}; ENCH.forEach(e=>{ if(e.id!==S.ench[r]) pool[e.id]=e.w }); const id=wpick(pool); S.ench[r]=id; S.stats.enchants++;
  const e=ENCHBY[id], [tn,tc]=enchTier(e); SFX.enchant(); flash(tc+"55"); burstFX(pl.x,pl.y+5,pl.z,tc,120); bigMsg(e.n,`${tn} · ${e.d}`,tc); markDirty(); refreshHUD(); checkStory(); renderPanel() }
function panelAlchemist(body){ $("sheetTitle").textContent=curNPC?.label||"Alchemie"; setTabs([],null); const sea2=curNPC&&SEAOF(curNPC.loc)===2;
  body.insertAdjacentHTML("beforeend",`<p class="note">„Frisch gebraut! Die Wirkung läuft in Echtzeit ab, auch wenn du gerade nicht angelst. Mehrere Tränke derselben Sorte verlängern die Dauer.“</p>`);
  const g=document.createElement("div"); g.className="grid";
  for(const [k,p] of Object.entries(POTIONS)){ if(p.sea===2&&!sea2) continue; const left=buffActive(k)?Math.ceil((S.buffs[k]-Date.now())/60000):0; const c=document.createElement("div"); c.className="card"+(left?" sel":"");
    c.innerHTML=`<h3 style="color:${p.col}">${esc(p.n)}</h3><div class="sub">${esc(p.d)}</div><div class="kv"><span>Preis</span><b>${fmt(p.price)} C$</b><span>Aktiv</span><b>${left?left+" min":"nein"}</b></div>`;
    const b=document.createElement("button"); b.className="btn gold"; b.textContent="Trinken"; b.disabled=S.money<p.price; b.onclick=()=>{ if(S.money<p.price) return; S.money-=p.price; addBuff(k,p.min); SFX.relic(); sparkleFX(pl.x,pl.y+4,pl.z,p.col,40,3); toast(`${p.n} wirkt!`,p.col); markDirty(); refreshHUD(); renderPanel() }; c.appendChild(b); g.appendChild(c) }
  body.appendChild(g); if(!sea2) body.insertAdjacentHTML("beforeend",`<p class="note">„Das Kapitänsgebräu? Das braut nur mein Kollege Bram in Ankerheim, in der Zweiten See.“</p>`) }
function panelLQ(body){ const id=curNPC&&curNPC.lq, L=LQ[id]; if(!L){ closeModal(); return } $("sheetTitle").textContent=L.npc; setTabs([],null); const q=S.lq[id];
  body.insertAdjacentHTML("beforeend",`<p class="note" style="font-style:italic">${esc(L.intro)}</p>`);
  const top=document.createElement("div"); top.className="grid"; top.appendChild(rodCard(ROD[L.rod],false)); body.appendChild(top);
  if(q&&q.done){ body.insertAdjacentHTML("beforeend",`<p class="note" style="color:var(--good)">„Die ${esc(L.rod)} gehört dir. Trag den Titel „${esc(L.title)}“ mit Stolz.“</p>`); return }
  if(!q){ const b=document.createElement("button"); b.className="btn gold"; b.textContent="Prüfung annehmen"; b.onclick=()=>{ S.lq[id]={step:0,cnt:0,since:Date.now()}; SFX.quest(); markDirty(); renderQuests(); renderPanel() }; body.appendChild(b);
    body.insertAdjacentHTML("beforeend",`<p class="note">Vier Prüfungen, jede schwerer als die letzte. Fortschritt zählt erst ab Annahme.</p>`); return }
  L.steps.forEach((st,i)=>{ const c=document.createElement("div"); c.className="card"+(i<q.step?" sel":i>q.step?" lock":""); const p=i===q.step?Math.min(st.goal,lqProgress(id)):i<q.step?st.goal:0;
    c.innerHTML=`<h3>${i<q.step?"✓ ":""}Prüfung ${i+1}</h3><div class="sub" style="color:var(--ink)">${i>q.step?"???":esc(st.d)}</div>${i===q.step?`<div class="pbar"><i style="width:${p/st.goal*100}%"></i></div><div class="sub">${fmt(p)} / ${fmt(st.goal)}</div>`:""}`;
    if(i===q.step){ const b=document.createElement("button"); b.className="btn gold"; b.textContent=st.give?"Übergeben":"Abschließen"; b.disabled=p<st.goal; b.onclick=()=>lqAdvance(id); c.appendChild(b) } body.appendChild(c) }) }
function lqAdvance(id){ const q=S.lq[id], L=LQ[id], st=L.steps[q.step]; if(!st||lqProgress(id)<st.goal) return;
  if(st.give==="relics") S.relics-=st.goal; if(st.give==="money") S.money-=st.goal; if(st.give==="final"){ S.relics-=10; S.money-=1000000 }
  q.step++; q.cnt=0; q.got=[]; q.since=Date.now(); SFX.quest();
  if(q.step>=L.steps.length){ q.done=true; if(!S.rods.includes(L.rod)) S.rods.push(L.rod); S.rod=L.rod; setRodLook(me,L.rod); colorBobber(bobber,L.rod); if(!S.titles.includes(L.title)) S.titles.push(L.title); S.title=L.title;
    flash("#ffd24a88"); SFX.enchant(); bigMsg("Legendäre Rute!",`${L.rod} · Titel „${L.title}“`,ROD[L.rod].mc); burstFX(pl.x,pl.y+6,pl.z,"#ffd24a",160) }
  else toast(`${L.npc}: „Gut. Nächste Prüfung: ${L.steps[q.step].d}“`,"#ffd24a");
  markDirty(); boardDirty=true; refreshHUD(); renderQuests(); checkStory(); pushPresence(true); renderPanel() }

/* ---------- v2: living world ---------- */
const crabGeo=merge([P(new THREE.SphereGeometry(.55,10,6),"#e0503a",0,0.35,0,0,0,0,1,0.5,0.75),P(new THREE.SphereGeometry(.22,8,6),"#f0603a",0.55,0.35,0.45),P(new THREE.SphereGeometry(.22,8,6),"#f0603a",-0.55,0.35,0.45),
  P(new THREE.CylinderGeometry(.05,.05,.35,4),"#222",0.18,0.62,0.3),P(new THREE.CylinderGeometry(.05,.05,.35,4),"#222",-0.18,0.62,0.3),
  ...[-1,1].flatMap(s=>[0,1,2].map(i=>P(new THREE.CylinderGeometry(.05,.04,.6,4),"#c03a2a",s*0.55,0.15,-0.2+i*0.2,0,0,s*1.1)))]);
const crabMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.6});
const CRABS=[]; for(let i=0;i<(LOW?5:9);i++){ const m=new THREE.Mesh(crabGeo,crabMat); m.visible=false; m.castShadow=!LOW; scene.add(m); CRABS.push({m,x:0,z:0,a:0,t:Math.random()*9,I:null}) }
let crabIsl=null, crabT=0;
function placeCrabs(I){ crabIsl=I; const r=rng((Date.now()/60000|0)+I.seed); for(const c of CRABS){ c.m.visible=false; for(let k=0;k<30;k++){ const a=r()*6.28, d=I.r*(0.78+r()*0.3), x=I.x+Math.cos(a)*d, z=I.z+Math.sin(a)*d; const h=terrainAt(x,z); if(h>0.2&&h<1.6&&platformAt(x,z)<-50){ c.x=x; c.z=z; c.a=a+Math.PI/2; c.I=I; c.m.visible=true; break } } } }
const dolGeo=merge([P(new THREE.SphereGeometry(1,14,10),"#7d8fa3",0,0,0,0,0,0,2.4,0.75,0.75),P(new THREE.ConeGeometry(.5,1.2,4),"#6b7d91",-0.2,0.9,0,0,0,-0.35,1,1,0.3),P(new THREE.ConeGeometry(.9,1.2,4),"#6b7d91",-2.6,0,0,0,0,Math.PI/2,1,1,0.25),P(new THREE.SphereGeometry(.55,10,8),"#c9d4de",0.6,-0.35,0,0,0,0,2.4,0.5,0.9),P(new THREE.ConeGeometry(.3,1,6),"#7d8fa3",2.7,-0.1,0,0,0,-Math.PI/2)]);
const DOLS=[0,1,2].map(i=>{ const m=new THREE.Mesh(dolGeo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.35})); m.visible=false; scene.add(m); return {m,side:i===0?-1:1,off:i*2.2,ph:i*1.7,on:0} });
const jumpers=[]; let jumpT=3; const jumpMeshes=["Anchovy","Sardine","Mackerel","Salmon","Herring","Bream"].map(n=>FISHBY[n]?n:null).filter(Boolean).concat(FISH.filter(f=>f.r==="Common").slice(0,3).map(f=>f.n)).slice(0,4).map(n=>{ const m=makeFishMesh(n,""); m.visible=false; m.scale.setScalar(0.9); scene.add(m); return m });
/* ---------- secrets: message in a bottle → nameless sandbars ---------- */
const DIRDE=["Norden","Nordosten","Osten","Südosten","Süden","Südwesten","Westen","Nordwesten"];
function bottleRiddle(n){ const B=ISLBY[n]; if(!B) return ""; const I=ISL.filter(x=>!x.hidden&&x.sea===B.sea).reduce((a,b)=>Math.hypot(a.x-B.x,a.z-B.z)<Math.hypot(b.x-B.x,b.z-B.z)?a:b);
  const ang=Math.atan2(B.x-I.x,-(B.z-I.z)); const dir=DIRDE[((Math.round(ang/(Math.PI/4))%8)+8)%8]; const mins=Math.max(1,Math.round((Math.hypot(B.x-I.x,B.z-I.z)-I.r)/40/60*2)/2);
  return `„Von ${I.n} aus Richtung ${dir}, gut ${String(mins).replace(".",",")} Minuten mit dem Motorboot. Drei Palmen, kein Name, eine Truhe.“` }
function findSandbar(I){ S.visited[I.n]=1; if(S.bottle===I.n) S.bottle=null; gainXP(900); markDirty(); banner(I.n,"Eine namenlose Sandbank. Hier war lange niemand mehr. · +900 XP"); SFX.quest(); flash("#ffffff55") }
/* ---------- 3D leaderboard on Moosewood's harbour ---------- */
function drawBoard3D(){ if(!LBOARD) return; const c=LBOARD.c, x=c.getContext("2d"), W=c.width, H=c.height; x.fillStyle="#1d2a24"; x.fillRect(0,0,W,H);
  x.fillStyle="rgba(255,255,255,.04)"; for(let i=0;i<40;i++) x.fillRect(Math.random()*W,Math.random()*H,Math.random()*120,2);
  x.textBaseline="middle"; x.fillStyle="#ffd24a"; x.font="700 58px Fredoka, sans-serif"; x.textAlign="center"; x.fillText("Beste Angler",W/2,56);
  x.font="700 34px Fredoka, sans-serif"; const rows=[...board].sort((a,b)=>(b.earned||0)-(a.earned||0)).slice(0,8);
  rows.forEach((r,i)=>{ const y=128+i*62; x.textAlign="left"; x.fillStyle=i===0?"#ffd24a":i===1?"#dfe6ee":i===2?"#e8a060":"#eaf2ea"; x.fillText(`${i+1}. ${String(names[r.id]||r.nick||"Fischer").slice(0,16)}`,34,y);
    x.textAlign="right"; x.fillStyle="#9fe8a0"; x.fillText(`${fmt(+r.earned||0)} C$`,W-34,y); x.fillStyle="rgba(255,255,255,.12)"; x.fillRect(34,y+28,W-68,2) });
  if(!rows.length){ x.textAlign="center"; x.fillStyle="#cfe0d4"; x.fillText("Noch leer – fang den ersten Fisch!",W/2,H/2) } LBOARD.tex.needsUpdate=true }
/* ---------- whales breaching far out on the open sea ---------- */
const WHALE={m:null,t:0,next:25,x:0,z:0,a:0};
function updateWhale(dt,t){ const open=(lastLoc==="Ocean"||lastLoc==="Sturmsee"); WHALE.next-=dt; if(!WHALE.m&&FISHBY["Humpback Whale"]){ WHALE.m=makeFishMesh("Humpback Whale",""); WHALE.m.scale.setScalar(26); WHALE.m.visible=false; scene.add(WHALE.m) }
  if(!WHALE.m) return; if(WHALE.t<=0&&WHALE.next<=0&&open){ WHALE.next=30+Math.random()*50; const a=Math.random()*6.28, d=260+Math.random()*420; WHALE.x=pl.x+Math.cos(a)*d; WHALE.z=pl.z+Math.sin(a)*d; if(terrainAt(WHALE.x,WHALE.z)>-8) return; WHALE.a=Math.random()*6.28; WHALE.t=0.001; WHALE.m.visible=true; splashFX(WHALE.x,0.3,WHALE.z,40,2.5) }
  if(WHALE.t>0){ WHALE.t+=dt/3.2; const q=Math.min(1,WHALE.t); const y=Math.sin(q*Math.PI)*22-14; WHALE.m.position.set(WHALE.x+Math.cos(WHALE.a)*q*30,y,WHALE.z+Math.sin(WHALE.a)*q*30); WHALE.m.rotation.set(0,-WHALE.a,(0.5-q)*1.8+0.3);
    if(q>0.72&&!WHALE.sp){ WHALE.sp=1; splashFX(WHALE.m.position.x,0.4,WHALE.m.position.z,80,4); SFX.splash(0.4) } if(q>=1){ WHALE.t=0; WHALE.sp=0; WHALE.m.visible=false } } }
function updateLife(dt,t,W){ updateWhale(dt,t);
  // villagers & NPC attention
  for(const n of NPCS){ const dp=Math.hypot(n.x-pl.x,n.z-pl.z); if(dp>240||seaAt(n.x)!==curSea) continue;
    if(n.type!=="villager"){ if(dp<10){ const want=Math.atan2(pl.x-n.x,pl.z-n.z); let d=want-n.ch.group.rotation.y; d=Math.atan2(Math.sin(d),Math.cos(d)); n.ch.group.rotation.y+=d*clamp(dt*4,0,1) } n.ch.head.rotation.y=Math.sin(t*0.7+n.x)*0.15; continue }
    n.wait=(n.wait===undefined?Math.random()*3:n.wait)-dt; n.talkT=(n.talkT||0)-dt; let moving=false, face=null;
    if(dp<6||n.talkT>0){ face=Math.atan2(pl.x-n.x,pl.z-n.z) }
    else if(n.tx!==undefined){ const dx=n.tx-n.x, dz=n.tz-n.z, d=Math.hypot(dx,dz); if(d<0.4){ n.tx=undefined; n.wait=2+Math.random()*5 } else { const sp=2.6*dt; const nx=n.x+dx/d*sp, nz=n.z+dz/d*sp; const c=collide(nx,nz,0.6);
        if(Math.hypot(c.x-nx,c.z-nz)>0.05||groundAt(c.x,c.z)<1.3){ n.tx=undefined; n.wait=1 } else { n.x=c.x; n.z=c.z; moving=true; face=Math.atan2(dx,dz) } } }
    else if(n.wait<=0){ const a=Math.random()*6.28, r=2+Math.random()*(n.walk||8); n.tx=n.hx+Math.cos(a)*r; n.tz=n.hz+Math.sin(a)*r }
    if(face!==null){ let d=face-n.ry; d=Math.atan2(Math.sin(d),Math.cos(d)); n.ry+=d*clamp(dt*6,0,1) }
    n.walkT=(n.walkT||0)+(moving?dt*7:0); const y=groundAt(n.x,n.z); poseCharacter(n.ch,{moving,walkT:n.walkT,st:"idle",y},t); n.ch.group.position.x=n.x; n.ch.group.position.z=n.z; n.ch.group.rotation.y=n.ry; n.sprite.position.set(n.x,y+8.2,n.z);
    if(n.bubble){ n.bubbleT-=dt; n.bubble.position.set(n.x,y+10.3,n.z); if(n.bubbleT<=0){ scene.remove(n.bubble); n.bubble=null } } }
  // crabs
  crabT-=dt; if(crabT<=0){ crabT=2; const I=ISL.filter(I=>I.sea===curSea&&!["volcano","ash","spires","snow"].includes(I.biome)).find(I=>Math.hypot(I.x-pl.x,I.z-pl.z)<I.r+90); if(I&&I!==crabIsl) placeCrabs(I); if(!I&&crabIsl){ crabIsl=null; CRABS.forEach(c=>c.m.visible=false) } }
  if(crabIsl) for(const c of CRABS){ if(!c.m.visible) continue; c.t+=dt; const dp=Math.hypot(c.x-pl.x,c.z-pl.z); const flee=dp<5; const sp=(flee?5:Math.sin(c.t*0.8)>0.3?1.4:0)*(Math.sin(c.t*0.23)>0?1:-1);
    const nx=c.x+Math.cos(c.a)*sp*dt, nz=c.z+Math.sin(c.a)*sp*dt; const h=terrainAt(nx,nz); if(h>0.1&&h<1.8){ c.x=nx; c.z=nz } else c.a+=Math.PI*0.6;
    c.m.position.set(c.x,terrainAt(c.x,c.z)+Math.abs(Math.sin(c.t*14))*0.06*(sp?1:0),c.z); c.m.rotation.y=-c.a+Math.PI/2 }
  // jumping fish
  jumpT-=dt; if(jumpT<=0&&jumpMeshes.length){ jumpT=2.5+Math.random()*4; for(let k=0;k<6;k++){ const a=Math.random()*6.28, d=14+Math.random()*40, x=pl.x+Math.cos(a)*d, z=pl.z+Math.sin(a)*d; const w=waterAt(x,z); if(!w||w.kind!=="sea"||terrainAt(x,z)>-2.5) continue;
      const m=jumpMeshes.find(m=>!m.visible); if(!m) break; const dir=Math.random()*6.28; jumpers.push({m,x,z,dx:Math.cos(dir)*5,dz:Math.sin(dir)*5,t:0,dur:0.9+Math.random()*0.4,h:2.5+Math.random()*2.5}); m.visible=true; splashFX(x,0.2,z,8,0.5); break } }
  for(let i=jumpers.length-1;i>=0;i--){ const j=jumpers[i]; j.t+=dt/j.dur; const q=Math.min(1,j.t); const x=j.x+j.dx*q, z=j.z+j.dz*q, y=Math.sin(q*Math.PI)*j.h-0.3; j.m.position.set(x,y,z); j.m.rotation.set(0,-Math.atan2(j.dz,j.dx),(0.5-q)*2.2);
    if(q>=1){ j.m.visible=false; splashFX(x,0.2,z,10,0.6); jumpers.splice(i,1) } }
  // dolphins escort fast boats on open water
  const openSea=pl.boat&&Math.abs(pl.boatSpeed)>14&&(lastLoc==="Ocean"||lastLoc==="Sturmsee");
  for(const D of DOLS){ D.on=clamp(D.on+(openSea?dt*0.4:-dt*0.6),0,1); D.m.visible=D.on>0.02; if(!D.m.visible) continue; const f=fwd(pl.ry), r={x:Math.cos(pl.ry),z:-Math.sin(pl.ry)};
    const ph=t*2.2+D.ph, jump=Math.max(0,Math.sin(ph))*2.6*D.on-1.6+D.on*1.2; const x=pl.x+f.x*(6+D.off)+r.x*D.side*(7+D.off*0.6), z=pl.z+f.z*(6+D.off)+r.z*D.side*(7+D.off*0.6);
    D.m.position.set(x,jump,z); D.m.rotation.set(0,pl.ry-Math.PI/2,Math.cos(ph)*0.5); if(Math.sin(ph)<0.05&&Math.sin(ph)>-0.05&&Math.random()<0.5) splashFX(x,0.2,z,6,0.5) }
  // fireflies at night on grassy land
  const night=skyU.uNight.value; if(night>0.5&&!pl.boat&&Math.random()<dt*8){ const I=ISLBY[lastLoc]; if(I&&GRASSY.has(I.biome)){ const a=Math.random()*6.28, d=4+Math.random()*22, x=pl.x+Math.cos(a)*d, z=pl.z+Math.sin(a)*d; const h=groundAt(x,z); if(h>1.5) GLOW.emit(x,h+1+Math.random()*3,z,(Math.random()-.5)*0.8,(Math.random()-.3)*0.5,(Math.random()-.5)*0.8,3,0.45,"#d8ff6a",0,0.3) } }
  // geysers, cauldrons, eyes, islets, windmills, portals, chests, hidden islands
  for(const g of GEYSERS){ if(seaAt(g.x)!==curSea||Math.abs(g.x-pl.x)>300||Math.abs(g.z-pl.z)>300) continue; const c=(t+g.ph)%g.per; if(c<2.2&&Math.random()<dt*50){ FX.emit(g.x+(Math.random()-.5),g.y,g.z+(Math.random()-.5),(Math.random()-.5)*2,16+Math.random()*10,(Math.random()-.5)*2,1.4,1.4,c<0.3?"#ffffff":"#e6ecf0",-9,0.4) } else if(Math.random()<dt*3) FX.emit(g.x,g.y,g.z,0,2,0,1.2,0.9,"#cfd6dd",-0.5) }
  for(const w of WITCHLIGHTS){ if(Math.abs(w.x-pl.x)>200||Math.abs(w.z-pl.z)>200) continue; if(Math.random()<dt*5) GLOW.emit(w.x+(Math.random()-.5),w.y,w.z+(Math.random()-.5),0,1+Math.random(),0,1.2,0.6,w.c,-0.3) }
  for(const e of EYES){ const bl=Math.sin((t+e.ph)*0.6)>0.985||Math.sin((t+e.ph*1.3)*0.37)>0.992; e.g.scale.y=lerp(e.g.scale.y,bl?0.08:1,clamp(dt*18,0,1)); const want=Math.atan2(pl.x-e.g.position.x,pl.z-e.g.position.z)+Math.PI/2; let d=want-e.g.rotation.y; d=Math.atan2(Math.sin(d),Math.cos(d)); e.g.rotation.y+=d*clamp(dt*0.8,0,1) }
  for(const s of ISLETS){ s.m.position.y=s.base+Math.sin(t*0.5+s.ph)*2; s.m.rotation.y+=s.sp*dt }
  for(const s of SPINNERS) s.o.rotation.z+=s.sp*dt*(W.weather==="Windy"?3:1);
  for(const p of PORTAL_FX){ p.ring.rotation.z+=dt*0.4; if(p.Pt.from===curSea&&Math.hypot(p.Pt.x-pl.x,p.Pt.z-pl.z)<700&&Math.random()<dt*30){ const a=Math.random()*6.28, r=p.Pt.r*(0.3+Math.random()*0.7); GLOW.emit(p.Pt.x+Math.cos(a)*r,0.6,p.Pt.z+Math.sin(a)*r,-Math.sin(a)*6,6+Math.random()*10,Math.cos(a)*6,2,1.4,p.Pt.from===1?"#9fe8ff":"#ffd28a",-1,0.2) } }
  for(const c of CHESTS){ if(c.opening!==null&&c.opening!==undefined&&c.opening<1.2){ c.opening+=dt*1.4; c.lid.rotation.x=-1.9*smooth(Math.min(1,c.opening)); c.glow.visible=c.opening<1.15; if(Math.random()<dt*30) GLOW.emit(c.x,c.y+1.2,c.z,(Math.random()-.5)*2,3+Math.random()*3,(Math.random()-.5)*2,1,0.8,"#ffe27a",-2) }
    else if(c.tier<2&&!S.chests[c.id]&&Math.abs(c.x-pl.x)<60&&Math.abs(c.z-pl.z)<60&&Math.random()<dt*2) GLOW.emit(c.x+(Math.random()-.5)*2,c.y+1.4,c.z+(Math.random()-.5)*2,0,1,0,1,0.5,"#ffe27a",-0.3) }
  // treasure map marker
  const tm=S.tmap&&seaAt(S.tmap.x)===curSea; digBeam.visible=digX.visible=!!tm; if(tm){ const gy=groundAt(S.tmap.x,S.tmap.z); digBeam.position.set(S.tmap.x,gy+130,S.tmap.z); digX.position.set(S.tmap.x,gy+0.12,S.tmap.z); digBeam.material.opacity=0.16+Math.sin(t*3)*0.06 }
}

/* ---------- admin / test tools (only for the player named "leif") ---------- */
const ADMIN_HASH=1669084274;
const ADM={instant:false,autoReel:false,speed:1,nextFish:"",nextMut:"",sticky:false,fps:false};
const acctName=()=>(window.FDNET&&FDNET.me&&FDNET.me.name)||S.nick||"";
const isLeif=()=>String(acctName()).trim().toLowerCase()==="leif";
const isOnlineAcct=()=>!!(window.FDNET&&FDNET.me);
const adminOn=()=>isLeif()&&(isOnlineAcct()?!!FDNET.me.admin:!!S.admin);
/* global world changes (time, weather, season, events, admin weathers) go through the server so every player sees them */
function gwSet(patch){ if(isOnlineAcct()&&FDNET.send({t:"gw",patch})) return true;
  const now=nowMs(); for(const k in patch){ if(k==="event"){ GW.event=patch.event; GW.evUntil=patch.event?now+10*60e3:0 } else if(k==="aw"){ GW.aw=patch.aw; GW.awUntil=patch.aw?now+(patch.dur||120)*1000:0 } else if(k==="reset"){ Object.assign(GW,{off:0,weather:null,aurora:null,season:null,event:null,evUntil:0,aw:null,awUntil:0}) } else if(k!=="dur") GW[k]=patch[k] } onGWChanged(null); return false }
let lastAW=null;
function onGWChanged(by){ const W=world(); if(W.aw!==lastAW){ if(W.aw){ const A=AW[W.aw]; bigMsg(A.n.toUpperCase()+"!",A.d,A.col); flash(A.col+"66"); SFX.portal(); addChat("Welt",`${A.n} beginnt${by?` (ausgelöst von ${by})`:""}. Noch ${Math.ceil(W.awLeft/60000)} min.`,false) } else if(lastAW){ toast(`${AW[lastAW].n} ist vorbei.`,"#bfe6ff") } lastAW=W.aw } skyT=0; hudT=0 }
function updateAdminUI(){ const on=adminOn(); document.querySelectorAll(".admbtn").forEach(b=>b.style.display=on?"":"none");
  if(!on){ ADM.instant=ADM.autoReel=ADM.sticky=ADM.fps=false; ADM.speed=1; ADM.nextFish=ADM.nextMut=""; if(panel==="admin") closeModal() } }
function adminFish(){ if(!adminOn()||!ADM.nextFish||!FISHBY[ADM.nextFish]) return null; const f=FISHBY[ADM.nextFish]; if(!ADM.sticky) ADM.nextFish=""; return f }
function xpForLevel(L){ let x=0; for(let i=1;i<L;i++) x+=xpNeed(i); return x }
function setClock(h){ const C=CYCLE, ph=((h-6+24)%24)/24; gwSet({off:((ph*C)-(nowMs()%C)+C)%C}) }
function sysMsg(t,col="#ff8a3a"){ addChat("Admin",t,true); if(TOUCH||!modalOpen()) toast(t,col) }
function adminGive(n,mut,wMul){ const f=FISHBY[n]; const w=Math.round(f.bw*wMul*100)/100; const it={id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),n,w,m:mut||"",sh:false,sp:false,bonus:0,fav:false};
  S.fish.push(it); const d=S.dex[n]||{c:0,bw:0,first:Date.now()}; d.c++; d.bw=Math.max(d.bw,w); S.dex[n]=d; S.stats.caught++; S.stats.rarest=Math.max(S.stats.rarest,rIdx(f.r)); S.dexLoc[f.l]=(S.dexLoc[f.l]||0)+1;
  lqCount("fish:"+n); if(mut==="Frozen"){ S.stats.frozen++; lqCount("frozen") } checkDexMilestones(f.l); checkStory(); return it }
function finishLQ(id){ const q=S.lq[id], L=LQ[id]; q.done=true; if(!S.rods.includes(L.rod)) S.rods.push(L.rod); S.rod=L.rod; setRodLook(me,L.rod); colorBobber(bobber,L.rod); if(!S.titles.includes(L.title)) S.titles.push(L.title); S.title=L.title; bigMsg("Legendäre Rute!",`${L.rod} · Titel „${L.title}“`,ROD[L.rod].mc); checkStory(); pushPresence(true) }
/* command parsing: /cmd key:value key2:value with spaces */
function parseCmd(v){ const m=v.trim().replace(/^\//,""); const sp=m.search(/\s/); const cmd=(sp<0?m:m.slice(0,sp)).toLowerCase(); const rest=sp<0?"":m.slice(sp+1).trim();
  const P={}, keys=[], re=/(?:^|\s)([a-zäöü]+):/gi; let x; while((x=re.exec(rest))) keys.push({k:x[1].toLowerCase(),i:x.index,e:re.lastIndex});
  if(!keys.length){ if(rest) P._=rest } else { if(keys[0].i>0) P._=rest.slice(0,keys[0].i).trim(); keys.forEach((o,j)=>{ P[o.k]=rest.slice(o.e,j+1<keys.length?keys[j+1].i:rest.length).trim() }) }
  return {cmd,P} }
const pv=(P,...k)=>{ for(const x of k) if(P[x]!==undefined&&P[x]!=="") return P[x]; return P._ };
const pn=(s,def)=>{ if(s===undefined||s==="") return def; const n=Number(String(s).replace(/[._\s]/g,"").replace(",",".").replace(/k$/i,"000").replace(/mio$/i,"000000")); if(!isFinite(n)) throw new Error(`„${s}“ ist keine Zahl.`); return n };
const onoff=(s,cur)=>{ if(s===undefined||s==="") return !cur; s=String(s).toLowerCase(); return ["on","an","1","ja","true","yes"].includes(s) };
function findIn(list,q,key=x=>x){ if(!q) return null; q=String(q).toLowerCase().trim(); return list.find(x=>key(x).toLowerCase()===q)||list.find(x=>key(x).toLowerCase().startsWith(q))||list.find(x=>key(x).toLowerCase().includes(q))||null }
function tpTargets(){ const T=[];
  ISL.forEach(I=>T.push({n:I.n,go:()=>{ const D=I.dock; if(D){ travelTo(D.ex-Math.cos(D.ang)*4,D.ez-Math.sin(D.ang)*4,false); pl.ry=Math.PI/2-D.ang; cam.yaw=pl.ry; pl.y=groundAt(pl.x,pl.z) } else travelTo(I.x,I.z,false) }}));
  DEEPZ.forEach(Z=>T.push({n:Z.n,go:()=>{ if(S.boat<1) S.boat=3; travelTo(Z.x,Z.z+Z.r*0.55,true) }}));
  RAFTS.forEach(R=>T.push({n:R.n==="Ocean"?"Meeresfloß":"Sturmfloß",go:()=>{ if(S.boat<1) S.boat=3; travelTo(R.x,R.z+22,true) }}));
  PORTALS.forEach((Pt,i)=>T.push({n:Pt.from===1?"Mahlstrom1":"Mahlstrom2",go:()=>{ if(S.boat<1) S.boat=3; travelTo(Pt.x,Pt.z+(Pt.from===1?-Pt.r*0.9:Pt.r*0.9),true) }}));
  Object.entries(LQ).forEach(([id,L])=>T.push({n:id,alias:L.npc,go:()=>{ const n=NPCS.find(n=>n.lq===id); travelTo(n.x+3,n.z+3,false); pl.y=groundAt(pl.x,pl.z) }}));
  CHESTS.forEach(c=>T.push({n:"truhe-"+c.id,alias:"Truhe "+c.loc,go:()=>{ travelTo(c.x+2.5,c.z+2.5,false); pl.y=groundAt(pl.x,pl.z) }}));
  return T }
const WMAP={clear:"Clear",klar:"Clear",rain:"Rain",regen:"Rain",fog:"Foggy",foggy:"Foggy",nebel:"Foggy",wind:"Windy",windy:"Windy"};
const SMAP={spring:"Spring","frühling":"Spring",summer:"Summer",sommer:"Summer",autumn:"Autumn",herbst:"Autumn",winter:"Winter"};
const CMDS={
  help:{u:"",d:"Alle Befehle anzeigen",f:()=>{ sysMsg("Befehle: "+Object.keys(CMDS).map(k=>"/"+k).join(" ")); Object.entries(CMDS).forEach(([k,c])=>addChat("Admin",`/${k} ${c.u} · ${c.d}`,true)); if(TOUCH){ $("chat").classList.add("open") } }},
  panel:{u:"",d:"Admin-Panel öffnen",f:()=>openModal("admin")},
  money:{u:"add:1000000 | set:0",d:"Geld ändern",f:P=>{ if(P.set!==undefined) S.money=Math.max(0,pn(P.set)); else S.money=Math.max(0,S.money+pn(pv(P,"add"),1e6)); return `Geld: ${fmt(S.money)} C$` }},
  level:{u:"set:25 | add:1",d:"Level setzen oder erhöhen",f:P=>{ const L=levelInfo(S.xp).L; if(P.set!==undefined||P._!==undefined&&P.add===undefined){ const t=Math.max(1,Math.min(200,pn(pv(P,"set")))); S.xp=xpForLevel(t) } else { const t=Math.min(200,L+pn(P.add,1)); gainXP(xpForLevel(t)-S.xp) } return `Level ${levelInfo(S.xp).L}` }},
  relics:{u:"add:10 | set:0",d:"Enchant-Relikte",f:P=>{ if(P.set!==undefined) S.relics=Math.max(0,pn(P.set)); else S.relics+=pn(pv(P,"add"),10); return `Relikte: ${S.relics}` }},
  give:{u:"fish:Mistwhale mut:Aurora w:2 count:1",d:"Fisch in den Rucksack",f:P=>{ const f=findIn(FISH,pv(P,"fish"),x=>x.n); if(!f) throw new Error("Fisch nicht gefunden."); const mut=P.mut?findIn(Object.keys(MUT),P.mut):""; if(P.mut&&!mut) throw new Error("Mutation nicht gefunden.");
    const n=Math.max(1,Math.min(50,pn(P.count,1))); let it; for(let i=0;i<n;i++) it=adminGive(f.n,mut,pn(P.w,1)); return `${n}× ${fishLabel(it)} (${fmtKg(it.w)}, ${fmt(fishValue(it))} C$)` }},
  bite:{u:"fish:Megalodon mut:Aurora sticky:on | off",d:"Nächsten Biss festlegen",f:P=>{ const q=pv(P,"fish"); if(!q||/^(off|aus)$/i.test(q)){ ADM.nextFish=ADM.nextMut=""; ADM.sticky=false; return "Biss wieder zufällig" } const f=findIn(FISH,q,x=>x.n); if(!f) throw new Error("Fisch nicht gefunden.");
    ADM.nextFish=f.n; ADM.nextMut=P.mut?(findIn(Object.keys(MUT),P.mut)||""):""; ADM.sticky=P.sticky!==undefined&&onoff(P.sticky,false); return `Nächster Biss: ${f.n}${ADM.nextMut?" · "+ADM.nextMut:""}${ADM.sticky?" (dauerhaft)":""}` }},
  tp:{u:"to:Ankerheim | to:aldo | x:0 z:0",d:"Teleportieren",f:P=>{ closeModal(); if(P.x!==undefined&&P.z!==undefined){ const x=pn(P.x), z=pn(P.z); const w=terrainAt(x,z)<-1.2; if(w&&S.boat<1) S.boat=3; travelTo(x,z,w); pl.y=w?0.5:groundAt(x,z); return `Teleport nach ${Math.round(x)}, ${Math.round(z)}` }
    const T=tpTargets(); const q=pv(P,"to"); const t=findIn(T,q,x=>x.n)||findIn(T,q,x=>x.alias||x.n); if(!t) throw new Error("Ziel nicht gefunden. Beispiele: Moosewood, Vertigo, Mahlstrom1, aldo, truhe-summit"); t.go(); return `Teleport: ${t.alias||t.n}` }},
  say:{u:"text:Hallo alle!",d:"Nachricht an alle Spieler",f:P=>{ const t=String(pv(P,"text")||"").trim(); if(!t) throw new Error("Text fehlt."); if(!(isOnlineAcct()&&FDNET.send({t:"sys",text:t}))) sysMsg(t); return "" }},
  aw:{u:"set:blood | star | storm | off  dur:120",d:"Admin-Wetter für alle (Blutmond, Sternenfall, Leviathans Zorn)",f:P=>{ const v=String(pv(P,"set","name")||"").toLowerCase(); if(!v||/^(off|aus|real)$/.test(v)){ gwSet({aw:null}); return "Admin-Wetter beendet" }
    const k=findIn(Object.keys(AW),v)||Object.keys(AW).find(k=>AW[k].n.toLowerCase().includes(v)); if(!k) throw new Error("Admin-Wetter: blood (Blutmond), star (Sternenfall), storm (Leviathans Zorn), off"); const dur=Math.max(20,Math.min(600,pn(P.dur,120))); gwSet({aw:k,dur}); return `${AW[k].n} für ${Math.round(dur/60*10)/10} min (für alle)` }},
  world:{u:"reset",d:"Alle globalen Admin-Einstellungen zurücksetzen",f:()=>{ gwSet({reset:true}); return "Welt wieder normal (für alle)" }},
  time:{u:"h:0 | real",d:"Uhrzeit festlegen (für alle)",f:P=>{ const v=pv(P,"h","set"); if(!v||/^(real|echt)$/i.test(v)){ gwSet({off:0}); return "Echtzeit" } const h=pn(String(v).replace(/:.*$/,"")); setClock(((h%24)+24)%24); return `Uhrzeit: ${h}:00` }},
  weather:{u:"set:rain | clear | fog | wind | aurora | real",d:"Wetter festlegen (für alle)",f:P=>{ const v=String(pv(P,"set")||"").toLowerCase(); if(!v||v==="real"||v==="echt"){ gwSet({weather:null,aurora:null}); return "Echtes Wetter" }
    if(v==="aurora"||v==="polarlicht"){ gwSet({weather:"Clear",aurora:true}); if(world().realDay) setClock(0); return "Polarlicht (nachts)" } const w=WMAP[v]; if(!w) throw new Error("Wetter: clear, rain, fog, wind, aurora, real"); gwSet({weather:w,aurora:false}); return `Wetter: ${WEATHER_DE[w]}` }},
  season:{u:"set:winter | real",d:"Jahreszeit festlegen (für alle)",f:P=>{ const v=String(pv(P,"set")||"").toLowerCase(); if(!v||v==="real"||v==="echt"){ gwSet({season:null}); return "Echte Jahreszeit" } const s=SMAP[v]; if(!s) throw new Error("Jahreszeit: spring, summer, autumn, winter, real"); gwSet({season:s}); return `Jahreszeit: ${SEASON_DE[s]}` }},
  event:{u:"name:Megalodon Hunt | off | real",d:"Hunt/Event starten (für alle, 10 min)",f:P=>{ const v=pv(P,"name"); if(!v||/^(real|echt)$/i.test(v)){ gwSet({event:null}); return "Echte Events" } if(/^(off|aus|kein)$/i.test(v)){ gwSet({event:false}); return "Kein Event" } const e=findIn(EVENTS,v,x=>x.n); if(!e) throw new Error("Event nicht gefunden."); gwSet({event:e.n}); return `Event: ${e.n} (${e.l})` }},
  speed:{u:"x:4",d:"Lauf- und Bootstempo",f:P=>{ ADM.speed=Math.max(0.25,Math.min(10,pn(pv(P,"x"),1))); return `Tempo ×${ADM.speed}` }},
  instant:{u:"set:on | off",d:"Sofort-Biss",f:P=>{ ADM.instant=onoff(pv(P,"set"),ADM.instant); return `Sofort-Biss: ${ADM.instant?"an":"aus"}` }},
  autoreel:{u:"set:on | off",d:"Automatisch einholen",f:P=>{ ADM.autoReel=onoff(pv(P,"set"),ADM.autoReel); return `Auto-Einholen: ${ADM.autoReel?"an":"aus"}` }},
  fps:{u:"set:on | off",d:"FPS-Anzeige",f:P=>{ ADM.fps=onoff(pv(P,"set"),ADM.fps); return `FPS-Anzeige: ${ADM.fps?"an":"aus"}` }},
  boat:{u:"tier:3",d:"Boot (0–5)",f:P=>{ S.boat=Math.max(0,Math.min(BOATS.length-1,pn(pv(P,"tier"),3)|0)); if(!S.boat) pl.boat=false; return `Boot: ${BOATS[S.boat].n}` }},
  radar:{u:"set:on | off",d:"Fisch-Radar geben/nehmen",f:P=>{ S.radar=onoff(pv(P,"set"),S.radar); S.settings.radar=S.radar; updateRadarUI(); return `Fisch-Radar: ${S.radar?"ja":"nein"}` }},
  areas:{u:"",d:"Fischgebiete hier auflisten",f:()=>{ const loc=locationAt(pl.x,pl.z); const A=(AREA_LOC[loc]||[]).map(a=>`#${a.id} ${a.nat||(a.deep?"tief":"")} (${Math.round(Math.hypot(a.x-pl.x,a.z-pl.z))} m): ${a.fish.join(", ")}`); A.forEach(t=>addChat("Admin",t,true)); return `${A.length} Gebiete bei ${loc}` }},
  bell:{u:"set:on | off",d:"Tauchglocke",f:P=>{ S.bell=onoff(pv(P,"set"),S.bell); return `Tauchglocke: ${S.bell?"ja":"nein"}` }},
  bag:{u:"tier:5 | clear:yes",d:"Rucksack",f:P=>{ if(P.clear!==undefined){ const n=S.fish.length; S.fish=[]; return `${n} Fische entfernt` } S.bag=Math.max(0,Math.min(BAGS.length-1,pn(pv(P,"tier"),BAGS.length-1)|0)); return `Rucksack: ${bagCap()} Plätze` }},
  rods:{u:"all | name:Kings Rod",d:"Ruten geben",f:P=>{ const q=pv(P,"name"); if(!q||q==="all"||q==="alle"){ RODS.forEach(r=>{ if(!S.rods.includes(r.n)) S.rods.push(r.n) }); return `Alle ${RODS.length} Ruten` } const r=findIn(RODS,q,x=>x.n); if(!r) throw new Error("Rute nicht gefunden."); if(!S.rods.includes(r.n)) S.rods.push(r.n); S.rod=r.n; setRodLook(me,r.n); colorBobber(bobber,r.n); pushPresence(true); return `Rute: ${r.n} (ausgerüstet)` }},
  bait:{u:"count:50 | name:Truffle Worm count:20",d:"Köder",f:P=>{ const n=Math.max(1,pn(P.count,50)); const q=pv(P,"name"); if(q){ const b=findIn(BAITS,q,x=>x.n); if(!b) throw new Error("Köder nicht gefunden."); S.bait[b.n]=(S.bait[b.n]||0)+n; S.baitEq=b.n; return `${n}× ${b.n}` } BAITS.forEach(b=>S.bait[b.n]=(S.bait[b.n]||0)+n); return `Alle Köder +${n}` }},
  potion:{u:"min:30 | name:luck min:10",d:"Tränke aktivieren",f:P=>{ const m=Math.max(1,pn(P.min,30)); const q=pv(P,"name"); const ks=q?[findIn(Object.keys(POTIONS),q)||Object.keys(POTIONS).find(k=>POTIONS[k].n.toLowerCase().includes(String(q).toLowerCase()))].filter(Boolean):Object.keys(POTIONS); if(!ks.length) throw new Error("Trank: luck, lure, xp, mega"); ks.forEach(k=>addBuff(k,m)); return `${ks.map(k=>POTIONS[k].n).join(", ")} +${m} min` }},
  mastery:{u:"add:50 | set:max | set:0",d:"Meisterschaft der Rute",f:P=>{ if(P.set!==undefined||(P._!==undefined&&P.add===undefined)){ const v=String(pv(P,"set")); S.mastery[S.rod]=v==="max"?MASTERY_T[MASTERY_T.length-1]:Math.max(0,pn(v)) } else S.mastery[S.rod]=(S.mastery[S.rod]||0)+pn(P.add,50); return `${S.rod}: Meisterschaft ${masteryOf(S.rod).L} (${S.mastery[S.rod]} Fänge)` }},
  ench:{u:"id:divine | off",d:"Verzauberung setzen",f:P=>{ const q=pv(P,"id","name"); if(!q||/^(off|aus|keine)$/i.test(q)){ delete S.ench[S.rod]; return "Verzauberung entfernt" } const e=findIn(ENCH,q,x=>x.id)||findIn(ENCH,q,x=>x.n); if(!e) throw new Error("Verzauberung: "+ENCH.map(e=>e.id).join(", ")); S.ench[S.rod]=e.id; return `${S.rod}: ${e.n}` }},
  story:{u:"skip:1 | reset",d:"Story-Kapitel",f:P=>{ if(/^reset$/i.test(P._||"")||P.reset!==undefined){ S.story=0; return "Story zurückgesetzt" } const n=Math.max(1,pn(pv(P,"skip"),1)); for(let i=0;i<n&&STORY[S.story];i++){ reward(STORY[S.story].rw); S.story++ } return STORY[S.story]?`Jetzt Kapitel ${S.story+1}: ${STORY[S.story].t}`:"Story abgeschlossen" }},
  bounty:{u:"done | new",d:"Aufträge",f:P=>{ const v=String(pv(P,"do")||"done").toLowerCase(); if(v==="new"||v==="neu"){ S.bounties=[]; ensureBounties(locationAt(pl.x,pl.z)); return "Neue Aufträge" } const d=S.bounties; S.bounties=[]; d.forEach(b=>{ S.money+=b.rw; gainXP(b.xp); S.bountyDone++; lqCount("bounties") }); ensureBounties(locationAt(pl.x,pl.z)); return `${d.length} Aufträge erledigt` }},
  quest:{u:"id:aldo do:found | accept | step | done | reset",d:"Meister-Quests",f:P=>{ const id=findIn(Object.keys(LQ),pv(P,"id"))||Object.keys(LQ).find(k=>LQ[k].npc.toLowerCase().includes(String(pv(P,"id")||"#").toLowerCase())); if(!id) throw new Error("Meister: aldo, mara, tenzin, ysolde"); const L=LQ[id]; const a=String(P.do||"done").toLowerCase();
    if(a==="found"){ S.found[id]=1; return `${L.npc}: gefunden` } if(a==="accept"){ S.found[id]=1; if(!S.lq[id]) S.lq[id]={step:0,cnt:0,since:Date.now()}; return `${L.npc}: angenommen` }
    if(a==="step"){ S.found[id]=1; const q=S.lq[id]||(S.lq[id]={step:0,cnt:0}); if(q.done) return `${L.npc}: schon fertig`; q.step++; q.cnt=0; q.got=[]; if(q.step>=4){ q.step=3; finishLQ(id); return `${L.npc}: abgeschlossen` } return `${L.npc}: jetzt Schritt ${q.step+1}/4` }
    if(a==="done"){ S.found[id]=1; S.lq[id]={step:3,cnt:0}; finishLQ(id); return `${L.npc}: abgeschlossen, ${L.rod} erhalten` }
    if(a==="reset"){ delete S.lq[id]; delete S.found[id]; S.rods=S.rods.filter(n=>n!==L.rod); if(S.rod===L.rod) S.rod="Flimsy Rod"; S.titles=S.titles.filter(t=>t!==L.title); if(S.title===L.title) S.title=""; setRodLook(me,S.rod); colorBobber(bobber,S.rod); return `${L.npc}: zurückgesetzt` }
    throw new Error("do: found, accept, step, done, reset") }},
  dex:{u:"set:all | clear",d:"Bestiary",f:P=>{ const v=String(pv(P,"set")||"all").toLowerCase(); if(v==="clear"||v==="leer"){ S.dex={}; S.dexRewards={}; return "Bestiary geleert" } FISH.forEach(f=>{ if(!S.dex[f.n]) S.dex[f.n]={c:1,bw:f.bw,first:Date.now()} }); checkStory(); return `Bestiary: ${FISH.length} Arten` }},
  tmap:{u:"",d:"Schatzkarte erzeugen",f:()=>{ S.tmap=makeTreasureMap(); if(!S.tmap) throw new Error("Keine besuchte Insel in dieser See."); return `Schatzkarte: ${S.tmap.loc}` }},
  chests:{u:"reset | open",d:"Truhen",f:P=>{ const v=String(pv(P,"set")||"reset").toLowerCase(); if(v==="open"){ CHESTS.forEach(c=>S.chests[c.id]=1); syncChests(); return "Alle Truhen geöffnet" } S.chests={}; syncChests(); return `${CHESTS.length} Truhen zurückgesetzt` }},
  admin:{u:"off",d:"Admin-Modus beenden",f:P=>{ if(/^(off|aus)$/i.test(pv(P,"set")||"")){ S.admin=false; if(isOnlineAcct()) FDNET.send({t:"unadmin"}); updateAdminUI(); return "Admin-Modus beendet" } if(P.code!==undefined) return "Admin-Modus ist schon aktiv."; openModal("admin") }},
};
function runCommand(v,fromPanel){ const {cmd,P}=parseCmd(v);
  if(cmd==="admin"&&!adminOn()){ const code=String(P.code||"").trim();
    if(isLeif()&&isOnlineAcct()){ if(!FDNET.send({t:"unlock",code})) sysMsg("Keine Verbindung zum Server.","#ff9a6a"); return }
    if(isLeif()&&hashStr(code)===ADMIN_HASH){ S.admin=true; S.cheated=true; markDirty(); updateAdminUI(); SFX.quest(); sysMsg("Admin-Modus aktiv (offline). Tippe /help für alle Befehle."); return }
    sysMsg("Unbekannter Befehl.","#ff9a6a"); return }
  if(!adminOn()){ sysMsg("Unbekannter Befehl.","#ff9a6a"); return }
  const C=CMDS[cmd]; if(!C){ sysMsg(`Unbekannter Befehl /${cmd}. Tippe /help.`,"#ff9a6a"); return }
  try{ const r=C.f(P); if(r) sysMsg(r); SFX.ui() }catch(e){ sysMsg(`/${cmd}: ${e.message}`,"#ff6363"); SFX.fail() }
  markDirty(); refreshHUD(); renderQuests(); if(fromPanel&&panel==="admin") renderPanel() }
function panelAdmin(body){ $("sheetTitle").textContent="Admin · Testmodus";
  if(!adminOn()){ closeModal(); return }
  const tab=panelTab||"player"; setTabs([["player","Spieler"],["world","Welt & Reisen"],["fish","Fische"],["quest","Quests"],["cmds","Befehle"]],tab);
  const btn=(label,cmd,hot)=>{ const b=document.createElement("button"); b.className=hot?"btn":"btn alt"; b.textContent=label; b.title=cmd; b.onclick=()=>runCommand(cmd,true); return b };
  const row=(title,btns,note)=>{ body.insertAdjacentHTML("beforeend",`<div class="sect">${esc(title)}</div>`); const r=document.createElement("div"); r.className="row"; btns.forEach(b=>r.appendChild(b)); body.appendChild(r); if(note) body.insertAdjacentHTML("beforeend",`<p class="note">${note}</p>`) };
  if(tab==="player"){
    row("Geld",[btn("+10.000","/money add:10000"),btn("+1 Mio","/money add:1000000"),btn("+100 Mio","/money add:100000000"),btn("Auf 0","/money set:0")]);
    row("Level",[btn("+1 Level","/level add:1"),btn("Level 12","/level set:12"),btn("Level 25","/level set:25"),btn("Level 50","/level set:50"),btn("Zurück auf 1","/level set:1")],`Aktuell Level ${levelInfo(S.xp).L}.`);
    row("Ausrüstung",[btn("+10 Relikte","/relics add:10"),btn("Alle Ruten","/rods all"),btn("Hochseeboot","/boat tier:3"),btn("Tauchglocke","/bell set:on"),btn("Größter Rucksack","/bag tier:5"),btn("Alle Köder ×50","/bait count:50"),btn("Alle Tränke 30 min","/potion min:30"),btn("Rucksack leeren","/bag clear:yes")]);
    const M=masteryOf(S.rod); row(`Rute: ${S.rod}`,[btn("Meisterschaft +50","/mastery add:50"),btn("Meisterschaft max","/mastery set:max"),btn("Meisterschaft 0","/mastery set:0")],`Meisterschaft ${M.L} (${M.c} Fänge). Verzauberung:`);
    const er=document.createElement("div"); er.className="row"; er.appendChild(btn("keine","/ench off",!S.ench[S.rod])); ENCH.forEach(e=>er.appendChild(btn(e.n,"/ench id:"+e.id,S.ench[S.rod]===e.id))); body.appendChild(er);
    row("Cheats",[btn(`Sofort-Biss: ${ADM.instant?"an":"aus"}`,"/instant",ADM.instant),btn(`Auto-Einholen: ${ADM.autoReel?"an":"aus"}`,"/autoreel",ADM.autoReel),btn(`Tempo ×${ADM.speed}`,`/speed x:${ADM.speed>=4?1:ADM.speed*2}`,ADM.speed>1),btn(`FPS: ${ADM.fps?"an":"aus"}`,"/fps",ADM.fps)]);
    row("Admin",[btn("Admin-Modus beenden","/admin off")],"Dieser Spielstand bleibt aus der Rangliste raus, bis du ihn unter Spieler → Profil zurücksetzt. Jeder Knopf hier entspricht einem Chat-Befehl (siehe Tab „Befehle“).");
    return }
  if(tab==="world"){ const W=world();
    row("Uhrzeit",[btn("Morgen 7:00","/time h:7"),btn("Mittag 12:00","/time h:12"),btn("Abend 19:00","/time h:19"),btn("Nacht 0:00","/time h:0"),btn("Echtzeit","/time real")],`Jetzt: ${String(Math.floor(W.hour)).padStart(2,"0")}:${String(Math.floor((W.hour%1)*60)).padStart(2,"0")} · ${W.day?"Tag":"Nacht"}`);
    row("Wetter",[...[["Klar","clear","Clear"],["Regen","rain","Rain"],["Nebel","fog","Foggy"],["Wind","wind","Windy"]].map(([l,c,w])=>btn(l,"/weather set:"+c,GW.weather===w&&!GW.aurora)),btn("Polarlicht","/weather set:aurora",!!GW.aurora),btn("Echt","/weather set:real")]);
    row("Admin-Wetter (für alle, 2 min)",[...Object.entries(AW).map(([k,a])=>btn(a.n,"/aw set:"+k,W.aw===k)),btn("Beenden","/aw off")],"Super seltene, super schwere Fische erscheinen nur während dieser Wetter.");
    row("Jahreszeit",[...SEASONS.map(s=>btn(SEASON_DE[s],"/season set:"+s.toLowerCase(),GW.season===s)),btn("Echt","/season set:real")]);
    row("Event / Hunt (für alle)",[btn("Kein Event","/event off",GW.event===false),btn("Echt","/event real"),...EVENTS.map(e=>btn(e.n,"/event name:"+e.n,GW.event===e.n))]);
    row("Welt",[btn("Alles zurücksetzen","/world reset")],"Uhrzeit, Wetter, Jahreszeit, Events und Admin-Wetter gelten für alle Spieler gleichzeitig.");
    row("Reisen · Erste See",ISL.filter(I=>I.sea===1).map(I=>btn(I.n,"/tp to:"+I.n)));
    row("Reisen · Zweite See",ISL.filter(I=>I.sea===2).map(I=>btn(I.n,"/tp to:"+I.n)));
    row("Reisen · Tiefsee, Flöße, Mahlstrom",[...DEEPZ.map(Z=>btn(Z.n,"/tp to:"+Z.n)),btn("Meeresfloß","/tp to:Meeresfloß"),btn("Sturmfloß","/tp to:Sturmfloß"),btn("Mahlstrom → 2. See","/tp to:Mahlstrom1"),btn("Mahlstrom → 1. See","/tp to:Mahlstrom2")]);
    row("Reisen · Meister",Object.entries(LQ).map(([id,L])=>btn(L.npc,"/tp to:"+id)));
    row("Reisen · Truhen",CHESTS.map(c=>btn(`${c.loc}${S.chests[c.id]?" ✓":""}`,"/tp to:truhe-"+c.id)));
    return }
  if(tab==="fish"){ const sel="background:var(--panel);border:1px solid var(--line);border-radius:10px;color:var(--ink);font:800 14px var(--body);padding:9px";
    body.insertAdjacentHTML("beforeend",`<div class="sect">Fisch geben oder erzwingen</div>
      <div class="row"><input id="admFish" list="admFishList" placeholder="Fischname" style="flex:1;min-width:200px;${sel};font-size:15px;-webkit-user-select:text;user-select:text">
      <select id="admMut" style="${sel}"><option value="">keine Mutation</option>${Object.keys(MUT).map(m=>`<option>${esc(m)}</option>`).join("")}</select>
      <select id="admW" style="${sel}"><option value="1">Normalgewicht</option><option value="2">Giant ×2</option><option value="0.5">Klein ×0,5</option></select></div>
      <datalist id="admFishList">${FISH.map(f=>`<option value="${esc(f.n)}">${esc(f.r)} · ${esc(f.l)}</option>`).join("")}</datalist>`);
    const cmdFrom=base=>{ const n=$("admFish").value.trim(), m=$("admMut").value; return `${base} fish:${n}${m?" mut:"+m:""}` };
    const r=document.createElement("div"); r.className="row";
    const mk=(l,fn,cls)=>{ const b=document.createElement("button"); b.className=cls||"btn alt"; b.textContent=l; b.onclick=fn; return b };
    r.appendChild(mk("In den Rucksack",()=>runCommand(cmdFrom("/give")+" w:"+$("admW").value,true),"btn gold"));
    r.appendChild(mk("Als nächsten Biss",()=>runCommand(cmdFrom("/bite"),true)));
    r.appendChild(mk("Immer diesen Fisch",()=>runCommand(cmdFrom("/bite")+" sticky:on",true),ADM.sticky?"btn":"btn alt"));
    r.appendChild(mk("Biss wieder zufällig",()=>runCommand("/bite off",true)));
    body.appendChild(r);
    body.insertAdjacentHTML("beforeend",`<p class="note">${ADM.nextFish?`Erzwungen: <b>${esc(ADM.nextFish)}</b>${ADM.nextMut?" · "+esc(ADM.nextMut):""}${ADM.sticky?" (dauerhaft)":""}. `:""}„Als nächsten Biss“ fängst du normal mit Minispiel, dann zählen auch Meisterschaft, Relikte und Quests.</p>`);
    const q=document.createElement("div"); q.className="row"; ["Mistwhale","Abyssal Sovereign","Glacierfish","Pond Emperor","Walrus","Megalodon","The Unseen","Tide Emperor"].filter(n=>FISHBY[n]).forEach(n=>q.appendChild(mk(n,()=>{ $("admFish").value=n })));
    body.insertAdjacentHTML("beforeend",`<div class="sect">Schnellauswahl</div>`); body.appendChild(q);
    row("Sammlung",[btn("Ganzes Bestiary","/dex set:all"),btn("Bestiary leeren","/dex set:clear"),btn("Schatzkarte","/tmap")]);
    return }
  if(tab==="cmds"){ body.insertAdjacentHTML("beforeend",`<p class="note">Alle Befehle funktionieren im Chat (Enter), nur für dich sichtbar. Werte mit Leerzeichen sind erlaubt, z. B. <b>/give fish:Great White Shark mut:Aurora</b>. Namen dürfen abgekürzt werden.</p>
    <div style="overflow-x:auto"><table class="lb"><tr><th>Befehl</th><th>Parameter</th><th>Wirkung</th></tr>${Object.entries(CMDS).map(([k,c])=>`<tr><td><b>/${k}</b></td><td>${esc(c.u)}</td><td>${esc(c.d)}</td></tr>`).join("")}</table></div>`); return }
  const st=STORY[S.story]; row("Story",[btn("Kapitel überspringen","/story skip:1"),btn("Story auf Anfang","/story reset")],st?`Aktuell: ${S.story+1}. ${esc(st.t)}`:"Story abgeschlossen.");
  row("Aufträge",[btn("Alle erledigen","/bounty done"),btn("Neu würfeln","/bounty new")]);
  for(const [id,L] of Object.entries(LQ)){ const q=S.lq[id]; const s=q&&!q.done?`Schritt ${q.step+1}/4 · ${Math.min(lqProgress(id),L.steps[q.step].goal)}/${L.steps[q.step].goal}`:q&&q.done?"abgeschlossen":S.found[id]?"gefunden, nicht angenommen":"nicht gefunden";
    row(`${L.npc} (${s})`,["found:Gefunden","accept:Annehmen","step:Schritt erfüllen","done:Sofort abschließen","reset:Zurücksetzen"].map(x=>{ const [a,l]=x.split(":"); return btn(l,`/quest id:${id} do:${a}`) })) }
  row("Truhen",[btn("Alle zurücksetzen","/chests reset"),btn("Alle als geöffnet","/chests open")]);
}
/* chat autocomplete for admin commands: type "/" */
const SUG={list:[],sel:0};
function sugValues(cmd,key){ const E=x=>x;
  if(key==="fish") return FISH.map(f=>[f.n,f.r+" · "+f.l]);
  if(key==="mut") return Object.keys(MUT).map(m=>[m,"×"+MUT[m].v]);
  if(key==="to") return tpTargets().map(t=>[t.n,t.alias||""]);
  if(key==="name"&&cmd==="event") return EVENTS.map(e=>[e.n,e.l]).concat([["off","kein Event"],["real","echte Events"]]);
  if(key==="name"&&cmd==="rods") return RODS.map(r=>[r.n,r.price?fmt(r.price)+" C$":"Quest"]);
  if(key==="name"&&cmd==="bait") return BAITS.map(b=>[b.n,b.r]);
  if(key==="name"&&cmd==="potion") return Object.entries(POTIONS).map(([k,p])=>[k,p.n]);
  if((key==="set"||key==="name")&&cmd==="aw") return Object.entries(AW).map(([k,a])=>[k,a.n]).concat([["off","beenden"]]);
  if(key==="set"&&cmd==="weather") return ["clear","rain","fog","wind","aurora","real"].map(x=>[x,""]);
  if(key==="set"&&cmd==="season") return ["spring","summer","autumn","winter","real"].map(x=>[x,""]);
  if(key==="id"&&cmd==="quest") return Object.entries(LQ).map(([k,L])=>[k,L.npc]);
  if(key==="do"&&cmd==="quest") return ["found","accept","step","done","reset"].map(x=>[x,""]);
  if(key==="id"&&cmd==="ench") return ENCH.map(e=>[e.id,e.n]);
  if(key==="h"&&cmd==="time") return ["0","6","12","18","real"].map(x=>[x,x==="real"?"Echtzeit":x+":00 Uhr"]);
  return null }
function updateSug(){ const box=$("cmdSug"), v=$("chatin").value; SUG.list=[];
  if(!v.startsWith("/")||!isLeif()){ box.classList.remove("on"); return }
  const avail=adminOn()?Object.entries(CMDS):[["admin",{u:"code:",d:"Admin-Modus freischalten"}]];
  const sp=v.indexOf(" "); let html="";
  if(sp<0){ const q=v.slice(1).toLowerCase(); SUG.list=avail.filter(([k])=>k.startsWith(q)).map(([k,c])=>({ins:"/"+k+" ",b:"/"+k,s:c.u+(c.u?" · ":"")+c.d})); }
  else { const cmd=v.slice(1,sp).toLowerCase(), C=avail.find(([k])=>k===cmd); if(!C){ box.classList.remove("on"); return }
    const m=v.match(/([a-zäöü]+):([^:]*)$/i); const vals=m?sugValues(cmd,m[1].toLowerCase()):null;
    if(vals){ const q=m[2].trim().toLowerCase(); const base=v.slice(0,v.length-m[2].length); SUG.list=vals.filter(([n])=>n.toLowerCase().includes(q)).sort((a,b)=>(b[0].toLowerCase().startsWith(q))-(a[0].toLowerCase().startsWith(q))).slice(0,40).map(([n,s])=>({ins:base+n+" ",b:n,s})) }
    html=`<div class="hd">/${esc(cmd)} ${esc(C[1].u)} · ${esc(C[1].d)}</div>` }
  if(SUG.sel>=SUG.list.length) SUG.sel=0;
  box.innerHTML=html+SUG.list.map((x,i)=>`<div data-i="${i}" class="${i===SUG.sel?"sel":""}"><b>${esc(x.b)}</b><span>${esc(x.s||"")}</span></div>`).join("");
  box.classList.toggle("on",!!(html||SUG.list.length)); const s=box.querySelector(".sel"); if(s) s.scrollIntoView({block:"nearest"}) }
function applySug(i){ const x=SUG.list[i]; if(!x) return false; $("chatin").value=x.ins; SUG.sel=0; updateSug(); $("chatin").focus(); return true }
$("chatin").addEventListener("input",()=>{ SUG.sel=0; updateSug() });
$("chatin").addEventListener("keydown",e=>{ if(!$("cmdSug").classList.contains("on")||!SUG.list.length) return;
  if(e.key==="ArrowDown"||e.key==="ArrowUp"){ SUG.sel=(SUG.sel+(e.key==="ArrowDown"?1:-1)+SUG.list.length)%SUG.list.length; updateSug(); e.preventDefault(); e.stopImmediatePropagation(); return }
  if(e.key==="Tab"){ applySug(SUG.sel); e.preventDefault(); e.stopImmediatePropagation(); return }
  if(e.key==="Enter"){ const v=$("chatin").value; const x=SUG.list[SUG.sel]; if(x&&!v.includes(" ")&&x.ins.trim()!==v.trim()){ applySug(SUG.sel); e.preventDefault(); e.stopImmediatePropagation() } } },true);
$("chatin").addEventListener("blur",()=>setTimeout(()=>$("cmdSug").classList.remove("on"),150));
$("chatin").addEventListener("focus",updateSug);
$("cmdSug").addEventListener("pointerdown",e=>{ const d=e.target.closest("[data-i]"); if(d){ e.preventDefault(); applySug(+d.dataset.i) } });
addEventListener("keydown",e=>{ if(e.key==="F9"&&adminOn()&&!typing()){ e.preventDefault(); modalOpen()&&panel==="admin"?closeModal():openModal("admin") } });
{ const el=document.createElement("div"); el.id="fps"; el.style.cssText="position:absolute;z-index:40;left:50%;bottom:4px;transform:translateX(-50%);font:800 12px var(--body);color:#9dffae;background:rgba(0,0,0,.55);padding:2px 8px;border-radius:8px;pointer-events:none;display:none"; document.getElementById("app").appendChild(el);
  let n=0; const loop=()=>{ n++; requestAnimationFrame(loop) }; requestAnimationFrame(loop); setInterval(()=>{ el.style.display=ADM.fps?"block":"none"; if(ADM.fps) el.textContent=`${n} FPS · ${renderer.info.render.calls} Draw Calls · ${Math.round(pl.x)}, ${Math.round(pl.z)}`; n=0 },1000) }
/* ---------- main loop ---------- */
let boltTimer=3, lightFlash=0, hemiBase=1;
let tileT=0, DETAIL_R=LOW?2200:3400;
function cullIslands(){ for(const I of ISL){ const g=ISG[I.n]; if(!g) continue; const d=Math.hypot(I.x-pl.x,I.z-pl.z)-I.r; let v=I.sea===curSea&&d<DETAIL_R;
    if(I.hidden){ const W=world(); if(I.n==="Nebelinsel") v=v&&(!!S.visited[I.n]||(d<440&&(W.weather==="Foggy"||!W.day)));
      else if(I.biome==="ghost") v=v&&!W.day&&d<(S.visited[I.n]?2600:1300); else v=v&&(!!S.visited[I.n]||d<(I.sandbar?560:600));
      if(I.sandbar&&!S.visited[I.n]&&d<I.r*0.3) findSandbar(I) } g.visible=v } lodIslands(pl.x,pl.z); for(const n of NPCS){ const d=Math.hypot(n.x-pl.x,n.z-pl.z); n.ch.group.visible=d<(LOW?220:380) } }
let lastT=performance.now(), T0=performance.now(), hudT=0, miniT=0, skyT=0, presT=0, hintT=0;
const tipV=new THREE.Vector3(), camTarget=new THREE.Vector3();
function frame(now){
  const dt=Math.min(0.05,(now-lastT)/1000); lastT=now; const t=(now-T0)/1000; U.time.value=t; waterU.uTime.value=t;
  updatePlayer(dt,t);
  me.group.position.set(pl.x,0,pl.z); me.group.rotation.y=pl.ry; poseCharacter(me,{moving:pl.moving,boat:pl.boat,swim:pl.swim,walkT:pl.walkT,st:F.state==="hold"||F.state==="show"||(holdIt&&F.state==="idle")?"hold":F.state,y:pl.y},t);
  boats.forEach((b,i)=>{ if(!b) return; b.visible=pl.boat&&S.boat===i; if(b.visible){ b.position.set(pl.x,waveHeight(pl.x,pl.z,t)-0.3,pl.z); b.rotation.y=pl.ry; b.rotation.z=Math.sin(t*1.6)*0.035; b.rotation.x=Math.sin(t*1.2)*0.02-pl.boatSpeed*0.002; if(b.userData.flag) b.userData.flag.rotation.y=Math.sin(t*4)*0.3 } });
  // camera
  const f=fwd(cam.yaw), cd=cam.dist; camTarget.set(pl.x,pl.y+(pl.boat?3.6:4.8),pl.z);
  let cx=camTarget.x-f.x*cd*Math.cos(cam.pitch), cz=camTarget.z-f.z*cd*Math.cos(cam.pitch), cy=camTarget.y+cd*Math.sin(cam.pitch); cy=Math.max(cy,groundAt(cx,cz)+2.2,waveHeight(cx,cz,t)+1.5);
  const k=clamp(dt*10,0,1); cam.x=lerp(cam.x,cx,k); cam.y=lerp(cam.y,cy,k); cam.z=lerp(cam.z,cz,k); camera.position.set(cam.x,cam.y,cam.z);
  if(camShake>0){ camShake=Math.max(0,camShake-dt*1.2); camera.position.x+=(Math.random()-.5)*camShake; camera.position.y+=(Math.random()-.5)*camShake } camera.lookAt(camTarget);
  if(pl.boat&&pl.moving&&!rmb&&touches.size===0){ let d=pl.ry-cam.yaw; d=Math.atan2(Math.sin(d),Math.cos(d)); cam.yaw+=d*clamp(dt*1.4,0,1) }
  sky.position.copy(camera.position); const ws=WSIZE/WG; water.position.set(Math.round(camera.position.x/ws)*ws,0,Math.round(camera.position.z/ws)*ws); farWater.position.copy(water.position); seabed.position.set(camera.position.x,SEAFLOOR-0.5,camera.position.z);
  updateHMap(pl.x,pl.z,false); tileT-=dt; if(tileT<=0){ tileT=updateTiles(pl.x,pl.z)?0.05:0.5; cullIslands() }
  const sNow=seaAt(pl.x); if(sNow!==curSea){ curSea=sNow; updateSeaVis() }
  // fishing
  if(F.state==="charge"){ F.power+=F.pdir*dt*1.1; if(F.power>=1){F.power=1;F.pdir=-1} if(F.power<=0){F.power=0;F.pdir=1}
    const A=aimPoint(); if(A){ marker.visible=true; marker.position.set(A.x,(A.water?A.water.y:groundAt(A.x,A.z))+0.25,A.z); marker.material.color.set(A.water?"#7dff8a":"#ff6b6b"); marker.scale.setScalar(1+Math.sin(t*6)*0.08); pl.ry=Math.atan2(A.x-pl.x,A.z-pl.z) }
    const pw=$("power"); pw.style.display="block"; if(F.auto){ const r=tFish.getBoundingClientRect(); pw.style.left=(r.left-26)+"px"; pw.style.top=(r.top-10)+"px" } else { pw.style.left=(mx+24)+"px"; pw.style.top=(my-45)+"px" } pw.firstElementChild.style.height=(F.power*100)+"%"; pw.firstElementChild.style.background=F.power>=.93?"#6fe37b":F.power>.6?"#ffd24a":"#ff9a5a" }
  else if(F.state==="idle"&&!modalOpen()&&!TOUCH){ const A=aimPoint(); if(A&&A.water&&!pl.swim&&!(pl.boat&&pl.moving)){ marker.visible=true; marker.position.set(A.x,A.water.y+0.25,A.z); marker.material.color.set("#ffffff"); marker.material.opacity=0.35; marker.scale.setScalar(0.8) } else marker.visible=false }
  else marker.visible=false;
  if(F.state!=="charge") marker.material.opacity=F.state==="idle"?0.35:0.85; else marker.material.opacity=0.9;
  if(F.state==="cast"){ F.castT+=dt/0.6; const q=Math.min(1,F.castT); const x=lerp(F.from.x,F.bob.x,q), z=lerp(F.from.z,F.bob.z,q), y=lerp(F.from.y,0.2,q)+Math.sin(q*Math.PI)*7; bobber.visible=true; bobber.position.set(x,y,z); me.tip.getWorldPosition(tipV); setLine(myLine,tipV,bobber.position,0.3); if(q>=1) landBobber() }
  if(["lure","bite","reel"].includes(F.state)){ const dip=F.state!=="lure"?Math.sin(t*25)*0.15-0.3:Math.sin(t*3)*0.08; bobber.visible=true; bobber.position.set(F.bob.x,F.bob.y+(F.bob.y===0?waveHeight(F.bob.x,F.bob.z,t):0)+dip,F.bob.z); me.tip.getWorldPosition(tipV); setLine(myLine,tipV,bobber.position,F.state==="reel"?0.2:1.8) }
  if(F.state==="lure"&&!F.target){ F.lureT+=dt; if(F.lureT>=F.lureNeed) randomBite() }
  if(F.state==="lure"&&F.target&&!shadows.includes(F.target)){ F.target=null; F.lureNeed=4; F.lureT=0; $("shake").style.display="block"; moveShake() }
  if(F.state==="reel") updateReel(dt);
  updateShow(dt,t); updateHold(t); updateBiteMarks(dt,t);
  updateShadows(dt,t);
  for(let i=floats.length-1;i>=0;i--){ const fl=floats[i]; fl.life-=dt; fl.s.position.set(pl.x,me.group.position.y+9+(fl.max-fl.life)*2,pl.z); fl.s.material.opacity=clamp(fl.life/fl.max*1.6,0,1); if(fl.life<=0){ scene.remove(fl.s); fl.s.material.map.dispose(); floats.splice(i,1) } }
  if(myBubble){ myBubbleT-=dt; myBubble.position.set(pl.x,me.group.position.y+10.2,pl.z); if(myBubbleT<=0){ scene.remove(myBubble); myBubble=null } }
  // world animation
  const W=world(); updateClouds(dt,W.weather==="Windy"||W.aw==="storm"?4:1); updateBirds(t,dt);
  updateMeteors(dt,W.aw==="star",pl.x,pl.z,camera); updateBolt(dt);
  if(W.aw==="storm"){ boltTimer-=dt; if(boltTimer<=0){ boltTimer=2+Math.random()*5; const b=strikeLightning(pl.x,pl.z); lightFlash=1; SFX.thunder(b.d) } }
  if(W.aw==="blood"&&Math.random()<dt*25){ const a=Math.random()*6.28, d=10+Math.random()*80; GLOW.emit(pl.x+Math.cos(a)*d,0.5+Math.random()*3,pl.z+Math.sin(a)*d,0,0.8+Math.random(),0,2.5,0.7,"#ff2a3a",0,0.2) }
  lightFlash=Math.max(0,lightFlash-dt*3.5); hemi.intensity=hemiBase+lightFlash*3.2;
  for(const s of SWIRLS){ if(s.ring) s.ring.rotation.z+=s.sp*dt; if(s.orb){ s.orb.position.y=s.y+Math.sin(t*1.5)*0.6; s.orb.rotation.y=t } }
  for(const fl of FLOATERS){ fl.m.position.y=fl.base+Math.sin(t*1.3+fl.ph)*(fl.amp||0.15) }
  if(lighthouseBeam) lighthouseBeam.rotation.y=t*0.6;
  updateRadar(dt,t); updateHunt(dt,t,W);
  const SCH=schoolFor(W,locationAt(pl.x,pl.z)); if(SCH&&seaAt(SCH.x)===curSea){ if(Math.random()<dt*25){ const a=Math.random()*6.28, d=Math.random()*SCH.r; FX.emit(SCH.x+Math.cos(a)*d,0.2,SCH.z+Math.sin(a)*d,0,3+Math.random()*2,0,0.7,0.5,"#dff6ff",-4) } }
  if(rain.visible){ const a=rainGeo.attributes.position.array; for(let i=0;i<RAIN_N;i++){ let y=a[i*6+1]-70*dt; if(y<0) y+=70; a[i*6+1]=y; a[i*6+4]=y-1.6 } rainGeo.attributes.position.needsUpdate=true; rain.position.set(camera.position.x,camera.position.y-30,camera.position.z) }
  const SI=ISLBY["Snowcap Island"], FZ=ISLBY["Frostzinnen"]; const snowy=Math.hypot(pl.x-SI.x,pl.z-SI.z)<SI.r+120||Math.hypot(pl.x-FZ.x,pl.z-FZ.z)<FZ.r+140||(W.season==="Winter"&&W.weather!=="Clear"&&!pl.boat); snowFall.visible=snowy; if(snowy){ const a=snowFall.geometry.attributes.position.array; for(let i=0;i<900;i++){ a[i*3+1]-=5*dt; a[i*3]+=Math.sin(t+i)*0.02; if(a[i*3+1]<0) a[i*3+1]+=60 } snowFall.geometry.attributes.position.needsUpdate=true; snowFall.position.set(camera.position.x,camera.position.y-25,camera.position.z) }
  for(const gm of Object.values(GRASS)) if(gm) gm.material.uniforms.uPlayer.value.set(pl.x,pl.y,pl.z);
  for(const n of ["Roslit Volcano","Aschefelder"]){ const I=ISLBY[n]; if(I.lavaY&&I.sea===curSea&&Math.random()<dt*6) GLOW.emit(I.x+(Math.random()-.5)*8,I.lavaY+1,I.z+(Math.random()-.5)*8,(Math.random()-.5)*2,4+Math.random()*6,(Math.random()-.5)*2,1.6,1.5,"#ff7a2a",-3) }
  waterU.uRough.value=W.aw==="storm"?1.5:curSea===1&&S.boat&&Math.hypot(pl.x,pl.z)>BOATS[S.boat].range-40?clamp((Math.hypot(pl.x,pl.z)-BOATS[S.boat].range+40)/60,0,1.5):curSea===2&&W.weather==="Rain"?0.5:0;
  for(const L of LABELS){ const d=Math.hypot(L.position.x-pl.x,L.position.z-pl.z), rg=L.userData.range||250; const f=clamp((rg-d)/50,0,1); L.visible=f>0.01&&!(L.userData.hid&&!S.visited[L.userData.loc]); L.material.opacity=f }
  for(const n of NPCS){ const d=Math.hypot(n.x-pl.x,n.z-pl.z), f=clamp((32-d)/10,0,1); n.sprite.visible=f>0.01; n.sprite.material.opacity=f }
  updateLife(dt,t,W);
  FX.update(dt); GLOW.update(dt);
  updatePeers(dt,t);
  skyT-=dt; if(skyT<=0){ skyT=0.2; updateSky() }
  hudT-=dt; if(hudT<=0){ hudT=0.5; refreshWorldHUD(); musicTick() }
  miniT-=dt; if(miniT<=0){ miniT=0.12; drawMini(); updatePrompt() }
  hintT-=dt; if(hintT<=0){ hintT=0.3; contextHint() }
  presT-=dt; if(presT<=0){ presT=0.2; pushPresence() }
  perfCheck(dt);
  if(TOUCH){ const st=F.state; const lbl=st==="reel"?"HALTEN":st==="lure"&&!F.target?"SHAKE":st==="charge"?"LOS!":st==="idle"?"ANGELN":"…"; if(tFish.dataset.l!==lbl){ tFish.dataset.l=lbl; $("tFishT").textContent=lbl; tFish.classList.toggle("hot",st==="reel"||st==="charge") }
    $("tCancel").style.display=(st==="lure"||st==="cast")?"flex":"none"; $("tJumpT").textContent=pl.boat?"⚡":"⤒"; $("tBoatT").textContent=pl.boat?"Aussteigen":"Boot" }
  if(composer) composer.render(); else renderer.render(scene,camera);
  requestAnimationFrame(frame);
}

/* ---------- adaptive quality ---------- */
const PERF={n:0,t:0,stage:0,started:false};
function setQuality(level){ // 2 high, 1 medium, 0 low
  S.settings.q=level; DETAIL_R=level===0?1500:level===1?2400:3400; FINE_R=level===0?420:level===1?560:760; if(level<2){ composer=null; renderer.shadowMap.enabled=false; sun.castShadow=false; renderer.setPixelRatio(Math.min(devicePixelRatio||1,level===1?1.25:1)); resizeGL() }
  if(level===2&&!LOW){ location.reload() }
  for(const gm of Object.values(GRASS)) if(gm) gm.visible=level>0; markDirty() }
function perfCheck(dt){ if(!PERF.started||S.settings.qLocked) return; PERF.n++; PERF.t+=dt; if(PERF.t<4) return; const fps=PERF.n/PERF.t; PERF.n=0; PERF.t=0;
  if(fps<28&&PERF.stage<2){ PERF.stage++; setQuality(2-PERF.stage); toast(`Grafik automatisch reduziert (${Math.round(fps)} FPS). Einstellbar unter Spieler → Profil.`,"#8fd3ff") } else if(PERF.stage>=2||fps>=28) PERF.started=false }
if(TOUCH){ $("reelHelp").textContent="Angel-Knopf oder Bildschirm halten = Balken nach rechts"; }
/* ---------- accounts: name + password, every name exists only once ---------- */
function accountGate(lt,lb){ return new Promise(async resolve=>{
  const done=(who)=>{ $("acct").style.display="none"; if(who){ loadLocal(who.id,who.name); $("accWho").innerHTML=`Angemeldet als <b>${esc(who.name)}</b> · <a id="accOut">Abmelden</a>`; $("accOut").onclick=async()=>{ await FDNET.logout(); location.reload() } }
    else { loadLocal(null,"Gast"); $("accWho").textContent="Offline als Gast · kein Multiplayer, Spielstand nur in diesem Browser" } resolve() };
  if(!window.FDNET||!FDNET.online){ done(null); return }
  lt.textContent="Verbinde…"; FDNET.fetchGW().then(g=>{ if(g) onGWChanged(null) });
  const who=await FDNET.resume(); if(who){ done(who); return }
  lt.textContent="Melde dich an oder erstelle einen Account"; lb.parentElement.style.display="none"; $("acct").style.display="flex"; $("accName").value=FDNET.lastName(); (FDNET.lastName()?$("accPass"):$("accName")).focus();
  const go=async kind=>{ const n=$("accName").value.trim(), p=$("accPass").value; $("accMsg").textContent=""; $("accLogin").disabled=$("accReg").disabled=true;
    try{ const w=await FDNET.auth(kind,n,p); lb.parentElement.style.display=""; done(w) }catch(e){ $("accMsg").textContent=e.message||"Fehler"; $("accLogin").disabled=$("accReg").disabled=false } };
  $("accLogin").onclick=()=>go("login"); $("accReg").onclick=()=>go("register");
  $("accGuest").onclick=()=>{ lb.parentElement.style.display=""; done(null) };
  ["accName","accPass"].forEach(id=>$(id).addEventListener("keydown",e=>e.stopPropagation())) }) }
/* ---------- boot ---------- */
async function boot(){
  const lt=$("loadtxt"), lb=$("loadbar").firstElementChild;
  await buildWorld((msg,p)=>{ lt.textContent=msg; lb.style.width=p+"%" });
  resizeGL();
  await accountGate(lt,lb);
  setRodLook(me,S.rod); colorBobber(bobber,S.rod);
  if(validPos(S.pos)){ pl.x=S.pos.x; pl.z=S.pos.z; pl.ry=S.pos.ry||0; pl.boat=!!S.pos.boat&&S.boat>0; pl.y=groundAt(pl.x,pl.z); cam.yaw=pl.ry } else spawnHome();
  genAreas(); updateRadarUI(); makeMyBoats(); setRodLook(me,S.rod); drawBoard3D();
  curSea=seaAt(pl.x); updateSeaVis(); warmWorld(pl.x,pl.z); cullIslands(); syncChests(); updateAdminUI();
  ensureBounties(locationAt(pl.x,pl.z)); refreshHUD(); renderQuests(); updateSky();
  cam.x=pl.x-Math.sin(cam.yaw)*20; cam.z=pl.z-Math.cos(cam.yaw)*20; cam.y=pl.y+10;
  lb.style.width="100%"; lt.textContent=S.stats.caught?`Willkommen zurück, ${titleFor(levelInfo(S.xp).L)}!`:"Bereit zum Ablegen";
  window.__gameStarted=true; requestAnimationFrame(frame);
  const sb=$("startBtn"); sb.style.display="block"; sb.onclick=()=>{ initAudio(); SFX.quest(); $("loading").style.display="none"; banner(locationAt(pl.x,pl.z),LOCDESC[locationAt(pl.x,pl.z)]||"");
    PERF.started=true; if(S.settings.qLocked&&S.settings.q!==undefined&&S.settings.q<2) setQuality(S.settings.q);
    if(!S.stats.caught) setTimeout(()=>toast(TOUCH?"Siehst du die dunklen Schatten im Wasser? Das sind Fische! Halte den Angel-Knopf, lass los: Er zielt automatisch auf den nächsten Schatten vor dir. Leuchtende Schatten sind seltene Fische!":"Siehst du die dunklen Schatten im Wasser? Das sind Fische! Halte die Maus über dem Wasser, lass los und triff neben den Schatten. Leuchtende Schatten sind seltene Fische!","#ffd24a"),1800) };
  initMultiplayer();
}
boot().catch(e=>{ const el=$("loaderr"); el.style.display="block"; el.textContent="Fehler: "+e.message; console.error(e) });

if(/[?&]debug\b/.test(location.search)) window.__fd={ASSETS,terrainAt,ISG,TSTAT,cullIslands,updateTiles,AREAS,eventZone,renderer,ISG,doEnchant,lqAdvance,lqCount,setCur:n=>{curNPC=n},get curSea(){return curSea},travelTo,CHESTS,NPCS,ISLBY,openChest,makeTreasureMap,updatePrompt,get nearAct(){return nearAct},interact,makeFishMesh,fishGeometry,fishIcon,F,pl,cam,get S(){return S},shadows,startCharge,releaseCast,camera,toggleBoat,keys,world,locationAt,setMouse:(x,y)=>{mx=x;my=y},get tState(){return F.state},openModal,closeModal,runCommand,GW,adminOn,spawnBiteMark,toggleHold,setHold,get peers(){return peers},scene,renderer};

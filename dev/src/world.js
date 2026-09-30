/* ============================ WORLD v2: rendering engine & world generation ============================ */
const LOW = matchMedia("(pointer:coarse)").matches || window.__Q==="low";
const U={time:{value:0}};

/* ---------- renderer ---------- */
const canvas=$("gl");
const renderer=new THREE.WebGLRenderer({canvas,antialias:!LOW,powerPreference:"high-performance"});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,LOW?1.25:1.75));
renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.05;
renderer.shadowMap.enabled=!LOW; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(58,1,0.5,30000);
scene.fog=new THREE.FogExp2(0xbfe6ff,0.00012);
let composer=null, bloom=null, gradePass=null;
const GRADE={uniforms:{tDiffuse:{value:null},uVig:{value:0.32},uSat:{value:1.1},uTint:{value:new THREE.Color(1,1,1)},uTime:{value:0}},
  vertexShader:`varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader:`uniform sampler2D tDiffuse; uniform float uVig,uSat,uTime; uniform vec3 uTint; varying vec2 vUv;
  void main(){ vec4 c=texture2D(tDiffuse,vUv); float l=dot(c.rgb,vec3(.299,.587,.114)); c.rgb=mix(vec3(l),c.rgb,uSat); c.rgb*=uTint;
    c.rgb=mix(c.rgb,c.rgb*c.rgb*(3.-2.*c.rgb),0.18); vec2 d=vUv-.5; c.rgb*=1.-dot(d,d)*uVig*1.6; gl_FragColor=c; }`};
if(!LOW){
  const rt=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:4});
  composer=new EffectComposer(renderer,rt); composer.addPass(new RenderPass(scene,camera));
  bloom=new UnrealBloomPass(new THREE.Vector2(1,1),0.42,0.55,0.86); composer.addPass(bloom); composer.addPass(new OutputPass());
  gradePass=new ShaderPass(GRADE); composer.addPass(gradePass);
}
function resizeGL(){ const w=canvas.clientWidth,h=canvas.clientHeight; renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix(); if(composer){ composer.setSize(w,h); bloom.setSize(w,h) } }
addEventListener("resize",resizeGL);


/* ---------- lights ---------- */
const hemi=new THREE.HemisphereLight(0xcfe8ff,0x5b6b3a,0.9); scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffffff,2.2); scene.add(sun); scene.add(sun.target);
sun.castShadow=!LOW; sun.shadow.mapSize.set(2048,2048); const SC=sun.shadow.camera; SC.left=-70;SC.right=70;SC.top=70;SC.bottom=-70;SC.near=1;SC.far=500; sun.shadow.bias=-0.0006; sun.shadow.normalBias=0.4;

const SEAG={1:new THREE.Group(),2:new THREE.Group()}; scene.add(SEAG[1],SEAG[2]); const HIDG={}, ISG={};
/* ---------- helpers ---------- */
const MATS={};
function stdMat(opts){ const k=JSON.stringify(opts); if(MATS[k]) return MATS[k]; const o={...opts}; if(o.color!==undefined) o.color=new THREE.Color(o.color); if(o.emissive!==undefined) o.emissive=new THREE.Color(o.emissive);
  return MATS[k]=new THREE.MeshStandardMaterial(Object.assign({roughness:.85,metalness:0},o)) }
function colorize(g,c){ g=g.index?g.toNonIndexed():g; if(g.attributes.uv) g.deleteAttribute("uv"); if(g.attributes.uv1) g.deleteAttribute("uv1"); const col=new THREE.Color(c); const n=g.attributes.position.count; const a=new Float32Array(n*3); for(let i=0;i<n;i++){a[i*3]=col.r;a[i*3+1]=col.g;a[i*3+2]=col.b} g.setAttribute("color",new THREE.BufferAttribute(a,3)); return g }
function P(g,c,x=0,y=0,z=0,rx=0,ry=0,rz=0,sx=1,sy=1,sz=1){ const m=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz)),new THREE.Vector3(sx,sy,sz)); const gg=colorize(g,c); gg.applyMatrix4(m); return gg }
const merge=parts=>{ const g=mergeGeometries(parts,false); g.computeBoundingSphere(); return g };
function windMat(base){ const m=new THREE.MeshStandardMaterial(Object.assign({vertexColors:true,flatShading:true,roughness:.9},base||{}));
  m.onBeforeCompile=sh=>{ sh.uniforms.uTime=U.time; sh.vertexShader="uniform float uTime;\n"+sh.vertexShader.replace("#include <begin_vertex>",`#include <begin_vertex>
    #ifdef USE_INSTANCING
      vec3 ip=vec3(instanceMatrix[3][0],instanceMatrix[3][1],instanceMatrix[3][2]);
    #else
      vec3 ip=vec3(0.);
    #endif
    float sw=max(position.y-1.8,0.)*0.04;
    transformed.x+=sin(uTime*1.7+ip.x*0.13+ip.z*0.07)*sw; transformed.z+=cos(uTime*1.3+ip.z*0.11)*sw*0.7;`) };
  return m }
function textSprite(text,{size=48,color="#fff",bg=null,pad=16,scale=0.05,font="Fredoka"}={}){
  const c=document.createElement("canvas"), x=c.getContext("2d"); const f=`700 ${size}px ${font}, Trebuchet MS, sans-serif`; x.font=f;
  const w=Math.ceil(x.measureText(text).width)+pad*2, h=size+pad*2; c.width=w; c.height=h; x.font=f; x.textAlign="center"; x.textBaseline="middle";
  if(bg){ x.fillStyle=bg; const r=h/2.3; x.beginPath(); x.moveTo(r,0); x.arcTo(w,0,w,h,r); x.arcTo(w,h,0,h,r); x.arcTo(0,h,0,0,r); x.arcTo(0,0,w,0,r); x.fill() }
  else { x.lineWidth=size/5; x.lineJoin="round"; x.strokeStyle="rgba(0,0,0,.7)"; x.strokeText(text,w/2,h/2+2) }
  x.fillStyle=color; x.fillText(text,w/2,h/2+2);
  const tex=new THREE.CanvasTexture(c); tex.colorSpace=THREE.SRGBColorSpace; tex.minFilter=THREE.LinearFilter;
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,fog:false,depthWrite:false})); s.scale.set(w*scale,h*scale,1); return s;
}

/* ---------- islands: terrain (v3: fBm coastlines, big islands, streamed LOD tiles) ---------- */
const PAL={
  forest:{sand:"#e6d49c",grass:"#5da843",grass2:"#4a8f36",rock:"#8a8e86",hi:"#7c8a70",gcol:"#6bbd48"},
  tropic:{sand:"#f4e2a6",grass:"#72c24b",grass2:"#58ab40",rock:"#a39b86",hi:"#6cb84a",gcol:"#86d658"},
  meadow:{sand:"#ecdba0",grass:"#80c854",grass2:"#97d25c",rock:"#9a9a8a",hi:"#79b64e",gcol:"#9fe06a"},
  desert:{sand:"#f0cd90",grass:"#e0b26c",grass2:"#d49f58",rock:"#bf7a4e",hi:"#b8683f",gcol:"#d9c07a"},
  swamp:{sand:"#7c7250",grass:"#55733a",grass2:"#475f31",rock:"#5a5946",hi:"#4f6a36",gcol:"#6a8a3e"},
  volcano:{sand:"#3c3331",grass:"#4a3c36",grass2:"#3a2f2b",rock:"#2a2120",hi:"#1e1716",gcol:"#555"},
  snow:{sand:"#d6dde2",grass:"#f2f7fb",grass2:"#e4edf4",rock:"#8a96a2",hi:"#ffffff",gcol:"#dde8ee"},
  wreck:{sand:"#d8c392",grass:"#909c58",grass2:"#7f8b4d",rock:"#787260",hi:"#8a9058",gcol:"#a6b066"},
  cliffring:{sand:"#e6d4a2",grass:"#78ae50",grass2:"#659b43",rock:"#9c8870",hi:"#8f7e66",gcol:"#8cc460"},
  ancient:{sand:"#dcc98e",grass:"#6a9d46",grass2:"#56893a",rock:"#8c8672",hi:"#768a58",gcol:"#7fb452"},
  reef:{sand:"#f8eec6",grass:"#f1e4b4",grass2:"#ecdca6",rock:"#e2d2a2",hi:"#e9dcae",gcol:"#8ad85a"},
  jungle:{sand:"#ccb87e",grass:"#3c8a38",grass2:"#32772f",rock:"#6a7657",hi:"#2f6e2c",gcol:"#4aa044"},
  crystal:{sand:"#bab2d8",grass:"#6c62a8",grass2:"#5b5294",rock:"#4b457c",hi:"#c7b8ff",gcol:"#8a7fd0"},
  brine:{sand:"#e0e8dc",grass:"#a3be9c",grass2:"#8fac88",rock:"#68776c",hi:"#f2f6f0",gcol:"#b0cfa6"},
  altar:{sand:"#b9bccc",grass:"#6b7ba2",grass2:"#5e6d96",rock:"#5a5f7c",hi:"#8e9bc2",gcol:"#8494c0"},
  fog:{sand:"#b6b5aa",grass:"#7a8770",grass2:"#697562",rock:"#6b6d66",hi:"#8a9282",gcol:"#8d9a84"},
  harbor:{sand:"#e6d5a4",grass:"#68ab47",grass2:"#5a9b3f",rock:"#979187",hi:"#78a458",gcol:"#7cc158"},
  reefcrown:{sand:"#fcf0cf",grass:"#f8e5b9",grass2:"#f1d8a6",rock:"#ead3a2",hi:"#f8e6bd",gcol:"#9be07a"},
  ash:{sand:"#2c282a",grass:"#393335",grass2:"#282329",rock:"#1b171a",hi:"#57504f",gcol:"#555"},
  spires:{sand:"#dce5eb",grass:"#eef5fa",grass2:"#e0ebf2",rock:"#9bc6e3",hi:"#ffffff",gcol:"#dde8ee"},
  ruins:{sand:"#e8dcbc",grass:"#8bb46e",grass2:"#7aa460",rock:"#c6bda1",hi:"#b8c89a",gcol:"#9cc47a"},
  witch:{sand:"#474151",grass:"#3a3848",grass2:"#312d3e",rock:"#282531",hi:"#5a4a7a",gcol:"#555"},
};
const GRASSY=new Set(["forest","tropic","meadow","swamp","wreck","cliffring","ancient","jungle","desert","altar","harbor","ruins","fog"]);
const BIOMES=Object.keys(PAL);
const PERM=(()=>{ const p=new Uint8Array(512), r=rng(1337), a=[...Array(256).keys()]; for(let i=255;i>0;i--){ const j=Math.floor(r()*(i+1)); const t=a[i]; a[i]=a[j]; a[j]=t } for(let i=0;i<512;i++) p[i]=a[i&255]; return p })();
function vnoise(x,z){ const xi=Math.floor(x), zi=Math.floor(z), xf=x-xi, zf=z-zi, X=xi&255, Z=zi&255;
  const a=PERM[PERM[X]+Z], b=PERM[PERM[X+1]+Z], c=PERM[PERM[X]+Z+1], d=PERM[PERM[X+1]+Z+1]; const u=xf*xf*(3-2*xf), v=zf*zf*(3-2*zf);
  return ((a+(b-a)*u)*(1-v)+(c+(d-c)*u)*v)/127.5-1 }
function fbm(x,z,oct=4){ let s=0,a=0.5,f=1,n=0; for(let i=0;i<oct;i++){ s+=vnoise(x*f+i*17.3,z*f-i*9.1)*a; n+=a; a*=0.5; f*=2.03 } return s/n }
function ridged(x,z,oct=3){ let s=0,a=0.5,f=1,n=0; for(let i=0;i<oct;i++){ s+=(1-Math.abs(vnoise(x*f+i*31.7,z*f+i*7.7)))*a; n+=a; a*=0.5; f*=2.1 } return s/n }
function noise2(x,z,s){ return vnoise(x*0.05+s*0.37,z*0.05-s*0.11)*0.7+vnoise(x*0.13+s,z*0.13)*0.3 }
const SEAFLOOR=-38;
const ISL=ISLE.map(i=>{ const I={...i,seed:hashStr(i.n)%1000,pal:PAL[i.biome],excl:[],pads:[]};
  const cx=i.sea===2?SEA2X:0; I.hutAng = (i.n==="Moosewood"||i.n==="Ankerheim")?Math.PI*0.5 : Math.atan2(-i.z,-(i.x-cx));
  if(i.fresh){ const a=I.hutAng+Math.PI+0.6; I.pond={x:i.x+Math.cos(a)*i.r*0.36,z:i.z+Math.sin(a)*i.r*0.36,r:Math.min(46,i.r*0.1)} }
  if(i.reef) I.reefAng=I.hutAng+Math.PI*0.7;
  if(i.biome==="cliffring") I.chanAng=I.hutAng+Math.PI;
  I.ext=I.r*1.9; return I });
const ISLBY=Object.fromEntries(ISL.map(i=>[i.n,i]));
const angDiff=(a,b)=>{ let d=a-b; return Math.atan2(Math.sin(d),Math.cos(d)) };
/* flat building pads: registered before the terrain is meshed, blend the ground to a fixed height */
function addPad(I,x,z,r,h){ if(h===undefined) h=rawH(I,x,z); h=Math.max(h,1.6); I.pads.push({x,z,r,h}); return h }
function rawH(I,x,z){
  const dx=x-I.x, dz=z-I.z, dist=Math.sqrt(dx*dx+dz*dz); if(dist>I.ext) return -99;
  const s=I.seed, B=I.biome;
  const coast=fbm(x*0.0022+s,z*0.0022-s,4), coast2=vnoise(x*0.011+s*3,z*0.011);
  const wob=1+0.2*coast+0.035*coast2;
  const d=dist/I.r/wob;
  const det=fbm(x*0.03+s,z*0.03,3), det2=fbm(x*0.11-s,z*0.11+s,2);
  const under=SEAFLOOR+(SEAFLOOR*-1-4)*smooth(clamp((1.55-d)/0.55,0,1)); // underwater shelf
  if(B==="reef"||B==="reefcrown"){ const ring=smooth(clamp(1-Math.abs(d-0.64)/0.2,0,1)); let h=-3.6+5.4*ring+det*0.7*ring; if(d<0.5) h=Math.min(h,-1.6+det*0.5);
    if(B==="reefcrown"&&d<0.14) h=Math.max(h,1.4+det*0.4); if(d>0.9) h=Math.min(h,lerp(-3.2,under,smooth(clamp((d-0.9)/0.45,0,1)))); return h }
  if(d>1) return Math.min(-3.6,lerp(-3.6,under,smooth(clamp((d-1)/0.4,0,1))));
  const shore=smooth(clamp((1-d)/0.14,0,1)); let h=-3.6+5.5*shore;
  const inner=smooth(clamp((0.8-d)/0.8,0,1)), P=I.peak;
  const hills=fbm(x*0.006+s*2,z*0.006,4);
  if(B==="cliffring"){
    const band=smooth(clamp((0.2-Math.abs(d-0.58))/0.1,0,1)); const chan=Math.abs(angDiff(Math.atan2(dz,dx),I.chanAng))<0.07+0.02*coast2;
    h=-3.6+5.5*smooth(clamp((1-d)/0.1,0,1)); if(!chan) h+=P*band*(0.8+0.25*ridged(x*0.012,z*0.012))+det*3*band;
    if(d<0.4) h=Math.min(h,lerp(-3.4,h,smooth(clamp((d-0.33)/0.07,0,1))));
    if(chan&&d<1.02) h=Math.min(h,-3.2);
    if(d<0.1) h=Math.max(h,1.6-d*6+det*0.3);
    return h }
  if(B==="volcano"||B==="ash"){ h+=P*Math.pow(inner,1.5)*(0.86+0.14*hills)+ridged(x*0.02,z*0.02)*P*0.08*inner; const cr=0.13; if(d<cr) h-=(cr-d)/cr*P*0.35; if(B==="ash") h+=Math.max(0,det)*5*shore+Math.max(0,det2)*1.5 }
  else if(B==="snow"){ h+=P*Math.pow(inner,1.35)*(0.85+0.2*hills)+ridged(x*0.015,z*0.015)*P*0.14*inner*inner; if(d<0.06) h=Math.max(h,P*0.95) }
  else if(B==="spires"){ h+=P*0.25*inner*(0.8+0.3*hills); const sp=ridged(x*0.012+s,z*0.012,3); h+=Math.pow(Math.max(0,sp-0.55)/0.45,3)*P*1.4*inner }
  else if(B==="ruins"||B==="harbor"){ h+=P*inner*(0.62+0.3*hills) }
  else if(B==="swamp"){ h+=P*inner*(0.5+0.5*hills)-Math.max(0,det2-0.3)*3*inner }
  else if(B==="jungle"||B==="ancient"){ h+=P*Math.pow(inner,1.1)*(0.7+0.45*hills)+ridged(x*0.01,z*0.01)*P*0.25*inner }
  else if(B==="desert"){ h+=P*inner*(0.55+0.45*hills)+Math.pow(Math.max(0,ridged(x*0.009,z*0.009)-0.6),2)*P*2.2*inner }
  else if(B==="crystal"){ h+=P*Math.pow(inner,0.9)*(0.6+0.5*ridged(x*0.014,z*0.014)) }
  else h+=P*inner*(0.72+0.38*hills);
  if(!["volcano","ash","spires","witch"].includes(B)) h+=det*1.6*shore+det2*0.35*shore;
  return h;
}
function islandH(I,x,z){
  let h=rawH(I,x,z); if(h<-98) return h;
  if(I.pond){ const p=I.pond; if(p.y===undefined) p.y=Math.max(1.4,rawH(I,p.x,p.z)-0.6);
    const dp=Math.hypot(x-p.x,z-p.z)/p.r; if(dp<1.6){ const bottom=p.y-3.2*(1-Math.min(1,dp)); const e=smooth(clamp((1.6-dp)/0.6,0,1)); h=lerp(h,Math.min(h,bottom),e) } }
  for(const q of I.pads){ const dd=Math.hypot(x-q.x,z-q.z); if(dd<q.r*1.8){ const e=smooth(clamp((q.r*1.8-dd)/(q.r*0.8),0,1)); h=lerp(h,q.h,e) } }
  return h;
}
function nearIsl(x,z){ const out=[]; for(const I of ISL){ if(Math.abs(x-I.x)<I.ext&&Math.abs(z-I.z)<I.ext) out.push(I) } return out }
function terrainAt(x,z){ let h=SEAFLOOR; for(const I of nearIsl(x,z)) h=Math.max(h,islandH(I,x,z)); return h }
function islandAt(x,z){ let best=null,bd=1e9; for(const I of nearIsl(x,z)){ const d=Math.hypot(x-I.x,z-I.z)/I.r; if(d<bd){ bd=d; best=I } } return best }
const PLATFORMS=[];
function platformAt(x,z){ let y=-99; for(const p of PLATFORMS){ const dx=x-p.x, dz=z-p.z; if(Math.abs(dx)>p.bound||Math.abs(dz)>p.bound) continue;
  if(p.circle){ if(dx*dx+dz*dz<p.r*p.r) y=Math.max(y,p.y); continue } const lx=dx*Math.cos(p.a)+dz*Math.sin(p.a), lz=-dx*Math.sin(p.a)+dz*Math.cos(p.a); if(Math.abs(lx)<p.len/2&&Math.abs(lz)<p.w/2) y=Math.max(y,p.y) } return y }
function groundAt(x,z){ return Math.max(terrainAt(x,z),platformAt(x,z)) }
function pondAt(x,z){ for(const I of nearIsl(x,z)){ const p=I.pond; if(p&&Math.hypot(x-p.x,z-p.z)<p.r*0.95) return p } return null }
function waterAt(x,z){ if(platformAt(x,z)>-50) return null; const p=pondAt(x,z); const t=terrainAt(x,z); if(p&&t<p.y-0.25) return {kind:"fresh",y:p.y}; if(t<-0.35) return {kind:"sea",y:0}; return null }
const seaAt=(x)=>x>SEA2X/2?2:1;
function locationAt(x,z){
  let best=null,bd=1e9; for(const I of ISL){ const d=Math.hypot(x-I.x,z-I.z); if(d<I.r*1.35+160&&d/I.r<bd){ bd=d/I.r; best=I.n } } if(best) return best;
  for(const Z of DEEPZ){ if(Math.hypot(x-Z.x,z-Z.z)<Z.r) return Z.n } return seaAt(x)===2?"Sturmsee":"Ocean" }
function spotAt(loc,x,z,kind){
  if(kind==="fresh") return "Freshwater";
  if(loc==="Sturmsee") return "Open Sea";
  if(loc==="Ocean"){ let md=1e9; for(const I of ISL) md=Math.min(md,Math.hypot(x-I.x,z-I.z)-I.r); return md>1100?"Deep Ocean":"Open Sea" }
  const I=ISLBY[loc]; if(I&&I.reefAng!==undefined){ let a=Math.atan2(z-I.z,x-I.x)-I.reefAng; a=Math.atan2(Math.sin(a),Math.cos(a)); if(Math.abs(a)<0.75) return "Coral Reef" }
  return "Saltwater";
}

/* ---------- terrain tiles: every tile has a coarse mesh (always) and a fine mesh near the player ---------- */
const TILE=256, TSEG=[64,16], TILES=new Map();
const DETAILTEX=(()=>{ const n=256, c=document.createElement("canvas"); c.width=c.height=n; const x=c.getContext("2d"); const img=x.createImageData(n,n);
  const r=rng(77); const base=new Float32Array(n*n); for(let o=0;o<5;o++){ const f=4<<o, amp=1/(o+1); const g=[]; for(let i=0;i<=f;i++){ g[i]=[]; for(let j=0;j<=f;j++) g[i][j]=r() } for(let i=0;i<f;i++) for(let j=0;j<f;j++){ g[i][f]=g[i][0]; g[f][j]=g[0][j] } g[f][f]=g[0][0];
    for(let y=0;y<n;y++) for(let xx=0;xx<n;xx++){ const fx=xx/n*f, fy=y/n*f, ix=Math.floor(fx), iy=Math.floor(fy), u=smooth(fx-ix), v=smooth(fy-iy); base[y*n+xx]+=amp*((g[ix][iy]*(1-u)+g[ix+1][iy]*u)*(1-v)+(g[ix][iy+1]*(1-u)+g[ix+1][iy+1]*u)*v) } }
  let mn=1e9,mx=-1e9; for(const v of base){ mn=Math.min(mn,v); mx=Math.max(mx,v) }
  for(let i=0;i<n*n;i++){ const v=(base[i]-mn)/(mx-mn); const sp=r()<0.08?r()*0.25:0; const k=Math.round(clamp(v*0.8+0.1+sp-0.06,0,1)*255); img.data[i*4]=k; img.data[i*4+1]=Math.round(clamp(r(),0,1)*255); img.data[i*4+2]=k; img.data[i*4+3]=255 }
  x.putImageData(img,0,0); const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.colorSpace=THREE.NoColorSpace; t.anisotropy=4; return t })();
const terrainMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.93,metalness:0});
terrainMat.onBeforeCompile=sh=>{ sh.uniforms.uDet={value:DETAILTEX};
  sh.vertexShader=sh.vertexShader.replace("#include <common>","#include <common>\nvarying vec3 vWP; varying vec3 vWN;").replace("#include <worldpos_vertex>","#include <worldpos_vertex>\nvWP=(modelMatrix*vec4(transformed,1.)).xyz; vWN=normalize(mat3(modelMatrix)*objectNormal);");
  sh.fragmentShader=sh.fragmentShader.replace("#include <common>","#include <common>\nuniform sampler2D uDet; varying vec3 vWP; varying vec3 vWN;").replace("#include <color_fragment>",`#include <color_fragment>
    { float a=texture2D(uDet,vWP.xz*0.043).r, b=texture2D(uDet,vWP.xz*0.0071).r, c2=texture2D(uDet,vWP.xz*0.19).r;
      vec3 n=abs(vWN); float rk=texture2D(uDet,vWP.zy*0.05).r*n.x+texture2D(uDet,vWP.xy*0.05).r*n.z+a*n.y;
      float slope=1.-clamp(vWN.y,0.,1.);
      float det=mix(a*0.6+c2*0.4,rk,smoothstep(0.18,0.45,slope));
      diffuseColor.rgb*=0.74+0.46*det; diffuseColor.rgb*=0.9+0.2*b;
      float wet=smoothstep(0.9,-0.4,vWP.y); diffuseColor.rgb*=1.-wet*0.28; }`) };
function tileColor(x,z,h,ny,c){ const I=islandAt(x,z); const pal=I?I.pal:PAL.forest, B=I?I.biome:"forest"; const cs=I?(I._cs||(I._cs={sand:new THREE.Color(pal.sand),grass:new THREE.Color(pal.grass),grass2:new THREE.Color(pal.grass2),rock:new THREE.Color(pal.rock),hi:new THREE.Color(pal.hi),wet:new THREE.Color(pal.sand).multiplyScalar(0.58)})):null;
  if(!cs){ c.set("#c9b88a"); return 0 } const nz=fbm(x*0.012,z*0.012,2), peak=I.peak;
  let gm=0;
  if(h<-0.3) c.copy(cs.wet).lerp(cs.sand,clamp((h+5)/5,0,1)*0.6); else if(h<1.9+nz*0.8) c.copy(cs.sand); else { c.copy(cs.grass).lerp(cs.grass2,clamp(nz*0.9+0.5,0,1)); gm=1; if(h>peak*0.62){ const k=clamp((h-peak*0.62)/(peak*0.25),0,1); c.lerp(cs.hi,k); if(k>0.6) gm=0 } }
  if(ny<0.8&&h>0.4){ const k=clamp((0.8-ny)*3.5,0,1); c.lerp(cs.rock,k); if(k>0.4) gm=0 }
  if(B==="spires"&&h>peak*0.4) c.lerp(cs.hi,0.5);
  if(B==="snow"&&h>peak*0.55) c.lerp(new THREE.Color("#ffffff"),clamp((h-peak*0.55)/(peak*0.2),0,1)*(ny>0.7?1:0.4));
  if((B==="volcano"||B==="ash")&&h>peak*0.45) c.lerp(new THREE.Color("#1a1210"),0.5);
  if(B==="ash"&&h>1.8&&noise2(x*1.2,z*1.2,I.seed+9)>0.55) c.lerp(new THREE.Color("#ff6a1a"),0.8);
  if(B==="ruins"&&h>1.9&&Math.abs(Math.sin(x*0.09)*Math.sin(z*0.09))<0.05) c.lerp(new THREE.Color("#d8cfb6"),0.55);
  for(const q of I.pads){ const dd=Math.hypot(x-q.x,z-q.z); if(dd<q.r*1.1){ gm=0; if(q.path) c.lerp(new THREE.Color(q.path),smooth(clamp((q.r*1.1-dd)/(q.r*0.4),0,1))*0.8) } }
  if(!GRASSY.has(B)) gm=0; if(excluded(I,x,z,0.5)) gm=0; if(I.pond&&Math.hypot(x-I.pond.x,z-I.pond.z)<I.pond.r+3) gm=0;
  c.offsetHSL(0,0,nz*0.03); return gm }
function buildTileGeo(ti,tj,seg){
  const x0=ti*TILE, z0=tj*TILE, st=TILE/seg, n=seg+1, N=n+2; const H=new Float32Array(N*N);
  let maxH=-1e9; for(let j=0;j<N;j++) for(let i=0;i<N;i++){ const h=terrainAt(x0+(i-1)*st,z0+(j-1)*st); H[j*N+i]=h; if(i>0&&j>0&&i<N-1&&j<N-1) maxH=Math.max(maxH,h) }
  if(maxH<SEAFLOOR+1) return null;
  const vc=n*n+4*n, pos=new Float32Array(vc*3), nor=new Float32Array(vc*3), col=new Float32Array(vc*3), gms=new Float32Array(vc); const c=new THREE.Color(), nv=new THREE.Vector3();
  for(let j=0;j<n;j++) for(let i=0;i<n;i++){ const k=j*n+i, h=H[(j+1)*N+i+1]; const x=x0+i*st, z=z0+j*st;
    nv.set(H[(j+1)*N+i]-H[(j+1)*N+i+2],2*st,H[j*N+i+1]-H[(j+2)*N+i+1]).normalize(); pos[k*3]=x; pos[k*3+1]=h; pos[k*3+2]=z; nor[k*3]=nv.x; nor[k*3+1]=nv.y; nor[k*3+2]=nv.z;
    gms[k]=tileColor(x,z,h,nv.y,c); col[k*3]=c.r; col[k*3+1]=c.g; col[k*3+2]=c.b }
  const idx=[]; for(let j=0;j<seg;j++) for(let i=0;i<seg;i++){ const a=j*n+i, b=a+1, d=a+n, e=d+1; idx.push(a,d,b,b,d,e) }
  // skirts hide cracks between detail levels
  const edges=[[...Array(n).keys()].map(i=>i),[...Array(n).keys()].map(i=>(n-1)*n+i),[...Array(n).keys()].map(j=>j*n),[...Array(n).keys()].map(j=>j*n+n-1)]; let v=n*n;
  for(const e of edges){ const s0=v; for(const k of e){ pos[v*3]=pos[k*3]; pos[v*3+1]=pos[k*3+1]-Math.max(6,st*0.6); pos[v*3+2]=pos[k*3+2]; for(let q=0;q<3;q++){ nor[v*3+q]=nor[k*3+q]; col[v*3+q]=col[k*3+q] } v++ }
    for(let q=0;q<n-1;q++){ const a=e[q], b=e[q+1], a2=s0+q, b2=s0+q+1; idx.push(a,a2,b,b,a2,b2, a,b,a2,b,b2,a2) } }
  const g=new THREE.BufferGeometry(); g.setAttribute("position",new THREE.BufferAttribute(pos,3)); g.setAttribute("normal",new THREE.BufferAttribute(nor,3)); g.setAttribute("color",new THREE.BufferAttribute(col,3)); g.setAttribute("gmask",new THREE.BufferAttribute(gms,1));
  g.setIndex(idx); g.computeBoundingSphere(); return g }
function tileSea(ti){ return seaAt((ti+0.5)*TILE) }
function prepareTiles(){ // coarse level for every tile touched by an island
  const want=new Set(); for(const I of ISL){ const e=I.ext; for(let tj=Math.floor((I.z-e)/TILE);tj<=Math.floor((I.z+e)/TILE);tj++) for(let ti=Math.floor((I.x-e)/TILE);ti<=Math.floor((I.x+e)/TILE);ti++) want.add(ti+","+tj) }
  return [...want] }
const ISLFAR={}; function buildCoarseTile(key){ const [ti,tj]=key.split(",").map(Number); const g=buildTileGeo(ti,tj,TSEG[1]); if(!g) return; { const I0=islandAt((ti+0.5)*TILE,(tj+0.5)*TILE); const k=I0?I0.n:"~"; const gf=buildTileGeo(ti,tj,8); if(gf){ gf.deleteAttribute("gmask"); gf.setAttribute("gmask",new THREE.BufferAttribute(new Float32Array(gf.attributes.position.count),1)); (ISLFAR[k]||(ISLFAR[k]={geos:[],I:I0})).geos.push(gf) } }
  const m=new THREE.Mesh(g,terrainMat); m.receiveShadow=true; m.layers.enable(1); const I=islandAt((ti+0.5)*TILE,(tj+0.5)*TILE); (I&&I.hidden&&HIDG[I.n]?HIDG[I.n]:SEAG[tileSea(ti)]).add(m); TILES.set(key,{ti,tj,cx:(ti+0.5)*TILE,cz:(tj+0.5)*TILE,coarse:m,fine:null,building:false,I:islandAt((ti+0.5)*TILE,(tj+0.5)*TILE)}); m.visible=false }
function finishCoarse(){ for(const [k,F] of Object.entries(ISLFAR)){ const g=mergeGeometries(F.geos,false); g.computeBoundingSphere(); const m=new THREE.Mesh(g,terrainMat); m.receiveShadow=true; m.layers.enable(1);
    const I=F.I; (I&&I.hidden&&HIDG[I.n]?HIDG[I.n]:SEAG[I?I.sea:1]).add(m); F.mesh=m; F.near=false; F.geos=null } }
/* per island: far = one merged mesh; near = streamed tiles (coarse or fine) */
function lodIslands(px,pz){ for(const F of Object.values(ISLFAR)){ const I=F.I; if(!F.mesh) continue; const near=!!I&&Math.hypot(I.x-px,I.z-pz)-I.ext<FINE_R+350; F.near=near; F.mesh.visible=!near }
  for(const T of TILES.values()){ const F=ISLFAR[T.I?T.I.n:"~"]; const near=F&&F.near; T.coarse.visible=near&&!T.fine; if(T.fine) T.fine.visible=near }
  for(const C of LODCELLS){ const d=Math.hypot(C.x-px,C.z-pz); if(C.small){ C.hi.visible=d<420; continue } const hi=d<(LOW?380:560); C.hi.visible=hi; if(C.lo) C.lo.visible=!hi } }
let tileQ=[], FINE_R=LOW?520:760;
function updateTiles(px,pz){ tileQ.length=0;
  for(const T of TILES.values()){ const d=Math.hypot(T.cx-px,T.cz-pz);
    if(d<FINE_R){ if(!T.fine&&!T.nofine) tileQ.push([d,T]) } else if(T.fine&&d>FINE_R+300){ T.fine.parent.remove(T.fine); T.fine.geometry.dispose(); T.fine=null; T.coarse.visible=!!(ISLFAR[T.I?T.I.n:"~"]||{}).near } }
  tileQ.sort((a,b)=>a[0]-b[0]); const T=tileQ[0]&&tileQ[0][1]; if(T) makeFine(T); return tileQ.length }
const TSTAT={n:0,ms:0,max:0};
function makeFine(T){ const t0=performance.now(); const g=buildTileGeo(T.ti,T.tj,TSEG[0]); const dtm=performance.now()-t0; TSTAT.n++; TSTAT.ms+=dtm; TSTAT.max=Math.max(TSTAT.max,dtm); if(!g){ T.nofine=true; return } const m=new THREE.Mesh(g,terrainMat); m.receiveShadow=true; m.layers.enable(1); T.coarse.parent.add(m); T.fine=m; T.coarse.visible=false; hmapDirty=true }
function fineTilesAround(px,pz,r){ for(const T of TILES.values()) if(!T.fine&&!T.nofine&&Math.hypot(T.cx-px,T.cz-pz)<r) makeFine(T) }


/* ---------- colliders (spatial hash) ---------- */
const COLL=new Map(); const CELL=16;
function addCollider(x,z,r){ const k=Math.floor(x/CELL)+","+Math.floor(z/CELL); let a=COLL.get(k); if(!a) COLL.set(k,a=[]); a.push({x,z,r}) }
function collide(x,z,rad){ const cx=Math.floor(x/CELL), cz=Math.floor(z/CELL); for(let i=-1;i<=1;i++) for(let j=-1;j<=1;j++){ const a=COLL.get((cx+i)+","+(cz+j)); if(!a) continue;
  for(const c of a){ const dx=x-c.x, dz=z-c.z, d=Math.hypot(dx,dz), m=c.r+rad; if(d<m&&d>0.0001){ x=c.x+dx/d*m; z=c.z+dz/d*m } } } return {x,z} }

/* ---------- sky ---------- */
const skyU={uTop:{value:new THREE.Color()},uHorizon:{value:new THREE.Color()},uBottom:{value:new THREE.Color()},uSunDir:{value:new THREE.Vector3(0,1,0)},uMoonDir:{value:new THREE.Vector3(0,-1,0)},
  uSunCol:{value:new THREE.Color(1,.95,.8)},uNight:{value:0},uTime:U.time,uAurora:{value:0},uTint:{value:new THREE.Color(0,0,0)},uMoonCol:{value:new THREE.Color(0.92,0.95,1)},uMoonSize:{value:0}};
const sky=new THREE.Mesh(new THREE.SphereGeometry(20000,40,20),new THREE.ShaderMaterial({uniforms:skyU,side:THREE.BackSide,depthWrite:false,fog:false,
  vertexShader:`varying vec3 vDir; void main(){ vDir=position; vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position=p.xyww; }`,
  fragmentShader:`uniform vec3 uTop,uHorizon,uBottom,uSunDir,uMoonDir,uSunCol,uTint,uMoonCol; uniform float uNight,uTime,uAurora,uMoonSize; varying vec3 vDir;
  float hsh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float nse(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hsh(i),hsh(i+vec2(1,0)),f.x),mix(hsh(i+vec2(0,1)),hsh(i+vec2(1,1)),f.x),f.y);}
  void main(){ vec3 d=normalize(vDir); float y=d.y; vec3 col= y>0.? mix(uHorizon,uTop,pow(clamp(y,0.,1.),0.5)) : mix(uHorizon,uBottom,clamp(-y*5.,0.,1.));
    col+=uTint*smoothstep(-0.05,0.4,y);
    float sd=max(dot(d,uSunDir),0.); col+=uSunCol*(smoothstep(0.9985,0.9992,sd)*8.+pow(sd,14.)*0.45+pow(sd,3.)*0.08)*(1.-uNight*0.9);
    float md=max(dot(d,uMoonDir),0.); float ms=0.9990-uMoonSize*0.004; col+=uMoonCol*smoothstep(ms,ms+0.0004+uMoonSize*0.0008,md)*uNight*2.2+mix(vec3(.25,.35,.6),uMoonCol*0.9,uMoonSize)*pow(md,30.-uMoonSize*22.)*uNight*(.35+uMoonSize*0.6);
    vec3 sp=d*260.; vec3 cell=floor(sp); float h=fract(sin(dot(cell,vec3(12.9898,78.233,45.164)))*43758.5453);
    vec3 f=fract(sp)-.5; float st=step(0.9975,h)*smoothstep(0.35,0.05,length(f))*smoothstep(0.,0.25,y)*uNight*(0.6+0.4*sin(uTime*2.+h*90.));
    col+=vec3(st)*1.4;
    if(uAurora>0.01){ vec2 ap=d.xz/(y+0.25); float n=nse(ap*1.6+vec2(uTime*0.05,0.))*0.6+nse(ap*3.7-vec2(0.,uTime*0.08))*0.4;
      float band=abs(sin(ap.x*1.3+n*3.+uTime*0.12)); float curtain=pow(1.-band,6.)*smoothstep(0.08,0.35,y)*smoothstep(0.95,0.45,y);
      float ray=0.6+0.4*sin(ap.x*25.+uTime*0.7+n*8.);
      col+=(vec3(0.15,1.,0.55)*curtain*ray+vec3(0.55,0.2,1.)*pow(1.-band,12.)*smoothstep(0.3,0.7,y)*0.6)*uAurora*1.4; }
    gl_FragColor=vec4(col,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`}));
sky.frustumCulled=false; sky.renderOrder=-10; scene.add(sky);


/* ---------- clouds ---------- */
const clouds=[];
{ const variants=[]; const r=rng(99);
  for(let v=0;v<4;v++){ const parts=[]; const n=5+v*2; for(let k=0;k<n;k++){ const s=10+r()*16; const g=P(new THREE.IcosahedronGeometry(1,2),"#ffffff",(k-n/2)*12+r()*6,r()*7,(r()-.5)*16,0,0,0,s*1.3,s*0.75,s);
      const p=g.attributes.position, c=g.attributes.color; for(let i=0;i<p.count;i++){ const yy=p.getY(i); const sh=clamp(0.62+yy/(s*1.6),0.62,1); c.setXYZ(i,sh,sh,Math.min(1,sh*1.04)) } parts.push(g) } variants.push(merge(parts)) }
  const cm=new THREE.MeshStandardMaterial({vertexColors:true,flatShading:false,roughness:1,emissive:new THREE.Color("#9fb3d4"),emissiveIntensity:0.3,transparent:true,opacity:0.95,fog:false});
  const per=LOW?9:18; variants.forEach((g,vi)=>{ const im=new THREE.InstancedMesh(g,cm,per); im.frustumCulled=false; scene.add(im);
    for(let i=0;i<per;i++) clouds.push({im,i,x:(r()-.5)*12000,z:(r()-.5)*12000,y:620+r()*380,s:2.2+r()*2.2,sp:5+r()*6}) });
}
const cloudMat=clouds[0].im.material; const _m4=new THREE.Matrix4(), _q=new THREE.Quaternion(), _v=new THREE.Vector3(), _s=new THREE.Vector3();
function updateClouds(dt,wind,cx,cz){ for(const c of clouds){ c.x+=c.sp*dt*wind; const wx=cx+((((c.x-cx)%12000)+18000)%12000)-6000, wz=cz+((((c.z-cz)%12000)+18000)%12000)-6000; _m4.compose(_v.set(wx,c.y,wz),_q,_s.set(c.s,c.s,c.s)); c.im.setMatrixAt(c.i,_m4) } clouds.forEach(c=>c.im.instanceMatrix.needsUpdate=true) }


/* ---------- height map around the player (GPU): drives water depth, shore foam and grass ---------- */
const HM={size:LOW?512:1024,ext:1024,cx:1e9,cz:1e9};
const hmRT=new THREE.WebGLRenderTarget(HM.size,HM.size,{type:THREE.HalfFloatType,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter});
const hcRT=new THREE.WebGLRenderTarget(LOW?256:512,LOW?256:512,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter});
const hmCam=new THREE.OrthographicCamera(-512,512,512,-512,1,4000); hmCam.up.set(0,0,-1); hmCam.layers.set(1);
const hmMat=new THREE.ShaderMaterial({vertexShader:`attribute float gmask; varying float vH; varying float vG; void main(){ vec4 w=modelMatrix*vec4(position,1.); vH=w.y; vG=gmask; gl_Position=projectionMatrix*viewMatrix*w; }`,
  fragmentShader:`varying float vH; varying float vG; void main(){ gl_FragColor=vec4(vH,vG,0.,1.); }`});
const hcMat=new THREE.MeshBasicMaterial({vertexColors:true});
const hmBG=(()=>{ const g=new THREE.PlaneGeometry(60000,60000); g.rotateX(-Math.PI/2); g.setAttribute("gmask",new THREE.BufferAttribute(new Float32Array(g.attributes.position.count),1)); g.setAttribute("color",new THREE.BufferAttribute(new Float32Array(g.attributes.position.count*3).fill(0.3),3));
  const m=new THREE.Mesh(g,hmMat); m.position.y=SEAFLOOR; m.layers.set(1); m.frustumCulled=false; scene.add(m); return m })();
let hmapDirty=true;
function renderHM(rt,mat,cx,cz,ext){ hmCam.left=-ext/2; hmCam.right=ext/2; hmCam.top=ext/2; hmCam.bottom=-ext/2; hmCam.updateProjectionMatrix(); hmCam.position.set(cx,2000,cz); hmCam.lookAt(cx,0,cz); hmCam.updateMatrixWorld();
  hmBG.position.x=cx; hmBG.position.z=cz; const ov=scene.overrideMaterial, bg=scene.background, fog=scene.fog; scene.overrideMaterial=mat; scene.background=null; scene.fog=null;
  const prevRT=renderer.getRenderTarget(), sh=renderer.shadowMap.autoUpdate; renderer.shadowMap.autoUpdate=false; renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene,hmCam); renderer.setRenderTarget(prevRT); renderer.shadowMap.autoUpdate=sh;
  scene.overrideMaterial=ov; scene.background=bg; scene.fog=fog }
function updateHMap(px,pz,force){ const snap=64; const cx=Math.round(px/snap)*snap, cz=Math.round(pz/snap)*snap;
  if(!force&&!hmapDirty&&Math.abs(cx-HM.cx)<192&&Math.abs(cz-HM.cz)<192) return; HM.cx=cx; HM.cz=cz; hmapDirty=false;
  renderHM(hmRT,hmMat,cx,cz,HM.ext); renderHM(hcRT,hcMat,cx,cz,HM.ext); waterU.uHMp.value.set(cx,cz,HM.ext); if(GRASSM) GRASSM.material.uniforms.uHMp.value.set(cx,cz,HM.ext) }
const G1={rt:new THREE.WebGLRenderTarget(LOW?1024:2048,LOW?1024:2048,{type:THREE.HalfFloatType,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter}),cx:0,cz:0,ext:(SEA1_R+600)*2};
const G2={rt:new THREE.WebGLRenderTarget(LOW?512:1024,LOW?512:1024,{type:THREE.HalfFloatType,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter}),cx:SEA2X,cz:0,ext:(SEA2_R+600)*2};
function bakeDepth(){ const v1=SEAG[1].visible, v2=SEAG[2].visible; const hv={}; for(const k in HIDG){ hv[k]=HIDG[k].visible; HIDG[k].visible=false }
  SEAG[1].visible=true; SEAG[2].visible=false; renderHM(G1.rt,hmMat,G1.cx,G1.cz,G1.ext); SEAG[1].visible=false; SEAG[2].visible=true; renderHM(G2.rt,hmMat,G2.cx,G2.cz,G2.ext);
  SEAG[1].visible=v1; SEAG[2].visible=v2; for(const k in HIDG) HIDG[k].visible=hv[k] }

/* ---------- water ---------- */
const ZONEID={"Desolate Deep":1,"Vertigo":2,"The Depths":3,"Abgrund der Stille":4};
const waterU=THREE.UniformsUtils.merge([THREE.UniformsLib.fog,{uTime:{value:0},uHM:{value:null},uG1:{value:null},uG2:{value:null},uHMp:{value:new THREE.Vector3(0,0,1024)},uG1p:{value:new THREE.Vector3(G1.cx,G1.cz,G1.ext)},uG2p:{value:new THREE.Vector3(G2.cx,G2.cz,G2.ext)},
  uDeep:{value:new THREE.Color("#0b4f8a")},uShallow:{value:new THREE.Color("#1cb8c8")},uFoam:{value:new THREE.Color("#ffffff")},uSky:{value:new THREE.Color("#bfe6ff")},uSunDir:{value:new THREE.Vector3(0,1,0)},uSunCol:{value:new THREE.Color("#fff3d0")},
  uNight:{value:0},uRough:{value:0},uAurora:{value:0},uDet:{value:null},uZ:{value:[0,1,2,3].map(()=>new THREE.Vector4(0,0,0,0))},uL:{value:[0,1,2].map(()=>new THREE.Vector4(0,0,0,0))},
  uRadar:{value:0},uA:{value:[...Array(16)].map(()=>new THREE.Vector4(0,0,0,0))},uAC:{value:[...Array(16)].map(()=>new THREE.Color())},uHunt:{value:new THREE.Vector4(0,0,0,0)}}]);
waterU.uHM.value=hmRT.texture; waterU.uG1.value=G1.rt.texture; waterU.uG2.value=G2.rt.texture; waterU.uDet.value=DETAILTEX;
const WAVES=`
  #define WV(dx,dz,fr,am,sp) { vec2 dir=normalize(vec2(dx,dz)); float ph=dot(dir,p)*fr+uTime*sp; h+=sin(ph)*am; d+=dir*cos(ph)*am*fr; }
  void waves(vec2 p, out float h, out vec2 d){ h=0.; d=vec2(0.); float R=1.+uRough;
    WV(1.,0.3,0.042,0.42*R,0.95) WV(-0.4,1.,0.071,0.26*R,1.25) WV(0.7,-0.8,0.16,0.08*R,2.1) WV(-1.,-0.2,0.021,0.34*R,0.62) WV(0.2,0.9,0.31,0.035,3.1) WV(0.93,0.37,0.011,0.3*R,0.45) }`;
const waterMat=new THREE.ShaderMaterial({uniforms:waterU,transparent:true,fog:true,depthWrite:false,
  vertexShader:`precision highp float; uniform float uTime; uniform float uRough; varying vec3 vWorld; varying vec3 vN; varying float vWave;
  #include <fog_pars_vertex>
  ${WAVES}
  void main(){ vec4 wp=modelMatrix*vec4(position,1.); float h; vec2 d; waves(wp.xz,h,d); wp.y+=h; vWave=h; vN=normalize(vec3(-d.x,1.,-d.y)); vWorld=wp.xyz;
    vec4 mvPosition=viewMatrix*wp; gl_Position=projectionMatrix*mvPosition;
    #include <fog_vertex>
  }`,
  fragmentShader:`precision highp float; uniform float uTime,uNight,uAurora,uRough,uRadar; uniform sampler2D uHM,uG1,uG2,uDet; uniform vec3 uHMp,uG1p,uG2p; uniform vec3 uDeep,uShallow,uFoam,uSky,uSunDir,uSunCol; uniform vec4 uZ[4]; uniform vec4 uL[3]; uniform vec4 uA[16]; uniform vec3 uAC[16]; uniform vec4 uHunt;
  varying vec3 vWorld; varying vec3 vN; varying float vWave;
  #include <fog_pars_fragment>
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
  float terrH(vec2 p){ vec2 uv=vec2((p.x-uHMp.x)/uHMp.z+0.5,0.5-(p.y-uHMp.y)/uHMp.z); vec3 gp=p.x>${(SEA2X/2).toFixed(1)}?uG2p:uG1p; vec2 g=vec2((p.x-gp.x)/gp.z+0.5,0.5-(p.y-gp.y)/gp.z);
    float hg=p.x>${(SEA2X/2).toFixed(1)}?texture2D(uG2,g).r:texture2D(uG1,g).r; vec2 e=min(uv,1.-uv); float w=smoothstep(0.0,0.06,min(e.x,e.y)); return mix(hg,texture2D(uHM,clamp(uv,0.,1.)).r,w); }
  void main(){
    float th=terrH(vWorld.xz); float depth=clamp(-th,0.,40.);
    float zone=0.; vec3 zc=vec3(0.); for(int i=0;i<4;i++){ vec4 Z=uZ[i]; if(Z.z<=0.) continue; float dd=length(vWorld.xz-Z.xy)/Z.z; float k=smoothstep(1.25,0.75,dd); if(k>zone){ zone=k; zc= Z.w<1.5? vec3(0.02,0.1,0.2) : Z.w<2.5? vec3(0.2,0.05,0.4) : Z.w<3.5? vec3(0.0,0.02,0.07) : vec3(0.06,0.0,0.12); } }
    float lava=0.; for(int i=0;i<3;i++){ vec4 L=uL[i]; if(L.z<=0.) continue; lava=max(lava,clamp(1.5-length(vWorld.xz-L.xy)/L.z,0.,1.)*L.w); }
    vec2 q=vWorld.xz; float n1=texture2D(uDet,q*0.021+vec2(uTime*0.012,uTime*0.007)).r, n2=texture2D(uDet,q*0.037-vec2(uTime*0.009,-uTime*0.014)).r, n3=texture2D(uDet,q*0.11+uTime*0.03).r;
    vec3 N=normalize(vN+vec3((n1-n2)*0.55+(n3-.5)*0.18,0.,(n2-n1*0.6-0.2)*0.5+(n3-.5)*0.12));
    vec3 V=normalize(cameraPosition-vWorld); float fres=pow(1.-max(dot(N,V),0.),4.);
    float dm=smoothstep(0.,22.,depth);
    vec3 col=mix(uShallow,uDeep,dm);
    col=mix(col,uShallow*1.25+vec3(0.02,0.06,0.04),(1.-smoothstep(0.,3.5,depth))*0.55);
    col=mix(col,zc,zone*0.9);
    col=mix(col,vec3(1.,0.35,0.08),lava*0.6*(0.7+0.3*sin(uTime*1.3+vWorld.x*0.05)));
    float c1=noise(vWorld.xz*0.35+vec2(uTime*0.5,uTime*0.2)), c2=noise(vWorld.xz*0.29-vec2(uTime*0.3,uTime*0.45));
    float caust=smoothstep(0.62,0.9,1.-abs(c1-c2)*3.)*(1.-smoothstep(0.,7.,depth));
    col+=caust*0.2*(1.-uNight*0.8);
    col=mix(col,uSky,fres*0.5);
    col+=vec3(0.1,0.9,0.5)*uAurora*fres*0.35;
    vec3 H=normalize(uSunDir+V); float spec=pow(max(dot(N,H),0.),260.);
    col+=uSunCol*smoothstep(0.2,0.6,spec)*1.2;
    float glit=step(0.985,hash(floor(vWorld.xz*1.2)+floor(uTime*6.)))*pow(max(dot(N,H),0.),40.);
    col+=uSunCol*glit*1.4*(1.-uNight);
    float fl=1.-smoothstep(0.,1.4,depth);
    float band=sin(depth*4.-uTime*1.8+n1*3.)*0.5+0.5;
    float fn=noise(vWorld.xz*0.7+uTime*0.25);
    float foam=fl*smoothstep(0.5,0.62,band*0.6+fn*0.5+fl*0.2);
    foam=max(foam,smoothstep(0.88,1.,fl)*0.85);
    float crest=smoothstep(0.55,0.95,vWave/(0.9+uRough*0.9))*smoothstep(0.45,0.75,n3+fn*0.4);
    foam=max(foam,crest*0.55);
    col=mix(col,uFoam*(1.-uNight*0.55),clamp(foam,0.,1.));
    float a=mix(0.45,0.97,dm); a=max(a,foam); a=max(a,zone*0.92);
    if(uRadar>0.){ for(int i=0;i<16;i++){ vec4 A=uA[i]; if(A.z<=0.) continue; vec2 d2=vWorld.xz-A.xy; float r=length(d2*vec2(1.,A.w)); float k=1.-smoothstep(A.z*0.9,A.z,r);
        if(k>0.){ float st=step(0.5,fract((vWorld.x+vWorld.z)*0.06-uTime*0.35)); float edge=smoothstep(A.z*0.82,A.z*0.97,r)*(1.-smoothstep(A.z*0.97,A.z,r))*2.; col=mix(col,uAC[i],(0.22+st*0.16+edge*0.5)*k*uRadar); a=max(a,0.8*k*uRadar); } } }
    if(uHunt.z>0.){ float hd=length(vWorld.xz-uHunt.xy)/uHunt.z; float ring=smoothstep(0.96,1.,hd)*(1.-smoothstep(1.,1.02,hd)); col=mix(col,vec3(1.,0.35,0.2),ring*0.5*uHunt.w); col=mix(col,col*vec3(0.75,0.85,1.1),(1.-smoothstep(0.7,1.,hd))*0.25*uHunt.w); }
    gl_FragColor=vec4(col,a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }`});
const WG=LOW?150:260, WSIZE=1600; const waterGeo=new THREE.PlaneGeometry(WSIZE,WSIZE,WG,WG); waterGeo.rotateX(-Math.PI/2);
const water=new THREE.Mesh(waterGeo,waterMat); water.frustumCulled=false; water.renderOrder=2; scene.add(water);
const farGeo=new THREE.RingGeometry(WSIZE/2-10,18000,96,10); farGeo.rotateX(-Math.PI/2);
const farWater=new THREE.Mesh(farGeo,waterMat); farWater.frustumCulled=false; farWater.renderOrder=2; scene.add(farWater);
function waveHeight(x,z,t){ let h=0; const R=1+waterU.uRough.value; const W=(dx,dz,fr,am,sp)=>{ const l=Math.hypot(dx,dz); h+=Math.sin((dx/l*x+dz/l*z)*fr+t*sp)*am };
  W(1,0.3,0.042,0.42*R,0.95); W(-0.4,1,0.071,0.26*R,1.25); W(0.7,-0.8,0.16,0.08*R,2.1); W(-1,-0.2,0.021,0.34*R,0.62); W(0.2,0.9,0.31,0.035,3.1); W(0.93,0.37,0.011,0.3*R,0.45); return h }
const seabed=new THREE.Mesh(new THREE.PlaneGeometry(36000,36000),new THREE.MeshStandardMaterial({color:"#16475e",roughness:1})); seabed.rotation.x=-Math.PI/2; seabed.position.y=SEAFLOOR-0.5; scene.add(seabed);
function setWaterZones(sea){ const Z=DEEPZ.filter(z=>z.sea===sea); for(let i=0;i<4;i++){ const z=Z[i]; waterU.uZ.value[i].set(z?z.x:0,z?z.z:0,z?z.r:0,z?ZONEID[z.n]:0) }
  const L=ISL.filter(I=>I.sea===sea&&(I.biome==="volcano"||I.biome==="ash")); for(let i=0;i<3;i++){ const I=L[i]; waterU.uL.value[i].set(I?I.x:0,I?I.z:0,I?I.r:0,I?(I.biome==="ash"?0.6:1):0) } }

/* ---------- grass: GPU placed around the player, reads the height map ---------- */
let GRASSM=null, GRASS_SP=LOW?1.35:0.8;
function buildGrass(){ const R=LOW?48:62, N=Math.round(R*2/GRASS_SP);
  const base=new THREE.BufferGeometry(); const bw=0.17, bh=1;
  base.setAttribute("position",new THREE.Float32BufferAttribute([-bw,0,0, bw,0,0, -bw*0.6,bh*0.5,0, bw*0.6,bh*0.5,0, 0,bh,0],3));
  base.setAttribute("uvy",new THREE.Float32BufferAttribute([0,0,.5,.5,1],1)); base.setIndex([0,1,2, 1,3,2, 2,3,4]);
  const g=new THREE.InstancedBufferGeometry(); g.index=base.index; g.attributes.position=base.attributes.position; g.attributes.uvy=base.attributes.uvy;
  const cell=new Float32Array(N*N*2); for(let j=0;j<N;j++) for(let i=0;i<N;i++){ cell[(j*N+i)*2]=i; cell[(j*N+i)*2+1]=j }
  g.setAttribute("aCell",new THREE.InstancedBufferAttribute(cell,2)); g.instanceCount=N*N; g.boundingSphere=new THREE.Sphere(new THREE.Vector3(),1e6);
  const mat=new THREE.ShaderMaterial({side:THREE.DoubleSide,fog:true,uniforms:THREE.UniformsUtils.merge([THREE.UniformsLib.fog,{uTime:U.time,uLight:{value:new THREE.Color(1,1,1)},uPlayer:{value:new THREE.Vector3()},uHM:{value:null},uHC:{value:null},uHMp:{value:new THREE.Vector3(0,0,1024)},uSp:{value:GRASS_SP},uN:{value:N},uR:{value:R}}]),
    vertexShader:`precision highp float; attribute vec2 aCell; attribute float uvy; uniform float uTime,uSp,uN,uR; uniform vec3 uPlayer,uHMp; uniform sampler2D uHM,uHC; varying vec3 vCol; varying float vY;
    #include <fog_pars_vertex>
    float h1(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    void main(){ vec2 pc=floor(uPlayer.xz/uSp); vec2 c=aCell+uN*floor((pc-aCell)/uN+0.5); vec2 j=vec2(h1(c),h1(c+17.3)); vec2 wxz=(c+j)*uSp;
      vec2 uv=vec2((wxz.x-uHMp.x)/uHMp.z+0.5,0.5-(wxz.y-uHMp.y)/uHMp.z); vec4 hm=texture2D(uHM,uv); float d=length(wxz-uPlayer.xz);
      float sc=(0.65+h1(c+3.1)*0.95)*step(0.55,hm.g)*smoothstep(uR,uR*0.72,d)*step(0.9,hm.r); float rot=h1(c+9.7)*6.283; float cs=cos(rot), sn=sin(rot);
      vec3 p=position*vec3(1.,sc*1.25,1.); p=vec3(p.x*cs-p.z*sn,p.y,p.x*sn+p.z*cs); vec3 wp=vec3(wxz.x,hm.r-0.05,wxz.y)+p;
      float wind=sin(uTime*1.8+wxz.x*0.15+wxz.y*0.1)*0.35+sin(uTime*3.1+wxz.x*0.4)*0.1; wp.x+=wind*uvy*uvy*sc; wp.z+=wind*0.5*uvy*uvy*sc;
      vec2 away=wp.xz-uPlayer.xz; float pd=length(away); if(pd<1.8){ wp.xz+=normalize(away+0.001)*(1.8-pd)*uvy*0.8; wp.y-=(1.8-pd)*uvy*0.3; }
      vec3 gc=texture2D(uHC,uv).rgb; vCol=gc*(1.05+h1(c+5.)*0.25); vY=uvy; vec4 mvPosition=viewMatrix*vec4(wp,1.); gl_Position=projectionMatrix*mvPosition;
      #include <fog_vertex>
    }`,
    fragmentShader:`uniform vec3 uLight; varying vec3 vCol; varying float vY;
    #include <fog_pars_fragment>
    void main(){ vec3 c=vCol*mix(0.5,1.3,vY)*uLight; gl_FragColor=vec4(c,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      #include <fog_fragment>
    }`});
  mat.uniforms.uHM.value=hmRT.texture; mat.uniforms.uHC.value=hcRT.texture; mat.uniforms.uTime=U.time;
  const m=new THREE.Mesh(g,mat); m.frustumCulled=false; scene.add(m); GRASSM=m; GRASS[1]=m; return m }
let grassMesh=null; const GRASS={};


/* ---------- prop geometry library ---------- */
const GEO={};
function buildGeoLib(){
  const cyl=(rt,rb,h,s=7)=>new THREE.CylinderGeometry(rt,rb,h,s), cone=(r,h,s=7)=>new THREE.ConeGeometry(r,h,s), ico=(r,d=0)=>new THREE.IcosahedronGeometry(r,d), box=(w,h,d)=>new THREE.BoxGeometry(w,h,d);
  GEO.pine=merge([P(cyl(.35,.55,3),"#6b4a2e",0,1.5,0),P(cone(3.2,4.6),"#2f7a3c",0,4.3,0),P(cone(2.6,4),"#378a44",0,6.5,0),P(cone(1.8,3.4),"#40994c",0,8.5,0)]);
  GEO.snowpine=merge([P(cyl(.35,.55,3),"#6b4a2e",0,1.5,0),P(cone(3.2,4.6),"#2e6b4c",0,4.3,0),P(cone(2.6,4),"#347a55",0,6.5,0),P(cone(1.8,3.4),"#3b865d",0,8.5,0),P(cone(1.3,1.8),"#ffffff",0,9.6,0),P(cone(3.25,.6),"#f4f8fb",0,5.9,0,0,0.3)]);
  GEO.oak=merge([P(cyl(.45,.7,4.2),"#7a5634",0,2.1,0),P(ico(2.8,1),"#5aa844",0,5.6,0),P(ico(2.1,1),"#66b84d",1.7,5,0.6),P(ico(1.9,1),"#4f9a3d",-1.4,5.2,-0.8),P(ico(1.7,1),"#6cc052",0.2,6.9,-0.4)]);
  GEO.bloom=merge([P(cyl(.4,.6,3.4),"#7a5634",0,1.7,0),P(ico(2.4,1),"#ff9fc4",0,4.6,0),P(ico(1.8,1),"#ffb7d2",1.4,4.2,0.5),P(ico(1.6,1),"#ff8ab5",-1.2,4.4,-0.6)]);
  const palm=[]; for(let k=0;k<6;k++) palm.push(P(cyl(.32,.4,1.5,6),"#9a7448",k*0.18,0.75+k*1.4,0,0,0,-0.07*k));
  for(let k=0;k<7;k++){ const a=k/7*Math.PI*2; palm.push(P(box(4.8,.12,1.3),k%2?"#3fa64a":"#4fb857",1.08+Math.cos(a)*2.3,8.6-0.5,Math.sin(a)*2.3,0,-a,-0.38)) }
  palm.push(P(ico(.45,0),"#6b4a2e",1.08,8.2,0.3),P(ico(.45,0),"#6b4a2e",0.8,8.1,-0.3)); GEO.palm=merge(palm);
  GEO.mushroom=merge([P(cyl(.7,.95,5.5,8),"#efe4cc",0,2.75,0),P(new THREE.SphereGeometry(3.8,12,7,0,Math.PI*2,0,Math.PI/2),"#9d4bd0",0,5.2,0),P(cyl(3.7,3.7,.5,12),"#e8d2f3",0,5.2,0),
    P(ico(.45,0),"#fff3ff",1.4,7.8,0.8),P(ico(.4,0),"#fff3ff",-1.2,7.6,1.3),P(ico(.35,0),"#fff3ff",0.3,8.6,-1.3)]);
  GEO.mushroom2=merge([P(cyl(.4,.55,3,8),"#efe4cc",0,1.5,0),P(new THREE.SphereGeometry(2,10,6,0,Math.PI*2,0,Math.PI/2),"#d8563f",0,2.8,0),P(ico(.3,0),"#fff",0.6,4.3,0.5),P(ico(.28,0),"#fff",-0.7,4.1,-0.2)]);
  GEO.dead=merge([P(cyl(.3,.55,6,6),"#5a4a3c",0,3,0),P(cyl(.12,.22,3,5),"#5a4a3c",0.9,4.8,0,0,0,-0.7),P(cyl(.1,.2,2.6,5),"#5a4a3c",-0.8,5.2,0.2,0,0,0.8),P(cyl(.08,.15,1.8,5),"#5a4a3c",0.2,6.3,-0.5,0.5,0,0)]);
  GEO.jungle=merge([P(cyl(.7,1.1,11,8),"#5e4630",0,5.5,0),P(ico(5,1),"#2f7d33",0,12,0,0,0,0,1,0.55,1),P(ico(3.6,1),"#38903b",2.8,11,1.5,0,0,0,1,.6,1),P(ico(3.2,1),"#2a6f2e",-2.6,11.4,-1.2,0,0,0,1,.6,1),P(cyl(.08,.08,6,4),"#3f7a2e",1.8,8,1.4)]);
  GEO.fern=merge([P(cyl(.5,.8,6,7),"#6a5234",0,3,0),...Array.from({length:8},(_,k)=>{const a=k/8*Math.PI*2; return P(box(4,.1,1.1),k%2?"#5b9b3c":"#6aab45",Math.cos(a)*1.8,6.1,Math.sin(a)*1.8,0,-a,-0.45)})]);
  GEO.cactus=merge([P(cyl(.7,.75,5,8),"#4f9a4a",0,2.5,0),P(new THREE.SphereGeometry(.7,8,6),"#4f9a4a",0,5,0),P(cyl(.45,.45,2,8),"#4f9a4a",1.2,3,0,0,0,Math.PI/2),P(cyl(.45,.45,1.8,8),"#4f9a4a",1.9,3.9,0),P(cyl(.4,.4,1.6,8),"#4f9a4a",-1.1,2.4,0,0,0,Math.PI/2),P(cyl(.4,.4,1.4,8),"#4f9a4a",-1.7,3.1,0)]);
  GEO.rock=merge([P(new THREE.DodecahedronGeometry(1.6,0),"#9a978d",0,0.6,0,0.3,0.5,0,1.2,0.8,1),P(new THREE.DodecahedronGeometry(1,0),"#8a877e",1.3,0.3,0.6,0.7,0,0.2)]);
  GEO.bush=merge([P(ico(1.4,1),"#4f9a3d",0,0.9,0),P(ico(1.1,1),"#5eae47",1,0.8,0.5),P(ico(1,1),"#468c36",-0.9,0.7,-0.3),P(ico(.25,0),"#ff5a6e",0.4,1.9,0.9),P(ico(.22,0),"#ffd24a",-0.6,1.6,0.8)]);
  GEO.flower=merge([P(cyl(.05,.05,.8,4),"#4f9a3d",0,.4,0),P(ico(.28,0),"#ff7ab0",0,.85,0)]);
  GEO.crystal=merge([P(new THREE.OctahedronGeometry(1.4,0),"#b597ff",0,2.6,0,0,0,0,1,2.6,1),P(new THREE.OctahedronGeometry(1,0),"#8fe3ff",1.4,1.6,0.4,0,0.4,-0.3,1,2,1),P(new THREE.OctahedronGeometry(.8,0),"#d7b8ff",-1.2,1.3,-0.3,0,0,0.35,1,1.8,1)]);
  GEO.salt=merge([P(box(1.4,2.2,1.4),"#f4f7f2",0,1.1,0,0,0.3),P(box(1,1.4,1),"#e6ede3",1.2,0.7,0.5,0,0.8),P(box(.8,1,.8),"#ffffff",-0.9,0.5,-0.4,0,0.2)]);
  GEO.coral=merge([P(cyl(.25,.35,2.4,6),"#ff7aa2",0,1.2,0,0,0,0.2),P(cyl(.2,.3,1.8,6),"#ff7aa2",0.6,1,0.2,0,0,-0.4),P(ico(.9,0),"#ffb35a",-0.9,0.6,0.4),P(cyl(.18,.25,2,6),"#b28bff",-0.3,1,-0.7,0.3,0,0)]);
  GEO.lily=merge([P(cyl(1,1,.08,10),"#4f9a3d",0,0,0),P(ico(.25,0),"#ffc2dd",0.3,0.15,0.2)]);
}
function buildGeoLib2(){
  const cyl=(rt,rb,h,s=7)=>new THREE.CylinderGeometry(rt,rb,h,s), cone=(r,h,s=7)=>new THREE.ConeGeometry(r,h,s), ico=(r,d=0)=>new THREE.IcosahedronGeometry(r,d), box=(w,h,d)=>new THREE.BoxGeometry(w,h,d);
  GEO.spire=merge([P(cone(3,26,6),"#bfe8ff",0,13,0),P(cone(1.8,16,6),"#e8fbff",2.4,8,1,0,0,-0.12),P(cone(1.4,12,6),"#9fd8f5",-2,6,-1.2,0,0,0.15),P(cone(3.2,3,6),"#ffffff",0,1,0)]);
  GEO.gcoral=merge([P(cyl(.6,1,6,7),"#ff6f91",0,3,0),P(cyl(.35,.55,5,6),"#ff6f91",1.8,6.5,0,0,0,-0.6),P(cyl(.35,.55,5,6),"#ff6f91",-1.8,6.8,0.4,0,0,0.6),P(ico(1.6,1),"#ffb35a",2.8,9,0),P(ico(1.5,1),"#c78bff",-2.8,9.2,0.6),P(ico(1.9,1),"#5fe0c8",0,8.6,-0.4)]);
  GEO.column=merge([P(cyl(1,1.15,10,12),"#ece4cf",0,5,0),P(box(2.8,.6,2.8),"#d8cfb6",0,0.3,0),P(box(2.8,.6,2.8),"#d8cfb6",0,10.2,0)]);
  GEO.bcolumn=merge([P(cyl(1,1.15,4.5,12),"#e2d9c2",0,2.25,0,0.08,0,0.05),P(box(2.8,.6,2.8),"#d0c7ad",0,0.3,0),P(cyl(.9,1,2.6,12),"#e2d9c2",2.4,0.6,1,Math.PI/2,0.4,0)]);
  GEO.geyser=merge([P(new THREE.TorusGeometry(1.6,.6,6,10),"#2b2426",0,0.3,0,Math.PI/2,0,0),P(cyl(1.1,1.4,.4,10),"#ff7a2a",0,0.1,0),P(ico(.8,0),"#1c181b",2.2,0.3,0.4),P(ico(.6,0),"#1c181b",-2,0.2,-0.8)]);
  GEO.lamp=merge([P(cyl(.12,.16,5,6),"#2b2b2b",0,2.5,0),P(box(.8,.9,.8),"#2b2b2b",0,5.2,0)]);
  GEO.barrel=merge([P(cyl(.7,.75,1.5,10),"#8a5a30",0,.75,0),P(cyl(.72,.72,.12,10),"#555",0,1.2,0),P(cyl(.77,.77,.12,10),"#555",0,.3,0)]);
  GEO.crate=merge([P(box(1.4,1.4,1.4),"#a8764a",0,.7,0),P(box(1.45,.15,1.45),"#7a5230",0,1.35,0)]);
  GEO.fogtree=merge([P(cyl(.35,.6,7,6),"#4a4640",0,3.5,0,0.05,0,0.08),P(cyl(.1,.2,3,5),"#4a4640",0.8,5.4,0,0,0,-0.8),P(cyl(.1,.18,2.4,5),"#4a4640",-0.7,6,0.3,0,0,0.9),P(ico(1.3,0),"#6c7a64",0.3,7.4,0),P(ico(1,0),"#5f6b58",1.6,6.6,0.4)]);
  GEO.icicle=merge([P(new THREE.OctahedronGeometry(1.2,0),"#c7f0ff",0,2.4,0,0,0,0,1,2.4,1),P(new THREE.OctahedronGeometry(.8,0),"#e8fbff",1.1,1.5,0.4,0,0.3,-0.3,1,2,1)]);
  GEO.ashrock=merge([P(new THREE.DodecahedronGeometry(1.8,0),"#221c1e",0,0.8,0,0.3,0.5,0,1.1,1.4,1),P(new THREE.DodecahedronGeometry(.9,0),"#3a2c2a",1.4,0.4,0.6)]);
  GEO.sparkcrystal=merge([P(new THREE.OctahedronGeometry(1.2,0),"#6ff3ff",0,2.2,0,0,0,0,1,2.4,1),P(new THREE.OctahedronGeometry(.8,0),"#b8ffff",1.1,1.4,0.3,0,0.2,-0.3,1,2,1)]);
}
const WINDTYPES=new Set(["pine","snowpine","oak","bloom","palm","jungle","fern","mushroom","gcoral"]);
let INST_TAG=""; const INST={}, ICELL=512; function inst(type,x,y,z,ry,s,tint){ const k=type+"|"+seaAt(x)+"|"+INST_TAG+"|"+Math.floor(x/ICELL)+","+Math.floor(z/ICELL); (INST[k]||(INST[k]=[])).push([x,y,z,ry,s,tint]) }
/* cheap stand-in geometry for far away props: trunk + one low-poly blob in the prop's average colours */
const GEO_LO={}, NOLO=new Set(["flower","lily","coral","bush","barrel","crate","lamp","geyser"]);
function loGeo(type){ if(GEO_LO[type]) return GEO_LO[type]; const g=GEO[type]; g.computeBoundingBox(); const bb=g.bbox||g.boundingBox, H=bb.max.y-bb.min.y, W=Math.max(bb.max.x-bb.min.x,bb.max.z-bb.min.z);
  const p=g.attributes.position, c=g.attributes.color; let top=[0,0,0,0], low=[0,0,0,0]; for(let i=0;i<p.count;i++){ const a=p.getY(i)>bb.min.y+H*0.42?top:low; a[0]+=c.getX(i); a[1]+=c.getY(i); a[2]+=c.getZ(i); a[3]++ }
  const col=a=>a[3]?new THREE.Color(a[0]/a[3],a[1]/a[3],a[2]/a[3]):new THREE.Color("#777"); const tall=H>W*0.9&&H>4;
  const parts=tall?[P(new THREE.CylinderGeometry(W*0.06,W*0.09,H*0.5,5),col(low),0,bb.min.y+H*0.25,0),P(new THREE.IcosahedronGeometry(1,0),col(top),0,bb.min.y+H*0.66,0,0,0,0,W*0.45,H*0.36,W*0.45)]
    :[P(new THREE.IcosahedronGeometry(1,0),col(top[3]?top:low),0,bb.min.y+H*0.45,0,0,0,0,W*0.48,H*0.55,W*0.48)];
  return GEO_LO[type]=merge(parts) }
const LODCELLS=[];
function flushInstances(){
  const emissive={mushroom:"#6a2a9a",crystal:"#6b4fd8",sparkcrystal:"#2fb8d8",icicle:"#3a8ab8"};
  for(const [key,list] of Object.entries(INST)){ if(!list.length) continue; const [type,sea,tag]=key.split("|");
    const mat = WINDTYPES.has(type) ? windMat(emissive[type]?{emissive:new THREE.Color(emissive[type]),emissiveIntensity:0.35}:null) : new THREE.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:.85,...(emissive[type]?{emissive:new THREE.Color(emissive[type]),emissiveIntensity:0.9}:{})});
    const mk=(geo,mt,cast)=>{ const im=new THREE.InstancedMesh(geo,mt,list.length); im.castShadow=cast; im.receiveShadow=true;
      const m=new THREE.Matrix4(), q=new THREE.Quaternion(), c=new THREE.Color();
      list.forEach((p,i)=>{ q.setFromAxisAngle(new THREE.Vector3(0,1,0),p[3]); m.compose(new THREE.Vector3(p[0],p[1],p[2]),q,new THREE.Vector3(p[4],p[4],p[4])); im.setMatrixAt(i,m); c.setRGB(p[5],p[5],p[5]); im.setColorAt(i,c) });
      im.instanceMatrix.needsUpdate=true; if(im.instanceColor) im.instanceColor.needsUpdate=true; im.computeBoundingSphere(); (tag&&ISG[tag]?ISG[tag]:SEAG[+sea]).add(im); return im };
    const im=mk(GEO[type],mat,!LOW&&!["flower","lily","coral"].includes(type)); const lo=NOLO.has(type)?null:mk(loGeo(type),emissive[type]?mat:vcMat(),false); if(lo) lo.visible=false;
    let cx=0,cz=0; list.forEach(p=>{ cx+=p[0]; cz+=p[2] }); LODCELLS.push({hi:im,lo,x:cx/list.length,z:cz/list.length,small:NOLO.has(type)});
    if(emissive[type]) GLOWMATS.push({mat,base:type==="mushroom"?0.35:0.6,night:type==="mushroom"?1.2:1.7});
  }
}
const GLOWMATS=[];
function excluded(I,x,z,pad=0){ for(const e of I.excl){ if(Math.hypot(x-e.x,z-e.z)<e.r+pad) return true } return false }


/* ---------- characters ---------- */
const faceTex=(()=>{ const c=document.createElement("canvas"); c.width=c.height=128; const x=c.getContext("2d"); x.fillStyle="#1d1d24";
  x.beginPath(); x.ellipse(40,56,9,13,0,0,7); x.fill(); x.beginPath(); x.ellipse(88,56,9,13,0,0,7); x.fill(); x.fillStyle="#fff"; x.beginPath(); x.arc(43,50,3.5,0,7); x.fill(); x.beginPath(); x.arc(91,50,3.5,0,7); x.fill();
  x.strokeStyle="#1d1d24"; x.lineWidth=6; x.lineCap="round"; x.beginPath(); x.arc(64,76,18,0.25,Math.PI-0.25); x.stroke(); x.fillStyle="rgba(255,120,120,.35)"; x.beginPath(); x.arc(28,80,9,0,7); x.fill(); x.beginPath(); x.arc(100,80,9,0,7); x.fill();
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return t })();
const SKINS=["#f5d0a9","#e8b48a","#c98e62","#8d5a3b","#f2c6a0"];
function makeCharacter({shirt="#3b7dd8",pants="#2d3b55",skin="#f1c59b",hat=null,hair="#4a3222",apron=null,rod=false,beard=null,robe=null,hatCol=null}={}){
  const g=new THREE.Group(); const RB=(w,h,d,r)=>new RoundedBoxGeometry(w,h,d,2,r);
  const M=c=>stdMat({color:c,roughness:.8});
  const hip=new THREE.Group(); hip.position.y=2.1; g.add(hip);
  const legL=new THREE.Group(), legR=new THREE.Group(); legL.position.set(-.48,2.1,0); legR.position.set(.48,2.1,0);
  for(const L of [legL,legR]){ const m=new THREE.Mesh(RB(.85,2.1,.9,.2),M(pants)); m.position.y=-1.05; m.castShadow=true; L.add(m); const shoe=new THREE.Mesh(RB(.95,.4,1.15,.15),M("#3b2a20")); shoe.position.set(0,-1.95,.1); L.add(shoe) }
  const torso=new THREE.Mesh(RB(2,2.1,1.15,.3),M(shirt)); torso.position.y=3.2; torso.castShadow=true;
  const head=new THREE.Mesh(RB(1.55,1.5,1.45,.4),M(skin)); head.position.y=5.05; head.castShadow=true;
  const face=new THREE.Mesh(new THREE.PlaneGeometry(1.3,1.3),new THREE.MeshStandardMaterial({map:faceTex,transparent:true,roughness:.9})); face.position.set(0,5.02,.735);
  const hairM=new THREE.Mesh(RB(1.65,.55,1.55,.25),M(hair)); hairM.position.y=5.75;
  g.add(legL,legR,torso,head,face,hairM);
  if(apron){ const ap=new THREE.Mesh(RB(1.7,1.6,.1,.05),M(apron)); ap.position.set(0,2.9,.62); g.add(ap) }
  if(hat==="cap"){ const h=new THREE.Mesh(RB(1.7,.5,1.6,.25),M("#d9443a")); h.position.y=6.0; const b=new THREE.Mesh(RB(1.4,.12,.9,.05),M("#d9443a")); b.position.set(0,5.85,.95); g.add(h,b) }
  else if(hat==="straw"){ const b=new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.6,.12,16),M("#e8c979")); b.position.y=5.9; const t=new THREE.Mesh(new THREE.CylinderGeometry(.8,.9,.7,16),M("#e3c06c")); t.position.y=6.25; const band=new THREE.Mesh(new THREE.CylinderGeometry(.91,.91,.18,16),M("#b8433a")); band.position.y=6.05; g.add(b,t,band) }
  else if(hat==="captain"){ const t=new THREE.Mesh(new THREE.CylinderGeometry(.95,.95,.55,16),M("#1f2d4a")); t.position.y=6.05; const top=new THREE.Mesh(new THREE.CylinderGeometry(1.1,.95,.2,16),M("#ffffff")); top.position.y=6.4; const brim=new THREE.Mesh(RB(1.2,.1,.6,.04),M("#111")); brim.position.set(0,5.85,.8); g.add(t,top,brim) }
  else if(hat==="hood"){ const h=new THREE.Mesh(RB(1.95,1.95,1.85,.5),M(hatCol||"#5b6470")); h.position.set(0,5.25,-0.12); const c=new THREE.Mesh(new THREE.ConeGeometry(.7,1.2,8),M(hatCol||"#5b6470")); c.position.set(0,6.2,-0.6); c.rotation.x=-0.6; g.add(h,c) }
  else if(hat==="bandana"){ const h=new THREE.Mesh(RB(1.72,.5,1.62,.22),M(hatCol||"#d9443a")); h.position.y=5.8; const k=new THREE.Mesh(new THREE.ConeGeometry(.3,.8,5),M(hatCol||"#d9443a")); k.position.set(0,5.6,-0.95); k.rotation.x=-1.9; g.add(h,k) }
  else if(hat==="beanie"){ const h=new THREE.Mesh(RB(1.7,.8,1.6,.35),M(hatCol||"#e0453a")); h.position.y=5.95; const p=new THREE.Mesh(new THREE.SphereGeometry(.32,10,8),M("#ffffff")); p.position.y=6.5; g.add(h,p) }
  else if(hat==="witch"){ const b=new THREE.Mesh(new THREE.CylinderGeometry(1.9,1.9,.1,20),M(hatCol||"#2a1a44")); b.position.y=5.9; const c=new THREE.Mesh(new THREE.ConeGeometry(1.0,3,12),M(hatCol||"#2a1a44")); c.position.set(0,7.3,-0.2); c.rotation.x=-0.25; const band=new THREE.Mesh(new THREE.CylinderGeometry(1.0,1.02,.25,16),M("#ffd24a")); band.position.y=6.05; g.add(b,c,band) }
  else if(hat==="tricorn"){ const t=new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.5,.5,3),M("#2b2230")); t.position.y=6.0; t.rotation.y=Math.PI; const tr=new THREE.Mesh(new THREE.CylinderGeometry(1.52,1.52,.08,3),M("#ffd24a")); tr.position.y=6.26; tr.rotation.y=Math.PI; g.add(t,tr) }
  else if(hat==="wizard"){ const c=new THREE.Mesh(new THREE.ConeGeometry(1.05,2.2,12),M("#5a3a9a")); c.position.y=6.8; const b=new THREE.Mesh(new THREE.CylinderGeometry(1.4,1.4,.12,16),M("#5a3a9a")); b.position.y=5.85; g.add(c,b) }
  if(beard){ const bd=new THREE.Mesh(RB(1.3,1.1,.5,.25),M(beard)); bd.position.set(0,4.55,.62); g.add(bd) }
  if(robe){ const rb=new THREE.Mesh(new THREE.CylinderGeometry(1.15,1.55,2.6,12),M(robe)); rb.position.y=1.5; g.add(rb) }
  const armL=new THREE.Group(), armR=new THREE.Group(); armL.position.set(-1.35,4.1,0); armR.position.set(1.35,4.1,0);
  for(const A of [armL,armR]){ const s=new THREE.Mesh(RB(.72,1.2,.8,.2),M(shirt)); s.position.y=-.5; const a=new THREE.Mesh(RB(.62,1.1,.66,.2),M(skin)); a.position.y=-1.45; s.castShadow=a.castShadow=true; A.add(s,a) }
  g.add(armL,armR);
  let rodG=null, tip=null;
  if(rod){ rodG=new THREE.Group(); const handle=new THREE.Mesh(new THREE.CylinderGeometry(.12,.14,1.6,8),M("#2b2b2b")); handle.position.y=0.3;
    const blank=new THREE.Mesh(new THREE.CylinderGeometry(.045,.1,7.2,8),stdMat({color:"#9aaabe",roughness:.4,metalness:.2})); blank.position.y=4.6;
    const reel=new THREE.Mesh(new THREE.CylinderGeometry(.28,.28,.3,12),stdMat({color:"#cfd6de",metalness:.6,roughness:.3})); reel.rotation.z=Math.PI/2; reel.position.set(.25,1,0);
    tip=new THREE.Object3D(); tip.position.y=8.2; rodG.add(handle,blank,reel,tip); rodG.userData.blank=blank;
    rodG.position.set(0,-1.9,.25); rodG.rotation.x=1.05; armR.add(rodG) }
  return {group:g,legL,legR,armL,armR,torso,head,rod:rodG,tip};
}
function setRodLook(ch,rodName){ if(!ch.rod) return; const r=ROD[rodName]||ROD["Flimsy Rod"]; ch.rod.userData.blank.material=stdMat({color:r.mc,roughness:.35,metalness:.25}) }
function poseCharacter(ch,o,t){
  const w=o.moving&&!o.boat&&!o.swim?Math.sin(o.walkT):0, sw=o.swim?Math.sin(t*4):0;
  ch.legL.rotation.x=w*0.75+sw*0.4; ch.legR.rotation.x=-w*0.75-sw*0.4; ch.armL.rotation.x=-w*0.7+(o.swim?-2.6+sw*0.6:0);
  let ar=w*0.7; if(o.swim) ar=-2.6-sw*0.6;
  if(o.st==="charge") ar=-2.7+Math.sin(t*4)*0.05; else if(o.st==="cast"||o.st==="lure") ar=-0.95; else if(o.st==="reel"||o.st==="bite") ar=-1.15+Math.sin(t*22)*0.12; else if(o.st==="hold") ar=-3.0;
  ch.armR.rotation.x=ar; if(o.st==="hold"){ ch.armL.rotation.x=-3.0 }
  if(o.boat){ ch.legL.rotation.x=-1.45; ch.legR.rotation.x=-1.45 }
  ch.group.position.y=o.boat?o.y-1.1:o.y;
}

/* ---------- boats ---------- */
function hullGeo(len,w,h){ const s=new THREE.Shape(); s.moveTo(-w/2,-len/2); s.lineTo(w/2,-len/2); s.lineTo(w/2,len*0.18); s.quadraticCurveTo(w/2,len*0.42,0,len/2); s.quadraticCurveTo(-w/2,len*0.42,-w/2,len*0.18); s.closePath();
  const g=new THREE.ExtrudeGeometry(s,{depth:h,bevelEnabled:true,bevelThickness:.2,bevelSize:.2,bevelSegments:2,curveSegments:8}); g.rotateX(Math.PI/2); g.translate(0,h/2,0);
  const p=g.attributes.position; for(let i=0;i<p.count;i++){ const y=p.getY(i); if(y<0){ p.setX(i,p.getX(i)*0.62); } } g.computeVertexNormals(); return g }
function makeBoat(tier){
  const g=new THREE.Group(); const add=(geo,c,x=0,y=0,z=0,o={})=>{ const m=new THREE.Mesh(geo,stdMat({color:c,...o})); m.position.set(x,y,z); m.castShadow=true; g.add(m); return m };
  if(tier<=1){ add(hullGeo(8,3.4,1.5),"#9a6234"); add(new THREE.BoxGeometry(3.2,.18,7.4),"#c89458",0,0.62,0); add(new THREE.BoxGeometry(3,.25,.8),"#7a4a26",0,1.0,-1.2); add(new THREE.BoxGeometry(2.4,.25,.8),"#7a4a26",0,1.0,1.8);
    const oar=add(new THREE.BoxGeometry(.18,.12,5),"#d7b27a",1.9,1.1,-0.5); oar.rotation.y=0.3; const oar2=add(new THREE.BoxGeometry(.18,.12,5),"#d7b27a",-1.9,1.1,-0.5); oar2.rotation.y=-0.3 }
  else if(tier===2){ add(hullGeo(10,4,1.8),"#f4f6f8"); add(new THREE.BoxGeometry(4.02,.35,8),"#2f7fd8",0,0.2,-0.6); add(new THREE.BoxGeometry(3.7,.18,9),"#cfa36a",0,0.75,0); add(new THREE.BoxGeometry(3,.9,.12),"#9fd8ff",0,1.4,1.2,{transparent:true,opacity:.6,roughness:.1});
    add(new THREE.BoxGeometry(1.2,1.6,1.1),"#2b2b2b",0,1.1,-5.2); add(new THREE.BoxGeometry(2.6,.3,1),"#e9e2d0",0,1.0,-2.2) }
  else { add(hullGeo(14,5.2,2.4),"#1f3d6b"); add(new THREE.BoxGeometry(5.22,.4,11),"#f2f2f2",0,1.4,-0.8); add(new THREE.BoxGeometry(4.8,.2,12.5),"#c89458",0,1.05,0); add(new THREE.BoxGeometry(3.4,2.4,3.6),"#f4f6f8",0,2.3,-2.2); add(new THREE.BoxGeometry(3.6,.3,3.9),"#d9443a",0,3.6,-2.2);
    add(new THREE.BoxGeometry(3.3,1,.1),"#9fd8ff",0,2.6,-0.35,{transparent:true,opacity:.6,roughness:.1}); add(new THREE.CylinderGeometry(.12,.12,7,6),"#ddd",0,6.5,-2.2); const flag=add(new THREE.PlaneGeometry(1.8,1.1),"#ffd24a",0.9,9.3,-2.2,{side:THREE.DoubleSide}); g.userData.flag=flag;
    add(new THREE.BoxGeometry(1.4,1.8,1.3),"#2b2b2b",0,1.4,-7.3) }
  return g;
}

/* ---------- fish models ---------- */
function fishShape(n){
  if(/Eel|Serpent|Snake|Oarfish|Wyrm|Pipefish|Ribbon/.test(n)) return "eel";
  if(/Shark|Megalodon|Orca|Whale|Narwhal|Beluga|Dolphin|Livyatan|Sawfish|Mosasaurus|Leedsichthys|Dunkleosteus|Helicoprion|Dreadfin|Mossjaw|Mosslurker|Moby|Bloop/.test(n)) return "big";
  if(/Octopus|Squid|Jellyfish|Nautilus|Charybdis|Akkorokamui|Lusca|Spinopus|Anomalocaris|Hallucigenia/.test(n)) return "ceph";
  if(/Ray|Manta/.test(n)) return "ray";
  if(/Crab|Starfish|Clam|Scallop|Sand Dollar|Shrimp|Turtle|Tartaruga|Axolotl|Olm|Alligator|Ducky|Grub|Walrus|Manatee/.test(n)) return "odd";
  if(/Puffer|Blob|Sunfish|Boxfish|Moonfish|Handfish|Frogfish|Toadfish|Globe/.test(n)) return "round";
  if(/Swordfish|Sailfish|Whisker Bill|Gar|Barracuda|Pike|Cutlass|Flying/.test(n)) return "long";
  return "fish";
}
function fishColors(n){ const h=hashStr(n), hue=h%360, sat=55+(h>>9)%35, li=52+(h>>17)%16;
  return {body:`hsl(${hue},${sat}%,${li}%)`,belly:`hsl(${(hue+20)%360},${Math.max(10,sat-15)}%,${Math.min(92,li+28)}%)`,fin:`hsl(${(hue+330)%360},${sat+5}%,${Math.max(18,li-14)}%)`,stripe:(h>>5)%3===0} }
const FISHGEO={};
function fishGeometry(n){
  if(FISHGEO[n]) return FISHGEO[n];
  const sh=fishShape(n), C=fishColors(n); const parts=[]; const body=new THREE.Color(C.body), belly=new THREE.Color(C.belly), fin=C.fin;
  const bodyGeo=(L,H,W)=>{ const g=new THREE.SphereGeometry(1,20,14).toNonIndexed(); g.deleteAttribute("uv"); g.scale(L,H,W); const p=g.attributes.position, a=new Float32Array(p.count*3), c=new THREE.Color();
    for(let i=0;i<p.count;i++){ const y=p.getY(i)/H, x=p.getX(i)/L; c.copy(body).lerp(belly,smooth(clamp((0.1-y)/0.7,0,1))); if(C.stripe&&Math.sin(x*14)>0.55&&y>-0.2) c.multiplyScalar(0.6); a[i*3]=c.r;a[i*3+1]=c.g;a[i*3+2]=c.b } g.setAttribute("color",new THREE.BufferAttribute(a,3)); return g };
  const finTri=(w,h,c)=>{ const s=new THREE.Shape(); s.moveTo(0,0); s.lineTo(-w,h*0.5); s.lineTo(-w*0.8,0); s.lineTo(-w,-h*0.5); s.closePath(); return new THREE.ExtrudeGeometry(s,{depth:.06,bevelEnabled:false}) };
  const eye=(x,y,z,r)=>{ parts.push(P(new THREE.SphereGeometry(r,8,6),"#ffffff",x,y,z)); parts.push(P(new THREE.SphereGeometry(r*0.55,8,6),"#111111",x+r*0.25,y,z+Math.sign(z)*r*0.5)) };
  if(sh==="eel"){ for(let k=0;k<7;k++){ const t=k/6; const g=new THREE.SphereGeometry(0.22-0.08*t,10,8); parts.push(P(g,k%2?C.body:C.fin,0.9-t*1.8,Math.sin(t*6)*0.08,0,0,0,0,1.6,1,1)) } eye(0.98,0.05,0.12,0.06); eye(0.98,0.05,-0.12,0.06) }
  else if(sh==="ceph"){ parts.push(bodyGeo(.45,.6,.45).translate(0,.25,0)); for(let k=0;k<8;k++){ const a=k/8*Math.PI*2; parts.push(P(new THREE.ConeGeometry(.08,.9,5),fin,Math.cos(a)*.25,-.35,Math.sin(a)*.25,Math.PI+Math.sin(a)*0.25,0,Math.cos(a)*0.25)) } eye(0.3,0.25,0.22,0.09); eye(0.3,0.25,-0.22,0.09) }
  else if(sh==="ray"){ const g=bodyGeo(.7,.12,.9); parts.push(g); parts.push(P(new THREE.ConeGeometry(.05,1.1,4),fin,-1.1,0,0,0,0,Math.PI/2)); eye(0.45,0.08,0.18,0.05); eye(0.45,0.08,-0.18,0.05) }
  else if(sh==="odd"){ parts.push(bodyGeo(.6,.35,.55)); for(let k=0;k<6;k++){ const s=k<3?1:-1, i=k%3; parts.push(P(new THREE.CylinderGeometry(.05,.04,.6,5),fin,-.25+i*.25,-.25,s*.55,s*0.9,0,0)) } eye(0.45,0.25,0.15,0.07); eye(0.45,0.25,-0.15,0.07) }
  else { const L=sh==="long"?1.05:sh==="big"?1:sh==="round"?.62:.85, H=sh==="round"?.55:sh==="long"?.22:sh==="big"?.3:.34, W=sh==="round"?.5:.2;
    parts.push(bodyGeo(L,H,W));
    const tail=P(finTri(.55,sh==="big"?.95:.75),fin,-L*0.88,0,-.03); parts.push(tail);
    const dors=new THREE.Shape(); dors.moveTo(-.25,0); dors.lineTo(sh==="big"?.05:.1,sh==="big"?.55:.32); dors.lineTo(.3,0); dors.closePath(); parts.push(P(new THREE.ExtrudeGeometry(dors,{depth:.05,bevelEnabled:false}),fin,0,H*0.85,-.025));
    parts.push(P(new THREE.ConeGeometry(.12,.35,4),fin,.1,-H*0.3,W*0.9,0.5,0,-1.2)); parts.push(P(new THREE.ConeGeometry(.12,.35,4),fin,.1,-H*0.3,-W*0.9,-0.5,0,-1.2));
    if(sh==="long") parts.push(P(new THREE.ConeGeometry(.05,.8,6),C.fin,L+0.35,0,0,0,0,-Math.PI/2));
    eye(L*0.62,H*0.25,W*0.8,Math.max(.05,H*0.2)); eye(L*0.62,H*0.25,-W*0.8,Math.max(.05,H*0.2)) }
  const clean=parts.map(g=>{ g=g.index?g.toNonIndexed():g; if(g.attributes.uv) g.deleteAttribute("uv"); if(!g.attributes.color) g=colorize(g,C.body); if(!g.attributes.normal) g.computeVertexNormals(); return g });
  const geo=mergeGeometries(clean,false); geo.computeVertexNormals(); geo.computeBoundingSphere(); return FISHGEO[n]=geo;
}
function makeFishMesh(n,mut){ const m=MUT[mut]; const mat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.4,metalness:0,emissive:new THREE.Color(fishColors(n).body),emissiveIntensity:0.12});
  if(m){ mat.color=new THREE.Color(m.c).lerp(new THREE.Color("#ffffff"),0.25); mat.emissive=new THREE.Color(m.c); mat.emissiveIntensity=0.35 }
  const mesh=new THREE.Mesh(fishGeometry(n),mat); mesh.castShadow=true; return mesh }
const fishSize=f=>clamp(0.9+Math.log10(Math.max(0.2,f.bw))*0.9,0.7,4.2);

/* ---------- particles ---------- */
const dotTex=(()=>{ const c=document.createElement("canvas"); c.width=c.height=64; const x=c.getContext("2d"); const g=x.createRadialGradient(32,32,0,32,32,32); g.addColorStop(0,"rgba(255,255,255,1)"); g.addColorStop(0.4,"rgba(255,255,255,.85)"); g.addColorStop(1,"rgba(255,255,255,0)"); x.fillStyle=g; x.fillRect(0,0,64,64); const t=new THREE.CanvasTexture(c); return t })();
class Particles{
  constructor(max,additive){ this.max=max; this.n=0; this.p=[]; const g=new THREE.BufferGeometry(); this.pos=new Float32Array(max*3); this.col=new Float32Array(max*3); this.size=new Float32Array(max);
    g.setAttribute("position",new THREE.BufferAttribute(this.pos,3)); g.setAttribute("color",new THREE.BufferAttribute(this.col,3)); g.setAttribute("size",new THREE.BufferAttribute(this.size,1)); this.g=g;
    const m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:additive?THREE.AdditiveBlending:THREE.NormalBlending,uniforms:{map:{value:dotTex}},vertexColors:true,
      vertexShader:`attribute float size; varying vec3 vC; void main(){ vC=color; vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=size*(300./-mv.z); gl_Position=projectionMatrix*mv; }`,
      fragmentShader:`uniform sampler2D map; varying vec3 vC; void main(){ vec4 t=texture2D(map,gl_PointCoord); if(t.a<0.02) discard; gl_FragColor=vec4(vC,t.a);
        #include <colorspace_fragment>
      }`});
    this.pts=new THREE.Points(g,m); this.pts.frustumCulled=false; this.pts.renderOrder=5; scene.add(this.pts) }
  emit(x,y,z,vx,vy,vz,life,size,col,grav=-12,drag=0){ if(this.p.length>=this.max) this.p.shift(); const c=new THREE.Color(col); this.p.push({x,y,z,vx,vy,vz,life,max:life,size,r:c.r,g:c.g,b:c.b,grav,drag}) }
  update(dt){ let i=0; for(let k=this.p.length-1;k>=0;k--){ const q=this.p[k]; q.life-=dt; if(q.life<=0){ this.p.splice(k,1); continue } }
    for(const q of this.p){ q.vy+=q.grav*dt; if(q.drag){ q.vx*=1-q.drag*dt; q.vz*=1-q.drag*dt; q.vy*=1-q.drag*dt } q.x+=q.vx*dt; q.y+=q.vy*dt; q.z+=q.vz*dt; const f=clamp(q.life/q.max*2,0,1);
      this.pos[i*3]=q.x;this.pos[i*3+1]=q.y;this.pos[i*3+2]=q.z; this.col[i*3]=q.r*f;this.col[i*3+1]=q.g*f;this.col[i*3+2]=q.b*f; this.size[i]=q.size*(0.4+0.6*f); i++ }
    this.g.setDrawRange(0,i); this.g.attributes.position.needsUpdate=this.g.attributes.color.needsUpdate=this.g.attributes.size.needsUpdate=true }
}
const FX=new Particles(1500,false), GLOW=new Particles(1500,true);
function splashFX(x,y,z,n=18,power=1){ for(let i=0;i<n;i++){ const a=Math.random()*Math.PI*2, s=(1+Math.random()*3)*power; FX.emit(x,y+0.2,z,Math.cos(a)*s,4+Math.random()*6*power,Math.sin(a)*s,0.6+Math.random()*0.4,0.5+Math.random()*0.6,"#eaf8ff",-18) } }
function sparkleFX(x,y,z,col,n=20,spread=2){ for(let i=0;i<n;i++){ GLOW.emit(x+(Math.random()-.5)*spread,y+(Math.random()-.5)*spread,z+(Math.random()-.5)*spread,(Math.random()-.5)*3,1+Math.random()*3,(Math.random()-.5)*3,0.8+Math.random()*0.8,0.6+Math.random()*0.8,col,-1,1.5) } }
function burstFX(x,y,z,col,n=60){ for(let i=0;i<n;i++){ const a=Math.random()*Math.PI*2, b=Math.random()*Math.PI-Math.PI/2, s=6+Math.random()*10; GLOW.emit(x,y,z,Math.cos(a)*Math.cos(b)*s,Math.sin(b)*s+4,Math.sin(a)*Math.cos(b)*s,1+Math.random()*0.6,0.9+Math.random(),col,-6,2.2) } }

/* ---------- precipitation, fireflies, birds ---------- */
const RAIN_N=LOW?700:1800; const rainGeo=new THREE.BufferGeometry(); const rainPos=new Float32Array(RAIN_N*6);
for(let i=0;i<RAIN_N;i++){ const x=(Math.random()-.5)*140, y=Math.random()*70, z=(Math.random()-.5)*140; rainPos.set([x,y,z,x-0.3,y-1.6,z],i*6) }
rainGeo.setAttribute("position",new THREE.BufferAttribute(rainPos,3));
const rain=new THREE.LineSegments(rainGeo,new THREE.LineBasicMaterial({color:0xcfe2ff,transparent:true,opacity:.45})); rain.frustumCulled=false; scene.add(rain);
const snowFall=new THREE.Points((()=>{ const g=new THREE.BufferGeometry(); const a=new Float32Array(900*3); for(let i=0;i<900;i++){a[i*3]=(Math.random()-.5)*120;a[i*3+1]=Math.random()*60;a[i*3+2]=(Math.random()-.5)*120} g.setAttribute("position",new THREE.BufferAttribute(a,3)); return g })(),
  new THREE.PointsMaterial({color:0xffffff,size:.35,map:dotTex,transparent:true,depthWrite:false})); snowFall.frustumCulled=false; scene.add(snowFall);
const birds=[];
function buildBirds(){ const wing=new THREE.PlaneGeometry(1.8,0.6); wing.translate(0.9,0,0); const mat=stdMat({color:"#f4f6f8",side:THREE.DoubleSide});
  const BI=ISL.filter(I=>!I.hidden&&I.biome!=="ash"); for(let i=0;i<(LOW?10:22);i++){ const I=BI[i%BI.length]; const g=new THREE.Group(); const b=new THREE.Mesh(new THREE.CapsuleGeometry(.22,.8,4,8),stdMat({color:"#ffffff"})); b.rotation.z=Math.PI/2; const l=new THREE.Mesh(wing,mat), r=new THREE.Mesh(wing,mat); r.scale.x=-1; g.add(b,l,r); SEAG[I.sea].add(g);
    birds.push({g,l,r,I,a:Math.random()*6,rad:I.r*(0.6+Math.random()*0.7),h:24+Math.random()*26,sp:0.12+Math.random()*0.1,ph:Math.random()*6}) } }
function updateBirds(t,dt){ for(const b of birds){ b.a+=b.sp*dt; const x=b.I.x+Math.cos(b.a)*b.rad, z=b.I.z+Math.sin(b.a)*b.rad; b.g.position.set(x,b.h+Math.sin(t+b.ph)*2,z); b.g.rotation.y=-b.a; const f=Math.sin(t*9+b.ph)*0.6; b.l.rotation.x=f; b.r.rotation.x=f } }

/* ---------- world objects ---------- */
const NPCS=[]; const LABELS=[]; const LANTERNS=[]; const SWIRLS=[]; let lighthouseBeam=null; const FLAGS=[]; const FLOATERS=[];
const CHESTS=[]; const SPINNERS=[]; const EYES=[]; const GEYSERS=[]; const ISLETS=[]; const PORTAL_FX=[]; const WITCHLIGHTS=[];
const lanternMat=new THREE.MeshStandardMaterial({color:"#ffe7a0",emissive:new THREE.Color("#ffb347"),emissiveIntensity:0.2});
const windowMat=new THREE.MeshStandardMaterial({color:"#3a4a5e",emissive:new THREE.Color("#ffc873"),emissiveIntensity:0.0,roughness:.3});
let CUR_GRP=null, CUR_I=null;
const grpFor=x=>CUR_GRP||SEAG[seaAt(x)];
function addObj(o,x){ grpFor(x).add(o); return o }
function addMesh(geo,mat,x,y,z,ry=0,cast=true){ const m=new THREE.Mesh(geo,mat); m.position.set(x,y,z); m.rotation.y=ry; m.castShadow=cast&&!LOW; m.receiveShadow=true; grpFor(x).add(m); return m }
function vcMat(){ return MATS.__vc||(MATS.__vc=new THREE.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:.85})) }
function glowMat(c,i=2){ return new THREE.MeshStandardMaterial({color:c,emissive:new THREE.Color(c),emissiveIntensity:i}) }
const faceAng=(x,z,tx,tz)=>Math.atan2(tx-x,tz-z);
function house(x,y,z,ry,wall,roof,scale=1){ if(CUR_I) y=addPad(CUR_I,x,z,6.5*scale,Math.max(y,groundAt(x,z)));
  const g=merge([P(new THREE.BoxGeometry(8,6,7),wall,0,3,0),P(new THREE.BoxGeometry(8.4,.4,7.4),"#7a5a3c",0,0.2,0),P(new THREE.ConeGeometry(6.6,4.2,4),roof,0,8.1,0,0,Math.PI/4,0,1,1,0.95),
    P(new THREE.BoxGeometry(1.6,2.8,.2),"#6b4428",0,1.4,3.55),P(new THREE.BoxGeometry(1,2.6,1),"#8f8a84",2.2,8.5,-1.2),P(new THREE.BoxGeometry(8.2,.3,.3),"#6b4428",0,6,3.5)]);
  const m=addMesh(g,vcMat(),x,y,z,ry); m.scale.setScalar(scale);
  const win=new THREE.Mesh(new THREE.BoxGeometry(1.3,1.2,.1),windowMat); for(const wx of [-2.4,2.4]){ const w=win.clone(); w.position.set(wx,3.4,3.52); m.add(w) }
  addCollider(x,z,5.2*scale); return m }
function stall(x,y,z,ry,awn1,awn2){ if(CUR_I) y=addPad(CUR_I,x,z,6,y);
  const parts=[P(new THREE.BoxGeometry(7,1.3,2.2),"#8c5d35",0,0.65,1.2),P(new THREE.BoxGeometry(7.2,.2,2.4),"#b47f4c",0,1.35,1.2)];
  for(const px of [-3.4,3.4]) for(const pz of [-1.2,2.2]) parts.push(P(new THREE.CylinderGeometry(.15,.15,4.6,6),"#6b4428",px,2.3,pz));
  for(let k=0;k<7;k++) parts.push(P(new THREE.BoxGeometry(1.05,.16,4.2),k%2?awn1:awn2,-3.15+k*1.05,4.75,0.5,0.28,0,0));
  parts.push(P(new THREE.BoxGeometry(1.1,1.1,1.1),"#a8764a",-4.6,0.55,2.2),P(new THREE.CylinderGeometry(.6,.6,1.3,10),"#8a5a30",4.6,0.65,2),P(new THREE.CylinderGeometry(.62,.62,.12,10),"#555",4.6,1.1,2));
  parts.push(P(new THREE.BoxGeometry(.9,.5,.5),"#5aa0d8",-1.8,1.7,1.0),P(new THREE.BoxGeometry(.7,.4,.5),"#ffb35a",0.6,1.65,1.1),P(new THREE.BoxGeometry(.5,.9,.3),"#d9d2c0",2.3,1.9,0.9));
  addMesh(merge(parts),vcMat(),x,y,z,ry); addCollider(x+Math.sin(ry)*1.2,z+Math.cos(ry)*1.2,3.2) }
function dock(I,ang,len,w){
  const ca=Math.cos(ang), sa=Math.sin(ang); let sx=I.x, sz=I.z, k=0; if(terrainAt(sx,sz)<=0.3){ while(terrainAt(sx,sz)<=0.3&&k<400){ sx-=ca*2; sz-=sa*2; k++ } } else { while(terrainAt(sx,sz)>0.3&&k<900){ sx+=ca*2; sz+=sa*2; k++ } } k=0; while(terrainAt(sx,sz)>0.3&&k<20){ sx+=ca*0.5; sz+=sa*0.5; k++ }
  sx-=Math.cos(ang)*5; sz-=Math.sin(ang)*5; const cx=sx+Math.cos(ang)*len/2, cz=sz+Math.sin(ang)*len/2, Y=1.5;
  const parts=[]; const n=Math.floor(len/1.1); for(let i=0;i<n;i++) parts.push(P(new THREE.BoxGeometry(1,.3,w),i%3?"#a8764a":"#9a6a40",-len/2+0.55+i*1.1,Y,0));
  for(let i=0;i<=len/6;i++) for(const s of [-1,1]) parts.push(P(new THREE.CylinderGeometry(.28,.3,7,6),"#5b3b22",-len/2+1+i*6,Y-3.3,s*(w/2-0.2)));
  parts.push(P(new THREE.BoxGeometry(len,.25,.25),"#6b4428",0,Y+0.9,w/2-0.15),P(new THREE.BoxGeometry(len,.25,.25),"#6b4428",0,Y+0.9,-w/2+0.15));
  for(let i=0;i<=len/6;i++) for(const s of [-1,1]) parts.push(P(new THREE.BoxGeometry(.25,1,.25),"#6b4428",-len/2+1+i*6,Y+0.5,s*(w/2-0.15)));
  addMesh(merge(parts),vcMat(),cx,0,cz,-ang); PLATFORMS.push({x:cx,z:cz,a:ang,len,w,y:Y+0.15,bound:len});
  for(const s of [-1,1]){ const lx=sx+Math.cos(ang)*(len-1.5)+Math.cos(ang+Math.PI/2)*s*(w/2-0.2), lz=sz+Math.sin(ang)*(len-1.5)+Math.sin(ang+Math.PI/2)*s*(w/2-0.2);
    addMesh(new THREE.CylinderGeometry(.12,.12,2.4,6),stdMat({color:"#2b2b2b"}),lx,Y+1.3,lz,0,false); const l=addMesh(new THREE.BoxGeometry(.5,.6,.5),lanternMat,lx,Y+2.7,lz,0,false); LANTERNS.push(l) }
  I.excl.push({x:(sx+cx)/2,z:(sz+cz)/2,r:6});
  return {sx,sz,ex:sx+Math.cos(ang)*len,ez:sz+Math.sin(ang)*len,ang};
}
function npc(opts,x,z,ry,type,loc,label,labelBg,extra){ const ch=makeCharacter(opts); const y=groundAt(x,z); ch.group.position.set(x,y,z); ch.group.rotation.y=ry; addObj(ch.group,x);
  const s=textSprite(label,{size:40,bg:labelBg||"rgba(12,26,44,.85)",scale:type==="villager"?0.032:0.042}); s.position.set(x,y+(opts.hat==="witch"?9.6:8.2),z); addObj(s,x);
  const n=Object.assign({type,loc,x,z,hx:x,hz:z,ch,label,sprite:s,ry},extra||{}); NPCS.push(n); if(type!=="villager") addCollider(x,z,1.2); return n }
function chest(id,x,z,loc,tier=1){
  const y=groundAt(x,z); const g=new THREE.Group(); g.position.set(x,y,z); g.rotation.y=Math.random()*6;
  const body=new THREE.Mesh(merge([P(new RoundedBoxGeometry(2.2,1.2,1.5,2,.12),"#8a5a30",0,0.6,0),P(new THREE.BoxGeometry(2.3,.18,1.6),"#ffd24a",0,0.25,0),P(new THREE.BoxGeometry(.4,.5,.1),"#ffd24a",0,0.95,0.78)]),vcMat());
  const lid=new THREE.Mesh(merge([P(new THREE.CylinderGeometry(.75,.75,2.2,12,1,false,0,Math.PI),"#9a6a3a",0,0,0,0,0,Math.PI/2),P(new THREE.BoxGeometry(.2,.1,1.56),"#ffd24a",0.7,0.05,0),P(new THREE.BoxGeometry(.2,.1,1.56),"#ffd24a",-0.7,0.05,0)]),vcMat());
  lid.position.set(0,1.2,-0.75); lid.geometry.translate(0,0,0.75); const piv=new THREE.Group(); piv.position.set(0,1.2,-0.75); lid.position.set(0,0,0); piv.add(lid);
  body.castShadow=!LOW; g.add(body,piv); addObj(g,x);
  const glow=new THREE.Mesh(new THREE.SphereGeometry(.5,10,8),glowMat("#ffe27a",3)); glow.position.y=1.1; glow.visible=false; g.add(glow);
  CHESTS.push({id,x,z,y,loc,g,lid:piv,glow,tier}); addCollider(x,z,1.2) }
function sign(x,z,ry,txt){ const y=groundAt(x,z); addMesh(merge([P(new THREE.BoxGeometry(.3,3,.3),"#6b4428",0,1.5,0),P(new THREE.BoxGeometry(3.4,1.4,.2),"#a8764a",0,2.7,0)]),vcMat(),x,y,z,ry);
  const s=textSprite(txt,{size:30,color:"#ffe9c2",scale:0.03}); s.position.set(x,y+4.1,z); addObj(s,x) }

/* ---------- islands ---------- */
function buildIsland(I){
  { const g=new THREE.Group(); g.name="isl:"+I.n; SEAG[I.sea].add(g); ISG[I.n]=g; if(I.hidden) HIDG[I.n]=g; CUR_GRP=g; INST_TAG=I.n; CUR_I=I }
  const B=I.biome;
  if(I.pond){ const pm=new THREE.Mesh(new THREE.CircleGeometry(I.pond.r*1.12,32),new THREE.MeshStandardMaterial({color:B==="snow"?"#8fd8f0":"#2fb4d8",roughness:.08,metalness:.1,transparent:true,opacity:.82})); pm.rotation.x=-Math.PI/2; pm.position.set(I.pond.x,I.pond.y+0.05,I.pond.z); addObj(pm,I.x);
    const r=rng(I.seed+77); if(B!=="snow") for(let k=0;k<6;k++){ const a=r()*Math.PI*2, d=I.pond.r*(0.3+r()*0.6); inst("lily",I.pond.x+Math.cos(a)*d,I.pond.y+0.1,I.pond.z+Math.sin(a)*d,r()*6,0.8+r()*0.6,1) } }
  if(!I.hidden){
    const D=dock(I,I.hutAng,24,4.6); I.dock=D;
    const sa=I.hutAng, sx=D.sx-Math.cos(sa)*9, sz=D.sz-Math.sin(sa)*9; const sy=groundAt(sx,sz);
    stall(sx,sy,sz,Math.PI/2-sa+Math.PI,I.sea===2?"#2f5f9d":"#e0453a","#f6efe0"); I.excl.push({x:sx,z:sz,r:9});
    const outfits=[{shirt:"#2f8f5b",hat:"straw",apron:"#f0e6d2",skin:SKINS[0]},{shirt:"#c9502f",hat:"cap",skin:SKINS[2]},{shirt:"#3a6fb0",hat:"straw",skin:SKINS[1],apron:"#e6dccb"},{shirt:"#8a4fb8",hat:"captain",skin:SKINS[3]}];
    npc(outfits[I.seed%4],sx+Math.cos(sa)*1.2,sz+Math.sin(sa)*1.2,Math.PI/2-sa,"merchant",I.n,"Händler");
  } else { const D=dock(I,I.hutAng,16,3.6); I.dock=D }
  const lbl=textSprite(I.n,{size:72,scale:0.16}); lbl.position.set(I.x,Math.max(I.peak,6)+30,I.z); lbl.userData.loc=I.n; lbl.userData.hid=!!I.hidden; lbl.userData.range=I.r*1.5+140; addObj(lbl,I.x); LABELS.push(lbl);
  ({Moosewood:buildMoosewood,"Terrapin Island":buildTerrapin,"Sunstone Island":buildSunstone,"Snowcap Island":buildSnowcap,"Castaway Cliffs":buildCastaway,"Keepers Altar":buildAltarNPC,
    Nebelinsel:buildNebel,Ankerheim:buildAnkerheim,"Atlantische Ruinen":buildRuins,Aschefelder:buildAsh,Frostzinnen:buildSpires,Korallenkrone:buildReefcrown,Hexenturm:buildWitch,
    "Roslit Volcano":I=>{ const a=I.hutAng+Math.PI, x=I.x+Math.cos(a)*I.r*0.2, z=I.z+Math.sin(a)*I.r*0.2; npc({shirt:"#1a1a1a",hat:"bandana",hatCol:"#ff3a3a",skin:SKINS[1],pants:"#2a2a2a",hair:"#ff3a3a"},x,z,faceAng(x,z,I.x,I.z),"lq","Roslit Volcano","RoRed","rgba(140,20,20,.92)",{lq:"rored"}) },
    "Forsaken Shores":I=>chest("wreck",I.x+Math.cos(I.hutAng+Math.PI)*I.r*0.62,I.z+Math.sin(I.hutAng+Math.PI)*I.r*0.62,I.n),
    "Crystal Cove":I=>chest("crystal",I.x+Math.cos(I.hutAng+2.4)*I.r*0.35,I.z+Math.sin(I.hutAng+2.4)*I.r*0.35,I.n,2),
    "Lost Jungle":I=>chest("jungle",I.x+Math.cos(I.hutAng+Math.PI)*I.r*0.2,I.z+Math.sin(I.hutAng+Math.PI)*I.r*0.2,I.n,2),
    "Mushgrove Swamp":I=>chest("swamp",I.x+Math.cos(I.hutAng-2)*I.r*0.5,I.z+Math.sin(I.hutAng-2)*I.r*0.5,I.n),
    "Roslit Bay":I=>{ villager(I,0.4,0.35,{shirt:"#e08a3a",hat:"straw",skin:SKINS[2]},"Fischerin Pia",["Das Riff hinter Roslit Bay ist voller bunter Fische. Wirf dort, wo das Wasser türkis leuchtet.","Ruderboote kommen nicht weit. Die Werft in Moosewood verkauft bessere."]) },
  })[I.n]?.(I.n==="Moosewood"||I.n==="Ankerheim"?villageOf(I):I);
  decorate(I);
  CUR_GRP=null; INST_TAG=""; CUR_I=null;
}
/* villages sit near the main dock, not on the hill in the island centre */
function villageOf(I){ const ca=Math.cos(I.hutAng), sa=Math.sin(I.hutAng); let d=0; while(terrainAt(I.x+ca*d,I.z+sa*d)>0.6&&d<I.r*1.5) d+=4; d=Math.max(0,d-100);
  const V=Object.create(I); V.x=I.x+ca*d; V.z=I.z+sa*d; V.r=118; V.real=I; return V }
function villager(I,da,dd,opts,name,lines){ const a=I.hutAng+da; const x=I.x+Math.cos(a)*I.r*dd, z=I.z+Math.sin(a)*I.r*dd; return npc(opts,x,z,Math.random()*6,"villager",I.n,name,"rgba(20,40,30,.8)",{lines,walk:9}) }
function buildMoosewood(I){
  const va=I.hutAng; const hs=[[-0.9,0.45,"#f1e3c6","#c7473d"],[-0.45,0.5,"#dfe7ee","#3d6fb0"],[0.45,0.5,"#e8d2ae","#5c8a3d"],[0.9,0.45,"#f3dccb","#8a4a2f"],[-0.2,0.25,"#e9e4d8","#b8543a"],[0.25,0.28,"#dde6e0","#4f7ac7"]];
  for(const [da,dd,w,rf] of hs){ const a=va+da, x=I.x+Math.cos(a)*I.r*dd, z=I.z+Math.sin(a)*I.r*dd; house(x,groundAt(x,z),z,Math.PI/2-a+Math.PI,w,rf); I.excl.push({x,z,r:9}) }
  const wa=va+1.25; const D2=dock(I,wa,20,5); const wx=D2.sx-Math.cos(wa)*10, wz=D2.sz-Math.sin(wa)*10; const wy=groundAt(wx,wz);
  const shed=merge([P(new THREE.BoxGeometry(12,7,10),"#9a6a40",0,3.5,0),P(new THREE.BoxGeometry(13,.6,11),"#6b4428",0,7.2,0),P(new THREE.ConeGeometry(9,3.5,4),"#4d5a6b",0,9,0,0,Math.PI/4,0,1,1,0.85),P(new THREE.BoxGeometry(6,5,.3),"#3b2a20",0,2.5,5.05)]);
  addMesh(shed,vcMat(),wx,wy,wz,Math.PI/2-wa+Math.PI); addCollider(wx,wz,7); I.excl.push({x:wx,z:wz,r:12});
  const bx=wx+Math.cos(wa)*6.5+Math.cos(wa+Math.PI/2)*5, bz=wz+Math.sin(wa)*6.5+Math.sin(wa+Math.PI/2)*5; const demo=makeBoat(2); demo.position.set(bx,groundAt(bx,bz)+0.6,bz); demo.rotation.y=Math.PI/2-wa; demo.rotation.z=0.08; addObj(demo,bx); addCollider(bx,bz,3);
  npc({shirt:"#3a4a5e",hat:"captain",skin:SKINS[1],hair:"#ddd",beard:"#e8e8e8"},D2.sx-Math.cos(wa)*3,D2.sz-Math.sin(wa)*3,Math.PI/2-wa,"shipwright","Moosewood","Werft","rgba(40,70,120,.9)");
  const aa=va-1.2; const ax=I.x+Math.cos(aa)*I.r*0.5, az=I.z+Math.sin(aa)*I.r*0.5, ay=groundAt(ax,az);
  addMesh(merge([P(new THREE.ConeGeometry(5,5.5,8),"#7b4fb8",0,2.75,0),P(new THREE.ConeGeometry(5.05,1,8),"#ffd24a",0,0.6,0),P(new THREE.BoxGeometry(2,2.6,.3),"#2a1a44",0,1.3,4.1)]),vcMat(),ax,ay,az,Math.PI/2-aa+Math.PI); addCollider(ax,az,4.5); I.excl.push({x:ax,z:az,r:8});
  npc({shirt:"#6a3aa0",hat:"wizard",skin:SKINS[4],hair:"#c9a0ff"},ax+Math.cos(aa)*6,az+Math.sin(aa)*6,Math.PI/2-aa,"appraiser","Moosewood","Appraiser","rgba(90,40,140,.9)");
  // alchemist hut
  const ca=va-0.7; const cx=I.x+Math.cos(ca)*I.r*0.62, cz=I.z+Math.sin(ca)*I.r*0.62, cy=groundAt(cx,cz);
  addMesh(merge([P(new THREE.CylinderGeometry(3.4,3.8,5,8),"#6f8f5a",0,2.5,0),P(new THREE.ConeGeometry(4.6,4,8),"#3f6a3a",0,7,0),P(new THREE.BoxGeometry(1.6,2.6,.3),"#2b2230",0,1.3,3.6),P(new THREE.CylinderGeometry(.9,.7,1,10),"#333",3.8,0.5,2.2)]),vcMat(),cx,cy,cz,Math.PI/2-ca+Math.PI); addCollider(cx,cz,4); I.excl.push({x:cx,z:cz,r:7});
  const cau=addMesh(new THREE.CircleGeometry(.8,16),glowMat("#6fe37b",2.5),cx+Math.cos(ca+0.5)*4.4,cy+1.05,cz+Math.sin(ca+0.5)*4.4,0,false); cau.rotation.x=-Math.PI/2; WITCHLIGHTS.push({x:cau.position.x,y:cau.position.y,z:cau.position.z,c:"#6fe37b"});
  npc({shirt:"#3f6a3a",hat:"hood",hatCol:"#2f5a3a",skin:SKINS[0],robe:"#2f5a3a"},cx+Math.cos(ca)*5.5,cz+Math.sin(ca)*5.5,Math.PI/2-ca,"alchemist","Moosewood","Alchemistin","rgba(30,90,50,.9)");
  // lighthouse
  const la=va+Math.PI+0.2; const lx=I.x+Math.cos(la)*I.r*0.78, lz=I.z+Math.sin(la)*I.r*0.78; let ly=groundAt(lx,lz); const parts=[];
  for(let k=0;k<6;k++) parts.push(P(new THREE.CylinderGeometry(2.6-k*0.18,2.8-k*0.18,4,16),k%2?"#d9443a":"#f7f7f2",0,2+k*4,0));
  parts.push(P(new THREE.CylinderGeometry(2.3,2.3,.5,16),"#333",0,24.2,0),P(new THREE.ConeGeometry(2.4,2.6,16),"#d9443a",0,28.2,0),P(new THREE.CylinderGeometry(2.6,3.2,1.4,16),"#8f8a84",0,-0.3,0));
  addMesh(merge(parts),vcMat(),lx,ly,lz); addCollider(lx,lz,3.2); I.excl.push({x:lx,z:lz,r:6});
  addMesh(new THREE.CylinderGeometry(1.6,1.6,2.4,12),lanternMat,lx,ly+25.8,lz,0,false);
  const beam=new THREE.Mesh(new THREE.ConeGeometry(9,80,20,1,true),new THREE.MeshBasicMaterial({color:0xfff2b0,transparent:true,opacity:0.12,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
  beam.geometry.translate(0,-40,0); beam.rotation.z=Math.PI/2; const piv=new THREE.Group(); piv.position.set(lx,ly+25.8,lz); piv.add(beam); addObj(piv,lx); lighthouseBeam=piv;
  for(let k=0;k<10;k++){ const a=va-0.4+k*0.08, x=I.x+Math.cos(a)*I.r*0.72, z=I.z+Math.sin(a)*I.r*0.72; addMesh(new THREE.BoxGeometry(.3,1.2,.3),stdMat({color:"#8a6a44"}),x,groundAt(x,z)+0.6,z,0,false) }
  for(let k=0;k<8;k++){ const a=va+(k-3.5)*0.22, x=I.x+Math.cos(a)*I.r*0.36, z=I.z+Math.sin(a)*I.r*0.36; const y=groundAt(x,z); addMesh(new THREE.CylinderGeometry(.1,.12,3.4,6),stdMat({color:"#2b2b2b"}),x,y+1.7,z,0,false); LANTERNS.push(addMesh(new THREE.BoxGeometry(.5,.6,.5),lanternMat,x,y+3.5,z,0,false)) }
  sign(I.x+Math.cos(va)*I.r*0.3+3,I.z+Math.sin(va)*I.r*0.3,Math.PI/2-va,"Moosewood");
  villager(I,-0.3,0.4,{shirt:"#c9502f",hat:"straw",skin:SKINS[1],apron:"#f0e6d2"},"Bäuerin Greta",["Man sagt, im Osten, weit hinter Castaway, hängt ein Nebel, der sich nie verzieht. Dort lebt ein Einsiedler.","Mein Mann hat mal einen Mistwhale gesehen. Im Nebel, nachts. Seitdem angelt er nicht mehr."]);
  villager(I,0.3,0.3,{shirt:"#3a6fb0",hat:"cap",skin:SKINS[3]},"Matrose Jens",["Die Klippen von Castaway sind ein Ring. Ein Schmuggler hat mir erzählt, auf der Rückseite gibt es eine schmale Lücke.","Weit im Süden dreht sich ein riesiger Mahlstrom. Mit dem Hochseeboot und Level 25 kommst du hindurch, in die Zweite See."]);
  villager(I,0.05,0.18,{shirt:"#8a4fb8",hat:"beanie",hatCol:"#3a6fb0",skin:SKINS[0]},"Lotte",["Auf dem Gipfel von Snowcap brennt nachts ein Licht. Wer steigt schon da hoch?","Relikte fängst du manchmal. Am Keepers Altar ganz im Norden verzaubert man damit Ruten."]);
  villager(I,-0.6,0.3,{shirt:"#2f8f5b",hat:null,skin:SKINS[2],hair:"#d9a441"},"Timo",["Wenn du eine Schatzkarte angelst: Folge dem roten Strahl und drück E, um zu graben.","Jede Rute wird besser, je mehr du mit ihr fängst. Meisterschaft nennen das die Alten."]);
}
function buildTerrapin(I){ const a=I.hutAng+Math.PI*0.8, x=I.x+Math.cos(a)*I.r*0.35, z=I.z+Math.sin(a)*I.r*0.35, y=groundAt(x,z);
  addMesh(merge([P(new THREE.CylinderGeometry(2.6,3.6,13,8),"#efe4cc",0,6.5,0),P(new THREE.ConeGeometry(3.4,4,8),"#b8543a",0,15,0),P(new THREE.BoxGeometry(1.4,2.4,.3),"#6b4428",0,1.2,3.3)]),vcMat(),x,y,z,faceAng(x,z,I.x,I.z)); addCollider(x,z,3.6); I.excl.push({x,z,r:8});
  const fr=faceAng(x,z,I.x,I.z); const hub=new THREE.Group(); hub.position.set(x+Math.sin(fr)*3.1,y+12,z+Math.cos(fr)*3.1); hub.rotation.y=fr;
  const bl=new THREE.Group(); for(let k=0;k<4;k++){ const b=new THREE.Mesh(new THREE.BoxGeometry(1.4,8,.15),stdMat({color:"#f6efe0"})); b.position.y=4.4; const arm=new THREE.Group(); arm.rotation.z=k*Math.PI/2; arm.add(b); bl.add(arm) } hub.add(bl); addObj(hub,x); SPINNERS.push({o:bl,axis:"z",sp:0.8});
  villager(I,0.5,0.3,{shirt:"#e0c040",hat:"straw",skin:SKINS[0]},"Müller Karl",["Die Mühle dreht sich schneller, wenn Wind aufkommt. Bei Wind beißen andere Fische.","Bei Nebel lohnt sich die Suche nach dem Nebel im Osten. Nebelfische gibt es nur dann."]) }
function buildSunstone(I){ for(let k=0;k<3;k++){ const a=I.hutAng+Math.PI+(k-1)*0.9, x=I.x+Math.cos(a)*I.r*0.45, z=I.z+Math.sin(a)*I.r*0.45, y=groundAt(x,z);
  addMesh(new THREE.TorusGeometry(6-k,1.3,6,12,Math.PI),stdMat({color:"#c9864e",flatShading:true}),x,y-0.5,z,a); addCollider(x+Math.cos(a+Math.PI/2)*(6-k),z+Math.sin(a+Math.PI/2)*(6-k),1.5); addCollider(x-Math.cos(a+Math.PI/2)*(6-k),z-Math.sin(a+Math.PI/2)*(6-k),1.5) }
  chest("sunstone",I.x+Math.cos(I.hutAng+Math.PI)*I.r*0.45,I.z+Math.sin(I.hutAng+Math.PI)*I.r*0.45,I.n) }
function buildSnowcap(I){ const x=I.x, z=I.z, y=groundAt(x,z);
  addMesh(merge([P(new THREE.BoxGeometry(6,.6,6),"#8e9aa6",0,0.3,0),P(new THREE.BoxGeometry(4.4,3.2,4.4),"#b8543a",0,2.2,0),P(new THREE.ConeGeometry(4.6,2,4),"#3a3a4a",0,4.8,0,0,Math.PI/4),P(new THREE.ConeGeometry(3.2,1.8,4),"#3a3a4a",0,6.2,0,0,Math.PI/4),P(new THREE.BoxGeometry(1.2,2,.2),"#2b1a14",0,1.6,2.25)]),vcMat(),x+3,y,z-2,0.4);
  addCollider(x+3,z-2,3.4); LANTERNS.push(addMesh(new THREE.BoxGeometry(.6,.7,.6),lanternMat,x+0.3,y+3.3,z+0.8,0,false));
  const flagC=["#e0453a","#ffd24a","#5fd8ff","#6fe37b","#ffffff"]; for(let k=0;k<9;k++){ const t=k/8; const fx=lerp(x-7,x+8,t), fz=lerp(z+5,z-7,t); addMesh(new THREE.PlaneGeometry(.9,1.1),stdMat({color:flagC[k%5],side:THREE.DoubleSide}),fx,groundAt(fx,fz)+3.6-Math.sin(t*Math.PI)*0.8,fz,0.7,false) }
  npc({shirt:"#c9643a",hat:"beanie",hatCol:"#e0a040",skin:SKINS[2],robe:"#c9643a",hair:"#222"},x-2,z+2,0.4,"lq","Snowcap Island","Gipfelmönch Tenzin","rgba(120,60,20,.9)",{lq:"tenzin"});
  chest("summit",x-4,z-3,I.n,2) }
function buildCastaway(I){ const x=I.x, z=I.z, y=groundAt(x,z);
  addMesh(merge([P(new THREE.CylinderGeometry(3,3.4,.5,8),"#8a6a44",0,0.25,0),P(new THREE.CylinderGeometry(.2,.2,4,6),"#6b4428",2.4,2.2,0),P(new THREE.CylinderGeometry(.2,.2,4,6),"#6b4428",-2.4,2.2,0),P(new THREE.ConeGeometry(4.2,2.4,8),"#d8c07a",0,4.8,0)]),vcMat(),x+2.5,y,z+1.5); addCollider(x+2.5,z+1.5,2.4);
  for(let k=0;k<3;k++){ const a=k*2.1+0.5; inst("palm",x+Math.cos(a)*6.5,groundAt(x+Math.cos(a)*6.5,z+Math.sin(a)*6.5)-0.2,z+Math.sin(a)*6.5,a,0.8,1) }
  npc({shirt:"#2a2a3a",hat:"bandana",hatCol:"#b8243a",skin:SKINS[1],hair:"#2a1a14",pants:"#4a3a2a"},x-2,z-1.5,faceAng(x,z,I.x+Math.cos(I.chanAng)*50,I.z+Math.sin(I.chanAng)*50),"lq","Castaway Cliffs","Schmugglerin Mara","rgba(120,20,40,.9)",{lq:"mara"});
  chest("lagoon",x-3,z+4,I.n,2); I.excl.push({x,z,r:12});
  const ca=I.chanAng; for(const s of [-1,1]){ const bx=I.x+Math.cos(ca+s*0.2)*I.r*0.98, bz=I.z+Math.sin(ca+s*0.2)*I.r*0.98; addMesh(new THREE.CylinderGeometry(.25,.3,3,6),stdMat({color:"#5b3b22"}),bx,0.5,bz,0,false) } }
function buildAltarNPC(I){ const a=I.hutAng; const x=I.x+Math.cos(a)*I.r*0.28, z=I.z+Math.sin(a)*I.r*0.28;
  npc({shirt:"#5a6aa0",hat:"hood",hatCol:"#3a4a80",skin:SKINS[4],robe:"#3a4a80",beard:"#dfe6ee"},x,z,faceAng(x,z,I.x+Math.cos(a)*I.r,I.z+Math.sin(a)*I.r),"altar",I.n,"Altarhüter Orin","rgba(50,60,140,.9)") }
function buildNebel(I){ const a=I.hutAng+Math.PI*0.6; const x=I.x+Math.cos(a)*I.r*0.25, z=I.z+Math.sin(a)*I.r*0.25, y=groundAt(x,z);
  addMesh(merge([P(new THREE.BoxGeometry(6,4.2,5),"#6b6a62",0,2.1,0),P(new THREE.ConeGeometry(5,3,4),"#3f443e",0,5.6,0,0,Math.PI/4),P(new THREE.BoxGeometry(1.4,2.4,.2),"#2b2520",0,1.2,2.55),P(new THREE.BoxGeometry(.8,2.4,.8),"#555",1.8,6,-1)]),vcMat(),x,y,z,faceAng(x,z,I.x,I.z)+Math.PI); addCollider(x,z,3.8); I.excl.push({x,z,r:7});
  LANTERNS.push(addMesh(new THREE.BoxGeometry(.6,.7,.6),lanternMat,x+Math.cos(I.hutAng)*4,y+2.2,z+Math.sin(I.hutAng)*4,0,false));
  const nx=x+Math.cos(I.hutAng)*5, nz=z+Math.sin(I.hutAng)*5; npc({shirt:"#6a7480",hat:"hood",hatCol:"#8a939c",skin:SKINS[0],beard:"#cfd6dd",robe:"#6a7480"},nx,nz,faceAng(nx,nz,I.dock.ex,I.dock.ez),"lq","Nebelinsel","Einsiedler Aldo","rgba(80,90,100,.9)",{lq:"aldo"});
  chest("fog",I.x+Math.cos(a+2.2)*I.r*0.35,I.z+Math.sin(a+2.2)*I.r*0.35,I.n,2) }
function buildAnkerheim(I){ const va=I.hutAng; const cols=[["#e8d9c0","#9a3a2e"],["#dfe7ee","#2f5f9d"],["#f0e0c8","#4f7a3a"],["#e6d0d8","#7a3a6a"],["#e9e4d8","#b8543a"],["#d8e0e8","#2b3a52"]];
  for(let k=0;k<7;k++){ const a=va-0.95+k*0.32, d=I.r*0.46, x=I.x+Math.cos(a)*d, z=I.z+Math.sin(a)*d; if(Math.abs(angDiff(a,va))<0.12) continue; const cc=cols[k%cols.length]; house(x,groundAt(x,z),z,Math.PI/2-a+Math.PI,cc[0],cc[1],1.15); I.excl.push({x,z,r:10}) }
  for(let k=0;k<6;k++){ const a=va-0.8+k*0.32+0.16, d=I.r*0.24, x=I.x+Math.cos(a)*d, z=I.z+Math.sin(a)*d; const cc=cols[(k+3)%cols.length]; house(x,groundAt(x,z),z,Math.PI/2-a+Math.PI,cc[0],cc[1],0.95); I.excl.push({x,z,r:9}) }
  // bell tower in the centre
  const tx=I.x-Math.cos(va)*I.r*0.05, tz=I.z-Math.sin(va)*I.r*0.05, ty=groundAt(tx,tz);
  addMesh(merge([P(new THREE.BoxGeometry(6,20,6),"#d8cfb6",0,10,0),P(new THREE.BoxGeometry(6.6,.6,6.6),"#a39d8a",0,20.3,0),P(new THREE.ConeGeometry(5,7,4),"#2f5f9d",0,24.2,0,0,Math.PI/4),P(new THREE.CylinderGeometry(1.4,1.8,2,12),"#d9a441",0,18,0),P(new THREE.CylinderGeometry(2.2,2.2,.4,24),"#fff",0,14,3.05,Math.PI/2)]),vcMat(),tx,ty,tz,Math.PI/2-va); addCollider(tx,tz,4.4); I.excl.push({x:tx,z:tz,r:8});
  // extra piers with a moored ship
  for(const s of [-1,1]){ const a=va+s*0.55; const D=dock(I,a,30,5); if(s>0){ const sh=makeBoat(3); const px=D.sx+Math.cos(a)*18+Math.cos(a+Math.PI/2)*6.5, pz=D.sz+Math.sin(a)*18+Math.sin(a+Math.PI/2)*6.5; sh.position.set(px,0.2,pz); sh.rotation.y=Math.PI/2-a; sh.scale.setScalar(1.3); addObj(sh,px); FLOATERS.push({m:sh,base:0.2,ph:3}); addCollider(px,pz,5) }
    const bx=D.sx-Math.cos(a)*4, bz=D.sz-Math.sin(a)*4; for(let k=0;k<4;k++) inst(k%2?"barrel":"crate",bx+Math.cos(a+Math.PI/2)*(3+k*1.6),groundAt(bx,bz),bz+Math.sin(a+Math.PI/2)*(3+k*1.6),k,1,1) }
  for(let k=0;k<10;k++){ const a=va+(k-4.5)*0.2, x=I.x+Math.cos(a)*I.r*0.62, z=I.z+Math.sin(a)*I.r*0.62; const y=groundAt(x,z); inst("lamp",x,y,z,0,1,1); LANTERNS.push(addMesh(new THREE.BoxGeometry(.6,.7,.6),lanternMat,x,y+5.2,z,0,false)) }
  const alA=va+Math.PI*0.75, alx=I.x+Math.cos(alA)*I.r*0.55, alz=I.z+Math.sin(alA)*I.r*0.55, aly=groundAt(alx,alz);
  addMesh(new THREE.CylinderGeometry(3,3.8,1.4,8),stdMat({color:"#7d8199"}),alx,aly+0.7,alz); const orb=addMesh(new THREE.SphereGeometry(1.6,20,14),glowMat("#bfe6ff",2.2),alx,aly+4.6,alz,0,false); SWIRLS.push({orb,y:aly+4.6}); addCollider(alx,alz,3.8); I.excl.push({x:alx,z:alz,r:8});
  npc({shirt:"#5a6aa0",hat:"hood",hatCol:"#2b3a70",skin:SKINS[3],robe:"#2b3a70"},alx+Math.cos(alA)*-5,alz+Math.sin(alA)*-5,faceAng(alx,alz,I.x,I.z)+Math.PI,"altar",I.n,"Altarhüterin Nerea","rgba(50,60,140,.9)");
  const apA=va-Math.PI*0.72, apx=I.x+Math.cos(apA)*I.r*0.5, apz=I.z+Math.sin(apA)*I.r*0.5, apy=groundAt(apx,apz);
  addMesh(merge([P(new THREE.ConeGeometry(5,5.5,8),"#2f5f9d",0,2.75,0),P(new THREE.ConeGeometry(5.05,1,8),"#ffd24a",0,0.6,0)]),vcMat(),apx,apy,apz); addCollider(apx,apz,4.5); I.excl.push({x:apx,z:apz,r:8});
  npc({shirt:"#2b3a70",hat:"wizard",skin:SKINS[1],hair:"#9fd8ff"},apx+Math.cos(apA)*-6,apz+Math.sin(apA)*-6,faceAng(apx,apz,I.x,I.z)+Math.PI,"appraiser",I.n,"Appraiser","rgba(90,40,140,.9)");
  const chA=va+0.95, chx=I.x+Math.cos(chA)*I.r*0.3, chz=I.z+Math.sin(chA)*I.r*0.3;
  npc({shirt:"#3f6a3a",hat:"hood",hatCol:"#2f5a3a",skin:SKINS[2],robe:"#1f4a2a"},chx,chz,faceAng(chx,chz,I.x+Math.cos(va)*I.r,I.z+Math.sin(va)*I.r),"alchemist",I.n,"Alchemist Bram","rgba(30,90,50,.9)");
  villager(I,-0.3,0.34,{shirt:"#2b3a52",hat:"captain",skin:SKINS[1],beard:"#8a6a44"},"Käpt'n Ruud",["Am Ostrand der Zweiten See steht ein schiefer Turm. Eine Hexe wohnt da, heißt es.","Die Hexe redet nur mit Leuten, die schon drei Meisterruten tragen."]);
  villager(I,0.35,0.36,{shirt:"#b8543a",hat:"bandana",skin:SKINS[3]},"Hafenkind Mo",["Im Abgrund der Stille schauen dich Augen an. Ich fahr da nicht mehr hin!","Der Mahlstrom im Westen bringt dich zurück in die Erste See."]);
  villager(I,0.1,0.14,{shirt:"#e0c040",hat:"straw",skin:SKINS[0],apron:"#f0e6d2"},"Fischhändlerin Ilse",["Das Kapitänsgebräu beim Alchemisten ist teuer, aber es wirkt Wunder.","Bei Polarlicht glitzert das Wasser grün. Dann gibt es Aurora-Mutationen."]);
  villager(I,-0.7,0.2,{shirt:"#6a3aa0",hat:"tricorn",skin:SKINS[4]},"Pirat Knut",["Auf Frostzinnen sollen zwischen den Eisnadeln Schätze liegen.","Legendäre Ruten kann man nicht kaufen. Die Meister verlangen Beweise."]);
  sign(I.x+Math.cos(va)*I.r*0.36+4,I.z+Math.sin(va)*I.r*0.36,Math.PI/2-va,"Ankerheim");
}
function buildRuins(I){ const r=rng(I.seed+5); const cx=I.x, cz=I.z;
  const cy=groundAt(cx,cz); addMesh(merge([P(new THREE.BoxGeometry(20,1.2,20),"#e2d9c2",0,0.6,0),P(new THREE.BoxGeometry(15,1.2,15),"#d8cfb6",0,1.8,0),P(new THREE.BoxGeometry(10,1.2,10),"#e2d9c2",0,3.0,0)]),vcMat(),cx,cy-0.3,cz,0.3);
  PLATFORMS.push({x:cx,z:cz,circle:true,r:9.6,y:cy+0.9,bound:12},{x:cx,z:cz,circle:true,r:7.2,y:cy+2.1,bound:12},{x:cx,z:cz,circle:true,r:4.8,y:cy+3.3,bound:12}); I.excl.push({x:cx,z:cz,r:14});
  for(let k=0;k<4;k++){ const a=k*Math.PI/2+0.3+Math.PI/4, x=cx+Math.cos(a)*4, z=cz+Math.sin(a)*4; addMesh(GEO.column,vcMat(),x,cy+3.3,z,0); addCollider(x,z,1.2) }
  addMesh(merge([P(new THREE.BoxGeometry(12,1.2,12),"#d8cfb6",0,0,0),P(new THREE.ConeGeometry(8.6,4,4),"#e2d9c2",0,2.6,0,0,Math.PI/4)]),vcMat(),cx,cy+14.1,cz,0.3);
  const statue=merge([P(new THREE.BoxGeometry(2,4,1.4),"#c9d8d0",0,2,0),P(new THREE.SphereGeometry(.9,10,8),"#c9d8d0",0,4.8,0),P(new THREE.CylinderGeometry(.15,.15,7,6),"#e0c060",1.4,3.5,0),P(new THREE.ConeGeometry(.5,1.2,3),"#e0c060",1.4,7.4,0)]);
  addMesh(statue,vcMat(),cx,cy+3.3,cz,0.3); addCollider(cx,cz,1.3);
  for(let ring=0;ring<2;ring++){ const n=ring?14:9, rr=I.r*(ring?0.62:0.36); for(let k=0;k<n;k++){ const a=k/n*Math.PI*2+ring*0.2, x=cx+Math.cos(a)*rr, z=cz+Math.sin(a)*rr; const h=groundAt(x,z); if(h<1) continue; const broken=r()<0.45; inst(broken?"bcolumn":"column",x,h-0.2,z,r()*6,0.9+r()*0.3,0.9+r()*0.2); addCollider(x,z,1.3); I.excl.push({x,z,r:2.5}) } }
  for(let k=0;k<3;k++){ const a=I.hutAng+Math.PI+(k-1)*1.1, x=cx+Math.cos(a)*I.r*0.5, z=cz+Math.sin(a)*I.r*0.5, h=groundAt(x,z);
    addMesh(merge([P(new THREE.BoxGeometry(1.6,9,1.6),"#e2d9c2",-4,4.5,0),P(new THREE.BoxGeometry(1.6,9,1.6),"#e2d9c2",4,4.5,0),P(new THREE.BoxGeometry(10,1.6,2),"#d8cfb6",0,9.6,0)]),vcMat(),x,h,z,a); addCollider(x+Math.cos(a+Math.PI/2)*4,z+Math.sin(a+Math.PI/2)*4,1.2); addCollider(x-Math.cos(a+Math.PI/2)*4,z-Math.sin(a+Math.PI/2)*4,1.2) }
  chest("ruins",cx+Math.cos(0.3)*3,cz+Math.sin(0.3)*3,I.n,3) }
function buildAsh(I){ const r=rng(I.seed+3); const cy=rawH(I,I.x,I.z);
  const lava=addMesh(new THREE.CircleGeometry(I.r*0.14,24),glowMat("#ff5a1a",2.4),I.x,cy+1.5,I.z,0,false); lava.rotation.x=-Math.PI/2; I.lavaY=cy+1.5;
  for(let k=0;k<9;k++){ const a=r()*6.28, d=I.r*(0.3+r()*0.45), x=I.x+Math.cos(a)*d, z=I.z+Math.sin(a)*d, h=groundAt(x,z); if(h<1.5) continue; inst("geyser",x,h,z,r()*6,1,1); GEYSERS.push({x,z,y:h+0.3,ph:r()*20,per:7+r()*6}); I.excl.push({x,z,r:3}) }
  const a=I.hutAng+2.1; chest("ash",I.x+Math.cos(a)*I.r*0.2,I.z+Math.sin(a)*I.r*0.2,I.n,3) }
function buildSpires(I){ const a=I.hutAng+Math.PI*0.9; chest("spires",I.x+Math.cos(a)*I.r*0.4,I.z+Math.sin(a)*I.r*0.4,I.n,3) }
function buildReefcrown(I){ chest("crown",I.x,I.z,I.n,2); addMesh(new THREE.CylinderGeometry(.2,.3,7,6),stdMat({color:"#6b4428"}),I.x+3,4,I.z+2,0,false) }
function buildWitch(I){ const x=I.x-2, z=I.z+1, y=groundAt(x,z); const parts=[];
  for(let k=0;k<5;k++) parts.push(P(new THREE.CylinderGeometry(3.4-k*0.25,3.6-k*0.25,5,10),k%2?"#4a4058":"#3a3248",Math.sin(k*0.9)*0.5*k*0.3,2.5+k*5,k*0.18,0.02*k,0,0.03*k));
  parts.push(P(new THREE.ConeGeometry(4.4,8,10),"#5a2a8a",0.9,31,0.9,0.08,0,0.1),P(new THREE.BoxGeometry(1.6,2.8,.3),"#1a1420",0,1.4,3.5));
  const tw=addMesh(merge(parts),vcMat(),x,y,z,0.6); addCollider(x,z,3.8); I.excl.push({x,z,r:8});
  for(let k=0;k<5;k++){ const wy=y+6+k*4.7, a=k*1.7; const w=addMesh(new THREE.BoxGeometry(.9,1.3,.2),glowMat("#c78bff",1.6),x+Math.cos(a)*3.25,wy,z+Math.sin(a)*3.25,-a+Math.PI/2,false); }
  const cx=x+6, cz=z+4, cyy=groundAt(cx,cz); addMesh(new THREE.CylinderGeometry(1.4,1,1.4,12),stdMat({color:"#222"}),cx,cyy+0.7,cz,0,false); const brew=addMesh(new THREE.CircleGeometry(1.2,16),glowMat("#7dff8a",2.4),cx,cyy+1.42,cz,0,false); brew.rotation.x=-Math.PI/2; WITCHLIGHTS.push({x:cx,y:cyy+1.5,z:cz,c:"#9dff9a"});
  const nx=x+Math.cos(I.hutAng)*6, nz=z+Math.sin(I.hutAng)*6; npc({shirt:"#3a2248",hat:"witch",hatCol:"#2a1a44",skin:"#cfe6d8",robe:"#2a1a44",hair:"#b8a0ff"},nx,nz,faceAng(nx,nz,I.dock.ex,I.dock.ez),"lq","Hexenturm","Tiefseehexe Ysolde","rgba(70,20,110,.92)",{lq:"ysolde"});
  chest("witch",x-5,z-4,I.n,3) }
function decorate(I){
  const r=rng(I.seed*7+1), b=I.biome;
  const T={forest:[["oak",.45],["pine",.4],["bush",.15]],tropic:[["palm",.8],["bush",.2]],meadow:[["bloom",.35],["oak",.35],["bush",.3]],desert:[["cactus",.6],["rock",.4]],swamp:[["mushroom",.4],["mushroom2",.25],["dead",.35]],
    volcano:[["rock",.6],["dead",.4]],snow:[["snowpine",.85],["rock",.15]],wreck:[["palm",.4],["dead",.3],["rock",.3]],cliffring:[["pine",.5],["oak",.3],["rock",.2]],ancient:[["fern",.55],["jungle",.2],["rock",.25]],
    reef:[["palm",1]],jungle:[["jungle",.55],["fern",.3],["bush",.15]],crystal:[["crystal",.7],["rock",.3]],brine:[["salt",.7],["dead",.3]],altar:[["crystal",.3],["rock",.7]],
    fog:[["fogtree",.7],["dead",.2],["rock",.1]],harbor:[["oak",.5],["bush",.3],["bloom",.2]],reefcrown:[["gcoral",.55],["palm",.45]],ash:[["ashrock",.6],["dead",.25],["sparkcrystal",.15]],
    spires:[["spire",.45],["icicle",.35],["snowpine",.2]],ruins:[["palm",.4],["bush",.3],["fern",.3]],witch:[["fogtree",.6],["mushroom",.25],["dead",.15]]}[b];
  const dens={forest:.0048,tropic:.0035,meadow:.004,desert:.0025,swamp:.004,volcano:.002,snow:.005,wreck:.0025,cliffring:.004,ancient:.0045,reef:.004,jungle:.006,crystal:.004,brine:.003,altar:.003,
    fog:.006,harbor:.0012,reefcrown:.004,ash:.003,spires:.0032,ruins:.0022,witch:.008}[b];
  const n=Math.round(Math.PI*I.r*I.r*dens*(LOW?0.5:1.25));
  for(let k=0;k<n;k++){ const a=r()*Math.PI*2, d=Math.sqrt(r())*I.r*0.95, x=I.x+Math.cos(a)*d, z=I.z+Math.sin(a)*d; const h=islandH(I,x,z); if(fbm(x*0.005+I.seed,z*0.005,2)<-0.12&&r()<0.85) continue;
    const ringOK = (b==="reef"||b==="reefcrown") ? h>0.8 : h>1.6; if(!ringOK) continue; if(excluded(I,x,z,3)) continue; if(I.pond&&Math.hypot(x-I.pond.x,z-I.pond.z)<I.pond.r+3) continue;
    let da=Math.atan2(z-I.z,x-I.x)-I.hutAng; da=Math.atan2(Math.sin(da),Math.cos(da)); if(Math.abs(da)<0.3&&d>I.r*0.3) continue;
    if(b==="snow"&&d<I.r*0.14) continue; if(b==="cliffring"&&d<I.r*0.14) continue;
    const type=wpick(Object.fromEntries(T),r()); const s=(type==="spire"?0.6+r()*0.9:type==="gcoral"?0.9+r()*0.7:0.75+r()*0.7); inst(type,x,h-0.15,z,r()*6.28,s,0.85+r()*0.3);
    if(["pine","snowpine","oak","bloom","palm","jungle","fern","mushroom","dead","cactus","fogtree","gcoral"].includes(type)) addCollider(x,z,0.9*s); if(["rock","salt","ashrock","icicle","sparkcrystal"].includes(type)) addCollider(x,z,1.6*s); if(type==="spire") addCollider(x,z,2.6*s) }
  if(["forest","meadow","tropic","wreck","harbor","ruins"].includes(b)) for(let k=0;k<n*2;k++){ const a=r()*Math.PI*2, d=Math.sqrt(r())*I.r*0.8, x=I.x+Math.cos(a)*d, z=I.z+Math.sin(a)*d; const h=islandH(I,x,z); if(h<1.8||excluded(I,x,z,1)) continue; inst("flower",x,h,z,r()*6,0.8+r()*0.8,0.7+r()*0.6) }
  if(I.reefAng!==undefined||b==="reef"||b==="reefcrown"){ const rf=b==="reef"||b==="reefcrown"; for(let k=0;k<(rf?110:45);k++){ const a=rf?r()*Math.PI*2:I.reefAng+(r()-.5)*1.7, d=I.r*(rf?0.15+r()*0.4:1.02+r()*0.45); const x=I.x+Math.cos(a)*d, z=I.z+Math.sin(a)*d; const t=terrainAt(x,z); if(t>-0.8||t<-9) continue; inst(b==="reefcrown"&&r()<0.3?"gcoral":"coral",x,t,z,r()*6,b==="reefcrown"?0.6+r()*0.6:0.8+r()*1.2,0.8+r()*0.4) } }
  if(b==="cliffring"){ for(let k=0;k<30;k++){ const a=r()*6.28, d=I.r*(0.12+r()*0.18), x=I.x+Math.cos(a)*d, z=I.z+Math.sin(a)*d; const t=terrainAt(x,z); if(t>-0.8||t<-6) continue; inst("coral",x,t,z,r()*6,0.8+r()*0.8,1) } }
  if(b==="volcano"){ const cy=rawH(I,I.x,I.z); const lava=addMesh(new THREE.CircleGeometry(I.r*0.14,24),glowMat("#ff5a1a",2.2),I.x,cy+1.5,I.z,0,false); lava.rotation.x=-Math.PI/2; I.lavaY=cy+1.5 }
  if(b==="wreck"){ for(let k=0;k<3;k++){ const a=I.hutAng+Math.PI+(k-1)*0.9, d=I.r*(0.95+k*0.08); const x=I.x+Math.cos(a)*d, z=I.z+Math.sin(a)*d; const wr=makeBoat(3); wr.position.set(x,terrainAt(x,z)+0.8,z); wr.rotation.set(0.25,r()*6,0.45); wr.traverse(o=>{ if(o.material) o.material=stdMat({color:"#4a3526",roughness:1}) }); addObj(wr,x) } }
  if(b==="ancient"||b==="altar"){ const n2=b==="altar"?8:6, rr=b==="altar"?I.r*0.3:I.r*0.22; const cx=b==="altar"?I.x:I.x+Math.cos(I.hutAng+Math.PI)*I.r*0.35, cz=b==="altar"?I.z:I.z+Math.sin(I.hutAng+Math.PI)*I.r*0.35;
    for(let k=0;k<n2;k++){ const a=k/n2*Math.PI*2, x=cx+Math.cos(a)*rr, z=cz+Math.sin(a)*rr; const h=groundAt(x,z); const broken=b==="ancient"&&k%3===1; addMesh(merge([P(new THREE.CylinderGeometry(1,1.15,broken?4:9,10),"#b9b3a0",0,broken?2:4.5,0),P(new THREE.BoxGeometry(2.6,.6,2.6),"#a39d8a",0,0.3,0),...(broken?[]:[P(new THREE.BoxGeometry(2.6,.6,2.6),"#a39d8a",0,9.2,0)])]),vcMat(),x,h,z); addCollider(x,z,1.3) }
    if(b==="altar"){ const h=groundAt(cx,cz); addMesh(new THREE.CylinderGeometry(4,5,1.6,8),stdMat({color:"#7d8199"}),cx,h+0.8,cz); const orb=addMesh(new THREE.SphereGeometry(2.4,24,16),glowMat("#bfe6ff",2.4),cx,h+6,cz,0,false); SWIRLS.push({orb,y:h+6}); addCollider(cx,cz,5) }
    if(b==="ancient"){ for(let k=0;k<7;k++){ const a=I.hutAng+2.2, x=I.x+Math.cos(a)*I.r*0.45+k*1.6*Math.cos(a+Math.PI/2), z=I.z+Math.sin(a)*I.r*0.45+k*1.6*Math.sin(a+Math.PI/2); addMesh(new THREE.TorusGeometry(3.2-Math.abs(k-3)*0.35,.28,6,12,Math.PI),stdMat({color:"#efe8d6"}),x,groundAt(x,z),z,Math.PI/2-a) } } }
  if(b==="brine"){ for(let k=0;k<5;k++){ const a=r()*6.28, d=r()*I.r*0.5, x=I.x+Math.cos(a)*d, z=I.z+Math.sin(a)*d; const h=groundAt(x,z); const pool=addMesh(new THREE.CircleGeometry(3+r()*3,16),new THREE.MeshStandardMaterial({color:"#6dff9a",emissive:new THREE.Color("#2fbf5a"),emissiveIntensity:0.9,roughness:.2}),x,h+0.15,z,0,false); pool.rotation.x=-Math.PI/2 } }
  const nr=Math.round(I.r*0.12); for(let k=0;k<nr;k++){ const a=r()*6.28, d=I.r*(0.75+r()*0.3), x=I.x+Math.cos(a)*d, z=I.z+Math.sin(a)*d; const h=islandH(I,x,z); if(h<-1.5||excluded(I,x,z,2)) continue; if(b==="cliffring"&&Math.abs(angDiff(Math.atan2(z-I.z,x-I.x),I.chanAng))<0.3) continue; inst(b==="ash"?"ashrock":"rock",x,h-0.2,z,r()*6,0.6+r()*1.2,0.9+r()*0.2) }
}

/* ---------- deep zones, rafts, portals ---------- */
function vortexMat(c1,c2,k=1,arms=5){ return new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false,uniforms:{uTime:U.time,uC1:{value:new THREE.Color(c1)},uC2:{value:new THREE.Color(c2)},uK:{value:k},uArms:{value:arms}},
  vertexShader:`varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader:`uniform float uTime,uK,uArms; uniform vec3 uC1,uC2; varying vec2 vUv;
  void main(){ vec2 p=vUv*2.-1.; float r=length(p); if(r>1.) discard; float a=atan(p.y,p.x);
    float sw=sin(a*uArms+log(r+0.03)*10.-uTime*2.4)*0.5+0.5; float sw2=sin(a*3.-r*16.+uTime*1.4)*0.5+0.5;
    float edge=smoothstep(1.,0.6,r); float core=smoothstep(0.32,0.,r);
    vec3 c=mix(uC1,uC2,sw2)*(pow(sw,3.)*0.85+0.12)*edge+uC2*core*0.9;
    gl_FragColor=vec4(c*uK,1.); }`}) }
function buildDeepZone(Z){
  const pal={"Vertigo":["#6a2cff","#ff7af0"],"Desolate Deep":["#1a4a7a","#7fb4ff"],"The Depths":["#0a2a6a","#3fe0ff"],"Abgrund der Stille":["#3a0a5a","#ff3a6a"]}[Z.n]||["#1a4a7a","#7fb4ff"];
  const disc=new THREE.Mesh(new THREE.CircleGeometry(Z.r*1.05,64),vortexMat(pal[0],pal[1],Z.n==="Vertigo"?0.7:0.5,Z.n==="Vertigo"?6:4)); disc.rotation.x=-Math.PI/2; disc.position.set(Z.x,0.55,Z.z); disc.renderOrder=3; addObj(disc,Z.x);
  for(let i=0;i<10;i++){ const a=i/10*Math.PI*2; const b=addMesh(merge([P(new THREE.CylinderGeometry(.9,.9,2.2,10),i%2?"#ff5a5a":"#ffffff",0,0,0),P(new THREE.ConeGeometry(.9,1,10),"#ffd24a",0,1.6,0)]),vcMat(),Z.x+Math.cos(a)*Z.r,0.5,Z.z+Math.sin(a)*Z.r,0,false); FLOATERS.push({m:b,base:0.5,ph:i}) }
  platform(Z.x+Z.r*0.1,Z.z-Z.r*0.1,Z.n,"#3a5a8a");
  const lbl=textSprite(Z.n,{size:72,scale:0.16}); lbl.position.set(Z.x,38,Z.z); lbl.userData.loc=Z.n; lbl.userData.range=Z.r+160; addObj(lbl,Z.x); LABELS.push(lbl);
  const r=rng(hashStr(Z.n));
  if(Z.n==="Vertigo"){ for(let k=0;k<7;k++){ const a=r()*6.28, d=Z.r*(0.3+r()*0.8), x=Z.x+Math.cos(a)*d, z=Z.z+Math.sin(a)*d, s=3+r()*5;
      const g=merge([P(new THREE.ConeGeometry(s,s*2.2,7),"#5a4a7a",0,s*1.1,0),P(new THREE.CylinderGeometry(s,s*0.95,s*0.4,7),"#7ad06a",0,-s*0.1,0),P(new THREE.OctahedronGeometry(s*0.35,0),"#d7b8ff",s*0.4,s*2.1,0,0,0,0,1,2,1)]);
      const m=addMesh(g,new THREE.MeshStandardMaterial({vertexColors:true,flatShading:true,emissive:new THREE.Color("#3a1a6a"),emissiveIntensity:0.5}),x,18+r()*28,z,r()*6); m.rotation.x=Math.PI; ISLETS.push({m,base:m.position.y,ph:r()*6,sp:(r()-.5)*0.4}) } }
  if(Z.n==="The Depths"){ for(let k=0;k<14;k++){ const a=r()*6.28, d=Z.r*(0.25+r()*0.8), x=Z.x+Math.cos(a)*d, z=Z.z+Math.sin(a)*d; const h=2+r()*7; addMesh(new THREE.ConeGeometry(0.5+r()*0.6,h,6),glowMat(r()<0.5?"#3fe0ff":"#7a8cff",1.8),x,h/2-0.8,z,0,false) } }
  if(Z.n==="Desolate Deep"){ for(let k=0;k<4;k++){ const a=r()*6.28, d=Z.r*(0.4+r()*0.5), x=Z.x+Math.cos(a)*d, z=Z.z+Math.sin(a)*d; const m=addMesh(merge([P(new THREE.CylinderGeometry(.35,.45,16,6),"#3a2e26",0,8,0),P(new THREE.BoxGeometry(6,.3,.3),"#3a2e26",0,12,0),P(new THREE.PlaneGeometry(5.4,5),"#8a8478",0,9.2,0.3)]),new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide}),x,-3,z,r()*6); m.rotation.z=(r()-.5)*0.6 }
    for(let k=0;k<10;k++){ const a=r()*6.28, d=Z.r*r(), x=Z.x+Math.cos(a)*d, z=Z.z+Math.sin(a)*d; const o=addMesh(new THREE.SphereGeometry(.45,10,8),glowMat("#9dffcf",2.5),x,3+r()*6,z,0,false); FLOATERS.push({m:o,base:o.position.y,ph:r()*6,amp:1.2}) } }
  if(Z.n==="Abgrund der Stille"){ for(let k=0;k<9;k++){ const a=r()*6.28, d=Z.r*(0.25+r()*0.75), x=Z.x+Math.cos(a)*d, z=Z.z+Math.sin(a)*d; const s=1.2+r()*2.2; const g=new THREE.Group(); g.position.set(x,0.4,z); g.rotation.y=r()*6;
      for(const side of [-1,1]){ const e=new THREE.Mesh(new THREE.SphereGeometry(s,16,10),glowMat("#ffe27a",1.6)); e.scale.set(1,0.55,1); e.position.x=side*s*1.5; const pu=new THREE.Mesh(new THREE.SphereGeometry(s*0.45,10,8),new THREE.MeshBasicMaterial({color:0x0a0005})); pu.scale.set(0.3,0.25,0.9); pu.position.set(side*s*1.5,s*0.48,0); g.add(e,pu) }
      addObj(g,x); EYES.push({g,ph:r()*20}) } }
}
function platform(x,z,loc,roofCol){
  const R=11; const parts=[P(new THREE.CylinderGeometry(R,R,1,16),"#9a6a40",0,0.5,0)]; for(let i=0;i<8;i++){ const a=i/8*Math.PI*2; parts.push(P(new THREE.CylinderGeometry(1.2,1.2,1.8,10),"#e9e2d0",Math.cos(a)*(R-1.4),-0.3,Math.sin(a)*(R-1.4))) }
  parts.push(P(new THREE.BoxGeometry(7,4,4),"#c9a26b",0,3,-R*0.5),P(new THREE.ConeGeometry(5.6,2.6,4),roofCol,0,6.2,-R*0.5,0,Math.PI/4,0,1,1,0.75));
  const m=addMesh(merge(parts),vcMat(),x,0,z); FLOATERS.push({m,base:0,ph:x});
  PLATFORMS.push({x,z,circle:true,r:R,y:1.05,bound:R+1}); addCollider(x,z-R*0.5,3.5);
  npc({shirt:"#2f5f9d",hat:"captain",skin:SKINS[2]},x,z-R*0.15,0,"merchant",loc,loc==="Ocean"?"Meereshändler":loc==="Sturmsee"?"Sturmhändler":"Händler");
  for(const s of [-1,1]){ const l=addMesh(new THREE.BoxGeometry(.5,.6,.5),lanternMat,x+s*R*0.8,2.6,z,0,false); LANTERNS.push(l); addMesh(new THREE.CylinderGeometry(.1,.1,1.6,6),stdMat({color:"#222"}),x+s*R*0.8,1.8,z,0,false) }
}
function buildRaft(R){ platform(R.x,R.z,R.n,R.n==="Ocean"?"#d9443a":"#2b3a52"); const lbl=textSprite(R.n==="Ocean"?"Meereshändler":"Sturmhändler",{size:60,scale:0.12}); lbl.position.set(R.x,22,R.z); lbl.userData.loc=R.n; lbl.userData.range=160; addObj(lbl,R.x); LABELS.push(lbl) }
function buildPortal(Pt){ const d=new THREE.Mesh(new THREE.CircleGeometry(Pt.r,72),vortexMat(Pt.from===1?"#1a6aff":"#ff8a2a",Pt.from===1?"#b8f4ff":"#fff0a0",0.9,7)); d.rotation.x=-Math.PI/2; d.position.set(Pt.x,0.6,Pt.z); d.renderOrder=3; addObj(d,Pt.x);
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(Pt.r*0.25,Pt.r*0.5,420,32,1,true),new THREE.MeshBasicMaterial({color:Pt.from===1?0x7fd8ff:0xffc27a,transparent:true,opacity:.1,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false})); beam.position.set(Pt.x,210,Pt.z); addObj(beam,Pt.x);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(Pt.r*0.9,1.2,8,96),glowMat(Pt.from===1?"#9fe8ff":"#ffd28a",2)); ring.rotation.x=Math.PI/2; ring.position.set(Pt.x,1.2,Pt.z); addObj(ring,Pt.x);
  const lbl=textSprite(Pt.from===1?"Mahlstrom · Zweite See":"Mahlstrom · Erste See",{size:72,scale:0.16,color:Pt.from===1?"#bff0ff":"#ffe0a8"}); lbl.position.set(Pt.x,48,Pt.z); lbl.userData.range=Pt.r+260; addObj(lbl,Pt.x); LABELS.push(lbl);
  PORTAL_FX.push({Pt,ring,beam}) }

/* ---------- event & school visuals ---------- */
const evRing=new THREE.Mesh(new THREE.TorusGeometry(1,0.012,8,96),new THREE.MeshBasicMaterial({color:0xff6a3c,transparent:true,opacity:.9})); evRing.rotation.x=Math.PI/2; scene.add(evRing);
const evBeam=new THREE.Mesh(new THREE.CylinderGeometry(4,6,600,20,1,true),new THREE.MeshBasicMaterial({color:0xff7b54,transparent:true,opacity:.16,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false})); scene.add(evBeam);
const evFin=new THREE.Mesh(new THREE.ConeGeometry(2.2,6,3),stdMat({color:"#2a2f36"})); evFin.scale.z=.35; scene.add(evFin);
const schoolRing=new THREE.Mesh(new THREE.RingGeometry(0.96,1,64),new THREE.MeshBasicMaterial({color:0x9ff3ff,transparent:true,opacity:.4,depthWrite:false,side:THREE.DoubleSide})); schoolRing.rotation.x=-Math.PI/2; scene.add(schoolRing);

/* ---------- fish shadows in the water ---------- */
const shadowGeo=(()=>{ const s=new THREE.Shape(); s.moveTo(1,0); s.quadraticCurveTo(0.6,0.42,-0.3,0.3); s.quadraticCurveTo(-0.7,0.2,-0.85,0.05); s.lineTo(-1.25,0.38); s.lineTo(-1.1,0); s.lineTo(-1.25,-0.38); s.lineTo(-0.85,-0.05); s.quadraticCurveTo(-0.7,-0.2,-0.3,-0.3); s.quadraticCurveTo(0.6,-0.42,1,0);
  const g=new THREE.ShapeGeometry(s,12); g.rotateX(-Math.PI/2); return g })();
const shadowMat=new THREE.MeshBasicMaterial({color:0x06131f,transparent:true,opacity:.42,depthWrite:false});
const glowRingGeo=new THREE.RingGeometry(0.7,1,32); glowRingGeo.rotateX(-Math.PI/2);

/* ---------- bite marks: animated "!" above the bobber, fancier the rarer the fish (visible to everyone) ---------- */
const MARKSTYLE=[ // by rarity index
  {t:"!",g:["#ffffff","#cfd8e3"],s:1.5,life:1.25},                                   // Common
  {t:"!",g:["#e9ffe6","#7ee07a"],s:1.6,life:1.3},                                    // Uncommon
  {t:"!",g:["#fbffd8","#c9e04a"],s:1.8,life:1.4,wob:1},                              // Unusual
  {t:"!",g:["#e2f2ff","#2f86ff"],s:2.1,life:1.7,glow:"#52a8ff",spark:"#9fd4ff"},     // Rare
  {t:"!!",g:["#fff6c8","#ff9d1a"],s:2.5,life:2.0,glow:"#ffb23a",rays:"#ffd24a",spark:"#ffe27a"}, // Legendary
  {t:"!!",g:["#ffe0ec","#ff2f7a"],s:2.7,life:2.2,glow:"#ff5a93",rays:"#ff7ab0",ring:"#ff5a93",spark:"#ffb3cf",pulse:1}, // Mythical
  {t:"!!!",g:["rainbow"],s:2.9,life:2.4,glow:"#c78bff",rays:"rainbow",ring:"#c78bff",spark:"#e0c8ff",pulse:1}, // Exotic
  {t:"?!",g:["#ffffff","#8a8a9a"],s:2.8,life:2.4,dark:1,glitch:1,ring:"#e8e8e8",spark:"#ffffff"},             // Secret
  {t:"!!!",g:["#dfe6ff","#3a5aff"],s:3.0,life:2.4,glow:"#4a6aff",rays:"#7a90ff",ring:"#4a6aff",spark:"#aabaff",pulse:1}, // Limited
  {t:"!!!",g:["#ffe0d8","#ff2020"],s:3.2,life:2.6,glow:"#ff4040",rays:"#ff5a3a",ring:"#ff4040",spark:"#ffb09a",pulse:1,shake:1}, // Apex
  {t:"!!!",g:["#ffffff","#ffb8f0"],s:3.4,life:3.0,glow:"#ffd6ff",rays:"#fff0a0",ring:"#ffe27a",spark:"#fff6d0",pulse:1,beam:1,halo:1}, // Divine
];
const MTEX={};
function markTextTex(i){ if(MTEX["t"+i]) return MTEX["t"+i]; const st=MARKSTYLE[i]; const c=document.createElement("canvas"); c.width=c.height=256; const x=c.getContext("2d");
  const fs=st.t.length>2?150:st.t.length>1?176:200; x.font=`700 ${fs}px Fredoka, "Arial Black", sans-serif`; x.textAlign="center"; x.textBaseline="middle";
  let fill; if(st.g[0]==="rainbow"){ fill=x.createLinearGradient(30,0,226,0); ["#ff4a4a","#ffb23a","#fff04a","#6fe37b","#4ad8ff","#7a6aff","#e05aff"].forEach((cc,k,a)=>fill.addColorStop(k/(a.length-1),cc)) }
  else { fill=x.createLinearGradient(0,40,0,220); fill.addColorStop(0,st.g[0]); fill.addColorStop(1,st.g[1]) }
  x.lineJoin="round"; if(st.glow){ x.shadowColor=st.glow; x.shadowBlur=26 } x.lineWidth=st.t.length>2?20:24; x.strokeStyle=st.dark?"#05050a":"#140c1e"; x.strokeText(st.t,128,136);
  x.shadowBlur=0; x.fillStyle=fill; x.fillText(st.t,128,136); x.lineWidth=5; x.strokeStyle="rgba(255,255,255,.55)"; x.globalCompositeOperation="source-atop"; x.strokeText(st.t,126,130);
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return MTEX["t"+i]=t }
function raysTex(){ if(MTEX.rays) return MTEX.rays; const c=document.createElement("canvas"); c.width=c.height=256; const x=c.getContext("2d"); x.translate(128,128);
  for(let k=0;k<14;k++){ x.rotate(Math.PI*2/14); const g=x.createLinearGradient(0,0,0,-128); g.addColorStop(0,"rgba(255,255,255,.9)"); g.addColorStop(1,"rgba(255,255,255,0)"); x.fillStyle=g; x.beginPath(); x.moveTo(0,0); x.lineTo(-11-(k%2)*6,-128); x.lineTo(11+(k%2)*6,-128); x.closePath(); x.fill() }
  const t=new THREE.CanvasTexture(c); return MTEX.rays=t }
function ringTex(){ if(MTEX.ring) return MTEX.ring; const c=document.createElement("canvas"); c.width=c.height=256; const x=c.getContext("2d"); const g=x.createRadialGradient(128,128,70,128,128,126); g.addColorStop(0,"rgba(255,255,255,0)"); g.addColorStop(0.75,"rgba(255,255,255,.95)"); g.addColorStop(1,"rgba(255,255,255,0)"); x.fillStyle=g; x.fillRect(0,0,256,256); return MTEX.ring=new THREE.CanvasTexture(c) }
const MARKS=[];
function spriteM(tex,col,add,op=1){ const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,color:new THREE.Color(col||"#ffffff"),transparent:true,depthWrite:false,fog:false,opacity:op,blending:add?THREE.AdditiveBlending:THREE.NormalBlending,toneMapped:false})); s.renderOrder=9; return s }
function spawnBiteMark(x,y,z,ri,scale=1){ ri=clamp(ri|0,0,MARKSTYLE.length-1); const st=MARKSTYLE[ri]; const g=new THREE.Group(); g.position.set(x,y,z); scene.add(g);
  const m={g,ri,st,t:0,parts:{},scale};
  if(st.rays){ const r=spriteM(raysTex(),st.rays==="rainbow"?"#ffffff":st.rays,true,0.85); g.add(r); m.parts.rays=r }
  if(st.glow||st.dark){ const gl=spriteM(dotTex,st.dark?"#000000":st.glow,!st.dark,st.dark?0.75:0.9); g.add(gl); m.parts.glow=gl }
  if(st.ring){ const r=spriteM(ringTex(),st.ring,true,1); g.add(r); m.parts.ring=r }
  if(st.halo){ const h=spriteM(ringTex(),"#fff6c8",true,0.9); g.add(h); m.parts.halo=h }
  const tx=spriteM(markTextTex(ri),"#ffffff",false,1); tx.renderOrder=12; g.add(tx); m.parts.txt=tx; if(m.parts.rays) m.parts.rays.renderOrder=8; if(m.parts.glow) m.parts.glow.renderOrder=7;
  if(st.beam){ const b=new THREE.Mesh(new THREE.CylinderGeometry(1.2,2.6,160,20,1,true),new THREE.MeshBasicMaterial({color:0xfff0ff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false})); b.position.set(x,80,z); scene.add(b); m.beam=b }
  if(st.spark){ const n=ri>=6?70:ri>=4?45:ri>=3?20:0; for(let i=0;i<n;i++){ const a=Math.random()*6.28, s=3+Math.random()*7; GLOW.emit(x,y+1.5,z,Math.cos(a)*s,2+Math.random()*7,Math.sin(a)*s,0.9+Math.random()*0.7,0.6+Math.random()*0.8,st.spark,-5,1.5) } }
  if(ri>=5) for(let i=0;i<24;i++){ const a=i/24*6.28; FX.emit(x,y-2.5,z,Math.cos(a)*7,3,Math.sin(a)*7,0.6,0.7,"#eaf8ff",-10) }
  MARKS.push(m); return m }
function updateBiteMarks(dt,t){ for(let i=MARKS.length-1;i>=0;i--){ const m=MARKS[i], st=m.st; m.t+=dt; const T=m.t, L=st.life;
  const pop=T<0.16?smooth(T/0.16)*1.3:T<0.32?lerp(1.3,1,smooth((T-0.16)/0.16)):1; const fade=clamp((L-T)/0.35,0,1); const S=st.s*m.scale*1.45;
  const pul=st.pulse?1+Math.sin(T*14)*0.07:1; const P=m.parts;
  P.txt.scale.setScalar(S*pop*pul); P.txt.position.y=2.4+T*0.6+(st.wob?Math.sin(T*18)*0.12:0); P.txt.material.opacity=fade; P.txt.material.rotation=st.wob?Math.sin(T*16)*0.12*(1-T/L):0;
  if(st.glitch){ const on=Math.random()<0.85; P.txt.material.opacity=fade*(on?1:0.25); P.txt.position.x=(Math.random()<0.2?(Math.random()-.5)*0.6:0); }
  if(P.glow){ P.glow.scale.setScalar(S*2.6*pop*(1+Math.sin(T*9)*0.08)); P.glow.position.y=P.txt.position.y; P.glow.material.opacity=fade*(st.dark?0.7:0.45) }
  if(P.rays){ P.rays.scale.setScalar(S*3.4*pop); P.rays.position.y=P.txt.position.y; P.rays.material.rotation=T*(m.ri>=6?1.6:0.9); P.rays.material.opacity=fade*0.5; if(st.rays==="rainbow") P.rays.material.color.setHSL((t*0.35)%1,0.9,0.65) }
  if(P.ring){ const k=clamp(T/0.7,0,1); P.ring.scale.setScalar(S*(1+k*4)); P.ring.position.y=0.3; P.ring.material.opacity=(1-k)*0.9 }
  if(P.halo){ P.halo.scale.setScalar(S*1.9*pop); P.halo.position.y=P.txt.position.y+S*0.75; P.halo.material.opacity=fade*0.8; P.halo.material.rotation=-T }
  if(m.beam) m.beam.material.opacity=fade*0.22*clamp(T*3,0,1);
  if(st.spark&&m.ri>=4&&Math.random()<dt*30*fade){ const p=m.g.position; GLOW.emit(p.x+(Math.random()-.5)*S*2,p.y+2+Math.random()*S*1.5,p.z+(Math.random()-.5)*S*2,0,1.5,0,0.8,0.5,st.spark,-0.5) }
  if(T>=L){ scene.remove(m.g); if(m.beam){ scene.remove(m.beam); m.beam.geometry.dispose(); m.beam.material.dispose() } m.g.traverse(o=>{ if(o.material) o.material.dispose() }); MARKS.splice(i,1) } } }

/* ---------- admin-weather effects: meteors (Sternenfall), lightning (Leviathans Zorn) ---------- */
const METEORS=[]; { const p1=new THREE.PlaneGeometry(1,1); p1.translate(0,-0.5,0); const p2=p1.clone(); p2.rotateY(Math.PI/2); const geo=mergeGeometries([p1,p2]);
  for(let i=0;i<14;i++){ const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:0xd8c8ff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false})); m.visible=false; scene.add(m); METEORS.push({m,on:false}) } }
const _mv=new THREE.Vector3(), _up=new THREE.Vector3(0,1,0);
function updateMeteors(dt,on,px,pz,cam){ for(const M of METEORS){ if(!M.on){ if(on&&Math.random()<dt*0.9){ const a=Math.random()*6.28, d=120+Math.random()*700; M.x=px+Math.cos(a)*d; M.z=pz+Math.sin(a)*d; M.y=380+Math.random()*200; const da=Math.random()*6.28; M.vx=Math.cos(da)*60; M.vz=Math.sin(da)*60; M.vy=-(170+Math.random()*120); M.on=true; M.m.visible=true; M.hit=d<420&&Math.random()<0.5 } continue }
    M.x+=M.vx*dt; M.y+=M.vy*dt; M.z+=M.vz*dt; M.m.position.set(M.x,M.y,M.z); _mv.set(M.vx,M.vy,M.vz).normalize(); M.m.quaternion.setFromUnitVectors(_up,_mv); M.m.scale.set(2.4,46,2.4); M.m.material.opacity=0.95;
    if(Math.random()<dt*40) GLOW.emit(M.x,M.y,M.z,0,0,0,0.8,2.2,"#e0d0ff",0,0);
    if(M.y<(M.hit?0:120)){ if(M.hit){ splashFX(M.x,0.3,M.z,40,2.2); burstFX(M.x,2,M.z,"#c8a8ff",50) } M.on=false; M.m.visible=false; M.m.material.opacity=0 } } }
let boltMesh=null, boltT=0;
function strikeLightning(px,pz){ if(boltMesh){ scene.remove(boltMesh); boltMesh.geometry.dispose() } const a=Math.random()*6.28, d=90+Math.random()*420, x=px+Math.cos(a)*d, z=pz+Math.sin(a)*d; const pts=[]; let cx=x, cz=z;
  for(let y=420;y>0;y-=24){ pts.push(new THREE.Vector3(cx,y,cz)); cx+=(Math.random()-.5)*26; cz+=(Math.random()-.5)*26 } pts.push(new THREE.Vector3(cx,0,cz));
  const g=new THREE.BufferGeometry().setFromPoints(pts); boltMesh=new THREE.Line(g,new THREE.LineBasicMaterial({color:0xe8f6ff,transparent:true,opacity:1,fog:false})); scene.add(boltMesh); boltT=0.35; splashFX(cx,0.3,cz,30,2); return {x:cx,z:cz,d} }
function updateBolt(dt){ if(!boltMesh) return; boltT-=dt; boltMesh.material.opacity=Math.max(0,boltT/0.35)*(Math.random()<0.5?1:0.4); if(boltT<=0){ scene.remove(boltMesh); boltMesh.geometry.dispose(); boltMesh=null } }

/* ---------- build everything ---------- */
async function buildWorld(progress){
  const step=async (f,msg,pct)=>{ progress(msg,pct); await new Promise(r=>setTimeout(r,0)); f() };
  await step(()=>{ buildGeoLib(); buildGeoLib2() },"Werkzeuge schnitzen…",4);
  for(let i=0;i<ISL.length;i++) await step(()=>buildIsland(ISL[i]),`Insel ${ISL[i].n}…`,6+Math.round(i/ISL.length*44));
  await step(()=>{ DEEPZ.forEach(buildDeepZone); RAFTS.forEach(buildRaft); PORTALS.forEach(buildPortal) },"Tiefsee vermessen…",52);
  const keys=prepareTiles(); for(let i=0;i<keys.length;i+=40) await step(()=>{ for(const k of keys.slice(i,i+40)) buildCoarseTile(k) },"Küsten formen…",54+Math.round(i/keys.length*26));
  await step(()=>finishCoarse(),"Küsten formen…",81);
  await step(()=>flushInstances(),"Bäume pflanzen…",82);
  await step(()=>buildGrass(),"Gras wachsen lassen…",86);
  await step(()=>{ bakeDepth(); setWaterZones(1) },"Wellen einstellen…",92);
  await step(()=>buildBirds(),"Möwen wecken…",97);
}


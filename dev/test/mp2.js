// two players meet: boats 4/5, held fish, rod models and bite marks are visible to the other player
const { chromium } = require('playwright'); const path=require('path');
const TH=path.join(__dirname,'../../../fd/node_modules/three');
(async()=>{
 const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 const errs=[];
 async function client(name,pass,reg){
  const ctx=await b.newContext({viewport:{width:900,height:560}}); const p=await ctx.newPage(); p.setDefaultTimeout(200000); await p.addInitScript(()=>{window.__Q='low'});
  p.on('pageerror',e=>errs.push(name+' PAGEERR '+e.message)); p.on('console',m=>{ if(m.type()==='error'&&!/ERR_FAILED/.test(m.text())) errs.push(name+' '+m.text().slice(0,200)) });
  await p.route(/cdn\.jsdelivr\.net\/npm\/three@0\.160\.0\/(.*)/,r=>{ const u=new URL(r.request().url()); r.fulfill({path:path.join(TH,u.pathname.replace('/npm/three@0.160.0/','')),contentType:'application/javascript'}) });
  await p.route(/googleapis|gstatic/,r=>r.abort());
  await p.goto('http://127.0.0.1:8787/?debug',{waitUntil:'domcontentloaded',timeout:120000});
  await p.waitForSelector('#acct',{state:'visible',timeout:120000});
  await p.fill('#accName',name); await p.fill('#accPass',pass); await p.click(reg?'#accReg':'#accLogin');
  await p.waitForFunction(()=>window.__gameStarted,null,{timeout:120000});
  await p.click('#startBtn'); await p.waitForTimeout(1500); return p }
 const A=await client('leif','test1234',false);
 const B=await client('Tom'+Math.floor(Math.random()*9999),'pw12345',true);
 await A.evaluate(()=>{ __fd.runCommand('/admin code:8283'); __fd.runCommand('/time h:12'); __fd.runCommand('/weather set:clear'); __fd.runCommand('/rods name:Tiefenkrone'); __fd.runCommand('/boat tier:5'); __fd.runCommand('/tp x:420 z:1300'); __fd.runCommand('/give fish:Megalodon mut:Aurora') });
 await A.waitForTimeout(1500); await A.evaluate(()=>{ __fd.pl.boat=true; __fd.setHold(__fd.S.fish[__fd.S.fish.length-1]) });
 await B.evaluate(()=>{ __fd.travelTo(420,1330,false); __fd.pl.boat=false; __fd.cam.yaw=Math.PI; __fd.cam.pitch=0.2; __fd.cam.dist=26 });
 await B.waitForTimeout(12000);
 console.log('B sees',await B.evaluate(()=>JSON.stringify(__fd.peers.map(p=>({n:p.name,b:p.presence&&p.presence.b,hold:p.presence&&p.presence.hold})))));
 await B.screenshot({path:path.join(__dirname,'mp2_B.png')});
 await A.evaluate(()=>{ __fd.setHold(null); __fd.spawnBiteMark(__fd.pl.x,0,__fd.pl.z-8,6) });
 console.log(JSON.stringify(errs.slice(0,15))); await b.close() })();

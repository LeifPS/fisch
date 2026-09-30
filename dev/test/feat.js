const { chromium } = require('playwright'); const path=require('path');
const TH=path.join(__dirname,'../../../fd/node_modules/three'); const OUT=n=>path.join(__dirname,n);
(async()=>{
 const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 const errs=[]; const ctx=await b.newContext({viewport:{width:1100,height:680}}); const p=await ctx.newPage(); p.setDefaultTimeout(150000);
 p.on('pageerror',e=>errs.push('PAGEERR '+e.message)); p.on('console',m=>{ if(m.type()==='error'&&!/ERR_FAILED/.test(m.text())) errs.push(m.text().slice(0,200)) });
 await p.route(/cdn\.jsdelivr\.net\/npm\/three@0\.160\.0\/(.*)/,r=>{ const u=new URL(r.request().url()); r.fulfill({path:path.join(TH,u.pathname.replace('/npm/three@0.160.0/','')),contentType:'application/javascript'}) });
 await p.route(/googleapis|gstatic/,r=>r.abort());
 await p.goto('http://127.0.0.1:8787/?debug',{waitUntil:'domcontentloaded'});
 await p.waitForSelector('#acct',{state:'visible'}); await p.fill('#accName','leif'); await p.fill('#accPass','test1234'); await p.click('#accLogin');
 await p.waitForFunction(()=>window.__gameStarted); await p.click('#startBtn'); await p.waitForTimeout(1500);
 await p.waitForTimeout(1500); await p.evaluate(()=>{ __fd.runCommand('/admin code:8283') }); await p.waitForTimeout(700); await p.evaluate(()=>__fd.closeModal()); console.log('admin',await p.evaluate(()=>__fd.adminOn()));
 const R=async c=>{ await p.evaluate(c=>__fd.runCommand(c),c); await p.waitForTimeout(300) };
 await R('/time h:12'); await R('/world reset'); await R('/time h:12');
 // bite marks row
 await p.evaluate(()=>{ const P=__fd.pl, cam=__fd.cam; const f={x:Math.sin(cam.yaw),z:Math.cos(cam.yaw)}; for(let i=0;i<11;i++){ const s=(i-5)*5; __fd.spawnBiteMark(P.x+f.x*40+Math.cos(cam.yaw)*s,0,P.z+f.z*40-Math.sin(cam.yaw)*s,i) } });
 await p.waitForTimeout(450); await p.screenshot({path:OUT('marks.png')});
 for(const [k,n] of [['blood','aw_blood'],['star','aw_star'],['storm','aw_storm']]){ await R('/aw set:'+k); await p.waitForTimeout(2500); await p.screenshot({path:OUT(n+'.png')}) }
 await R('/aw off'); await R('/give fish:Vampirhai mut:Blutmond'); await p.evaluate(()=>{ __fd.setHold(__fd.S.fish[__fd.S.fish.length-1]) }); await p.waitForTimeout(800); await p.screenshot({path:OUT('hold.png')});
 await R('/rods name:Obsidian Rod'); await p.evaluate(()=>__fd.openModal('gear')); await p.waitForTimeout(500); await p.screenshot({path:OUT('gear.png')});
 console.log(JSON.stringify(errs.slice(0,12))); await b.close() })();

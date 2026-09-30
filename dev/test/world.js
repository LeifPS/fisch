const { chromium } = require('playwright'); const path=require('path');
const TH=path.join(__dirname,'../../../fd/node_modules/three'); const OUT=n=>path.join(__dirname,n);
const SHOTS=JSON.parse(process.env.SHOTS||'[]');
(async()=>{
 const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 const errs=[]; const ctx=await b.newContext({viewport:{width:+(process.env.W||1100),height:+(process.env.H||680)}}); const p=await ctx.newPage(); p.setDefaultTimeout(300000);
 p.on('pageerror',e=>errs.push('PAGEERR '+e.message)); p.on('console',m=>{ if(m.type()==='error'&&!/ERR_FAILED/.test(m.text())) errs.push(m.text().slice(0,300)); if(/^\[T\]/.test(m.text())) console.log(m.text()) });
 await p.route(/cdn\.jsdelivr\.net\/npm\/three@0\.160\.0\/(.*)/,r=>{ const u=new URL(r.request().url()); r.fulfill({path:path.join(TH,u.pathname.replace('/npm/three@0.160.0/','')),contentType:'application/javascript'}) });
 await p.route(/googleapis|gstatic/,r=>r.abort());
 const t0=Date.now(); await p.goto('http://127.0.0.1:8787/?debug',{waitUntil:'domcontentloaded'});
 await p.waitForSelector('#acct',{state:'visible'}); await p.fill('#accName',process.env.NAME||'leif'); await p.fill('#accPass','test1234'); await p.click('#accLogin');
 await p.waitForFunction(()=>window.__gameStarted||document.getElementById('loaderr').style.display==='block'); console.log('boot ms',Date.now()-t0, await p.evaluate(()=>document.getElementById('loaderr').textContent));
 await p.click('#startBtn'); await p.waitForTimeout(1500);
 await p.evaluate(()=>{ __fd.runCommand('/admin code:8283') }); await p.waitForTimeout(500); await p.evaluate(()=>__fd.closeModal());
 const R=async c=>{ await p.evaluate(c=>__fd.runCommand(c),c); await p.waitForTimeout(300) };
 for(const s of SHOTS){ for(const c of (s.cmd||[])) await R(c); if(s.js) await p.evaluate(s.js); await p.waitForTimeout(s.wait||2500); await p.screenshot({path:OUT(s.n+'.png')}); console.log('shot',s.n, await p.evaluate(()=>{ const P=__fd.pl; return JSON.stringify({x:Math.round(P.x),z:Math.round(P.z),y:+P.y.toFixed(1),loc:__fd.locationAt(P.x,P.z)}) })) }
 console.log(JSON.stringify(errs.slice(0,15))); await b.close() })();

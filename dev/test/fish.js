const { chromium } = require('playwright'); const path=require('path');
const TH=path.join(__dirname,'../../../fd/node_modules/three'); const OUT=n=>path.join(__dirname,n);
(async()=>{
 const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 const errs=[]; const p=await (await b.newContext({viewport:{width:1000,height:640}})).newPage(); p.setDefaultTimeout(150000);
 await p.addInitScript(()=>{window.__Q='low'});
 p.on('pageerror',e=>errs.push('PAGEERR '+e.message)); p.on('console',m=>{ if(m.type()==='error'&&!/ERR_FAILED/.test(m.text())) errs.push(m.text().slice(0,200)) });
 await p.route(/cdn\.jsdelivr\.net\/npm\/three@0\.160\.0\/(.*)/,r=>{ const u=new URL(r.request().url()); r.fulfill({path:path.join(TH,u.pathname.replace('/npm/three@0.160.0/','')),contentType:'application/javascript'}) });
 await p.route(/googleapis|gstatic/,r=>r.abort());
 await p.goto('http://127.0.0.1:8787/?debug',{waitUntil:'domcontentloaded'});
 await p.waitForSelector('#acct',{state:'visible'}); await p.fill('#accName','leif'); await p.fill('#accPass','test1234'); await p.click('#accLogin');
 await p.waitForFunction(()=>window.__gameStarted); await p.click('#startBtn'); await p.waitForTimeout(2500);
 const R=async c=>{ await p.evaluate(c=>__fd.runCommand(c),c); await p.waitForTimeout(250) };
 await R('/tp to:Moosewood'); await R('/aw off'); await R('/instant set:on'); await R('/autoreel set:on');
 for(const [rod,fish,aw] of [['Obsidian Rod','Megalodon',''],['Tryhard Rod','Sternenwal','star'],['Nebelrute','','blood']]){
   await R('/rods name:'+rod); if(fish) await R('/bite fish:'+fish); if(aw) await R('/aw set:'+aw);
   await p.evaluate(()=>{ __fd.setMouse(innerWidth/2,innerHeight*0.42); __fd.startCharge(); __fd.F.power=0.97; __fd.releaseCast() });
   await p.waitForTimeout(1400); await p.screenshot({path:OUT('bite_'+rod.split(' ')[0]+'.png')});
   await p.waitForFunction(()=>['show','hold','idle'].includes(__fd.F.state)&&__fd.F.state!=='reel',null,{timeout:60000}).catch(()=>errs.push('no catch '+rod));
   await p.waitForTimeout(3500);
   console.log(rod, await p.evaluate(()=>{ const it=__fd.S.fish[__fd.S.fish.length-1]; return it?it.n+' '+it.m:'-' }), await p.evaluate(()=>__fd.F.state));
 }
 await R('/aw off');
 console.log(JSON.stringify(errs.slice(0,12))); await b.close() })();

// two players: register/login, admin unlock, global weather + admin weather reach the other client
const { chromium } = require('playwright'); const path=require('path');
const TH=path.join(__dirname,'../../../fd/node_modules/three');
(async()=>{
 const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 const errs=[];
 async function client(name,pass,reg){
  const ctx=await b.newContext({viewport:{width:900,height:560}}); const p=await ctx.newPage(); p.setDefaultTimeout(150000); await p.addInitScript(()=>{window.__Q='low'});
  p.on('pageerror',e=>errs.push(name+' PAGEERR '+e.message)); p.on('console',m=>{ if(m.type()==='error') errs.push(name+' '+m.text().slice(0,200)) });
  await p.route(/cdn\.jsdelivr\.net\/npm\/three@0\.160\.0\/(.*)/,r=>{ const u=new URL(r.request().url()); r.fulfill({path:path.join(TH,u.pathname.replace('/npm/three@0.160.0/','')),contentType:'application/javascript'}) });
  await p.route(/googleapis|gstatic/,r=>r.abort());
  await p.goto('http://127.0.0.1:8787/?debug',{waitUntil:'domcontentloaded',timeout:120000});
  await p.waitForSelector('#acct',{state:'visible',timeout:120000});
  await p.fill('#accName',name); await p.fill('#accPass',pass); await p.click(reg?'#accReg':'#accLogin');
  await p.waitForFunction(()=>window.__gameStarted,null,{timeout:60000});
  await p.click('#startBtn'); await p.waitForTimeout(1500); return p }
 const A=await client('leif','test1234',false);
 const B=await client('Anna'+Math.floor(Math.random()*999),'pw12345',true);
 // name taken check via UI
 await A.waitForTimeout(2500);
 console.log('A sees peers',await A.evaluate(()=>__fd.peers.map(p=>p.name)));
 await A.evaluate(()=>__fd.runCommand('/admin code:1111')); await A.waitForTimeout(800);
 console.log('wrong code admin?',await A.evaluate(()=>__fd.adminOn()));
 await A.evaluate(()=>__fd.runCommand('/admin code:8283')); await A.waitForTimeout(800);
 console.log('admin?',await A.evaluate(()=>__fd.adminOn()));
 await A.evaluate(()=>__fd.runCommand('/weather set:fog')); await A.evaluate(()=>__fd.runCommand('/aw set:blood'));
 await B.waitForTimeout(1500);
 console.log('B world',JSON.stringify(await B.evaluate(()=>{ const W=__fd.world(); return {w:W.weather,aw:W.aw,day:W.day,left:Math.round(W.awLeft/1000)} })));
 // autocomplete
 await A.click('#chatin').catch(()=>A.focus('#chatin')); await A.type('#chatin','/we'); await A.waitForTimeout(300);
 console.log('sug',await A.evaluate(()=>document.getElementById('cmdSug').innerText.slice(0,200)));
 await A.keyboard.press('Tab'); await A.type('#chatin','set:r'); await A.waitForTimeout(200);
 console.log('sug2',await A.evaluate(()=>document.getElementById('cmdSug').innerText.slice(0,200)), '|', await A.inputValue('#chatin'));
 await A.screenshot({path:path.join(__dirname,'mpA.png')}); await B.screenshot({path:path.join(__dirname,'mpB.png')});
 await A.evaluate(()=>__fd.runCommand('/world reset'));
 console.log(JSON.stringify(errs.slice(0,15)));
 await b.close();
})();

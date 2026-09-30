import re
imports=open('build.py').read().split("imports='''")[1].split("'''")[0]
head=open('head.html').read().replace('/*__DATA__*/null',open('../fisch/data.json').read().strip())
head=head.replace('<script type="importmap">','<script>\n'+open('net-cf.js').read()+'\n</script>\n<script type="importmap">',1)
head=head.replace('<title>Fischerdock Inseln</title>','<!doctype html>\n<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no"><meta name="theme-color" content="#081524">\n<title>Fischerdock Inseln</title>',1)
head=head.replace('\n<div id="app">','\n</head><body>\n<div id="app">',1)
core=open('core.js').read()
core=core.replace('let dirty=false;','if(!S.nick) S.nick="Angler-"+(1000+Math.floor(Math.random()*9000));\nlet dirty=false;',1)
game=open('game.js').read()
game=re.sub(r'\nwindow\.__fd=\{.*\n?','\n',game)
R=[("Teile das Artifact, damit Freunde mitspielen.","Teile einfach den Link zu dieser Seite, dann spielen Freunde live mit."),
   ("Mit Contributor-Rechten erscheinst du selbst in der Liste.","Die Rangliste ist gerade nicht erreichbar."),
   ('if(!force&&now-lastPresSent<100){ clearTimeout(presTimer); presTimer=setTimeout(()=>pushPresence(true),110); return }','if(!force&&now-lastPresSent<180){ clearTimeout(presTimer); presTimer=setTimeout(()=>pushPresence(true),190); return }'),
   ('presT-=dt; if(presT<=0){ presT=0.1; pushPresence() }','presT-=dt; if(presT<=0){ presT=0.2; pushPresence() }'),
   ('const k=clamp(dt*9,0,1); a.x=lerp(a.x,tx,k); a.z=lerp(a.z,tz,k)','const k=clamp(dt*6,0,1); a.x=lerp(a.x,tx,k); a.z=lerp(a.z,tz,k)')]
for a,b in R:
    n=game.count(a); assert n==1,(n,a)
    game=game.replace(a,b)
out=head+'<script type="module">\n'+imports+core+'\n'+open('world.js').read()+'\n'+game+'\n</script>\n</body></html>\n'
open('../fischerdock-cf/public/index.html','w').write(out); print(len(out))

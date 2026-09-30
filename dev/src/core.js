/* ============================ CORE v2: data, economy, progression ============================ */
const $ = id => document.getElementById(id);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=t=>t*t*(3-2*t);
const fmt=n=>Math.round(n).toLocaleString("de-DE");
const fmtKg=w=>w>=1000?(w/1000).toLocaleString("de-DE",{maximumFractionDigits:2})+" t":w.toLocaleString("de-DE",{maximumFractionDigits:w<10?2:1})+" kg";
function hashStr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function wpick(obj,r=Math.random()){const e=Object.entries(obj);let t=e.reduce((s,[,w])=>s+w,0),x=r*t;for(const [k,w] of e){if((x-=w)<=0)return k}return e[e.length-1][0]}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
const split=s=>s?s.split(";").map(x=>x.trim()).filter(Boolean):[];
const TOUCH=matchMedia("(pointer:coarse)").matches;

/* ---------- fish: Fisch-wiki data (first sea) + own second-sea fauna ---------- */
const NEWFISH=[
  // Geisterriff (secret, only at night)
  ["Geisterhering","Common","Geisterriff","","","Night","","Worm",1.2,160,0.8,100,80,0,70],
  ["Nebelmaul","Uncommon","Geisterriff","","","Night","","Minnow",14,320,9,60,60,0,120],
  ["Laternenrochen","Rare","Geisterriff","","","Night","","Squid",60,1100,40,14,35,0,380],
  ["Phantomhai","Legendary","Geisterriff","","","Night","","Shark Head",800,6200,300,0.2,10,-35,2600],
  ["Seelenlaterne","Mythical","Geisterriff","","Foggy","Night","","Geisterköder",40,14000,20,0.03,5,-55,7000],
  ["Kapitän Morrows Schatten","Secret","Geisterriff","","","Night","","Geisterköder",2500,52000,900,0.12,-20,-80,22000],
  // Nebelinsel (hidden, first sea)
  ["Mist Perch","Common","Nebelinsel","","Foggy","","","Worm",2,95,1.2,100,85,0,45],
  ["Veil Carp","Uncommon","Nebelinsel","","Foggy","","","Bagel",7,200,5,60,65,0,85],
  ["Fogbell Jelly","Unusual","Nebelinsel","","Foggy","Night","","Shrimp",3,420,2,35,55,0,150],
  ["Ghost Gar","Rare","Nebelinsel","","Foggy","","","Minnow",40,760,20,14,35,0,260],
  ["Phantom Koi","Legendary","Nebelinsel","","Foggy","Night","","Truffle Worm",6,4200,4,0.2,20,-30,1800],
  ["Mistwhale","Exotic","Nebelinsel","","Foggy","Night","","Shark Head",22000,60000,8000,3,-40,-80,30000,1],
  // Sturmsee (open water of the second sea)
  ["Stormfin Tuna","Common","Sturmsee","","","","","Minnow",60,130,40,100,70,0,55],
  ["Squall Mackerel","Uncommon","Sturmsee","","Rain;Windy","","","Shrimp",5,240,3,60,65,0,95],
  ["Thunder Snapper","Unusual","Sturmsee","","Rain","","","Squid",30,480,15,35,50,0,170],
  ["Tempest Marlin","Rare","Sturmsee","","Windy","","","Fish Head",300,900,120,12,30,0,300],
  ["Cyclone Shark","Legendary","Sturmsee","","Rain","","","Shark Head",1400,5200,500,0.15,10,-35,2000],
  ["Leviathan Calf","Mythical","Sturmsee","","","Night","","Truffle Worm",9000,12000,4000,0.02,5,-55,5200],
  // Ankerheim
  ["Harbor Perch","Common","Ankerheim","","","","","Worm",3,110,2,100,85,0,50],
  ["Rope Eel","Uncommon","Ankerheim","","","Night","","Insect",6,220,4,60,65,0,95],
  ["Brass Snapper","Uncommon","Ankerheim","","Clear","","","Shrimp",8,230,5,55,60,0,95],
  ["Lantern Goby","Unusual","Ankerheim","Freshwater","","Night","","Flakes",1,460,0.7,35,70,0,170],
  ["Captain's Cod","Rare","Ankerheim","","Foggy","","","Minnow",25,780,15,18,45,0,280],
  ["Anchor Ray","Rare","Ankerheim","","Rain","","","Squid",60,820,40,12,40,0,300],
  ["Harbor Leviathan","Legendary","Ankerheim","","","","Winter;Autumn","Fish Head",900,4600,400,0.2,10,-30,2100],
  ["Gilded Koi","Mythical","Ankerheim","Freshwater","Clear","Day","","Super Flakes",5,9000,3,0.02,30,-40,5000],
  // Korallenkrone
  ["Crown Chromis","Common","Korallenkrone","","","","","Flakes",1,115,0.7,100,90,0,50],
  ["Prism Wrasse","Uncommon","Korallenkrone","","Clear","","","Coral",3,240,2,55,70,0,100],
  ["Coral Knight","Unusual","Korallenkrone","","","","","Seaweed",12,480,8,35,55,0,175],
  ["Glass Octopus","Rare","Korallenkrone","","","Night","","Shrimp",8,860,5,15,40,0,300],
  ["Sunburst Angel","Rare","Korallenkrone","","Clear","Day","Summer;Spring","Coral",4,840,3,14,45,0,300],
  ["Reef Sovereign","Legendary","Korallenkrone","","","","","Deep Coral",200,5100,90,0.15,15,-35,2200],
  ["Rainbow Manta","Mythical","Korallenkrone","","Clear","","Summer","Night Shrimp",1500,11000,700,0.02,10,-50,5600],
  ["Opal Seahorse","Exotic","Korallenkrone","","","Night","","Weird Algae",0.6,26000,0.3,0.005,40,-20,12000],
  // Aschefelder
  ["Cinder Minnow","Common","Aschefelder","","","","","Coal",0.8,120,0.5,100,85,0,50],
  ["Ash Carp","Uncommon","Aschefelder","","","","","Coal",9,250,6,60,60,0,100],
  ["Magma Gar","Unusual","Aschefelder","","Clear","","","Minnow",35,500,20,35,40,0,180],
  ["Obsidian Ray","Rare","Aschefelder","","","Night","","Squid",80,880,40,14,35,0,310],
  ["Geyser Pike","Rare","Aschefelder","","Windy","","","Insect",14,860,9,16,40,0,300],
  ["Pyroclast Eel","Legendary","Aschefelder","","","","Summer","Coal",120,5400,60,0.15,10,-35,2300],
  ["Ember Leviathan","Mythical","Aschefelder","","","Night","","Shark Head",6000,11800,2500,0.02,5,-60,6000],
  ["Heartfire Koi","Exotic","Aschefelder","","Clear","Day","","Truffle Worm",4,30000,2,0.004,30,-40,13000],
  // Frostzinnen
  ["Frost Smelt","Common","Frostzinnen","","","","","Worm",0.5,115,0.3,100,90,0,50],
  ["Icefin Char","Uncommon","Frostzinnen","","","","Winter;Autumn","Insect",7,245,5,60,60,0,100],
  ["Glacier Cod","Unusual","Frostzinnen","","Foggy","","","Minnow",20,500,12,35,50,0,180],
  ["Aurora Trout","Rare","Frostzinnen","","Clear","Night","","Night Shrimp",6,900,4,10,40,0,320],
  ["Tusk Walrus","Rare","Frostzinnen","","","","Winter","Fish Head",1200,880,700,12,20,0,320],
  ["Frostwyrm","Legendary","Frostzinnen","","Foggy","Night","","Truffle Worm",400,5600,200,0.12,10,-40,2400],
  ["Crystal Narwhal","Mythical","Frostzinnen","","Clear","","Winter","Shark Head",2500,12200,1200,0.02,5,-55,6200],
  // Atlantische Ruinen
  ["Ruin Tetra","Common","Atlantische Ruinen","","","","","Flakes",0.6,120,0.4,100,90,0,50],
  ["Column Bass","Uncommon","Atlantische Ruinen","","","","","Worm",6,255,4,55,60,0,105],
  ["Marble Angelfish","Unusual","Atlantische Ruinen","","Clear","Day","","Coral",2,520,1.4,35,55,0,185],
  ["Trident Snapper","Rare","Atlantische Ruinen","","","","","Squid",18,940,10,14,40,0,330],
  ["Oracle Eel","Rare","Atlantische Ruinen","","","Night","","Night Shrimp",10,980,6,12,35,0,340],
  ["Atlantean Guardian","Legendary","Atlantische Ruinen","","","","","Shark Head",300,6000,140,0.12,10,-40,2600],
  ["Poseidon's Herald","Mythical","Atlantische Ruinen","","Rain","","","Truffle Worm",800,13500,400,0.015,5,-60,6800],
  ["Tide Emperor","Exotic","Atlantische Ruinen","","Rain","Night","","Weird Algae",5000,36000,2000,0.004,0,-70,15000],
  // Abgrund der Stille (deep)
  ["Void Lantern","Common","Abgrund der Stille","","","","","Deep Coral",2,170,1.4,100,80,0,60],
  ["Hollow Eel","Uncommon","Abgrund der Stille","","","","","Squid",12,320,8,55,55,0,120],
  ["Silent Angler","Unusual","Abgrund der Stille","","","Night","","Night Shrimp",6,640,4,35,45,0,210],
  ["Abyss Jelly","Rare","Abgrund der Stille","","","","","Luminous Flakes",4,1100,2,14,35,0,380],
  ["Pale Leviathan","Legendary","Abgrund der Stille","","","Night","","Shark Head",5000,7400,2000,0.1,5,-50,3000],
  ["The Unseen","Secret","Abgrund der Stille","","","Night","","Phosphor Jelly",900,48000,300,0.12,-20,-75,20000],
  ["Abyssal Sovereign","Exotic","Abgrund der Stille","","","Night","","Shark Head",80000,150000,20000,3,-60,-85,40000,1],
  // admin weathers: only while the weather is active, anywhere on the sea. Super rare, super hard.
  ["Blutmond-Karpfen","Legendary","Blutmond","","","","","Worm",38,9500,18,60,5,-35,3200],
  ["Karmesin-Aal","Mythical","Blutmond","","","","","Squid",70,18500,35,25,-10,-55,5600],
  ["Vampirhai","Exotic","Blutmond","","","","","Shark Head",1100,46000,450,8,-35,-72,13000],
  ["Blutmond-Leviathan","Divine","Blutmond","","","","","",30000,260000,12000,1,-80,-86,64000],
  ["Sternenschuppe","Legendary","Sternenfall","","","","","Flakes",6,9800,3,60,15,-30,3200],
  ["Kometenrochen","Mythical","Sternenfall","","","","","Shrimp",220,19500,100,25,-5,-55,5800],
  ["Nebula-Qualle","Exotic","Sternenfall","","","","","Luminous Flakes",40,48000,20,8,-30,-72,13500],
  ["Sternenwal","Divine","Sternenfall","","","","","",120000,280000,60000,1,-85,-87,66000],
  ["Sturmbrecher","Legendary","Leviathans Zorn","","","","","Minnow",180,9200,90,60,0,-35,3200],
  ["Blitzmuräne","Mythical","Leviathans Zorn","","","","","Night Shrimp",45,19000,22,25,-15,-58,5700],
  ["Donnerschlund","Exotic","Leviathans Zorn","","","","","Shark Head",4000,47000,1800,8,-40,-74,13200],
  ["Leviathan des Zorns","Divine","Leviathans Zorn","","","","","",400000,300000,150000,1,-90,-88,70000],
];
const AW_LOC={blood:"Blutmond",star:"Sternenfall",storm:"Leviathans Zorn"};
const FISH=DATA.fish.concat(NEWFISH).map(f=>({n:f[0],r:f[1],l:f[2],sub:f[3],w:split(f[4]),t:f[5],s:split(f[6]),b:split(f[7]),bw:f[8],bv:f[9],wr:f[10],c:f[11],res:f[12],ps:f[13],xp:f[14],hard:!!f[15]}));
const FISHBY=Object.fromEntries(FISH.map(f=>[f.n,f]));
const MUTS=DATA.muts.map(m=>({n:m[0],v:m[1],w:m[2],c:m[3]}));
const MUT=Object.fromEntries(MUTS.map(m=>[m.n,m])); MUT.Shiny={n:"Shiny",v:1.85,c:"#fff0bc"}; MUT.Sparkling={n:"Sparkling",v:1.85,c:"#fff0bc"}; MUT.Aurora={n:"Aurora",v:6.5,c:"#8affc9"};
// mutations from rod abilities, admin weathers and secrets (not rolled randomly)
[["Luminescent",6.5,"#b8ff6a"],["Mother Nature",3,"#6fe37b"],["Solarblaze",3.5,"#ffb23a"],["Brined",3.5,"#9dffcf"],["King's Blessing",5.5,"#ffd24a"],["Atlantean",4,"#2fd0c0"],
 ["Rainbow Cluster",5,"#ff7ad9"],["Oscar",6.4,"#ffe9a0"],["Tryhard",10,"#ff3a3a"],["Blutmond",8,"#ff2a3a"],["Kosmisch",9,"#b58bff"],["Sturmgeboren",7,"#5fd8ff"],
 ["Nebelhauch",4,"#dfe6ee"],["Eiszahn",4.5,"#bfefff"],["Tiefgeboren",5,"#3a6aff"]].forEach(([n,v,col])=>{ MUT[n]={n,v,c:col,special:1} });
const BAITS=DATA.bait.map(b=>({n:b[0],r:b[1],pl:b[2],ul:b[3],res:b[4],lure:b[5]})); BAITS.push({n:"Geisterköder",r:"Mythical",pl:70,ul:90,res:10,lure:25}); const BAIT=Object.fromEntries(BAITS.map(b=>[b.n,b]));
const RARITY=["Common","Uncommon","Unusual","Rare","Legendary","Mythical","Exotic","Secret","Limited","Apex","Divine"];
const RCOL={Common:"#dfe6ee",Uncommon:"#7ee07a",Unusual:"#d6ec6a",Rare:"#52a8ff",Legendary:"#ffb23a",Mythical:"#ff5a93",Exotic:"#c78bff",Secret:"#e8e8e8",Limited:"#4a6aff",Apex:"#ff4040",Divine:"#ffd6ff"};
const RDE={Common:"Gewöhnlich",Uncommon:"Ungewöhnlich",Unusual:"Besonders",Rare:"Selten",Legendary:"Legendär",Mythical:"Mythisch",Exotic:"Exotisch",Secret:"Geheim",Limited:"Limitiert",Apex:"Apex",Divine:"Göttlich"};
const rIdx=r=>Math.max(0,RARITY.indexOf(r));
const rarHTML=r=>`<span class="rar ${r==="Exotic"?"ex":r==="Divine"?"dv":r==="Secret"?"sc":""}" style="color:${RCOL[r]||"#fff"}">${esc(r)}</span>`;
const EVENTS=[
  {n:"Megalodon Hunt",l:"Ancient Isle"},{n:"Livyatan Hunt",l:"Ancient Isle"},{n:"Shark Hunt",l:"Ocean"},{n:"Orca Migration",l:"Ocean"},
  {n:"Blue Whale Migration",l:"Ocean"},{n:"Narwhal Migration",l:"Ocean"},{n:"Humpback Whale Migration",l:"Ocean"},{n:"Sei Whale Migration",l:"Ocean"},
  {n:"Megamouth Shark Hunt",l:"Ocean"},{n:"Bloop Fish Hunt",l:"Ocean"},{n:"Baby Bloop Fish Hunt",l:"Ocean"},{n:"Mosslurker Hunt",l:"Ocean"},
  {n:"Dreadfin Hunt",l:"Ocean"},{n:"Brine Storm",l:"Brine Pool"},{n:"Strange Whirlpool",l:"Vertigo"},{n:"Mossjaw Hunt",l:"Lost Jungle"},
];
const EVSET=new Set(EVENTS.map(e=>e.n));

/* ---------- rods ---------- */
const ROD_PRICE={"Flimsy Rod":[0,"Moosewood"],"Training Rod":[150,"Moosewood"],"Plastic Rod":[350,"Moosewood"],"Carbon Rod":[900,"Moosewood"],"Long Rod":[1400,"Moosewood"],
  "Fast Rod":[1800,"Moosewood"],"Lucky Rod":[2400,"Moosewood"],"Steady Rod":[3200,"Roslit Bay"],"Stone Rod":[3000,"Ancient Isle"],"Fortune Rod":[5000,"Roslit Bay"],"Rapid Rod":[5500,"Roslit Bay"],
  "Magnet Rod":[6000,"Terrapin Island"],"Scurvy Rod":[12000,"Forsaken Shores"],"Wildflower Rod":[14000,"Terrapin Island"],"Reinforced Rod":[16000,"Desolate Deep"],"Nocturnal Rod":[18000,"Vertigo"],
  "Phoenix Rod":[22000,"Ancient Isle"],"Midas Rod":[28000,"Ocean"],"Aurora Rod":[40000,"Vertigo"],"Brine-Infused Rod":[45000,"Brine Pool"],"Mythical Rod":[55000,"Ocean"],
  "Kings Rod":[80000,"Keepers Altar"],"Trident Rod":[95000,"Desolate Deep"],"Rainbow Cluster Rod":[140000,"Castaway Cliffs"],"Rod Of The Depths":[250000,"The Depths"],"Great Rod of Oscar":[600000,"Ocean"]};
const RODS=DATA.rods.map(r=>({n:r[0],price:(ROD_PRICE[r[0]]||[r[1]])[0],loc:(ROD_PRICE[r[0]]||[0,r[2]])[1],lure:r[3],luck:r[4],ctrl:r[5],res:r[6],mw:r[7],mc:r[8]||"#9aaabe",c1:r[9]||"#c0392b",c2:r[10]||"#ffffff"}));
// second sea rods (own designs)
RODS.push(
  {n:"Anchor Rod",price:150000,loc:"Ankerheim",lure:60,luck:200,ctrl:.15,res:30,mw:150000,mc:"#6d7f96",c1:"#2b3a52",c2:"#e8c56a"},
  {n:"Coralline Rod",price:240000,loc:"Korallenkrone",lure:80,luck:240,ctrl:.12,res:25,mw:80000,mc:"#ff7aa2",c1:"#ff9e6b",c2:"#fff3d6"},
  {n:"Obsidian Rod",price:320000,loc:"Aschefelder",lure:55,luck:260,ctrl:.2,res:45,mw:0,mc:"#2a1d24",c1:"#ff5a1a",c2:"#1a1214"},
  {n:"Glacial Rod",price:400000,loc:"Frostzinnen",lure:70,luck:280,ctrl:.22,res:35,mw:200000,mc:"#9fe3ff",c1:"#e8fbff",c2:"#5ab8e8"},
  {n:"Atlantean Rod",price:550000,loc:"Atlantische Ruinen",lure:85,luck:320,ctrl:.2,res:40,mw:0,mc:"#2fd0c0",c1:"#e0c060",c2:"#1a6a7a"},
  {n:"Silent Rod",price:800000,loc:"Abgrund der Stille",lure:90,luck:360,ctrl:.25,res:50,mw:0,mc:"#2b1f4a",c1:"#8a6aff",c2:"#0c0a18"},
);
// legendary quest rods: cannot be bought
RODS.push(
  {n:"Nebelrute",price:0,quest:"aldo",loc:"Nebelinsel",lure:70,luck:300,ctrl:.18,res:30,mw:0,mc:"#cfd8e3",c1:"#9fb0c4",c2:"#ffffff",passive:"Nebel: 20 % Chance auf einen zweiten Fisch derselben Art."},
  {n:"Klippenbrecher",price:0,quest:"mara",loc:"Castaway Cliffs",lure:55,luck:340,ctrl:.26,res:45,mw:0,mc:"#b8742e",c1:"#ffd24a",c2:"#4a2a12",passive:"Schmugglerglück: Perfect Catches verdoppeln den Wert."},
  {n:"Frostfang",price:0,quest:"tenzin",loc:"Snowcap Island",lure:65,luck:320,ctrl:.22,res:40,mw:0,mc:"#bfefff",c1:"#e8fbff",c2:"#3a9ad8",passive:"Eishauch: Alle 4 s friert der Fisch im Minispiel 1 s lang ein."},
  {n:"Tiefenkrone",price:0,quest:"ysolde",loc:"Hexenturm",lure:95,luck:520,ctrl:.3,res:60,mw:0,mc:"#7b3cff",c1:"#ffd24a",c2:"#2a0a5a",passive:"Krone der Tiefe: 15 % Doppelfang, +10 % Mutationschance, Eishauch."},
);
RODS.push({n:"Tryhard Rod",price:0,quest:"rored",loc:"Roslit Volcano",lure:80,luck:399,ctrl:-0.37,res:-500,mw:0,mc:"#ff3a3a",c1:"#1a1a1a",c2:"#ff3a3a"});
const ROD=Object.fromEntries(RODS.map(r=>[r.n,r]));
/* rod abilities (almost every rod from 10k on has one, some are tiny). Values follow the Fischipedia wiki where known, the rest is own balancing.
   mut:[name,chance,cond] · dbl:chance · prog:+progress · slash:[seconds,progress] · freeze:seconds · val:+value · heavy:factor · tmap/relic:chance · every:[n,valueBonus] · luckIf:[cond,luck] */
const ROD_ABIL={
  "Fortune Rod":{n:"Gierig",d:"5 % Chance auf die Mutation Greedy.",mut:["Greedy",0.05]},
  "Rapid Rod":{n:"Flink",d:"Einholen 8 % schneller.",prog:0.08},
  "Magnet Rod":{n:"Schrottsammler",d:"3 % Chance, eine Schatzkarte mitzuangeln.",tmap:0.03},
  "Scurvy Rod":{n:"Piratenglück",d:"6 % Chance auf eine Schatzkarte, Fänge 5 % wertvoller.",tmap:0.06,val:0.05},
  "Wildflower Rod":{n:"Blütenzauber",d:"8 % Chance auf Mother Nature.",mut:["Mother Nature",0.08]},
  "Reinforced Rod":{n:"Verstärkt",d:"Schwere Fische bremsen nur halb so stark.",heavy:0.5},
  "Nocturnal Rod":{n:"Nachtauge",d:"Nachts 10 % Chance auf Luminescent und +40 % Glück.",mut:["Luminescent",0.1,"night"],luckIf:["night",40]},
  "Phoenix Rod":{n:"Sonnenfeuer",d:"Tagsüber 10 % Chance auf Solarblaze.",mut:["Solarblaze",0.1,"day"]},
  "Midas Rod":{n:"Goldene Berührung",d:"15 % Chance auf die Mutation Midas.",mut:["Midas",0.15]},
  "Aurora Rod":{n:"Polarschein",d:"Bei Polarlicht 30 % Aurora-Mutation, sonst 3 %.",mut:["Aurora",0.03],auroraMut:0.3},
  "Brine-Infused Rod":{n:"Salzkruste",d:"12 % Chance auf Brined.",mut:["Brined",0.12]},
  "Mythical Rod":{n:"Mythos",d:"6 % Mythical-Mutation, 8 % Doppelfang.",mut:["Mythical",0.06],dbl:0.08},
  "Kings Rod":{n:"Königssegen",d:"10 % Chance auf King's Blessing, Control +5 %.",mut:["King's Blessing",0.1],ctrl:0.05},
  "Trident Rod":{n:"Dreizack",d:"Jeder 3. Fang ist 50 % mehr wert, 8 % Atlantean.",every:[3,0.5],mut:["Atlantean",0.08]},
  "Rainbow Cluster Rod":{n:"Regenbogen",d:"12 % Chance auf Rainbow Cluster.",mut:["Rainbow Cluster",0.12]},
  "Rod Of The Depths":{n:"Tiefenruf",d:"In Tiefseezonen +60 % Glück und 15 % Tiefgeboren.",mut:["Tiefgeboren",0.15,"deep"],luckIf:["deep",60]},
  "Great Rod of Oscar":{n:"Oscar",d:"10 % Oscar-Mutation, alle Fänge +20 % Wert.",mut:["Oscar",0.1],val:0.2},
  "Anchor Rod":{n:"Anker",d:"Der Fortschritt fällt nie unter 10 %.",anchor:0.1},
  "Coralline Rod":{n:"Riffseele",d:"12 % Chance auf Coral.",mut:["Coral",0.12]},
  "Obsidian Rod":{n:"Glutklinge",d:"Alle 5 s ein Hieb: +8 % Fortschritt. 10 % Scorched.",slash:[5,0.08],mut:["Scorched",0.1]},
  "Glacial Rod":{n:"Gletscherhauch",d:"Alle 5 s friert der Fisch kurz ein.",freeze:5},
  "Atlantean Rod":{n:"Erbe Atlantis",d:"12 % Atlantean, 8 % Doppelfang.",mut:["Atlantean",0.12],dbl:0.08},
  "Silent Rod":{n:"Stille",d:"12 % Shrouded, nachts 10 % Doppelfang.",mut:["Shrouded",0.12],dblNight:0.1},
  "Nebelrute":{n:"Nebel",d:"20 % Doppelfang, 10 % Nebelhauch.",dbl:0.2,mut:["Nebelhauch",0.1]},
  "Klippenbrecher":{n:"Schmugglerglück",d:"Perfect Catches verdoppeln den Wert.",perfectVal:1},
  "Frostfang":{n:"Eishauch",d:"Alle 4 s friert der Fisch 1 s ein. 10 % Eiszahn.",freeze:4,mut:["Eiszahn",0.1]},
  "Tiefenkrone":{n:"Krone der Tiefe",d:"15 % Doppelfang, +10 % Mutationschance, Eishauch.",dbl:0.15,mutPlus:0.1,freeze:4},
  "Tryhard Rod":{n:"Tryhard",d:"Jeder Fang bekommt die Mutation Tryhard (×10). Einholen +165 %. Dafür fast keine Resilience.",mut:["Tryhard",1],prog:1.65},
};
const abilOf=n=>ROD_ABIL[n]||null;

/* ---------- world layout (v3: a real ocean – about one minute by motor boat between neighbours) ---------- */
const SEA2X=40000;
const ISLE=[
  {n:"Moosewood",x:0,z:0,r:420,peak:34,biome:"forest",fresh:1,sea:1,d:"Heimathafen mit Dorf, Leuchtturm, Werft und Appraiser."},
  {n:"Roslit Bay",x:-2500,z:900,r:380,peak:22,biome:"tropic",fresh:1,reef:1,sea:1,d:"Tropische Bucht mit Korallenriff und Süßwasserteich."},
  {n:"Terrapin Island",x:2400,z:-1300,r:360,peak:30,biome:"meadow",fresh:1,sea:1,d:"Blühende Wiesen und eine alte Windmühle."},
  {n:"Sunstone Island",x:700,z:2800,r:320,peak:36,biome:"desert",sea:1,d:"Sonnige Felseninsel mit Felsbögen."},
  {n:"Mushgrove Swamp",x:-1900,z:-2400,r:400,peak:9,biome:"swamp",sea:1,d:"Nebliger Sumpf voller Riesenpilze."},
  {n:"Roslit Volcano",x:-3250,z:2450,r:330,peak:160,biome:"volcano",sea:1,d:"Aktiver Vulkan. Die Hitze lockt seltene Fische an."},
  {n:"Snowcap Island",x:800,z:-4600,r:450,peak:230,biome:"snow",fresh:1,sea:1,d:"Ein Berg aus Eis. Auf dem Gipfel soll jemand leben."},
  {n:"Forsaken Shores",x:-5000,z:-600,r:400,peak:18,biome:"wreck",fresh:1,reef:1,sea:1,d:"Piratenküste voller Schiffswracks."},
  {n:"Castaway Cliffs",x:4900,z:1800,r:420,peak:95,biome:"cliffring",sea:1,d:"Ein Ring aus Klippen. Seefahrer erzählen von einer verborgenen Lagune."},
  {n:"Ancient Isle",x:4600,z:-3900,r:480,peak:58,biome:"ancient",fresh:1,sea:1,d:"Urzeitinsel mit Ruinen. Revier des Megalodon."},
  {n:"Grand Reef",x:2800,z:5200,r:300,peak:4,biome:"reef",sea:1,d:"Ein riesiges Korallenatoll."},
  {n:"Lost Jungle",x:7400,z:-6800,r:460,peak:52,biome:"jungle",sea:1,d:"Dichter Dschungel am Rand der Welt."},
  {n:"Crystal Cove",x:-6200,z:-5200,r:260,peak:46,biome:"crystal",sea:1,d:"Leuchtende Kristallinsel."},
  {n:"Brine Pool",x:-5400,z:3800,r:260,peak:18,biome:"brine",sea:1,d:"Salzkrusten und giftgrüne Becken."},
  {n:"Keepers Altar",x:-600,z:-8200,r:260,peak:14,biome:"altar",sea:1,d:"Uralter Altar der Verzauberung. Hier liegt der Kings Rod."},
  {n:"Nebelinsel",x:8900,z:600,r:170,peak:16,biome:"fog",sea:1,hidden:1,d:"Eine Insel, die nur im Nebel sichtbar zu sein scheint."},
  {n:"Ankerheim",x:SEA2X,z:0,r:450,peak:26,biome:"harbor",fresh:1,sea:2,d:"Hafenstadt der Zweiten See mit Altar und Händlern."},
  {n:"Korallenkrone",x:SEA2X-2400,z:1800,r:340,peak:6,biome:"reefcrown",sea:2,d:"Ein Atoll mit Korallen, so groß wie Bäume."},
  {n:"Aschefelder",x:SEA2X+2700,z:1600,r:400,peak:70,biome:"ash",sea:2,d:"Schwarze Asche, dampfende Geysire."},
  {n:"Frostzinnen",x:SEA2X+1000,z:-3200,r:420,peak:120,biome:"spires",sea:2,d:"Eisnadeln, die in den Himmel stechen."},
  {n:"Atlantische Ruinen",x:SEA2X-2100,z:-2600,r:440,peak:16,biome:"ruins",sea:2,d:"Die versunkene Stadt ragt wieder aus dem Meer."},
  {n:"Hexenturm",x:SEA2X+5200,z:-4200,r:120,peak:12,biome:"witch",sea:2,hidden:1,d:"Ein schiefer Turm am Rand der Welt."},
  {n:"Geisterriff",x:-6400,z:6900,r:80,peak:6,biome:"ghost",sea:1,hidden:1,d:"Ein Riff, an dem nachts ein Schiff aus Licht ankert."},
  {n:"Möwenbank",x:2600,z:-8200,r:48,peak:3,biome:"sandbar",sea:1,hidden:1,sandbar:1,d:"Sand, den keine Karte kennt."},
  {n:"Treibholzbank",x:-8500,z:-2800,r:48,peak:3,biome:"sandbar",sea:1,hidden:1,sandbar:1,d:"Sand, den keine Karte kennt."},
  {n:"Sonnenbank",x:8200,z:3600,r:48,peak:3,biome:"sandbar",sea:1,hidden:1,sandbar:1,d:"Sand, den keine Karte kennt."},
];
const DEEPZ=[
  {n:"Desolate Deep",x:-2200,z:6200,r:420,col:"#0d2a45",sea:1,d:"Ein finsterer Tiefseegraben."},
  {n:"Vertigo",x:-3600,z:-7400,r:420,col:"#2d1656",sea:1,d:"Ein Strudel, in dem oben und unten verschwimmen."},
  {n:"The Depths",x:6800,z:5600,r:420,col:"#040b1c",sea:1,d:"Der tiefste Punkt der ersten See."},
  {n:"Abgrund der Stille",x:SEA2X,z:4200,r:460,col:"#12062a",sea:2,d:"Kein Laut, kein Licht. Nur Augen in der Tiefe."},
];
const RAFTS=[{n:"Ocean",x:-600,z:3500},{n:"Sturmsee",x:SEA2X+300,z:-1500}];
const PORTALS=[{from:1,x:0,z:9500,to:{x:SEA2X-4300,z:400},r:260},{from:2,x:SEA2X-4800,z:300,to:{x:120,z:9000},r:260}];
const ALL_LOC=[...ISLE.filter(i=>!i.sandbar).map(i=>i.n),...DEEPZ.map(z=>z.n),"Ocean","Sturmsee",...Object.values(AW_LOC)];
const LOCDESC=Object.fromEntries([...ISLE,...DEEPZ].map(i=>[i.n,i.d])); LOCDESC.Ocean="Offenes Meer der ersten See. Hier ziehen Hunts und Wanderungen vorbei."; LOCDESC.Sturmsee="Die offene Zweite See. Stürme und große Räuber."; LOCDESC.Blutmond="Nur während des Blutmonds, überall auf See."; LOCDESC.Sternenfall="Nur während des Sternenfalls, überall auf See."; LOCDESC["Leviathans Zorn"]="Nur während Leviathans Zorn, überall auf See.";
const SEAOF=l=>{ const i=ISLE.find(x=>x.n===l)||DEEPZ.find(x=>x.n===l); return i?i.sea:(l==="Sturmsee"?2:1) };
const SEA1_R=10200, SEA2_R=7000;
const MAP_SCALE=4; // distances compared to v2

/* ---------- boats, bag, crates, shops ---------- */
const BOATS=[
  {id:0,n:"Kein Boot",range:0,speed:0,price:0,lvl:0},
  {id:1,n:"Ruderboot",range:3300,speed:24,price:0,lvl:0,model:"boat_row",d:"Reicht für die Inseln rund um Moosewood."},
  {id:2,n:"Motorboot",range:6800,speed:40,price:2500,lvl:5,model:"boat_motor",d:"Schnell genug für den zweiten Inselring."},
  {id:3,n:"Hochseeboot",range:99999,speed:54,price:12000,lvl:12,model:"boat_cruiser",d:"Erreicht jede Ecke der See, auch die Tiefseezonen und den Mahlstrom."},
  {id:4,n:"Jetski",range:99999,speed:80,price:65000,lvl:22,model:"boat_jetski",d:"Klein, laut und extrem schnell. Perfekt für Hunts."},
  {id:5,n:"Karmesin-Segler",range:99999,speed:90,price:180000,lvl:32,model:"boat_sail",d:"Ein prachtvolles Segelschiff mit Hilfsmotor. Das schnellste Schiff der Meere."},
];
const BELL={price:35000,lvl:20};
const BAGS=[20,35,60,100,200,350]; const BAG_PRICE=[0,800,4000,15000,60000,250000];
const CRATES={
  "Bait Crate":{price:60,loc:"Moosewood",items:{"Bagel":5.882,"Flakes":5.882,"Garbage":8,"Fish Head":5.882,"Insect":5.882,"Shrimp":5.882,"Maggot":5.882,"Magnet":5.882,"Minnow":5.882,"Seaweed":5.882,"Rapid Catcher":5.882,"Instant Catcher":5.882,"Worm":5.882,"Squid":5.882,"Super Flakes":5.882}},
  "Quality Bait Crate":{price:350,loc:"Sunstone Island",items:{"Fish Head":7.692,"Maggot":23.077,"Seaweed":15.385,"Rapid Catcher":7.692,"Night Shrimp":7.692,"Instant Catcher":7.692,"Shark Head":7.692,"Squid":7.692,"Super Flakes":7.692,"Weird Algae":7.692}},
  "Coral Geode":{price:300,loc:"Roslit Bay",items:{"Coral":7.937,"Deep Coral":4.762,"Maggot":3.175,"Rapid Catcher":3.175,"Night Shrimp":3.175,"Instant Catcher":3.175,"Super Flakes":3.175,"Truffle Worm":4.862,"Minnow":1.587}},
  "Volcanic Geode":{price:300,loc:"Roslit Volcano",items:{"Coal":10.417,"Maggot":4.167,"Rapid Catcher":4.167,"Night Shrimp":4.167,"Instant Catcher":4.167,"Super Flakes":4.167,"Truffle Worm":2.083,"Minnow":2.083}},
  "Tropical Bait Crate":{price:500,loc:"Castaway Cliffs",items:{"Gale Grub":19.355,"Lushrooms":19.355,"Ember Berries":16.129,"Crystal Bananas":12.903,"Lagoon Leech":12.903,"Mist Worms":9.677,"Sapphire Krill":6.452,"Luminous Larva":3.226}},
  "Deep Tackle Box":{price:900,loc:"Desolate Deep",items:{"Bio-Infused Coral":33,"Crustacean Mix":33,"Luminous Flakes":33}},
  "Aquatic Tackle Box":{price:900,loc:"The Depths",items:{"Chitin Pellets":33,"Phosphor Jelly":33,"Trench Grubs":33}},
  "Hafenkiste":{price:2500,loc:"Ankerheim",items:{"Night Shrimp":20,"Shark Head":18,"Truffle Worm":14,"Weird Algae":14,"Luminous Larva":10,"Sapphire Krill":12,"Phosphor Jelly":6,"Mist Worms":6}},
};
const BAIT_SHOP={"Geisterköder":[900,"Geisterriff"],"Worm":[8,"Moosewood"],"Bagel":[10,"Moosewood"],"Insect":[10,"Moosewood"],"Flakes":[12,"Moosewood"],"Minnow":[25,"Roslit Bay"],"Shrimp":[25,"Roslit Bay"],"Squid":[40,"Sunstone Island"],"Seaweed":[20,"Terrapin Island"],"Coal":[45,"Roslit Volcano"],"Fish Head":[90,"Forsaken Shores"],"Deep Coral":[140,"Grand Reef"],
  "Coral":[160,"Korallenkrone"],"Super Flakes":[180,"Ankerheim"],"Shark Head":[450,"Ankerheim"],"Truffle Worm":[600,"Atlantische Ruinen"],"Night Shrimp":[400,"Frostzinnen"],"Luminous Flakes":[500,"Abgrund der Stille"]};
const POTIONS={
  luck:{n:"Glückstrank",d:"Glück +60 % für 5 Minuten",price:2500,min:5,val:60,col:"#6fe37b"},
  lure:{n:"Köder-Elixier",d:"Lure Speed +45 % für 5 Minuten",price:1500,min:5,val:45,col:"#5fd8ff"},
  xp:{n:"Weisheitstrank",d:"XP +50 % für 5 Minuten",price:2000,min:5,val:0.5,col:"#c78bff"},
  mega:{n:"Kapitänsgebräu",d:"Glück +120 %, Lure +40 %, XP +50 % für 10 Minuten",price:40000,min:10,val:1,col:"#ffd24a",sea:2},
};
const RELIC_PRICE=20000;

/* ---------- enchantments & mastery ---------- */
const ENCH=[
  {id:"hasty",n:"Hasty",d:"Lure Speed +55 %",w:14,fx:{lure:55}},
  {id:"lucky",n:"Glücksbringer",d:"Glück +50 %",w:14,fx:{luck:50}},
  {id:"steady",n:"Steady",d:"Control +5 %, Resilience +10 %",w:12,fx:{ctrl:0.05,res:10}},
  {id:"resilient",n:"Resilient",d:"Resilience +35 %",w:12,fx:{res:35}},
  {id:"clever",n:"Clever",d:"XP +60 %",w:11,fx:{xp:0.6}},
  {id:"quality",n:"Gewichtig",d:"Fische wiegen im Schnitt 20 % mehr",w:10,fx:{weight:0.2}},
  {id:"mutated",n:"Mutiert",d:"Doppelte Mutationschance",w:9,fx:{mut:1}},
  {id:"storming",n:"Sturmgeboren",d:"Bei Regen Glück +120 %",w:8,fx:{rainLuck:120}},
  {id:"noir",n:"Noir",d:"Nachts Glück +90 %",w:8,fx:{nightLuck:90}},
  {id:"swift",n:"Swift",d:"Einhol-Fortschritt +20 %",w:7,fx:{prog:0.2}},
  {id:"abyssal",n:"Abyssal",d:"12 % Chance auf die Abyssal-Mutation (×5,5)",w:4,fx:{abyssal:0.12}},
  {id:"controlled",n:"Controlled",d:"Control +12 %",w:4,fx:{ctrl:0.12}},
  {id:"divine",n:"Divine",d:"Glück +60 %, Lure +45 %, Resilience +20 %",w:2,fx:{luck:60,lure:45,res:20}},
  {id:"seaking",n:"Sea King",d:"Fische 50 % schwerer, Wert +15 %",w:1.5,fx:{weight:0.5,val:0.15}},
];
const ENCHBY=Object.fromEntries(ENCH.map(e=>[e.id,e]));
const enchTier=e=>e.w>=10?["Gewöhnlich","#dfe6ee"]:e.w>=7?["Selten","#52a8ff"]:e.w>=4?["Episch","#c78bff"]:["Legendär","#ffb23a"];
const MASTERY_T=[10,25,50,100,175,275,400,600,850,1200];
const masteryOf=n=>{ const c=(S.mastery&&S.mastery[n])||0; let L=0; while(L<MASTERY_T.length&&c>=MASTERY_T[L]) L++; return {L,c,next:MASTERY_T[L]||null,prev:L?MASTERY_T[L-1]:0} };

/* ---------- shared world clock ---------- */
const CYCLE=24*60e3, SEASON_MS=60*60e3, WEATHER_MS=6*60e3, EVENT_MS=15*60e3, EVENT_ON=10*60e3, SCHOOL_MS=5*60e3;
const SEASONS=["Spring","Summer","Autumn","Winter"], SEASON_DE={Spring:"Frühling",Summer:"Sommer",Autumn:"Herbst",Winter:"Winter"};
const WEATHER_DE={Clear:"Klar",Rain:"Regen",Foggy:"Nebel",Windy:"Wind",Aurora:"Polarlicht"};
/* global world state: admin overrides shared by all players (set on the server, see /api/gw) */
const GW={off:0,weather:null,aurora:null,season:null,event:null,evUntil:0,aw:null,awUntil:0};
const ADMIN_W=GW;
const AW={
  blood:{n:"Blutmond",d:"Der Mond färbt sich rot. Uralte Räuber steigen aus der Tiefe.",col:"#ff2a3a",night:true,mut:"Blutmond"},
  star:{n:"Sternenfall",d:"Sterne stürzen ins Meer. Was sie berühren, beginnt zu leuchten.",col:"#b58bff",night:true,mut:"Kosmisch"},
  storm:{n:"Leviathans Zorn",d:"Ein Sturm wie aus einer anderen Zeit. Etwas Gewaltiges ist erwacht.",col:"#5fd8ff",night:false,mut:"Sturmgeboren"},
};
const nowMs=()=>window.FDNET?FDNET.now():Date.now();
function world(now=nowMs()){ const real=now; now+=GW.off||0;
  const phase=(now%CYCLE)/CYCLE, hour=(6+phase*24)%24, day=hour>=6&&hour<20;
  const season=SEASONS[Math.floor(now/SEASON_MS)%4];
  const wslot=Math.floor(now/WEATHER_MS); const wr=rng(Math.imul(wslot,2654435761)^0x5bd1e995)();
  let weather=wr<.45?"Clear":wr<.63?"Rain":wr<.8?"Foggy":"Windy";
  if(GW.weather) weather=GW.weather;
  const aw=GW.aw&&GW.awUntil>real?GW.aw:null;
  let dayX=day; if(aw&&AW[aw].night) dayX=false;
  if(aw==="storm") weather="Rain";
  const aurora=aw?false:GW.aurora!==null&&GW.aurora!==undefined?(GW.aurora&&!dayX):(!dayX&&weather==="Clear"&&rng(wslot*31+5)()<0.35);
  const slot=Math.floor(now/EVENT_MS), er=rng(slot*97+13), roll=er(), pick=EVENTS[Math.floor(er()*EVENTS.length)];
  const active=roll<.75&&(now%EVENT_MS)<EVENT_ON;
  const forced=GW.event&&GW.evUntil>real?EVENTS.find(e=>e.n===GW.event):null;
  const ev=forced?{...forced,slot:Math.floor(GW.evUntil/1000)%100000,ends:GW.evUntil-(real-Date.now())}:GW.event===false?null:(active?{...pick,slot,ends:slot*EVENT_MS+EVENT_ON-(now-Date.now())}:null);
  return {phase,hour,day:dayX,realDay:day,time:dayX?"Day":"Night",season:GW.season||season,weather,aurora,event:ev,aw,awLeft:aw?GW.awUntil-real:0};
}

/* ---------- save state ---------- */
let SAVE_KEY="fischerdock-v3-guest"; const SAVE_V=5;
function freshState(){return{v:SAVE_V,money:100,xp:0,rods:["Flimsy Rod"],rod:"Flimsy Rod",bait:{Worm:5},baitEq:"Worm",fish:[],dex:{},dexLoc:{},bag:0,boat:0,bell:false,radar:false,bottle:null,
  story:0,bounties:[],bountyDone:0,visited:{Moosewood:1},dexRewards:{},relics:0,ench:{},mastery:{},buffs:{},tmap:null,chests:{},found:{},lq:{},titles:[],title:"",
  stats:{earned:0,caught:0,perfect:0,bestV:0,bestN:"",streak:0,bestStreak:0,snaps:0,sold:0,shadow:0,event:0,rarest:0,reef:0,chests:0,enchants:0,digs:0,foggy:0,nightLeg:0,exoticPlus:0,snowCaught:0,frozen:0},
  pos:null,nick:"",savedAt:0,settings:{music:true,sfx:true,radar:true}}}
let S=freshState();
function loadSave(o){ const f=freshState(); return Object.assign(f,o,{stats:Object.assign(f.stats,o.stats||{}),settings:Object.assign(f.settings,o.settings||{})}) }
function loadLocal(id,name){ SAVE_KEY="fischerdock-v3-"+(id||"guest"); S=freshState(); try{ const raw=localStorage.getItem(SAVE_KEY); if(raw){ const o=JSON.parse(raw); if(o&&o.v===SAVE_V) S=loadSave(o) } }catch(e){} S.nick=name||S.nick||"Gast"; return S }
let dirty=false;
function markDirty(){dirty=true;S.savedAt=Date.now();try{localStorage.setItem(SAVE_KEY,JSON.stringify(S))}catch(e){}}

/* ---------- levels ---------- */
const xpNeed=L=>Math.round(100+55*Math.pow(L,1.55));
function levelInfo(xp){let L=1,rest=xp;while(rest>=xpNeed(L)){rest-=xpNeed(L);L++}return{L,rest,need:xpNeed(L)}}
const TITLES=[[1,"Anfänger"],[4,"Hobbyangler"],[8,"Angler"],[12,"Fischer"],[16,"Seebär"],[22,"Kapitän"],[30,"Meisterangler"],[40,"Legende der See"],[55,"Herr der Gezeiten"]];
const titleFor=L=>TITLES.filter(t=>L>=t[0]).pop()[1];

/* ---------- gear (rod + mastery + enchant + bait + level + potions + conditions) ---------- */
function buffActive(k){ return S.buffs&&S.buffs[k]&&S.buffs[k]>Date.now() }
function gearStats(W){
  W=W||world(); const r=ROD[S.rod]||ROD["Flimsy Rod"]; const b=S.baitEq&&S.bait[S.baitEq]>0?BAIT[S.baitEq]:null; const L=levelInfo(S.xp).L;
  const M=masteryOf(r.n).L; const e=ENCHBY[S.ench[r.n]]; const fx=e?e.fx:{}; const mega=buffActive("mega");
  const AB=abilOf(r.n)||{};
  let luck=r.luck+(b?b.ul:0)+(L-1)+M*4+(fx.luck||0)+(buffActive("luck")?60:0)+(mega?120:0);
  if(AB.luckIf&&AB.luckIf[0]==="night"&&!W.day) luck+=AB.luckIf[1];
  if(fx.rainLuck&&W.weather==="Rain") luck+=fx.rainLuck; if(fx.nightLuck&&!W.day) luck+=fx.nightLuck; if(W.aurora) luck+=100;
  const lure=r.lure+(b?b.lure:0)+M*2+(fx.lure||0)+(buffActive("lure")?45:0)+(mega?40:0);
  return {rod:r,bait:b,lure,luck,AB,ctrl:r.ctrl+M*0.005+(fx.ctrl||0)+(AB.ctrl||0),res:r.res+(b?b.res:0)+M*2+(fx.res||0),mw:r.mw,lvlLuck:L-1,M,ench:e,fx,
    xpMul:1+(fx.xp||0)+(buffActive("xp")?0.5:0)+(mega?0.5:0)};
}
const bagCap=()=>BAGS[S.bag]||20;

/* ---------- fish rolling ---------- */
function poolFor(loc,spot,W,inEvent,here){
  const out=[];
  for(const f of FISH){
    if(f.l!==loc) continue;
    const isEv=EVSET.has(f.sub);
    if(isEv){ if(!inEvent||!W.event||W.event.n!==f.sub) continue }
    else if(f.sub&&f.sub!==spot) continue;
    if(f.t&&f.t!==W.time) continue;
    if(f.hard&&((f.w.length&&!f.w.includes(W.weather))||(f.s.length&&!f.s.includes(W.season)))) continue;
    if(f.r==="Apex"&&!isEv) continue;
    if(f.area&&!(here&&here.has(f.n))) continue; // bound to a fish area (visible with the Fish Radar)
    out.push({f,isEv});
  }
  return out;
}
function chanceOf(f,isEv,W,G){
  let c=f.c; if(f.r==="Secret"&&!isEv) c*=0.02;
  if(!f.hard){ if(f.w.length&&!f.w.includes(W.weather)) c*=0.35; if(f.s.length&&!f.s.includes(W.season)) c*=0.35 }
  let luck=G.luck; if(G.bait&&f.b.includes(G.bait.n)) luck+=G.bait.pl;
  return c*Math.max(0.05,1+luck/100);
}
function rollFish(loc,spot,W,G,inEvent,extraLuck=0,here=null){
  const pool=poolFor(loc,spot,W,inEvent,here); if(!pool.length) return null;
  const G2=extraLuck?{...G,luck:G.luck+extraLuck}:G;
  const cand=pool.map(({f,isEv})=>({f,c:chanceOf(f,isEv,W,G2)*(f.area?2.2:1)})).sort((a,b)=>a.c-b.c);
  for(const x of cand){ if(Math.random()*100<x.c) return x.f }
  const tot=cand.reduce((s,x)=>s+x.c,0); let r=Math.random()*tot;
  for(const x of cand){ if((r-=x.c)<=0) return x.f } return cand[cand.length-1].f;
}
function rollWeight(f,wBonus=0){
  const min=Math.max(f.bw-f.wr,f.bw*0.05); let w;
  if(Math.random()<0.84-wBonus*0.4) w=min+(f.bw-min)*Math.sqrt(Math.random()); else w=f.bw+1.1*f.bw*Math.pow(Math.random(),2.2);
  w*=1+wBonus*0.5; w=Math.min(w,2.1*f.bw*(1+wBonus)); return w>=100?Math.round(w*10)/10:Math.round(w*100)/100;
}
function rollMutation(extra=0,W){ if(W&&W.aurora&&Math.random()<0.06) return "Aurora"; if(Math.random()<0.06+extra){const o={};MUTS.forEach(m=>o[m.n]=m.w);return wpick(o)} return "" }
function fishValue(it){ const f=FISHBY[it.n]; if(!f) return 0; let v=f.bv*it.w/f.bw; if(it.m&&MUT[it.m]) v*=MUT[it.m].v; if(it.sh) v*=1.85; if(it.sp) v*=1.85; if(it.bonus) v*=1+it.bonus; return Math.max(1,Math.round(v)) }
const fishLabel=it=>(it.sh?"Shiny ":"")+(it.sp?"Sparkling ":"")+(it.m?it.m+" ":"")+it.n;

/* ---------- story ---------- */
const lqDone=id=>S.lq[id]&&S.lq[id].done;
const secondSeaSpecies=()=>FISH.filter(f=>SEAOF(f.l)===2&&S.dex[f.n]).length;
const STORY=[
  {t:"Erster Fang",d:"Fange 3 Fische: Maus oder Finger auf dem Wasser halten und loslassen.",goal:3,prog:()=>S.stats.caught,rw:{c:120}},
  {t:"Ab zum Händler",d:"Verkaufe Fische beim Händler am Steg.",goal:1,prog:()=>S.stats.sold>0?1:0,rw:{c:60}},
  {t:"Bessere Ausrüstung",d:"Kaufe eine neue Rute beim Händler in Moosewood.",goal:2,prog:()=>S.rods.length,rw:{c:150,bait:["Worm",8]}},
  {t:"Schatten im Wasser",d:"Wirf direkt neben sichtbare Fischschatten. Fange 5 Fische auf diese Weise.",goal:5,prog:()=>S.stats.shadow,rw:{c:200,boat:1}},
  {t:"Leinen los!",d:"Rufe am Wasser dein Ruderboot und besuche Roslit Bay oder Terrapin Island.",goal:1,prog:()=>(S.visited["Roslit Bay"]||S.visited["Terrapin Island"])?1:0,rw:{c:300,bait:["Minnow",5]}},
  {t:"Buntes Riff",d:"Fange einen Fisch am Korallenriff von Roslit Bay.",goal:1,prog:()=>S.stats.reef||0,rw:{c:400}},
  {t:"Der Fischfinder",d:"Entdecke 10 Arten. Werftmeister Ole schenkt dir dann seinen alten Fisch-Radar: Er zeigt, wo welche Fische leben.",goal:10,prog:()=>Object.keys(S.dex).length,rw:{c:600,radar:1}},
  {t:"Etwas Seltenes",d:"Fange einen Fisch der Seltenheit Rare oder besser.",goal:1,prog:()=>S.stats.rarest>=3?1:0,rw:{c:500}},
  {t:"Mehr PS",d:"Kaufe das Motorboot in der Werft von Moosewood (ab Level 5).",goal:1,prog:()=>S.boat>=2?1:0,rw:{c:600}},
  {t:"Heiße Gewässer",d:"Fange einen Fisch am Roslit Volcano.",goal:1,prog:()=>S.dexLoc["Roslit Volcano"]?1:0,rw:{c:900,bait:["Coal",5]}},
  {t:"Schatzsucher",d:"Öffne eine Schatzkiste. Manche liegen versteckt, andere findest du über Schatzkarten, die du manchmal angelst.",goal:1,prog:()=>S.stats.chests,rw:{c:1200,relic:1}},
  {t:"Sammler",d:"Entdecke 40 Arten im Bestiary.",goal:40,prog:()=>Object.keys(S.dex).length,rw:{c:2000}},
  {t:"Eine Legende",d:"Fange einen legendären Fisch (oder besser).",goal:1,prog:()=>S.stats.rarest>=4?1:0,rw:{c:3000}},
  {t:"Hinaus auf die Hochsee",d:"Kaufe das Hochseeboot (ab Level 12).",goal:1,prog:()=>S.boat>=3?1:0,rw:{c:3000}},
  {t:"Der Altar",d:"Fahre zum Keepers Altar im hohen Norden und verzaubere eine Rute mit einem Relikt.",goal:1,prog:()=>S.stats.enchants,rw:{c:5000,relic:1}},
  {t:"Meister der Rute",d:"Erreiche Meisterschaft 3 mit einer Rute (Fänge mit dieser Rute).",goal:3,prog:()=>Math.max(0,...Object.keys(S.mastery).map(n=>masteryOf(n).L)),rw:{c:4000}},
  {t:"Event-Jäger",d:"Fange einen Hunt-Fisch. Hunts ziehen durch ein Gebiet auf der Karte; wer dort angelt, hat manchmal Glück.",goal:1,prog:()=>S.stats.event,rw:{c:6000}},
  {t:"Hinab in die Tiefe",d:"Kaufe die Tauchglocke in der Werft (ab Level 20).",goal:1,prog:()=>S.bell?1:0,rw:{c:5000}},
  {t:"Der tiefe Grund",d:"Fange einen Fisch in The Depths.",goal:1,prog:()=>S.dexLoc["The Depths"]?1:0,rw:{c:10000,relic:2}},
  {t:"Gerüchte",d:"Die Leute im Hafen erzählen von Meistern, die sich vor der Welt verstecken. Hör dich um, schau dort, wo sonst keiner hinschaut. Finde einen von ihnen.",goal:1,prog:()=>Object.keys(S.found).length?1:0,rw:{c:8000,relic:1}},
  {t:"Die Zweite See",d:"Erreiche Level 25 und fahre mit dem Hochseeboot in den Mahlstrom weit im Süden.",goal:1,prog:()=>S.visited["Ankerheim"]?1:0,rw:{c:25000,relic:2}},
  {t:"Neue Gewässer",d:"Entdecke 12 Arten in der Zweiten See.",goal:12,prog:secondSeaSpecies,rw:{c:40000}},
  {t:"Legende der Meere",d:"Erhalte eine legendäre Rute von einem der verborgenen Meister.",goal:1,prog:()=>["aldo","mara","tenzin","ysolde"].filter(lqDone).length,rw:{c:100000,relic:3}},
  {t:"Meisterangler",d:"Entdecke 220 Arten im Bestiary.",goal:220,prog:()=>Object.keys(S.dex).length,rw:{c:250000}},
];

/* ---------- legendary quest lines (hidden masters) ---------- */
const LQ={
  aldo:{npc:"Einsiedler Aldo",loc:"Nebelinsel",rod:"Nebelrute",title:"Nebelwanderer",
    intro:"„Ah, jemand hat den Weg durch den Nebel gefunden. Die Nebelrute gebe ich nicht jedem. Beweise, dass du den Nebel verstehst.“",
    steps:[{d:"Fange 25 Fische, während Nebel herrscht.",goal:25,k:"foggy"},{d:"Fange 3 legendäre (oder bessere) Fische bei Nacht.",goal:3,k:"nightLeg"},
      {d:"Bring mir 3 Enchant-Relikte.",goal:3,k:"relics",give:"relics"},{d:"Fange den Mistwhale an der Nebelinsel (nur nachts bei Nebel).",goal:1,k:"fish:Mistwhale"}]},
  mara:{npc:"Schmugglerin Mara",loc:"Castaway Cliffs",rod:"Klippenbrecher",title:"Klippenkönigin",
    intro:"„Du hast die Lagune gefunden? Respekt. Der Klippenbrecher ist unbezahlbar. Na gut, fast.“",
    steps:[{d:"Erledige 15 Aufträge.",goal:15,k:"bounties"},{d:"Fange 3 Fische der Seltenheit Exotic oder besser.",goal:3,k:"exoticPlus"},
      {d:"Entdecke je 80 % der Arten von Castaway Cliffs und Forsaken Shores.",goal:2,k:"dexpages"},{d:"Zahle 250.000 C$.",goal:250000,k:"money",give:"money"}]},
  tenzin:{npc:"Gipfelmönch Tenzin",loc:"Snowcap Island",rod:"Frostfang",title:"Frostgeborener",
    intro:"„Der Aufstieg war hart, nicht wahr? Der Frostfang verlangt noch mehr Geduld.“",
    steps:[{d:"Fange 60 Fische auf Snowcap Island.",goal:60,k:"snowCaught"},{d:"Fange Glacierfish, Pond Emperor und Walrus.",goal:3,k:"snowtrio"},
      {d:"Erreiche Meisterschaft 6 mit einer Rute.",goal:6,k:"mastery"},{d:"Fange einen Fisch mit der Mutation Frozen.",goal:1,k:"frozen"}]},
  ysolde:{npc:"Tiefseehexe Ysolde",loc:"Hexenturm",rod:"Tiefenkrone",title:"Krone der Tiefe",
    intro:"„Drei Meister haben dir ihre Ruten gegeben. Nun zeig mir, dass du die Tiefe selbst bezwingen kannst.“",
    steps:[{d:"Besitze Nebelrute, Klippenbrecher und Frostfang.",goal:3,k:"qrods"},{d:"Entdecke 60 Arten der Zweiten See.",goal:60,k:"sea2dex"},
      {d:"Fange den Abyssal Sovereign im Abgrund der Stille (nachts).",goal:1,k:"fish:Abyssal Sovereign"},{d:"Bring mir 10 Enchant-Relikte und 1.000.000 C$.",goal:1,k:"final",give:"final"}]},
};
LQ.rored={npc:"RoRed",loc:"Roslit Volcano",rod:"Tryhard Rod",title:"Tryhard",
  intro:"„Du willst die Tryhard Rod? Dann zeig mir, dass du keine Ausrüstung brauchst. Nur Können. Mit der Flimsy Rod.“",
  steps:[{d:"Erreiche Level 60.",goal:60,k:"level"},{d:"Schaffe 10 Perfect Catches in Folge mit der Flimsy Rod (ein Fehler setzt zurück).",goal:10,k:"flimsyPerfect"},
    {d:"Schaffe 25-mal in Folge Perfect Cast und Perfect Catch mit der Flimsy Rod.",goal:25,k:"flimsyPP"},{d:"Fange einen Megalodon mit einer Flimsy Rod, die die Verzauberung Hasty trägt.",goal:1,k:"tryMeg"}]};
function lqProgress(id){ const q=S.lq[id]; if(!q) return 0; const st=LQ[id].steps[q.step]; if(!st) return 0; const k=st.k;
  if(k==="relics") return Math.min(st.goal,S.relics); if(k==="money") return Math.min(st.goal,S.money);
  if(k==="dexpages"){ let n=0; for(const l of ["Castaway Cliffs","Forsaken Shores"]){ const a=FISH.filter(f=>f.l===l&&(f.r!=="Apex"||EVSET.has(f.sub))); if(a.filter(f=>S.dex[f.n]).length>=a.length*0.8) n++ } return n }
  if(k==="snowtrio") return (q.got||[]).length;
  if(k==="mastery") return Math.max(0,...Object.keys(S.mastery).map(n=>masteryOf(n).L));
  if(k==="qrods") return ["Nebelrute","Klippenbrecher","Frostfang"].filter(n=>S.rods.includes(n)).length;
  if(k==="sea2dex") return secondSeaSpecies();
  if(k==="final") return (S.relics>=10&&S.money>=1000000)?1:0;
  if(k==="level") return levelInfo(S.xp).L;
  return q.cnt||0 }

/* ---------- bounties ---------- */
function locTier(loc){ const I=ISLE.find(i=>i.n===loc)||DEEPZ.find(i=>i.n===loc); if(!I) return loc==="Sturmsee"?5:2.6; if(I.sea===2) return 5; return 1+Math.min(3,Math.hypot(I.x,I.z)/2000) }
function makeBounty(loc){
  const r=Math.random(); const W=world();
  const pool=poolFor(loc,loc==="Ocean"?"Open Sea":"",W,false).map(x=>x.f).concat(FISH.filter(f=>f.l===loc&&f.sub&&!EVSET.has(f.sub)&&(!f.t||f.t===W.time)));
  const uniq=[...new Map(pool.map(f=>[f.n,f])).values()]; const tierMul=locTier(loc);
  const easy=uniq.filter(f=>f.c>=8&&rIdx(f.r)<=3&&!f.hard);
  if(r<0.3||!easy.length){ const n=4+Math.floor(Math.random()*5); return {k:"count",loc,n,have:0,rw:Math.round(n*35*tierMul),xp:n*25,txt:`Fange ${n} Fische bei ${locName(loc)}`} }
  if(r<0.65){ const f=easy[Math.floor(Math.random()*easy.length)]; const rw=Math.round((60+150*rIdx(f.r))*tierMul); return {k:"species",loc,f:f.n,n:1,have:0,rw,xp:80+60*rIdx(f.r),txt:`Fange: ${f.n}`,hint:bountyHint(f)} }
  if(r<0.82){ const target=Math.min(3,1+Math.floor(Math.random()*3)); const n=target>=2?1:2; return {k:"rarity",loc:null,min:target,n,have:0,rw:Math.round((60+140*target)*tierMul*n),xp:150*target,txt:`Fange ${n>1?n+" Fische":"einen Fisch"}: ${RARITY[target]} oder besser`} }
  const f=easy[Math.floor(Math.random()*easy.length)]; const w=Math.round(f.bw*(0.9+Math.random()*0.3)*100)/100;
  return {k:"weight",loc,f:f.n,w,n:1,have:0,rw:Math.round((120+120*rIdx(f.r))*tierMul),xp:120,txt:`Fange ${f.n} ab ${fmtKg(w)}`,hint:bountyHint(f)};
}
function bountyHint(f){ const h=[]; if(f.area) h.push("Fischgebiet (Radar)"); if(f.t) h.push(f.t==="Day"?"tagsüber":"nachts"); if(f.sub&&!EVSET.has(f.sub)) h.push(spotDE(f.sub)); if(f.w.length) h.push(f.w.map(w=>WEATHER_DE[w]).join("/")); if(f.b.length) h.push("mag "+f.b[0]); return h.join(" · ") }
function spotDE(s){return {Saltwater:"Salzwasser",Freshwater:"Süßwasser (Teich)","Coral Reef":"Korallenriff","Open Sea":"offene See","Deep Ocean":"Tiefsee (weit draußen)"}[s]||s}
function locName(l){return l==="Ocean"?"offener See":l}
function ensureBounties(loc){ let g=0; while(S.bounties.length<3&&g++<30){ const b=makeBounty(loc); if(S.bounties.some(x=>x.txt===b.txt||(x.k==="rarity"&&b.k==="rarity"))) continue; S.bounties.push(b) } }

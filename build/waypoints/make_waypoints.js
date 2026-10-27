// Makes the GPX and KML waypoint files (app/waypoints/) from the stops inside the finished guide page(s).
// Run again whenever the stops change:  node build/waypoints/make_waypoints.js
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const CFG=JSON.parse(fs.readFileSync(path.join(__dirname,'config.json'),'utf8'));
const ROOT=path.resolve(__dirname,'..','..'),APP=path.join(ROOT,'app'),OUT=path.join(APP,'waypoints');fs.mkdirSync(OUT,{recursive:true});
const T={en:{acc:{HIGH:"HIGH — exact spot known",MEDIUM:"MEDIUM — right area, exact spot uncertain",LOW:"LOW — general area only",AREA:"AREA — centre of a wider area",DOC:"Documented site"},accW:"Accuracy",priv:"Private land — view from the road.",guide:"Guide",open:"Open the guide",tl:"Timeline",tour:"Tour stops",mus:"Museums",day:"Tour day",extra:"Extra stop",allow:"Allow",meta:"Waypoints from the DZ Charlie field guides. Pins marked LOW or AREA are the centre of a search area, not an exact spot."},
 es:{acc:{HIGH:"ALTA — punto exacto conocido",MEDIUM:"MEDIA — zona correcta, punto exacto incierto",LOW:"BAJA — solo la zona general",AREA:"ZONA — centro de una zona amplia",DOC:"Lugar documentado"},accW:"Certeza",priv:"Terreno privado: obsérvalo desde la carretera.",guide:"Guía",open:"Abrir la guía",tl:"Cronología",tour:"Paradas",mus:"Museos",day:"Día",extra:"Parada extra",allow:"Tiempo",meta:"Puntos de las guías de campo DZ Charlie. Los marcados como BAJA o ZONA son el centro de una zona de búsqueda, no un punto exacto."}};
const KIND_ES={"Air-raid shelter":"Refugios antiaéreos","Battlefield":"Campos de batalla","Cemetery":"Cementerios","City site":"Lugares urbanos","Interpretation centre":"Centros de interpretación","Memorial":"Monumentos","Museum":"Museos","Repression & memory site":"Lugares de represión y memoria","Ruined village":"Pueblos en ruinas","Trenches & fortifications":"Trincheras y fortificaciones"};
const esc=s=>String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const near=(a,b)=>Math.abs(a.lat-b.lat)<0.0008&&Math.abs(a.lon-b.lon)<0.0012; // about 80 m
const ICON=CFG.pages[0].url.replace(/[^/]*$/,'')+'icon-192.png';
const PAL=["ff2222cc","ffcc7a1f","ff2a8f2a","ff1f8fd6","ff8a2a8a","ff2ab0b0","ff555555","ff0057e6","ff7a5230","ffb0306a"];
(async()=>{const b=await chromium.launch();const counts={};
 for(const pg of CFG.pages){
  const L=T[pg.lang||"en"];const p=await b.newPage();await p.route(/^https?:/,r=>r.abort());
  await p.goto('file://'+path.join(APP,pg.file),{waitUntil:'load'});
  const pts=[];const add=o=>{if(!isFinite(o.lat)||!isFinite(o.lon)||(!o.lat&&!o.lon))return;if(pts.some(q=>near(q,o)))return;o.url=pg.url;pts.push(o)};
  if(CFG.type==="scw"){
   const st=await p.evaluate(()=>SCW.stops);
   st.forEach(s=>add({group:pg.lang==="es"?(KIND_ES[s.k]||s.k):(s.k==="City site"?"City sites":s.k==="Air-raid shelter"?"Air-raid shelters":s.k==="Battlefield"?"Battlefields":s.k==="Cemetery"?"Cemeteries":s.k==="Memorial"?"Memorials":s.k==="Museum"?"Museums":s.k==="Ruined village"?"Ruined villages":s.k==="Interpretation centre"?"Interpretation centres":s.k==="Repression & memory site"?"Repression & memory sites":s.k),
     name:"DZC "+s.n,lat:+s.la,lon:+s.lo,conf:s.c,when:[s.tw,s.d].filter(Boolean).join(" · "),text:s.t,look:s.lk,plan:s.pl,priv:s.pv,sym:/Museum|Interpretation/.test(s.k)?"Museum":/Cemetery|Memorial|memory/.test(s.k)?"Memorial":"Flag, Red"}));
  }else{
   const d=await p.evaluate(()=>({tl:TL.map(t=>[t[0],t[1],t[2],t[3],+t[4],+t[5],t[8],t[9]]),pool:POOL.map(s=>({name:s.name,lat:+s.lat,lon:+s.lon,conf:s.conf,day:s.day,text:s.text,look:s.look,priv:s.priv})),mus:MUS.map(m=>[m[0],m[1],+m[2],+m[3],m[5],m[6]])}));
   d.tl.forEach(t=>add({group:L.tl,name:"DZC "+t[1],lat:t[4],lon:t[5],conf:t[3],when:t[2],text:t[6],look:t[7],sym:"Flag, Red"}));
   d.pool.forEach(s=>add({group:L.tour,name:"DZC "+s.name,lat:s.lat,lon:s.lon,conf:s.conf,when:s.day?L.day+" "+s.day:L.extra,text:s.text,look:s.look,priv:s.priv,sym:"Flag, Blue"}));
   d.mus.forEach(m=>add({group:L.mus,name:"DZC "+m[0],lat:m[2],lon:m[3],when:m[1],text:m[4],look:m[5]?L.allow+": "+m[5]:"",sym:"Museum"}));
  }
  await p.close();write(pg.out,pg.title,pts,L);counts[pg.out]=pts.length;
 }
 fs.writeFileSync(path.join(__dirname,'counts.json'),JSON.stringify(counts,null,1));console.log(counts);await b.close();
})();
function descText(p,L){const a=[];if(p.when)a.push(p.when);if(p.text)a.push(p.text);if(p.look)a.push(p.look);if(p.plan)a.push(p.plan);
 if(p.conf&&L.acc[p.conf])a.push(L.accW+": "+L.acc[p.conf]+".");if(p.priv)a.push(L.priv);
 a.push(L.guide+": "+p.url);a.push("DZ Charlie · dzcharlie.com");return a.join("\n\n")}
function write(base,title,pts,L){
 let g=`<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="DZ Charlie — dzcharlie.com" xmlns="http://www.topografix.com/GPX/1/1" xmlns:gpxx="http://www.garmin.com/xmlschemas/GpxExtensions/v3">\n<metadata><name>${esc(title)}</name><desc>${esc(L.meta)}</desc><link href="https://dzcharlie.com/"><text>DZ Charlie</text></link></metadata>\n`;
 pts.forEach(p=>{g+=`<wpt lat="${p.lat.toFixed(6)}" lon="${p.lon.toFixed(6)}"><name>${esc(p.name)}</name><desc>${esc(descText(p,L))}</desc><link href="${p.url}"><text>${esc(L.open)}</text></link><sym>${p.sym}</sym><type>${esc(p.group)}</type><extensions><gpxx:WaypointExtension><gpxx:Categories><gpxx:Category>DZ Charlie</gpxx:Category></gpxx:Categories></gpxx:WaypointExtension></extensions></wpt>\n`});
 g+=`</gpx>\n`;fs.writeFileSync(path.join(OUT,base+'.gpx'),g);
 const groups=[];pts.forEach(p=>{let f=groups.find(x=>x.k===p.group);if(!f)groups.push(f={k:p.group,p:[]});f.p.push(p)});
 let k=`<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n<Document><name>${esc(title)}</name><description>${esc(L.meta)}</description>\n`;
 groups.forEach((f,i)=>{k+=`<Style id="s${i}"><IconStyle><scale>1.1</scale><Icon><href>${ICON}</href></Icon></IconStyle></Style>\n`});
 groups.forEach((f,i)=>{k+=`<Folder><name>${esc(f.k)}</name>\n`;f.p.forEach(p=>{k+=`<Placemark><name>${esc(p.name)}</name><description>${esc(descText(p,L))}</description><styleUrl>#s${i}</styleUrl><Point><coordinates>${p.lon.toFixed(6)},${p.lat.toFixed(6)},0</coordinates></Point></Placemark>\n`});k+=`</Folder>\n`});
 k+=`</Document>\n</kml>\n`;fs.writeFileSync(path.join(OUT,base+'.kml'),k);
}

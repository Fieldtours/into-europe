// snapshots of markers on the app's own map: node snap.js '[["label",lat,lon,span],...]' out.png
const {chromium}=require('playwright');const L=JSON.parse(process.argv[2]);const out=process.argv[3];
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1400,height:1000}});
await p.goto('http://localhost:8820/index.html#x');await p.waitForTimeout(1200);
await p.evaluate(L=>{const h=document.createElement('div');h.id='sn';h.style.cssText='position:absolute;left:0;top:0;width:1400px;display:grid;grid-template-columns:repeat(4,340px);gap:6px;background:#fff;z-index:99999';
 document.body.appendChild(h);L.forEach(([t,la,lo,sp])=>{const d=document.createElement('div');d.style.cssText='width:340px';
 d.innerHTML=sitmap([{key:'k',num:1,name:t,short:t.slice(0,22),lat:la,lon:lo,conf:'DOC'}],t.slice(0,30),{h:300,span:sp||0.012,nofront:true,cap:t});h.appendChild(d)})},L);
await p.waitForTimeout(3500);await (await p.$('#sn')).screenshot({path:out});await b.close()})();

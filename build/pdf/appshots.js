// Print-quality PDF maps, step 1: for every PDF map, the route/numbers/title layer at 4x sharpness
// (transparent, no map picture) and the map's position (data-proj), for the road map to be drawn under it.
const {chromium}=require('/home/claude/gmap/node_modules/playwright');const fs=require('fs');
const O='/home/claude/ie/pdf/pmaps';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const D=JSON.parse(fs.readFileSync('/home/claude/ie/pdf/italy.json'));
const ctx=await b.newContext({viewport:{width:600,height:900},deviceScaleFactor:4,serviceWorkers:'block'});const p=await ctx.newPage();
await p.goto('http://localhost:8842/index.html#pdf');await p.waitForTimeout(1500);
await p.addStyleTag({content:'html,body{background:#fff!important}body>*:not(#pdfmap){visibility:hidden!important}#pdfmap,#pdfmap *{visibility:visible!important}'});
const ONLY=(process.env.ONLY||'').split(' ').filter(Boolean);
const jobs0=[...D.days.map(d=>['day'+d.n,d.stops,'DAY '+d.n+' — '+d.title.toUpperCase(),1]),['tl',D.tl,'THE WAR IN DATE ORDER, 1939 – 1945',1],['dd',D.dd,D.ddTitle.split('—')[0].trim().toUpperCase(),0],['mus',D.mus,'MUSEUMS',0]];
if(D.extra.length)jobs0.push(['extra',D.extra,'WORTH A DETOUR',0]);
const jobs=jobs0.filter(j=>!ONLY.length||ONLY.includes(j[0]));
const meta={};
for(const [k,pts,t,line] of jobs){
 const pr=await p.evaluate(([pts,t,line,k])=>{let h=document.getElementById('pdfmap');if(!h){h=document.createElement('div');h.id='pdfmap';h.style.cssText='position:fixed;left:0;top:0;width:560px;z-index:99999;background:transparent';document.body.appendChild(h)}
  h.innerHTML=sitmap(pts.map((x,i)=>({key:'k'+i,tab:'tab-tour',num:(x.n||i+1),name:x.name,short:x.name.split(/ — | \/ /)[0].slice(0,24),lat:x.lat,lon:x.lon,conf:{HIGH:'DOC',MEDIUM:'MEDIUM',LOW:'AREA'}[x.cert]||'DOC'})),t);
  if(!line)h.innerHTML=h.innerHTML.replace(/<path d="[^"]*" fill="none" stroke="#e6dfc4"[^>]*><\/path><path d="[^"]*" fill="none" stroke="#a3261e" stroke-width="2.2" stroke-dasharray="7 4"><\/path>/,'');
  h.querySelectorAll('.zoomhint,.cap').forEach(x=>x.style.display='none');
  const s=h.querySelector('svg');
  s.style.background='transparent';let e=s.parentElement;while(e&&e!==h){e.style.background='transparent';e.style.border='0';e=e.parentElement}
  return s.getAttribute('data-proj')},[pts,t,line,k]);
 await p.waitForFunction(()=>[...document.querySelectorAll('#pdfmap svg image')].every(i=>{const u=i.getAttribute('href')||i.getAttribute('xlink:href');return !u||i.__ok}),{timeout:3000}).catch(()=>{});await p.waitForTimeout(2500);
 const el=await p.$('#pdfmap svg');await el.screenshot({path:`/home/claude/ie/pdf/maps_print/app-${k}.png`});
 meta[k]=pr.split(',').map(Number)}
console.log('overlays',Object.keys(meta).length);await b.close()})();

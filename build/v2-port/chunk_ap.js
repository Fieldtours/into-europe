

const AP_AREAS=[
 {id:"utah",name:"Utah Beach & the drop zones",short:"UTAH & DROP ZONES",blurb:"Sainte-Mère-Église, Brécourt, Utah Beach",c:[49.42,-1.25]},
 {id:"carentan",name:"Carentan & the causeways",short:"CARENTAN",blurb:"Dead Man's Corner, Carentan, Bloody Gulch",c:[49.31,-1.25]},
 {id:"omaha",name:"Omaha Beach & Pointe du Hoc",short:"OMAHA",blurb:"Pointe du Hoc, Omaha, the American Cemetery",c:[49.37,-0.93]},
 {id:"gold",name:"Bayeux, Gold & Juno",short:"BAYEUX · GOLD · JUNO",blurb:"Bayeux, Arromanches, Longues, Juno",c:[49.31,-0.58]},
 {id:"caen",name:"Caen, Sword & the British airborne",short:"CAEN · SWORD",blurb:"Caen Memorial, Pegasus Bridge, Merville",c:[49.23,-0.32]}];
const AP_OVR={};
/* ---------- CHOOSE YOUR AREA + TIME (added Sep 2026) ---------- */
/* Works on top of the day-by-day planner: when a visitor has chosen an area and a time,
   buildPlan() hands over to apBuild(); otherwise the classic plan runs exactly as before. */
const AP_TIMES=[["2h","2 hours",1,120],["half","Half a day",1,240],["1","1 day",1],["2","2 days",2],["3","3 days",3],["45","4–5 days",5],["w1","1 week",7],["w2","2 weeks",14]];
const AP_MUS=/museum|musée|museo|dokumentation|documentation|centre|center|experience|expo/i;
const AP_MEM=/cemetery|memorial|monument|friedhof|cimeti|grave|mémorial|gedenk/i;
const AP_FOCUS=[
 ["ess","The essentials","The must-see and important sites",p=>p.pri<=3],
 ["all","Everything","Every site in your area, as time allows",p=>true],
 ["easy","Only Easy Company","Only where E Company fought and moved",p=>isEasy(p)],
 ["mus","Museums","Museums and documentation centres",p=>AP_MUS.test(p.name+" "+(p.cat||""))],
 ["mem","Cemeteries & memorials","Cemeteries, memorials and monuments",p=>AP_MEM.test(p.name+" "+(p.cat||""))]];
const AP_KEY="ec-ap-"+(location.pathname.split("/").pop()||"index.html");
let AP={on:false,step:0,mode:"regions",regions:[],place:null,radius:25,box:null,time:"1",focus:"ess",start:"first",startPlace:null,hours:7,res:null};
try{const s=JSON.parse(localStorage.getItem(AP_KEY)||"null");if(s)AP=Object.assign(AP,s,{step:0,res:null})}catch(e){}
function apSave(){try{const c=Object.assign({},AP);delete c.res;delete c.step;localStorage.setItem(AP_KEY,JSON.stringify(c))}catch(e){}}
function apOn(){return !!AP.on}
function apOff(){if(AP.on){AP.on=false;apSave()}}
const apRad=d=>d*Math.PI/180;
function apKm(a,b,c,d){const h=Math.sin(apRad(c-a)/2)**2+Math.cos(apRad(a))*Math.cos(apRad(c))*Math.sin(apRad(d-b)/2)**2;return 12742*Math.asin(Math.sqrt(Math.min(1,h)))}
function apDrive(km){return km<=0?0:Math.round(km*1.35/(km>80?90:60)*60)}
function apHm(m){m=Math.round(m);const h=Math.floor(m/60),r=m%60;return h?(r?`${h} h ${r} min`:`${h} h`):`${r} min`}
function apRegionOf(p){if(AP_OVR[p.name])return AP_OVR[p.name];let bi=AP_AREAS[0].id,bd=1e9;
  AP_AREAS.forEach(a=>{const d=Math.hypot(p.lat-a.c[0],(p.lon-a.c[1])*Math.cos(apRad(a.c[0])));if(d<bd){bd=d;bi=a.id}});return bi}
function apAll(){ensureDdayPool();return POOL}
function apIn(p){
  if(AP.mode==="regions")return AP.regions.length?AP.regions.includes(apRegionOf(p)):false;
  if(AP.mode==="around")return AP.place?apKm(AP.place[0],AP.place[1],p.lat,p.lon)<=AP.radius:false;
  if(AP.mode==="screen"&&AP.box){const b=AP.box;return p.lat>=b.s&&p.lat<=b.n&&p.lon>=b.w&&p.lon<=b.e}
  return false}
function apAreaName(){
  if(AP.mode==="regions")return AP.regions.map(id=>(AP_AREAS.find(a=>a.id===id)||{}).name).filter(Boolean).join(" + ")||"no region chosen";
  if(AP.mode==="around")return AP.place?`${AP.radius} km around ${AP.place[2]}`:"no place chosen";
  return "the part of the map you chose"}
function apBudget(){const t=AP_TIMES.find(x=>x[0]===AP.time)||AP_TIMES[2];return{days:t[2],perDay:t[3]||AP.hours*60,label:t[1]}}
function apOrder(pts,start,iters){ // nearest neighbour, then a 2-opt tidy-up (open path from the start)
  if(!pts.length)return[];const rem=pts.slice(),out=[];let cur=start;
  if(!cur){rem.sort((a,b)=>a.pri-b.pri||a.seq-b.seq);const f=rem.shift();out.push(f);cur=[f.lat,f.lon]}
  while(rem.length){let bi=0,bd=1e9;rem.forEach((s,i)=>{const d=apKm(cur[0],cur[1],s.lat,s.lon);if(d<bd){bd=d;bi=i}});const s=rem.splice(bi,1)[0];out.push(s);cur=[s.lat,s.lon]}
  const P=start?[{lat:start[0],lon:start[1],st:1}].concat(out):out,dd=(a,b)=>apKm(a.lat,a.lon,b.lat,b.lon);
  let imp=true,g=0;while(imp&&g++<iters){imp=false;for(let i=1;i<P.length-2;i++)for(let j=i+1;j<P.length-1;j++){const a=P[i-1],b=P[i],c=P[j],d=P[j+1];if(dd(a,c)+dd(b,d)<dd(a,b)+dd(c,d)-0.01){P.splice(i,j-i+1,...P.slice(i,j+1).reverse());imp=true}}}
  return start?P.slice(1):P}
function apSplit(route,start,B){const days=[];let cur=start,day=[],used=0,drv=0;
  for(const s of route){const km=cur?apKm(cur[0],cur[1],s.lat,s.lon):0,leg=apDrive(km),need=leg+s.min;
    if(day.length&&used+need>B.perDay){days.push({stops:day,used,drv});day=[];used=0;drv=0}
    day.push({s,leg,km});used+=need;drv+=leg;cur=[s.lat,s.lon]}
  if(day.length)days.push({stops:day,used,drv});return days}
function apFits(d,B){return d.length<=B.days&&d.every(x=>x.used<=B.perDay+5||x.stops.length===1)}
function apBuild(){
  const B=apBudget(),f=(AP_FOCUS.find(x=>x[0]===AP.focus)||AP_FOCUS[0])[3];
  const customs=plan.custom.map(c=>Object.assign({},c,{seq:99,pri:0,conf:"DOC",cat:"Your own stop",custom:true}));
  const area=apAll().concat(customs).filter(p=>apIn(p)&&!plan.dropped.includes(p.id));
  const forced=apAll().filter(p=>plan.forced.includes(p.id)&&!plan.dropped.includes(p.id)&&!apIn(p));
  let cand=area.filter(p=>p.custom||f(p)||plan.forced.includes(p.id));
  let fb=false;if(AP.focus==="ess"&&cand.length<3)cand=area.slice();else if(!cand.length&&area.length){cand=area.slice();fb=true}
  cand=cand.concat(forced);
  const start=(AP.start==="me"||AP.start==="town")&&AP.startPlace?[AP.startPlace[0],AP.startPlace[1]]:null;
  const ref=start||(()=>{const c=cand.slice().sort((a,b)=>a.pri-b.pri||a.seq-b.seq)[0];return c?[c.lat,c.lon]:[APP.centerLat,0]})();
  const span=Math.max(40,B.days*140),isF=p=>p.custom||plan.forced.includes(p.id);
  const sc=p=>p.pri+apKm(ref[0],ref[1],p.lat,p.lon)/span;
  cand.sort((a,b)=>(isF(b)-isF(a))||sc(a)-sc(b)||a.seq-b.seq);
  let sel=[],best=null,vis=0;const cap=B.days*B.perDay;
  for(const p of cand){if(vis+p.min>cap)continue;const t=sel.concat([p]),r=apOrder(t,start,2),d=apSplit(r,start,B);if(apFits(d,B)){sel=t;vis+=p.min;best={r,d}}}
  if(best){const r=apOrder(sel,start,40),d=apSplit(r,start,B);if(apFits(d,B))best={r,d}}
  if(!best&&cand.length){const p=cand[0];sel=[p];best={r:[p],d:apSplit([p],start,B)}}
  const ids=new Set(sel.map(p=>p.id));
  AP.res={fb,B,days:best?best.d:[],left:area.filter(p=>!ids.has(p.id)).sort((a,b)=>a.pri-b.pri||a.seq-b.seq),area:area.length,start};
  const days=AP.res.days.map(d=>d.stops.map(x=>x.s));
  while(days.length<B.days)days.push([]);
  return days}
function apSummary(days){const r=AP.res;if(!r)return"";const all=days.flat(),vis=all.reduce((s,p)=>s+p.min,0),drv=r.days.reduce((s,d)=>s+d.drv,0),nDone=all.filter(p=>visited[p.id]).length;
  const focus=(AP_FOCUS.find(x=>x[0]===AP.focus)||AP_FOCUS[0])[1];
  return `<div class="summ ap-summ"><b>${esc(r.B.label)} · ${all.length} stop${all.length===1?"":"s"} · about ${apHm(vis+drv)} including ${apHm(drv)} driving</b><br>Area: ${esc(apAreaName())} · ${esc(focus)}${r.fb?` (none in this area, so the other sites are shown)`:""}${r.start?` · starting from ${esc(AP.startPlace[2])}`:""}${nDone?` · ${nDone} visited`:""}</div>`}
function apDayLine(di,ds){const d=AP.res&&AP.res.days[di];if(!d)return `${ds.length} stops`;const vis=d.stops.reduce((s,x)=>s+x.s.min,0);
  return `${ds.length} stop${ds.length===1?"":"s"} · about ${apHm(d.used)} (visits ${apHm(vis)} + driving ${apHm(d.drv)})`}
function apEmptyDay(){return `<p class="small" style="margin-bottom:12px">Nothing left for this day — everything that fits your choices is already in the days above. Add more with ＋ Add stops, choose a bigger area, or choose "Everything".</p>`}
function apLeftHtml(){const r=AP.res;if(!r)return"";const L=r.left;
  if(!r.area)return `<div class="memo ap-left"><div class="head">Your area has no stops yet</div><p>Choose a region, a place or a part of the map under <b>Choose your area + time</b> above.</p></div>`;
  if(!L.length)return `<div class="memo ap-left"><div class="head">Nothing left out</div><p>Every site in your area is in this plan.</p></div>`;
  return `<details class="memo ap-left"><summary><b>Left out because of time or focus: ${L.length} stop${L.length===1?"":"s"}</b><span>Tap to see them. "Swap in" adds one; the plan and times update.</span></summary>${L.map(p=>`<div class="rmrow"><span>${esc(p.name)} <small>· ${p.min} min${p.pri<=1?" · must see":""}</small></span><button type="button" data-route="${esc(p.id)}">＋ Swap in</button></div>`).join("")}</details>`}

/* ---- the map used to choose an area: pan with a finger or mouse, zoom with pinch, wheel or + / − ---- */
function apMap(el,opt){
  const my=MY;let W=0,H=0,cx=0,cy=0,sc=1;
  el.innerHTML=`<svg class="ap-svg" role="img" aria-label="Map for choosing your area"><g class="ap-base"></g><g class="ap-ov"></g></svg><div class="ap-zoom"><button type="button" data-apz="1" aria-label="Zoom in">+</button><button type="button" data-apz="-1" aria-label="Zoom out">−</button></div>`;
  const svg=el.querySelector("svg"),gB=svg.querySelector(".ap-base"),gO=svg.querySelector(".ap-ov");
  const X=lo=>W/2+(lo-cx)*sc,Y=la=>H/2-(my(la)-cy)*sc;
  const pth=a=>a.map((q,i)=>(i?"L":"M")+q[0].toFixed(4)+" "+(-my(q[1])).toFixed(4)).join("");
  let base=`<rect x="-400" y="-400" width="800" height="800" fill="#cfc5a4"/>`;if(GEO.bbox){const b=GEO.bbox;base+=`<rect x="${b[0]}" y="${-my(b[3])}" width="${b[2]-b[0]}" height="${my(b[3])-my(b[1])}" fill="#9fb4bd"/>`}
  (GEO.land||[]).filter(l=>l.t===1).forEach(l=>base+=`<path d="${pth(l.p)}Z" fill="#e3dbbd" stroke="#3f3a2e" stroke-width="1.2" vector-effect="non-scaling-stroke"/>`);
  (GEO.land||[]).filter(l=>l.t===2).forEach(l=>base+=`<path d="${pth(l.p)}Z" fill="#9fb4bd" stroke="#3f5a66" stroke-width="1" vector-effect="non-scaling-stroke"/>`);
  (GEO.urban||[]).forEach(u=>base+=`<path d="${pth(u)}Z" fill="#c9bd96" opacity=".8"/>`);
  (GEO.rivers||[]).forEach(r=>base+=`<path d="${pth(r)}" fill="none" stroke="#5f8494" stroke-width="1.4" vector-effect="non-scaling-stroke"/>`);
  (GEO.roads||[]).forEach(r=>base+=`<path d="${pth(r.p)}" fill="none" stroke="${r.t===1?"#8a2b1c":"#a08a5a"}" stroke-width="${r.t===1?1.5:1}" opacity=".8" vector-effect="non-scaling-stroke"/>`);
  base+=`<g class="ap-ras"></g>`;gB.innerHTML=base;const gR=gB.querySelector(".ap-ras");let rasKey="";
  const RAS=rasterUrls(),rr=r=>r.w/(r.b[2]-r.b[0]);
  function ras(){const lo0=cx-W/2/sc,lo1=cx+W/2/sc,y0=cy-H/2/sc,y1=cy+H/2/sc;
    const want=rasPick(sc*RAS_PR,lo0,lo1,y0,y1,my);
    const k=want.map(r=>r.src||r.url).join("|");if(k===rasKey)return;rasKey=k;
    gR.innerHTML=want.map(r=>`<image href="${r.url}" x="${r.b[0]}" y="${(-my(r.b[3])).toFixed(5)}" width="${(r.b[2]-r.b[0]).toFixed(5)}" height="${(my(r.b[3])-my(r.b[1])).toFixed(5)}" preserveAspectRatio="none"/>`).join("")}
  let raf=0;const M={X,Y,inv:(x,y)=>[Math.atan(Math.sinh((cy-(y-H/2)/sc)*Math.PI/180))*180/Math.PI,cx+(x-W/2)/sc],get sc(){return sc},get W(){return W},get H(){return H}};
  function draw(){raf=0;W=el.clientWidth||340;H=el.clientHeight||320;svg.setAttribute("viewBox",`0 0 ${W} ${H}`);
    ras();gB.setAttribute("transform",`translate(${(W/2-cx*sc).toFixed(2)} ${(H/2+cy*sc).toFixed(2)}) scale(${sc.toFixed(4)})`);
    let o="";const lim=sc>260?99:(sc>120?16:8),LB=[];
    TOWNS.slice(0,lim).forEach(t=>{const x=X(t[2]),y=Y(t[1]);if(x<4||x>W-4||y<10||y>H-4)return;const bx=[x-4,y-10,x+8+t[0].length*6.6,y+6];
      if(LB.some(q=>bx[0]<q[2]&&bx[2]>q[0]&&bx[1]<q[3]&&bx[3]>q[1]))return;LB.push(bx);
      o+=`<rect x="${(x-2.5).toFixed(1)}" y="${(y-2.5).toFixed(1)}" width="5" height="5" fill="#3f3a2e"/><text x="${(x+5).toFixed(1)}" y="${(y+4).toFixed(1)}" class="ap-town">${esc(t[0])}</text>`});
    o+=opt.overlay?opt.overlay(M):"";gO.innerHTML=o}
  const redraw=()=>{if(!raf)raf=requestAnimationFrame(draw)};
  function fit(b,pad){W=el.clientWidth||340;H=el.clientHeight||320;pad=pad==null?30:pad;
    const w=Math.max(0.02,b[3]-b[1]),h=Math.max(0.02,my(b[2])-my(b[0]));
    sc=Math.min((W-2*pad)/w,(H-2*pad)/h);cx=(b[1]+b[3])/2;cy=(my(b[0])+my(b[2]))/2;draw()}
  function bounds(){const lo0=cx-W/2/sc,lo1=cx+W/2/sc,y0=cy-H/2/sc,y1=cy+H/2/sc,inv=y=>Math.atan(Math.sinh(y*Math.PI/180))*180/Math.PI;return{s:inv(y0),n:inv(y1),w:lo0,e:lo1}}
  function zoomAt(f,px,py){const lo=cx+(px-W/2)/sc,yy=cy-(py-H/2)/sc;sc=Math.max(8,Math.min(6000,sc*f));cx=lo-(px-W/2)/sc;cy=yy+(py-H/2)/sc;redraw()}
  const P=new Map();let moved=0,pinch=null;
  svg.addEventListener("pointerdown",e=>{svg.setPointerCapture(e.pointerId);P.set(e.pointerId,[e.clientX,e.clientY]);moved=0;
    if(P.size===2){const [a,b]=[...P.values()];pinch={d:Math.hypot(a[0]-b[0],a[1]-b[1])}}});
  svg.addEventListener("pointermove",e=>{if(!P.has(e.pointerId))return;const prev=P.get(e.pointerId);P.set(e.pointerId,[e.clientX,e.clientY]);
    if(P.size===2&&pinch){const [a,b]=[...P.values()],d=Math.hypot(a[0]-b[0],a[1]-b[1]),r=svg.getBoundingClientRect();if(d>0&&pinch.d>0)zoomAt(d/pinch.d,(a[0]+b[0])/2-r.left,(a[1]+b[1])/2-r.top);pinch.d=d;moved+=10;return}
    const dx=e.clientX-prev[0],dy=e.clientY-prev[1];moved+=Math.abs(dx)+Math.abs(dy);cx-=dx/sc;cy+=dy/sc;redraw()});
  const up=e=>{if(!P.has(e.pointerId))return;P.delete(e.pointerId);if(P.size<2)pinch=null;
    if(P.size===0&&moved<6&&opt.onTap){const r=svg.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;opt.onTap(x,y,M)}};
  svg.addEventListener("pointerup",up);svg.addEventListener("pointercancel",e=>{P.delete(e.pointerId);pinch=null});
  svg.addEventListener("wheel",e=>{e.preventDefault();const r=svg.getBoundingClientRect();zoomAt(e.deltaY<0?1.25:0.8,e.clientX-r.left,e.clientY-r.top)},{passive:false});
  el.querySelectorAll("[data-apz]").forEach(b=>b.addEventListener("click",()=>zoomAt(+b.dataset.apz>0?1.5:1/1.5,W/2,H/2)));
  return{fit,bounds,redraw,draw,M}}
const AP_COL=["#a3261e","#2f6f8f","#a8741a","#5d7a2a","#6b4c8a","#2f7f7a","#8a4b2a"];
function apHull(pts){if(pts.length<3)return pts.slice();const P=pts.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]),cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
  const lo=[],hi=[];for(const p of P){while(lo.length>=2&&cr(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();lo.push(p)}
  for(let i=P.length-1;i>=0;i--){const p=P[i];while(hi.length>=2&&cr(hi[hi.length-2],hi[hi.length-1],p)<=0)hi.pop();hi.push(p)}
  return lo.slice(0,-1).concat(hi.slice(0,-1))}
function apAllBounds(){const A=apAll();let s=90,n=-90,w=180,e=-180;A.forEach(p=>{s=Math.min(s,p.lat);n=Math.max(n,p.lat);w=Math.min(w,p.lon);e=Math.max(e,p.lon)});const m=0.08*(n-s)+0.02;return[s-m,w-m,n+m,e+m]}
let AP_PM=null;
function apOverlay(M){const A=apAll();let o="";
  if(AP.mode==="regions"){const core=a=>A.filter(p=>apRegionOf(p)===a.id&&apKm(p.lat,p.lon,a.c[0],a.c[1])<=120),BD=[];
    AP_AREAS.forEach((a,i)=>{const mem=core(a);if(!mem.length)return;const on=AP.regions.includes(a.id),col=AP_COL[i%AP_COL.length];
      const h=apHull(mem.map(p=>[M.X(p.lon),M.Y(p.lat)]));const d=h.map((q,j)=>(j?"L":"M")+q[0].toFixed(1)+" "+q[1].toFixed(1)).join("")+(h.length>2?"Z":"");
      o+=`<path d="${d}" fill="${col}" fill-opacity="${on?.42:.14}" stroke="${col}" stroke-opacity="${on?.6:.28}" stroke-width="30" stroke-linejoin="round" stroke-linecap="round" class="ap-hit" data-apreg="${a.id}"/>`;
      if(on)o+=`<path d="${d}" fill="none" stroke="#1c1a15" stroke-width="2" stroke-dasharray="6 4" stroke-linejoin="round" pointer-events="none"/>`;
      BD.push({i,x:mem.reduce((s,p)=>s+M.X(p.lon),0)/mem.length,y:mem.reduce((s,p)=>s+M.Y(p.lat),0)/mem.length})});
    A.forEach(p=>{const i=AP_AREAS.findIndex(a=>a.id===apRegionOf(p));o+=`<circle cx="${M.X(p.lon).toFixed(1)}" cy="${M.Y(p.lat).toFixed(1)}" r="4" fill="${AP_COL[i%AP_COL.length]}" stroke="#fff" stroke-width="1.3" pointer-events="none"/>`});
    for(let it=0;it<60;it++){let mv=false;for(let a=0;a<BD.length;a++)for(let b=a+1;b<BD.length;b++){let dx=BD[b].x-BD[a].x,dy=BD[b].y-BD[a].y,d=Math.hypot(dx,dy);if(d>=28)continue;mv=true;if(d<.01){dx=1;dy=0;d=1}const k=(28-d)/2+.3;BD[a].x-=dx/d*k;BD[a].y-=dy/d*k;BD[b].x+=dx/d*k;BD[b].y+=dy/d*k}if(!mv)break}
    BD.forEach(q=>{o+=`<g pointer-events="none"><circle cx="${q.x.toFixed(1)}" cy="${q.y.toFixed(1)}" r="12" fill="${AP_COL[q.i%AP_COL.length]}" stroke="#fff" stroke-width="2.5"/><text x="${q.x.toFixed(1)}" y="${(q.y+4.5).toFixed(1)}" class="ap-rlab" text-anchor="middle">${q.i+1}</text></g>`})}
  else{if(AP.mode==="around"&&AP.place){const x=M.X(AP.place[1]),y=M.Y(AP.place[0]),r=AP.radius/111.32/Math.cos(apRad(AP.place[0]))*M.sc;
      o+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="rgba(163,38,30,.14)" stroke="#a3261e" stroke-width="2" stroke-dasharray="7 5"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6" fill="#a3261e" stroke="#fff" stroke-width="2"/>`}
    A.forEach(p=>{const inn=AP.mode==="around"?apIn(p):true;o+=`<circle cx="${M.X(p.lon).toFixed(1)}" cy="${M.Y(p.lat).toFixed(1)}" r="${inn?5:3.5}" fill="${inn?"#a3261e":"#6f6a58"}" stroke="#fff" stroke-width="1.3"/>`})}
  return o}
function apCount(){const n=apAll().concat(plan.custom).filter(p=>apIn(p)&&!plan.dropped.includes(p.id)).length;const el=document.getElementById("ap-count");if(!el)return n;
  el.innerHTML=n?`<b>${n} stop${n===1?"":"s"} in your area</b>${n<3?" — that's very few. Try a bigger area.":""}`:(AP.mode==="regions"?"Tap one or more regions on the map or in the list.":AP.mode==="around"?"Choose a centre: your position, a town, or tap the map.":"Move the map to the part you want, then tap “Tour this area”.");
  const nx=document.getElementById("ap-next1");if(nx)nx.disabled=!n;return n}
function apLocate(){return new Promise((ok,ko)=>{if(!navigator.geolocation)return ko();navigator.geolocation.getCurrentPosition(p=>ok([p.coords.latitude,p.coords.longitude]),ko,{enableHighAccuracy:false,timeout:12000,maximumAge:300000})})}
function apTownOpts(){return TOWNS.slice().sort((a,b)=>a[0].localeCompare(b[0]))}
function apRenderPanel(){const box=document.getElementById("apbox");if(!box)return;const s=AP.step;let h="";const cb=document.getElementById("classicbox");if(cb)cb.hidden=AP.on||s>0;
  if(s===0){
    if(AP.on){const t=apBudget().label,f=(AP_FOCUS.find(x=>x[0]===AP.focus)||AP_FOCUS[0])[1];
      h=`<div class="head">Your tour — chosen by area and time</div><p class="ap-big">${esc(apAreaName())}</p><p class="ap-sub">${esc(t)} · ${esc(f)}</p>
      <div class="ap-row"><button type="button" class="ap-btn" data-ap="step1">Change area or time</button><button type="button" class="ap-btn ghost" data-ap="classic">Back to the ready-made tour</button></div>`}
    else h=`<div class="head">Choose your area + time</div><p class="ap-big">Only have a few hours, or only want to see one part?</p><p class="ap-sub">Answer three quick questions and the guide builds a tour that fits. It works offline.</p><button type="button" class="ap-btn wide" data-ap="step1">Start: choose your area</button>`}
  else if(s===1){
    h=`<div class="head">Step 1 of 3 · Where do you want to tour?</div>
    <div class="ap-seg" role="group" aria-label="How to choose the area">${[["regions","Pick a region"],["around","Around a place"],["screen","What's on my screen"]].map(m=>`<button type="button" data-apmode="${m[0]}" aria-pressed="${AP.mode===m[0]}">${m[1]}</button>`).join("")}</div>`;
    if(AP.mode==="around"){const RS=[10,25,50,100,200];
      h+=`<div class="ap-row"><button type="button" class="ap-btn" data-ap="me">Around me</button><select id="ap-town" aria-label="Or choose a town"><option value="">…or choose a town</option>${apTownOpts().map(t=>`<option${AP.place&&AP.place[2]===t[0]?" selected":""}>${esc(t[0])}</option>`).join("")}</select></div>
      <label class="ap-lab" for="ap-rad">Distance: <b id="ap-rv">${AP.radius} km</b></label><input type="range" id="ap-rad" min="0" max="4" step="1" value="${Math.max(0,RS.indexOf(AP.radius))}"><div class="ap-ticks">${RS.map(r=>`<span>${r}</span>`).join("")}</div>`}
    h+=`<div class="ap-map" id="ap-map"></div>`;
    if(AP.mode==="regions"){const A=apAll();h+=`<div class="ap-chips">${AP_AREAS.map((a,i)=>{const n=A.filter(p=>apRegionOf(p)===a.id).length;return n?`<button type="button" data-apreg="${a.id}" aria-pressed="${AP.regions.includes(a.id)}"><i style="background:${AP_COL[i%AP_COL.length]}">${i+1}</i><b>${esc(a.name)}</b><span>${n} stops · ${esc(a.blurb)}</span></button>`:""}).join("")}</div>`}
    if(AP.mode==="screen")h+=`<button type="button" class="ap-btn wide" data-ap="usebox">Tour this area</button><p class="ap-sub">Pinch, or use + and −, to zoom to the part you want, then tap the button.</p>`;
    if(AP.mode==="around")h+=`<p class="ap-sub" id="ap-where">${AP.place?"Centre: "+esc(AP.place[2]):"You can also tap the map to set the centre."}</p>`;
    h+=`<p class="ap-count" id="ap-count" role="status"></p><div class="ap-row"><button type="button" class="ap-btn ghost" data-ap="back0">Back</button><button type="button" class="ap-btn" id="ap-next1" data-ap="step2">Next: your time</button></div>`}
  else if(s===2){
    h=`<div class="head">Step 2 of 3 · How much time do you have?</div><div class="ap-grid">${AP_TIMES.map(t=>`<button type="button" data-aptime="${t[0]}" aria-pressed="${AP.time===t[0]}">${t[1]}</button>`).join("")}</div>
    <label class="ap-lab" for="ap-start">Starting point (optional)</label><select id="ap-start"><option value="first"${AP.start==="first"?" selected":""}>The first stop</option><option value="me"${AP.start==="me"?" selected":""}>My location</option>${apTownOpts().map(t=>`<option value="t:${esc(t[0])}"${AP.start==="town"&&AP.startPlace&&AP.startPlace[2]===t[0]?" selected":""}>${esc(t[0])}</option>`).join("")}</select>
    <p class="ap-sub" id="ap-startmsg">${AP.start==="me"&&AP.startPlace?"Starting from your position.":""}</p>
    <label class="ap-lab" for="ap-hours">Hours per day, visiting and driving</label><select id="ap-hours">${[4,5,6,7,8,9,10].map(n=>`<option value="${n}"${AP.hours===n?" selected":""}>${n} hours${n===7?" (usual)":""}</option>`).join("")}</select>
    <div class="ap-row"><button type="button" class="ap-btn ghost" data-ap="step1">Back</button><button type="button" class="ap-btn" data-ap="step3">Next: what matters most</button></div>`}
  else{
    h=`<div class="head">Step 3 of 3 · What matters most?</div><div class="ap-list">${AP_FOCUS.map(f=>`<button type="button" data-apfocus="${f[0]}" aria-pressed="${AP.focus===f[0]}"><b>${f[1]}</b><span>${f[2]}</span></button>`).join("")}</div>
    <div class="ap-row"><button type="button" class="ap-btn ghost" data-ap="step2">Back</button><button type="button" class="ap-btn" data-ap="build">Build my tour</button></div>`}
  box.innerHTML=h;
  if(s===1){const el=document.getElementById("ap-map");
    AP_PM=apMap(el,{overlay:apOverlay,onTap:(x,y,M)=>{
      if(AP.mode==="regions"){let best=null,bd=40;apAll().forEach(p=>{const d=Math.hypot(M.X(p.lon)-x,M.Y(p.lat)-y);if(d<bd){bd=d;best=p}});
        let id=best?apRegionOf(best):null;
        if(!id){const ll=M.inv(x,y);id=apRegionOf({name:"",lat:ll[0],lon:ll[1]})}
        if(id)apToggleRegion(id)}
      else if(AP.mode==="around"){const ll=M.inv(x,y);AP.place=[ll[0],ll[1],"the point you tapped"];apSave();apAroundUpd(false)}}});
    if(AP.mode==="around"&&AP.place)apAroundUpd(true);
    else if(AP.mode==="screen"&&AP.box)AP_PM.fit([AP.box.s,AP.box.w,AP.box.n,AP.box.e],0);
    else AP_PM.fit(apAllBounds());
    apCount()}}
function apAroundUpd(fit){const w=document.getElementById("ap-where");if(w)w.textContent=AP.place?"Centre: "+AP.place[2]:"";
  if(AP_PM&&AP.place){if(fit!==false){const d=AP.radius/111.32*1.15,c=Math.cos(apRad(AP.place[0]));AP_PM.fit([AP.place[0]-d,AP.place[1]-d/c,AP.place[0]+d,AP.place[1]+d/c],16)}else AP_PM.redraw()}apCount()}
function apToggleRegion(id){AP.regions=AP.regions.includes(id)?AP.regions.filter(x=>x!==id):AP.regions.concat([id]);apSave();
  document.querySelectorAll("#apbox .ap-chips [data-apreg]").forEach(b=>b.setAttribute("aria-pressed",AP.regions.includes(b.dataset.apreg)));if(AP_PM)AP_PM.redraw();apCount()}
function apScroll(){const b=document.getElementById("apbox");if(b)b.scrollIntoView({block:"start",behavior:"smooth"})}
document.addEventListener("click",e=>{const t=e.target.closest("#apbox button");if(!t)return;
  const a=t.dataset.ap;
  if(t.dataset.apmode){AP.mode=t.dataset.apmode;apSave();apRenderPanel();return}
  if(t.dataset.apreg){apToggleRegion(t.dataset.apreg);return}
  if(t.dataset.aptime){AP.time=t.dataset.aptime;apSave();t.parentNode.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",b===t));return}
  if(t.dataset.apfocus){AP.focus=t.dataset.apfocus;apSave();t.parentNode.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",b===t));return}
  if(!a)return;
  if(a==="step1"||a==="step2"||a==="step3"){if(a==="step2"&&!apCount())return;AP.step=+a.slice(4);apRenderPanel();apScroll();return}
  if(a==="back0"){AP.step=0;apRenderPanel();apScroll();return}
  if(a==="classic"){AP.on=false;AP.step=0;apSave();renderTour();apScroll();return}
  if(a==="me"){const w=document.getElementById("ap-where");if(w)w.textContent="Finding your position…";
    apLocate().then(p=>{AP.place=[p[0],p[1],"your position"];apSave();apAroundUpd()}).catch(()=>{if(w)w.textContent="Your position isn't available here — choose a town instead."});return}
  if(a==="usebox"){if(AP_PM){const b=AP_PM.bounds();AP.box=b;apSave();apCount();const c=document.getElementById("ap-count");if(c)c.scrollIntoView({block:"center",behavior:"smooth"})}return}
  if(a==="build"){AP.on=true;AP.step=0;apSave();renderTour();apScroll();toast("Your tour is ready");return}
});
document.addEventListener("change",e=>{const t=e.target;if(!t.closest||!t.closest("#apbox"))return;
  if(t.id==="ap-town"){const tw=TOWNS.find(x=>x[0]===t.value);if(tw){AP.place=[tw[1],tw[2],tw[0]];apSave();apAroundUpd()}return}
  if(t.id==="ap-hours"){AP.hours=+t.value;apSave();return}
  if(t.id==="ap-start"){const v=t.value,m=document.getElementById("ap-startmsg");
    if(v==="first"){AP.start="first";AP.startPlace=null;if(m)m.textContent=""}
    else if(v==="me"){AP.start="me";if(m)m.textContent="Finding your position…";apLocate().then(p=>{AP.startPlace=[p[0],p[1],"your position"];apSave();if(m)m.textContent="Starting from your position."}).catch(()=>{AP.start="first";AP.startPlace=null;apSave();t.value="first";if(m)m.textContent="Your position isn't available here — the tour starts at the first stop."})}
    else{const tw=TOWNS.find(x=>x[0]===v.slice(2));if(tw){AP.start="town";AP.startPlace=[tw[1],tw[2],tw[0]];if(m)m.textContent=""}}
    apSave();return}});
document.addEventListener("input",e=>{if(e.target.id!=="ap-rad")return;const RS=[10,25,50,100,200];AP.radius=RS[+e.target.value]||25;apSave();const v=document.getElementById("ap-rv");if(v)v.textContent=AP.radius+" km";apAroundUpd()});
window.addEventListener("resize",()=>{if(AP_PM&&AP.step===1)AP_PM.redraw()});

window.AAR_CFG={key:"ecn-aar",data:{"d1-1": {"when": "NIGHT 5–6 JUN 1944", "sort": "1944-06-06T00:30", "ev": "The night drop scatters paratroopers across the countryside around this chiefly 82nd Airborne town.", "q": {"t": "Whose story is Sainte-Mère-Église chiefly?", "o": ["The 82nd Airborne's", "Easy Company's alone", "The British 6th Airborne's"], "a": 0, "x": "Sainte-Mère-Église is chiefly an 82nd Airborne story; for Easy it shows the scale of the night-drop chaos."}, "rem": "The lesson here is dispersion: the night drop scattered men far from where they were meant to land.", "solemn": false, "st": "Sainte-Mère-Église was one of the key orientation points of the airborne landings, its church and compact street plan still easy to read. The story here belongs chiefly to the 82nd Airborne. For Easy Company it shows the scale of the night-drop chaos, and how far scattered men came down from where they were meant to be. Today there is no Easy plaque to find; the distances on the map carry the lesson of dispersion."}, "d1-2": {"when": "NIGHT 5–6 JUN 1944", "sort": "1944-06-06T00:30", "ev": "Overloaded C-47s carry paratroopers through darkness and flak toward the drop zones.", "q": {"t": "Which aircraft does the museum use to explain what a 'stick' meant?", "o": ["A landing craft", "A B-26 bomber", "The C-47 transport"], "a": 2, "x": "The C-47 and the 101st interpretation make this the best place to understand what a 'stick' meant."}, "rem": "Before any Easy man touched French soil there were overloaded aircraft, darkness, flak, jump lights and landing alone.", "solemn": false, "st": "Before any Easy man touched French soil, the invasion was already an ordeal: overloaded C-47s, darkness, flak, jump lights, static lines, and then a landing alone. The museum reconstructs that night through aircraft, a glider, uniforms and equipment, making the experience physical rather than abstract. It is the best place to understand what a 'stick' meant to the men who jumped. Today the C-47 and the 101st displays deserve special attention."}, "d1-3": {"when": "6 JUN 1944 ~01:30", "sort": "1944-06-06T01:30", "ev": "Winters lands west of Sainte-Mère-Église, separated from his company and without his weapon.", "q": {"t": "How did Winters arrive on the ground?", "o": ["Beside his company, fully armed", "Separated from his company and without his weapon", "By glider on the drop zone"], "a": 1, "x": "Winters came down well off DZ C, separated from his company and without his weapon, then gathered scattered paratroopers."}, "rem": "This is a probable landing sector, not a surveyed point; the absence of a monument is part of the experience.", "solemn": false, "st": "Around 01:30 on 6 June, Winters came down well off DZ C, west of Sainte-Mère-Église, separated from his company and without his weapon. This is his probable landing sector, a reconstruction rather than a surveyed touchdown point. From here he oriented himself, gathered scattered paratroopers and moved round the north side of the town toward the 506th objective. Today there is no monument, only quiet fields to imagine in darkness."}, "d1-4": {"when": "NIGHT 5–6 JUN 1944", "sort": "1944-06-06T00:30", "ev": "Easy men land across a broad area and assemble in improvised groups.", "q": {"t": "What does this stop show about the men of Sticks 68–71?", "o": ["They landed across a broad area", "They landed together on DZ C", "They came ashore by sea"], "a": 0, "x": "Men landed across a broad area and assembled in improvised groups; the company that fought on 6 June was not the one that boarded in England."}, "rem": "The company that fought on 6 June was not the one that boarded in England.", "solemn": false, "st": "The men of these Easy Company sticks did not land at four neat points. They came down across a broad area and assembled in improvised groups, so the company that fought on 6 June was not the one that had boarded in England. This stop is a lesson in dispersion rather than a set of exact landing sites. Today the plotted points, set against the intended DZ C, show how much cohesion had to be rebuilt on the ground."}, "d1-5": {"when": "NIGHT 5–6 JUN 1944", "sort": "1944-06-06T00:30", "ev": "C-47 42-93095, carrying Lt. Meehan and Easy paratroopers, is hit by flak and crashes.", "q": null, "rem": "All five aircrew and 17 paratroopers, among them Lt. Meehan and 1st Sgt. Evans, were killed here.", "solemn": true, "st": "On the night of the drop, C-47 42-93095, carrying Lt. Thomas Meehan, 1st Sgt. Evans and 15 other Easy paratroopers, was hit by flak and crashed near Beuzeville-au-Plain. All five aircrew and 17 paratroopers were killed. With Meehan missing, Winters was drawn into the leadership vacuum that morning, and so the story of his leadership begins partly here. Today the memorial marks a documented crash-site vicinity, unlike the scatter points elsewhere."}, "d1-6": {"when": "6 JUN 1944", "sort": "1944-06-06T00:00", "ev": "A separated Easy group of Guth, Talbert, Gordon and Tipper fights local actions nearby.", "q": {"t": "Who formed the separated Easy group linked to this area?", "o": ["Winters and the battalion staff", "Malarkey, Guarnere and Toye", "Guth, Talbert, Gordon and Tipper"], "a": 2, "x": "Guth, Talbert, 'Smokey' Gordon and Tipper were one of the small groups formed from whoever was nearby."}, "rem": "On D-Day small groups formed from whoever was nearby, fought local actions and moved toward friendly objectives.", "solemn": false, "st": "This farm country is associated with a separated group of Easy men: Guth, Talbert, 'Smokey' Gordon and Tipper. Like many paratroopers that night, they formed a small group from whoever was nearby, fought local actions and moved toward friendly objectives. Their story shows how much of the first day was fought by small, improvised groups. Today the hedgerows and farm lanes can be read from the road, but private fields and farm property are off limits."}, "d1-7": {"when": "6 JUN 1944", "sort": "1944-06-06T14:00", "ev": "Easy and 2/506 operate through the village after Brécourt as airborne and seaborne forces consolidate.", "q": {"t": "What role does Sainte-Marie-du-Mont play in the 506th's D-Day story?", "o": ["The heart of its D-Day sector", "Its embarkation port for England", "Its jump-off airfield"], "a": 0, "x": "Sainte-Marie-du-Mont was the heart of the 506th's D-Day sector, linking the landings, the routes to Utah and the Brécourt action."}, "rem": "Here the scattered story of the night drop converges; the church tower is your geographic reset.", "solemn": false, "st": "Sainte-Marie-du-Mont lay at the heart of the 506th's D-Day sector, connecting the landings, the routes to Utah and the Brécourt action. After Brécourt, Easy and 2/506 operated through this sector on the afternoon and evening of 6 June as airborne and seaborne forces consolidated, before moving south-west toward Culoville. Here the scattered story of the night began to converge. Today the village and its church tower serve as a geographic reset."}, "d1-8": {"when": "6 JUN 1944, MORNING", "sort": "1944-06-06T07:00", "ev": "Winters reaches the battalion CP and receives the mission that leads to Brécourt.", "q": {"t": "Why was Winters drawn into leadership here?", "o": ["He was promoted before the jump", "He volunteered for a patrol", "Lt. Meehan was missing"], "a": 2, "x": "With Meehan missing, Winters was drawn into the leadership vacuum and sent to neutralize artillery firing toward Utah Beach."}, "rem": "This is the hinge of the story: the leadership vacuum that put Winters in charge of the Brécourt assault.", "solemn": false, "st": "On the morning of 6 June, Winters reached the 2nd Battalion, 506th command post in this area at Le Grand Chemin. With Meehan missing, he was drawn into the leadership vacuum and sent forward to investigate and neutralize artillery firing toward Utah Beach, the mission that led to Brécourt. The location is an interpretive reconstruction, not a marked footprint. Today this unremarkable roadside ground is best understood as the hinge in the story."}, "d1-9": {"when": "6 JUN 1944", "sort": "1944-06-06T08:00", "ev": "Junior officers such as Winters take the lead on D-Day in the bocage near Utah.", "q": {"t": "What does the Winters monument represent?", "o": ["The spot where Winters landed", "The junior officers who led on D-Day", "A captured German gun pit"], "a": 1, "x": "The monument stands for the junior officers who led on D-Day; it is not a combat position."}, "rem": "Winters stands here for all the junior officers who led on D-Day, on the road to Utah Beach.", "solemn": false, "st": "The monument honours Richard D. Winters, and through him the junior officers who led on D-Day. It does not mark a combat position, but its placement on the road to Utah makes it an effective pause before Brécourt, where Winters led the attack on the guns that morning. In the bocage, visibility could collapse within metres. Today, looking past the statue, the visitor sees the flat farmland and hedges that shaped the fighting."}, "d1-10": {"when": "6 JUN 1944 ~08:30", "sort": "1944-06-06T08:30", "ev": "Easy men attack the battery whose guns are believed to be firing toward Utah Beach.", "q": {"t": "Where were the Brécourt guns believed to be firing?", "o": ["Toward Utah Beach", "Toward Carentan", "Toward Sainte-Mère-Église"], "a": 0, "x": "The guns were believed to be firing toward Utah Beach; the memorial is the public viewpoint over the private battery area."}, "rem": "The memorial identifies the men who took part; the battery ground itself is private, so read it from here.", "solemn": false, "st": "On the morning of 6 June, Easy Company attacked a battery near here whose guns were believed to be firing toward Utah Beach. The memorial is the practical public viewpoint for the Brécourt story, a place to learn who took part and to orient toward the private battery area. From here the action can be understood without leaving public ground. Today the memorial helps identify the participants before the visitor reads the fields beyond."}, "d1-11": {"when": "6 JUN 1944 ~08:30", "sort": "1944-06-06T08:30", "ev": "Lt. Winters leads a small Easy force against the four guns at Brécourt Manor.", "q": {"t": "How did Winters's force take the guns?", "o": ["One frontal charge across open ground", "By calling in air support", "In sequence, via the connecting trench"], "a": 2, "x": "Under suppressive fire, small groups got into the trench and took the four guns one by one; the force then withdrew rather than assaulting the manor."}, "rem": "Four guns were taken one by one from a connecting trench; the exact position of every gun pit is still debated.", "solemn": false, "st": "Between about 08:30 and noon on 6 June, Winters led a small force against four gun positions here. The method was deliberate: suppressive fire, movement by small groups, into the trench, and the guns taken in sequence rather than by frontal assault. The force then withdrew rather than assaulting the manor itself, and the exact geometry of every gun pit is still debated. Today the battery area is private property, best understood from legal viewpoints."}, "d1-12": {"when": "6 JUN 1944", "sort": "1944-06-06T06:30", "ev": "Troops and vehicles come ashore through a vulnerable beachhead while airborne troops secure exits inland.", "q": {"t": "What do the museum's maps explain about Brécourt?", "o": ["Why artillery threatened the beach exits", "Where Winters landed", "How Carentan fell"], "a": 0, "x": "Its maps of beach exits and artillery threats make clear why guns firing toward Utah had to be silenced."}, "rem": "The beach and the airborne drop were two halves of one plan: the airborne secured the exits the beach depended on.", "solemn": false, "st": "While the airborne troops secured the exits inland, soldiers and vehicles came ashore through a vulnerable beachhead at Utah. This museum tells that other half of the D-Day story, with landing craft, vehicles and a B-26 bomber. Its maps of the beach exits and the artillery threats show why the assault at Brécourt mattered. Today, coming here after Brécourt, the visitor can focus on those maps and see the reason for the attack."}, "d1-13": {"when": "10–11 JUL 1944", "sort": "1944-07-10T00:00", "ev": "Easy Company moves down to Utah Beach to embark, ending its Normandy campaign.", "q": {"t": "How does Easy's Normandy campaign end at Utah Beach?", "o": ["It lands here by boat", "It holds the dunes against a counterattack", "It embarks here on 10–11 July"], "a": 2, "x": "Easy jumped inland rather than landing here, but its Normandy campaign ended on this beach with embarkation on 10–11 July."}, "rem": "Utah, the westernmost landing beach, depended on forces inland, and it was from here that Easy left Normandy in July.", "solemn": false, "st": "Utah was the westernmost of the landing beaches, and its success depended on the forces fighting inland, Easy Company among them. The beach also marked the end of Easy's Normandy campaign: the company moved down to it on 10 July and embarked around 11 July, reaching Southampton on the night of 12 July. Today the walk runs from the dunes to the water and then back inland, from sea to land."}, "d2-1": {"when": "JUN 1944", "sort": "1944-06-06T00:00", "ev": "The 82nd Airborne fights for the Merderet crossings in some of the invasion's fiercest airborne combat.", "q": {"t": "What made the La Fière causeway so hard to fight over?", "o": ["Steep cliffs above the beach", "Flooded lowlands turned the road into a bottleneck", "Dense forest on both sides"], "a": 1, "x": "Flooded lowlands turned the causeway into a bottleneck; the same problem returns on the approach to Carentan."}, "rem": "Control of a single causeway over flooded ground could decide a battle, a lesson repeated on the way to Carentan.", "solemn": false, "st": "La Fière was not an Easy Company action, but it is indispensable context. Control of the Merderet crossings produced some of the fiercest airborne fighting of the invasion, an 82nd Airborne battle. The causeway showed how flooded lowlands could turn an ordinary road into a bottleneck, the same problem Easy later faced on the approach to Carentan. Today the bridge, the causeway and the flood plain can be studied as a single piece of geometry."}, "d2-2": {"when": "8 JUN 1944", "sort": "1944-06-08T00:00", "ev": "The 506th takes the village while Easy is held in reserve.", "q": {"t": "Where was Easy when the 506th took St-Côme-du-Mont on 8 June?", "o": ["Leading the assault", "In reserve", "Back in England"], "a": 1, "x": "The 506th took the village on 8 June while Easy was in reserve; hedgerows and narrow roads fragmented every movement."}, "rem": "Short map distances concealed difficult ground: every hedge a wall, every junction an objective.", "solemn": false, "st": "The 101st pushed through St-Côme-du-Mont on its way toward Carentan, and the 506th took the village on 8 June while Easy Company was in reserve. Here hedgerows and narrow roads fragmented every movement. A few days later Easy passed along this road itself, moving south toward Carentan on the evening of 11 June. Today short distances on the map conceal difficult ground, where every hedge is a wall and every junction an objective."}, "d2-3": {"when": "11 JUN 1944, EVENING", "sort": "1944-06-11T19:00", "ev": "Easy passes the crossroads moving south toward Carentan.", "q": {"t": "Which link to Easy's D-Day losses has been displayed at this museum?", "o": ["Winters's lost weapon", "A Brécourt gun", "Material from Meehan's crashed C-47"], "a": 2, "x": "Material from Lt. Meehan's crashed C-47 has been displayed here; Easy itself passed this corner on the evening of 11 June."}, "rem": "This was not Easy's battle site; the company passed the corner on the evening of 11 June on its way to Carentan.", "solemn": false, "st": "The crossroads known as Dead Man's Corner saw fighting around Saint-Côme-du-Mont and the approach to Carentan, which the museum here now interprets. Material from Meehan's crashed C-47 has been displayed here. Easy Company passed the corner on the evening of 11 June, moving south toward Carentan; it was not the company's principal battle site that day. Today the museum offers a refresher on the 101st-wide picture before the exposed Douve approach."}, "d2-4": {"when": "11 JUN 1944", "sort": "1944-06-11T20:00", "ev": "Easy crosses the Douve causeway corridor, then leaves the road for the fields.", "q": {"t": "What dictated movement in the Douve sector?", "o": ["Waterways, marshes and raised roads", "Mountain passes", "Railway lines"], "a": 0, "x": "Waterways, marshes, bridges and raised roads left few alternatives, so a junction or causeway mattered far beyond its size."}, "rem": "In low wet fields with few routes, possession of a junction or causeway mattered far beyond its size on a map.", "solemn": false, "st": "In the Douve country, waterways, marshes, bridges and raised roads dictated movement, and possession of a single junction or causeway mattered far beyond its size on a map. On the evening of 11 June, Easy Company crossed the Douve causeway corridor, then left the road and moved across fields toward the south-west approach to Carentan. Today the visitor sees low wet fields, constrained routes and few alternatives, ground that rewards an unhurried look."}, "d2-5": {"when": "JUN 1944", "sort": "1944-06-10T00:00", "ev": "Troops advancing along the causeway are exposed, with marsh either side and no room to manoeuvre.", "q": {"t": "Whose story is Purple Heart Lane chiefly?", "o": ["Easy Company's", "The 502nd PIR's", "The British commandos'"], "a": 1, "x": "It is chiefly a 502nd PIR story, but it is the battlefield Easy moved into on the way to Carentan."}, "rem": "On a narrow causeway with marsh on both sides, men advancing toward Carentan had no room to manoeuvre.", "solemn": false, "st": "The causeway toward Carentan became notorious. Troops advancing along it were exposed, with no room to manoeuvre and marsh on either side. It is chiefly a 502nd PIR story, but it is the battlefield Easy Company moved into as the attack on Carentan unfolded in June. Today the narrow approach, with marsh either side, makes it easy to picture artillery and machine-gun fire channelled along it."}, "d2-6": {"when": "12 JUN 1944", "sort": "1944-06-12T05:00", "ev": "Easy fights building to building along Rue Holgate toward the railway, where Winters is wounded.", "q": {"t": "Where was Winters wounded in Carentan?", "o": ["In the shin near the railway", "In the arm at the church", "He was not wounded"], "a": 0, "x": "Easy fought building to building toward the railway, where Winters was wounded in the shin; the company was then billeted here 13–19 June."}, "rem": "Carentan was the prize between the Utah and Omaha lodgements, and Easy fought its way in on 12 June.", "solemn": false, "st": "Carentan was the prize between the Utah and Omaha lodgements. Early on 12 June Easy Company entered along the Route d'Auvers and Rue Holgate axis and fought building to building toward the railway, where Winters was wounded in the shin. After the 13 June battle the company was billeted here in division reserve until 19 June, while Lt. Welsh temporarily ran the company. Today the central streets are best walked rather than driven."}, "d2-7": {"when": "13 JUN 1944", "sort": "1944-06-13T00:00", "ev": "German forces counterattack south-west of Carentan; the 506th holds until armour arrives.", "q": {"t": "What was Easy's task at Bloody Gulch on 13 June?", "o": ["Seizing a bridge by night", "Landing by glider", "Holding ground against a counterattack"], "a": 2, "x": "German forces counterattacked and the 506th held until armour from the 2nd Armored Division helped restore the situation. The exact hedgerow line is disputed."}, "rem": "For Easy, Bloody Gulch was a test of holding ground rather than seizing it.", "solemn": false, "st": "On 13 June German forces, including elements of the 17th SS Panzergrenadier and Fallschirmjäger Regiment 6, counterattacked south-west of Carentan. Easy Company had dug in and held the right flank, and the 506th held until armour from the 2nd Armored Division helped restore the situation. For Easy it was a test of holding ground, not seizing it, and the exact hedgerow line is disputed. Today this is battlefield terrain of hedgerows, folds and restricted sightlines."}, "d3-1": {"when": "JUN 1944", "sort": "1944-06-06T00:00", "ev": "The German dead of the Normandy fighting are laid to rest here.", "q": null, "rem": "A place of remembrance for the German dead, widening the story from one unit to the human cost of the war.", "solemn": true, "st": "The German Military Cemetery at La Cambe holds the German dead of the Normandy fighting. The day deliberately begins here, in stark contrast to the American cemetery later, so that the tour widens from one unit's history to the human cost on every side. It is a place for quiet reflection before the beaches. Today the visitor notices the massing of the graves, the stone forms and the central mound."}, "d3-2": {"when": "6 JUN 1944", "sort": "1944-06-06T07:00", "ev": "Rangers make their cliff assault across ground cratered by the pre-invasion bombardment.", "q": {"t": "How does Pointe du Hoc relate to Brécourt?", "o": ["Easy Company fought at both", "The same kind of threat, on a larger scale", "Both were British airborne actions"], "a": 1, "x": "The Rangers' cliff assault was separate from Easy's, but it faced the same kind of threat as Brécourt, on a larger scale."}, "rem": "The preserved craters and casemates make the pre-invasion bombardment legible; the landscape itself is the exhibit.", "solemn": false, "st": "The Rangers' cliff assault at Pointe du Hoc was separate from Easy Company's war, yet it met the same kind of threat as Brécourt, on a larger scale. The preserved craters, casemates and cliff edge make the pre-invasion bombardment legible in a way few places can. Here the landscape itself is the exhibit. Today the visitor walks slowly across the cratered ground toward the cliff edge."}, "d3-3": {"when": "6 JUN 1944", "sort": "1944-06-06T06:30", "ev": "Troops land on open sand beneath commanding bluffs, with few exits off the beach.", "q": {"t": "What made Dog Green one of Omaha's most punishing sectors?", "o": ["Open sand, few exits, commanding bluffs", "Flooded fields behind the beach", "A night landing in fog"], "a": 0, "x": "Open sand, limited exits and commanding bluffs; the contrast with Utah explains why the two beachheads developed so differently."}, "rem": "The exposure is the lesson: open sand beneath commanding bluffs, with few ways off the beach.", "solemn": false, "st": "Dog Green, in front of Vierville, was among the most punishing sectors of Omaha Beach. Open sand, limited exits and commanding bluffs left the men landing here badly exposed. The contrast with Utah, where Easy Company's campaign began and ended, explains why the two beachheads developed so differently. Today, if the tide allows, the visitor can go near the waterline and then turn toward the bluffs, where the exposure is the lesson."}, "d3-4": {"when": "6 JUN 1944", "sort": "1944-06-06T06:30", "ev": "Along this frontage the draws are the only routes off the beach, overlooked by the bluffs.", "q": {"t": "On Omaha, what were the 'draws'?", "o": ["German gun casemates", "Types of landing craft", "Routes off the beach"], "a": 2, "x": "The draws were the routes off the beach; comparing exits, bluffs and fields of fire across the frontage shows how the fight was shaped."}, "rem": "What mattered on Omaha was not shoreline distance but the draws that led off the beach.", "solemn": false, "st": "A second stop on Omaha Beach keeps the landing from collapsing into a single viewpoint. Across the frontage the exits, bluffs and fields of fire differed, and comparing them shows how the battle here was shaped by the routes off the beach rather than by distance along the shore. Today the visitor walks inland from the water and picks out the draws that served as those routes."}, "d3-5": {"when": "JUN 1944", "sort": "1944-06-06T00:00", "ev": "Above Omaha Beach, the battlefield becomes individual loss.", "q": null, "rem": "Its place above Omaha makes geography and remembrance inseparable; each marker is an individual life.", "solemn": true, "st": "The Normandy American Cemetery at Colleville-sur-Mer turns the battlefield into individual loss. Its position above Omaha Beach makes geography and remembrance inseparable, with the sea and the sand directly below the graves. It deserves unhurried time and a quiet pace, well beyond the few minutes of a passing visit. Today the visitor can move beyond the central axis, read the markers one by one, and then look back toward the sea."}, "d3-6": {"when": "SUMMER 1944", "sort": "1944-06-06T00:00", "ev": "The whole Normandy campaign unfolds: bocage, attrition, breakout and collapse.", "q": {"t": "What does the Bayeux museum add to Easy's story?", "o": ["Easy's training in England", "The whole Normandy campaign", "The Bastogne siege"], "a": 1, "x": "It widens the lens from 6 June to the whole campaign, so Easy's story can be placed within the bocage, attrition and breakout."}, "rem": "Easy's weeks in Normandy were one part of a much larger campaign of bocage fighting, attrition and breakout.", "solemn": false, "st": "The Museum of the Battle of Normandy widens the lens from 6 June to the whole campaign: the bocage, the attrition, the breakout and the collapse. Coming here after days on the ground, the visitor can place Easy Company's story, from the night drop to Carentan, inside that larger campaign. Today its maps are the most useful tool, turning the ground already seen into a single picture."}, "d4-1": {"when": "JUN 1944", "sort": "1944-06-06T00:00", "ev": "The Atlantic Wall works as an artillery system, its guns set in spaced casemates.", "q": {"t": "What survives at Longues-sur-Mer?", "o": ["A Mulberry harbour section", "A C-47 transport", "Original guns in their casemates"], "a": 2, "x": "Original guns remain in their casemates, making it one of the best places to understand the Atlantic Wall as a working artillery system."}, "rem": "The spacing between positions is part of the system: this was a battery, not a single bunker.", "solemn": false, "st": "The German battery at Longues-sur-Mer was part of the Atlantic Wall and remains one of the best places to understand it as a working artillery system. Its original guns still stand in their casemates. Seeing the guns in place makes it easier to grasp how separate positions were built to work together as one. Today the visitor can walk between the positions rather than viewing a single bunker, because the spacing was part of the system."}, "d4-2": {"when": "JUN 1944", "sort": "1944-06-06T00:00", "ev": "Port Winston lets men, vehicles and supplies flow into Normandy.", "q": {"t": "What was the Mulberry harbour for?", "o": ["Landing men, vehicles and supplies", "Defence against submarines", "Evacuating civilians"], "a": 0, "x": "Port Winston let men, vehicles and supplies flow into Normandy through offshore caissons, floating roadways and shore discharge."}, "rem": "The harbour is best read as a system, offshore caissons to floating roadways to shore, across the whole bay.", "solemn": false, "st": "Arromanches tells the logistics story of Normandy. Port Winston, the Mulberry harbour, let men, vehicles and supplies flow into the lodgement. It worked as a system: offshore Phoenix caissons, then floating roadways, then discharge on the shore. Read that way, the remains scattered across the bay make sense as one machine. Today the harbour is best seen from beach level and again from the heights, since it only makes sense across the whole bay."}, "d4-3": {"when": "JUN 1944", "sort": "1944-06-06T00:00", "ev": "Above Gold Beach, British and Commonwealth sacrifice in a coalition invasion is remembered.", "q": null, "rem": "The names here turn numbers back into individuals; Overlord was a coalition operation.", "solemn": true, "st": "Above Gold Beach, the British Normandy Memorial at Ver-sur-Mer brings British and Commonwealth sacrifice into the route. Overlord was a coalition operation, and those remembered here were part of the same invasion in which Easy Company fought. The memorial offers a quiet, reflective end to the day, away from the unit history. Today the names inscribed here turn numbers back into individuals."}, "d5-1": {"when": "6 JUN 1944", "sort": "1944-06-06T00:00", "ev": "The museum sets D-Day and the Battle of Normandy within the war's origins, occupation and course.", "q": {"t": "What is the Caen Memorial's role on this tour?", "o": ["A single-battle site", "The strategic frame for the whole war", "Easy Company's billet"], "a": 1, "x": "It gives the strategic frame, from the war's origins through occupation, D-Day and the Battle of Normandy, after four days of terrain."}, "rem": "Placed after four days of terrain, the museum frames the war as a whole, including the civilian experience.", "solemn": false, "st": "The Caen Memorial Museum provides the strategic frame: the origins and course of the war, the occupation, D-Day and the Battle of Normandy. It is deliberately placed late in the tour, after four days of terrain, so that the big picture lands on ground the visitor already knows. Today the best approach is not to read every label but to concentrate on the invasion plan, the campaign and the civilian experience."}, "d5-2": {"when": "6 JUN 1944", "sort": "1944-06-06T00:00", "ev": "British glider troops capture the Orne and canal bridges in a precise opening action.", "q": {"t": "How did the Pegasus Bridge action differ from the American drop?", "o": ["It was precise, not scattered", "It happened a week later", "It used no aircraft"], "a": 0, "x": "The glider capture was one of D-Day's most precise opening actions, the opposite of the scattered American drop."}, "rem": "Opposite in execution to the scattered American drop, but with the same aim: secure crossings and protect a flank.", "solemn": false, "st": "The British airborne glider capture of the Orne and canal bridges was one of the most precise opening actions of D-Day. It was the opposite of the scattered American drop that Easy Company endured, yet it answered the same need: to secure crossings and protect a flank. Today the Memorial Pegasus museum is closed from 1 September 2026 to May 2027, but the bridge, canal and approaches remain viewable from public areas."}, "d5-3": {"when": "6 JUN 1944", "sort": "1944-06-06T00:00", "ev": "The 9th Parachute Battalion attacks the battery despite severe dispersal and lost equipment.", "q": {"t": "Which unit attacked the Merville Battery?", "o": ["Easy Company, 506th", "The 9th Parachute Battalion", "US Rangers"], "a": 1, "x": "The 9th Parachute Battalion attacked despite severe dispersal and lost equipment, the direct parallel to Brécourt."}, "rem": "Merville is the direct parallel to Brécourt: a battery attacked by dispersed paratroopers, readable here from the defender's side.", "solemn": false, "st": "At Merville the British 9th Parachute Battalion attacked a battery despite severe dispersal and lost equipment. It is the direct parallel to Brécourt, where Easy Company also went against guns with an improvised force gathered after a scattered drop. The preserved casemates let the visitor read the action from the defender's side. Today the day ends inside this defensive landscape, a natural place to compare it with Brécourt."}, "x-ang": {"when": "7–10 JUN 1944", "sort": "1944-06-07T00:00", "ev": "Two 101st medics, Wright and Moore, treat wounded of both sides inside the church.", "q": {"t": "What did medics Wright and Moore do in this church?", "o": ["Held it as a sniper post", "Hid from German patrols", "Treated wounded of both sides"], "a": 2, "x": "The church became an airborne aid station where Wright and Moore treated wounded of both sides; the bloodstained pews survive."}, "rem": "The bloodstained pews survive from the days when two medics treated the wounded of both sides here.", "solemn": false, "st": "Easy Company spent 7 to 10 June in reserve around Angoville-au-Plain, providing security for Col. Sink's regimental command post while the attack on Carentan was prepared. The village church became an airborne aid station where two 101st medics, Wright and Moore, treated the wounded of both sides. The bloodstained pews survive. Today it is a small, quiet village church, free to enter and one of the most moving stops in the Cotentin."}, "x-vie": {"when": "7 JUN 1944 ~06:00", "sort": "1944-06-07T06:00", "ev": "Easy leads the 2nd Battalion column on point and meets German paratroopers.", "q": {"t": "Whom did Easy meet on point at Vierville on 7 June?", "o": ["German paratroopers", "British commandos", "A German tank brigade"], "a": 0, "x": "Leading the 2nd Battalion column, Easy met German paratroopers; the village was cleared with support from other 506th elements and armour."}, "rem": "Easy led the battalion here on 7 June; this is the Cotentin Vierville, not Vierville-sur-Mer at Omaha.", "solemn": false, "st": "At first light on 7 June, Easy Company set out from Culoville on point, leading the 2nd Battalion column toward Vierville. The company met resistance from German paratroopers, and the village was cleared with support from other 506th elements and armour before the advance continued south toward Angoville-au-Plain. This is not Vierville-sur-Mer at Omaha. Today the approach lanes from the north show the line of that advance."}, "x-nvm": {"when": "13–28 JUN 1944", "sort": "1944-06-13T00:00", "ev": "Hedgerow fighting shapes the daily life of soldiers and civilians in the bocage.", "q": {"t": "Which part of Easy's Normandy experience does this museum cover best?", "o": ["The drop near Sainte-Mère-Église", "The hedgerow fighting after Carentan", "The embarkation at Utah"], "a": 1, "x": "It is strong on the bocage battle that followed Carentan, the world Easy lived in from 13 to 28 June."}, "rem": "From 13 to 28 June Easy lived in the hedgerow world shown here, among soldiers and civilians alike.", "solemn": false, "st": "The Normandy Victory Museum at Catz tells the story of hedgerow fighting and of the daily life of soldiers and civilians. This was the world Easy Company lived in from 13 to 28 June, after Carentan, on defensive and patrol duties until it was relieved from the line. Its displays give shape to weeks that rarely make the headlines. Today the museum is especially strong on the bocage battle that followed Carentan."}, "x-bgm": {"when": "13 JUN 1944", "sort": "1944-06-13T00:00", "ev": "The 13 June counterattack that Easy helps repel is told on the ground where it happened.", "q": {"t": "Which event does this museum focus on?", "o": ["The 13 June counterattack", "The Brécourt assault", "The Utah landing"], "a": 0, "x": "The museum tells the fighting after Carentan, including the 13 June counterattack Easy helped repel, on the ground where it happened."}, "rem": "It tells the 13 June counterattack from the ground where Easy helped repel it.", "solemn": false, "st": "The Musée Mémorial de Bloody Gulch at Méautis tells the story of the fighting after Carentan, above all the German counterattack of 13 June that Easy Company helped to repel. It tells that story from the ground where it happened, south-west of the town, where the 506th held until armour from the 2nd Armored Division arrived. Today the museum pairs directly with a visit to the Bloody Gulch sector itself."}, "x-ddw": {"when": "6 JUN 1944", "sort": "1944-06-06T00:00", "ev": "Aircraft and crews carry the airborne divisions and cover the beaches.", "q": {"t": "What is the D-Day Wings Museum's focus?", "o": ["Naval gunfire", "Tank warfare", "Aviation: the aircraft and their crews"], "a": 2, "x": "It gives aviation context: the aircraft and crews that carried the airborne divisions and covered the beaches."}, "rem": "Every airborne soldier depended on the aircraft and crews that carried him to Normandy.", "solemn": false, "st": "The D-Day Wings Museum at Bretteville-sur-Odon adds the aviation story to the invasion. It remembers the aircraft and crews that carried the airborne divisions into Normandy and covered the beaches, the world of the C-47s from which Easy Company jumped in the dark. Without them, neither the drop nor the landings could have happened in the form they took. Today it is best visited before the Caen Memorial on the last day."}, "dd-0": {"when": "6–12 JUN 1944", "sort": "1944-06-06T00:00", "ev": "A heavy 210 mm naval battery duels with the fleet off Utah until taken on 12 June.", "q": {"t": "When was the Crisbecq Battery finally taken?", "o": ["6 June", "9 June", "12 June"], "a": 2, "x": "The heavy 210 mm battery dueled with the fleet off Utah and was not taken until 12 June."}, "rem": "The Brécourt battery was a small cousin of heavy naval guns like these.", "solemn": false, "st": "The Crisbecq battery near Marcouf held heavy 210 mm naval guns that duelled with the fleet off Utah Beach, and it was not taken until 12 June. Its scale shows what the battery at Brécourt was only a small cousin of. Seeing it helps put the smaller action Easy Company fought on the morning of 6 June in proportion. Today the casemates and a museum stand north of Utah Beach."}, "dd-1": {"when": "6–9 JUN 1944", "sort": "1944-06-06T00:00", "ev": "Four tunnel-linked casemates, painted to look like houses, fire on Utah.", "q": {"t": "How were Azeville's casemates disguised?", "o": ["Hidden under a church", "Painted to look like houses", "Covered with haystacks"], "a": 1, "x": "Its four casemates, linked by tunnels, were painted to look like houses; the battery fired on Utah and held out until 9 June."}, "rem": "The battery held out until 9 June, firing on Utah from casemates disguised as houses.", "solemn": false, "st": "The Azeville battery had four casemates linked by tunnels, painted to look like houses. Its guns fired on Utah Beach, and it held out until 9 June. Like Crisbecq, it shows the German coastal artillery the Utah landings faced, the same kind of threat Easy Company confronted on a smaller scale at Brécourt. Today its tunnels are walkable, and it pairs naturally with a visit to Crisbecq."}, "dd-2": {"when": "6 JUN 1944", "sort": "1944-06-06T07:30", "ev": "The Canadians take heavy first-hour losses, then advance further inland than any other force.", "q": {"t": "What distinguished the Canadians on Juno on D-Day?", "o": ["They advanced furthest inland", "They landed by glider", "They faced no opposition"], "a": 0, "x": "They took the heaviest losses of the British beaches in the first hour, then advanced further inland than any other force on D-Day."}, "rem": "After the heaviest first-hour losses of the British beaches, the Canadians went further inland than any other force on D-Day.", "solemn": false, "st": "On Juno Beach the Canadian 3rd Division took the heaviest losses of the British beaches in the first hour of D-Day. The Canadians then advanced further inland than any other force that day. Their story broadens the invasion beyond the American sectors where Easy Company fought. Today the Juno Beach Centre at Courseulles, Canada's museum on the beach, stands close to German bunkers in the dunes."}, "dd-3": {"when": "JUN 1944", "sort": "1944-06-06T00:00", "ev": "Canadian dead from Juno and the fighting for Caen are laid to rest here.", "q": null, "rem": "2,048 Canadians from Juno and the fighting for Caen rest here, in a quiet and rarely crowded cemetery.", "solemn": true, "st": "The Bény-sur-Mer Canadian Cemetery at Reviers holds 2,048 Canadian graves from Juno Beach and the fighting for Caen. Each marks a life lost in the same campaign as Easy Company's, and together they show the price Canada paid for its part in Normandy. It is a place for quiet remembrance, away from the busier sites. Today it is a quiet cemetery, rarely crowded, where the rows can be walked in peace."}, "dd-4": {"when": "6 JUN 1944", "sort": "1944-06-06T00:00", "ev": "The German regimental HQ bunker holds up the Suffolks for most of D-Day.", "q": {"t": "What did the Hillman strongpoint help stop?", "o": ["The Utah landing", "The Pegasus Bridge raid", "Sword's advance on Caen"], "a": 2, "x": "The German regimental HQ bunker complex held up the Suffolks for most of D-Day and helped stop Sword's advance on Caen."}, "rem": "One bunker complex could delay a whole beachhead: Hillman helped stop the advance on Caen.", "solemn": false, "st": "The Hillman fortress at Colleville-Montgomery was a German regimental headquarters bunker complex in the Sword sector. It held up the Suffolks for most of D-Day and helped stop Sword's advance on Caen. It shows how a single well-built strongpoint could slow an entire beachhead's progress inland. Today its restored bunkers are open to visitors on set days."}, "dd-5": {"when": "6 JUN 1944", "sort": "1944-06-06T07:30", "ev": "Lord Lovat's commandos land with a piper playing and march to relieve Pegasus Bridge.", "q": {"t": "Where did Lovat's commandos march after landing?", "o": ["To Carentan", "To relieve Pegasus Bridge", "To Omaha Beach"], "a": 1, "x": "Lord Lovat's commandos landed with a piper playing and marched to relieve Pegasus Bridge by early afternoon."}, "rem": "Lovat's commandos landed here to a piper's tune and reached Pegasus Bridge by early afternoon.", "solemn": false, "st": "At Sword Beach, Ouistreham, the British 3rd Division and the commandos came ashore. Lord Lovat's commandos landed with a piper playing and marched inland to relieve Pegasus Bridge by early afternoon. The Grand Bunker, the German fire-control tower, overlooked the beach and is now a museum. Today the visitor finds the Grand Bunker museum and the Kieffer commando memorial."}, "dd-6": {"when": "JUN 1944", "sort": "1944-06-06T00:00", "ev": "Men of the British 6th Airborne are buried beside the first village liberated by the British.", "q": null, "rem": "2,236 graves, mostly of the airborne division, lie beside the first village liberated by the British.", "solemn": true, "st": "Ranville War Cemetery holds 2,236 graves, most of them men of the British 6th Airborne Division. It lies beside Ranville, the first village liberated by the British. Like the men of Easy Company, many of those buried here were airborne soldiers, and the rows are a reminder that the airborne war was paid for on every flank. Today the cemetery lies next to Ranville church and is free to visit."}},
 tourCard:false,docName:"AFTER ACTION REPORT",docNameShort:"After Action Report",plural:"After Action Reports",short:"reports",guide:"Easy Company · Normandy",place:"NORMANDY",
 foot:"DZ CHARLIE · EASY COMPANY",stamp:"VISITED",done:"COMPLETED",coverTitle:"IN THE FOOTSTEPS OF EASY COMPANY",fileBase:"easy-company-normandy",
 intro:"At the end of each day, write a one-page report: the places you saw, put in the order the events happened, one question to fix it in your memory, and a line in your own words. Keep the pages for your journal, or send them to family.",
 hint:"The moment you want to remember",
 theme:{paper:"#ece5cc",ink:"#1c1a15",ink2:"#3f3a2e",faint:"#6f6a58",title:"#3a4118",when:"#1c1a15",rule:"#8b8a4e",box:"#e2d9ba",stamp:"#a3261e",band:null,bandInk:"#efe9d2",
  disp:"'Stardos Stencil',Impact,sans-serif",dispW:700,mono:"'Courier Prime','Courier New',monospace",hand:"'Special Elite','Courier New',monospace",dispC:'"Stardos Stencil", Impact, sans-serif',monoC:'"Courier Prime", "Courier New", monospace',handC:'"Special Elite", "Courier New", monospace',
  cover:"#3a4118",coverInk:"#efe9d2",coverRule:"#a9a77a",coverStamp:"#e0877d"},
 visited:()=>Object.keys(visited).filter(k=>visited[k]),
 title:ids=>{ensureDdayPool();const c={};ids.forEach(id=>{const p=POOL.find(x=>x.id===id);if(p&&p.day)c[p.day]=(c[p.day]||0)+1});const k=Object.keys(c).sort((a,b)=>c[b]-c[a])[0];return k&&DAYNAMES[k-1]||""},
 stop:id=>{ensureDdayPool();const p=POOL.find(x=>x.id===id);return p?{name:p.name,pri:p.pri}:null},
 onChange:()=>{const as=document.getElementById("aar-slot");if(as&&window.AAR)as.innerHTML=AAR.card()}};
/* ---------- AFTER ACTION REPORT / DIARIO DE CAMPAÑA (added Sep 2026) ----------
   A quiet end-of-day recollection: the places you ticked off today, put in the order the
   events happened, one question, one line in your own words, and a page for your journal.
   Everything stays on the phone. No points, no scores. */
(function(){
const C=window.AAR_CFG;if(!C)return;
const D=C.data||{};
const LS={get:(k,d)=>{try{const v=localStorage.getItem(C.key+"-"+k);return v?JSON.parse(v):d}catch(e){return d}},set:(k,v)=>{try{localStorage.setItem(C.key+"-"+k,JSON.stringify(v))}catch(e){}}};
const ESC=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const today=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
const MON=["January","February","March","April","May","June","July","August","September","October","November","December"],WD=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
function longDate(iso){if(iso==="earlier")return"Before you started your "+C.short;const [y,m,d]=iso.split("-").map(Number),dt=new Date(y,m-1,d);return `${WD[dt.getDay()]} ${d} ${MON[m-1]} ${y}`}
/* ---- which stops were visited on which day: the app keeps a set of visited stops; we keep the date ---- */
let LOG=LS.get("log",null);          /* [[id,date],…] in visit order */
function sync(){const now=C.visited();const set=new Set(now);
  if(LOG===null){LOG=now.map(id=>[id,"earlier"]);LS.set("log",LOG);return}
  const had=new Set(LOG.map(x=>x[0]));let ch=false;
  now.forEach(id=>{if(!had.has(id)&&D[id]&&C.stop(id)){LOG.push([id,today()]);ch=true}});
  const keep=LOG.filter(x=>set.has(x[0]));if(keep.length!==LOG.length){LOG=keep;ch=true}
  if(ch)LS.set("log",LOG)}
let REP=LS.get("rep",{});             /* date -> {line, ans, made} */
let SET=LS.get("set",{remind:true});
let SNOOZE=LS.get("snooze","");
function days(){sync();const m=new Map();LOG.forEach(([id,d])=>{if(!C.stop(id))return;if(!m.has(d))m.set(d,[]);m.get(d).push(id)});
  const ks=[...m.keys()].sort((a,b)=>a==="earlier"?-1:b==="earlier"?1:a.localeCompare(b));
  let n=0;return ks.map(k=>({date:k,n:k==="earlier"?0:++n,ids:m.get(k)}))}
const short=n=>String(n).split(/ — | – | \/ |, | \(|:/)[0].trim();
function dayTitle(dy){const ids=dy.ids;if(!ids.length)return"";if(C.title){const t=C.title(ids);if(t)return t}const a=short(C.stop(ids[0]).name),b=short(C.stop(ids[ids.length-1]).name);return a===b?a:`${a} to ${b}`}
function pickQ(dy){const c=dy.ids.map(id=>({id,s:C.stop(id),d:D[id]})).filter(x=>x.d&&x.d.q&&!x.d.solemn);c.sort((a,b)=>(a.s.pri||3)-(b.s.pri||3));return c[0]||null}
function remFor(dy,q){if(q)return D[q.id].rem;const c=dy.ids.filter(id=>D[id]).sort((a,b)=>(C.stop(a).pri||3)-(C.stop(b).pri||3));return c.length?D[c[0]].rem:""}
function events(dy,max){let L=dy.ids.filter(id=>D[id]).map(id=>({id,s:C.stop(id),d:D[id]}));
  if(L.length>max){L=L.slice().sort((a,b)=>(a.s.pri||3)-(b.s.pri||3)).slice(0,max)}
  const key=e=>/T00:00$/.test(e.d.sort)?e.d.sort.slice(0,11)+"12:00":e.d.sort;return L.sort((a,b)=>key(a).localeCompare(key(b)))}
function solemnIds(dy){return dy.ids.filter(id=>D[id]&&D[id].solemn)}
/* ---- the journal pages (A5): one or more pages per day, used for the preview, printing and the booklet ---- */
function pageHTML(dy,total){const T=C.theme,r=REP[dy.date]||{},q=pickQ(dy),sol=solemnIds(dy);
  const all=dy.ids.filter(id=>D[id]).map(id=>({id,s:C.stop(id),d:D[id]}));
  const key=e=>/T00:00$/.test(e.d.sort)?e.d.sort.slice(0,11)+"12:00":e.d.sort;all.sort((a,b)=>key(a).localeCompare(key(b)));
  const lab=`font-family:${T.mono};font-weight:700;font-size:10px;letter-spacing:1.6px;color:${T.faint}`;
  const HEADF=(title,ts)=>T.band?`<div style="background:${T.band};color:${T.bandInk};padding:18px 24px 14px;display:flex;flex-direction:column;gap:6px;margin:-22px -24px 0">
      <div style="display:flex;justify-content:space-between;font-weight:700;font-size:10.5px;letter-spacing:2px;opacity:.85"><span>${ESC(C.docName)}</span><span>DAY ${dy.n||"–"}${total?" OF "+total:""}</span></div>
      <span style="font-family:${T.disp};font-weight:${T.dispW};font-size:${ts}px;line-height:1.02;letter-spacing:.5px">${ESC(title)}</span>
      <span style="font-size:11px;letter-spacing:1px;opacity:.85">${ESC(longDate(dy.date).toUpperCase())} · ${ESC(C.place)}</span></div>`
    :`<div style="display:flex;justify-content:space-between;font-weight:700;font-size:10.5px;letter-spacing:1.8px;color:${T.ink2}"><span>${ESC(C.docName)}</span><span>DAY ${dy.n||"–"}${total?" OF "+total:""}</span></div>
      <div style="border-top:3px solid ${T.ink};border-bottom:1px solid ${T.ink};padding:10px 0 8px;display:flex;flex-direction:column;gap:4px">
      <span style="font-family:${T.disp};font-weight:${T.dispW};font-size:${ts}px;line-height:1.02;color:${T.title};letter-spacing:.5px">${ESC(title)}</span>
      <span style="font-size:11px;letter-spacing:1px;color:${T.ink2}">${ESC(longDate(dy.date).toUpperCase())} · ${ESC(C.place)}</span></div>`;
  const HEADM=title=>`<div style="display:flex;justify-content:space-between;font-weight:700;font-size:10.5px;letter-spacing:1.8px;color:${T.ink2};border-bottom:1px solid ${T.ink2};padding-bottom:8px"><span>${ESC(C.docName)} · ${ESC(title)}</span><span style="white-space:nowrap;padding-left:10px">CONTINUED</span></div>`;
  const ENTRY=(e,last)=>`<div style="padding:7px 0 8px;${last?"":`border-bottom:1px dashed ${T.rule};`}">
      <div style="font-size:11px;line-height:1.4;margin-bottom:2px"><span style="font-weight:700;color:${T.when};letter-spacing:.5px">${ESC(e.d.when)}</span><span style="color:${T.faint}"> · </span><b style="color:${T.ink}">${ESC(e.s.name)}</b></div>
      <p style="margin:0;font-size:11px;line-height:1.42;color:${T.ink}">${ESC(e.d.st||e.d.ev)}</p>
      ${(r.notes||{})[e.id]?`<div style="margin-top:6px;border-left:2px solid ${T.stamp};padding:1px 0 1px 9px"><span style="${lab}">MY NOTE</span><p style="margin:2px 0 0;font-family:${T.hand};font-size:13.5px;line-height:1.4;color:${T.ink}">${ESC(r.notes[e.id])}</p></div>`:""}</div>`;
  const ENDB=()=>`${r.line?`<div style="display:flex;flex-direction:column;gap:5px"><span style="${lab}">WHAT STAYED WITH ME</span><p style="margin:0;font-family:${T.hand};font-size:18px;line-height:1.45">${ESC(r.line)}</p></div>`:""}
    <div style="display:flex;flex-direction:column;gap:5px;background:${T.box};padding:10px 12px"><span style="${lab}">ONE THING TO REMEMBER</span><p style="margin:0;font-size:12px;line-height:1.5">${ESC(remFor(dy,q))}</p></div>
    ${sol.length?`<div style="font-size:11.5px;line-height:1.5;color:${T.ink2}"><span style="${lab}">IN REMEMBRANCE · </span>${sol.slice(0,4).map(id=>ESC(short(C.stop(id).name))).join(" · ")}</div>`:""}`;
  const title0=dayTitle(dy).toUpperCase(),ts0=dayTitle(dy).length>26?26:32;
  /* measure real heights off-screen (fonts are loaded by now), then fill the pages */
  let M=document.getElementById("aar-measure");if(!M){M=document.createElement("div");M.id="aar-measure";M.setAttribute("aria-hidden","true");M.style.cssText="position:absolute;left:-10000px;top:0;width:456px;visibility:hidden;pointer-events:none";document.body.appendChild(M)}
  M.style.fontFamily=T.mono;const hOf=h=>{M.innerHTML=h;return M.firstElementChild?M.firstElementChild.offsetHeight:0};
  const entryH=e=>hOf(ENTRY(e,false));
  const endH=hOf(`<div style="display:flex;flex-direction:column;gap:12px">${ENDB()}</div>`);
  const headH=hOf(`<div>${HEADF(title0,ts0)}</div>`),miniH=hOf(`<div>${HEADM(title0)}</div>`);
  const INNER=700,FOOT=24,LAB=17,GAP=12,SAFE=4;
  const P=[[]];let room=INNER-headH-FOOT-LAB-GAP*3-SAFE;
  all.forEach(e=>{const h=entryH(e);if(h>room&&P[P.length-1].length){P.push([]);room=INNER-miniH-FOOT-LAB-GAP*3-SAFE}P[P.length-1].push(e);room-=h});
  if(endH+GAP>room)P.push([]);
  M.innerHTML="";
  const n=P.length,title=dayTitle(dy).toUpperCase(),ts=dayTitle(dy).length>26?26:32;
  return P.map((list,pi)=>{const last=pi===n-1;
    return `<div class="aar-page" style="width:559px;height:794px;box-sizing:border-box;background:${T.paper};color:${T.ink};padding:26px;font-family:${T.mono}">
  <div style="width:100%;height:100%;box-sizing:border-box;border:1.5px solid ${T.ink2};padding:22px 24px 18px;display:flex;flex-direction:column;gap:12px;position:relative;overflow:hidden">
  ${pi===0?HEADF(title,ts):HEADM(title)}
  ${list.length?`<div style="display:flex;flex-direction:column"><span style="${lab};margin-bottom:2px">${pi===0?"WHAT YOU SAW, IN THE ORDER IT HAPPENED":"WHAT YOU SAW, CONTINUED"}</span>${list.map((e,i)=>ENTRY(e,i===list.length-1)).join("")}</div>`:""}
  ${last?ENDB():""}
  <div style="flex-grow:1"></div>
  <div style="display:flex;justify-content:space-between;align-items:flex-end;border-top:1px solid ${T.ink2};padding-top:8px;font-size:9.5px;letter-spacing:1.3px;color:${T.ink2}"><span>${dy.ids.length} SITE${dy.ids.length===1?"":"S"} · REMEMBER · EXPLORE · RESPECT</span><span style="font-weight:700">${n>1?`PAGE ${pi+1} OF ${n} · `:""}DZ CHARLIE</span></div>
  ${last?`<div style="position:absolute;right:30px;bottom:44px;transform:rotate(-8deg);border:2.5px solid ${T.stamp};color:${T.stamp};font-family:${T.disp};font-weight:${T.dispW};font-size:14px;letter-spacing:2px;padding:3px 10px;opacity:.85;background:${T.paper}">${ESC(C.stamp)}</div>`:""}
  </div></div>`}).join("")}
function coverHTML(list){const T=C.theme,f=list[0],l=list[list.length-1],n=list.reduce((s,d)=>s+d.ids.length,0);
  const range=f.date==="earlier"||l.date==="earlier"?"":(f.date===l.date?longDate(f.date):`${longDate(f.date)} – ${longDate(l.date)}`);
  return `<div class="aar-page" style="width:559px;height:794px;box-sizing:border-box;background:${T.cover};color:${T.coverInk};padding:26px;font-family:${T.mono}">
  <div style="width:100%;height:100%;box-sizing:border-box;border:1.5px solid ${T.coverRule};padding:34px 30px 26px;display:flex;flex-direction:column;gap:18px;position:relative">
  <div style="display:flex;justify-content:space-between;font-weight:700;font-size:10.5px;letter-spacing:2px;opacity:.8"><span>FIELD RECORD · PERSONAL</span><span>DZ CHARLIE</span></div>
  <div style="flex-grow:1"></div>
  <span style="font-weight:700;font-size:13px;letter-spacing:3px;opacity:.85">${ESC(C.plural.toUpperCase())}</span>
  <span style="font-family:${T.disp};font-weight:${T.dispW};font-size:54px;line-height:.98;letter-spacing:1px">${ESC(C.coverTitle)}</span>
  <div style="border-top:3px solid ${T.coverInk};border-bottom:1px solid ${T.coverInk};padding:10px 0;display:flex;justify-content:space-between;gap:12px;font-size:12px;letter-spacing:1.2px"><span>${ESC(C.place)}</span><span>${ESC(range.toUpperCase())}</span></div>
  <div style="display:flex;flex-direction:column;gap:6px;font-size:12px;line-height:1.5;opacity:.9">${list.map(d=>`<span>${d.n?"DAY "+d.n:"EARLIER"} · ${ESC(dayTitle(d))}</span>`).join("")}</div>
  <div style="flex-grow:1"></div>
  <div style="display:flex;justify-content:space-between;font-size:10px;letter-spacing:1.8px;opacity:.8"><span>${n} SITES · ${list.length} DAY${list.length===1?"":"S"}</span><span style="font-weight:700">${ESC(C.foot)}</span></div>
  <div style="position:absolute;right:26px;top:64px;transform:rotate(8deg);border:2.5px solid ${T.coverStamp};color:${T.coverStamp};font-family:${T.disp};font-weight:${T.dispW};font-size:16px;letter-spacing:2px;padding:5px 12px">${ESC(C.done)}</div>
  </div></div>`}
/* ---- printing: one page, or the whole booklet ---- */
function printPages(html){let el=document.getElementById("aar-print");if(!el){el=document.createElement("div");el.id="aar-print";document.body.appendChild(el)}
  el.innerHTML=html;document.documentElement.classList.add("aar-printing");
  const done=()=>{document.documentElement.classList.remove("aar-printing");el.innerHTML="";window.removeEventListener("afterprint",done)};
  window.addEventListener("afterprint",done);const go=()=>{window.print();setTimeout(()=>{if(document.documentElement.classList.contains("aar-printing"))done()},60000)};
  (document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(()=>setTimeout(go,150))}
/* ---- the picture to send: drawn on a canvas, 1080 × 1350 ---- */
function wrap(ctx,t,w){const out=[];String(t).split(/\s+/).forEach(word=>{const l=out.length?out[out.length-1]:null;if(l!==null&&ctx.measureText(l+" "+word).width<=w)out[out.length-1]=l+" "+word;else out.push(word)});return out}
async function picture(dy){const T=C.theme,r=REP[dy.date]||{},W=1080,H=1350,cv=document.createElement("canvas");cv.width=W;cv.height=H;const x=cv.getContext("2d");
  try{await Promise.all([`${T.dispW} 90px ${T.dispC}`,`700 30px ${T.monoC}`,`400 30px ${T.monoC}`,`400 58px ${T.handC}`].map(f=>document.fonts.load(f)))}catch(e){}
  const D2=T.dispC,M=T.monoC,HF=T.handC;
  x.fillStyle=T.paper;x.fillRect(0,0,W,H);
  let fs=86;x.font=`${T.dispW} ${fs}px ${D2}`;let tl=wrap(x,dayTitle(dy).toUpperCase(),W-160);while(tl.length>2&&fs>54){fs-=6;x.font=`${T.dispW} ${fs}px ${D2}`;tl=wrap(x,dayTitle(dy).toUpperCase(),W-160)}
  tl=tl.slice(0,3);const band=96+fs*1.05*tl.length+110;
  x.fillStyle=T.band||T.title;x.fillRect(0,0,W,band);x.fillStyle=T.bandInk||"#efe9d2";x.textBaseline="alphabetic";
  x.font=`700 24px ${M}`;x.fillText(C.docName,80,96);const dl="DAY "+(dy.n||"–");x.fillText(dl,W-80-x.measureText(dl).width,96);
  x.font=`${T.dispW} ${fs}px ${D2}`;tl.forEach((l,i)=>x.fillText(l,80,96+fs*1.05*(i+1)));
  x.font=`400 26px ${M}`;x.fillText((C.place+" · "+longDate(dy.date)).toUpperCase(),80,band-40);
  let y=band+80;x.fillStyle=T.faint;x.font=`700 24px ${M}`;
  if(r.line){x.fillText("WHAT STAYED WITH ME",80,y);y+=74;x.fillStyle=T.ink;let hs=56;x.font=`400 ${hs}px ${HF}`;let ll=wrap(x,"“"+r.line+"”",W-160);while(ll.length>5&&hs>36){hs-=4;x.font=`400 ${hs}px ${HF}`;ll=wrap(x,"“"+r.line+"”",W-160)}
    ll.slice(0,6).forEach(l=>{x.fillText(l,80,y);y+=hs*1.35});y+=40}
  x.fillStyle=T.faint;x.font=`700 24px ${M}`;x.fillText("TODAY I STOOD WHERE",80,y);y+=20;
  let stop=false;events(dy,3).forEach((e,i,a)=>{if(stop||y+130>H-140){stop=true;return}x.font=`700 28px ${M}`;x.fillStyle=T.when;const top=y+44;x.fillText(e.d.when,80,top);x.fillStyle=T.ink;x.font=`400 28px ${M}`;
    const tl2=wrap(x,e.d.ev,W-160);tl2.slice(0,2).forEach((l,j)=>x.fillText(l,80,top+40+j*38));y=top+40+Math.min(2,tl2.length)*38;
    if(i<a.length-1&&y+150<=H-140){x.strokeStyle=T.rule;x.setLineDash([10,8]);x.lineWidth=2;x.beginPath();x.moveTo(80,y);x.lineTo(W-80,y);x.stroke();x.setLineDash([])}});
  x.fillStyle=T.ink;x.fillRect(80,H-110,W-160,3);x.font=`400 22px ${M}`;x.fillStyle=T.ink2;x.fillText(`${dy.ids.length} SITES · REMEMBER · EXPLORE · RESPECT`,80,H-68);
  x.font=`700 22px ${M}`;const ft="DZCHARLIE.COM";x.fillText(ft,W-80-x.measureText(ft).width,H-68);
  return new Promise(ok=>cv.toBlob(b=>ok(b),"image/png"))}
function fontsReady(){const T=C.theme;try{return Promise.all([`${T.dispW} 30px ${T.dispC}`,`700 12px ${T.monoC}`,`400 12px ${T.monoC}`,`400 18px ${T.handC}`].map(f=>document.fonts.load(f))).catch(()=>{})}catch(e){return Promise.resolve()}}
function fileName(dy){return `${C.fileBase}-day-${dy.n||"earlier"}.png`}
async function savePic(dy){const b=await picture(dy);const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=fileName(dy);document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},4000);msg("Picture saved to your downloads")}
async function send(dy){const r=REP[dy.date]||{};const text=`${C.docName} · Day ${dy.n||""}: ${dayTitle(dy)}${r.line?"\n\n“"+r.line+"”":""}\n\n${C.guide} · dzcharlie.com`;
  try{const b=await picture(dy),f=new File([b],fileName(dy),{type:"image/png"});
    if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],title:C.docName,text});return}}catch(e){if(e&&e.name==="AbortError")return}
  try{if(navigator.share){await navigator.share({title:C.docName,text});return}}catch(e){if(e&&e.name==="AbortError")return}
  await savePic(dy);location.href="mailto:?subject="+encodeURIComponent(C.docName+" · "+dayTitle(dy))+"&body="+encodeURIComponent(text+"\n\n(The picture is in your downloads — attach it to this email.)")}
/* ---- the overlay ---- */
let S={view:"list",date:null,step:1,ans:null,draft:"",notes:{}};
function root(){let el=document.getElementById("aar");if(!el){el=document.createElement("div");el.id="aar";el.setAttribute("role","dialog");el.setAttribute("aria-modal","true");el.setAttribute("aria-label",C.plural);el.hidden=true;document.body.appendChild(el)}return el}
function msg(t){let el=document.getElementById("aar-toast");if(!el){el=document.createElement("div");el.id="aar-toast";el.setAttribute("role","status");document.body.appendChild(el)}el.textContent=t;el.hidden=false;clearTimeout(msg.t);msg.t=setTimeout(()=>el.hidden=true,2600)}
function open(view,date){sync();S={view:view||"list",date:date||null,step:1,ans:null,draft:"",notes:{}};if(S.view==="write"){const r=REP[S.date];S.draft=r&&r.line||"";S.notes=Object.assign({},r&&r.notes||{});if(!pickQ(dayByDate(S.date)))S.step=2}
  const el=root();el.hidden=false;document.documentElement.classList.add("aar-open");draw();el.scrollTop=0;const f=el.querySelector("h2");if(f){f.setAttribute("tabindex","-1");f.focus({preventScroll:true})}}
function close(){const el=root();el.hidden=true;document.documentElement.classList.remove("aar-open");if(C.onClose)C.onClose()}
const dayByDate=d=>days().find(x=>x.date===d);
function bar(title,sub,back){return `<div class="aar-bar"><button type="button" class="aar-ic" data-aar="${back||"close"}" aria-label="${back?"Back":"Close"}"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${back?'<path d="M15 5l-7 7 7 7"/>':'<path d="M6 6l12 12M18 6L6 18"/>'}</svg></button><div class="aar-bt"><span>${ESC(sub)}</span><b>${ESC(title)}</b></div></div>`}
function draw(){const el=root(),all=days(),total=all.filter(d=>d.n).length;let h="";
  if(S.view==="list"){const wrote=all.filter(d=>REP[d.date]);
    h=bar(C.plural.toUpperCase(),C.guide.toUpperCase())+`<div class="aar-in"><h2 class="aar-h">${ESC(C.plural)}</h2>
    <p class="aar-p">${ESC(C.intro)}</p>
    ${all.length?`<div class="aar-list">${all.map(d=>{const r=REP[d.date];return `<button type="button" class="aar-row" data-aar="write" data-date="${d.date}"><span class="aar-k">${d.n||"·"}</span><span class="aar-x"><b>${d.n?"Day "+d.n+" · ":""}${ESC(dayTitle(d))}</b><small>${ESC(longDate(d.date))} · ${d.ids.length} site${d.ids.length===1?"":"s"} visited</small></span><span class="aar-st${r?" ok":""}">${r?"Written":"Write"}</span></button>`}).join("")}</div>`
      :`<div class="aar-empty"><b>No visits yet</b><p>Tick <b>Visited</b> on each site as you see it. In the evening, come back here and write the day's page.</p></div>`}
    ${wrote.length?`<button type="button" class="aar-btn" data-aar="booklet">Make my trip booklet (${wrote.length} page${wrote.length===1?"":"s"})</button><p class="aar-note">Opens the print window: choose "Save as PDF" to keep it, or print it for your journal.</p>`:""}
    ${C.tourCard===false?"":`<label class="aar-sw"><input type="checkbox" data-aar="remind"${SET.remind?" checked":""}><span><b>Remind me on the Tour page</b><small>Shows "Write today's ${ESC(C.docNameShort)}" after you visit sites.</small></span></label>`}
    <p class="aar-note">Your pages stay on this phone. Nothing is sent anywhere unless you choose to share it.</p></div>`}
  else{const dy=dayByDate(S.date);if(!dy){S.view="list";return draw()}const q=pickQ(dy),hasQ=!!q,SEQ=hasQ?[1,2,3]:[2,3],steps=SEQ.length,cur=SEQ.indexOf(S.step)+1;
    const prog=S.step<4?`<div class="aar-prog">${Array.from({length:steps},(_,i)=>`<i class="${i<cur?"on":""}"></i>`).join("")}</div>`:"";
    const sub=`DAY ${dy.n||"–"}${S.step<4?` · STEP ${cur} OF ${steps}`:" · DONE"}`;
    if(S.step===1&&q){const d=D[q.id].q;const ans=S.ans;
      h=bar(C.docName,sub,"list")+`<div class="aar-in">${prog}<span class="aar-lab">ONE QUESTION TO REMEMBER</span><h2 class="aar-h">${ESC(d.t)}</h2>
      <div class="aar-opts" role="group" aria-label="Answers">${d.o.map((o,i)=>`<button type="button" data-aar="ans" data-i="${i}" class="${ans===null?"":(i===d.a?"right":(i===ans?"wrong":"dim"))}" aria-pressed="${ans===i}">${ESC(o)}</button>`).join("")}</div>
      ${ans!==null?`<div class="aar-card" role="status"><span class="aar-lab" style="color:var(--aar-accent)">${ans===d.a?"THAT'S RIGHT":"HERE IS WHAT HAPPENED"}</span><p>${ESC(d.x)}</p><small>${ESC(C.stop(q.id).name)}</small></div>`:""}
      <div class="aar-grow"></div><button type="button" class="aar-btn" data-aar="next"${ans===null?' aria-disabled="true"':""}>${ans===null?"Choose an answer":"Next"}</button>
      <button type="button" class="aar-link" data-aar="next">Skip the question</button></div>`}
    else if(S.step===2){h=bar(C.docName,sub,hasQ?"q":"list")+`<div class="aar-in">${prog}<span class="aar-lab">YOUR NOTES ON EACH SITE</span><h2 class="aar-h">Anything to add about each place?</h2>
      <p class="aar-p">Optional. A few words for any site you visited: who you were with, what you noticed, a name you found on a memorial. Leave the others blank.</p>
      <div class="aar-notes">${dy.ids.filter(id=>D[id]).map((id,i)=>`<div class="aar-note1"><label for="aar-n${i}"><b>${ESC(C.stop(id).name)}</b><small>${ESC(D[id].when)}</small></label><textarea id="aar-n${i}" data-nid="${ESC(id)}" maxlength="300" rows="3" placeholder="Your note (optional)">${ESC(S.notes[id]||"")}</textarea></div>`).join("")}</div>
      <div class="aar-grow"></div><button type="button" class="aar-btn" data-aar="tothoughts">Next: thoughts of the day</button><button type="button" class="aar-link" data-aar="skipnotes">Skip the notes</button></div>`}
    else if(S.step===3){h=bar(C.docName,sub,"notes")+`<div class="aar-in">${prog}<span class="aar-lab">THOUGHTS OF THE DAY</span><h2 class="aar-h">What stayed with you today?</h2>
      <p class="aar-p">A place, a name, a moment. One line is enough.</p>
      <label class="aar-lab" for="aar-line">YOUR LINE</label><textarea id="aar-line" maxlength="200" placeholder="${ESC(C.hint)}">${ESC(S.draft)}</textarea>
      <span class="aar-count" id="aar-cnt">${S.draft.length} of 200 letters</span>
      <div class="aar-tip">Stuck? Think of ${ESC(dy.ids.slice(0,3).map(id=>short(C.stop(id).name)).join(", "))}.</div>
      <div class="aar-grow"></div><button type="button" class="aar-btn" data-aar="make">Make my page</button><button type="button" class="aar-link" data-aar="skipline">Skip this, make the page anyway</button></div>`}
    else{h=bar(C.docName,sub,"list")+`<div class="aar-in">${(()=>{const pg=pageHTML(dy,total).split('<div class="aar-page"').slice(1).map(x=>'<div class="aar-page"'+x);return pg.map((x,i)=>`<div class="aar-prev"><div class="aar-sc">${x}</div></div>`).join("")+(pg.length>1?`<p class="aar-note">${pg.length} pages for this day. Scroll to see them all.</p>`:"")})()}
      <div class="aar-g2"><button type="button" class="aar-btn" data-aar="pic">Save picture</button><button type="button" class="aar-btn" data-aar="send">Send to family</button>
      <button type="button" class="aar-btn ghost" data-aar="print">Print page</button><button type="button" class="aar-btn ghost" data-aar="edit">Edit my notes</button></div>
      <p class="aar-note">Saved in your ${ESC(C.short)}. When the trip is over, make the whole booklet from ${ESC(C.plural)}.</p>
      <button type="button" class="aar-link" data-aar="list">See all days</button></div>`}}
  el.innerHTML=h;
  el.querySelectorAll("[data-nid]").forEach(x=>x.addEventListener("input",()=>{S.notes[x.dataset.nid]=x.value}));
  const ta=el.querySelector("#aar-line");if(ta)ta.addEventListener("input",()=>{S.draft=ta.value;const c=el.querySelector("#aar-cnt");if(c)c.textContent=ta.value.length+" of 200 letters"});
  el.querySelectorAll(".aar-sc").forEach(sc=>{const w=Math.min(320,el.clientWidth-60);sc.style.transform=`scale(${w/559})`;sc.parentNode.style.width=w+"px";sc.parentNode.style.height=(794*w/559)+"px"});
}
function save(line){const n={};Object.keys(S.notes||{}).forEach(k=>{const v=String(S.notes[k]||"").trim();if(v)n[k]=v});REP[S.date]={line:(line||"").trim(),notes:n,ans:S.ans,made:Date.now()};LS.set("rep",REP)}
document.addEventListener("click",e=>{const t=e.target.closest("[data-aar]");
  if(!t){setTimeout(()=>{const b=LOG?LOG.length:0;sync();if(LOG&&LOG.length!==b&&C.onChange)C.onChange()},0);return}
  const a=t.dataset.aar;
  if(a==="open"){e.preventDefault();open("list");return}
  if(a==="today"){e.preventDefault();sync();const d=days().find(x=>x.date===today());open(d?"write":"list",d?d.date:null);return}
  if(a==="snooze"){SNOOZE=today();LS.set("snooze",SNOOZE);if(C.onChange)C.onChange();return}
  if(a==="close"){close();return}
  if(a==="list"){S.view="list";draw();return}
  if(a==="write"){open("write",t.dataset.date);const r=REP[t.dataset.date];if(r){fontsReady().then(()=>{S.step=4;draw()})}return}
  if(a==="ans"){if(S.ans===null){S.ans=+t.dataset.i;draw()}return}
  if(a==="q"){S.step=1;draw();return}
  if(a==="next"){if(t.getAttribute("aria-disabled")==="true")return;S.step=2;draw();root().scrollTop=0;return}
  if(a==="notes"){S.step=2;draw();return}
  if(a==="tothoughts"){S.step=3;draw();root().scrollTop=0;const ta=root().querySelector("#aar-line");if(ta)ta.focus();return}
  if(a==="skipnotes"){S.notes={};S.step=3;draw();root().scrollTop=0;return}
  if(a==="make"){save(S.draft);fontsReady().then(()=>{S.step=4;draw();root().scrollTop=0;if(C.onChange)C.onChange()});return}
  if(a==="skipline"){save("");fontsReady().then(()=>{S.step=4;draw();root().scrollTop=0;if(C.onChange)C.onChange()});return}
  if(a==="edit"){const r=REP[S.date]||{};S.draft=r.line||"";S.notes=Object.assign({},r.notes||{});S.step=2;draw();root().scrollTop=0;return}
  const dy=S.date&&dayByDate(S.date);
  if(a==="pic"&&dy){savePic(dy);return}
  if(a==="send"&&dy){send(dy);return}
  if(a==="print"&&dy){fontsReady().then(()=>{const tot=days().filter(d=>d.n).length;printPages(pageHTML(dy,tot))});return}
  if(a==="booklet"){fontsReady().then(()=>{const w=days().filter(d=>REP[d.date]),tot=days().filter(d=>d.n).length;if(w.length)printPages(coverHTML(w)+w.map(d=>pageHTML(d,tot)).join(""))});return}
});
document.addEventListener("change",e=>{if(e.target.dataset&&e.target.dataset.aar==="remind"){SET.remind=e.target.checked;LS.set("set",SET);if(C.onChange)C.onChange()}});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!root().hidden){close()}});
/* ---- the card on the Tour page ---- */
function card(){if(!SET.remind||C.tourCard===false)return"";sync();const all=days(),t=all.find(d=>d.date===today());
  if(t&&!REP[t.date]&&SNOOZE!==today())return `<div class="aar-cardin"><div class="aar-ch"><span class="aar-ico"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/><path d="M9 13h7M9 17h5"/></svg></span><span><small>${t.ids.length} SITE${t.ids.length===1?"":"S"} VISITED TODAY</small><b>Write today's ${ESC(C.docNameShort)}</b></span></div>
    <p>Two minutes. What you saw, put in the order it happened, one question, and a line of your own. You get a page for your journal.</p>
    <button type="button" class="aar-btn" data-aar="today">${ESC(C.startLabel||"Start my report")}</button><button type="button" class="aar-link" data-aar="snooze">Not tonight</button></div>`;
  const w=all.filter(d=>REP[d.date]).length;
  if(all.length)return `<button type="button" class="aar-mini" data-aar="open"><span><b>${ESC(C.plural)}</b><small>${w} of ${all.length} day${all.length===1?"":"s"} written</small></span><span aria-hidden="true">›</span></button>`;
  return ""}
window.AAR={open,card,sync,days,pageHTML,coverHTML};
sync();
})();



/* ---------- TOUR PAGE: straight to the ready-made routes, with a slim switch (Sep 2026) ---------- */
let UX_ASK=false;const UX_KEY="ecn-tourpick";
let UX_CUR=null;function uxGet(){if(UX_CUR===null){try{UX_CUR=localStorage.getItem(UX_KEY)||""}catch(e){UX_CUR=""}}return UX_CUR}
function uxSet(v){UX_CUR=v||"";try{v?localStorage.setItem(UX_KEY,v):localStorage.removeItem(UX_KEY)}catch(e){}}
function uxMode(){if(apOn())return "area";const p=uxGet();if(p==="area"||p==="my")return p;return "days"}
const UX_HINT={days:"A ready-made route for 1 to 7 days, with the driving order and a place to stay each night.",area:"A few hours, or only one part? Choose the area and the time you have.",my:"Choose your days and the sites you want; the app puts them in driving order."};
function uxTourGate(){const box=document.getElementById("uxpick");if(!box)return;const m=uxMode();
  box.hidden=false;box.innerHTML=`<div class="uxseg" role="group" aria-label="How to plan your tour">${[["days","Ready-made"],["area","By area"],["my","Build my own"]].map(x=>`<button type="button" data-uxpick="${x[0]}" aria-pressed="${m===x[0]}">${x[1]}</button>`).join("")}</div><p class="uxhint">${UX_HINT[m]}</p>`;
  const hide=(id,h)=>{const e=document.getElementById(id);if(e)e.style.display=h?"none":""};
  const wiz=m==="area"&&!apOn(),myEd=m==="my"&&!myOn();if(m==="my"&&!MYR.on)MYR.edit=true;
  hide("apbox",m!=="area");hide("classicbox",m!=="days");hide("mybox",m!=="my");hide("addbox",m!=="days"&&!(m==="area"&&apOn()));hide("tourout",wiz||myEd);
  if(m==="my")myRenderPanel()}
document.addEventListener("click",e=>{const t=e.target.closest("[data-uxpick],[data-ap]");if(!t)return;
  const v=t.dataset.uxpick;
  if(v==="days"){apOff();AP.step=0;MYR.edit=false;mySave();uxSet("days");renderTour();return}
  if(v==="area"){MYR.edit=false;mySave();uxSet("area");if(!apOn())AP.step=1;renderTour();if(!apOn())apScroll();return}
  if(v==="my"){apOff();AP.step=0;uxSet("my");if(!MYR.on||!myCount())MYR.edit=true;mySave();renderTour();return}
  const a=t.dataset.ap;
  if(a==="classic"){uxSet("days");uxTourGate();return}
  if(a==="back0"&&!apOn()){uxSet("days");renderTour();return}
  if(a==="build"){uxSet("area");uxTourGate();return}
});

/* ---------- BUILD MYR OWN ROUTE (Sep 2026) ---------- */
const MY_KEY="ecn-myroute";
let MYR={on:false,edit:false,days:2,cur:1,lists:[[],[]]},MY_Q="",MY_PM=null;
try{const s=JSON.parse(localStorage.getItem(MY_KEY)||"null");if(s&&Array.isArray(s.lists)&&s.days)MYR=Object.assign(MYR,s,{edit:false})}catch(e){}
const myNorm=s=>String(s).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
function mySave(){try{localStorage.setItem(MY_KEY,JSON.stringify(MYR))}catch(e){}}
function myOn(){return !!MYR.on&&!MYR.edit&&uxGet()==="my"&&!apOn()}
function myAll(){ensureDdayPool();return POOL.concat(plan.custom.map(c=>Object.assign({},c,{seq:99,pri:0,conf:"DOC",cat:"Your own stop",custom:true})))}
function myGet(id){return myAll().find(p=>p.id===id)}
function myDayOf(id){const i=MYR.lists.findIndex(l=>l.includes(id));return i<0?0:i+1}
function myCount(){return MYR.lists.slice(0,MYR.days).reduce((s,l)=>s+l.length,0)}
function mySetDays(n){n=Math.max(1,Math.min(7,n));while(MYR.lists.length<n)MYR.lists.push([]);
  if(MYR.lists.length>n){const extra=MYR.lists.splice(n).flat();MYR.lists[n-1]=MYR.lists[n-1].concat(extra)}
  MYR.days=n;if(MYR.cur>n)MYR.cur=n;mySave()}
function myToggle(id,day){day=day||MYR.cur;const d=myDayOf(id);MYR.lists=MYR.lists.map(l=>l.filter(x=>x!==id));
  if(d!==day)MYR.lists[day-1].push(id);mySave();return d===day?0:day}
function myBuild(){let prev=null;return MYR.lists.slice(0,MYR.days).map(l=>{const pts=l.map(myGet).filter(Boolean);
  const r=apOrder(pts,prev,40);if(r.length)prev=[r[r.length-1].lat,r[r.length-1].lon];return r})}
function myDrive(ds,di,days){let m=0,cur=null;if(di>0){const pd=days[di-1];if(pd&&pd.length)cur=[pd[pd.length-1].lat,pd[pd.length-1].lon]}
  ds.forEach(p=>{if(cur)m+=apDrive(apKm(cur[0],cur[1],p.lat,p.lon));cur=[p.lat,p.lon]});return m}
function mySummary(days){const all=days.flat(),vis=all.reduce((s,p)=>s+p.min,0),drv=days.reduce((s,ds,di)=>s+myDrive(ds,di,days),0),nDone=all.filter(p=>visited[p.id]).length;
  return `<div class="summ ap-summ"><b>Your own route · ${days.length} day${days.length>1?"s":""} · ${all.length} stop${all.length===1?"":"s"} · about ${apHm(vis+drv)} including ${apHm(drv)} driving</b><br>Each day is put in driving order; the first stop of a day follows on from where the day before ended.${nDone?` · ${nDone} visited`:""}</div>`}
function myDayLine(di,ds){const days=buildPlan(),vis=ds.reduce((s,p)=>s+p.min,0),drv=myDrive(ds,di,days);
  return `${ds.length} stop${ds.length===1?"":"s"} · about ${apHm(vis+drv)} (visits ${apHm(vis)} + driving ${apHm(drv)})${vis+drv>600?" · a long day: consider moving a stop":""}`}
function myEmptyDay(){return `<p class="small" style="margin-bottom:12px">No stops chosen for this day yet. Tap <b>Edit my route</b> above to add some.</p>`}
const MY_COL="#a3261e",MY_OTHER="#3f5a2a";
function myOverlay(M){let o="";const pts=myAll();
  const sh=pts.map(p=>[p,myDayOf(p.id)]).sort((a,b)=>(a[1]===MYR.cur)-(b[1]===MYR.cur)||a[1]-b[1]);
  sh.forEach(([p,d])=>{const x=M.X(p.lon),y=M.Y(p.lat);if(x<-10||y<-10||x>M.W+10||y>M.H+10)return;
    if(!d)o+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" fill="#fff" stroke="#1c1a15" stroke-width="2"/>`;
    else{const cur=d===MYR.cur;o+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${cur?11:9}" fill="${cur?MY_COL:MY_OTHER}" stroke="#fff" stroke-width="2"/><text x="${x.toFixed(1)}" y="${(y+4).toFixed(1)}" text-anchor="middle" font-size="${cur?12:10}" font-weight="700" fill="#fff" font-family="sans-serif">${d}</text>`}});
  return o}
function myBounds(){const pts=myAll(),la=pts.map(p=>p.lat),lo=pts.map(p=>p.lon);return[Math.min(...la),Math.min(...lo),Math.max(...la),Math.max(...lo)]}
function myListHtml(){const q=myNorm(MY_Q.trim()),pts=myAll().filter(p=>!q||myNorm(p.name+" "+(p.cat||"")).includes(q));
  const groups={};pts.forEach(p=>{const g=p.custom?"__own":apRegionOf(p);(groups[g]=groups[g]||[]).push(p)});
  let h="";AP_AREAS.map(a=>a.id).concat(["__own"]).forEach(g=>{const L=groups[g];if(!L||!L.length)return;
    const nm=g==="__own"?"Your own spots":(AP_AREAS.find(a=>a.id===g)||{}).name;h+=`<div class="my-grp">${esc(nm)}</div>`;
    L.sort((a,b)=>a.seq-b.seq).forEach(p=>{const d=myDayOf(p.id);
      h+=`<div class="my-row"><span>${esc(p.name)} <small>· ${p.min} min${p.pri<=1?" · must see":""}</small></span><button type="button" data-myadd="${esc(p.id)}" class="${d?"in":""}" aria-label="${d?(d===MYR.cur?"Remove from":"Move to Day "+MYR.cur+" from")+" Day "+d:"Add to Day "+MYR.cur}: ${esc(p.name)}">${d?(d===MYR.cur?"✓ Day "+d:"Day "+d+" → "+MYR.cur):"＋ Day "+MYR.cur}</button></div>`})});
  return h||`<p class="my-empty">No site matches "${esc(MY_Q)}".</p>`}
function myDaysHtml(){const days=myBuild();let h="";
  days.forEach((ds,i)=>{const n=i+1;h+=`<div class="my-day"><div class="my-dh">Day ${n}${n===MYR.cur?" · adding here":""}</div>${ds.length?`<ol>${ds.map(p=>`<li><span>${esc(p.name)} <small>· ${p.min} min</small></span><button type="button" class="my-x" data-myrm="${esc(p.id)}" aria-label="Remove ${esc(p.name)} from Day ${n}">✕</button></li>`).join("")}</ol>`:`<p class="my-empty">Nothing yet — choose Day ${n} above, then tap sites.</p>`}</div>`});
  return h}
function myRenderPanel(){const box=document.getElementById("mybox");if(!box)return;
  if(!MYR.edit&&MYR.on&&myCount()){box.innerHTML=`<div class="head">Your own route</div><p class="my-sum">${MYR.days} day${MYR.days>1?"s":""} · ${myCount()} stop${myCount()===1?"":"s"}</p>
    <div class="ap-row"><button type="button" class="ap-btn" data-my="edit">Edit my route</button><button type="button" class="ap-btn ghost" data-my="clear">Start again</button></div>`;return}
  const n=myCount();
  box.innerHTML=`<div class="head">Build my own route</div>
  <ol class="my-steps"><li>Choose how many days.</li><li>Pick a day, then tap sites on the map or in the list below to add them to it.</li><li>Tap <b>Make my route</b>: the app puts each day in driving order, with the Google Maps route.</li></ol>
  <span class="my-lab">1 · How many days?</span><div class="my-chips" role="group" aria-label="How many days">${[1,2,3,4,5,6,7].map(d=>`<button type="button" data-mydays="${d}" aria-pressed="${MYR.days===d}" aria-label="${d} day${d>1?"s":""}">${d}</button>`).join("")}</div>
  <span class="my-lab">2 · Add sites to</span><div class="my-chips" role="group" aria-label="Which day to add to">${MYR.lists.slice(0,MYR.days).map((l,i)=>`<button type="button" data-mycur="${i+1}" aria-pressed="${MYR.cur===i+1}">Day ${i+1} <small>(${l.length})</small></button>`).join("")}</div>
  <p class="ap-sub" style="margin:8px 0 4px">Tap a dot on the map to add it to <b>Day ${MYR.cur}</b>; tap it again to take it out. Where dots sit close together, zoom in with + or two fingers first.</p>
  <div class="my-legend"><span><i style="background:#fff"></i>Not chosen</span><span><i style="background:${MY_COL};border-color:#fff"></i>Day ${MYR.cur}</span><span><i style="background:${MY_OTHER};border-color:#fff"></i>Other days</span></div>
  <div class="ap-map" id="my-map"></div>
  <div id="my-days">${myDaysHtml()}</div>
  <button type="button" class="my-go" data-my="make"${n?"":" disabled"}>Make my route${n?` · ${n} stop${n===1?"":"s"}`:""}</button>
  <span class="my-lab">Or pick from the list</span><input type="search" class="my-srch" id="my-q" placeholder="Search sites" aria-label="Search sites" value="${esc(MY_Q)}">
  <div id="my-list">${myListHtml()}</div>`;
  const el=document.getElementById("my-map");
  MY_PM=apMap(el,{overlay:myOverlay,onTap:(x,y,M)=>{let best=null,bd=24;myAll().forEach(p=>{const d=Math.hypot(M.X(p.lon)-x,M.Y(p.lat)-y);if(d<bd){bd=d;best=p}});
    if(best)myTapped(best.id)}});
  MY_PM.fit(myBounds(),24);
  const q=document.getElementById("my-q");if(q)q.addEventListener("input",()=>{MY_Q=q.value;document.getElementById("my-list").innerHTML=myListHtml()})}
function myRefresh(){const d=document.getElementById("my-days");if(d)d.innerHTML=myDaysHtml();const l=document.getElementById("my-list");if(l)l.innerHTML=myListHtml();
  document.querySelectorAll("#mybox [data-mycur]").forEach(b=>{const i=+b.dataset.mycur;b.innerHTML=`Day ${i} <small>(${MYR.lists[i-1].length})</small>`});
  const g=document.querySelector("#mybox .my-go"),n=myCount();if(g){g.disabled=!n;g.textContent="Make my route"+(n?` · ${n} stop${n===1?"":"s"}`:"")}
  if(MY_PM)MY_PM.redraw()}
function myTapped(id){const p=myGet(id),r=myToggle(id);myRefresh();toast(r?`${p?p.name.split(/ — | \/ /)[0]:"Site"} added to Day ${r}`:"Taken out of your route")}
document.addEventListener("click",e=>{const t=e.target.closest("[data-my],[data-mydays],[data-mycur],[data-myadd],[data-myrm]");if(!t||!t.closest("#mybox"))return;
  if(t.dataset.mydays){mySetDays(+t.dataset.mydays);myRenderPanel();return}
  if(t.dataset.mycur){MYR.cur=+t.dataset.mycur;mySave();myRenderPanel();return}
  if(t.dataset.myadd){myTapped(t.dataset.myadd);return}
  if(t.dataset.myrm){MYR.lists=MYR.lists.map(l=>l.filter(x=>x!==t.dataset.myrm));mySave();myRefresh();toast("Taken out of your route");return}
  const a=t.dataset.my;
  if(a==="make"){if(!myCount())return;MYR.on=true;MYR.edit=false;mySave();renderTour();const o=document.getElementById("mybox");if(o)o.scrollIntoView({block:"start",behavior:"smooth"});return}
  if(a==="edit"){MYR.edit=true;renderTour();const o=document.getElementById("mybox");if(o)o.scrollIntoView({block:"start",behavior:"smooth"});return}
  if(a==="clear"){MYR={on:false,edit:true,days:MYR.days,cur:1,lists:MYR.lists.map(()=>[])};mySave();renderTour();return}
});
/* while your own route is showing, "+ Add to my route" anywhere in the guide adds to it (to the day you last chose) */
document.addEventListener("click",e=>{if(!myOn()&&!(MYR.edit&&uxGet()==="my"))return;const t=e.target.closest("[data-route],[data-drop]");if(!t||t.closest("#mybox"))return;
  e.stopImmediatePropagation();e.preventDefault();const k=t.dataset.route||t.dataset.drop;const p=myGet(k);if(!p)return;
  const was=myDayOf(k);if(t.dataset.drop||was){MYR.lists=MYR.lists.map(l=>l.filter(x=>x!==k));mySave();renderTour();toast("Taken out of your route");return}
  MYR.lists[MYR.cur-1].push(k);mySave();renderTour();toast(`Added to your route · Day ${MYR.cur}`)},true);
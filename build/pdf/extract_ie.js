// Pulls everything the printed guide needs out of an Easy Company app page, plus the day maps as pictures.
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();
for(const f of ['italy']){
const ctx=await b.newContext({viewport:{width:600,height:900},deviceScaleFactor:2.5,serviceWorkers:'block'});const p=await ctx.newPage();
await p.goto('http://localhost:8820/index.html#pdf');await p.waitForTimeout(1500);
const D=await p.evaluate(()=>{ensureDdayPool();
 const T=e=>e?e.innerText.trim():'';
 const L={};(typeof LINKS!=='undefined'?LINKS:[]).forEach(([n,a])=>L[n]=a);
 const cert=c=>(CERT[c]||['','LOW',''])[1];
 const st=x=>({id:x.id,name:x.name,min:x.min,lat:x.lat,lon:x.lon,cert:cert(x.conf),cat:x.cat,text:x.text,look:x.look,plan:x.plan,priv:!!x.priv,pri:x.pri,links:L[x.name]||[]});
 const DS=DAYS.map(d=>POOL.filter(x=>x.day===d.n).sort((a,b)=>a.seq-b.seq));const days=DAYS.map((d,i)=>({n:d.n,title:d.t,route:d.r,q:d.q,night:i<DAYS.length-1?{base:baseFor(DS[i],false,DS[i+1]).base}:null,stops:DS[i].map(st)}));
 const extra=POOL.filter(x=>!x.day).sort((a,b)=>a.seq-b.seq).map(st);
 const tl=TL.map(t=>({n:t[0],name:t[1],when:t[2],cert:cert(t[3]),lat:t[4],lon:t[5],phase:PHASES[t[7]]||'',text:t[8],look:t[9],links:L[t[1]]||[]}));
 const dd=DSITES.map(d=>({name:d[0],cat:d[1],lat:d[2],lon:d[3],cert:cert(d[4]),text:d[5],look:d[6],links:L[d[0]]||[]}));
 const mus=MUS.map(m=>({name:m[0],place:m[1],lat:m[2],lon:m[3],day:m[4],text:m[5],tip:m[6],links:L[m[0]]||[]}));
 const br=document.getElementById('p-brief');const sec=h=>{const H=[...br.querySelectorAll('h3')].find(x=>T(x)===h);const o=[];let e=H&&H.nextElementSibling;while(e&&e.tagName!=='H3'){o.push(e.innerHTML);e=e.nextElementSibling}return o};
 const orders=[...br.querySelector('.memo').querySelectorAll('p')].map(x=>x.innerHTML);
 const gloss=[...br.querySelectorAll('.gloss b')].map(b=>[T(b),T(b.nextElementSibling)]);
 const dday=document.getElementById('p-dday');
 const men=[...document.querySelectorAll('#p-men article.man')].map(a=>({name:T(a.querySelector('.ttl b')),nick:T(a.querySelector('.nick')),role:T(a.querySelector('.when')),life:T(a.querySelector('.life')),
   bio:[...a.querySelectorAll('.body > p:not(.life)')].map(T),decos:[...a.querySelectorAll('.decos li')].map(T),after:T(a.querySelector('.body .look')).replace(/^After the war:\s*/,''),grp:T(a.previousElementSibling&&a.closest('#p-men')?[...document.querySelectorAll('#p-men > *')].slice(0,[...document.querySelectorAll('#p-men > *')].indexOf(a)).reverse().find(e=>e.matches('h3.men-grp')):null)}));
 const syn=[...document.querySelectorAll('#p-men .syn p')].map(x=>x.innerHTML);
 const notes=[...document.querySelectorAll('#p-men .men-notes details')].map(d=>({h:T(d.querySelector('summary')),html:d.querySelector('.in').innerHTML}));
 const menfoot=T(document.querySelector('#p-men > p.foot'));
 const sources=[...document.querySelectorAll('main p, main div')].filter(e=>/^Sources/.test(T(e))&&T(e).length<1500&&!e.querySelector('p,div')).map(T);
 const hero=document.querySelector('.hero');
 return {title:T(hero.querySelector('.hero-title')).replace(/\n/g,' '),sub:T(hero.querySelector('.hero-sub')),dates:T(hero.querySelector('.hero-stamp')),lede:T(hero.querySelector('.hero-lede')),top:T(hero.querySelector('.hero-top span')),
  orders,accuracy:sec('The accuracy rule'),story:sec('The story in brief'),why:sec('Why the wider tour'),gloss,days,extra,tl,dd,mus,
  ddTitle:T(dday.querySelector('h2')),ddHeads:[...dday.querySelectorAll('h3')].map(T),factors:FACTORS,men,syn,notes,menfoot,sources:[...new Set(sources)],tabDD:T(document.getElementById('tab-dday')),gloss2:GLOSS,
  armies:[...document.querySelectorAll('#p-armies > h3, #p-armies > p, #p-armies .memo p, #p-armies .fact')].map(e=>e.tagName==='H3'?['h',T(e)]:e.classList.contains('fact')?['f',T(e.querySelector('.h')),[...e.querySelectorAll('p')].map(x=>x.innerHTML)]:['p',e.innerHTML])}});
fs.writeFileSync(`/home/claude/ie/pdf/${f}.json`,JSON.stringify(D,null,1));
// maps: each day, the timeline, the wider war, the museums
const jobs=[...D.days.map(d=>['day'+d.n,d.stops,'DAY '+d.n+' — '+d.title.toUpperCase(),1]),['tl',D.tl,'THE CAMPAIGN IN DATE ORDER, 1943 – 1945',1],['dd',D.dd,D.ddTitle.split('—')[0].trim().toUpperCase(),0],['mus',D.mus,'MUSEUMS',0]];
if(D.extra.length)jobs.push(['extra',D.extra,'WORTH A DETOUR',0]);
for(const [k,pts,t,line] of jobs){
 await p.evaluate(([pts,t,line])=>{let h=document.getElementById('pdfmap');if(!h){h=document.createElement('div');h.id='pdfmap';h.style.cssText='position:fixed;left:0;top:0;width:560px;z-index:99999;background:#fff';document.body.appendChild(h)}
  h.innerHTML=sitmap(pts.map((x,i)=>({key:'k'+i,tab:'tab-tour',num:x.n||i+1,name:x.name,short:x.name.split(/ — | \/ /)[0].slice(0,24),lat:x.lat,lon:x.lon,conf:{HIGH:'DOC',MEDIUM:'MEDIUM',LOW:'AREA'}[x.cert]||'DOC'})),t);if(!line)h.innerHTML=h.innerHTML.replace(/<path d="[^"]*" fill="none" stroke="#e6dfc4"[^>]*><\/path><path d="[^"]*" fill="none" stroke="#a3261e" stroke-width="2.2" stroke-dasharray="7 4"><\/path>/,'');h.querySelectorAll('.zoomhint,.cap').forEach(x=>x.style.display='none')},[pts,t,line]);
 await p.waitForTimeout(1200);
 const el=await p.$('#pdfmap svg')||await p.$('#pdfmap');await el.screenshot({path:`/home/claude/ie/pdf/maps/${f}-${k}.png`});
}
console.log(f,'days',D.days.map(d=>d.stops.length).join('/'),'extra',D.extra.length,'tl',D.tl.length,'dd',D.dd.length,'mus',D.mus.length,'men',D.men.length,'gloss',D.gloss.length,'sources',D.sources.length,'story',D.story.length);
await ctx.close()}
await b.close()})();

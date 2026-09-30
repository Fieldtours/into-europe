const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844}});const p=await ctx.newPage();
const errs=[],bad=[];p.on('pageerror',e=>errs.push('ERR '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push('CON '+m.text())});
p.on('response',r=>{if(r.status()>=400)bad.push(r.status()+' '+r.url())});
await p.goto('http://localhost:8820/index.html');await p.waitForTimeout(1500);await p.click('#welgo');await p.waitForTimeout(500);
const tabs=['tab-tour','tab-time','tab-map','tab-mus','tab-dday','tab-brief','tab-orig','tab-men','tab-armies','tab-weap','tab-more'];
for(const t of tabs){await p.evaluate(t=>goTab(t),t);await p.waitForTimeout(700);const n=await p.evaluate(t=>{const s=document.getElementById(t.replace('tab-','p-'));return s?s.innerText.length:-1},t);console.log(t,n)}
// every raster file and FILES exist
const miss=await p.evaluate(async()=>{const out=[];for(const r of RASTER){const x=await fetch(r.src,{method:'HEAD'});if(!x.ok)out.push(r.src)}return out});console.log('missing tiles',miss.length);
const pdf=await p.evaluate(async()=>(await fetch('pdf/Into-Europe-Italy-1943-1945.pdf',{method:'HEAD'})).status);console.log('pdf',pdf);
// search
await p.evaluate(()=>goHome());await p.waitForTimeout(300);
await p.evaluate(()=>document.getElementById('srchbtn')&&document.getElementById('srchbtn').click());await p.waitForTimeout(300);await p.fill('#sq','Cassino');await p.waitForTimeout(400);
console.log('search',(await p.evaluate(()=>document.querySelector('.srch').innerText.split('\n').slice(0,6).join(' | '))));
await p.keyboard.press('Escape');
// report link
console.log('report',await p.evaluate(()=>{const a=document.querySelector('.vz-rep');return a?a.getAttribute('href').slice(0,90):'none'}));
console.log('visiting with data',await p.evaluate(()=>document.querySelectorAll('.vz-rows').length));
console.log(errs.slice(0,10).join('\n'));console.log('404s',bad.slice(0,10).join('\n'));await b.close()})();

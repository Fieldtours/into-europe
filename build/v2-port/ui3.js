const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844}});
const errs=[];p.on('pageerror',e=>errs.push('ERR '+e.message+' '+(e.stack||'').split('\n')[1]));p.on('console',m=>{if(m.type()==='error')errs.push('CON '+m.text())});
await p.goto('http://localhost:8820/index.html#x');await p.waitForTimeout(1500);
await p.evaluate(()=>{visited["d8-1"]=true;visited["d8-2"]=true;visited["d8-6"]=true;saveV();AAR&&AAR.refresh&&AAR.refresh()});
const S=async n=>{await p.waitForTimeout(700);await p.screenshot({path:'/home/claude/ie/test/'+n+'.png'})};
await p.click('.aar-hbtn');await S('w01-diary');
console.log(await p.evaluate(()=>document.body.innerText.match(/WAR DIARY[\s\S]{0,600}/)?.[0]));
const bt=await p.evaluate(()=>[...document.querySelectorAll('[class*=aar] button')].map(b=>b.textContent.trim()).slice(0,20));console.log(bt);
// open a tour card, check visiting box
await p.evaluate(()=>{document.querySelector('.aar-x,[data-aar=close]')?.click()});
await p.evaluate(()=>goTab('tab-tour'));await p.waitForTimeout(500);
const vz=await p.evaluate(()=>{const c=[...document.querySelectorAll('article.card .vz')];return c.length+' boxes; first: '+(c[0]?c[0].innerText.slice(0,200):'')});console.log('VZ',vz);
await p.evaluate(()=>{const d=document.querySelector('article.card[data-key="d8-1"]');if(d){d.classList.remove('fold');d.scrollIntoView();const v=d.querySelector('.vz details');if(v)v.open=true}});await S('w02-card');
await p.evaluate(()=>document.querySelector('.aar-hbtn').click());await p.waitForTimeout(600);
await p.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Write');b&&b.click()});await S('w03-write');
await p.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>/preview|see the page|finish|save/i.test(x.textContent));b&&b.click()});await S('w04-page');
console.log(errs.join('\n'));await b.close()})();

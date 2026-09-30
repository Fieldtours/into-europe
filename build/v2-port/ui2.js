const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844}});
const errs=[];p.on('pageerror',e=>errs.push('ERR '+e.message+' '+(e.stack||'').split('\n')[1]));p.on('console',m=>{if(m.type()==='error')errs.push('CON '+m.text())});
await p.goto('http://localhost:8820/index.html');await p.waitForTimeout(1500);await p.click('#welgo');await p.waitForTimeout(500);
const S=async n=>{await p.waitForTimeout(600);await p.screenshot({path:'/home/claude/ie/test/'+n+'.png'})};
const clickT=async (sel,t)=>p.evaluate(([sel,t])=>{const e=[...document.querySelectorAll(sel)].find(b=>b.textContent.trim().startsWith(t));if(!e)return 'NOTFOUND '+t;e.click();return 'ok'},[sel,t]);
await p.click('#qa-plan');await p.waitForTimeout(400);
console.log(await clickT('#p-tour button','By area'));await p.waitForTimeout(300);
await p.click('[data-apreg="cassino"]');await p.click('#ap-next1');await S('v01-step2');
console.log((await p.evaluate(()=>document.querySelector('#apbox').innerText)).slice(0,500));
console.log(await clickT('#apbox button','1 day'));await p.waitForTimeout(200);
const nx=await p.evaluate(()=>[...document.querySelectorAll('#apbox button')].map(b=>b.textContent.trim()).join('|'));console.log(nx);
await p.click('[data-ap=step3]');await p.waitForTimeout(300);await S('v02-step3');console.log((await p.evaluate(()=>document.querySelector('#apbox').innerText)).slice(0,400));await p.click('[data-ap=build]');
await p.waitForTimeout(800);await S('v02-result');
console.log('RESULT:',(await p.evaluate(()=>document.querySelector('#p-tour').innerText)).slice(0,1500));

// build my own
await p.evaluate(()=>{[...document.querySelectorAll('#p-tour button')].find(b=>b.textContent.trim()==='Build my own').click()});await p.waitForTimeout(600);await S('v03-my');
console.log('MY:',(await p.evaluate(()=>document.querySelector('#mybox').innerText)).slice(0,600));
console.log(errs.join('\n'));await b.close()})();

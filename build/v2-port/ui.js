const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
const errs=[];p.on('pageerror',e=>errs.push('ERR '+e.message+' '+(e.stack||'').split('\n')[1]));p.on('console',m=>{if(m.type()==='error')errs.push('CON '+m.text())});
await p.goto('http://localhost:8820/index.html');await p.waitForTimeout(1500);await p.click('#welgo');await p.waitForTimeout(700);
const S=async n=>{await p.waitForTimeout(500);await p.screenshot({path:'/home/claude/ie/test/'+n+'.png'})};
await S('u01-home');
await p.evaluate(()=>window.scrollTo(0,900));await S('u02-home2');
await p.evaluate(()=>{document.querySelector('.uxmore summary').click()});await S('u03-more');
await p.click('#qa-plan');await S('u04-tour');
// By area
await p.evaluate(()=>{[...document.querySelectorAll('#p-tour button')].find(b=>b.textContent.trim()==='By area').click()});await S('u05-area');
console.log('AREA:',(await p.evaluate(()=>document.querySelector('#apbox').innerText)).slice(0,700));
await p.evaluate(()=>{const b=[...document.querySelectorAll('#apbox button')];console.log(b.map(x=>x.textContent.trim()).join('|'))});
const ab=await p.evaluate(()=>[...document.querySelectorAll('#apbox button,#apbox [data-apr]')].map(x=>x.outerHTML.slice(0,120)).slice(0,25));console.log(ab.join('\n'));
console.log(errs.join('\n'));await b.close()})();

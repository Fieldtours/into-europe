const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844}});
const errs=[];p.on('pageerror',e=>errs.push('ERR '+e.message));
await p.goto('http://localhost:8820/index.html#x');await p.waitForTimeout(1500);
await p.evaluate(()=>goTab('tab-tour'));await p.waitForTimeout(800);
// day 8 Cassino map
await p.evaluate(()=>{const ms=[...document.querySelectorAll('#p-tour .sitmap')];const m=ms.find(x=>/MONTE CASSINO/i.test(x.getAttribute('aria-label')||''))||ms[7];m.click()});await p.waitForTimeout(1500);
await p.screenshot({path:'/home/claude/ie/test/z1.png'});
for(let i=0;i<3;i++){await p.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='+'&&x.offsetParent);b&&b.click()});await p.waitForTimeout(900)}
await p.screenshot({path:'/home/claude/ie/test/z2.png'});
for(let i=0;i<3;i++){await p.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='+'&&x.offsetParent);b&&b.click()});await p.waitForTimeout(900)}
await p.screenshot({path:'/home/claude/ie/test/z3.png'});
console.log(await p.evaluate(()=>[...document.querySelectorAll('.lb svg image')].map(i=>i.getAttribute('href')).join(' ')));
await p.keyboard.press('Escape');await p.waitForTimeout(300);
// battle map
await p.evaluate(()=>goTab('tab-dday'));await p.waitForTimeout(1200);await p.evaluate(()=>document.getElementById('battles').scrollIntoView());await p.waitForTimeout(800);
await p.screenshot({path:'/home/claude/ie/test/z4.png'});
console.log(errs);await b.close()})();
